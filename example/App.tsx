import * as ExpoInAppUpdates from "expo-in-app-updates";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type UpdateStatus =
  | "Idle"
  | "Checking"
  | "Available"
  | "Unavailable"
  | "Starting"
  | "Started"
  | "Error";

type UpdateInfo = Awaited<ReturnType<typeof ExpoInAppUpdates.checkForUpdate>>;

const isAndroid = Platform.OS === "android";

export default function App() {
  const [status, setStatus] = useState<UpdateStatus>("Idle");
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [message, setMessage] = useState("Ready to check for a store update.");
  const [eventLog, setEventLog] = useState<string[]>([]);

  useEffect(() => {
    const removeListeners = [
      ExpoInAppUpdates.addUpdateListener("updateStart", (event) => {
        appendEvent(
          `Update started${event.updateType ? ` (${event.updateType})` : ""}`
        );
      }),
      ExpoInAppUpdates.addUpdateListener("updateDownloaded", () => {
        appendEvent("Update downloaded");
      }),
      ExpoInAppUpdates.addUpdateListener("updateCancelled", (event) => {
        appendEvent(event.reason ?? "Update cancelled");
      }),
      ExpoInAppUpdates.addUpdateListener("updateCompleted", () => {
        appendEvent("Update completed");
      }),
    ];

    return () => {
      removeListeners.forEach((remove) => remove());
    };
  }, []);

  const updateTypeLabel = useMemo(() => {
    if (!isAndroid) return "App Store";
    if (updateInfo?.serverUpdateType) return updateInfo.serverUpdateType;
    if (updateInfo?.immediateAllowed) return "Immediate";
    if (updateInfo?.flexibleAllowed) return "Flexible";
    return "Play Store";
  }, [updateInfo]);

  const appendEvent = (event: string) => {
    setEventLog((current) => [event, ...current].slice(0, 5));
  };

  const checkForUpdate = async () => {
    if (__DEV__) {
      setMessage(
        "In-app updates only return real store data in release builds."
      );
    }

    setStatus("Checking");
    setUpdateInfo(null);

    try {
      const result = await ExpoInAppUpdates.checkForUpdate();
      setUpdateInfo(result);
      setStatus(result.updateAvailable ? "Available" : "Unavailable");
      setMessage(
        result.updateAvailable
          ? `Version ${result.storeVersion} is available.`
          : "No store update is currently available."
      );
    } catch (error) {
      setStatus("Error");
      setMessage(
        error instanceof Error ? error.message : "Failed to check for updates."
      );
    }
  };

  const startUpdate = async (immediate?: boolean) => {
    setStatus("Starting");

    try {
      const started = await ExpoInAppUpdates.startUpdate(immediate);
      setStatus(started ? "Started" : "Unavailable");
      setMessage(
        started
          ? "The update flow was opened."
          : "The requested update flow is not available for this build."
      );
    } catch (error) {
      setStatus("Error");
      setMessage(
        error instanceof Error ? error.message : "Failed to start update."
      );
    }
  };

  const confirmIosUpdate = () => {
    Alert.alert("Open App Store", "Start the App Store update flow?", [
      { text: "Cancel", style: "cancel" },
      { text: "Open", onPress: () => startUpdate() },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Expo module example</Text>
          <Text style={styles.title}>In-app updates</Text>
          <Text style={styles.subtitle}>
            Validate Play Core update flows on Android and App Store redirects
            on iOS.
          </Text>
        </View>

        <View style={styles.panel}>
          <Text style={styles.label}>Status</Text>
          <View style={styles.statusRow}>
            <Text style={styles.status}>{status}</Text>
            {status === "Checking" || status === "Starting" ? (
              <ActivityIndicator color="#0f766e" />
            ) : null}
          </View>
          <Text style={styles.message}>{message}</Text>

          {updateInfo ? (
            <View style={styles.details}>
              <Detail label="Update type" value={updateTypeLabel} />
              <Detail
                label="Store version"
                value={updateInfo.storeVersion ?? "Unavailable"}
              />
              {isAndroid ? (
                <>
                  <Detail
                    label="Flexible allowed"
                    value={String(Boolean(updateInfo.flexibleAllowed))}
                  />
                  <Detail
                    label="Immediate allowed"
                    value={String(Boolean(updateInfo.immediateAllowed))}
                  />
                  <Detail
                    label="Priority"
                    value={String(updateInfo.serverPriority ?? "None")}
                  />
                </>
              ) : (
                <Detail
                  label="Release date"
                  value={String(updateInfo.releaseDate ?? "Unavailable")}
                />
              )}
            </View>
          ) : null}
        </View>

        <View style={styles.actions}>
          <ActionButton label="Check update" onPress={checkForUpdate} />
          {isAndroid ? (
            <>
              <ActionButton
                label="Start flexible"
                onPress={() => startUpdate(false)}
                disabled={!updateInfo?.flexibleAllowed}
              />
              <ActionButton
                label="Start immediate"
                onPress={() => startUpdate(true)}
                disabled={!updateInfo?.immediateAllowed}
              />
            </>
          ) : (
            <ActionButton
              label="Open App Store"
              onPress={confirmIosUpdate}
              disabled={!updateInfo?.updateAvailable}
            />
          )}
        </View>

        <View style={styles.panel}>
          <Text style={styles.label}>Recent events</Text>
          {eventLog.length > 0 ? (
            eventLog.map((event) => (
              <Text key={event} style={styles.event}>
                {event}
              </Text>
            ))
          ) : (
            <Text style={styles.message}>No update events yet.</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function ActionButton({
  disabled,
  label,
  onPress,
}: {
  disabled?: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        disabled ? styles.buttonDisabled : null,
        pressed && !disabled ? styles.buttonPressed : null,
      ]}
    >
      <Text
        style={[styles.buttonText, disabled ? styles.buttonTextDisabled : null]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  container: {
    flexGrow: 1,
    gap: 18,
    padding: 20,
  },
  header: {
    gap: 8,
    paddingTop: 16,
  },
  eyebrow: {
    color: "#0f766e",
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  title: {
    color: "#0f172a",
    fontSize: 34,
    fontWeight: "800",
  },
  subtitle: {
    color: "#475569",
    fontSize: 16,
    lineHeight: 23,
  },
  panel: {
    gap: 12,
    borderColor: "#dbe4ea",
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: "#fff",
    padding: 16,
  },
  label: {
    color: "#64748b",
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  statusRow: {
    minHeight: 34,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  status: {
    color: "#0f172a",
    fontSize: 28,
    fontWeight: "800",
  },
  message: {
    color: "#475569",
    fontSize: 15,
    lineHeight: 22,
  },
  details: {
    gap: 10,
    borderTopColor: "#e2e8f0",
    borderTopWidth: 1,
    paddingTop: 12,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 14,
  },
  detailLabel: {
    color: "#64748b",
    flex: 1,
    fontSize: 14,
  },
  detailValue: {
    color: "#0f172a",
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    textAlign: "right",
  },
  actions: {
    gap: 10,
  },
  button: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#0f766e",
    paddingHorizontal: 16,
  },
  buttonPressed: {
    backgroundColor: "#115e59",
  },
  buttonDisabled: {
    backgroundColor: "#cbd5e1",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
  },
  buttonTextDisabled: {
    color: "#64748b",
  },
  event: {
    color: "#0f172a",
    fontSize: 15,
    lineHeight: 22,
  },
});
