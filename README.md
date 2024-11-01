# expo-in-app-updates

Native in-app updates for Android and iOS.

This module uses the Android native [in-app updates](https://developer.android.com/guide/playcore/in-app-updates) library on Android and [iTunes Search API](https://performance-partners.apple.com/search-api) on iOS.

On Android, it will show a native overlay like the screenshots below but on iOS it opens the app in the App Store on a modal to update the app, since iOS does not have any in-app update solution. You may want to show an alert or custom UI on iOS. See the [example](#example) at the bottom.

<a href="https://developer.android.com/guide/playcore/in-app-updates#flexible"><img src="https://developer.android.com/static/images/app-bundle/flexible_flow.png" alt="Example flexible updates" height="400"/></a>

<a href="https://developer.android.com/guide/playcore/in-app-updates#immediate"><img src="https://developer.android.com/static/images/app-bundle/immediate_flow.png" alt="Example immediate updates" height="400"/></a>

## Installation

```
npm install expo-in-app-updates
```

For iOS, add your AppStoreID (the id in your app store link, e.g https://apps.apple.com/pl/app/example/id1234567890) in `infoPlist` in your `app.json`

```json
{
  "expo": {
    "ios": {
      "infoPlist": {
        "AppStoreID": "1234567890"
      }
    }
  }
}
```

> For bare React Native projects, you must ensure that you have [installed and configured the `expo` package](https://docs.expo.dev/bare/installing-expo-modules/) before continuing.
> Run `npx pod-install` after installing the npm package for iOS.

```
npx expo run:android | run:ios
```

## Usages

### Check for updates :

```ts
const { 
  updateAvailable,
  flexibleAllowed,
  immediateAllowed
} = await ExpoInAppUpdates.checkForUpdate();
```

Checks if an app update is available. Return a promise that resolves `updateAvailable` and `storeVersion` for Android and iOS, `flexibleAllowed` and `immediateAllowed` for Android.

- `updateAvailable`: If an update is available.
- `flexibleAllowed`: If able to start a [Flexible Update](https://developer.android.com/guide/playcore/in-app-updates/kotlin-java#flexible)
- `immediateAllowed`: If able to start an [Immediate Update](https://developer.android.com/guide/playcore/in-app-updates/kotlin-java#immediate)
- `storeVersion`: The latest app version published in the App Store / Play Store. On Android, this is the `versionCode` that you defined in `app.json`.

### Start an in-app update :

```ts
const isUpdateStarted = await ExpoInAppUpdates.startUpdate();
```

Starts an in-app update. Return a boolean whether the update was started successfully.

> [!NOTE]
> If you want an [Immediate Update](https://developer.android.com/guide/playcore/in-app-updates/kotlin-java#immediate) that will cover the app with the update overlay, pass true to this function. By default, it will start a [Flexible Update](https://developer.android.com/guide/playcore/in-app-updates/kotlin-java#flexible). More details : https://developer.android.com/guide/playcore/in-app-updates#update-flows
>
> ```ts
> const isUpdateStarted = await ExpoInAppUpdates.startUpdate(true);
> ```

### Check and start an in-app update :

```ts
const isUpdateStarted = await ExpoInAppUpdates.checkAndStartUpdate();
```

Checks if an app update is available and starts the update process if necessary. Return a boolean whether the update was started successfully.

> [!NOTE]
> If you want an [Immediate Update](https://developer.android.com/guide/playcore/in-app-updates/kotlin-java#immediate) that will cover the app with the update overlay, pass true to this function. By default, it will start a [Flexible Update](https://developer.android.com/guide/playcore/in-app-updates/kotlin-java#flexible). More details : https://developer.android.com/guide/playcore/in-app-updates#update-flows
>
> ```ts
> const isUpdateStarted = await ExpoInAppUpdates.checkAndStartUpdate(true);
> ```

> [!TIP]
> You may want to check for updates and show an alert or custom UI on iOS. Since iOS does not have any in-app update solution, it just opens the app in the App Store on a modal to update the app. See the [example](#example) below.

### Example

This example will ask the user for update the app if update available on every app startup until the user update the app.

```tsx
import { useEffect } from "react";
import { Alert, Platform, Text, View } from "react-native";

import * as ExpoInAppUpdates from "expo-in-app-updates";

const useInAppUpdates = () => {
  useEffect(() => {
    if (__DEV__ || Platform.OS === "web") return;

    if (Platform.OS === "android") {
      ExpoInAppUpdates.checkAndStartUpdate(
        // If you want an immediate update that will cover the app with the update overlay, set it to true.
        // More details : https://developer.android.com/guide/playcore/in-app-updates#update-flows
        false
      );
    } else {
      ExpoInAppUpdates.checkForUpdate().then(({ updateAvailable }) => {
        if (!updateAvailable) return;

        Alert.alert(
          "Update available",
          "A new version of the app is available with many improvements and bug fixes. Would you like to update now?",
          [
            {
              text: "Update",
              isPreferred: true,
              async onPress() {
                await ExpoInAppUpdates.startUpdate();
              },
            },
            { text: "Cancel" },
          ]
        );
      });
    }
  }, []);
};

export default function App() {
  // Use this hook in your root app or root layout component
  useInAppUpdates();

  return (
    <View>
      <Text>Native in-app updates for Android and iOS</Text>
    </View>
  );
}
```

---

This example will ask the user for update the app if update available and if user don't update or cancel the update, then the user will not be asked for update again until a new version published again.

```tsx
import { useEffect } from "react";
import { Alert, Platform } from "react-native";
import AsyncStorage from "expo-sqlite/async-storage";

import * as ExpoInAppUpdates from "expo-in-app-updates";

const useInAppUpdates = () => {
  useEffect(() => {
    if (__DEV__ || Platform.OS === "web") return;

    ExpoInAppUpdates.checkForUpdate().then(
      async ({ updateAvailable, storeVersion }) => {
        if (!updateAvailable) return;

        // Get the last saved storeVersion from your local-storage (AsyncStorage/MMKV)
        const savedStoreVersion = await AsyncStorage.getItem("savedStoreVersion");
        // Check and return from here to prevent asking for updates again for the same storeVersion.
        if (savedStoreVersion === storeVersion) return;

        if (Platform.OS === "android") {
          await ExpoInAppUpdates.startUpdate();
          // Saving the storeVersion after checked for updates, so we can check and ignore asking for updates again for the same storeVersion
          await AsyncStorage.setItem("savedStoreVersion", storeVersion);
          return;
        }

        Alert.alert(
          "Update available",
          "A new version of the app is available with many improvements and bug fixes. Would you like to update now?",
          [
            {
              text: "Update",
              isPreferred: true,
              async onPress() {
                await ExpoInAppUpdates.startUpdate();
                await AsyncStorage.setItem("savedStoreVersion", storeVersion);
              },
            },
            {
              text: "Cancel",
              async onPress() {
                // Saving the storeVersion after checked for updates, so we can check and ignore asking for updates again for the same storeVersion
                await AsyncStorage.setItem("savedStoreVersion", storeVersion);
              },
            },
          ]
        );
      }
    );
  }, []);
};
```

[**Test in-app updates**](https://developer.android.com/guide/playcore/in-app-updates/test)
