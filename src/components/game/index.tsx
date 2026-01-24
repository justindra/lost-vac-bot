import { useSharedValue, useFrameCallback } from "react-native-reanimated";
import { GameContext } from "./context";

const SPEED = 3;

export const GameProvider: React.FC<React.PropsWithChildren> = ({
  children,
}) => {
  const joystickX = useSharedValue(0);
  const joystickY = useSharedValue(0);
  const playerX = useSharedValue(0);
  const playerY = useSharedValue(0);

  useFrameCallback((frameInfo) => {
    "worklet";
    const dt = frameInfo.timeSincePreviousFrame ?? 16.67;
    playerX.value += joystickX.value * SPEED * (dt / 16.67);
    playerY.value += joystickY.value * SPEED * (dt / 16.67);
  });

  return (
    <GameContext.Provider value={{ joystickX, joystickY, playerX, playerY }}>
      {children}
    </GameContext.Provider>
  );
};

export * from "./hooks";
