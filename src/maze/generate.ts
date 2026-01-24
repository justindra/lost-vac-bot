import { CELL_SIZE } from "./constants";
import type { MazeData, MazeLocation, PowerUp, Wall } from "./types";

const ALL_LOCATIONS: MazeLocation[] = [
  "top-left",
  "top-right",
  "bottom-left",
  "bottom-right",
  "center",
];

/**
 * Map a MazeLocation to cell coordinates (col, row) within the grid.
 */
function locationToCell(
  location: MazeLocation,
  cols: number,
  rows: number,
): [number, number] {
  switch (location) {
    case "top-left":
      return [0, 0];
    case "top-right":
      return [cols - 1, 0];
    case "bottom-left":
      return [0, rows - 1];
    case "bottom-right":
      return [cols - 1, rows - 1];
    case "center":
      return [Math.floor(cols / 2), Math.floor(rows / 2)];
  }
}

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
 * The DFS starts from the given cell, which tends to create longer paths from there.
 */
function generateGrid(
  cols: number,
  rows: number,
  startCol: number,
  startRow: number,
): number[][] {
  // Initialize grid: each cell has all walls (N|S|E|W = 15)
  const grid: number[][] = Array.from({ length: rows }, () =>
    Array(cols).fill(N | S | E | W),
  );

  const visited: boolean[][] = Array.from({ length: rows }, () =>
    Array(cols).fill(false),
  );

  // Iterative DFS with explicit stack (avoids call stack overflow for large mazes)
  const stack: [number, number][] = [];

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
 * Find dead-end cells in the grid (cells with only 1 open passage).
 * A dead-end has exactly 3 walls remaining (only 1 wall flag removed).
 */
function findDeadEnds(
  grid: number[][],
  cols: number,
  rows: number,
): [number, number][] {
  const deadEnds: [number, number][] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const cell = grid[row][col];
      // Count how many walls are still present (bits set)
      let wallCount = 0;
      if (cell & N) wallCount++;
      if (cell & S) wallCount++;
      if (cell & E) wallCount++;
      if (cell & W) wallCount++;
      // Dead-end: 3 walls present means only 1 opening
      if (wallCount === 3) {
        deadEnds.push([col, row]);
      }
    }
  }
  return deadEnds;
}

/**
 * Place battery power-ups in dead-end cells of the maze.
 * Excludes the start and exit cells.
 */
function placePowerUps(
  grid: number[][],
  cols: number,
  rows: number,
  cellSize: number,
  offsetX: number,
  offsetY: number,
  startCol: number,
  startRow: number,
  exitCol: number,
  exitRow: number,
  count: number,
): PowerUp[] {
  if (count <= 0) return [];

  const deadEnds = findDeadEnds(grid, cols, rows);

  // Exclude start and exit cells
  const candidates = deadEnds.filter(
    ([col, row]) =>
      !(col === startCol && row === startRow) &&
      !(col === exitCol && row === exitRow),
  );

  if (candidates.length === 0) return [];

  // Shuffle and pick up to `count` candidates
  const shuffled = candidates.sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, Math.min(count, shuffled.length));

  return selected.map(([col, row]) => ({
    x: offsetX + col * cellSize + cellSize / 2,
    y: offsetY + row * cellSize + cellSize / 2,
  }));
}

/**
 * Generate a complete maze that fits within the given canvas dimensions.
 * @param startLocation - Which location the player starts at (defaults to "center").
 *   The exit is randomly chosen from the remaining 4 locations.
 * @param powerUpCount - Number of battery power-ups to place (0 = none).
 */
export function generateMaze(
  canvasWidth: number,
  canvasHeight: number,
  startLocation: MazeLocation = "center",
  powerUpCount: number = 0,
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

  // Determine start and exit cells
  const [startCol, startRow] = locationToCell(
    startLocation,
    safeCols,
    safeRows,
  );

  // Pick a random exit from the other 4 locations
  const exitCandidates = ALL_LOCATIONS.filter((loc) => loc !== startLocation);
  const exitLocation =
    exitCandidates[Math.floor(Math.random() * exitCandidates.length)];
  const [exitCol, exitRow] = locationToCell(exitLocation, safeCols, safeRows);

  // Generate the maze grid, starting DFS from the player's start cell
  const grid = generateGrid(safeCols, safeRows, startCol, startRow);
  const walls = gridToWalls(
    grid,
    safeCols,
    safeRows,
    cellSize,
    offsetX,
    offsetY,
  );
  const wallsFlat = flattenWalls(walls);

  // Pixel positions: center of the respective cells
  const start = {
    x: offsetX + startCol * cellSize + cellSize / 2,
    y: offsetY + startRow * cellSize + cellSize / 2,
  };

  const exit = {
    x: offsetX + exitCol * cellSize + cellSize / 2,
    y: offsetY + exitRow * cellSize + cellSize / 2,
  };

  // Place battery power-ups in dead-end cells
  const powerUps = placePowerUps(
    grid,
    safeCols,
    safeRows,
    cellSize,
    offsetX,
    offsetY,
    startCol,
    startRow,
    exitCol,
    exitRow,
    powerUpCount,
  );

  return {
    walls,
    wallsFlat,
    wallCount: walls.length,
    start,
    exit,
    startLocation,
    exitLocation,
    cols: safeCols,
    rows: safeRows,
    cellSize,
    offsetX,
    offsetY,
    powerUps,
  };
}
