// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "CapacitorPluginMoodleApp",
    platforms: [.iOS(.v15)],
    products: [
        .library(
            name: "CapacitorPluginMoodleapp",
            targets: ["NativeSettingsPlugin"])
    ],
    dependencies: [
        .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", from: "8.0.0")
    ],
    targets: [
        .target(
            name: "NativeSettingsPlugin",
            dependencies: [
                .product(name: "Capacitor", package: "capacitor-swift-pm")
            ],
            path: "ios/Sources/NativeSettingsPlugin")
    ]
)
