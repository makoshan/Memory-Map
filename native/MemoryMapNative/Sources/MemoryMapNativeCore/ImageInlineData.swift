import Foundation

public let hermesInlineImageMaxBytes = 900_000
public let hermesInlineImageMaxRequestBytes = 700_000

public struct ImageCompressionPlan: Equatable, Sendable {
    public let maxEdge: Int
    public let quality: Double

    public init(maxEdge: Int, quality: Double) {
        self.maxEdge = maxEdge
        self.quality = quality
    }
}

public enum ImageInlineData {
    public static func estimateDataURLBytes(_ dataURL: String) -> Int {
        let base64 = dataURL.split(separator: ",", maxSplits: 1).last.map(String.init) ?? ""
        return (base64.count * 3) / 4
    }

    public static func estimateDataURLRequestBytes(_ dataURL: String) -> Int {
        dataURL.count
    }

    public static func needsHermesImageCompression(
        _ dataURL: String,
        maxBytes: Int = hermesInlineImageMaxBytes,
        maxRequestBytes: Int = hermesInlineImageMaxRequestBytes
    ) -> Bool {
        estimateDataURLBytes(dataURL) > maxBytes || estimateDataURLRequestBytes(dataURL) > maxRequestBytes
    }

    public static func nextCompressionPlan(_ plan: ImageCompressionPlan) -> ImageCompressionPlan? {
        if plan.maxEdge <= 512 && plan.quality <= 0.5 { return nil }
        if plan.maxEdge >= 1280 { return ImageCompressionPlan(maxEdge: 1024, quality: 0.64) }
        if plan.maxEdge >= 1024 { return ImageCompressionPlan(maxEdge: 896, quality: 0.58) }
        if plan.maxEdge >= 896 { return ImageCompressionPlan(maxEdge: 768, quality: 0.54) }
        if plan.maxEdge >= 768 { return ImageCompressionPlan(maxEdge: 640, quality: 0.5) }
        return ImageCompressionPlan(maxEdge: 512, quality: 0.5)
    }

    public static func makeDataURL(data: Data, mimeType: String) throws -> String {
        "data:\(mimeType);base64,\(data.base64EncodedString())"
    }

    public static func makeDataURL(fileURL: URL, mimeType: String? = nil) throws -> String {
        let data = try Data(contentsOf: fileURL)
        return try makeDataURL(data: data, mimeType: mimeType ?? inferredMimeType(for: fileURL))
    }

    private static func inferredMimeType(for url: URL) -> String {
        switch url.pathExtension.lowercased() {
        case "jpg", "jpeg", "heic", "heif":
            return "image/jpeg"
        case "png":
            return "image/png"
        case "gif":
            return "image/gif"
        case "webp":
            return "image/webp"
        default:
            return "application/octet-stream"
        }
    }
}
