import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.honamind.gymbro",
  appName: "Gym Bro",
  webDir: "out",
  server: {
    // Live URL mode: load from Vercel deployment
    url: process.env.CAPACITOR_SERVER_URL || "https://gym-bro-nu.vercel.app",
    cleartext: false,
  },
  plugins: {
    Keyboard: {
      resize: "body",
      resizeOnFullScreen: true,
    },
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 2000,
      backgroundColor: "#09090b",
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#09090b",
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
  ios: {
    scheme: "gymbro",
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
