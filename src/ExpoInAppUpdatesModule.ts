import { requireNativeModule } from "expo-modules-core";
import type { ExpoInAppUpdatesModuleType } from "./ExpoInAppUpdates.types";

export default requireNativeModule<ExpoInAppUpdatesModuleType>(
  "ExpoInAppUpdates",
);
