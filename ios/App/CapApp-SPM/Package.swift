// swift-tools-version: 5.9
import PackageDescription

// DO NOT MODIFY THIS FILE - managed by Capacitor CLI commands
let package = Package(
    name: "CapApp-SPM",
    platforms: [.iOS(.v15)],
    products: [
        .library(
            name: "CapApp-SPM",
            targets: ["CapApp-SPM"])
    ],
    dependencies: [
        .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", exact: "8.5.2"),
        .package(name: "CapacitorClipboard", path: "../../../node_modules/@capacitor/clipboard"),
        .package(name: "CapacitorDevice", path: "../../../node_modules/@capacitor/device"),
        .package(name: "CapacitorSplashScreen", path: "../../../node_modules/@capacitor/splash-screen"),
        .package(name: "MoodlehqCordovaPluginCamera", path: "../../capacitor-cordova-ios-plugins/sources/MoodlehqCordovaPluginCamera"),
        .package(name: "MoodlehqCordovaPluginChooser", path: "../../capacitor-cordova-ios-plugins/sources/MoodlehqCordovaPluginChooser"),
        .package(name: "MoodlehqCordovaPluginFileOpener", path: "../../capacitor-cordova-ios-plugins/sources/MoodlehqCordovaPluginFileOpener"),
        .package(name: "MoodlehqCordovaPluginFileTransfer", path: "../../capacitor-cordova-ios-plugins/sources/MoodlehqCordovaPluginFileTransfer"),
        .package(name: "MoodlehqCordovaPluginInappbrowser", path: "../../capacitor-cordova-ios-plugins/sources/MoodlehqCordovaPluginInappbrowser"),
        .package(name: "MoodlehqCordovaPluginIonicKeyboard", path: "../../capacitor-cordova-ios-plugins/sources/MoodlehqCordovaPluginIonicKeyboard"),
        .package(name: "MoodlehqCordovaPluginMediaCapture", path: "../../capacitor-cordova-ios-plugins/sources/MoodlehqCordovaPluginMediaCapture"),
        .package(name: "MoodlehqCordovaPluginQrscanner", path: "../../capacitor-cordova-ios-plugins/sources/MoodlehqCordovaPluginQrscanner"),
        .package(name: "MoodlehqCordovaPluginZip", path: "../../capacitor-cordova-ios-plugins/sources/MoodlehqCordovaPluginZip"),
        .package(name: "CordovaPluginBadge", path: "../../capacitor-cordova-ios-plugins/sources/CordovaPluginBadge"),
        .package(name: "CordovaPluginFile", path: "../../capacitor-cordova-ios-plugins/sources/CordovaPluginFile"),
        .package(name: "CordovaPluginLocalNotification", path: "../../capacitor-cordova-ios-plugins/sources/CordovaPluginLocalNotification"),
        .package(name: "CordovaPluginNetworkInformation", path: "../../capacitor-cordova-ios-plugins/sources/CordovaPluginNetworkInformation"),
        .package(name: "CordovaPluginScreenOrientation", path: "../../capacitor-cordova-ios-plugins/sources/CordovaPluginScreenOrientation"),
        .package(name: "CordovaPluginWkuserscript", path: "../../capacitor-cordova-ios-plugins/sources/CordovaPluginWkuserscript"),
        .package(name: "CordovaPluginWkwebviewCookies", path: "../../capacitor-cordova-ios-plugins/sources/CordovaPluginWkwebviewCookies"),
        .package(name: "CordovaSqliteStorage", path: "../../capacitor-cordova-ios-plugins/sources/CordovaSqliteStorage"),
        .package(name: "TotalpaveCordovaPluginInsets", path: "../../capacitor-cordova-ios-plugins/sources/TotalpaveCordovaPluginInsets"),
        .package(name: "CordovaPluginMoodleapp", path: "../../capacitor-cordova-ios-plugins/sources/CordovaPluginMoodleapp")
    ],
    targets: [
        .target(
            name: "CapApp-SPM",
            dependencies: [
                .product(name: "Capacitor", package: "capacitor-swift-pm"),
                .product(name: "Cordova", package: "capacitor-swift-pm"),
                .product(name: "CapacitorClipboard", package: "CapacitorClipboard"),
                .product(name: "CapacitorDevice", package: "CapacitorDevice"),
                .product(name: "CapacitorSplashScreen", package: "CapacitorSplashScreen"),
                .product(name: "MoodlehqCordovaPluginCamera", package: "MoodlehqCordovaPluginCamera"),
                .product(name: "MoodlehqCordovaPluginChooser", package: "MoodlehqCordovaPluginChooser"),
                .product(name: "MoodlehqCordovaPluginFileOpener", package: "MoodlehqCordovaPluginFileOpener"),
                .product(name: "MoodlehqCordovaPluginFileTransfer", package: "MoodlehqCordovaPluginFileTransfer"),
                .product(name: "MoodlehqCordovaPluginInappbrowser", package: "MoodlehqCordovaPluginInappbrowser"),
                .product(name: "MoodlehqCordovaPluginIonicKeyboard", package: "MoodlehqCordovaPluginIonicKeyboard"),
                .product(name: "MoodlehqCordovaPluginMediaCapture", package: "MoodlehqCordovaPluginMediaCapture"),
                .product(name: "MoodlehqCordovaPluginQrscanner", package: "MoodlehqCordovaPluginQrscanner"),
                .product(name: "MoodlehqCordovaPluginZip", package: "MoodlehqCordovaPluginZip"),
                .product(name: "CordovaPluginBadge", package: "CordovaPluginBadge"),
                .product(name: "CordovaPluginFile", package: "CordovaPluginFile"),
                .product(name: "CordovaPluginLocalNotification", package: "CordovaPluginLocalNotification"),
                .product(name: "CordovaPluginNetworkInformation", package: "CordovaPluginNetworkInformation"),
                .product(name: "CordovaPluginScreenOrientation", package: "CordovaPluginScreenOrientation"),
                .product(name: "CordovaPluginWkuserscript", package: "CordovaPluginWkuserscript"),
                .product(name: "CordovaPluginWkwebviewCookies", package: "CordovaPluginWkwebviewCookies"),
                .product(name: "CordovaSqliteStorage", package: "CordovaSqliteStorage"),
                .product(name: "TotalpaveCordovaPluginInsets", package: "TotalpaveCordovaPluginInsets"),
                .product(name: "CordovaPluginMoodleapp", package: "CordovaPluginMoodleapp")
            ]
        )
    ]
)
