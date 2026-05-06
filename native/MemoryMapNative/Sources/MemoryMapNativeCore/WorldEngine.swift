import Foundation

public enum WorldEngine {
    public static func buildPlaceProfile(place: Place, allEvents: [EventRecord]) -> PlaceProfile {
        let events = allEvents.filter { $0.placeId == place.id }
        let visitCount = events.count
        let dwellTimeMinutes = events.reduce(0) { $0 + minutesBetween(start: $1.startTime, end: $1.endTime) }
        let mediaCount = events.reduce(0) { $0 + ($1.mediaCount ?? 0) }
        let steps = events.reduce(0) { $0 + ($1.steps ?? 0) }
        let financeTotal = events.reduce(0) { $0 + abs($1.amount ?? 0) }
        let humidity = place.env?.humidity
        let temp = place.env?.temp
        let aqi = place.env?.aqi

        let memoryWeight = clamp(log1p(Double(mediaCount)) / 3)
        let financeWeight = clamp(log1p(financeTotal) / 8)
        let recovery = clamp(Double(steps) / 12_000 + ((aqi ?? 999) <= 50 ? 0.18 : 0))
        let dampPenalty = humidity.map { $0 > 78 ? clamp(($0 - 78) / 25) : 0 } ?? 0
        let heatLoad = temp.map { $0 > 30 ? clamp(($0 - 30) / 12) : 0 } ?? 0
        let overloadRisk = clamp(Double(visitCount) / 8 + heatLoad * 0.4 + dampPenalty * 0.25)
        let score = log1p(Double(visitCount)) * 0.9
            + log1p(Double(dwellTimeMinutes) / 45) * 0.45
            + memoryWeight
            + financeWeight * 0.55
            + recovery * 0.6
            - dampPenalty * 0.15

        return PlaceProfile(
            placeId: place.id,
            placeName: place.name,
            role: inferRole(place: place, events: events),
            visitCount: visitCount,
            dwellTimeMinutes: dwellTimeMinutes,
            mediaCount: mediaCount,
            steps: steps,
            score: rounded(max(0, score)),
            memoryWeight: rounded(memoryWeight),
            financeWeight: rounded(financeWeight),
            recovery: rounded(recovery),
            dampPenalty: rounded(dampPenalty),
            heatLoad: rounded(heatLoad),
            overloadRisk: rounded(overloadRisk),
            envProfile: EnvProfile(humidityAvg: humidity, tempAvg: temp, aqiAvg: aqi)
        )
    }

    public static func generateWorldNode(profile: PlaceProfile, now: String = ISO8601DateFormatter().string(from: Date())) -> WorldNode {
        let nodeType = room(for: profile.role)
        let unlockLevel = max(1, min(10, Int(ceil(profile.score))))
        let waterLevel = clamp(0.32 + profile.dampPenalty * 0.82)
        let fogDensity = clamp(profile.dampPenalty * 0.5 + profile.overloadRisk * 0.2)

        return WorldNode(
            id: "world-\(profile.placeId)",
            placeId: profile.placeId,
            nodeType: nodeType,
            layer1Source: "PlaceProfile",
            size: rounded(1 + profile.score * 0.22),
            brightness: rounded(clamp(0.58 + profile.recovery * 0.35 - profile.overloadRisk * 0.2)),
            vegetationDensity: rounded(clamp(0.35 + profile.recovery * 0.55)),
            waterLevel: rounded(waterLevel),
            fogDensity: rounded(fogDensity),
            buildingStyle: profile.role == .work ? "modern-office" : profile.role == .finance ? "ledger-tower" : "wetland-pixel",
            unlockedRooms: Array(Set([nodeType] + (profile.mediaCount >= 3 ? ["记忆物件"] : []))).sorted(),
            unlockLevel: unlockLevel,
            unlockReason: "visit_count=\(profile.visitCount); media_count=\(profile.mediaCount); steps=\(profile.steps)",
            lastGeneratedAt: now
        )
    }

