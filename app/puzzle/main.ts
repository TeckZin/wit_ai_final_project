import { astar } from "../../src/solver/astar";
import { generateSolvablePuzzle, makePuzzleProblem, PuzzleState } from "./puzzle";

function printGrid(state: PuzzleState): void {
  for (let r = 0; r < 3; r++) {
    console.log(state.slice(r * 3, r * 3 + 3).join(" "));
  }
}

function main() {
  const start = generateSolvablePuzzle(50);

  console.log("Start state:");
  printGrid(start);
  console.log();

  for (const heuristicName of ["misplaced", "manhattan"] as const) {
    const problem = makePuzzleProblem(start, heuristicName);
    const result = astar(problem);

    console.log(`Heuristic: ${heuristicName}`);
    console.log("Metrics:", result.metrics);
    console.log();
  }
}

main();