import Foundation

enum AppSection: String, CaseIterable, Identifiable {
    case world
    case office
    case memory
    case importLab

    var id: String { rawValue }

    var title: String {
        switch self {
        case .world: "世界地图"
        case .office: "办公室"
        case .memory: "记忆馆"
        case .importLab: "导入工作台"
        }
    }

    var symbol: String {
        switch self {
        case .world: "map"
        case .office: "building.2"
        case .memory: "photo.on.rectangle"
        case .importLab: "square.and.arrow.down"
        }
    }
}