    public static func generateUnlocks(profile: PlaceProfile, now: String = ISO8601DateFormatter().string(from: Date())) -> [GameUnlock] {
        var unlocks = [
            GameUnlock(
                id: "unlock-\(profile.placeId)-place-node",
                placeId: profile.placeId,
                unlockType: .node,
                unlockKey: "place-node",
                sourceMetric: "PlaceProfile.created",
                threshold: 1,
                unlockedAt: now,
                visibleInLayer3: true
            )
        ]

        if profile.visitCount >= 2 {
            unlocks.append(GameUnlock(id: "unlock-\(profile.placeId)-building-upgrade", placeId: profile.placeId, unlockType: .building, unlockKey: "building-upgrade", sourceMetric: "visit_count", threshold: 2, unlockedAt: now, visibleInLayer3: true))
        }
        if profile.mediaCount >= 3 {
            unlocks.append(GameUnlock(id: "unlock-\(profile.placeId)-memory-shelf", placeId: profile.placeId, unlockType: .object, unlockKey: "memory-shelf", sourceMetric: "media_count", threshold: 3, unlockedAt: now, visibleInLayer3: true))
        }
        if profile.recovery >= 0.6 {
            unlocks.append(GameUnlock(id: "unlock-\(profile.placeId)-recovery-garden", placeId: profile.placeId, unlockType: .room, unlockKey: "recovery-garden", sourceMetric: "recovery", threshold: 0.6, unlockedAt: now, visibleInLayer3: true))
        }
        if profile.overloadRisk >= 0.7 {
            unlocks.append(GameUnlock(id: "unlock-\(profile.placeId)-rest-task", placeId: profile.placeId, unlockType: .task, unlockKey: "rest-task", sourceMetric: "overload_risk", threshold: 0.7, unlockedAt: now, visibleInLayer3: true))
        }
        return unlocks
    }

    public static func generateOpportunities(profiles: [PlaceProfile], events: [EventRecord]) -> [Opportunity] {
        var opportunities: [Opportunity] = []
        let eventIDsByPlace = Dictionary(grouping: events, by: \.placeId).mapValues { $0.map(\.id) }

        for profile in profiles {
            if profile.recovery >= 0.6 {
                let aqiText = profile.envProfile.aqiAvg.map { String($0) } ?? "unknown"
                opportunities.append(Opportunity(
                    id: "opportunity-\(profile.placeId)-recovery",
                    type: OpportunityType.recovery,
                    title: "\(profile.placeName) 恢复机会",
                    summary: "\(profile.placeName) 最近呈现较好的恢复条件，适合安排低负荷行动。",
                    source: OpportunitySource(placeIds: [profile.placeId], eventIds: nil, profileIds: [profile.placeId]),
                    evidence: ["recovery=\(profile.recovery)", "steps=\(profile.steps)", "aqi=\(aqiText)"],
                    expectedImpact: ExpectedImpact.medium,
                    horizon: OpportunityHorizon.today,
                    urgency: rounded(0.72 + profile.recovery * 0.2),
                    confidence: rounded(min(0.95, 0.55 + profile.recovery * 0.35)),
                    suggestedTask: "在 \(profile.placeName) 安排一次低负荷恢复或散步记录。",
                    layer3Expression: Layer3Expression(nodeId: "world-\(profile.placeId)", unlockKey: "recovery-garden", visualHint: "提高植被密度和亮度"),
                    status: OpportunityStatus.new
                ))
            }

            if profile.mediaCount >= 3 {
                opportunities.append(Opportunity(
                    id: "opportunity-\(profile.placeId)-memory",
                    type: OpportunityType.memory,
                    title: "\(profile.placeName) 记忆整理",
                    summary: "\(profile.placeName) 已积累足够媒体材料，适合整理成记忆节点。",
                    source: OpportunitySource(placeIds: [profile.placeId], eventIds: eventIDsByPlace[profile.placeId], profileIds: [profile.placeId]),
                    evidence: ["media_count=\(profile.mediaCount)", "memory_weight=\(profile.memoryWeight)"],
                    expectedImpact: ExpectedImpact.medium,
                    horizon: OpportunityHorizon.week,
                    urgency: rounded(0.5 + profile.memoryWeight * 0.3),
                    confidence: rounded(min(0.94, 0.52 + profile.memoryWeight * 0.35)),
                    suggestedTask: "整理 \(profile.placeName) 的一张照片、笔记或音频转写。",
                    layer3Expression: Layer3Expression(nodeId: "world-\(profile.placeId)", unlockKey: "memory-shelf", visualHint: "生成记忆书架和时间胶片"),
                    status: OpportunityStatus.new
                ))
            }

            if profile.role == .work || (profile.visitCount >= 2 && profile.score >= 1.5) {
                opportunities.append(Opportunity(
                    id: "opportunity-\(profile.placeId)-work",
                    type: OpportunityType.work,
                    title: "\(profile.placeName) 工作推进",
                    summary: "\(profile.placeName) 与工作行为强相关，可以承接一个明确任务。",
                    source: OpportunitySource(placeIds: [profile.placeId], eventIds: eventIDsByPlace[profile.placeId], profileIds: [profile.placeId]),
                    evidence: ["role=\(profile.role.rawValue)", "visit_count=\(profile.visitCount)", "score=\(profile.score)"],
                    expectedImpact: ExpectedImpact.high,
                    horizon: OpportunityHorizon.today,
                    urgency: rounded(min(0.9, 0.48 + profile.score / 10 + Double(profile.visitCount) / 20)),
                    confidence: rounded(min(0.92, 0.55 + Double(profile.visitCount) / 12)),
                    suggestedTask: "把一个关键任务放到 \(profile.placeName) 的办公室节点推进。",
                    layer3Expression: Layer3Expression(nodeId: "world-\(profile.placeId)", unlockKey: "building-upgrade", visualHint: "升级任务桌和 AI 员工提示"),
                    status: OpportunityStatus.new
                ))
            }

            if profile.financeWeight >= 0.35 {
                opportunities.append(Opportunity(
                    id: "opportunity-\(profile.placeId)-finance",
                    type: OpportunityType.finance,
                    title: "\(profile.placeName) 财务复盘",
                    summary: "\(profile.placeName) 已出现财务权重，适合做一次轻量复盘。",
                    source: OpportunitySource(placeIds: [profile.placeId], eventIds: eventIDsByPlace[profile.placeId], profileIds: [profile.placeId]),
                    evidence: ["finance_weight=\(profile.financeWeight)"],
                    expectedImpact: ExpectedImpact.medium,
                    horizon: OpportunityHorizon.week,
                    urgency: rounded(0.42 + profile.financeWeight * 0.32),
                    confidence: rounded(0.5 + profile.financeWeight * 0.28),
                    suggestedTask: "复盘 \(profile.placeName) 最近一笔收入或支出。",
                    layer3Expression: Layer3Expression(nodeId: "world-\(profile.placeId)", unlockKey: "finance-review", visualHint: "点亮账本墙"),
                    status: OpportunityStatus.new
                ))
            }
        }

        return opportunities.sorted { $0.urgency > $1.urgency }
    }

