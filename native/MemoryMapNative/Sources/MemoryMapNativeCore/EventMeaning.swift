import Foundation

public enum LocationEvidenceType: String, Codable, Equatable, Sendable {
    case gpsExif = "gps_exif"
    case gpsTrace = "gps_trace"
    case manualPlace = "manual_place"
    case noteExplicitPlace = "note_explicit_place"
    case noteTimeContext = "note_time_context"
    case noteAddressText = "note_address_text"
}

public enum LocationReviewState: String, Codable, Equatable, Sendable {
    case confirmed
    case suggested
    case needsReview = "needs_review"
    case rejected
}

public struct GpsLocationEvidence: Codable, Equatable, Sendable {
    public let evidenceType: LocationEvidenceType
    public let latitude: Double
    public let longitude: Double
    public let confidence: Double
    public let reviewState: LocationReviewState

    public init(evidenceType: LocationEvidenceType, latitude: Double, longitude: Double, confidence: Double, reviewState: LocationReviewState) {
        self.evidenceType = evidenceType
        self.latitude = latitude
        self.longitude = longitude
        self.confidence = confidence
        self.reviewState = reviewState
    }
}

public struct NoteLocationContext: Codable, Equatable, Sendable {
    public let evidenceType: LocationEvidenceType
    public let city: String?
    public let placeName: String?
    public let confidence: Double
    public let reviewState: LocationReviewState

    public init(evidenceType: LocationEvidenceType, city: String?, placeName: String?, confidence: Double, reviewState: LocationReviewState) {
        self.evidenceType = evidenceType
        self.city = city
        self.placeName = placeName
        self.confidence = confidence
        self.reviewState = reviewState
    }
}

public struct AddressEvidence: Codable, Equatable, Sendable {
    public let provider: String
    public let formattedAddress: String
    public let city: String?

    public init(provider: String, formattedAddress: String, city: String?) {
        self.provider = provider
        self.formattedAddress = formattedAddress
        self.city = city
    }
}

public struct EventMeaningInput: Equatable, Sendable {
    public let mediaID: String?
    public let capturedAt: String
    public let gpsEvidence: GpsLocationEvidence?
    public let noteLocationContext: NoteLocationContext?
    public let addressEvidence: AddressEvidence?
    public let visualHints: [String]
    public let userNote: String?

    public init(
        mediaID: String? = nil,
        capturedAt: String,
        gpsEvidence: GpsLocationEvidence? = nil,
        noteLocationContext: NoteLocationContext? = nil,
        addressEvidence: AddressEvidence? = nil,
        visualHints: [String] = [],
        userNote: String? = nil
    ) {
        self.mediaID = mediaID
        self.capturedAt = capturedAt
        self.gpsEvidence = gpsEvidence
        self.noteLocationContext = noteLocationContext
        self.addressEvidence = addressEvidence
        self.visualHints = visualHints
        self.userNote = userNote
    }
}

public struct EventMeaningConfidence: Codable, Equatable, Sendable {
    public let location: Double
    public let address: Double
    public let visual: Double
    public let note: Double
    public let overall: Double
}

public struct EventMeaning: Identifiable, Codable, Equatable, Sendable {
    public let id: String
    public let mediaID: String?
    public let title: String
    public let activity: String
    public let topics: [String]
    public let placeMeaning: String
    public let summary: String
    public let confidence: EventMeaningConfidence
    public let requiresReview: Bool

    public static func create(input: EventMeaningInput) -> EventMeaning {
        let note = input.userNote ?? ""
        let haystack = ([note] + input.visualHints).joined(separator: " ")
        let topics = inferTopics(haystack)
        let activity = inferActivity(haystack)
        let placeMeaning = inferPlaceMeaning(activity: activity, topics: topics)
        let title = inferTitle(input: input, activity: activity, topics: topics)
        let visualConfidence = input.visualHints.isEmpty ? 0 : 0.72
        let noteConfidence = note.isEmpty ? 0 : 0.95
        let addressConfidence = input.addressEvidence == nil ? 0 : 0.86
        let locConfidence = locationConfidence(input)
        let signals = [locConfidence, addressConfidence, visualConfidence, noteConfidence].filter { $0 > 0 }
        let overall = signals.isEmpty ? 0 : clamp(signals.reduce(0, +) / Double(signals.count))

        return EventMeaning(
            id: "meaning-\(input.mediaID ?? String(input.capturedAt.filter(\.isNumber).prefix(14)))",
            mediaID: input.mediaID,
            title: title,
            activity: activity,
            topics: topics,
            placeMeaning: placeMeaning,
            summary: "\(title) · \(topics.joined(separator: " / "))",
            confidence: EventMeaningConfidence(
                location: rounded(locConfidence),
                address: rounded(addressConfidence),
                visual: rounded(visualConfidence),
                note: rounded(noteConfidence),
                overall: rounded(overall)
            ),
            requiresReview: reviewRequired(input)
        )
    }

    private static func hasAny(_ text: String, _ terms: [String]) -> Bool {
        terms.contains { text.localizedCaseInsensitiveContains($0) }
    }

    private static func inferTopics(_ text: String) -> [String] {
        var topics: [String] = []
        if hasAny(text, ["机器人", "robot", "robotics"]) { topics.append("robotics") }
        if hasAny(text, ["AI", "人工智能", "smart", "智能", "hardware", "硬件"]) { topics.append("AI hardware") }
        if hasAny(text, ["展会", "展览", "exhibition", "display"]) { topics.append("design research") }
        return topics.isEmpty ? ["memory"] : Array(Set(topics)).sorted()
    }

    private static func inferActivity(_ text: String) -> String {
        if hasAny(text, ["展会", "展览", "exhibition", "display"]) { return "exhibition_visit" }
        if hasAny(text, ["整理", "notes", "desk"]) { return "reflection" }
        return "memory_capture"
    }

    private static func inferPlaceMeaning(activity: String, topics: [String]) -> String {
        if activity == "exhibition_visit", topics.contains(where: { $0 == "robotics" || $0 == "AI hardware" }) {
            return "technology_exhibition"
        }
        if activity == "reflection" { return "reflection_space" }
        return "memory_place"
    }

    private static func inferTitle(input: EventMeaningInput, activity: String, topics: [String]) -> String {
        let note = input.userNote ?? ""
        if note.contains("杭州"), note.contains("刘小龙"), note.contains("机器人") {
            return "杭州刘小龙展会看机器人"
        }
        if activity == "exhibition_visit", topics.contains("robotics") {
            let city = input.addressEvidence?.city ?? input.noteLocationContext?.city ?? ""
            return "\(city)机器人展会".trimmingCharacters(in: .whitespacesAndNewlines)
        }
        return String((note.isEmpty ? "未命名记忆事件" : note).prefix(24))
    }

    private static func locationConfidence(_ input: EventMeaningInput) -> Double {
        if let gps = input.gpsEvidence { return clamp(gps.confidence) }
        if let note = input.noteLocationContext { return clamp(note.confidence) }
        return 0.2
    }

    private static func reviewRequired(_ input: EventMeaningInput) -> Bool {
        let state = input.gpsEvidence?.reviewState ?? input.noteLocationContext?.reviewState ?? .needsReview
        return state != .confirmed
    }

    private static func clamp(_ value: Double) -> Double {
        min(1, max(0, value))
    }

    private static func rounded(_ value: Double) -> Double {
        (clamp(value) * 100).rounded() / 100
    }
}
