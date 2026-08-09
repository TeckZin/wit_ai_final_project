import { Problem } from "../../src/solver/astar";

/**
 * A "perfect" maze (no loops, every cell reachable from every other cell
 * by exactly one path) represented as a grid of cells with walls tracked
 * per-cell on the right/bottom edge. Since it's a perfect maze, tracking
 * only right+bottom walls per cell is enough to reconstruct the whole
 * grid (the left wall of cell (r,c) is the right wall of (r,c-1), etc.).
 */
export interface Cell {
    row: number;
    col: number;
}

export interface MazeGrid {
    rows: number;
    cols: number;
    /** wallsRight[r][c] === true means there's a wall between (r,c) and (r,c+1). */
    wallsRight: boolean[][];
    /** wallsDown[r][c] === true means there's a wall between (r,c) and (r+1,c). */
    wallsDown: boolean[][];
}

export type MazeState = Cell;

function inBounds(rows: number, cols: number, r: number, c: number): boolean {
    return r >= 0 && r < rows && c >= 0 && c < cols;
}

/**
 * Generate a perfect maze using randomized DFS (recursive backtracker):
 * start from (0,0), repeatedly carve into a random unvisited neighbor,
 * backtracking via a stack when a cell has no unvisited neighbors left.
 * Because every carved passage is the only connection ever made between
 * two cells, the result is guaranteed to be fully connected and loop-free
 * -- i.e. always solvable.
 */
export function generateMaze(rows: number, cols: number): MazeGrid {
    const wallsRight: boolean[][] = Array.from({ length: rows }, () => Array(cols).fill(true));
    const wallsDown: boolean[][] = Array.from({ length: rows }, () => Array(cols).fill(true));
    const visited: boolean[][] = Array.from({ length: rows }, () => Array(cols).fill(false));

    const stack: Cell[] = [{ row: 0, col: 0 }];
    visited[0][0] = true;

    while (stack.length > 0) {
        const current = stack[stack.length - 1];
        const { row: r, col: c } = current;

        type Dir = "up" | "down" | "left" | "right";
        const candidates: { cell: Cell; dir: Dir }[] = [];

        if (inBounds(rows, cols, r - 1, c) && !visited[r - 1][c]) candidates.push({ cell: { row: r - 1, col: c }, dir: "up" });
        if (inBounds(rows, cols, r + 1, c) && !visited[r + 1][c]) candidates.push({ cell: { row: r + 1, col: c }, dir: "down" });
        if (inBounds(rows, cols, r, c - 1) && !visited[r][c - 1]) candidates.push({ cell: { row: r, col: c - 1 }, dir: "left" });
        if (inBounds(rows, cols, r, c + 1) && !visited[r][c + 1]) candidates.push({ cell: { row: r, col: c + 1 }, dir: "right" });

        if (candidates.length === 0) {
            stack.pop();
            continue;
        }

        const { cell: next, dir } = candidates[Math.floor(Math.random() * candidates.length)];

        if (dir === "up") wallsDown[next.row][next.col] = false;
        if (dir === "down") wallsDown[r][c] = false;
        if (dir === "left") wallsRight[next.row][next.col] = false;
        if (dir === "right") wallsRight[r][c] = false;

        visited[next.row][next.col] = true;
        stack.push(next);
    }

    return { rows, cols, wallsRight, wallsDown };
}

export function hashCell(cell: MazeState): string {
    return `${cell.row},${cell.col}`;
}

/**
 * Build a Problem<MazeState> for astar(), given a generated grid and a
 * start/goal cell. Neighbors are whichever of up/down/left/right have no
 * wall in the way; every move costs 1 (uniform grid step).
 */
export function makeMazeProblem(grid: MazeGrid, start: Cell, goal: Cell): Problem<MazeState> {
    return {
        start,
        isGoal: (state) => state.row === goal.row && state.col === goal.col,
        neighbors: (state) => {
            const { row: r, col: c } = state;
            const result: { state: MazeState; cost: number }[] = [];

            if (r > 0 && !grid.wallsDown[r - 1][c]) result.push({ state: { row: r - 1, col: c }, cost: 1 });
            if (r < grid.rows - 1 && !grid.wallsDown[r][c]) result.push({ state: { row: r + 1, col: c }, cost: 1 });
            if (c > 0 && !grid.wallsRight[r][c - 1]) result.push({ state: { row: r, col: c - 1 }, cost: 1 });
            if (c < grid.cols - 1 && !grid.wallsRight[r][c]) result.push({ state: { row: r, col: c + 1 }, cost: 1 });

            return result;
        },
        heuristic: (state) => Math.abs(state.row - goal.row) + Math.abs(state.col - goal.col),
        hash: hashCell,
    };
}
