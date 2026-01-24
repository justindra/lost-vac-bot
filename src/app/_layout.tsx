import { Stack } from "expo-router";
import { GameProvider } from "../components/game";

export default function RootLayout() {
  return (
    <GameProvider>
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      />
    </GameProvider>
  );
}
