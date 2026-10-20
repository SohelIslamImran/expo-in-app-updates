import { NativeModule, requireNativeModule } from "expo";

import type {
  ExpoInAppUpdatesEvents,
  UpdateInfo,
} from "./ExpoInAppUpdates.types";

declare class ExpoInAppUpdatesModule extends NativeModule<ExpoInAppUpdatesEvents> {
  checkForUpdate(): Promise<UpdateInfo>;
  /** `updateType` is only read on Android. */
  startUpdate(updateType?: number): Promise<boolean>;
}

export default requireNativeModule<ExpoInAppUpdatesModule>("ExpoInAppUpdates");
