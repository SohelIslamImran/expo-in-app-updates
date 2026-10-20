/** Result of {@link checkForUpdate}. */
export type UpdateInfo = {
  /** Whether a newer version is available in the App Store / Play Store. */
  updateAvailable: boolean;

  /**
   * Whether a developer-triggered update is already in progress. Call `startUpdate()` to resume it.
   *
   * @platform android
   */
  updateInProgress?: boolean;

  /**
   * The latest version published in the store. On iOS this is the version string (`CFBundleShortVersionString`),
   * on Android the `versionCode`. Present when an update is available; `null` or absent otherwise.
   */
  storeVersion?: string | null;

  /**
   * The release date of the latest store version, as an ISO 8601 string.
   *
   * @platform ios
   */
  releaseDate?: string | null;

  /**
   * The value of [`clientVersionStalenessDays`](https://developer.android.com/reference/com/google/android/play/core/appupdate/AppUpdateInfo#clientVersionStalenessDays()):
   * the number of days since the Play Store app on the device learned about the update, or `null` if unknown.
   *
   * @platform android
   */
  daysSinceRelease?: number | null;

  /**
   * Whether a [flexible update](https://developer.android.com/guide/playcore/in-app-updates/kotlin-java#flexible) can be started.
   *
   * @platform android
   */
  flexibleAllowed?: boolean;

  /**
   * Whether an [immediate update](https://developer.android.com/guide/playcore/in-app-updates/kotlin-java#immediate) can be started.
   *
   * @platform android
   */
  immediateAllowed?: boolean;

  /**
   * The [update priority](https://developer.android.com/guide/playcore/in-app-updates#check-priority) set in the Play Console (0–5).
   *
   * @platform android
   */
  serverPriority?: number;

  /**
   * The update type derived from `serverPriority`: `IMMEDIATE` for priority 4 or higher, otherwise `FLEXIBLE`.
   *
   * @platform android
   */
  serverUpdateType?: "FLEXIBLE" | "IMMEDIATE";
};

export type UpdateStartEvent = {
  /** Type of the update that was started. Always `undefined` on iOS. */
  updateType?: "FLEXIBLE" | "IMMEDIATE";
};

export type UpdateDownloadedEvent = {
  /** Whether the update is ready to be installed. */
  readyToInstall: boolean;
};

export type UpdateCancelledEvent = {
  /** Reason for the cancellation, if available. */
  reason?: string;
};

export type UpdateCompletedEvent = {
  /** Version that was installed, if available. */
  version?: string;
};

export type ExpoInAppUpdatesEvents = {
  /** The update flow was presented. */
  updateStart: (event: UpdateStartEvent) => void;
  /** A flexible update finished downloading. Android only. */
  updateDownloaded: (event: UpdateDownloadedEvent) => void;
  /** The user dismissed the update flow (on iOS: closed the App Store sheet). */
  updateCancelled: (event: UpdateCancelledEvent) => void;
  /** The update was installed. Android only. */
  updateCompleted: (event: UpdateCompletedEvent) => void;
};
