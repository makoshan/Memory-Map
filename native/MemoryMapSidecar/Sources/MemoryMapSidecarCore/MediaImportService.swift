import CoreGraphics
import CryptoKit
import Foundation
import ImageIO
import SQLite3
import UniformTypeIdentifiers

public struct NativeMediaImportResult: Codable, Sendable {
    public let items: [NativeMemoryItem]
}

public struct NativeWorldSyncEvidence: Codable, Sendable {
    public let placeKey: String
    public let placeName: String
    public let capturedAt: String
    public let locationConfidence: Double
    public let hermesSucceeded: Bool
}

public struct NativeMemoryItem: Codable, Sendable {
    public let id: String
    public let type: String
    public let title: String
    public let summary: String
    public let city: String?
    public let capturedAt: String
    public let capturedDate: String
    public let thumbnailUrl: String?
    public let topics: [String]
    public let fileName: String
    public let fileSize: Int64
    public let filePath: String
    public let sha256: String
    public let syncEvidence: NativeWorldSyncEvidence?
}

public struct MediaImportService {
    private let databaseURL: URL
    private let mediaRootURL: URL
    private let now: @Sendable () -> Date
    private let fileManager: FileManager

    public init(
        databaseURL: URL,
        mediaRootURL: URL,
        now: @escaping @Sendable () -> Date = Date.init,
        fileManager: FileManager = .default
    ) {
        self.databaseURL = databaseURL
        self.mediaRootURL = mediaRootURL
        self.now = now
        self.fileManager = fileManager
    }

    public func importFiles(paths: [String]) throws -> NativeMediaImportResult {
        try prepareStorage()
        let database = try openDatabase()
        defer { sqlite3_close(database) }
        try ensureSchema(database)

        let items = try paths.map { path in
            try importFile(sourceURL: URL(fileURLWithPath: path), database: database)
        }
        return NativeMediaImportResult(items: items)
    }

    private func prepareStorage() throws {
        try fileManager.createDirectory(
            at: mediaRootURL.appending(path: "originals"),
            withIntermediateDirectories: true
        )
        try fileManager.createDirectory(
            at: mediaRootURL.appending(path: "thumbnails"),
            withIntermediateDirectories: true
        )
        try fileManager.createDirectory(
            at: databaseURL.deletingLastPathComponent(),
            withIntermediateDirectories: true
        )
    }

    private func importFile(sourceURL: URL, database: OpaquePointer?) throws -> NativeMemoryItem {
        let data = try Data(contentsOf: sourceURL)
        let digest = SHA256.hash(data: data).map { String(format: "%02x", $0) }.joined()
        let extensionName = normalizedExtension(for: sourceURL)
        let type = mediaType(for: sourceURL)
        let originalRelativePath = "originals/\(digest).\(extensionName)"
        let originalURL = mediaRootURL.appending(path: originalRelativePath)

        if !fileManager.fileExists(atPath: originalURL.path) {
            try data.write(to: originalURL, options: [.atomic])
        }

        let thumbnailRelativePath = type == "image"
            ? try createThumbnailIfPossible(sourceURL: sourceURL, sha256: digest)
            : nil
        let resourceValues = try sourceURL.resourceValues(forKeys: [.contentModificationDateKey, .fileSizeKey])
        let capturedAtDate = resourceValues.contentModificationDate ?? now()
        let capturedAt = isoDateTime(capturedAtDate)
        let capturedDate = String(capturedAt.prefix(10))
        let fileSize = Int64(resourceValues.fileSize ?? data.count)
        let gpsEvidence = type == "image" ? extractGpsEvidence(from: sourceURL, capturedAt: capturedAt) : nil
        let item = NativeMemoryItem(
            id: "mem-native-\(String(digest.prefix(16)))",
            type: type,
            title: title(for: sourceURL),
            summary: "Imported by Memory Map native sidecar",
            city: nil,
            capturedAt: capturedAt,
            capturedDate: capturedDate,
            thumbnailUrl: thumbnailRelativePath.map { "memory-map://media/\($0)" },
            topics: type == "image" ? ["memory", "photo"] : ["memory", type],
            fileName: sourceURL.lastPathComponent,
            fileSize: fileSize,
            filePath: "memory-map://media/\(originalRelativePath)",
            sha256: digest,
            syncEvidence: gpsEvidence
        )
        try upsert(item: item, database: database)
        return item
    }

