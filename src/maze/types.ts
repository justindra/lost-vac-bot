export type Wall = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

export type MazeData = {
  walls: Wall[];
  wallsFlat: number[]; // [x1, y1, x2, y2, ...] for worklet consumption
  wallCount: number;
  start: { x: number; y: number };
  exit: { x: number; y: number };
  cols: number;
  rows: number;
  cellSize: number;
};
