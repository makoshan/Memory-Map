import MemoryMapNativeCore
import XCTest

final class HomeDashboardLayoutTests: XCTestCase {
    func testWorldOSHomeLayoutMatchesDesignSourceOfTruth() {
        let layout = HomeDashboardLayout.designReference

        XCTAssertEqual(layout.sidebarItems.map(\.title), ["首页", "今日", "记忆馆", "财务楼", "身体工坊", "AI 员工"])
        XCTAssertEqual(layout.worldBuildings.map(\.title), ["办公室", "记忆馆", "财务楼", "生活区", "家", "AI 研究所"])
        XCTAssertEqual(layout.worldBuildings.map(\.level), ["Lv.8", "Lv.7", "Lv.6", "Lv.5", "Lv.10", "Lv.7"])
        XCTAssertEqual(layout.lifeStages.map(\.title), ["学生时代", "职场初期", "创业阶段", "自由探索", "未来更多"])
        XCTAssertEqual(layout.primaryStatusMetrics.map(\.title), ["时间", "精力", "心情"])
        XCTAssertEqual(layout.cityTabs, ["杭州", "深圳", "东京", "北极", "上海"])
    }
}
