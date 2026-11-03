// (C) Copyright 2015 Moodle Pty Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import Capacitor
import Foundation
import WebKit

/**
 * Cancels top-level navigations to external http(s) URLs and sends them to the app, so it can decide how to open them.
 */
@objc(PreventOverridePlugin)
public class PreventOverridePlugin: CAPPlugin, CAPBridgedPlugin {

    public let identifier = "PreventOverridePlugin"
    public let jsName = "MoodleAppPreventOverride"
    public let pluginMethods: [CAPPluginMethod] = []

    private var uiDelegateProxy: UIDelegateProxy?

    public override func load() {
        // Capacitor opens window.open and target="_blank" links in the system browser from its WKUIDelegate without calling
        // shouldOverrideLoad, so wrap the delegate to intercept them (including the ones from iframes).
        guard let webView = bridge?.webView, let original = webView.uiDelegate else {
            return
        }

        let proxy = UIDelegateProxy(original: original) { [weak self] url in
            return self?.notifyIfExternal(url) ?? false
        }
        uiDelegateProxy = proxy // WKWebView keeps a weak reference to its delegate.
        webView.uiDelegate = proxy
    }

    public override func shouldOverrideLoad(_ navigationAction: WKNavigationAction) -> NSNumber? {
        // Navigations inside iframes (page loaded in the same iframe) are not intercepted.
        if let targetFrame = navigationAction.targetFrame, !targetFrame.isMainFrame {
            return nil
        }

        guard let url = navigationAction.request.url, notifyIfExternal(url) else {
            return nil
        }

        return NSNumber(value: true)
    }

    /**
     * Send the URL to the app if it's an external http(s) URL.
     *
     * @return Whether the URL was sent to the app.
     */
    fileprivate func notifyIfExternal(_ url: URL) -> Bool {
        guard let scheme = url.scheme?.lowercased(), scheme == "http" || scheme == "https" else {
            return false
        }

        if let config = bridge?.config,
           [config.localURL, config.serverURL].contains(where: { isSameOrigin($0, url) }) {
            return false
        }

        notifyListeners("overrideUrlLoading", data: ["url": url.absoluteString], retainUntilConsumed: true)

        return true
    }

    private func isSameOrigin(_ appUrl: URL, _ url: URL) -> Bool {
        return appUrl.scheme?.lowercased() == url.scheme?.lowercased() &&
            appUrl.host?.lowercased() == url.host?.lowercased() &&
            appUrl.port == url.port
    }

}

/**
 * WKUIDelegate that handles new window requests for external URLs and forwards everything else to the original delegate.
 */
private class UIDelegateProxy: NSObject, WKUIDelegate {

    private let original: WKUIDelegate
    private let onNewWindow: (URL) -> Bool

    init(original: WKUIDelegate, onNewWindow: @escaping (URL) -> Bool) {
        self.original = original
        self.onNewWindow = onNewWindow
    }

    func webView(
        _ webView: WKWebView,
        createWebViewWith configuration: WKWebViewConfiguration,
        for navigationAction: WKNavigationAction,
        windowFeatures: WKWindowFeatures
    ) -> WKWebView? {
        if let url = navigationAction.request.url, onNewWindow(url) {
            return nil
        }

        return original.webView?(
            webView,
            createWebViewWith: configuration,
            for: navigationAction,
            windowFeatures: windowFeatures
        ) ?? nil
    }

    override func responds(to aSelector: Selector!) -> Bool {
        return super.responds(to: aSelector) || original.responds(to: aSelector)
    }

    override func forwardingTarget(for aSelector: Selector!) -> Any? {
        return original.responds(to: aSelector) ? original : super.forwardingTarget(for: aSelector)
    }

}
