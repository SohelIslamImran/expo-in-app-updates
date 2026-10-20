import { Platform } from "react-native";

import type { ExpoInAppUpdatesEvents } from "./ExpoInAppUpdates.types";
import ExpoInAppUpdatesModule from "./ExpoInAppUpdatesModule";

/**
 * In-app update types on Android. The values match Play Core's
 * [`AppUpdateType`](https://developer.android.com/reference/com/google/android/play/core/install/model/AppUpdateType).
 *
 * @platform android
 */
export const AppUpdateType = {
  FLEXIBLE: 0,
  IMMEDIATE: 1,
} as const;

/**
 * Checks if an app update is available.
 *
 * @return A promise that resolves `updateAvailable` and `storeVersion` on Android and iOS, plus `flexibleAllowed`, `immediateAllowed` and the server priority on Android.
 */
export async function checkForUpdate() {
  return ExpoInAppUpdatesModule.checkForUpdate();
}

/**
 * Starts an in-app update.
 *
 * On iOS this opens the App Store page of the app in a sheet over the current screen, falling back to the App Store app.
 *
 * @param isImmediate - Android only. Whether to start an [immediate update](https://developer.android.com/guide/playcore/in-app-updates/kotlin-java#immediate) (`true`) or a [flexible update](https://developer.android.com/guide/playcore/in-app-updates/kotlin-java#flexible) (`false`). When omitted, the type is picked from the update priority set in the Play Console.
 *
 * @return Whether the update flow was started.
 */
export async function startUpdate(isImmediate?: boolean) {
  if (Platform.OS === "android" && isImmediate !== undefined) {
    return ExpoInAppUpdatesModule.startUpdate(
      isImmediate ? AppUpdateType.IMMEDIATE : AppUpdateType.FLEXIBLE
    );
  }
  return ExpoInAppUpdatesModule.startUpdate();
}

/**
 * Checks if an app update is available and starts the update flow if there is one.
 *
 * @param isImmediate - Android only. Whether to start an immediate update when it's allowed. Otherwise the type is picked from the update priority.
 *
 * @return Whether an update flow was started.
 */
export async function checkAndStartUpdate(isImmediate = false) {
  const { updateAvailable, immediateAllowed } = await checkForUpdate();
  if (!updateAvailable) {
    return false;
  }
  return startUpdate(isImmediate && immediateAllowed ? true : undefined);
}

/**
 * Adds a listener for an update event.
 *
 * @param eventName - Name of the event to listen for.
 * @param listener - Callback invoked with the event payload.
 * @return A function that removes the listener.
 */
export function addUpdateListener<K extends keyof ExpoInAppUpdatesEvents>(
  eventName: K,
  listener: ExpoInAppUpdatesEvents[K]
) {
  const subscription = ExpoInAppUpdatesModule.addListener(eventName, listener);
  return () => subscription.remove();
}

export type {
  ExpoInAppUpdatesEvents,
  UpdateCancelledEvent,
  UpdateCompletedEvent,
  UpdateDownloadedEvent,
  UpdateInfo,
  UpdateStartEvent,
} from "./ExpoInAppUpdates.types";
