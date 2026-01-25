import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Button } from "../components/button";
import { useHighScore } from "../components/game";
import { colors, fonts } from "../styles";

export default function StartScreen() {
  const router = useRouter();
  const highScore = useHighScore();

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        alignItems: "center",
        justifyContent: "center",
        gap: 32,
      }}
    >
      <Text
        style={{
          color: colors.main,
          fontSize: 48,
          fontWeight: "bold",
          fontFamily: fonts.main,
          textAlign: "center",
        }}
      >
        LOST ROOMBA
      </Text>
      {highScore > 0 && (
        <Text
          style={{
            color: colors.main,
            fontSize: 14,
            fontFamily: fonts.main,
            opacity: 0.7,
          }}
        >
          High Score: {highScore}
        </Text>
      )}
      <Button label="START" onPress={() => router.replace("/game")} />
    </View>
  );
}
