import { astar } from "../../src/solver/astar";
import { generateSolvablePuzzle, makePuzzleProblem, PuzzleState } from "./puzzle";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function printGrid(state: PuzzleState, stepLabel: string): void {
  console.log(stepLabel);
  for (let r = 0; r < 3; r++) {
    const row = state.slice(r * 3, r * 3 + 3).map((tile) => (tile === 0 ? " " : tile));
    console.log(row.join(" "));
  }
  console.log();
}

async function main() {
  // Manhattan distance is the faster heuristic, which matters here since
  // we want a snappy demo rather than a long solve time.
  const start = generateSolvablePuzzle(20); // fewer scrambles = shorter, more demo-friendly solution
  const problem = makePuzzleProblem(start, "manhattan");
  const result = astar(problem);

  if (!result.path) {
    console.log("No solution found (this shouldn't happen for a generated-solvable puzzle).");
    return;
  }

  console.log(`Solving in ${result.metrics.pathLength} moves...\n`);
  await sleep(1000);

  for (let i = 0; i < result.path.length; i++) {
    const label = i === 0 ? "Start:" : `Move ${i}:`;
    printGrid(result.path[i], label);
    await sleep(700); // pause between frames so it reads as an animation
  }

  console.log("Solved!");
}

main();