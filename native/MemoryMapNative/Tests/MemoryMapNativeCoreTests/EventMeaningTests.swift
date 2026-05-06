import XCTest
@testable import MemoryMapNativeCore

final class EventMeaningTests: XCTestCase {
    func testCreatesRobotExpoMeaningFromHangzhouNote() {
        let meaning = EventMeaning.create(
            input: EventMeaningInput(
                mediaID: "media-1",
                capturedAt: "2026-05-03T16:13:13Z",
                noteLocationContext: NoteLocationContext(
                    evidenceType: .noteExplicitPlace,
                    city: "杭州",
                    placeName: nil,
                    confidence: 0.6,
                    reviewState: .needsReview
                ),
                visualHints: ["photo", "robotics"],
                userNote: "杭州刘小龙展会看机器人"
            )
        )

        XCTAssertEqual(meaning.title, "杭州刘小龙展会看机器人")
        XCTAssertEqual(meaning.activity, "exhibition_visit")
        XCTAssertTrue(meaning.topics.contains("robotics"))
        XCTAssertTrue(meaning.requiresReview)
    }
}
