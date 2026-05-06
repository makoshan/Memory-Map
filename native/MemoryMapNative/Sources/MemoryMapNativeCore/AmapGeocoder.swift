import Foundation

public struct AmapConvertedLocation: Codable, Equatable, Sendable {
    public let provider: String
    public let coordSystem: String
    public let longitude: Double
    public let latitude: Double
    public let rawLocation: String
}

public struct AmapAddress: Codable, Equatable, Sendable {
    public let province: String?
    public let city: String?
    public let district: String?
    public let township: String?
}

public struct AmapPoi: Codable, Equatable, Sendable {
    public let name: String
    public let type: String?
    public let distanceMeters: Double?
    public let direction: String?
}

public struct AmapRoad: Codable, Equatable, Sendable {
    public let name: String
    public let distanceMeters: Double?
    public let direction: String?
}

public struct AmapParsedRegeo: Codable, Equatable, Sendable {
    public let provider: String
    public let formattedAddress: String
    public let address: AmapAddress
    public let pois: [AmapPoi]
    public let roads: [AmapRoad]
}

public enum AmapGeocoder {
    public static func buildConvertURL(key: String, longitude: Double, latitude: Double) throws -> URL {
        var components = URLComponents(string: "https://restapi.amap.com/v3/assistant/coordinate/convert")!
        components.queryItems = [
            URLQueryItem(name: "key", value: key),
            URLQueryItem(name: "locations", value: "\(longitude),\(latitude)"),
            URLQueryItem(name: "coordsys", value: "gps")
        ]
        guard let url = components.url else { throw AmapError.invalidURL }
        return url
    }

    public static func buildRegeoURL(key: String, amapLocation: String, radius: Int = 1000) throws -> URL {
        var components = URLComponents(string: "https://restapi.amap.com/v3/geocode/regeo")!
        components.queryItems = [
            URLQueryItem(name: "key", value: key),
            URLQueryItem(name: "location", value: amapLocation),
            URLQueryItem(name: "radius", value: "\(radius)"),
            URLQueryItem(name: "extensions", value: "all")
        ]
        guard let url = components.url else { throw AmapError.invalidURL }
        return url
    }

    public static func parseConvert(_ data: Data) throws -> AmapConvertedLocation {
        let response = try JSONDecoder().decode(ConvertResponse.self, from: data)
        guard response.status == "1", let locations = response.locations else {
            throw AmapError.service(response.info ?? response.infocode ?? "unknown error")
        }
        let parts = locations.split(separator: ",").compactMap { Double($0) }
        guard parts.count == 2 else { throw AmapError.service("invalid location: \(locations)") }
        return AmapConvertedLocation(provider: "amap", coordSystem: "gcj02", longitude: parts[0], latitude: parts[1], rawLocation: locations)
    }

    public static func parseRegeo(_ data: Data) throws -> AmapParsedRegeo {
        let response = try JSONDecoder().decode(RegeoResponse.self, from: data)
        guard response.status == "1", let regeocode = response.regeocode else {
            throw AmapError.service(response.info ?? response.infocode ?? "unknown error")
        }
        return AmapParsedRegeo(
            provider: "amap",
            formattedAddress: regeocode.formattedAddress ?? "",
            address: AmapAddress(
                province: regeocode.addressComponent?.province,
                city: regeocode.addressComponent?.city,
                district: regeocode.addressComponent?.district,
                township: regeocode.addressComponent?.township
            ),
            pois: (regeocode.pois ?? []).compactMap { poi in
                guard let name = poi.name else { return nil }
                return AmapPoi(name: name, type: poi.type, distanceMeters: Double(poi.distance ?? ""), direction: poi.direction)
            },
            roads: (regeocode.roads ?? []).compactMap { road in
                guard let name = road.name else { return nil }
                return AmapRoad(name: name, distanceMeters: Double(road.distance ?? ""), direction: road.direction)
            }
        )
    }
}

public enum AmapError: Error, Equatable {
    case invalidURL
    case service(String)
}

private struct ConvertResponse: Decodable {
    let status: String?
    let info: String?
    let infocode: String?
    let locations: String?
}

private struct RegeoResponse: Decodable {
    let status: String?
    let info: String?
    let infocode: String?
    let regeocode: Regeo?
}

private struct Regeo: Decodable {
    let formattedAddress: String?
    let addressComponent: AddressComponent?
    let pois: [Poi]?
    let roads: [Road]?

    enum CodingKeys: String, CodingKey {
        case formattedAddress = "formatted_address"
        case addressComponent
        case pois
        case roads
    }
}

private struct AddressComponent: Decodable {
    let province: String?
    let city: String?
    let district: String?
    let township: String?
}

private struct Poi: Decodable {
    let name: String?
    let type: String?
    let distance: String?
    let direction: String?
}

private struct Road: Decodable {
    let name: String?
    let distance: String?
    let direction: String?
}
