export type Wall = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

export type MazeLocation =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right"
  | "center";

export type MazeData = {
  walls: Wall[];
  wallsFlat: number[]; // [x1, y1, x2, y2, ...] for worklet consumption
  wallCount: number;
  start: { x: number; y: number };
  exit: { x: number; y: number };
  startLocation: MazeLocation;
  exitLocation: MazeLocation;
  cols: number;
  rows: number;
  cellSize: number;
  offsetX: number;
  offsetY: number;
};
