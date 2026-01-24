import { CELL_SIZE } from "./constants";
import type { MazeData, Wall } from "./types";

// Direction vectors: [dx, dy] for N, S, E, W
const DIRS = [
  [0, -1], // North
  [0, 1], // South
  [1, 0], // East
  [-1, 0], // West
] as const;

// Wall flags for each cell (bitmask)
const N = 1;
const S = 2;
const E = 4;
const W = 8;

// Map direction index to wall flag pairs [current cell flag, neighbor flag]
const DIR_FLAGS: [number, number][] = [
  [N, S], // Moving North: remove N wall from current, S wall from neighbor
  [S, N], // Moving South
  [E, W], // Moving East
  [W, E], // Moving West
];

/**
 * Generate a maze using recursive backtracker (DFS).
 * Each cell starts with all 4 walls. The algorithm carves passages
 * by removing walls between adjacent cells.
 */
function generateGrid(cols: number, rows: number): number[][] {
  // Initialize grid: each cell has all walls (N|S|E|W = 15)
  const grid: number[][] = Array.from({ length: rows }, () =>
    Array(cols).fill(N | S | E | W),
  );

  const visited: boolean[][] = Array.from({ length: rows }, () =>
    Array(cols).fill(false),
  );

  // Iterative DFS with explicit stack (avoids call stack overflow for large mazes)
  const stack: [number, number][] = [];
  const startCol = 0;
  const startRow = 0;

  visited[startRow][startCol] = true;
  stack.push([startCol, startRow]);

  while (stack.length > 0) {
    const [cx, cy] = stack[stack.length - 1];

    // Find unvisited neighbors
    const neighbors: number[] = [];
    for (let d = 0; d < 4; d++) {
      const nx = cx + DIRS[d][0];
      const ny = cy + DIRS[d][1];
      if (nx >= 0 && nx < cols && ny >= 0 && ny < rows && !visited[ny][nx]) {
        neighbors.push(d);
      }
    }

    if (neighbors.length === 0) {
      // Backtrack
      stack.pop();
    } else {
      // Choose random unvisited neighbor
      const dirIndex = neighbors[Math.floor(Math.random() * neighbors.length)];
      const nx = cx + DIRS[dirIndex][0];
      const ny = cy + DIRS[dirIndex][1];

      // Remove walls between current and neighbor
      const [currentFlag, neighborFlag] = DIR_FLAGS[dirIndex];
      grid[cy][cx] &= ~currentFlag;
      grid[ny][nx] &= ~neighborFlag;

      visited[ny][nx] = true;
      stack.push([nx, ny]);
    }
  }

  return grid;
}

/**
 * Convert the grid wall flags into line segments (pixel coordinates).
 * Each cell can have up to 4 walls, but we only emit the North and West
 * walls for interior cells (to avoid duplicates), plus the boundary walls.
 */
function gridToWalls(
  grid: number[][],
  cols: number,
  rows: number,
  cellSize: number,
  offsetX: number,
  offsetY: number,
): Wall[] {
  const walls: Wall[] = [];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = col * cellSize + offsetX;
      const y = row * cellSize + offsetY;
      const cell = grid[row][col];

      // North wall (only for first row, others are handled by the cell above's south wall)
      if (row === 0 && cell & N) {
        walls.push({ x1: x, y1: y, x2: x + cellSize, y2: y });
      }

      // West wall (only for first column)
      if (col === 0 && cell & W) {
        walls.push({ x1: x, y1: y, x2: x, y2: y + cellSize });
      }

      // South wall
      if (cell & S) {
        walls.push({
          x1: x,
          y1: y + cellSize,
          x2: x + cellSize,
          y2: y + cellSize,
        });
      }

      // East wall
      if (cell & E) {
        walls.push({
          x1: x + cellSize,
          y1: y,
          x2: x + cellSize,
          y2: y + cellSize,
        });
      }
    }
  }

  return walls;
}

/**
 * Flatten walls into a number array: [x1, y1, x2, y2, x1, y1, x2, y2, ...]
 * This format is worklet-compatible (no object access needed in the game loop).
 */
function flattenWalls(walls: Wall[]): number[] {
  const flat: number[] = new Array(walls.length * 4);
  for (let i = 0; i < walls.length; i++) {
    const w = walls[i];
    flat[i * 4] = w.x1;
    flat[i * 4 + 1] = w.y1;
    flat[i * 4 + 2] = w.x2;
    flat[i * 4 + 3] = w.y2;
  }
  return flat;
}

/**
 * Generate a complete maze that fits within the given canvas dimensions.
 */
export function generateMaze(
  canvasWidth: number,
  canvasHeight: number,
): MazeData {
  const cellSize = CELL_SIZE;
  const cols = Math.floor(canvasWidth / cellSize);
  const rows = Math.floor(canvasHeight / cellSize);

  // Ensure minimum size
  const safeCols = Math.max(3, cols);
  const safeRows = Math.max(3, rows);

  // Center the maze in the canvas
  const offsetX = (canvasWidth - safeCols * cellSize) / 2;
  const offsetY = (canvasHeight - safeRows * cellSize) / 2;

  const grid = generateGrid(safeCols, safeRows);
  const walls = gridToWalls(
    grid,
    safeCols,
    safeRows,
    cellSize,
    offsetX,
    offsetY,
  );
  const wallsFlat = flattenWalls(walls);

  // Start position: center of top-left cell (offset applied)
  const start = {
    x: offsetX + cellSize / 2,
    y: offsetY + cellSize / 2,
  };

  // Exit position: center of bottom-right cell (offset applied)
  const exit = {
    x: offsetX + (safeCols - 1) * cellSize + cellSize / 2,
    y: offsetY + (safeRows - 1) * cellSize + cellSize / 2,
  };

  return {
    walls,
    wallsFlat,
    wallCount: walls.length,
    start,
    exit,
    cols: safeCols,
    rows: safeRows,
    cellSize,
  };
}
