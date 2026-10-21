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
import Security

/**
 * Stores values in the Keychain collections previously used by the Cordova plugin.
 */
@objc(SecureStoragePlugin)
public class SecureStoragePlugin: CAPPlugin, CAPBridgedPlugin {

    public let identifier = "SecureStoragePlugin"
    public let jsName = "MoodleAppSecureStorage"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "get", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "store", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "delete", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "deleteCollection", returnType: CAPPluginReturnPromise),
    ]

    /**
     * Get values from a collection.
     *
     * @param call The plugin call.
     */
    @objc public func get(_ call: CAPPluginCall) {
        let names = call.getArray("names", String.self) ?? []
        let collection = call.getString("collection", "")
        var result = JSObject()

        NSLog("SecureStorage: Get values with names %@ in collection %@", names as NSArray, collection)

        for name in names {
            if let value = getValue(name, inCollection: collection) {
                result[name] = value
            }
        }

        call.resolve(result)
    }

    /**
     * Store values in a collection.
     *
     * @param call The plugin call.
     */
    @objc public func store(_ call: CAPPluginCall) {
        guard let data = call.getObject("data") as? [String: String] else {
            call.reject("Data is required.")

            return
        }

        let collection = call.getString("collection", "")
        var insertedNames: [String] = []
        var previousValues: [String: String] = [:]

        NSLog("SecureStorage: Store values with names %@ in collection %@", Array(data.keys) as NSArray, collection)

        for (name, value) in data {
            let storedValue = getValue(name, inCollection: collection)
            let status = storedValue == nil
                ? add(name, value: value, inCollection: collection)
                : update(name, value: value, inCollection: collection)

            guard status == errSecSuccess else {
                NSLog("Error storing value for %@ in collection %@. Status: %d", name, collection, status)

                for insertedName in insertedNames {
                    _ = delete(insertedName, fromCollection: collection)
                }
                for (previousName, previousValue) in previousValues {
                    _ = update(previousName, value: previousValue, inCollection: collection)
                }

                call.reject("Error storing one or more values in secure storage.")

                return
            }

            if let storedValue {
                previousValues[name] = storedValue
            } else {
                insertedNames.append(name)
            }
        }

        call.resolve()
    }

    /**
     * Delete values from a collection.
     *
     * @param call The plugin call.
     */
    @objc public func delete(_ call: CAPPluginCall) {
        let names = call.getArray("names", String.self) ?? []
        let collection = call.getString("collection", "")
        var deletedValues: [String: String] = [:]

        NSLog("SecureStorage: Delete values with names %@ in collection %@", names as NSArray, collection)

        for name in names where !name.isEmpty {
            guard let storedValue = getValue(name, inCollection: collection) else {
                continue
            }

            let status = delete(name, fromCollection: collection)
            guard status == errSecSuccess || status == errSecItemNotFound else {
                NSLog("Error deleting entry with name %@ in collection %@. Status: %d", name, collection, status)
                for (deletedName, deletedValue) in deletedValues {
                    _ = add(deletedName, value: deletedValue, inCollection: collection)
                }

                call.reject("Error deleting one or more values from secure storage.")

                return
            }

            deletedValues[name] = storedValue
        }

        call.resolve()
    }

    /**
     * Delete all values from a collection.
     *
     * @param call The plugin call.
     */
    @objc public func deleteCollection(_ call: CAPPluginCall) {
        let collection = call.getString("collection", "")

        guard !collection.isEmpty else {
            NSLog("SecureStorage: Collection cannot be empty in deleteCollection")
            call.resolve()

            return
        }

        NSLog("SecureStorage: Delete all values in collection %@", collection)

        let query: [CFString: Any] = [
            kSecClass: kSecClassGenericPassword,
            kSecAttrService: collection,
        ]
        let status = SecItemDelete(query as CFDictionary)

        if status == errSecSuccess || status == errSecItemNotFound {
            call.resolve()
        } else {
            call.reject("Error deleting values from secure storage.")
        }
    }

    private func getValue(_ name: String, inCollection collection: String) -> String? {
        guard !name.isEmpty else {
            return nil
        }

        let query: [CFString: Any] = [
            kSecClass: kSecClassGenericPassword,
            kSecAttrAccount: name,
            kSecAttrService: collection,
            kSecReturnData: true,
            kSecMatchLimit: kSecMatchLimitOne,
        ]
        var storedData: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &storedData)

        if status == errSecSuccess, let data = storedData as? Data {
            return String(data: data, encoding: .utf8)
        }

        return nil
    }

    private func add(_ name: String, value: String, inCollection collection: String) -> OSStatus {
        let query: [CFString: Any] = [
            kSecClass: kSecClassGenericPassword,
            kSecAttrAccount: name,
            kSecAttrService: collection,
            kSecAttrAccessible: kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly,
            kSecValueData: Data(value.utf8),
        ]

        return SecItemAdd(query as CFDictionary, nil)
    }

    private func update(_ name: String, value: String, inCollection collection: String) -> OSStatus {
        let query: [CFString: Any] = [
            kSecClass: kSecClassGenericPassword,
            kSecAttrAccount: name,
            kSecAttrService: collection,
            kSecAttrAccessible: kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly,
        ]
        let attributes: [CFString: Any] = [
            kSecValueData: Data(value.utf8),
        ]

        return SecItemUpdate(query as CFDictionary, attributes as CFDictionary)
    }

    private func delete(_ name: String, fromCollection collection: String) -> OSStatus {
        let query: [CFString: Any] = [
            kSecClass: kSecClassGenericPassword,
            kSecAttrAccount: name,
            kSecAttrService: collection,
        ]

        return SecItemDelete(query as CFDictionary)
    }

}
