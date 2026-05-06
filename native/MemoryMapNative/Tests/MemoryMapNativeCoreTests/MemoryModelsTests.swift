import XCTest
@testable import MemoryMapNativeCore

final class MemoryModelsTests: XCTestCase {
    func testDetectCityMatchesChineseAndAirportHints() {
        XCTAssertEqual(MemoryInference.detectCity(in: "IMG_9128 杭州 expo"), "杭州")
        XCTAssertEqual(MemoryInference.detectCity(in: "DSC_0212_szx.jpg"), "深圳")
        XCTAssertEqual(MemoryInference.detectCity(in: "tokyo_jimbocho"), "东京")
    }

    func testGroupByCitySortsByCount() {
        let rows = MemoryInference.groupByCity(SampleWorld.memories)
        XCTAssertEqual(rows.first?.city, "杭州")
        XCTAssertEqual(rows.first?.count, 2)
        XCTAssertEqual(rows.reduce(0) { $0 + $1.count }, SampleWorld.memories.count)
    }

    func testTypeInferenceKeepsNativeImportRules() {
        XCTAssertEqual(MemoryInference.type(for: URL(fileURLWithPath: "photo.HEIC")), .image)
        XCTAssertEqual(MemoryInference.type(for: URL(fileURLWithPath: "run.m4a")), .audio)
        XCTAssertEqual(MemoryInference.type(for: URL(fileURLWithPath: "note.md")), .note)
    }
}
