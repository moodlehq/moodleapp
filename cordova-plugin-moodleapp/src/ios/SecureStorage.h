#import <Foundation/Foundation.h>
#import <Cordova/CDVPlugin.h>

@interface SecureStorage : CDVPlugin {}

- (void)get:(CDVInvokedUrlCommand*)command;
- (void)store:(CDVInvokedUrlCommand*)command;
- (void)delete:(CDVInvokedUrlCommand*)command;
- (void)deleteCollection:(CDVInvokedUrlCommand*)command;

@end
