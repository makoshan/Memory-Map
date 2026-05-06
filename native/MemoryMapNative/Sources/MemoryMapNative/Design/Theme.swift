import SwiftUI

enum Theme {
    static let background = Color(hex: 0xF7F8FB)
    static let card = Color.white
    static let soft = Color(hex: 0xF4F7FB)
    static let cream = Color(hex: 0xFFFDF8)
    static let primary = Color(hex: 0x1D6FD1)
    static let primaryLight = Color(hex: 0xEAF4FF)
    static let ocean = Color(hex: 0x35B8FF)
    static let sky = Color(hex: 0xBFE9FF)
    static let grass = Color(hex: 0x7EDB8A)
    static let subText = Color(hex: 0x475569)
    static let muted = Color(hex: 0x94A3B8)
    static let border = Color(hex: 0xE2E8F0)
    static let success = Color(hex: 0x22C55E)
    static let warning = Color(hex: 0xF59E0B)
    static let danger = Color(hex: 0xEF4444)
}

extension Color {
    init(hex: UInt, opacity: Double = 1) {
        self.init(
            .sRGB,
            red: Double((hex >> 16) & 0xff) / 255,
            green: Double((hex >> 8) & 0xff) / 255,
            blue: Double(hex & 0xff) / 255,
            opacity: opacity
        )
    }
}
