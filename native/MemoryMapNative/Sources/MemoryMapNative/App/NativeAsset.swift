import AppKit
import SwiftUI

struct AssetImage: View {
    let relativePath: String

    init(_ relativePath: String) {
        self.relativePath = relativePath
    }

    var body: some View {
        Group {
            if let image = NativeAsset.image(relativePath) {
                Image(nsImage: image)
                    .resizable()
                    .scaledToFit()
            } else {
                ZStack {
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .fill(Theme.soft)
                    Image(systemName: "photo")
                        .foregroundStyle(Theme.muted)
                }
            }
        }
    }
}

enum NativeAsset {
    static func image(_ relativePath: String) -> NSImage? {
        for root in candidateRoots() {
            let url = root.appending(path: relativePath)
            if let image = NSImage(contentsOf: url) {
                return image
            }
        }
        return nil
    }

    private static func candidateRoots() -> [URL] {
        let cwd = URL(fileURLWithPath: FileManager.default.currentDirectoryPath, isDirectory: true)
        let sourceFile = URL(fileURLWithPath: #filePath)
        let repositoryRoot = sourceFile
            .deletingLastPathComponent()
            .deletingLastPathComponent()
            .deletingLastPathComponent()
            .deletingLastPathComponent()
            .deletingLastPathComponent()
            .deletingLastPathComponent()
        return [
            Bundle.main.resourceURL,
            cwd,
            cwd.deletingLastPathComponent().deletingLastPathComponent(),
            repositoryRoot
        ].compactMap(\.self)
    }
}
