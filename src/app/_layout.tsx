import { useEffect } from "react";
import { Stack } from "expo-router";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { GameProvider } from "../components/game";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    PressStart2P: require("../../assets/fonts/Press_Start_2P/PressStart2P-Regular.ttf"),
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GameProvider>
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="story" options={{ animation: "fade" }} />
        <Stack.Screen name="game" options={{ animation: "fade" }} />
        <Stack.Screen name="game-over" options={{ animation: "fade" }} />
      </Stack>
    </GameProvider>
  );
}
