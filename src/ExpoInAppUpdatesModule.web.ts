import { NativeModule, registerWebModule } from "expo";

import type {
  ExpoInAppUpdatesEvents,
  UpdateInfo,
} from "./ExpoInAppUpdates.types";

// There is no store on the web, so updates are never available.
class ExpoInAppUpdatesModule extends NativeModule<ExpoInAppUpdatesEvents> {
  async checkForUpdate(): Promise<UpdateInfo> {
    return { updateAvailable: false };
  }

  async startUpdate(): Promise<boolean> {
    return false;
  }
}

export default registerWebModule(
  ExpoInAppUpdatesModule,
  "ExpoInAppUpdatesModule"
);
