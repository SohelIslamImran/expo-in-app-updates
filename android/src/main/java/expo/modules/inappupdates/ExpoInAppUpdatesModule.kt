package expo.modules.inappupdates

import android.app.Activity
import android.content.Intent
import android.net.Uri
import com.google.android.play.core.appupdate.AppUpdateInfo
import com.google.android.play.core.appupdate.AppUpdateManager
import com.google.android.play.core.appupdate.AppUpdateManagerFactory
import com.google.android.play.core.appupdate.AppUpdateOptions
import com.google.android.play.core.install.InstallStateUpdatedListener
import com.google.android.play.core.install.model.AppUpdateType
import com.google.android.play.core.install.model.InstallStatus
import com.google.android.play.core.install.model.UpdateAvailability
import com.google.android.play.core.ktx.requestAppUpdateInfo
import com.google.android.play.core.ktx.requestCompleteUpdate
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.functions.Coroutine
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlin.coroutines.cancellation.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

private const val REQUEST_CODE = 100
private const val PRIORITY_THRESHOLD_IMMEDIATE = 4

private const val EVENT_UPDATE_START = "updateStart"
private const val EVENT_UPDATE_DOWNLOADED = "updateDownloaded"
private const val EVENT_UPDATE_CANCELLED = "updateCancelled"
private const val EVENT_UPDATE_COMPLETED = "updateCompleted"

private class CheckForUpdateException(cause: Throwable) :
  CodedException("ERR_CHECK_FOR_UPDATE", "Failed to check for updates: ${cause.message}", cause)

private class StartUpdateException(cause: Throwable) :
  CodedException("ERR_START_UPDATE", "Failed to start update flow: ${cause.message}", cause)

class ExpoInAppUpdatesModule : Module() {
  private val appUpdateManager: AppUpdateManager by lazy {
    AppUpdateManagerFactory.create(appContext.reactContext ?: throw Exceptions.ReactContextLost())
  }

  private val installStateListener = InstallStateUpdatedListener { state ->
    when (state.installStatus()) {
      InstallStatus.DOWNLOADED -> {
        sendEvent(EVENT_UPDATE_DOWNLOADED, mapOf("readyToInstall" to true))
        appUpdateManager.completeUpdate()
      }
      InstallStatus.INSTALLED -> sendEvent(EVENT_UPDATE_COMPLETED, mapOf<String, Any>())
      InstallStatus.FAILED -> redirectToStore()
      InstallStatus.CANCELED ->
        sendEvent(EVENT_UPDATE_CANCELLED, mapOf("reason" to "User cancelled the installation"))
      else -> Unit
    }
  }

  override fun definition() = ModuleDefinition {
    Name("ExpoInAppUpdates")

    Events(EVENT_UPDATE_START, EVENT_UPDATE_DOWNLOADED, EVENT_UPDATE_CANCELLED, EVENT_UPDATE_COMPLETED)

    OnCreate {
      appUpdateManager.registerListener(installStateListener)
    }

    OnDestroy {
      appUpdateManager.unregisterListener(installStateListener)
    }

    AsyncFunction("checkForUpdate") Coroutine { ->
      val info = requestUpdateInfo(::CheckForUpdateException)
      when (info.updateAvailability()) {
        UpdateAvailability.UPDATE_AVAILABLE -> {
          val priority = info.updatePriority()
          mapOf(
            "updateAvailable" to true,
            "immediateAllowed" to info.isUpdateTypeAllowed(AppUpdateType.IMMEDIATE),
            "flexibleAllowed" to info.isUpdateTypeAllowed(AppUpdateType.FLEXIBLE),
            "daysSinceRelease" to info.clientVersionStalenessDays(),
            "storeVersion" to info.availableVersionCode().toString(),
            "serverPriority" to priority,
            "serverUpdateType" to if (priority >= PRIORITY_THRESHOLD_IMMEDIATE) "IMMEDIATE" else "FLEXIBLE"
          )
        }
        UpdateAvailability.DEVELOPER_TRIGGERED_UPDATE_IN_PROGRESS ->
          mapOf("updateAvailable" to true, "updateInProgress" to true)
        else -> mapOf("updateAvailable" to false)
      }
    }

    AsyncFunction("startUpdate") Coroutine { requestedType: Int? ->
      val info = requestUpdateInfo(::StartUpdateException)
      // A flexible update can finish downloading after the app was killed; install it now.
      if (info.installStatus() == InstallStatus.DOWNLOADED) {
        try {
          appUpdateManager.requestCompleteUpdate()
          return@Coroutine true
        } catch (e: CancellationException) {
          throw e
        } catch (e: Exception) {
          throw StartUpdateException(e)
        }
      }
      val updateType = when (info.updateAvailability()) {
        UpdateAvailability.UPDATE_AVAILABLE -> chooseUpdateType(info, requestedType)
        // An immediate update was interrupted (e.g. the app was killed); Play requires resuming it.
        UpdateAvailability.DEVELOPER_TRIGGERED_UPDATE_IN_PROGRESS ->
          AppUpdateType.IMMEDIATE.takeIf { info.isUpdateTypeAllowed(it) }
        else -> null
      } ?: return@Coroutine false

      val activity = appContext.currentActivity ?: throw Exceptions.MissingActivity()
      val options = AppUpdateOptions.newBuilder(updateType).setAllowAssetPackDeletion(true).build()

      val started = try {
        withContext(Dispatchers.Main) {
          appUpdateManager.startUpdateFlowForResult(info, activity, options, REQUEST_CODE)
        }
      } catch (e: CancellationException) {
        throw e
      } catch (e: Exception) {
        throw StartUpdateException(e)
      }
      if (started) {
        sendEvent(EVENT_UPDATE_START, mapOf("updateType" to updateTypeName(updateType)))
      }
      started
    }

    OnActivityResult { _, result ->
      if (result.requestCode != REQUEST_CODE) return@OnActivityResult
      when (result.resultCode) {
        Activity.RESULT_OK -> Unit
        Activity.RESULT_CANCELED ->
          sendEvent(EVENT_UPDATE_CANCELLED, mapOf("reason" to "User cancelled from system dialog"))
        else -> redirectToStore()
      }
    }
  }

  private suspend fun requestUpdateInfo(wrap: (Throwable) -> CodedException): AppUpdateInfo =
    try {
      appUpdateManager.requestAppUpdateInfo()
    } catch (e: CancellationException) {
      throw e
    } catch (e: Exception) {
      throw wrap(e)
    }

  private fun chooseUpdateType(info: AppUpdateInfo, requested: Int?): Int? {
    if (requested != null) {
      return requested.takeIf { info.isUpdateTypeAllowed(it) }
    }
    val preferred =
      if (info.updatePriority() >= PRIORITY_THRESHOLD_IMMEDIATE) AppUpdateType.IMMEDIATE else AppUpdateType.FLEXIBLE
    return listOf(preferred, AppUpdateType.FLEXIBLE, AppUpdateType.IMMEDIATE)
      .firstOrNull { info.isUpdateTypeAllowed(it) }
  }

  private fun updateTypeName(type: Int) = if (type == AppUpdateType.IMMEDIATE) "IMMEDIATE" else "FLEXIBLE"

  private fun redirectToStore() {
    val packageName = appContext.reactContext?.packageName ?: return
    val intent = Intent(Intent.ACTION_VIEW, Uri.parse("https://play.google.com/store/apps/details?id=$packageName"))
      .setPackage("com.android.vending")
    // Ignore devices without the Play Store, where nothing can handle the intent.
    runCatching { appContext.currentActivity?.startActivity(intent) }
  }
}
