import { Platform } from "react-native";

import ExpoInAppUpdatesModule from "./ExpoInAppUpdatesModule";

/**
 * App update types of in-app updates for Android.
 *
 * @platform android
 */
export const AppUpdateType = {
  FLEXIBLE: ExpoInAppUpdatesModule?.FLEXIBLE,
  IMMEDIATE: ExpoInAppUpdatesModule?.IMMEDIATE,
};

/**
 * Checks if an app update is available.
 *
 * @return A promise that resolves `updateAvailable` and `storeVersion` for Android and iOS, `flexibleAllowed` and `immediateAllowed` for Android
 */
export async function checkForUpdate() {
  return ExpoInAppUpdatesModule.checkForUpdate();
}

/**
 * Starts an in-app update.
 *
 * @param isImmediate - Whether the update should be a [flexible update](https://developer.android.com/guide/playcore/in-app-updates/kotlin-java#flexible) or [immediate update](https://developer.android.com/guide/playcore/in-app-updates/kotlin-java#immediate).
 *
 * @return Whether the update was started successfully.
 */
export async function startUpdate(isImmediate = false) {
  if (Platform.OS === "android") {
    return ExpoInAppUpdatesModule.startUpdate(
      isImmediate ? AppUpdateType.IMMEDIATE : AppUpdateType.FLEXIBLE
    );
  }
  return ExpoInAppUpdatesModule.startUpdate();
}

/**
 * Checks if an app update is available and starts the update process if necessary.
 *
 * @param isImmediate - Whether the update should be a [flexible update](https://developer.android.com/guide/playcore/in-app-updates/kotlin-java#flexible) or [immediate update](https://developer.android.com/guide/playcore/in-app-updates/kotlin-java#immediate).
 *
 * @return Whether an update was started successfully.
 */
export async function checkAndStartUpdate(isImmediate = false) {
  const { updateAvailable, immediateAllowed } = await checkForUpdate();
  if (updateAvailable) {
    return startUpdate(isImmediate && immediateAllowed);
  }
  return false;
}