    public static func buildAgentContext(userID: String, events: [EventRecord], profiles: [PlaceProfile], worldNodes: [WorldNode], mediaAssets: [MediaAsset], opportunities: [Opportunity]) -> AgentContextSnapshot {
        let topProfile = profiles.sorted { $0.score > $1.score }.first
        let topNode = worldNodes.first { $0.placeId == topProfile?.placeId }
        let activeRisks = profiles
            .filter { $0.dampPenalty > 0 || $0.overloadRisk > 0.55 }
            .map { "\($0.placeName): damp=\($0.dampPenalty), overload=\($0.overloadRisk)" }

        return AgentContextSnapshot(
            id: "agent-context-\(userID)",
            userId: userID,
            createdAt: ISO8601DateFormatter().string(from: Date()),
            timeRange: "recent",
            eventSummary: "\(events.count) events across \(profiles.count) semantic places",
            mediaAssetSummary: "\(mediaAssets.count) imported assets ready for semantic analysis",
            placeProfileDiff: topProfile.map { "\($0.placeName) is \($0.role.rawValue) score=\($0.score)" } ?? "No active PlaceProfile",
            activeRisks: activeRisks,
            activeOpportunities: opportunities.prefix(3).map { "\($0.title): \($0.suggestedTask)" },
            todayTasks: opportunities.first.map { [$0.suggestedTask] } ?? ["完成一个关键任务，并记录一条新事件"],
            layer3Changes: topNode.map { "\($0.nodeType) unlocked level \($0.unlockLevel) from \($0.unlockReason)" } ?? "Layer 3 has no visible changes",
            sentToHermes: false
        )
    }

    private static func inferRole(place: Place, events: [EventRecord]) -> PlaceRole {
        let tagCounts = Dictionary(grouping: events.flatMap(\.tags), by: { $0 }).mapValues(\.count)
        if place.poiType == .home { return .home }
        if (tagCounts[.work] ?? 0) >= 2 || place.poiType == .office { return .work }
        if (tagCounts[.finance] ?? 0) >= 2 || place.poiType == .mall { return .finance }
        if (tagCounts[.exercise] ?? 0) > 0 || place.poiType == .park { return .life }
        if events.reduce(0, { $0 + ($1.mediaCount ?? 0) }) >= 6 { return .memory }
        return .unknown
    }

    private static func room(for role: PlaceRole) -> String {
        switch role {
        case .home: "家"
        case .work: "办公室"
        case .memory: "记忆馆"
        case .finance: "财务楼"
        case .life, .recovery: "生活区"
        case .unknown: "未命名节点"
        }
    }

    private static func minutesBetween(start: String, end: String?) -> Int {
        guard let end else { return 30 }
        let formatter = ISO8601DateFormatter()
        guard let startDate = formatter.date(from: start), let endDate = formatter.date(from: end) else { return 30 }
        let minutes = Int(endDate.timeIntervalSince(startDate) / 60)
        return minutes > 0 ? minutes : 30
    }

    private static func clamp(_ value: Double, min lower: Double = 0, max upper: Double = 1) -> Double {
        Swift.min(upper, Swift.max(lower, value))
    }

    private static func rounded(_ value: Double) -> Double {
        (value * 100).rounded() / 100
    }
}
