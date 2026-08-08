/**
 * Generic A* search, domain-agnostic.
 *
 * Both the maze and the 8-puzzle implement `Problem<State>` and hand it to
 * `astar()`. This keeps the algorithm identical across domains so the
 * comparison is actually apples-to-apples.
 *
 * Note: we do NOT track a "success rate" metric. With an admissible
 * heuristic on a solvable, finite-state problem, A* is complete and optimal
 * — it will find a solution every time. If it doesn't, that's a bug in the
 * heuristic or state expansion, not a property worth reporting on. The
 * `solved` field below exists purely as a sanity-check assertion, not as a
 * headline metric.
 */

export interface Neighbor<State> {
  state: State;
  cost: number; // edge cost from the current state to this neighbor
}

export interface Problem<State> {
  start: State;
  isGoal(state: State): boolean;
  neighbors(state: State): Neighbor<State>[];
  heuristic(state: State): number;
  /** Unique string key for a state — used for visited/closed sets and the
   *  open-set membership check. Two states that are "the same" must hash
   *  to the same string. */
  hash(state: State): string;
}

export interface AStarMetrics {
  nodesExpanded: number; // number of states popped off the frontier and expanded
  nodesGenerated: number; // number of neighbor states generated (includes duplicates)
  maxFrontierSize: number; // peak size of the open set, useful as a memory proxy
  runtimeMs: number;
  pathLength: number; // number of steps (edges) in the solution path
  pathCost: number; // total g(goal)
  solved: boolean; // sanity check only — see note above
}

export interface AStarResult<State> {
  path: State[] | null;
  metrics: AStarMetrics;
}

interface HeapEntry<State> {
  state: State;
  key: string;
  g: number; // cost from start
  f: number; // g + heuristic
  parentKey: string | null;
}

/**
 * Minimal binary min-heap keyed on `f`. A plain array + sort (or a linear
 * scan for the minimum) works for small mazes but degrades fast on the
 * 8-puzzle's larger branching search space, so we use a real heap here to
 * keep runtime comparisons meaningful rather than dominated by frontier
 * bookkeeping.
 */
class MinHeap<T> {
  private items: { priority: number; value: T }[] = [];

  get size(): number {
    return this.items.length;
  }

  push(priority: number, value: T): void {
    this.items.push({ priority, value });
    this.bubbleUp(this.items.length - 1);
  }

  pop(): T | undefined {
    if (this.items.length === 0) return undefined;
    const top = this.items[0];
    const last = this.items.pop()!;
    if (this.items.length > 0) {
      this.items[0] = last;
      this.bubbleDown(0);
    }
    return top.value;
  }

  private bubbleUp(index: number): void {
    while (index > 0) {
      const parent = (index - 1) >> 1;
      if (this.items[parent].priority <= this.items[index].priority) break;
      [this.items[parent], this.items[index]] = [this.items[index], this.items[parent]];
      index = parent;
    }
  }

  private bubbleDown(index: number): void {
    const n = this.items.length;
    while (true) {
      const left = 2 * index + 1;
      const right = 2 * index + 2;
      let smallest = index;
      if (left < n && this.items[left].priority < this.items[smallest].priority) smallest = left;
      if (right < n && this.items[right].priority < this.items[smallest].priority) smallest = right;
      if (smallest === index) break;
      [this.items[smallest], this.items[index]] = [this.items[index], this.items[smallest]];
      index = smallest;
    }
  }
}

export function astar<State>(problem: Problem<State>): AStarResult<State> {
  const startTime = performance.now();

  const open = new MinHeap<HeapEntry<State>>();
  const bestG = new Map<string, number>(); // best known g-cost per state key
  const cameFrom = new Map<string, { state: State; parentKey: string | null }>();
  const closed = new Set<string>();

  const startKey = problem.hash(problem.start);
  const startEntry: HeapEntry<State> = {
    state: problem.start,
    key: startKey,
    g: 0,
    f: problem.heuristic(problem.start),
    parentKey: null,
  };

  open.push(startEntry.f, startEntry);
  bestG.set(startKey, 0);
  cameFrom.set(startKey, { state: problem.start, parentKey: null });

  let nodesExpanded = 0;
  let nodesGenerated = 0;
  let maxFrontierSize = 1;

  let goalEntry: HeapEntry<State> | null = null;

  while (open.size > 0) {
    maxFrontierSize = Math.max(maxFrontierSize, open.size);

    const current = open.pop()!;

    // Stale entry check: we don't decrease-key in the heap, we just push a
    // fresh entry whenever we find a better g. So skip entries that are
    // worse than the best known g for that state.
    const knownBest = bestG.get(current.key);
    if (knownBest !== undefined && current.g > knownBest) continue;
    if (closed.has(current.key)) continue;

    closed.add(current.key);
    nodesExpanded++;

    if (problem.isGoal(current.state)) {
      goalEntry = current;
      break;
    }

    for (const { state: neighborState, cost } of problem.neighbors(current.state)) {
      nodesGenerated++;
      const neighborKey = problem.hash(neighborState);
      if (closed.has(neighborKey)) continue;

      const tentativeG = current.g + cost;
      const existingG = bestG.get(neighborKey);

      if (existingG === undefined || tentativeG < existingG) {
        bestG.set(neighborKey, tentativeG);
        cameFrom.set(neighborKey, { state: neighborState, parentKey: current.key });
        const f = tentativeG + problem.heuristic(neighborState);
        open.push(f, {
          state: neighborState,
          key: neighborKey,
          g: tentativeG,
          f,
          parentKey: current.key,
        });
      }
    }
  }

  const runtimeMs = performance.now() - startTime;

  if (!goalEntry) {
    // If this fires on a problem you believe is solvable, that's a bug to
    // fix (bad heuristic, wrong neighbor generation, wrong goal test) —
    // not something to report as a "failure rate".
    return {
      path: null,
      metrics: {
        nodesExpanded,
        nodesGenerated,
        maxFrontierSize,
        runtimeMs,
        pathLength: 0,
        pathCost: 0,
        solved: false,
      },
    };
  }

  // Reconstruct path by walking cameFrom back to the start.
  const path: State[] = [];
  let key: string | null = goalEntry.key;
  while (key !== null) {
    const entry: { state: State; parentKey: string | null } = cameFrom.get(key)!;
    path.push(entry.state);
    key = entry.parentKey;
  }
  path.reverse();

  return {
    path,
    metrics: {
      nodesExpanded,
      nodesGenerated,
      maxFrontierSize,
      runtimeMs,
      pathLength: path.length - 1,
      pathCost: goalEntry.g,
      solved: true,
    },
  };
}