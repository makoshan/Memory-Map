import { describe, expect, it } from "vitest";
import { createEventMeaning } from "./eventMeaning";

describe("createEventMeaning", () => {
  it("keeps EXIF GPS as hard evidence while combining address and note meaning", () => {
    const meaning = createEventMeaning({
      mediaId: "media-img-9128",
      capturedAt: "2026-05-03T16:13:13+08:00",
      gpsEvidence: {
        evidenceType: "gps_exif",
        latitude: 30.2777888889,
        longitude: 120.1285694444,
        confidence: 1,
        reviewState: "confirmed"
      },
      addressEvidence: {
        provider: "amap",
        formattedAddress: "浙江省杭州市西湖区翠苑街道黄姑山路39号颐高创业",
        address: {
          province: "浙江省",
          city: "杭州市",
          district: "西湖区",
          township: "翠苑街道"
        },
        pois: [{ name: "颐高广场A座", type: "商务住宅;楼宇;商务写字楼", distanceMeters: 67.64 }],
        roads: [{ name: "黄姑山路", distanceMeters: 22.22, direction: "西" }]
      },
      visualHints: ["robot", "smart hardware", "exhibition display"],
      userNote: "杭州刘小龙展会，拍了很多机器人"
    });

    expect(meaning.title).toBe("杭州刘小龙展会看机器人");
    expect(meaning.activity).toBe("exhibition_visit");
    expect(meaning.topics).toContain("robotics");
    expect(meaning.topics).toContain("AI hardware");
    expect(meaning.placeMeaning).toBe("technology_exhibition");
    expect(meaning.source.location).toBe("gps_exif");
    expect(meaning.source.address).toBe("amap");
    expect(meaning.confidence.location).toBe(1);
    expect(meaning.confidence.overall).toBeGreaterThan(0.8);
  });

  it("marks note-only location context as inferred instead of hard evidence", () => {
    const meaning = createEventMeaning({
      capturedAt: "2026-05-03T20:00:00+08:00",
      noteLocationContext: {
        evidenceType: "note_time_context",
        city: "杭州市",
        confidence: 0.62,
        reviewState: "suggested"
      },
      visualHints: ["desk", "notes"],
      userNote: "晚上整理今天展会看到的机器人"
    });

    expect(meaning.source.location).toBe("note_time_context");
    expect(meaning.confidence.location).toBe(0.62);
    expect(meaning.requiresReview).toBe(true);
  });
});
