import type { ExpoConfig, ConfigContext } from "expo/config";
import { version } from "./package.json";

const BUNDLE_IDENTIFIER = "com.justindra.lostvacbot";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "lost-vac-bot",
  slug: "lost-vac-bot",
  version,
  orientation: "landscape",
  icon: "./assets/images/icon.png",
  scheme: "lostvacbot",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  ios: {
    bundleIdentifier: BUNDLE_IDENTIFIER,
    supportsTablet: false,
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: BUNDLE_IDENTIFIER,
    adaptiveIcon: {
      backgroundColor: "#E6F4FE",
      foregroundImage: "./assets/images/android-icon-foreground.png",
      backgroundImage: "./assets/images/android-icon-background.png",
      monochromeImage: "./assets/images/android-icon-monochrome.png",
    },
    edgeToEdgeEnabled: true,
  },
  web: {
    output: "static",
    favicon: "./assets/images/favicon.png",
  },
  plugins: [
    "expo-router",
    [
      "expo-splash-screen",
      {
        image: "./assets/images/splash-icon.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#ffffff",
        dark: {
          backgroundColor: "#000000",
        },
      },
    ],
    "expo-audio",
    "expo-font",
    "expo-asset",
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    eas: {
      projectId: "47dbffea-dcd6-4e11-ae9b-dd5a258bba80",
    },
  },
});
