import XCTest
@testable import MemoryMapNativeCore

final class AmapGeocoderTests: XCTestCase {
    func testBuildsConvertAndRegeoUrls() throws {
        let convert = try AmapGeocoder.buildConvertURL(key: "k", longitude: 120.1, latitude: 30.2)
        XCTAssertTrue(convert.absoluteString.contains("locations=120.1,30.2"))

        let regeo = try AmapGeocoder.buildRegeoURL(key: "k", amapLocation: "120.2,30.3")
        XCTAssertTrue(regeo.absoluteString.contains("location=120.2,30.3"))
    }

    func testParsesRegeoResponse() throws {
        let data = """
        {"status":"1","regeocode":{"formatted_address":"杭州市西湖区黄姑山路39号","addressComponent":{"city":"杭州市","district":"西湖区"},"pois":[{"name":"黄姑山路","type":"道路","distance":"12"}]}}
        """.data(using: .utf8)!

        let parsed = try AmapGeocoder.parseRegeo(data)

        XCTAssertEqual(parsed.formattedAddress, "杭州市西湖区黄姑山路39号")
        XCTAssertEqual(parsed.address.city, "杭州市")
        XCTAssertEqual(parsed.pois.first?.name, "黄姑山路")
    }
}
