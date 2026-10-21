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
import UIKit

/**
 * Opens the iOS settings page for this app.
 */
@objc(NativeSettingsPlugin)
public class NativeSettingsPlugin: CAPPlugin, CAPBridgedPlugin {

    public let identifier = "NativeSettingsPlugin"
    public let jsName = "MoodleAppNativeSettings"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "open", returnType: CAPPluginReturnPromise),
    ]

    /**
     * Open the iOS settings page for this app.
     *
     * @param call The plugin call.
     */
    @objc public func open(_ call: CAPPluginCall) {
        guard let settingsUrl = URL(string: UIApplication.openSettingsURLString) else {
            call.reject("Unable to create app settings URL.")

            return
        }

        DispatchQueue.main.async {
            UIApplication.shared.open(settingsUrl, options: [:]) { success in
                success ? call.resolve() : call.reject("Unable to open app settings.")
            }
        }
    }

}
