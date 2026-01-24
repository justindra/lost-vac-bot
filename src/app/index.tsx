import { Text, View } from "react-native";
import { Joystick } from "../components/joystick";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { GameProvider } from "../components/game";
import { GameScreenLoader as GameScreen } from "../components/game-screen";
import { colors } from "../styles";

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
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={{ color: colors.main }}>Left Panel</Text>
        </View>
        {/* Game Screen */}
        <View style={{ flex: 3 }}>
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
