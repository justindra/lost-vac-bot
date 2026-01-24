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
import {
  PLAYER_RADIUS,
  FOG_INITIAL_RADIUS,
  FOG_MIN_RADIUS,
  BATTERY_DRAIN_RATE,
} from "@/src/maze/constants";
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

  // Battery & fog of war state
  const battery = useSharedValue(100);
  const fogRadius = useSharedValue(FOG_INITIAL_RADIUS);
  const [gameOver, setGameOver] = useState(false);
  const [level, setLevel] = useState(1);

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

    // Increment level counter
    setLevel((l) => l + 1);

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

  const handleGameOver = useCallback(() => {
    setGameOver(true);
  }, []);

  const restartGame = useCallback(() => {
    setGameOver(false);
    setLevel(1);
    battery.value = 100;
    fogRadius.value = FOG_INITIAL_RADIUS;
    lastExitLocation.current = undefined;
    transitioning.value = false;

    const { width, height } = canvasSizeRef.current;
    if (width === 0 || height === 0) return;

    const maze = generateMaze(width, height);
    setMazeData(maze);
    lastExitLocation.current = maze.exitLocation;

    wallsFlat.value = maze.wallsFlat;
    wallCount.value = maze.wallCount;
    exitX.value = maze.exit.x;
    exitY.value = maze.exit.y;
    playerX.value = maze.start.x;
    playerY.value = maze.start.y;
  }, [
    battery,
    fogRadius,
    transitioning,
    wallsFlat,
    wallCount,
    exitX,
    exitY,
    playerX,
    playerY,
  ]);

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

    // Drain battery and derive fog radius
    battery.value = Math.max(
      0,
      battery.value - BATTERY_DRAIN_RATE * (dt / 1000),
    );
    fogRadius.value =
      FOG_MIN_RADIUS +
      (FOG_INITIAL_RADIUS - FOG_MIN_RADIUS) * (battery.value / 100);

    // Check for game over (battery depleted)
    if (battery.value <= 0) {
      transitioning.value = true;
      runOnJS(handleGameOver)();
      return;
    }

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
      fogRadius,
      battery,
      gameOver,
      restartGame,
      level,
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
      fogRadius,
      battery,
      gameOver,
      restartGame,
      level,
    ],
  );

  return (
    <GameContext.Provider value={contextValue}>{children}</GameContext.Provider>
  );
};

export * from "./hooks";
