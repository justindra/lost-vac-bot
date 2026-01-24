import { Text } from "react-native";
import { WithSkiaWeb } from "@shopify/react-native-skia/lib/module/web";
import { version } from "canvaskit-wasm/package.json";

export const GameScreenLoader: React.FC = () => {
  return (
    <WithSkiaWeb
      opts={{
        locateFile: (file: string) =>
          `https://cdn.jsdelivr.net/npm/canvaskit-wasm@${version}/bin/full/${file}`,
      }}
      getComponent={() => import("./game-screen")}
      fallback={<Text style={{ color: "#0f0" }}>Loading...</Text>}
    />
  );
};
