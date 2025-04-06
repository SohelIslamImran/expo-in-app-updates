import { Platform } from "react-native";

import type {
  ExpoInAppUpdatesEvents,
  UpdateCancelledEvent,
  UpdateCompletedEvent,
  UpdateDownloadedEvent,
  UpdateStartEvent,
} from "./ExpoInAppUpdates.types";
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

/**
 * Add a listener for update events
 * @param eventName - Name of the event to listen for
 * @param listener - Callback function to execute when event is triggered
 * @returns A function to remove the event listener
 */
export function addUpdateListener<K extends keyof ExpoInAppUpdatesEvents>(
  eventName: K,
  listener: ExpoInAppUpdatesEvents[K]
) {
  const subscription = ExpoInAppUpdatesModule.addListener(eventName, listener);
  return subscription.remove;
}

// Export event types
export type {
  UpdateStartEvent,
  UpdateDownloadedEvent,
  UpdateCancelledEvent,
  UpdateCompletedEvent,
};
