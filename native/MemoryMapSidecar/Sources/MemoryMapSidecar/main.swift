import Foundation
import MemoryMapSidecarCore

struct ImportArguments {
    let databaseURL: URL
    let mediaRootURL: URL
    let files: [String]
}

func parseImportArguments(_ arguments: [String]) throws -> ImportArguments {
    guard arguments.first == "import-media" else {
        throw MediaImportError.usage("Usage: MemoryMapSidecar import-media --database <path> --media-root <path> --file <path> [--file <path>...]")
    }

    var database: String?
    var mediaRoot: String?
    var files: [String] = []
    var index = 1
    while index < arguments.count {
        let flag = arguments[index]
        guard index + 1 < arguments.count else {
            throw MediaImportError.usage("Missing value for \(flag)")
        }
        let value = arguments[index + 1]
        switch flag {
        case "--database":
            database = value
        case "--media-root":
            mediaRoot = value
        case "--file":
            files.append(value)
        default:
            throw MediaImportError.usage("Unknown argument \(flag)")
        }
        index += 2
    }

    guard let database, let mediaRoot, !files.isEmpty else {
        throw MediaImportError.usage("Missing --database, --media-root, or --file")
    }
    return ImportArguments(
        databaseURL: URL(fileURLWithPath: database),
        mediaRootURL: URL(fileURLWithPath: mediaRoot),
        files: files
    )
}

do {
    let parsed = try parseImportArguments(Array(CommandLine.arguments.dropFirst()))
    let result = try MediaImportService(
        databaseURL: parsed.databaseURL,
        mediaRootURL: parsed.mediaRootURL
    ).importFiles(paths: parsed.files)
    let encoder = JSONEncoder()
    encoder.outputFormatting = [.sortedKeys]
    FileHandle.standardOutput.write(try encoder.encode(result))
    FileHandle.standardOutput.write(Data("\n".utf8))
} catch {
    FileHandle.standardError.write(Data("\(error)\n".utf8))
    exit(1)
}
