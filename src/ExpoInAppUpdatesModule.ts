import { requireNativeModule } from "expo";
import type { ExpoInAppUpdatesModuleType } from "./ExpoInAppUpdates.types";

export default requireNativeModule<ExpoInAppUpdatesModuleType>(
  "ExpoInAppUpdates"
);
