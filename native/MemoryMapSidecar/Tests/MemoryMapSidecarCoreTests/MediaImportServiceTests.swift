import Foundation
import SQLite3
import Testing
@testable import MemoryMapSidecarCore

@Suite("Media import service")
struct MediaImportServiceTests {
    @Test("imports a local PNG into managed storage, computes sha256, writes SQLite, and returns a memory item")
    func importsPngIntoManagedStorage() throws {
        let root = try temporaryDirectory()
        let source = root.appending(path: "IMG_0001.png")
        try minimalPngBytes().write(to: source)

        let database = root.appending(path: "memory-map.sqlite")
        let mediaRoot = root.appending(path: "media")
        let result = try MediaImportService(
            databaseURL: database,
            mediaRootURL: mediaRoot,
            now: { Date(timeIntervalSince1970: 1_778_016_000) }
        ).importFiles(paths: [source.path])

        #expect(result.items.count == 1)
        let item = try #require(result.items.first)
        #expect(item.type == "image")
        #expect(item.fileName == "IMG_0001.png")
        #expect(item.sha256.count == 64)
        #expect(item.filePath.hasPrefix("memory-map://media/originals/"))
        #expect(FileManager.default.fileExists(atPath: mediaRoot.appending(path: "originals").path))
        #expect(try sqliteRowCount(databaseURL: database, table: "native_media_imports") == 1)
    }
}

private func temporaryDirectory() throws -> URL {
    let url = FileManager.default.temporaryDirectory
        .appending(path: "memory-map-sidecar-tests")
        .appending(path: UUID().uuidString)
    try FileManager.default.createDirectory(at: url, withIntermediateDirectories: true)
    return url
}

private func minimalPngBytes() -> Data {
    Data([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
        0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
        0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41,
        0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
        0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00,
        0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
        0x42, 0x60, 0x82
    ])
}

private func sqliteRowCount(databaseURL: URL, table: String) throws -> Int {
    var database: OpaquePointer?
    guard sqlite3_open(databaseURL.path, &database) == SQLITE_OK else {
        throw TestFailure("Could not open SQLite database")
    }
    defer { sqlite3_close(database) }

    var statement: OpaquePointer?
    guard sqlite3_prepare_v2(database, "SELECT COUNT(*) FROM \(table)", -1, &statement, nil) == SQLITE_OK else {
        throw TestFailure("Could not prepare row count statement")
    }
    defer { sqlite3_finalize(statement) }

    guard sqlite3_step(statement) == SQLITE_ROW else {
        throw TestFailure("Could not read row count")
    }
    return Int(sqlite3_column_int(statement, 0))
}

private struct TestFailure: Error, CustomStringConvertible {
    let description: String

    init(_ description: String) {
        self.description = description
    }
}
