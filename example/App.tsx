import { useEffect } from "react";
import { Alert, Platform, StyleSheet, Text, View } from "react-native";

import * as ExpoInAppUpdates from "expo-in-app-updates";

const useInAppUpdates = () => {
  useEffect(() => {
    if (__DEV__ || Platform.OS === "web") return;

    const checkUpdates = async () => {
      try {
        if (Platform.OS === "android") {
          // If you want an immediate update that will cover the app with the update overlay,
          // set it to true. More details: https://developer.android.com/guide/playcore/in-app-updates#update-flows
          const immediate =
            process.env.EXPO_PUBLIC_IMMEDIATE_IN_APP_UPDATES === "true";
          await ExpoInAppUpdates.checkAndStartUpdate(immediate);
        } else {
          const result = await ExpoInAppUpdates.checkForUpdate();

          if (!result.updateAvailable) return;

          Alert.alert(
            "Update available",
            "A new version of the app is available with many improvements and bug fixes. Would you like to update now?",
            [
              {
                text: "Update",
                isPreferred: true,
                onPress: async () => {
                  try {
                    await ExpoInAppUpdates.startUpdate();
                  } catch (updateError) {
                    console.error("Error starting update:", updateError);
                  }
                },
              },
              { text: "Cancel" },
            ]
          );
        }
      } catch (checkError) {
        console.error("Error checking for updates:", checkError);
      }
    };

    // Start the update check process
    checkUpdates();
  }, []);
};

export default function App() {
  // Use this hook in your root app or root layout component
  useInAppUpdates();

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>
        Native in-app updates for Android and iOS
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    padding: 20,
  },
  heading: {
    fontSize: 18,
    marginBottom: 20,
  },
});
