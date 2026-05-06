import Foundation

public struct HermesImageMeaningInput: Equatable, Sendable {
    public let fileName: String
    public let capturedAt: String?
    public let gpsEvidence: WorldSyncEvidence?
    public let address: String?
    public let userNote: String?
    public let inlineImageDataURL: String

    public init(fileName: String, capturedAt: String?, gpsEvidence: WorldSyncEvidence?, address: String?, userNote: String?, inlineImageDataURL: String) {
        self.fileName = fileName
        self.capturedAt = capturedAt
        self.gpsEvidence = gpsEvidence
        self.address = address
        self.userNote = userNote
        self.inlineImageDataURL = inlineImageDataURL
    }
}

public struct HermesImageMeaningRequest: Codable, Equatable, Sendable {
    public let model: String
    public let stream: Bool
    public let prompt: String
    public let imageDataURL: String
}

public struct HermesImageMeaning: Codable, Equatable, Sendable {
    public let sceneSummary: String
    public let memoryMeaning: String
    public let topics: [String]
    public let placeRoleHint: String
    public let confidence: Double
}

public enum HermesClient {
    public static func createImageMeaningRequest(input: HermesImageMeaningInput) -> HermesImageMeaningRequest {
        let gpsLine = input.gpsEvidence.map { "WGS84: \($0.placeName ?? $0.placeKey)" } ?? "WGS84: unavailable"
        let addressLine = input.address.map { "Amap address: \($0)" } ?? "Amap address: unavailable"
        let prompt = [
            "File name: \(input.fileName)",
            "Captured at: \(input.capturedAt ?? "unknown")",
            gpsLine,
            addressLine,
            "User note: \(input.userNote ?? "unavailable")",
            "Return strict JSON with keys: sceneSummary, memoryMeaning, topics, placeRoleHint, confidence."
        ].joined(separator: "\n")

        return HermesImageMeaningRequest(
            model: "gpt-4.1-mini",
            stream: false,
            prompt: prompt,
            imageDataURL: input.inlineImageDataURL
        )
    }

    public static func parseImageMeaningResponse(_ data: Data) throws -> HermesImageMeaning {
        let envelope = try JSONDecoder().decode(ResponseEnvelope.self, from: data)
        guard let content = envelope.choices.first?.message.content, !content.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            throw HermesError.emptyResponse
        }
        let jsonText = extractJSONObject(from: content)
        let parsed = try JSONDecoder().decode(PartialMeaning.self, from: Data(jsonText.utf8))
        return HermesImageMeaning(
            sceneSummary: parsed.sceneSummary ?? "图片画面已由 Hermes 处理，但未返回可用场景摘要。",
            memoryMeaning: parsed.memoryMeaning ?? "这张图片可作为一次地点记忆的视觉证据。",
            topics: Array((parsed.topics ?? ["memory", "photo"]).prefix(5)),
            placeRoleHint: parsed.placeRoleHint ?? "unknown",
            confidence: min(1, max(0, parsed.confidence ?? 0.5))
        )
    }

    private static func extractJSONObject(from text: String) -> String {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        if trimmed.hasPrefix("{"), trimmed.hasSuffix("}") { return trimmed }
        if let start = trimmed.firstIndex(of: "{"), let end = trimmed.lastIndex(of: "}"), start < end {
            return String(trimmed[start...end])
        }
        return trimmed
    }
}

public enum HermesError: Error, Equatable {
    case emptyResponse
}

public protocol HermesTransport: Sendable {
    func send(_ request: HermesImageMeaningRequest) async throws -> Data
}

public struct URLSessionHermesTransport: HermesTransport {
    private let endpoint: URL
    private let apiKey: String

    public init(endpoint: URL, apiKey: String) {
        self.endpoint = endpoint
        self.apiKey = apiKey
    }

    public func send(_ request: HermesImageMeaningRequest) async throws -> Data {
        var urlRequest = URLRequest(url: endpoint)
        urlRequest.httpMethod = "POST"
        urlRequest.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
        urlRequest.setValue("application/json", forHTTPHeaderField: "Content-Type")
        urlRequest.httpBody = try JSONEncoder().encode(request)
        let (data, response) = try await URLSession.shared.data(for: urlRequest)
        if let http = response as? HTTPURLResponse, !(200..<300).contains(http.statusCode) {
            throw URLError(.badServerResponse)
        }
        return data
    }
}

private struct ResponseEnvelope: Decodable {
    let choices: [Choice]

    struct Choice: Decodable {
        let message: Message
    }

    struct Message: Decodable {
        let content: String
    }
}

private struct PartialMeaning: Decodable {
    let sceneSummary: String?
    let memoryMeaning: String?
    let topics: [String]?
    let placeRoleHint: String?
    let confidence: Double?
}
