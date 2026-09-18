import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "org.pench.tigertrace",
  appName: "TigerTrace",
  webDir: "out",
  server: {
    // The app talks to the FastAPI backend over plain HTTP on the reserve LAN.
    androidScheme: "http",
    cleartext: true,
  },
};

export default config;
