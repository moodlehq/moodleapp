import UIKit
import WebKit
import Capacitor

/// Bridge view controller that customises Capacitor's WebView: it asks the user for confirmation before the WebView can
/// use the camera or the microphone, and it only allows enabling fullscreen in iOS 17+.
class MoodleBridgeViewController: CAPBridgeViewController {

    // WKWebView keeps a weak reference to its UI delegate, so it needs to be retained here.
    private var mediaCaptureDelegate: MediaCaptureUIDelegate?

    override func webViewConfiguration(for instanceConfiguration: InstanceConfiguration) -> WKWebViewConfiguration {
        let configuration = super.webViewConfiguration(for: instanceConfiguration)

        // Capacitor enables the fullscreen API in iOS 15.4+, but in iOS 15 and 16 there is a bug that breaks
        // the WebView resizing after leaving fullscreen.
        if #available(iOS 15.4, *) {
            if #unavailable(iOS 17.0) {
                configuration.preferences.isElementFullscreenEnabled = false
            }
        }

        return configuration
    }

    override func capacitorDidLoad() {
        super.capacitorDidLoad()

        guard let webView = webView else {
            return
        }

        let delegate = MediaCaptureUIDelegate(fallbackDelegate: webView.uiDelegate, presenter: self)
        mediaCaptureDelegate = delegate
        webView.uiDelegate = delegate
    }
}
