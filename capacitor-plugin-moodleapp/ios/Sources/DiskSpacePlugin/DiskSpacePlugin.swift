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

/**
 * Retrieves the free space of the storage volume where the app stores its files.
 */
@objc(DiskSpacePlugin)
public class DiskSpacePlugin: CAPPlugin, CAPBridgedPlugin {

    public let identifier = "DiskSpacePlugin"
    public let jsName = "MoodleAppDiskSpace"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getFreeSpace", returnType: CAPPluginReturnPromise),
    ]

    /**
     * Get the free space in bytes of the whole volume that contains the app documents folder.
     *
     * @param call The plugin call.
     */
    @objc public func getFreeSpace(_ call: CAPPluginCall) {
        guard let directory = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first else {
            call.reject("Unable to get free disk space.")

            return
        }

        // This is the value that iOS recommends for user initiated downloads, it includes purgeable space.
        if let values = try? directory.resourceValues(forKeys: [.volumeAvailableCapacityForImportantUsageKey]),
           let free = values.volumeAvailableCapacityForImportantUsage {
            call.resolve(["free": free])

            return
        }

        if let attributes = try? FileManager.default.attributesOfFileSystem(forPath: directory.path),
           let free = attributes[.systemFreeSize] as? NSNumber {
            call.resolve(["free": free.int64Value])

            return
        }

        call.reject("Unable to get free disk space.")
    }

}
