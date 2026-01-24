import { useCallback, useMemo, useRef, useState } from "react";
import {
  useSharedValue,
  useFrameCallback,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { GameContext } from "./context";
import { generateMaze } from "@/src/maze/generate";
import { resolveCollisions } from "@/src/maze/collision";
import { PLAYER_RADIUS } from "@/src/maze/constants";
import type { MazeData, MazeLocation } from "@/src/maze/types";

const SPEED = 3;
const EXIT_THRESHOLD = PLAYER_RADIUS; // Distance to trigger exit
const FLASH_DURATION = 400; // ms

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

  // Exit position shared values (for worklet access)
  const exitX = useSharedValue(0);
  const exitY = useSharedValue(0);

  // Transition state
  const transitioning = useSharedValue(false);
  const flashOpacity = useSharedValue(0);

  // Store canvas size in a ref so regenerateMaze always has the latest
  const canvasSizeRef = useRef({ width: 0, height: 0 });

  // Track the last exit location so the next maze starts there
  const lastExitLocation = useRef<MazeLocation | undefined>(undefined);

  const regenerateMaze = useCallback(() => {
    const { width, height } = canvasSizeRef.current;
    if (width === 0 || height === 0) return;

    // Trigger flash animation
    flashOpacity.value = 1;
    flashOpacity.value = withTiming(0, { duration: FLASH_DURATION });

    // Generate new maze, starting where the previous exit was
    const maze = generateMaze(width, height, lastExitLocation.current);
    setMazeData(maze);
    lastExitLocation.current = maze.exitLocation;

    // Update shared values for worklet
    wallsFlat.value = maze.wallsFlat;
    wallCount.value = maze.wallCount;
    exitX.value = maze.exit.x;
    exitY.value = maze.exit.y;

    // Reset player to new start
    playerX.value = maze.start.x;
    playerY.value = maze.start.y;

    // Allow exit detection again after flash completes
    setTimeout(() => {
      transitioning.value = false;
    }, FLASH_DURATION);
  }, [
    flashOpacity,
    wallsFlat,
    wallCount,
    exitX,
    exitY,
    playerX,
    playerY,
    transitioning,
  ]);

  const setCanvasSize = useCallback(
    (size: { width: number; height: number }) => {
      // Only generate maze once (first layout)
      if (canvasSizeRef.current.width > 0 && canvasSizeRef.current.height > 0)
        return;

      setCanvasSizeState(size);
      canvasSizeRef.current = size;

      const maze = generateMaze(size.width, size.height);
      setMazeData(maze);
      lastExitLocation.current = maze.exitLocation;

      // Set shared values for worklet access
      wallsFlat.value = maze.wallsFlat;
      wallCount.value = maze.wallCount;
      exitX.value = maze.exit.x;
      exitY.value = maze.exit.y;

      // Set player start position
      playerX.value = maze.start.x;
      playerY.value = maze.start.y;
    },
    [wallsFlat, wallCount, exitX, exitY, playerX, playerY],
  );

  useFrameCallback((frameInfo) => {
    "worklet";
    const dt = frameInfo.timeSincePreviousFrame ?? 16.67;
    const dtRatio = dt / 16.67;

    // Skip if no maze loaded yet or transitioning
    if (wallCount.value === 0) return;
    if (transitioning.value) return;

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

    // Check if player reached the exit
    const dx = playerX.value - exitX.value;
    const dy = playerY.value - exitY.value;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < EXIT_THRESHOLD) {
      transitioning.value = true;
      runOnJS(regenerateMaze)();
    }
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
      flashOpacity,
    }),
    [
      joystickX,
      joystickY,
      playerX,
      playerY,
      mazeData,
      canvasSize,
      setCanvasSize,
      flashOpacity,
    ],
  );

  return (
    <GameContext.Provider value={contextValue}>{children}</GameContext.Provider>
  );
};

export * from "./hooks";
