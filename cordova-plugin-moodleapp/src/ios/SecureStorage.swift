import Cordova
import Foundation
import Security

@objc(SecureStorage)
class SecureStorage: CDVPlugin {

    @objc(get:)
    func get(_ command: CDVInvokedUrlCommand) {
        let names = command.argument(at: 0) as? [String] ?? []
        let collection = command.argument(at: 1, withDefault: "") as? String ?? ""
        var result: [String: String] = [:]

        NSLog("SecureStorage: Get values with names %@ in collection %@", names, collection)

        for name in names {
            if let value = getValue(name, inCollection: collection) {
                result[name] = value
            }
        }

        let pluginResult = CDVPluginResult(status: CDVCommandStatus_OK, messageAs: result)
        commandDelegate.send(pluginResult, callbackId: command.callbackId)
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

        if status != errSecItemNotFound {
            NSLog("Error getting value for %@ in collection %@. Status: %d", name, collection, status)
        }

        return nil
    }

    @objc(store:)
    func store(_ command: CDVInvokedUrlCommand) {
        let data = command.argument(at: 0) as? [String: String] ?? [:]
        let collection = command.argument(at: 1, withDefault: "") as? String ?? ""
        let names = Array(data.keys)
        var hasError = false
        var insertedNames: [String] = []
        var previousValues: [String: String] = [:]

        NSLog("SecureStorage: Store values with names %@ in collection %@", names, collection)

        for (name, value) in data {
            let storedValue = getValue(name, inCollection: collection)
            let status = storedValue == nil
                ? add(name, value: value, inCollection: collection)
                : update(name, value: value, inCollection: collection)

            if status != errSecSuccess {
                NSLog("Error storing value for %@ in collection %@. Status: %d", name, collection, status)
                hasError = true

                for insertedName in insertedNames {
                    _ = delete(insertedName, fromCollection: collection)
                }
                for (previousName, previousValue) in previousValues {
                    _ = update(previousName, value: previousValue, inCollection: collection)
                }

                break
            }

            if let storedValue {
                previousValues[name] = storedValue
            } else {
                insertedNames.append(name)
            }
        }

        let pluginResult = hasError
            ? CDVPluginResult(
                status: CDVCommandStatus_ERROR,
                messageAs: "Error storing one or more values in secure storage.")
            : CDVPluginResult(status: CDVCommandStatus_OK)
        commandDelegate.send(pluginResult, callbackId: command.callbackId)
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

    @objc(delete:)
    func delete(_ command: CDVInvokedUrlCommand) {
        let names = command.argument(at: 0) as? [String] ?? []
        let collection = command.argument(at: 1, withDefault: "") as? String ?? ""
        var hasError = false
        var deletedValues: [String: String] = [:]

        NSLog("SecureStorage: Delete values with names %@ in collection %@", names, collection)

        for name in names where !name.isEmpty {
            guard let storedValue = getValue(name, inCollection: collection) else {
                continue
            }

            let status = delete(name, fromCollection: collection)
            if status != errSecSuccess && status != errSecItemNotFound {
                NSLog("Error deleting entry with name %@ in collection %@. Status: %d", name, collection, status)
                hasError = true

                for (deletedName, deletedValue) in deletedValues {
                    _ = add(deletedName, value: deletedValue, inCollection: collection)
                }
            } else {
                deletedValues[name] = storedValue
            }
        }

        let pluginResult = hasError
            ? CDVPluginResult(
                status: CDVCommandStatus_ERROR,
                messageAs: "Error deleting one or more values from secure storage.")
            : CDVPluginResult(status: CDVCommandStatus_OK)
        commandDelegate.send(pluginResult, callbackId: command.callbackId)
    }

    private func delete(_ name: String, fromCollection collection: String) -> OSStatus {
        let query: [CFString: Any] = [
            kSecClass: kSecClassGenericPassword,
            kSecAttrAccount: name,
            kSecAttrService: collection,
        ]

        return SecItemDelete(query as CFDictionary)
    }

    @objc(deleteCollection:)
    func deleteCollection(_ command: CDVInvokedUrlCommand) {
        let collection = command.argument(at: 0, withDefault: "") as? String ?? ""

        guard !collection.isEmpty else {
            NSLog("SecureStorage: Collection cannot be empty in deleteCollection")
            commandDelegate.send(CDVPluginResult(status: CDVCommandStatus_OK), callbackId: command.callbackId)

            return
        }

        NSLog("SecureStorage: Delete all values in collection %@", collection)

        let query: [CFString: Any] = [
            kSecClass: kSecClassGenericPassword,
            kSecAttrService: collection,
        ]
        let status = SecItemDelete(query as CFDictionary)

        let pluginResult: CDVPluginResult
        if status == errSecSuccess || status == errSecItemNotFound {
            pluginResult = CDVPluginResult(status: CDVCommandStatus_OK)
        } else {
            NSLog("Error deleting all values in collection %@. Status: %d", collection, status)
            pluginResult = CDVPluginResult(
                status: CDVCommandStatus_IO_EXCEPTION,
                messageAs: "Error deleting values from secure storage.")
        }

        commandDelegate.send(pluginResult, callbackId: command.callbackId)
    }

}
