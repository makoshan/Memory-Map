import { describe, expect, it } from "vitest";
import {
  buildAmapConvertUrl,
  buildAmapRegeoUrl,
  parseAmapConvert,
  parseAmapRegeo
} from "./amapGeocoder";

describe("amapGeocoder", () => {
  it("builds coordinate conversion URLs for WGS84 EXIF coordinates", () => {
    const url = buildAmapConvertUrl({
      key: "test-key",
      longitude: 120.1285694444,
      latitude: 30.2777888889
    });

    expect(url.origin).toBe("https://restapi.amap.com");
    expect(url.pathname).toBe("/v3/assistant/coordinate/convert");
    expect(url.searchParams.get("coordsys")).toBe("gps");
    expect(url.searchParams.get("locations")).toBe("120.1285694444,30.2777888889");
    expect(url.searchParams.get("key")).toBe("test-key");
  });

  it("parses converted Amap coordinates", () => {
    const converted = parseAmapConvert({
      status: "1",
      info: "ok",
      infocode: "10000",
      locations: "120.133333062066,30.275500488282"
    });

    expect(converted).toEqual({
      provider: "amap",
      coordSystem: "gcj02",
      longitude: 120.133333062066,
      latitude: 30.275500488282,
      rawLocation: "120.133333062066,30.275500488282"
    });
  });

  it("builds reverse geocode URLs for converted Amap coordinates", () => {
    const url = buildAmapRegeoUrl({
      key: "test-key",
      amapLocation: "120.133333062066,30.275500488282"
    });

    expect(url.origin).toBe("https://restapi.amap.com");
    expect(url.pathname).toBe("/v3/geocode/regeo");
    expect(url.searchParams.get("extensions")).toBe("all");
    expect(url.searchParams.get("radius")).toBe("1000");
    expect(url.searchParams.get("location")).toBe("120.133333062066,30.275500488282");
  });

  it("parses formatted address and POI candidates", () => {
    const parsed = parseAmapRegeo({
      status: "1",
      info: "OK",
      infocode: "10000",
      regeocode: {
        formatted_address: "浙江省杭州市西湖区翠苑街道黄姑山路39号颐高创业",
        addressComponent: {
          province: "浙江省",
          city: "杭州市",
          district: "西湖区",
          township: "翠苑街道"
        },
        pois: [
          {
            name: "颐高广场A座",
            type: "商务住宅;楼宇;商务写字楼",
            distance: "67.6436",
            direction: "西"
          }
        ],
        roads: [
          {
            name: "黄姑山路",
            distance: "22.2237",
            direction: "西"
          }
        ]
      }
    });

    expect(parsed.formattedAddress).toContain("颐高创业");
    expect(parsed.address.city).toBe("杭州市");
    expect(parsed.pois[0]).toEqual({
      name: "颐高广场A座",
      type: "商务住宅;楼宇;商务写字楼",
      distanceMeters: 67.6436,
      direction: "西"
    });
    expect(parsed.roads[0].name).toBe("黄姑山路");
  });
});
