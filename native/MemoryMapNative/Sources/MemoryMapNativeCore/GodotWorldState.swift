import Foundation

public struct GodotWorldStateInput: Equatable, Sendable {
    public let memories: [MemoryItem]
    public let worldSpots: [WorldSpot]
    public let generatedAt: String

    public init(memories: [MemoryItem], worldSpots: [WorldSpot], generatedAt: String) {
        self.memories = memories
        self.worldSpots = worldSpots
        self.generatedAt = generatedAt
    }
}

public struct GodotWorldState: Codable, Equatable, Sendable {
    public let version: String
    public let generatedAt: String
    public let bridge: GodotBridge
    public let nodes: [GodotWorldNode]
    public let ai: GodotAiSummary

    public static func create(input: GodotWorldStateInput) -> GodotWorldState {
        let cityCounts = MemoryInference.groupByCity(input.memories)
        return GodotWorldState(
            version: "native-alpha",
            generatedAt: input.generatedAt,
            bridge: GodotBridge(appShell: "native-swiftui", gameLayer: "godot-4.6"),
            nodes: input.worldSpots.map { spot in
                let count = cityCounts.first?.count ?? input.memories.count
                return GodotWorldNode(
                    id: spot.id,
                    title: spot.title,
                    assetKey: spot.assetPath.replacingOccurrences(of: "public/assets/game/sprites/", with: "").replacingOccurrences(of: ".png", with: ""),
                    role: spot.role,
                    visual: GodotVisual(sizeScale: 1 + min(0.6, Double(count) / 20), brightness: 0.82),
                    position: GodotPosition(x: spot.x, y: spot.y)
                )
            },
            ai: GodotAiSummary(
                conclusion: "原生 SwiftUI 世界已生成",
                suggestion: "继续导入记忆以稳定地点画像",
                risk: "Hermes 在线分析未开启时仅保留离线任务"
            )
        )
    }
}

public struct GodotBridge: Codable, Equatable, Sendable {
    public let appShell: String
    public let gameLayer: String
}

public struct GodotWorldNode: Codable, Equatable, Sendable {
    public let id: String
    public let title: String
    public let assetKey: String
    public let role: String
    public let visual: GodotVisual
    public let position: GodotPosition
}

public struct GodotVisual: Codable, Equatable, Sendable {
    public let sizeScale: Double
    public let brightness: Double
}

public struct GodotPosition: Codable, Equatable, Sendable {
    public let x: Double
    public let y: Double
}

public struct GodotAiSummary: Codable, Equatable, Sendable {
    public let conclusion: String
    public let suggestion: String
    public let risk: String
}
