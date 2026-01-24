import { createContext } from "react";
import { type SharedValue } from "react-native-reanimated";

type GameContextType = {
  joystickX: SharedValue<number>;
  joystickY: SharedValue<number>;
  playerX: SharedValue<number>;
  playerY: SharedValue<number>;
};

export const GameContext = createContext<GameContextType | null>(null);
