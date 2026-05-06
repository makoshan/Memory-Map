import Foundation

public struct WorldSyncThresholds: Equatable, Sendable {
    public let eventCount: Int
    public let visitCount: Int
    public let locationConfidence: Double
    public let hermesSuccessCount: Int

    public init(eventCount: Int = 10, visitCount: Int = 2, locationConfidence: Double = 0.8, hermesSuccessCount: Int = 2) {
        self.eventCount = eventCount
        self.visitCount = visitCount
        self.locationConfidence = locationConfidence
        self.hermesSuccessCount = hermesSuccessCount
    }
}

public struct WorldSyncEvidence: Codable, Equatable, Sendable {
    public let placeKey: String
    public let placeName: String?
    public let capturedAt: String
    public let locationConfidence: Double
    public let hermesSucceeded: Bool

    public init(placeKey: String, placeName: String?, capturedAt: String, locationConfidence: Double, hermesSucceeded: Bool) {
        self.placeKey = placeKey
        self.placeName = placeName
        self.capturedAt = capturedAt
        self.locationConfidence = locationConfidence
        self.hermesSucceeded = hermesSucceeded
    }
}

public struct WorldSyncSummary: Equatable, Sendable {
    public let eventMeaningGenerated: Bool
    public let samePlaceEventCount: Int
    public let distinctVisitCount: Int
    public let locationConfidence: Double
    public let hermesSuccessCount: Int
    public let worldExported: Bool
}

public struct WorldSyncStatus: Equatable, Sendable {
    public let eventMeaning: String
    public let placeProfile: String
    public let layer3: String
    public let godotWorldState: String
    public let readyForPlaceProfile: Bool
}

public enum WorldSyncPipeline {
    public static func createGpsEvidence(longitude: Double, latitude: Double, capturedAt: String, hermesSucceeded: Bool) -> WorldSyncEvidence {
        let lon = String(format: "%.4f", longitude)
        let lat = String(format: "%.4f", latitude)
        return WorldSyncEvidence(
            placeKey: "gps:\(lon),\(lat)",
            placeName: "GPS \(lon), \(lat)",
            capturedAt: capturedAt,
            locationConfidence: 1,
            hermesSucceeded: hermesSucceeded
        )
    }

    public static func summarize(stored: [WorldSyncEvidence], current: WorldSyncEvidence? = nil, worldExported: Bool = false) -> WorldSyncSummary {
        let targetPlaceKey = current?.placeKey ?? stored.first?.placeKey
        guard let targetPlaceKey else {
            return WorldSyncSummary(
                eventMeaningGenerated: false,
                samePlaceEventCount: 0,
                distinctVisitCount: 0,
                locationConfidence: 0,
                hermesSuccessCount: 0,
                worldExported: worldExported
            )
        }

        var seen: Set<String> = []
        let records = (stored + [current].compactMap { $0 })
            .filter { $0.placeKey == targetPlaceKey }
            .filter { record in
                let key = "\(record.placeKey)|\(record.capturedAt)"
                if seen.contains(key) { return false }
                seen.insert(key)
                return true
            }

        return WorldSyncSummary(
            eventMeaningGenerated: !records.isEmpty,
            samePlaceEventCount: records.count,
            distinctVisitCount: Set(records.map(visitBucket)).count,
            locationConfidence: records.map(\.locationConfidence).max() ?? 0,
            hermesSuccessCount: records.filter(\.hermesSucceeded).count,
            worldExported: worldExported
        )
    }

    public static func evaluate(_ summary: WorldSyncSummary, thresholds: WorldSyncThresholds = WorldSyncThresholds()) -> WorldSyncStatus {
        guard summary.eventMeaningGenerated else {
            return WorldSyncStatus(
                eventMeaning: "未同步",
                placeProfile: "未同步",
                layer3: "未同步",
                godotWorldState: "未导出",
                readyForPlaceProfile: false
            )
        }

        let evidenceCount = max(1, summary.samePlaceEventCount)
        let enoughEvents = evidenceCount >= thresholds.eventCount
        let enoughVisits = summary.distinctVisitCount >= thresholds.visitCount
        let confidentLocation = summary.locationConfidence >= thresholds.locationConfidence
        let enoughHermes = summary.hermesSuccessCount >= thresholds.hermesSuccessCount
        let ready = enoughEvents && enoughVisits && confidentLocation && enoughHermes

        let placeProfile: String
        if !enoughEvents {
            placeProfile = "证据不足，同地点还需 \(remaining(thresholds.eventCount, evidenceCount)) 张"
        } else if !enoughVisits {
            placeProfile = "证据不足，还需 \(remaining(thresholds.visitCount, summary.distinctVisitCount)) 次不同时间访问"
        } else if !confidentLocation {
            placeProfile = "证据不足，地址/GPS 置信度需达到 0.8"
        } else if !enoughHermes {
            placeProfile = "证据不足，Hermes 成功还需 \(remaining(thresholds.hermesSuccessCount, summary.hermesSuccessCount)) 条"
        } else {
            placeProfile = "地点画像稳定，等待生成世界区域"
        }

        return WorldSyncStatus(
            eventMeaning: ready
                ? "已生成 \(evidenceCount) / \(thresholds.eventCount)，可聚合为地点画像"
                : "已生成 \(evidenceCount) / \(thresholds.eventCount)，等待更多图片",
            placeProfile: placeProfile,
            layer3: ready ? "地点画像稳定，准备生成世界建筑/区域" : "等待地点画像稳定",
            godotWorldState: summary.worldExported ? "已导出稳定世界状态" : ready ? "等待导出稳定世界状态" : "未导出",
            readyForPlaceProfile: ready
        )
    }

    private static func remaining(_ required: Int, _ current: Int) -> Int {
        max(0, required - current)
    }

    private static func visitBucket(_ evidence: WorldSyncEvidence) -> String {
        guard let date = ISO8601DateFormatter().date(from: evidence.capturedAt) else {
            return evidence.capturedAt
        }
        return String(Int(date.timeIntervalSince1970 / 3_600))
    }
}
