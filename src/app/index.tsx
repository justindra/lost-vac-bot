import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Button } from "../components/button";
import { colors, fonts } from "../styles";

export default function StartScreen() {
  const router = useRouter();

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
      <Button label="START" onPress={() => router.replace("/game")} />
    </View>
  );
}
