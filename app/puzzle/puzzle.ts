import { Problem } from "../../src/solver/astar";

/**
 * 8-puzzle state: a flat 9-element array representing a 3x3 grid, row-major.
 * 0 represents the blank tile.
 *
 * Index layout:
 *   0 1 2
 *   3 4 5
 *   6 7 8
 */
export type PuzzleState = readonly number[];

const SIZE = 3;

export const GOAL_STATE: PuzzleState = [1, 2, 3, 4, 5, 6, 7, 8, 0];

function blankIndex(state: PuzzleState): number {
    return state.indexOf(0);
}

function rowOf(index: number): number {
    return Math.floor(index / SIZE);
}

function colOf(index: number): number {
    return index % SIZE;
}

/**
 * Swap two indices in a state, returning a new state (states are treated as
 * immutable so they're safe to store as map keys / heap entries elsewhere).
 */
function swap(state: PuzzleState, i: number, j: number): PuzzleState {
    const next = state.slice();
    [next[i], next[j]] = [next[j], next[i]];
    return next;
}

/**
 * Legal moves from a given blank position: up/down/left/right, bounds-checked.
 * Returns the resulting states after each legal slide.
 */
function legalMoves(state: PuzzleState): PuzzleState[] {
    const blank = blankIndex(state);
    const r = rowOf(blank);
    const c = colOf(blank);
    const moves: PuzzleState[] = [];

    if (r > 0) moves.push(swap(state, blank, blank - SIZE)); // slide tile down (blank moves up)
    if (r < SIZE - 1) moves.push(swap(state, blank, blank + SIZE)); // slide tile up (blank moves down)
    if (c > 0) moves.push(swap(state, blank, blank - 1)); // slide tile right (blank moves left)
    if (c < SIZE - 1) moves.push(swap(state, blank, blank + 1)); // slide tile left (blank moves right)

    return moves;
}

/**
 * Generate a solvable, nontrivial puzzle by construction: start at the goal
 * and take `scrambleMoves` random legal steps. This sidesteps the
 * permutation-parity problem entirely (a random shuffle of tiles is only
 * solvable ~50% of the time) — every state reachable by legal slides from
 * the goal is, by definition, solvable back to the goal.
 *
 * To keep the scramble "nontrivial" rather than wandering back and forth,
 * we avoid immediately undoing the previous move.
 */
export function generateSolvablePuzzle(scrambleMoves = 50): PuzzleState {
    let current: PuzzleState = GOAL_STATE;
    let previousBlank = blankIndex(current);

    for (let i = 0; i < scrambleMoves; i++) {
        const candidates = legalMoves(current).filter(
            (candidate) => blankIndex(candidate) !== previousBlank
        );
        // Fall back to all legal moves if filtering left nothing (can happen
        // in corners with very few options).
        const pool = candidates.length > 0 ? candidates : legalMoves(current);

        previousBlank = blankIndex(current);
        current = pool[Math.floor(Math.random() * pool.length)];
    }

    return current;
}

export function hashPuzzleState(state: PuzzleState): string {
    return state.join(",");
}

/** Heuristic 1: count of tiles not in their goal position (blank excluded). */
export function misplacedTiles(state: PuzzleState): number {
    let count = 0;
    for (let i = 0; i < state.length; i++) {
        if (state[i] !== 0 && state[i] !== GOAL_STATE[i]) count++;
    }
    return count;
}

/** Heuristic 2: sum of Manhattan distances of each tile from its goal position. */
export function manhattanDistance(state: PuzzleState): number {
    let total = 0;
    for (let i = 0; i < state.length; i++) {
        const tile = state[i];
        if (tile === 0) continue;
        const goalIndex = GOAL_STATE.indexOf(tile);
        total += Math.abs(rowOf(i) - rowOf(goalIndex)) + Math.abs(colOf(i) - colOf(goalIndex));
    }
    return total;
}

export type HeuristicName = "misplaced" | "manhattan";

/**
 * Build a Problem<PuzzleState> for astar(), given a starting state and
 * which heuristic to use. Passing the heuristic in as a parameter (rather
 * than hardcoding one) is what lets you run the same puzzle instance
 * through both heuristics and compare nodes expanded / runtime — the
 * actual comparison content for your writeup.
 */
export function makePuzzleProblem(
    start: PuzzleState,
    heuristicName: HeuristicName
): Problem<PuzzleState> {
    const heuristic = heuristicName === "misplaced" ? misplacedTiles : manhattanDistance;

    return {
        start,
        isGoal: (state) => hashPuzzleState(state) === hashPuzzleState(GOAL_STATE),
        neighbors: (state) => legalMoves(state).map((s) => ({ state: s, cost: 1 })),
        heuristic,
        hash: hashPuzzleState,
    };
}
