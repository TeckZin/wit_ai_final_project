import { astar } from "../../src/solver/astar";
import { generateMaze, makeMazeProblem, MazeGrid, MazeState } from "../maze/maze";
import { generateSolvablePuzzle, makePuzzleProblem, PuzzleState } from "../puzzle/puzzle";

type Mode = "menu" | "maze" | "puzzle";

const WIDTH = 640;
const HEIGHT = 640;
const FRAME_MS = 140;

const canvas = document.createElement("canvas");
canvas.width = WIDTH;
canvas.height = HEIGHT;
document.getElementById("app")!.appendChild(canvas);
const ctx = canvas.getContext("2d")!;

let mode: Mode = "menu";
let statusLine = "";

// ---- Maze run state ----
let mazeGrid: MazeGrid | null = null;
let mazePath: MazeState[] | null = null;
let mazeFrame = 0;

// ---- Puzzle run state ----
let puzzlePath: PuzzleState[] | null = null;
let puzzleFrame = 0;

function drawMenu(): void {
    ctx.fillStyle = "#111";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.font = "32px sans-serif";
    ctx.fillText("A* Solver", WIDTH / 2, 220);
    ctx.font = "20px sans-serif";
    ctx.fillText("Press M — solve a maze", WIDTH / 2, 300);
    ctx.fillText("Press P — solve the 8-puzzle", WIDTH / 2, 340);
    ctx.fillText("Backspace — back to menu", WIDTH / 2, 380);
    ctx.textAlign = "left";
}

function startMaze(): void {
    mazeGrid = generateMaze(15, 15);
    const start: MazeState = { row: 0, col: 0 };
    const goal: MazeState = { row: mazeGrid.rows - 1, col: mazeGrid.cols - 1 };
    const result = astar(makeMazeProblem(mazeGrid, start, goal));
    mazePath = result.path;
    mazeFrame = 0;
    statusLine = result.path
        ? `Solved in ${result.metrics.pathLength} steps (${result.metrics.nodesExpanded} nodes expanded)`
        : "No path found";
    mode = "maze";
}

function drawMaze(): void {
    if (!mazeGrid) return;
    const cellSize = Math.floor(Math.min(WIDTH, HEIGHT - 60) / mazeGrid.rows);
    const originX = (WIDTH - cellSize * mazeGrid.cols) / 2;
    const originY = 10;

    ctx.fillStyle = "#111";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.strokeStyle = "#eee";
    ctx.lineWidth = 2;

    const line = (x1: number, y1: number, x2: number, y2: number) => {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
    };

    for (let r = 0; r < mazeGrid.rows; r++) {
        for (let c = 0; c < mazeGrid.cols; c++) {
            const x = originX + c * cellSize;
            const y = originY + r * cellSize;

            if (r === 0) line(x, y, x + cellSize, y);
            if (c === 0) line(x, y, x, y + cellSize);
            if (mazeGrid.wallsRight[r][c]) line(x + cellSize, y, x + cellSize, y + cellSize);
            if (mazeGrid.wallsDown[r][c]) line(x, y + cellSize, x + cellSize, y + cellSize);
        }
    }

    if (mazePath) {
        ctx.fillStyle = "#4caf50";
        for (let i = 0; i <= mazeFrame && i < mazePath.length; i++) {
            const { row, col } = mazePath[i];
            const x = originX + col * cellSize;
            const y = originY + row * cellSize;
            const pad = cellSize * 0.22;
            ctx.fillRect(x + pad, y + pad, cellSize - pad * 2, cellSize - pad * 2);
        }
    }

    drawStatus();
}

function startPuzzle(): void {
    const start = generateSolvablePuzzle(20);
    const result = astar(makePuzzleProblem(start, "manhattan"));
    puzzlePath = result.path;
    puzzleFrame = 0;
    statusLine = result.path
        ? `Solved in ${result.metrics.pathLength} moves (${result.metrics.nodesExpanded} nodes expanded)`
        : "No path found";
    mode = "puzzle";
}

function drawPuzzle(): void {
    ctx.fillStyle = "#111";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    if (!puzzlePath) return;

    const state = puzzlePath[Math.min(puzzleFrame, puzzlePath.length - 1)];
    const cellSize = 160;
    const originX = (WIDTH - cellSize * 3) / 2;
    const originY = 60;

    ctx.textAlign = "center";
    for (let i = 0; i < 9; i++) {
        const r = Math.floor(i / 3);
        const c = i % 3;
        const tile = state[i];
        const x = originX + c * cellSize;
        const y = originY + r * cellSize;

        if (tile !== 0) {
            ctx.fillStyle = "#2196f3";
            ctx.fillRect(x + 4, y + 4, cellSize - 8, cellSize - 8);
            ctx.fillStyle = "#fff";
            ctx.font = "48px sans-serif";
            ctx.fillText(String(tile), x + cellSize / 2, y + cellSize / 2 + 16);
        } else {
            ctx.strokeStyle = "#333";
            ctx.strokeRect(x + 4, y + 4, cellSize - 8, cellSize - 8);
        }
    }
    ctx.textAlign = "left";

    drawStatus();
}

function drawStatus(): void {
    ctx.fillStyle = "#111";
    ctx.fillRect(0, HEIGHT - 34, WIDTH, 34);
    ctx.fillStyle = "#aaa";
    ctx.font = "16px sans-serif";
    ctx.fillText(statusLine + "   (Backspace: menu)", 12, HEIGHT - 12);
}

function render(): void {
    if (mode === "menu") drawMenu();
    else if (mode === "maze") drawMaze();
    else if (mode === "puzzle") drawPuzzle();
}

window.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();

    if (mode === "menu") {
        if (key === "m") startMaze();
        if (key === "p") startPuzzle();
    } else if (key === "backspace") {
        mode = "menu";
    }

    render();
});

render();

setInterval(() => {
    let dirty = false;

    if (mode === "maze" && mazePath && mazeFrame < mazePath.length - 1) {
        mazeFrame++;
        dirty = true;
    }
    if (mode === "puzzle" && puzzlePath && puzzleFrame < puzzlePath.length - 1) {
        puzzleFrame++;
        dirty = true;
    }

    if (dirty) render();
}, FRAME_MS);
