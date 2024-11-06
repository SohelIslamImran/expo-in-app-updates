package expo.modules.inappupdates

import android.net.Uri
import android.app.Activity
import android.content.Intent
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.exception.CodedException
import com.google.android.play.core.appupdate.AppUpdateInfo
import com.google.android.play.core.appupdate.AppUpdateManager
import com.google.android.play.core.appupdate.AppUpdateOptions
import com.google.android.play.core.install.model.AppUpdateType
import com.google.android.play.core.install.model.InstallStatus
import com.google.android.play.core.install.model.UpdateAvailability
import com.google.android.play.core.appupdate.AppUpdateManagerFactory
import com.google.android.play.core.install.InstallStateUpdatedListener

class ExpoInAppUpdatesModule : Module() {
  private lateinit var appUpdateManager: AppUpdateManager
    private val requestCode = 100

    private fun redirectToStore() {
        val intent = Intent(Intent.ACTION_VIEW).apply {
            data = Uri.parse("https://play.google.com/store/apps/details?id=${appContext.reactContext?.packageName}")
            setPackage("com.android.vending")
        }
        appContext.currentActivity?.startActivity(intent)
    }

    private val listener = InstallStateUpdatedListener { state ->
        if (state.installStatus() == InstallStatus.DOWNLOADED) {
            // Trigger user action to complete the update
            appUpdateManager.completeUpdate()
        } else if (state.installStatus() == InstallStatus.FAILED){
            redirectToStore()
        }
    }

    override fun definition() = ModuleDefinition {
        Name("ExpoInAppUpdates")

        Constants(
            "FLEXIBLE" to AppUpdateType.FLEXIBLE,
            "IMMEDIATE" to AppUpdateType.IMMEDIATE
        )

        OnCreate {
            appUpdateManager = AppUpdateManagerFactory.create(appContext.reactContext!!)
            appUpdateManager.registerListener(listener)
        }

        OnDestroy {
            appUpdateManager.unregisterListener(listener)
        }

        AsyncFunction("checkForUpdate") { promise: Promise ->
            appUpdateManager.appUpdateInfo.addOnSuccessListener { appUpdateInfo ->
                when {
                    appUpdateInfo.updateAvailability() == UpdateAvailability.UPDATE_AVAILABLE -> {
                        promise.resolve(mapOf(
                            "updateAvailable" to true,
                            "immediateAllowed" to appUpdateInfo.isUpdateTypeAllowed(AppUpdateType.IMMEDIATE),
                            "flexibleAllowed" to appUpdateInfo.isUpdateTypeAllowed(AppUpdateType.FLEXIBLE),
                            "daysSinceRelease" to appUpdateInfo.clientVersionStalenessDays(),
                            "storeVersion" to appUpdateInfo.availableVersionCode().toString()
                        ))
                    }
                    appUpdateInfo.updateAvailability() == UpdateAvailability.DEVELOPER_TRIGGERED_UPDATE_IN_PROGRESS -> {
                        promise.resolve(mapOf(
                            "updateAvailable" to true,
                            "updateInProgress" to true
                        ))
                    }
                    else -> {
                        promise.resolve(mapOf("updateAvailable" to false))
                    }
                }
            }.addOnFailureListener { error ->
                promise.reject(CodedException("Failed to check for updates: ${error.message}", error))
            }
        }

        AsyncFunction("startUpdate") { updateType: Int, promise: Promise ->
            val appUpdateInfoTask = appUpdateManager.appUpdateInfo
            appUpdateInfoTask.addOnSuccessListener { appUpdateInfo: AppUpdateInfo ->
                if (appUpdateInfo.updateAvailability() == UpdateAvailability.UPDATE_AVAILABLE
                    && appUpdateInfo.isUpdateTypeAllowed(updateType)
                ) {
                    appContext.currentActivity?.let { activity ->
                        val appUpdateOptions = AppUpdateOptions.newBuilder(updateType)
                            .setAllowAssetPackDeletion(true)
                            .build()

                        appUpdateManager.startUpdateFlowForResult(appUpdateInfo, activity, appUpdateOptions, requestCode)

                        promise.resolve(true)
                    } ?: run {
                        promise.reject(CodedException("Current activity is null"))
                    }
                } else {
                    promise.resolve(false)
                }
            }.addOnFailureListener { error ->
                promise.reject(CodedException("Failed to start update flow: ${error.message}", error))
            }
        }

        OnActivityResult { _, activityResult ->
            if (activityResult.requestCode == requestCode) {
                if (activityResult.resultCode != Activity.RESULT_OK && activityResult.resultCode != Activity.RESULT_CANCELED) {
                    redirectToStore()
                }
            }
        }
    }
}
