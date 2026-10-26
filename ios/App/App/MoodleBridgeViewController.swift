import UIKit
import WebKit
import Capacitor

/// Bridge view controller that asks the user for confirmation before the WebView can use the camera or the microphone.
class MoodleBridgeViewController: CAPBridgeViewController {

    // WKWebView keeps a weak reference to its UI delegate, so it needs to be retained here.
    private var mediaCaptureDelegate: MediaCaptureUIDelegate?

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
