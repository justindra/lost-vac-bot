import { createContext } from "react";
import { type SharedValue } from "react-native-reanimated";
import type { MazeData } from "@/src/maze/types";

type GameContextType = {
  joystickX: SharedValue<number>;
  joystickY: SharedValue<number>;
  playerX: SharedValue<number>;
  playerY: SharedValue<number>;
  mazeData: MazeData | null;
  canvasSize: { width: number; height: number };
  setCanvasSize: (size: { width: number; height: number }) => void;
  flashOpacity: SharedValue<number>;
  fogRadius: SharedValue<number>;
  fogOpacity: SharedValue<number>;
  battery: SharedValue<number>;
  gameOver: boolean;
  restartGame: () => void;
  level: number;
  countdownActive: boolean;
};

export const GameContext = createContext<GameContextType | null>(null);
