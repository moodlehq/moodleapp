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
import UIKit

/**
 * Opens URLs in the system default browser.
 */
@objc(BrowserLauncherPlugin)
public class BrowserLauncherPlugin: CAPPlugin, CAPBridgedPlugin {

    public let identifier = "BrowserLauncherPlugin"
    public let jsName = "MoodleAppBrowserLauncher"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "openInExternalBrowser", returnType: CAPPluginReturnPromise),
    ]

    /**
     * Open a URL in the system default browser.
     *
     * @param call The plugin call.
     */
    @objc public func openInExternalBrowser(_ call: CAPPluginCall) {
        guard let urlString = call.getString("url") else {
            call.reject("URL is required")
            return
        }

        guard let url = URL(string: urlString) else {
            call.reject("Invalid URL")
            return
        }

        DispatchQueue.main.async {
            UIApplication.shared.open(url, options: [:]) { success in
                if success {
                    call.resolve()
                } else {
                    call.reject("Failed to open URL")
                }
            }
        }
    }

}
