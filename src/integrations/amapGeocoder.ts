export type AmapConvertedLocation = {
  provider: "amap";
  coordSystem: "gcj02";
  longitude: number;
  latitude: number;
  rawLocation: string;
};

export type AmapParsedRegeo = {
  provider: "amap";
  formattedAddress: string;
  address: {
    province?: string;
    city?: string;
    district?: string;
    township?: string;
  };
  pois: Array<{
    name: string;
    type?: string;
    distanceMeters?: number;
    direction?: string;
  }>;
  roads: Array<{
    name: string;
    distanceMeters?: number;
    direction?: string;
  }>;
};

export function buildAmapConvertUrl(input: {
  key: string;
  longitude: number;
  latitude: number;
}) {
  const url = new URL("https://restapi.amap.com/v3/assistant/coordinate/convert");
  url.searchParams.set("key", input.key);
  url.searchParams.set("locations", `${input.longitude},${input.latitude}`);
  url.searchParams.set("coordsys", "gps");
  return url;
}

export function parseAmapConvert(response: {
  status?: string;
  info?: string;
  infocode?: string;
  locations?: string;
}): AmapConvertedLocation {
  if (response.status !== "1" || !response.locations) {
    throw new Error(`Amap coordinate conversion failed: ${response.info ?? response.infocode ?? "unknown error"}`);
  }

  const [longitude, latitude] = response.locations.split(",").map((value) => Number(value));
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
    throw new Error(`Amap coordinate conversion returned invalid location: ${response.locations}`);
  }

  return {
    provider: "amap",
    coordSystem: "gcj02",
    longitude,
    latitude,
    rawLocation: response.locations
  };
}

export function buildAmapRegeoUrl(input: {
  key: string;
  amapLocation: string;
  radius?: number;
}) {
  const url = new URL("https://restapi.amap.com/v3/geocode/regeo");
  url.searchParams.set("key", input.key);
  url.searchParams.set("location", input.amapLocation);
  url.searchParams.set("radius", String(input.radius ?? 1000));
  url.searchParams.set("extensions", "all");
  return url;
}

const optionalNumber = (value: unknown) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : undefined;
};

export function parseAmapRegeo(response: {
  status?: string;
  info?: string;
  infocode?: string;
  regeocode?: {
    formatted_address?: string;
    addressComponent?: {
      province?: string;
      city?: string;
      district?: string;
      township?: string;
    };
    pois?: Array<{
      name?: string;
      type?: string;
      distance?: string;
      direction?: string;
    }>;
    roads?: Array<{
      name?: string;
      distance?: string;
      direction?: string;
    }>;
  };
}): AmapParsedRegeo {
  if (response.status !== "1" || !response.regeocode) {
    throw new Error(`Amap reverse geocode failed: ${response.info ?? response.infocode ?? "unknown error"}`);
  }

  const regeocode = response.regeocode;

  return {
    provider: "amap",
    formattedAddress: regeocode.formatted_address ?? "",
    address: {
      province: regeocode.addressComponent?.province,
      city: regeocode.addressComponent?.city,
      district: regeocode.addressComponent?.district,
      township: regeocode.addressComponent?.township
    },
    pois: (regeocode.pois ?? [])
      .filter((poi) => poi.name)
      .map((poi) => ({
        name: poi.name as string,
        type: poi.type,
        distanceMeters: optionalNumber(poi.distance),
        direction: poi.direction
      })),
    roads: (regeocode.roads ?? [])
      .filter((road) => road.name)
      .map((road) => ({
        name: road.name as string,
        distanceMeters: optionalNumber(road.distance),
        direction: road.direction
      }))
  };
}
