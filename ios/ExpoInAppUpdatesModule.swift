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
    guard let numericAppId = Int64(appId), numericAppId > 0 else {
      throw MissingAppStoreIdException()
    }

    let storeViewController = SKStoreProductViewController()
    let delegate = StoreProductDelegate { [weak self] in
      self?.onUpdateCancelled(UpdateCancelledEvent(reason: "User closed the App Store sheet"))
    }
    delegate.attach(to: storeViewController)

    let loaded = (try? await storeViewController.loadProduct(
      withParameters: [SKStoreProductParameterITunesItemIdentifier: NSNumber(value: numericAppId)]
    )) ?? false
    guard loaded else {
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
  private static var associationKey: UInt8 = 0
  private let onFinish: () -> Void

  init(onFinish: @escaping () -> Void) {
    self.onFinish = onFinish
  }

  /// Sets itself as the controller's delegate. `delegate` is weak, so the controller also retains
  /// the delegate for as long as it lives.
  func attach(to viewController: SKStoreProductViewController) {
    viewController.delegate = self
    objc_setAssociatedObject(viewController, &Self.associationKey, self, .OBJC_ASSOCIATION_RETAIN_NONATOMIC)
  }

  func productViewControllerDidFinish(_ viewController: SKStoreProductViewController) {
    // StoreKit doesn't say whether the user updated, so closing the sheet counts as a cancellation.
    viewController.dismiss(animated: true)
    onFinish()
  }
}

/// Compares dot-separated versions component by component, treating missing components as zero
/// (`1.0` == `1.0.0`) and comparing digits numerically within each component (`1.10` > `1.9`).
func isVersion(_ version: String, newerThan other: String) -> Bool {
  let lhs = version.split(separator: ".").map(String.init)
  let rhs = other.split(separator: ".").map(String.init)
  for index in 0..<max(lhs.count, rhs.count) {
    let left = index < lhs.count ? lhs[index] : "0"
    let right = index < rhs.count ? rhs[index] : "0"
    switch left.compare(right, options: .numeric) {
    case .orderedDescending: return true
    case .orderedAscending: return false
    case .orderedSame: continue
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
    "Unable to present the App Store sheet over the current screen."
  }
}

final class LookupFailedException: GenericException<String>, @unchecked Sendable {
  override var reason: String {
    "Failed to fetch app info from the App Store: \(param)"
  }
}
