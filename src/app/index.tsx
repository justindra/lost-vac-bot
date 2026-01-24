import { Text, View } from "react-native";
import { Joystick } from "../components/joystick";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { GameProvider } from "../components/game";
import { GameScreenLoader as GameScreen } from "../components/game-screen";
import { colors, spacing } from "../styles";
import FontAwesome from "@expo/vector-icons/FontAwesome";

export default function Index() {
  return (
    <GameProvider>
      <View
        style={{
          flex: 1,
          flexDirection: "row",
          justifyContent: "center",
          backgroundColor: colors.background,
        }}
      >
        {/* Left Panel */}
        <View
          style={{ flex: 1, alignItems: "center", paddingVertical: spacing.md }}
        >
          <FontAwesome name="battery-full" size={32} color={colors.main} />
          {/* High Score */}
          <Text style={{ color: colors.main }}>High Score: 100</Text>
          {/* Restart button */}
        </View>
        {/* Game Screen */}
        <View style={{ flex: 3, padding: spacing.md }}>
          <GameScreen />
        </View>
        {/* Right Panel */}
        <GestureHandlerRootView>
          <View
            style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
          >
            <Joystick />
          </View>
        </GestureHandlerRootView>
      </View>
    </GameProvider>
  );
}
