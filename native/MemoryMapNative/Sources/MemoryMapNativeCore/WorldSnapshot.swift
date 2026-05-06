import Foundation

public struct AiSuggestion: Codable, Equatable, Sendable {
    public let conclusion: String
    public let suggestion: String
    public let risk: String
}

public struct WorldTimelineEntry: Codable, Equatable, Sendable {
    public let year: String
    public let title: String
    public let note: String

    public init(year: String, title: String, note: String) {
        self.year = year
        self.title = title
        self.note = note
    }
}

public struct WorldSnapshot: Codable, Equatable, Sendable {
    public let events: [EventRecord]
    public let eventMeanings: [EventMeaning]
    public let profiles: [PlaceProfile]
    public let worldNodes: [WorldNode]
    public let unlocks: [GameUnlock]
    public let opportunities: [Opportunity]
    public let agentContext: AgentContextSnapshot
    public let aiSuggestion: AiSuggestion
    public let godotWorldState: GodotWorldState

    public static func create(
        places: [Place],
        events: [EventRecord],
        mediaAssets: [MediaAsset] = [],
        eventMeanings: [EventMeaning] = [],
        userID: String,
        timeline: [WorldTimelineEntry],
        generatedAt: String = ISO8601DateFormatter().string(from: Date())
    ) -> WorldSnapshot {
        let profiles = places.map { WorldEngine.buildPlaceProfile(place: $0, allEvents: events) }
        let worldNodes = profiles.map { WorldEngine.generateWorldNode(profile: $0, now: generatedAt) }
        let unlocks = profiles.flatMap { WorldEngine.generateUnlocks(profile: $0, now: generatedAt) }
        let opportunities = WorldEngine.generateOpportunities(profiles: profiles, events: events)
        let agentContext = WorldEngine.buildAgentContext(
            userID: userID,
            events: events,
            profiles: profiles,
            worldNodes: worldNodes,
            mediaAssets: mediaAssets,
            opportunities: opportunities
        )
        let aiSuggestion = createAiSuggestion(agentContext: agentContext, profiles: profiles)

        return WorldSnapshot(
            events: events,
            eventMeanings: eventMeanings,
            profiles: profiles,
            worldNodes: worldNodes,
            unlocks: unlocks,
            opportunities: opportunities,
            agentContext: agentContext,
            aiSuggestion: aiSuggestion,
            godotWorldState: GodotWorldState.create(
                input: GodotWorldStateInput(
                    memories: SampleWorld.memories,
                    worldSpots: SampleWorld.spots,
                    generatedAt: generatedAt
                )
            )
        )
    }

    private static func createAiSuggestion(agentContext: AgentContextSnapshot, profiles: [PlaceProfile]) -> AiSuggestion {
        let topProfile = profiles.sorted { $0.score > $1.score }.first
        let riskProfile = profiles.sorted { $0.overloadRisk > $1.overloadRisk }.first
        let recoveryProfile = profiles.sorted { $0.recovery > $1.recovery }.first

        guard let topProfile else {
            return AiSuggestion(
                conclusion: "今天还没有足够事件形成地点画像。",
                suggestion: "先记录一条位置、任务或照片事件。",
                risk: "数据不足，暂不判断风险。"
            )
        }

        if let riskProfile, riskProfile.overloadRisk > 0.55 {
            return AiSuggestion(
                conclusion: "\(topProfile.placeName) 现在是主导节点，\(topProfile.role.rawValue) 权重最高，世界等级 Lv.\(Int(ceil(topProfile.score)))。",
                suggestion: "把下一步任务放在 \(riskProfile.placeName) 的低负荷房间，完成后记录一条恢复事件。",
                risk: "\(riskProfile.placeName) 的负荷风险 \(Int((riskProfile.overloadRisk * 100).rounded()))%，注意减少连续移动。"
            )
        }

        return AiSuggestion(
            conclusion: "\(topProfile.placeName) 现在是主导节点，\(topProfile.role.rawValue) 权重最高，世界等级 Lv.\(Int(ceil(topProfile.score)))。",
            suggestion: "优先推进 \(topProfile.placeName) 的一个关键任务，再补充一条事件记录。",
            risk: "\(recoveryProfile?.placeName ?? topProfile.placeName) 恢复状态较好，当前风险较低。"
        )
    }
}
