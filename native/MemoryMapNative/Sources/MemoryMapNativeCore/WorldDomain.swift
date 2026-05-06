import Foundation

public enum PlaceRole: String, Codable, Equatable, Sendable {
    case home
    case work
    case memory
    case finance
    case life
    case recovery
    case unknown
}

public enum EventTag: String, Codable, Equatable, Sendable {
    case work
    case social
    case exercise
    case travel
    case finance
    case life
}

public enum PoiType: String, Codable, Equatable, Sendable {
    case park
    case office
    case mall
    case home
    case school
    case restaurant
    case other
}

public struct PlaceAdmin: Codable, Equatable, Sendable {
    public let city: String?
    public let district: String?

    public init(city: String? = nil, district: String? = nil) {
        self.city = city
        self.district = district
    }
}

public struct PlaceEnvironment: Codable, Equatable, Sendable {
    public let humidity: Double?
    public let temp: Double?
    public let aqi: Double?
    public let noiseEstimate: Double?

    public init(humidity: Double? = nil, temp: Double? = nil, aqi: Double? = nil, noiseEstimate: Double? = nil) {
        self.humidity = humidity
        self.temp = temp
        self.aqi = aqi
        self.noiseEstimate = noiseEstimate
    }
}

public struct Place: Identifiable, Codable, Equatable, Sendable {
    public let id: String
    public let name: String
    public let lat: Double
    public let lng: Double
    public let poiType: PoiType
    public let admin: PlaceAdmin
    public let env: PlaceEnvironment?

    public init(id: String, name: String, lat: Double, lng: Double, poiType: PoiType, admin: PlaceAdmin, env: PlaceEnvironment? = nil) {
        self.id = id
        self.name = name
        self.lat = lat
        self.lng = lng
        self.poiType = poiType
        self.admin = admin
        self.env = env
    }
}

public struct Trace: Codable, Equatable, Sendable {
    public let timestamp: String
    public let lat: Double
    public let lng: Double
    public let speed: Double?
    public let heading: Double?
}

public struct EventRecord: Identifiable, Codable, Equatable, Sendable {
    public let id: String
    public let placeId: String
    public let startTime: String
    public let endTime: String?
    public let tags: [EventTag]
    public let steps: Int?
    public let mediaCount: Int?
    public let amount: Double?
    public let intensity: Double?
    public let valence: Double?

    public init(id: String, placeId: String, startTime: String, endTime: String? = nil, tags: [EventTag], steps: Int? = nil, mediaCount: Int? = nil, amount: Double? = nil, intensity: Double? = nil, valence: Double? = nil) {
        self.id = id
        self.placeId = placeId
        self.startTime = startTime
        self.endTime = endTime
        self.tags = tags
        self.steps = steps
        self.mediaCount = mediaCount
        self.amount = amount
        self.intensity = intensity
        self.valence = valence
    }
}

public enum MediaAssetSource: String, Codable, Equatable, Sendable {
    case fileImport = "file_import"
    case dragDrop = "drag_drop"
    case shareSheet = "share_sheet"
    case camera
    case recorder
    case manual
}

public enum AnalysisStatus: String, Codable, Equatable, Sendable {
    case pending
    case analyzed
    case failed
}

public struct MediaAssetPlaceHint: Codable, Equatable, Sendable {
    public let lat: Double?
    public let lng: Double?
    public let placeId: String?
}

public struct MediaAsset: Identifiable, Codable, Equatable, Sendable {
    public let id: String
    public let type: MemoryItemType
    public let source: MediaAssetSource
    public let filePath: String?
    public let fileName: String?
    public let text: String?
    public let transcript: String?
    public let capturedAt: String?
    public let importedAt: String
    public let placeHint: MediaAssetPlaceHint?
    public let eventId: String?
    public let analysisStatus: AnalysisStatus
}

public struct EnvProfile: Codable, Equatable, Sendable {
    public let humidityAvg: Double?
    public let tempAvg: Double?
    public let aqiAvg: Double?
}

public struct PlaceProfile: Identifiable, Codable, Equatable, Sendable {
    public var id: String { placeId }
    public let placeId: String
    public let placeName: String
    public let role: PlaceRole
    public let visitCount: Int
    public let dwellTimeMinutes: Int
    public let mediaCount: Int
    public let steps: Int
    public let score: Double
    public let memoryWeight: Double
    public let financeWeight: Double
    public let recovery: Double
    public let dampPenalty: Double
    public let heatLoad: Double
    public let overloadRisk: Double
    public let envProfile: EnvProfile
}

public struct WorldNode: Identifiable, Codable, Equatable, Sendable {
    public let id: String
    public let placeId: String
    public let nodeType: String
    public let layer1Source: String
    public let size: Double
    public let brightness: Double
    public let vegetationDensity: Double
    public let waterLevel: Double
    public let fogDensity: Double
    public let buildingStyle: String
    public let unlockedRooms: [String]
    public let unlockLevel: Int
    public let unlockReason: String
    public let lastGeneratedAt: String
}

public enum UnlockType: String, Codable, Equatable, Sendable {
    case node
    case building
    case room
    case object
    case task
    case atmosphere
}

public struct GameUnlock: Identifiable, Codable, Equatable, Sendable {
    public let id: String
    public let placeId: String
    public let unlockType: UnlockType
    public let unlockKey: String
    public let sourceMetric: String
    public let threshold: Double
    public let unlockedAt: String
    public let visibleInLayer3: Bool
}

public enum OpportunityType: String, Codable, Equatable, Sendable {
    case work
    case finance
    case memory
    case life
    case recovery
    case relationship
    case route
    case project
}

public enum ExpectedImpact: String, Codable, Equatable, Sendable {
    case low
    case medium
    case high
}

public enum OpportunityHorizon: String, Codable, Equatable, Sendable {
    case today
    case week
    case month
    case longTerm = "long_term"
}

public enum OpportunityStatus: String, Codable, Equatable, Sendable {
    case new
    case accepted
    case dismissed
    case done
    case expired
}

public struct OpportunitySource: Codable, Equatable, Sendable {
    public let placeIds: [String]
    public let eventIds: [String]?
    public let profileIds: [String]?
}

public struct Layer3Expression: Codable, Equatable, Sendable {
    public let nodeId: String?
    public let unlockKey: String?
    public let visualHint: String?
}

public struct Opportunity: Identifiable, Codable, Equatable, Sendable {
    public let id: String
    public let type: OpportunityType
    public let title: String
    public let summary: String
    public let source: OpportunitySource
    public let evidence: [String]
    public let expectedImpact: ExpectedImpact
    public let horizon: OpportunityHorizon
    public let urgency: Double
    public let confidence: Double
    public let suggestedTask: String
    public let layer3Expression: Layer3Expression?
    public let status: OpportunityStatus
}

public struct AgentContextSnapshot: Identifiable, Codable, Equatable, Sendable {
    public let id: String
    public let userId: String
    public let createdAt: String
    public let timeRange: String
    public let eventSummary: String
    public let mediaAssetSummary: String
    public let placeProfileDiff: String
    public let activeRisks: [String]
    public let activeOpportunities: [String]
    public let todayTasks: [String]
    public let layer3Changes: String
    public let sentToHermes: Bool
}
