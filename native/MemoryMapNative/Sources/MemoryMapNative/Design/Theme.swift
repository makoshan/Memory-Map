import SwiftUI

enum Theme {
    static let background = Color(hex: 0xF7F8FB)
    static let card = Color.white
    static let soft = Color(hex: 0xF4F7FB)
    static let primary = Color(hex: 0x1D6FD1)
    static let subText = Color(hex: 0x475569)
    static let muted = Color(hex: 0x94A3B8)
    static let border = Color(hex: 0xE2E8F0)
    static let success = Color(hex: 0x22C55E)
    static let warning = Color(hex: 0xF59E0B)
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
