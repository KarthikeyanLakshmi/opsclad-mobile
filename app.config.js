
export default {
  expo: {
    "owner": "klakshminarayanan",
    name: "opsclad-mobile",
    slug: "opsclad-mobile",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "opscladmobile",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    platforms: ["android", "ios"],

    "resolutions": {
    "react-native-safe-area-context": "5.6.2"
    },
    "scripts": {
    "preinstall": "npx npm-force-resolutions"
    },

    ios: {
      supportsTablet: true
    },

    android: {
      adaptiveIcon: {
        backgroundColor: "#E6F4FE",
        foregroundImage: "./assets/images/android-icon-foreground.png",
        backgroundImage: "./assets/images/android-icon-background.png",
        monochromeImage: "./assets/images/android-icon-monochrome.png"
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      package: "com.klakshminarayanan.opscladmobile"
    },

    web: {
      output: "static",
      favicon: "./assets/images/favicon.png"
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
            backgroundColor: "#000000"
          }
        }
      ]
    ],

    extra: {
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      apiBaseUrl: process.env.API_BASE_URL,

      eas: {
        "projectId": "dd077a3b-dab8-4af2-be95-f629afb8c6aa"
      }
    },

    experiments: {
      typedRoutes: true,
      reactCompiler: true
    }
  }
};
