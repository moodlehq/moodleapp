#import <Foundation/Foundation.h>
#import <Cordova/CDVPlugin.h>
#import <Cordova/CDVPluginResult.h>
#import "SecureStorage.h"

@implementation SecureStorage

- (void)get:(CDVInvokedUrlCommand*)command {
    NSArray* names = [command argumentAtIndex:0];
    NSString* collection = [command argumentAtIndex:1 withDefault:@""];
    NSMutableDictionary* result = [NSMutableDictionary new];

    NSLog(@"SecureStorage: Get values with names %@ in collection %@", names, collection);

    for (NSString* name in names) {
        NSString* value = [self getValue:name inCollection:collection];
        if (value != nil) {
            result[name] = value;
        }
    }

    CDVPluginResult* pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsDictionary:result];
    [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
}

- (NSString *)getValue:(NSString*)name inCollection:(NSString*)collection {
    if ([name length] == 0) {
        return nil;
    }

    NSDictionary* query = @{
        (id)kSecClass: (id)kSecClassGenericPassword,
        (id)kSecAttrAccount: name,
        (id)kSecAttrService: collection,
        (id)kSecReturnData: @YES,
        (id)kSecMatchLimit: (id)kSecMatchLimitOne
    };
    NSData* storedData = NULL;

    OSStatus status = SecItemCopyMatching((CFDictionaryRef)query, (void *) &storedData);

    if (status == errSecSuccess) {
        return [[NSString alloc] initWithData:storedData encoding:NSUTF8StringEncoding];
    } else if (status != errSecItemNotFound) {
        NSLog(@"Error getting value for %@ in collection %@. Status: %d", name, collection, (int) status);
    }

    return nil;
}

- (void)store:(CDVInvokedUrlCommand*)command {

    NSDictionary* data = [command argumentAtIndex:0];
    NSString* collection = [command argumentAtIndex:1 withDefault:@""];
    NSArray* names = [data allKeys];
    BOOL error = false;

    // Variables to be able to rollback changes if something fails.
    NSMutableArray* insertedNames = [NSMutableArray new];
    NSMutableDictionary* previousValues = [NSMutableDictionary new];

    NSLog(@"SecureStorage: Store values with names %@ in collection %@", names, collection);

    for (NSString* name in data) {
        OSStatus status;
        NSString* storedValue = [self getValue:name inCollection:collection];

        if (storedValue != nil) {
            status = [self updateName:name withValue:data[name] inCollection: collection];
        } else {
            status = [self addName:name withValue:data[name] inCollection: collection];
        }

        if (status != errSecSuccess) {
            NSLog(@"Error storing value for %@ in collection %@. Status: %d", name, collection, (int) status);
            error = true;

            // Rollback.
            for (NSString *name in insertedNames) {
                [self deleteName:name fromCollection:collection];
            }
            for(NSString *name in previousValues) {
                [self updateName:name withValue:previousValues[name] inCollection: collection];
            }

            break;
        } else if (storedValue != nil) {
            previousValues[name] = storedValue;
        } else {
            [insertedNames addObject:name];
        }
    }

    CDVPluginResult* pluginResult;
    if (error) {
        pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR
            messageAsString:@"Error storing one or more values in secure storage."];
    } else {
        pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK];
    }

    [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
}

- (OSStatus)addName:(NSString*)name withValue:(NSString*)value inCollection:(NSString*)collection {
    NSData* newValue = [value dataUsingEncoding:NSUTF8StringEncoding];
    NSMutableDictionary* query = [NSMutableDictionary new];
    query[(id)kSecClass] = (id)kSecClassGenericPassword;
    query[(id)kSecAttrAccount] = name;
    query[(id)kSecAttrService] = collection;
    query[(id)kSecAttrAccessible] = (id)kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly;
    query[(id)kSecValueData] = newValue;

    return SecItemAdd((CFDictionaryRef)query, nil);
}

- (OSStatus)updateName:(NSString*)name withValue:(NSString*)value inCollection:(NSString*)collection {
    NSData* newValue = [value dataUsingEncoding:NSUTF8StringEncoding];
    NSMutableDictionary* query = [NSMutableDictionary new];
    query[(id)kSecClass] = (id)kSecClassGenericPassword;
    query[(id)kSecAttrAccount] = name;
    query[(id)kSecAttrService] = collection;
    query[(id)kSecAttrAccessible] = (id)kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly;

    return SecItemUpdate((CFDictionaryRef)query, (CFDictionaryRef)@{
        (id)kSecValueData: newValue
    });
}

- (void)delete:(CDVInvokedUrlCommand*)command {
    NSArray* names = [command argumentAtIndex:0];
    NSString* collection = [command argumentAtIndex:1 withDefault:@""];
    BOOL error = false;

    // Variable to be able to rollback changes if something fails.
    NSMutableDictionary* deletedValues = [NSMutableDictionary new];

    NSLog(@"SecureStorage: Delete values with names %@ in collection %@", names, collection);

    for (NSString* name in names) {
        if ([name length] == 0) {
            continue;
        }

        NSString* storedValue = [self getValue:name inCollection:collection];
        if (storedValue == nil) {
            continue;
        }

        OSStatus status = [self deleteName:name fromCollection:collection];

        if (status != errSecSuccess && status != errSecItemNotFound) {
            NSLog(@"Error deleting entry with name %@ in collection %@. Status: %d", name, collection, (int) status);
            error = true;

            // Rollback.
            for (NSString *name in deletedValues) {
                [self addName:name withValue:deletedValues[name] inCollection:collection];
            }
        } else {
            deletedValues[name] = storedValue;
        }
    }

    CDVPluginResult* pluginResult;
    if (error) {
        pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR
            messageAsString:@"Error deleting one or more values from secure storage."];
    } else {
        pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK];
    }

    [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
}

- (OSStatus)deleteName:(NSString*)name fromCollection:(NSString*)collection {
    NSDictionary* query = @{
        (id)kSecClass: (id)kSecClassGenericPassword,
        (id)kSecAttrAccount: name,
        (id)kSecAttrService: collection,
    };

    return SecItemDelete((CFDictionaryRef)query);
}

- (void)deleteCollection:(CDVInvokedUrlCommand*)command {
    NSString* collection = [command argumentAtIndex:0 withDefault:@""];

    if ([collection length] == 0) {
        NSLog(@"SecureStorage: Collection cannot be empty in deleteCollection");
        CDVPluginResult* pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK];
        [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];

        return;
    }

    NSLog(@"SecureStorage: Delete all values in collection %@", collection);

    NSDictionary* query = @{
        (id)kSecClass: (id)kSecClassGenericPassword,
        (id)kSecAttrService: collection,
    };

    OSStatus status = SecItemDelete((CFDictionaryRef)query);

    CDVPluginResult* pluginResult;
    if (status == errSecSuccess || status == errSecItemNotFound) {
        pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK];
    } else {
        NSLog(@"Error deleting all values in collection %@. Status: %d", collection, (int) status);
        pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_IO_EXCEPTION
            messageAsString:@"Error deleting values from secure storage."];
    }

    [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
}

@end
