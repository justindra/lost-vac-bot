import { useContext } from "react";
import { GameContext } from "./context";

const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error("useGame must be used within a GameProvider");
  }
  return context;
};

export const useJoystick = () => {
  const { joystickX, joystickY } = useGame();
  return { joystickX, joystickY };
};

export const usePlayer = () => {
  const { playerX, playerY } = useGame();
  return { playerX, playerY };
};

export const useMaze = () => {
  const { mazeData } = useGame();
  return mazeData;
};

export const useCanvasSize = () => {
  const { canvasSize, setCanvasSize } = useGame();
  return { canvasSize, setCanvasSize };
};