    private func normalizedExtension(for url: URL) -> String {
        let ext = url.pathExtension.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        return ext.isEmpty ? "bin" : ext
    }

    private func mediaType(for url: URL) -> String {
        let ext = normalizedExtension(for: url)
        if ["heic", "heif", "jpg", "jpeg", "png", "gif", "webp", "tif", "tiff"].contains(ext) {
            return "image"
        }
        if ["mp3", "wav", "m4a", "aac", "flac"].contains(ext) {
            return "audio"
        }
        return "note"
    }

    private func title(for url: URL) -> String {
        let stem = url.deletingPathExtension().lastPathComponent.replacingOccurrences(of: "_", with: " ")
        return stem.isEmpty ? "Untitled Memory" : stem
    }

    private func createThumbnailIfPossible(sourceURL: URL, sha256: String) throws -> String? {
        guard let source = CGImageSourceCreateWithURL(sourceURL as CFURL, nil) else {
            return nil
        }
        let options: [CFString: Any] = [
            kCGImageSourceCreateThumbnailFromImageAlways: true,
            kCGImageSourceThumbnailMaxPixelSize: 720,
            kCGImageSourceCreateThumbnailWithTransform: true
        ]
        guard let thumbnail = CGImageSourceCreateThumbnailAtIndex(source, 0, options as CFDictionary) else {
            return nil
        }

        let relativePath = "thumbnails/\(sha256).jpg"
        let destinationURL = mediaRootURL.appending(path: relativePath)
        guard let destination = CGImageDestinationCreateWithURL(
            destinationURL as CFURL,
            UTType.jpeg.identifier as CFString,
            1,
            nil
        ) else {
            return nil
        }
        CGImageDestinationAddImage(destination, thumbnail, [kCGImageDestinationLossyCompressionQuality: 0.72] as CFDictionary)
        return CGImageDestinationFinalize(destination) ? relativePath : nil
    }

    private func extractGpsEvidence(from sourceURL: URL, capturedAt: String) -> NativeWorldSyncEvidence? {
        guard
            let source = CGImageSourceCreateWithURL(sourceURL as CFURL, nil),
            let properties = CGImageSourceCopyPropertiesAtIndex(source, 0, nil) as? [CFString: Any],
            let gps = properties[kCGImagePropertyGPSDictionary] as? [CFString: Any],
            let latitudeRaw = gps[kCGImagePropertyGPSLatitude] as? Double,
            let longitudeRaw = gps[kCGImagePropertyGPSLongitude] as? Double
        else {
            return nil
        }

        let latitudeRef = (gps[kCGImagePropertyGPSLatitudeRef] as? String) ?? "N"
        let longitudeRef = (gps[kCGImagePropertyGPSLongitudeRef] as? String) ?? "E"
        let latitude = latitudeRef.uppercased() == "S" ? -latitudeRaw : latitudeRaw
        let longitude = longitudeRef.uppercased() == "W" ? -longitudeRaw : longitudeRaw
        let longitudeKey = String(format: "%.4f", longitude)
        let latitudeKey = String(format: "%.4f", latitude)

        return NativeWorldSyncEvidence(
            placeKey: "gps:\(longitudeKey),\(latitudeKey)",
            placeName: "GPS \(longitudeKey), \(latitudeKey)",
            capturedAt: capturedAt,
            locationConfidence: 1,
            hermesSucceeded: false
        )
    }

    private func openDatabase() throws -> OpaquePointer? {
        var database: OpaquePointer?
        guard sqlite3_open(databaseURL.path, &database) == SQLITE_OK else {
            throw MediaImportError.sqlite("Unable to open SQLite database")
        }
        return database
    }

