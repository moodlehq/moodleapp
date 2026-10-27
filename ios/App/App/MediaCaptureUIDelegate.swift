import UIKit
import WebKit

// WKUIDelegate that asks the user for confirmation before a frame can use the camera or the microphone.
//
// Capacitor grants every media capture request without asking, but 3rd party code (e.g. site plugins or iframes) can
// run in the WebView, so the user needs to confirm it.
//
// Confirmations are remembered per capability. In sub frames (e.g. iframes) they are also remembered per frame URL,
// and if the frame URL cannot be obtained the confirmation is not remembered, so the user is always asked.
//
// For main frame, the request is granted once, not per URL. This is for 2 reasons:
// 1- JS code can change the main frame URL (e.g. using history.pushState), so the URL is not reliable.
// 2- WKWebView caches the permission decisions, so repeated requests are ignored for several minutes.
//
// Any other delegate method is forwarded to the delegate that was set in the WebView originally (Capacitor's).
final class MediaCaptureUIDelegate: NSObject, WKUIDelegate {

    private enum Capability: String {
        case camera
        case microphone
    }

    private static let mainFrameStorageKey = "trustedMediaCaptureMainFrameByType"
    private static let subFrameStorageKey = "trustedMediaCaptureSitesByType"

    private let fallbackDelegate: WKUIDelegate?
    private weak var presenter: UIViewController?

    init(fallbackDelegate: WKUIDelegate?, presenter: UIViewController) {
        self.fallbackDelegate = fallbackDelegate
        self.presenter = presenter

        super.init()
    }

    // MARK: - Forwarding

    override func responds(to aSelector: Selector!) -> Bool {
        return super.responds(to: aSelector) || (fallbackDelegate?.responds(to: aSelector) ?? false)
    }

    override func forwardingTarget(for aSelector: Selector!) -> Any? {
        if let fallbackDelegate = fallbackDelegate, fallbackDelegate.responds(to: aSelector) {
            return fallbackDelegate
        }

        return super.forwardingTarget(for: aSelector)
    }

    // MARK: - Media capture

    func webView(
        _ webView: WKWebView,
        requestMediaCapturePermissionFor origin: WKSecurityOrigin,
        initiatedByFrame frame: WKFrameInfo,
        type: WKMediaCaptureType,
        decisionHandler: @escaping (WKPermissionDecision) -> Void
    ) {
        let capabilities = Self.capabilities(for: type)
        guard !capabilities.isEmpty else {
            decisionHandler(.prompt)

            return
        }

        let isMainFrame = frame.isMainFrame
        let siteURL = isMainFrame ? nil : Self.trustedSiteURL(for: frame)

        let isTrusted: Bool
        if isMainFrame {
            isTrusted = Self.isMainFrameTrusted(capabilities: capabilities)
        } else if let siteURL = siteURL {
            isTrusted = Self.isSiteTrusted(url: siteURL, capabilities: capabilities)
        } else {
            isTrusted = false
        }

        if isTrusted {
            decisionHandler(.grant)

            return
        }

        let host = isMainFrame ? Self.appName : Self.displayHost(for: frame, origin: origin, webView: webView)
        let message = "\"\(host)\" would like to access the \(Self.mediaName(for: type))."

        presentPrompt(message: message, allow: {
            if isMainFrame {
                Self.trustMainFrame(capabilities: capabilities)
            } else if let siteURL = siteURL {
                Self.trustSite(url: siteURL, capabilities: capabilities)
            }

            decisionHandler(.grant)
        }, deny: {
            decisionHandler(.deny)
        })
    }

    private func presentPrompt(message: String, allow: @escaping () -> Void, deny: @escaping () -> Void) {
        DispatchQueue.main.async { [weak self] in
            guard var viewController = self?.presenter else {
                deny()

                return
            }

            while let presented = viewController.presentedViewController {
                viewController = presented
            }

            let alert = UIAlertController(title: nil, message: message, preferredStyle: .alert)
            alert.addAction(UIAlertAction(title: NSLocalizedString("Don't Allow", comment: ""), style: .cancel) { _ in deny() })
            alert.addAction(UIAlertAction(title: NSLocalizedString("Allow", comment: ""), style: .default) { _ in allow() })

            viewController.present(alert, animated: true)
        }
    }

    // MARK: - Request information

    private static func capabilities(for type: WKMediaCaptureType) -> [Capability] {
        switch type {
        case .microphone:
            return [.microphone]
        case .camera:
            return [.camera]
        case .cameraAndMicrophone:
            return [.camera, .microphone]
        @unknown default:
            return []
        }
    }

