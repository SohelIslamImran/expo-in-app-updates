import ExpoModulesCore
import StoreKit

@Record
struct UpdateInfo {
  var updateAvailable: Bool
  var storeVersion: String?
  var releaseDate: String?
}

@Record
struct UpdateStartEvent {
  var updateType: String?
}

@Record
struct UpdateCancelledEvent {
  var reason: String?
}

@ExpoModule("ExpoInAppUpdates")
public final class ExpoInAppUpdatesModule: Module {
  @Event
  var onUpdateStart: (UpdateStartEvent) -> Void

  @Event
  var onUpdateCancelled: (UpdateCancelledEvent) -> Void

  // `SKStoreProductViewController.delegate` is weak, so the module keeps the delegate alive.
  private var storeDelegate: StoreProductDelegate?

  @JS
  func checkForUpdate() async throws -> UpdateInfo {
    guard let app = try await AppStoreLookup.fetch() else {
      return UpdateInfo(updateAvailable: false)
    }
    let currentVersion = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? ""
    return UpdateInfo(
      updateAvailable: isVersion(app.version, newerThan: currentVersion),
      storeVersion: app.version,
      releaseDate: app.currentVersionReleaseDate
    )
  }

  @JS
  func startUpdate() async throws -> Bool {
    guard let appId = try await AppStoreLookup.appStoreId() else {
      throw MissingAppStoreIdException()
    }
    return try await presentStore(appId: appId)
  }

  @MainActor
  private func presentStore(appId: String) async throws -> Bool {
    let storeViewController = SKStoreProductViewController()
    let delegate = StoreProductDelegate { [weak self] in
      self?.storeDelegate = nil
      self?.onUpdateCancelled(UpdateCancelledEvent(reason: "User closed the App Store sheet"))
    }
    storeViewController.delegate = delegate

    do {
      try await storeViewController.loadProduct(withParameters: [SKStoreProductParameterITunesItemIdentifier: appId])
    } catch {
      // The sheet can't load the product (e.g. on the simulator), so open the App Store app instead.
      return await openAppStore(appId: appId)
    }

    // Resolve the presenter after loading: the screen can change while the product loads, and
    // presenting on a controller that already presents a modal silently fails.
    guard let presenter = appContext?.utilities?.currentViewController() else {
      throw PresentationFailedException()
    }
    presenter.present(storeViewController, animated: true)
    guard storeViewController.presentingViewController != nil else {
      throw PresentationFailedException()
    }

    storeDelegate = delegate
    onUpdateStart(UpdateStartEvent())
    return true
  }

  @MainActor
  private func openAppStore(appId: String) async -> Bool {
    guard let url = URL(string: "https://apps.apple.com/app/id\(appId)") else {
      return false
    }
    let opened = await UIApplication.shared.open(url)
    if opened {
      onUpdateStart(UpdateStartEvent())
    }
    return opened
  }
}

private final class StoreProductDelegate: NSObject, SKStoreProductViewControllerDelegate {
  private let onFinish: () -> Void

  init(onFinish: @escaping () -> Void) {
    self.onFinish = onFinish
  }

  func productViewControllerDidFinish(_ viewController: SKStoreProductViewController) {
    // StoreKit doesn't say whether the user updated, so closing the sheet counts as a cancellation.
    viewController.dismiss(animated: true)
    onFinish()
  }
}

/// Compares dot-separated versions numerically, treating missing components as zero (`1.0` == `1.0.0`).
func isVersion(_ version: String, newerThan other: String) -> Bool {
  let lhs = version.split(separator: ".").map { Int($0) ?? 0 }
  let rhs = other.split(separator: ".").map { Int($0) ?? 0 }
  for index in 0..<max(lhs.count, rhs.count) {
    let left = index < lhs.count ? lhs[index] : 0
    let right = index < rhs.count ? rhs[index] : 0
    if left != right {
      return left > right
    }
  }
  return false
}

final class MissingAppStoreIdException: Exception, @unchecked Sendable {
  override var reason: String {
    "Unable to find the app in the App Store. Set `AppStoreID` in Info.plist, or publish the app with this bundle identifier."
  }
}

final class PresentationFailedException: Exception, @unchecked Sendable {
  override var reason: String {
    "Unable to present the App Store sheet: no view controller is available to present it."
  }
}

final class LookupFailedException: GenericException<String>, @unchecked Sendable {
  override var reason: String {
    "Failed to fetch app info from the App Store: \(param)"
  }
}
