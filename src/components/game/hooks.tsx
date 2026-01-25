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
  const { playerX, playerY, playerRadius } = useGame();
  return { playerX, playerY, playerRadius };
};

export const useMaze = () => {
  const { mazeData } = useGame();
  return mazeData;
};

export const useCanvasSize = () => {
  const { canvasSize, setCanvasSize } = useGame();
  return { canvasSize, setCanvasSize };
};

export const useFlash = () => {
  const { flashOpacity } = useGame();
  return flashOpacity;
};

export const useFog = () => {
  const { fogRadius, fogOpacity } = useGame();
  return { fogRadius, fogOpacity };
};

export const useBattery = () => {
  const { battery } = useGame();
  return battery;
};

export const useGameOver = () => {
  const { gameOver, restartGame, resetGame, level, score } = useGame();
  return { gameOver, restartGame, resetGame, level, score };
};

export const useScore = () => {
  const { score } = useGame();
  return score;
};

export const useHighScore = () => {
  const { highScore } = useGame();
  return highScore;
};

export const useVisitedCells = () => {
  const { visitedCells } = useGame();
  return visitedCells;
};

export const useCountdown = () => {
  const { countdownActive } = useGame();
  return countdownActive;
};

export const usePowerUps = () => {
  const { mazeData, powerUpsCollected } = useGame();
  return { powerUps: mazeData?.powerUps ?? [], powerUpsCollected };
};
