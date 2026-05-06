import XCTest
@testable import MemoryMapNativeCore

final class ImageInlineDataTests: XCTestCase {
    func testEstimatesDataUrlBytesAndCompressionPlan() throws {
        let dataURL = "data:image/jpeg;base64,\(String(repeating: "a", count: 1_000_000))"

        XCTAssertGreaterThan(ImageInlineData.estimateDataURLBytes(dataURL), 700_000)
        XCTAssertTrue(ImageInlineData.needsHermesImageCompression(dataURL))
        XCTAssertEqual(ImageInlineData.nextCompressionPlan(.init(maxEdge: 1280, quality: 0.72))?.maxEdge, 1024)
        XCTAssertNil(ImageInlineData.nextCompressionPlan(.init(maxEdge: 512, quality: 0.5)))
    }

    func testCreatesDataUrlFromFileData() throws {
        let data = Data([0xff, 0xd8, 0xff])
        let url = try ImageInlineData.makeDataURL(data: data, mimeType: "image/jpeg")

        XCTAssertEqual(url, "data:image/jpeg;base64,/9j/")
    }
}