    private func ensureSchema(_ database: OpaquePointer?) throws {
        let sql = """
        CREATE TABLE IF NOT EXISTS native_media_imports (
          id TEXT PRIMARY KEY,
          type TEXT NOT NULL,
          title TEXT NOT NULL,
          summary TEXT NOT NULL,
          captured_at TEXT NOT NULL,
          captured_date TEXT NOT NULL,
          thumbnail_url TEXT,
          topics_json TEXT NOT NULL,
          file_name TEXT NOT NULL,
          file_size INTEGER NOT NULL,
          file_path TEXT NOT NULL,
          sha256 TEXT NOT NULL UNIQUE,
          sync_evidence_json TEXT,
          imported_at TEXT NOT NULL
        );
        """
        guard sqlite3_exec(database, sql, nil, nil, nil) == SQLITE_OK else {
            throw MediaImportError.sqlite(lastSQLiteError(database))
        }
    }

    private func upsert(item: NativeMemoryItem, database: OpaquePointer?) throws {
        let sql = """
        INSERT INTO native_media_imports (
          id, type, title, summary, captured_at, captured_date, thumbnail_url,
          topics_json, file_name, file_size, file_path, sha256, sync_evidence_json, imported_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(sha256) DO UPDATE SET
          title = excluded.title,
          summary = excluded.summary,
          thumbnail_url = excluded.thumbnail_url,
          sync_evidence_json = excluded.sync_evidence_json;
        """
        var statement: OpaquePointer?
        guard sqlite3_prepare_v2(database, sql, -1, &statement, nil) == SQLITE_OK else {
            throw MediaImportError.sqlite(lastSQLiteError(database))
        }
        defer { sqlite3_finalize(statement) }

        try bindText(statement, 1, item.id)
        try bindText(statement, 2, item.type)
        try bindText(statement, 3, item.title)
        try bindText(statement, 4, item.summary)
        try bindText(statement, 5, item.capturedAt)
        try bindText(statement, 6, item.capturedDate)
        try bindOptionalText(statement, 7, item.thumbnailUrl)
        try bindText(statement, 8, encodeJson(item.topics))
        try bindText(statement, 9, item.fileName)
        sqlite3_bind_int64(statement, 10, item.fileSize)
        try bindText(statement, 11, item.filePath)
        try bindText(statement, 12, item.sha256)
        try bindOptionalText(statement, 13, item.syncEvidence.map(encodeJson))
        try bindText(statement, 14, isoDateTime(now()))

        guard sqlite3_step(statement) == SQLITE_DONE else {
            throw MediaImportError.sqlite(lastSQLiteError(database))
        }
    }
}

private func bindText(_ statement: OpaquePointer?, _ index: Int32, _ value: String) throws {
    guard sqlite3_bind_text(statement, index, value, -1, SQLITE_TRANSIENT) == SQLITE_OK else {
        throw MediaImportError.sqlite("Could not bind SQLite text value")
    }
}

private func bindOptionalText(_ statement: OpaquePointer?, _ index: Int32, _ value: String?) throws {
    guard let value else {
        sqlite3_bind_null(statement, index)
        return
    }
    try bindText(statement, index, value)
}

private func encodeJson<T: Encodable>(_ value: T) throws -> String {
    let data = try JSONEncoder().encode(value)
    guard let json = String(data: data, encoding: .utf8) else {
        throw MediaImportError.encoding("Could not encode JSON as UTF-8")
    }
    return json
}

private func isoDateTime(_ date: Date) -> String {
    ISO8601DateFormatter().string(from: date)
}

private func lastSQLiteError(_ database: OpaquePointer?) -> String {
    guard let message = sqlite3_errmsg(database) else {
        return "Unknown SQLite error"
    }
    return String(cString: message)
}

private let SQLITE_TRANSIENT = unsafeBitCast(-1, to: sqlite3_destructor_type.self)

public enum MediaImportError: Error, CustomStringConvertible {
    case sqlite(String)
    case encoding(String)
    case usage(String)

    public var description: String {
        switch self {
        case .sqlite(let message), .encoding(let message), .usage(let message):
            return message
        }
    }
}
