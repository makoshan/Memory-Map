// swift-tools-version: 6.0

import PackageDescription

let package = Package(
    name: "MemoryMapSidecar",
    platforms: [.macOS(.v14)],
    products: [
        .executable(name: "MemoryMapSidecar", targets: ["MemoryMapSidecar"]),
        .library(name: "MemoryMapSidecarCore", targets: ["MemoryMapSidecarCore"])
    ],
    targets: [
        .executableTarget(
            name: "MemoryMapSidecar",
            dependencies: ["MemoryMapSidecarCore"]
        ),
        .target(
            name: "MemoryMapSidecarCore",
            linkerSettings: [.linkedLibrary("sqlite3")]
        ),
        .testTarget(
            name: "MemoryMapSidecarCoreTests",
            dependencies: ["MemoryMapSidecarCore"]
        )
    ]
)
