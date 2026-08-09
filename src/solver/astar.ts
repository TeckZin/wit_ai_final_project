export interface Neighbor<State> {
    state: State;
    cost: number;
}

export interface Problem<State> {
    start: State;
    isGoal(state: State): boolean;
    neighbors(state: State): Neighbor<State>[];
    heuristic(state: State): number;
    hash(state: State): string;
}

export interface AStarMetrics {
    nodesExpanded: number;
    nodesGenerated: number;
    maxFrontierSize: number;
    runtimeMs: number;
    pathLength: number;
    pathCost: number;
    solved: boolean;
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
    const bestG = new Map<string, number>();
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
