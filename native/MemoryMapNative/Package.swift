// swift-tools-version: 6.0

import PackageDescription

let package = Package(
    name: "MemoryMapNative",
    platforms: [.macOS(.v14)],
    products: [
        .executable(name: "MemoryMapNative", targets: ["MemoryMapNative"]),
        .library(name: "MemoryMapNativeCore", targets: ["MemoryMapNativeCore"])
    ],
    dependencies: [
        .package(path: "../MemoryMapSidecar")
    ],
    targets: [
        .executableTarget(
            name: "MemoryMapNative",
            dependencies: ["MemoryMapNativeCore"]
        ),
        .target(
            name: "MemoryMapNativeCore",
            dependencies: [
                .product(name: "MemoryMapSidecarCore", package: "MemoryMapSidecar")
            ]
        ),
        .testTarget(
            name: "MemoryMapNativeCoreTests",
            dependencies: ["MemoryMapNativeCore"]
        )
    ]
)
