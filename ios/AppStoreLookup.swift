import Foundation

/// Reads the app's App Store listing through the iTunes Search API.
enum AppStoreLookup {
  struct App: Decodable {
    let trackId: Int
    let version: String
    let currentVersionReleaseDate: String?
  }

  private struct Response: Decodable {
    let results: [App]
  }

  /// The `AppStoreID` from Info.plist, or the ID looked up from the bundle identifier.
  static func appStoreId() async throws -> String? {
    if let configuredId = infoValue("AppStoreID") {
      return configuredId
    }
    return try await fetch().map { String($0.trackId) }
  }

  /// The App Store listing of the app, or `nil` if the app isn't published in the store.
  static func fetch() async throws -> App? {
    var components = URLComponents(string: "https://itunes.apple.com/lookup")!
    var query: [URLQueryItem]
    if let appId = infoValue("AppStoreID") {
      query = [URLQueryItem(name: "id", value: appId)]
    } else if let bundleId = Bundle.main.bundleIdentifier {
      query = [URLQueryItem(name: "bundleId", value: bundleId)]
    } else {
      return nil
    }
    if let country = infoValue("AppStoreCountry") {
      query.append(URLQueryItem(name: "country", value: country))
    }
    // Cache buster: the lookup endpoint is served through a CDN that can return stale versions.
    query.append(URLQueryItem(name: "_", value: String(Int(Date().timeIntervalSince1970))))
    components.queryItems = query

    let request = URLRequest(url: components.url!, cachePolicy: .reloadIgnoringLocalAndRemoteCacheData)
    do {
      let (data, _) = try await URLSession(configuration: .ephemeral).data(for: request)
      return try JSONDecoder().decode(Response.self, from: data).results.first
    } catch {
      throw LookupFailedException(error.localizedDescription)
    }
  }

  private static func infoValue(_ key: String) -> String? {
    guard let value = Bundle.main.infoDictionary?[key] as? String, !value.isEmpty else {
      return nil
    }
    return value
  }
}