    private static func mediaName(for type: WKMediaCaptureType) -> String {
        switch type {
        case .microphone:
            return "microphone"
        case .camera:
            return "camera"
        case .cameraAndMicrophone:
            return "camera and microphone"
        @unknown default:
            return "media devices"
        }
    }

    private static var appName: String {
        for key in ["CFBundleDisplayName", "CFBundleName"] {
            if let name = Bundle.main.object(forInfoDictionaryKey: key) as? String, !name.isEmpty {
                return name
            }
        }

        return "this app"
    }

    /// Host to show in the prompt. It's the app name if the frame belongs to the URL loaded in the WebView.
    private static func displayHost(for frame: WKFrameInfo, origin: WKSecurityOrigin, webView: WKWebView) -> String {
        if let frameURL = frame.request.url, let host = frameURL.host, !host.isEmpty {
            return matches(host: host, scheme: frameURL.scheme, webViewURL: webView.url) ? appName : host
        }

        // In some iOS versions the frame URL is not available, but the frame's security origin is.
        let frameOrigin = frame.securityOrigin
        let resolvedOrigin = !frameOrigin.protocol.isEmpty && !frameOrigin.host.isEmpty ? frameOrigin : origin

        if !resolvedOrigin.host.isEmpty {
            return matches(host: resolvedOrigin.host, scheme: resolvedOrigin.protocol, webViewURL: webView.url)
                ? appName
                : resolvedOrigin.host
        }

        return "this site"
    }

    private static func matches(host: String, scheme: String?, webViewURL: URL?) -> Bool {
        guard let scheme = scheme, !scheme.isEmpty, let webViewHost = webViewURL?.host, let webViewScheme = webViewURL?.scheme else {
            return false
        }

        return host.caseInsensitiveCompare(webViewHost) == .orderedSame
            && scheme.caseInsensitiveCompare(webViewScheme) == .orderedSame
    }

    // MARK: - Trusted frames

    /// Normalised URL used to remember a confirmation for a sub frame, or nil if it cannot be reliably obtained.
    private static func trustedSiteURL(for frame: WKFrameInfo) -> String? {
        // URLs without scheme or host (e.g. about:blank) don't identify the frame, so they're considered unavailable.
        guard let url = frame.request.url, url.scheme?.isEmpty == false, url.host?.isEmpty == false,
              var components = URLComponents(url: url, resolvingAgainstBaseURL: false) else {
            return nil
        }

        components.fragment = nil

        // Remove some parameters that are not relevant to the URL and could be sensitive.
        let ignoredQueryParams: Set<String> = ["lang", "token", "wstoken", "privatetoken"]
        let queryItems = components.queryItems?.filter { !ignoredQueryParams.contains($0.name.lowercased()) }
        components.queryItems = queryItems?.isEmpty == false ? queryItems : nil

        components.path = components.path.replacingOccurrences(
            of: "(/tokenpluginfile\\.php/)[^/]+(/|$)",
            with: "$1secret$2",
            options: [.regularExpression, .caseInsensitive]
        )

        return components.url?.absoluteString
    }

    private static func trustedSites(storageKey: String) -> [String: [String]] {
        return UserDefaults.standard.dictionary(forKey: storageKey) as? [String: [String]] ?? [:]
    }

    private static func isSiteTrusted(url: String, capabilities: [Capability]) -> Bool {
        let trustedSites = trustedSites(storageKey: subFrameStorageKey)

        return capabilities.allSatisfy { trustedSites[$0.rawValue]?.contains(url) ?? false }
    }

    private static func trustSite(url: String, capabilities: [Capability]) {
        var trustedSites = trustedSites(storageKey: subFrameStorageKey)

        for capability in capabilities {
            var urls = trustedSites[capability.rawValue] ?? []
            if !urls.contains(url) {
                urls.append(url)
                trustedSites[capability.rawValue] = urls
            }
        }

        UserDefaults.standard.set(trustedSites, forKey: subFrameStorageKey)
    }

    private static func trustedMainFrameCapabilities() -> [String: Bool] {
        return UserDefaults.standard.dictionary(forKey: mainFrameStorageKey) as? [String: Bool] ?? [:]
    }

    private static func isMainFrameTrusted(capabilities: [Capability]) -> Bool {
        let trusted = trustedMainFrameCapabilities()

        return capabilities.allSatisfy { trusted[$0.rawValue] ?? false }
    }

    private static func trustMainFrame(capabilities: [Capability]) {
        var trusted = trustedMainFrameCapabilities()

        for capability in capabilities {
            trusted[capability.rawValue] = true
        }

        UserDefaults.standard.set(trusted, forKey: mainFrameStorageKey)
    }
}
