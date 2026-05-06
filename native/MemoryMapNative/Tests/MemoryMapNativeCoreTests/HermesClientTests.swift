import XCTest
@testable import MemoryMapNativeCore

final class HermesClientTests: XCTestCase {
    func testCreatesImageMeaningPayloadWithAddressAndInlineImage() throws {
        let request = HermesClient.createImageMeaningRequest(
            input: HermesImageMeaningInput(
                fileName: "IMG_9128.HEIC",
                capturedAt: "2026-05-03T16:13:13Z",
                gpsEvidence: WorldSyncEvidence(
                    placeKey: "gps:120.1,30.2",
                    placeName: "GPS 120.1, 30.2",
                    capturedAt: "2026-05-03T16:13:13Z",
                    locationConfidence: 1,
                    hermesSucceeded: false
                ),
                address: "杭州市西湖区黄姑山路39号",
                userNote: "杭州刘小龙展会看机器人",
                inlineImageDataURL: "data:image/jpeg;base64,abc"
            )
        )

        XCTAssertEqual(request.model, "gpt-4.1-mini")
        XCTAssertTrue(request.prompt.contains("IMG_9128.HEIC"))
        XCTAssertTrue(request.prompt.contains("Amap address"))
        XCTAssertEqual(request.imageDataURL, "data:image/jpeg;base64,abc")
    }
}
