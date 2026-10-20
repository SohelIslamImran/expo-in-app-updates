# expo-in-app-updates

A lightweight module for implementing native in-app updates for Android and iOS.

This module uses Google Play's native [in-app updates](https://developer.android.com/guide/playcore/in-app-updates) library on Android and the [iTunes Search API](https://performance-partners.apple.com/search-api) with StoreKit on iOS.

On Android, it displays a native Google Play overlay (flexible or immediate update flows). On iOS, it presents the App Store product page in a sheet over the current screen (falling back to opening the App Store app), because iOS does not offer a native in-app update mechanism. You can also display a custom alert or UI before initiating the update. See the [examples](#examples) below.

<a href="https://developer.android.com/guide/playcore/in-app-updates#flexible"><img src="https://developer.android.com/static/images/app-bundle/flexible_flow.png" alt="Example flexible updates" height="400"/></a>

<a href="https://developer.android.com/guide/playcore/in-app-updates#immediate"><img src="https://developer.android.com/static/images/app-bundle/immediate_flow.png" alt="Example immediate updates" height="400"/></a>

## Compatibility

| Library Version | Expo SDK                                                                                                       | React Native | Requirements                                                    |
| --------------- | -------------------------------------------------------------------------------------------------------------- | ------------ | --------------------------------------------------------------- |
| `0.13.x`        | SDK 58+                                                                                                        | 0.88+        | New Architecture, iOS 16.4+, Android Play Core app-update 2.1.0 |
| `0.12.x`        | SDK 56                                                                                                         | 0.85         | iOS 16.4+                                                       |
| Older           | See [Releases](https://github.com/SohelIslamImran/expo-in-app-updates/releases) / [CHANGELOG.md](CHANGELOG.md) |              |                                                                 |

Under the hood, iOS native code uses Expo Modules 2.0 macros (`@ExpoModule`, `@JS`, `@Event`, `@Record`), and Android uses `expo-module-gradle-plugin` with Kotlin coroutines.

### Upgrading from 0.12

The JS API is unchanged, but a few details changed:

- iOS errors have specific codes instead of `ERROR`: `ERR_MISSING_APP_STORE_ID`, `ERR_LOOKUP_FAILED` and `ERR_PRESENTATION_FAILED`.
- On iOS, `startUpdate()` resolves `false` instead of rejecting when the App Store app can't be opened.
- `AppUpdateType` is `{ FLEXIBLE: 0, IMMEDIATE: 1 }` on every platform (it was `undefined` outside Android).
- `storeVersion` can be `null` or absent when no update is found.
- On Android, `startUpdate()` resumes an interrupted immediate update, and installs a flexible update that finished downloading after the app was closed.

## Installation

```sh
npx expo install expo-in-app-updates
```

### iOS Configuration

Configuration in `app.json` / `app.config.js` is optional but recommended:

- `AppStoreID`: The numeric App Store ID from your store URL (e.g., `1234567890` from `https://apps.apple.com/app/id1234567890`). This is optional; if omitted, the module looks up your app by bundle identifier via the iTunes Search API. Setting it is recommended because it saves a network lookup during `startUpdate()` and avoids lookup ambiguity.
- `AppStoreCountry`: Optional two-letter country code (e.g., `"pl"` for Poland) where your app is available, needed only if your app is not available in the US store and the default lookup fails.

```json
{
  "expo": {
    "ios": {
      "infoPlist": {
        "AppStoreID": "1234567890",
        "AppStoreCountry": "pl"
      }
    }
  }
}
```

> For bare React Native projects, ensure you have [installed and configured the `expo` package](https://docs.expo.dev/bare/installing-expo-modules/) before continuing.
> Run `npx pod-install` after installing the package for iOS.

```sh
npx expo run:android
npx expo run:ios
```

## Usage

### Check for updates

```ts
const result = await ExpoInAppUpdates.checkForUpdate();
```

Checks if an app update is available. Returns a promise that resolves to an [`UpdateInfo`](#updateinfo) object:

- On Android, queries Google Play. Returns `updateAvailable`, `storeVersion` (the available `versionCode`), `flexibleAllowed`, `immediateAllowed`, `daysSinceRelease`, `serverPriority`, and `serverUpdateType`. If an immediate update is already in progress, returns `updateAvailable: true` and `updateInProgress: true`.
- On iOS, queries the iTunes Search API. Returns `updateAvailable`, `storeVersion` (version string), and `releaseDate`.
- On Web, resolves `{ updateAvailable: false }`.

If the check fails on Android, the promise rejects with error code `ERR_CHECK_FOR_UPDATE`.

### Start an in-app update

```ts
const isUpdateStarted = await ExpoInAppUpdates.startUpdate();
```

Starts an in-app update flow. Returns a promise resolving to a boolean indicating whether the update was started successfully.

- **Android**:
  - Without arguments, the module automatically chooses the update type from the Play Console update priority: priority 4 or higher starts an [Immediate Update](https://developer.android.com/guide/playcore/in-app-updates/kotlin-java#immediate), while lower priorities start a [Flexible Update](https://developer.android.com/guide/playcore/in-app-updates/kotlin-java#flexible).
  - Pass `true` to request an immediate update, or `false` to request a flexible update:
    ```ts
    const isUpdateStarted = await ExpoInAppUpdates.startUpdate(true);
    ```
  - If an immediate update was previously interrupted (Google Play `DEVELOPER_TRIGGERED_UPDATE_IN_PROGRESS`), calling `startUpdate()` resumes the update flow as recommended by Google.
  - If starting the update fails, the promise rejects with error code `ERR_START_UPDATE`.
- **iOS**:
  - Presents an `SKStoreProductViewController` sheet displaying the App Store product page over whatever is currently on screen, including React Native `<Modal>` views and Expo Router modal/formSheet screens ([#35](https://github.com/SohelIslamImran/expo-in-app-updates/issues/35)).
  - Rejects if the sheet cannot be presented (instead of silently resolving `true`).
  - If the product sheet cannot load (such as in the iOS Simulator), it falls back to opening the App Store app.
- **Web**:
  - Resolves `false`.

### Check and start an in-app update

```ts
const isUpdateStarted = await ExpoInAppUpdates.checkAndStartUpdate();
```

Checks if an update is available and starts the update flow if one is found. Returns a promise resolving to `true` if an update was started, or `false` if no update was available.

- On Android, pass `true` to request an immediate update when allowed:
  ```ts
  const isUpdateStarted = await ExpoInAppUpdates.checkAndStartUpdate(true);
  ```
  When omitted or `false`, the update type is selected from the Play Store priority.

### Examples

#### Basic update prompt on startup

Prompts the user to update the app on startup whenever an update is available:

```tsx
import { useEffect } from "react";
import { Alert, Platform, StyleSheet, Text, View } from "react-native";
import * as ExpoInAppUpdates from "expo-in-app-updates";

const useInAppUpdates = () => {
  useEffect(() => {
    if (__DEV__ || Platform.OS === "web") return;

    const checkForUpdates = async () => {
      try {
        if (Platform.OS === "android") {
          // Without an argument, Android chooses flexible or immediate from the Play Store priority.
          await ExpoInAppUpdates.checkAndStartUpdate();
        } else {
          const result = await ExpoInAppUpdates.checkForUpdate();
          if (!result.updateAvailable) return;

          Alert.alert(
            "Update Available",
            "A new version of the app is available. Would you like to update now?",
            [
              {
                text: "Update",
                isPreferred: true,
                onPress: async () => {
                  try {
                    await ExpoInAppUpdates.startUpdate();
                  } catch (err) {
                    console.error("Failed to start update:", err);
                  }
                },
              },
              { text: "Cancel", style: "cancel" },
            ]
          );
        }
      } catch (err) {
        console.error("Update check failed:", err);
      }
    };

    checkForUpdates();
  }, []);
};

export default function App() {
  useInAppUpdates();

  return (
    <View style={styles.container}>
      <Text>Native in-app updates for Android and iOS</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
```

---

#### Prompt once per store version

Prompts the user when an update is available, but avoids asking again for the same store version if the user cancels or dismisses the prompt. It stores the version with `expo-sqlite`'s key-value store (`npx expo install expo-sqlite`); any persistent storage works:

```tsx
import { useEffect } from "react";
import { Alert, Platform } from "react-native";
import AsyncStorage from "expo-sqlite/kv-store";
import * as ExpoInAppUpdates from "expo-in-app-updates";

const useInAppUpdates = () => {
  useEffect(() => {
    if (__DEV__ || Platform.OS === "web") return;

    const checkForUpdates = async () => {
      try {
        const result = await ExpoInAppUpdates.checkForUpdate();
        if (!result.updateAvailable || !result.storeVersion) return;

        // Compare against the last saved storeVersion from local storage
        const savedStoreVersion =
          await AsyncStorage.getItem("savedStoreVersion");
        if (savedStoreVersion === result.storeVersion) return;

        if (Platform.OS === "android") {
          try {
            const started = await ExpoInAppUpdates.startUpdate();
            if (started) {
              await AsyncStorage.setItem(
                "savedStoreVersion",
                result.storeVersion
              );
            }
          } catch (updateErr) {
            console.error("Failed to start update:", updateErr);
          }
          return;
        }

        Alert.alert(
          "Update Available",
          "A new version of the app is available. Would you like to update now?",
          [
            {
              text: "Update",
              isPreferred: true,
              onPress: async () => {
                try {
                  const started = await ExpoInAppUpdates.startUpdate();
                  if (started) {
                    await AsyncStorage.setItem(
                      "savedStoreVersion",
                      result.storeVersion ?? ""
                    );
                  }
                } catch (updateErr) {
                  console.error("Failed to start update:", updateErr);
                }
              },
            },
            {
              text: "Cancel",
              style: "cancel",
              onPress: async () => {
                try {
                  await AsyncStorage.setItem(
                    "savedStoreVersion",
                    result.storeVersion ?? ""
                  );
                } catch (storageErr) {
                  console.error("Failed to save version:", storageErr);
                }
              },
            },
          ]
        );
      } catch (err) {
        console.error("Update check failed:", err);
      }
    };

    checkForUpdates();
  }, []);
};
```

---

#### Delay update prompt for 2 days after release

Delays prompting the user until 2 days after the new version release:

```tsx
import { useEffect } from "react";
import { Alert, Platform } from "react-native";
import * as ExpoInAppUpdates from "expo-in-app-updates";

function getDiffInDays(date: string): number {
  const diffInMs = Math.abs(Date.now() - new Date(date).getTime());
  return diffInMs / (1000 * 60 * 60 * 24);
}

const useInAppUpdates = () => {
  useEffect(() => {
    if (__DEV__ || Platform.OS === "web") return;

    const checkForUpdates = async () => {
      try {
        const result = await ExpoInAppUpdates.checkForUpdate();
        if (!result.updateAvailable) return;

        // On Android, check staleness days reported by Google Play
        if (Platform.OS === "android" && (result.daysSinceRelease ?? 0) >= 2) {
          try {
            await ExpoInAppUpdates.startUpdate();
          } catch (updateErr) {
            console.error("Failed to start update:", updateErr);
          }
          return;
        }

        // On iOS, check days since the version release date
        if (result.releaseDate && getDiffInDays(result.releaseDate) >= 2) {
          Alert.alert(
            "Update Available",
            "A new version of the app is available. Would you like to update now?",
            [
              {
                text: "Update",
                isPreferred: true,
                onPress: async () => {
                  try {
                    await ExpoInAppUpdates.startUpdate();
                  } catch (updateErr) {
                    console.error("Failed to start update:", updateErr);
                  }
                },
              },
              { text: "Cancel", style: "cancel" },
            ]
          );
        }
      } catch (err) {
        console.error("Update check failed:", err);
      }
    };

    checkForUpdates();
  }, []);
};
```

---

### Using Update Events

Listen to update events to track the update lifecycle and provide user feedback.

#### Available Events

| Event Name         | Platform     | Description                                                                                                                          | Payload Type                                      |
| ------------------ | ------------ | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------- |
| `updateStart`      | Android, iOS | Triggered when the update flow has started (Google Play dialog on Android; App Store sheet or app opened on iOS).                    | [`UpdateStartEvent`](#updatestartevent)           |
| `updateDownloaded` | Android      | Triggered when a flexible update has downloaded and is ready to install.                                                             | [`UpdateDownloadedEvent`](#updatedownloadedevent) |
| `updateCancelled`  | Android, iOS | Triggered when the user cancels or dismisses the update flow (closing system dialog on Android; closing the App Store sheet on iOS). | [`UpdateCancelledEvent`](#updatecancelledevent)   |
| `updateCompleted`  | Android      | Triggered when an update has been successfully installed.                                                                            | [`UpdateCompletedEvent`](#updatecompletedevent)   |

> [!NOTE]
> `updateDownloaded` and `updateCompleted` are Android-only. On iOS, updates are handled through the App Store, so only `updateStart` and `updateCancelled` fire.

#### Example with Event Listeners

```tsx
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import * as ExpoInAppUpdates from "expo-in-app-updates";

export default function UpdateStatusScreen() {
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateMessage, setUpdateMessage] = useState("");

  useEffect(() => {
    // Set up event listeners - each returns a cleanup function
    const startUnsubscribe = ExpoInAppUpdates.addUpdateListener(
      "updateStart",
      (event) => {
        setIsUpdating(true);
        setUpdateMessage(
          `Update process started (${event.updateType || "standard"})`
        );
      }
    );

    const downloadedUnsubscribe = ExpoInAppUpdates.addUpdateListener(
      "updateDownloaded",
      () => {
        setUpdateMessage("Update downloaded, ready to install!");
      }
    );

    const cancelledUnsubscribe = ExpoInAppUpdates.addUpdateListener(
      "updateCancelled",
      (event) => {
        setIsUpdating(false);
        setUpdateMessage(
          `Update cancelled${event.reason ? ": " + event.reason : ""}`
        );
      }
    );

    const completedUnsubscribe = ExpoInAppUpdates.addUpdateListener(
      "updateCompleted",
      () => {
        setIsUpdating(false);
        setUpdateMessage("Update completed!");
      }
    );

    // Check for updates
    const checkForUpdates = async () => {
      try {
        const result = await ExpoInAppUpdates.checkForUpdate();
        if (result.updateAvailable) {
          try {
            await ExpoInAppUpdates.startUpdate(true);
          } catch (updateErr) {
            console.error("Error starting update:", updateErr);
          }
        }
      } catch (checkErr) {
        console.error("Error checking for updates:", checkErr);
      }
    };

    checkForUpdates();

    // Cleanup listeners when component unmounts
    return () => {
      startUnsubscribe();
      downloadedUnsubscribe();
      cancelledUnsubscribe();
      completedUnsubscribe();
    };
  }, []);

  if (!isUpdating && !updateMessage) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>App Update</Text>
      <Text style={styles.message}>{updateMessage}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: "#666",
  },
});
```

---

### Forcing Updates

For mandatory or critical updates, display a blocking UI when the user cancels or dismisses an update to prevent continued use until updated.

```tsx
import { useEffect, useState } from "react";
import {
  Alert,
  BackHandler,
  Button,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as ExpoInAppUpdates from "expo-in-app-updates";

export default function App() {
  const [showUpdateBlocker, setShowUpdateBlocker] = useState(false);

  useEffect(() => {
    if (__DEV__ || Platform.OS === "web") return;

    const checkForMandatoryUpdate = async () => {
      try {
        const result = await ExpoInAppUpdates.checkForUpdate();
        if (result.updateAvailable) {
          try {
            const started = await ExpoInAppUpdates.startUpdate(true);
            // `false` means no flow was shown (e.g. immediate updates aren't allowed), so block anyway.
            if (!started) setShowUpdateBlocker(true);
          } catch (updateErr) {
            console.error("Failed to start update:", updateErr);
            setShowUpdateBlocker(true);
          }
        }
      } catch (checkErr) {
        console.error("Update check failed:", checkErr);
      }
    };

    checkForMandatoryUpdate();

    // Listen for update cancellation
    const unsubscribeCancelled = ExpoInAppUpdates.addUpdateListener(
      "updateCancelled",
      () => {
        setShowUpdateBlocker(true);
      }
    );

    return () => {
      unsubscribeCancelled();
    };
  }, []);

  // Prevent back button from dismissing the blocker on Android
  useEffect(() => {
    if (!showUpdateBlocker) return;

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => true
    );

    return () => {
      backHandler.remove();
    };
  }, [showUpdateBlocker]);

  const retryUpdate = async () => {
    const showFailure = () =>
      Alert.alert(
        "Update Failed",
        "Unable to start the update. Please try again."
      );
    try {
      const started = await ExpoInAppUpdates.startUpdate(
        Platform.OS === "android" ? true : undefined
      );
      if (!started) showFailure();
    } catch (retryErr) {
      console.error("Retry update failed:", retryErr);
      showFailure();
    }
  };

  if (showUpdateBlocker) {
    return (
      <View style={styles.blockingContainer}>
        <Text style={styles.title}>Update Required</Text>
        <Text style={styles.message}>
          A critical update is required to continue using the app. Please update
          to the latest version to access new features and fixes.
        </Text>
        <Button title="Update Now" onPress={retryUpdate} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text>Welcome to the app!</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  blockingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 12,
  },
  message: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 20,
  },
});
```

---

## API

### Functions

#### `checkForUpdate()`

```ts
function checkForUpdate(): Promise<UpdateInfo>;
```

Checks if an update is available for the application.

- **Parameters**: None.
- **Returns**: `Promise<UpdateInfo>` - Update details from Google Play (Android) or App Store (iOS).
- **Platform Notes**:
  - **Android**: Checks Play Core `AppUpdateInfo`. Reports `updateAvailable`, `flexibleAllowed`, `immediateAllowed`, `storeVersion` (`versionCode`), `daysSinceRelease`, `serverPriority`, and `serverUpdateType`. If an immediate update is currently in progress, resolves `{ updateAvailable: true, updateInProgress: true }`. Rejects with `ERR_CHECK_FOR_UPDATE` on failure.
  - **iOS**: Looks up the app listing using the iTunes Search API by `AppStoreID` or bundle ID. Returns `updateAvailable`, `storeVersion`, and `releaseDate`.
  - **Web**: Resolves `{ updateAvailable: false }`.

#### `startUpdate(isImmediate?)`

```ts
function startUpdate(isImmediate?: boolean): Promise<boolean>;
```

Starts the in-app update flow.

- **Parameters**:
  - `isImmediate` (`boolean`, optional): Android only. Set `true` to start an immediate update flow, or `false` for a flexible update flow. When omitted, the update type is selected based on the Play Console update priority (priority >= 4 triggers immediate update, otherwise flexible).
- **Returns**: `Promise<boolean>` - `true` if the update flow was successfully presented or started; `false` otherwise.
- **Platform Notes**:
  - **Android**: Starts the Google Play update flow. Resumes an interrupted immediate update when `DEVELOPER_TRIGGERED_UPDATE_IN_PROGRESS` is active. Rejects with `ERR_START_UPDATE` on Play Core launch or installation failure, or `ERR_MISSING_ACTIVITY` if called when the host activity is unavailable.
  - **iOS**: Presents an `SKStoreProductViewController` sheet displaying the App Store product page over the active screen, including over native `<Modal>`s and Expo Router modal/formSheet routes ([#35](https://github.com/SohelIslamImran/expo-in-app-updates/issues/35)). Rejects if the sheet cannot be presented. Falls back to opening the App Store app if product sheet loading fails (e.g., in iOS Simulator).
  - **Web**: Resolves `false`.

#### `checkAndStartUpdate(isImmediate?)`

```ts
function checkAndStartUpdate(isImmediate?: boolean): Promise<boolean>;
```

Convenience function that checks whether an update is available and starts the update flow if available.

- **Parameters**:
  - `isImmediate` (`boolean`, optional, default: `false`): Android only. Whether to request an immediate update when allowed. When `false` or omitted, type is chosen from Play Store priority.
- **Returns**: `Promise<boolean>` - `true` if an update was available and started; `false` if no update was available or if the update flow could not be started.

#### `addUpdateListener(eventName, listener)`

```ts
function addUpdateListener<K extends keyof ExpoInAppUpdatesEvents>(
  eventName: K,
  listener: ExpoInAppUpdatesEvents[K]
): () => void;
```

Subscribes to an update lifecycle event.

- **Parameters**:
  - `eventName` (`keyof ExpoInAppUpdatesEvents`): Name of the event to listen for (`updateStart`, `updateDownloaded`, `updateCancelled`, or `updateCompleted`).
  - `listener` (`function`): Callback receiving the event payload.
- **Returns**: `() => void` - Cleanup function that unsubscribes the listener.

### Constants

#### `AppUpdateType`

Numeric constants matching Google Play Core's `AppUpdateType`:

```ts
export const AppUpdateType = {
  FLEXIBLE: 0,
  IMMEDIATE: 1,
} as const;
```

### Types

#### `UpdateInfo`

| Field              | Type                        | Platform          | Description                                                                                                                                                                                                                  |
| ------------------ | --------------------------- | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `updateAvailable`  | `boolean`                   | Android, iOS, Web | Whether a newer version is available. On Android, also `true` when an update is already in progress.                                                                                                                         |
| `updateInProgress` | `boolean`                   | Android           | Optional. Whether a developer-triggered update is currently in progress. Call `startUpdate()` to resume it.                                                                                                                  |
| `storeVersion`     | `string \| null`            | Android, iOS      | Optional. The latest version published in the store. On iOS, this is the version string (`CFBundleShortVersionString`); on Android, the `versionCode`. `null` or absent when no update is available or the app is not found. |
| `releaseDate`      | `string \| null`            | iOS               | Optional. The release date of the latest store version as an ISO 8601 string.                                                                                                                                                |
| `daysSinceRelease` | `number \| null`            | Android           | Optional. Value of `clientVersionStalenessDays`: days since the Google Play Store app on the device learned about the update, or `null` if unavailable.                                                                      |
| `flexibleAllowed`  | `boolean`                   | Android           | Optional. Whether a flexible update can be started.                                                                                                                                                                          |
| `immediateAllowed` | `boolean`                   | Android           | Optional. Whether an immediate update can be started.                                                                                                                                                                        |
| `serverPriority`   | `number`                    | Android           | Optional. The update priority received from Google Play Console (0–5).                                                                                                                                                       |
| `serverUpdateType` | `"FLEXIBLE" \| "IMMEDIATE"` | Android           | Optional. Suggested update type derived from `serverPriority` (`IMMEDIATE` for priority >= 4, otherwise `FLEXIBLE`).                                                                                                         |

#### `UpdateStartEvent`

```ts
type UpdateStartEvent = {
  updateType?: "FLEXIBLE" | "IMMEDIATE"; // Android only; undefined on iOS
};
```

#### `UpdateDownloadedEvent`

```ts
type UpdateDownloadedEvent = {
  readyToInstall: boolean; // Android only
};
```

#### `UpdateCancelledEvent`

```ts
type UpdateCancelledEvent = {
  reason?: string; // Reason for cancellation if available
};
```

#### `UpdateCompletedEvent`

```ts
type UpdateCompletedEvent = {
  version?: string; // Version that was installed if available (Android only)
};
```

#### `ExpoInAppUpdatesEvents`

```ts
type ExpoInAppUpdatesEvents = {
  updateStart: (event: UpdateStartEvent) => void;
  updateDownloaded: (event: UpdateDownloadedEvent) => void;
  updateCancelled: (event: UpdateCancelledEvent) => void;
  updateCompleted: (event: UpdateCompletedEvent) => void;
};
```

### Error Codes (Android)

| Error Code             | Description                                                     |
| ---------------------- | --------------------------------------------------------------- |
| `ERR_CHECK_FOR_UPDATE` | Google Play Core failed while querying for update availability. |
| `ERR_START_UPDATE`     | Google Play Core failed while launching the in-app update flow. |

## Testing In-App Updates

### Android

Use [internal app sharing](https://support.google.com/googleplay/android-developer/answer/9844679) in the Google Play Console to [test in-app updates](https://developer.android.com/guide/playcore/in-app-updates/test).

### iOS

To test in-app updates on iOS:

1. Publish your app to the App Store at least once. Configure `AppStoreID` in `app.json` / `app.config.js` (recommended) or ensure the app's bundle identifier matches the published store listing.
2. Create a Development, Production, or TestFlight build with a lower version number than your published App Store version.
3. Install the build on your device.
4. Launch the app; the update check should detect the newer App Store version.

> [!NOTE]
> The iTunes Search API used for version checking can take several minutes to reflect a newly published App Store release due to CDN caching.

---

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for a list of changes in each release.
