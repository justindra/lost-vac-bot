import { useCallback, useMemo, useState } from "react";
import { useSharedValue, useFrameCallback } from "react-native-reanimated";
import { GameContext } from "./context";
import { generateMaze } from "@/src/maze/generate";
import { resolveCollisions } from "@/src/maze/collision";
import type { MazeData } from "@/src/maze/types";

const SPEED = 3;

export const GameProvider: React.FC<React.PropsWithChildren> = ({
  children,
}) => {
  const joystickX = useSharedValue(0);
  const joystickY = useSharedValue(0);
  const playerX = useSharedValue(0);
  const playerY = useSharedValue(0);

  const [canvasSize, setCanvasSizeState] = useState({ width: 0, height: 0 });
  const [mazeData, setMazeData] = useState<MazeData | null>(null);

  // Shared values for worklet access to maze wall data
  const wallsFlat = useSharedValue<number[]>([]);
  const wallCount = useSharedValue(0);

  const setCanvasSize = useCallback(
    (size: { width: number; height: number }) => {
      // Only generate maze once (first layout)
      if (canvasSize.width > 0 && canvasSize.height > 0) return;

      setCanvasSizeState(size);

      const maze = generateMaze(size.width, size.height);
      setMazeData(maze);

      // Set shared values for worklet access
      wallsFlat.value = maze.wallsFlat;
      wallCount.value = maze.wallCount;

      // Set player start position
      playerX.value = maze.start.x;
      playerY.value = maze.start.y;
    },
    [
      canvasSize.width,
      canvasSize.height,
      wallsFlat,
      wallCount,
      playerX,
      playerY,
    ],
  );

  useFrameCallback((frameInfo) => {
    "worklet";
    const dt = frameInfo.timeSincePreviousFrame ?? 16.67;
    const dtRatio = dt / 16.67;

    // Skip if no maze loaded yet
    if (wallCount.value === 0) return;

    // Compute intended position
    const newX = playerX.value + joystickX.value * SPEED * dtRatio;
    const newY = playerY.value + joystickY.value * SPEED * dtRatio;

    // Resolve collisions with maze walls
    const resolved = resolveCollisions(
      newX,
      newY,
      wallsFlat.value,
      wallCount.value,
    );

    playerX.value = resolved[0];
    playerY.value = resolved[1];
  });

  const contextValue = useMemo(
    () => ({
      joystickX,
      joystickY,
      playerX,
      playerY,
      mazeData,
      canvasSize,
      setCanvasSize,
    }),
    [
      joystickX,
      joystickY,
      playerX,
      playerY,
      mazeData,
      canvasSize,
      setCanvasSize,
    ],
  );

  return (
    <GameContext.Provider value={contextValue}>{children}</GameContext.Provider>
  );
};

export * from "./hooks";
