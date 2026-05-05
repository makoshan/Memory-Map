import { createEventMeaning } from "../domain/eventMeaning";
import { createWorldSnapshot } from "../domain/worldSnapshot";
import type { EventRecord, Place, Trace } from "../domain/types";

export const places: Place[] = [
  {
    id: "place-office",
    name: "办公室",
    lat: 30.281,
    lng: 120.12,
    poiType: "office",
    admin: { city: "杭州", district: "余杭区" },
    env: { humidity: 72, temp: 24, aqi: 32 }
  },
  {
    id: "place-memory",
    name: "记忆馆",
    lat: 30.245,
    lng: 120.091,
    poiType: "other",
    admin: { city: "杭州", district: "西湖区" },
    env: { humidity: 78, temp: 23, aqi: 25 }
  },
  {
    id: "place-finance",
    name: "财务楼",
    lat: 30.27,
    lng: 120.17,
    poiType: "mall",
    admin: { city: "杭州", district: "拱墅区" },
    env: { humidity: 70, temp: 25, aqi: 38 }
  },
  {
    id: "place-xixi",
    name: "生活区",
    lat: 30.266,
    lng: 120.064,
    poiType: "park",
    admin: { city: "杭州", district: "西湖区" },
    env: { humidity: 84, temp: 24, aqi: 28 }
  },
  {
    id: "place-home",
    name: "家",
    lat: 30.255,
    lng: 120.105,
    poiType: "home",
    admin: { city: "杭州", district: "西湖区" },
    env: { humidity: 68, temp: 24, aqi: 30 }
  }
];

export const events: EventRecord[] = [
  {
    id: "event-xixi-walk",
    placeId: "place-xixi",
    startTime: "2026-05-03T08:30:00+08:00",
    endTime: "2026-05-03T09:30:00+08:00",
    tags: ["exercise", "life"],
    steps: 8200,
    mediaCount: 3,
    intensity: 0.7,
    valence: 0.8
  },
  {
    id: "event-xixi-work",
    placeId: "place-xixi",
    startTime: "2026-05-04T10:00:00+08:00",
    endTime: "2026-05-04T11:00:00+08:00",
    tags: ["work"],
    steps: 900,
    mediaCount: 2,
    intensity: 0.5,
    valence: 0.2
  },
  {
    id: "event-office-review",
    placeId: "place-office",
    startTime: "2026-05-04T10:00:00+08:00",
    endTime: "2026-05-04T12:00:00+08:00",
    tags: ["work"],
    steps: 400,
    mediaCount: 1,
    intensity: 0.8,
    valence: 0.2
  },
  {
    id: "event-office-sync",
    placeId: "place-office",
    startTime: "2026-05-04T14:00:00+08:00",
    endTime: "2026-05-04T15:00:00+08:00",
    tags: ["work"],
    steps: 300,
    mediaCount: 1,
    intensity: 0.6,
    valence: 0.3
  },
  {
    id: "event-memory-photos",
    placeId: "place-memory",
    startTime: "2026-05-02T19:00:00+08:00",
    endTime: "2026-05-02T20:30:00+08:00",
    tags: ["life", "social"],
    steps: 1200,
    mediaCount: 8,
    intensity: 0.4,
    valence: 0.9
  },
  {
    id: "event-finance-analysis",
    placeId: "place-finance",
    startTime: "2026-05-04T16:00:00+08:00",
    endTime: "2026-05-04T17:00:00+08:00",
    tags: ["finance", "work"],
    steps: 200,
    mediaCount: 0,
    amount: 568.7,
    intensity: 0.5,
    valence: 0.1
  },
  {
    id: "event-home-planning",
    placeId: "place-home",
    startTime: "2026-05-04T20:30:00+08:00",
    endTime: "2026-05-04T21:10:00+08:00",
    tags: ["life", "work"],
    steps: 120,
    mediaCount: 1,
    intensity: 0.3,
    valence: 0.6
  }
];

export const traces: Trace[] = [
  { timestamp: "2026-05-04T08:30:00+08:00", lat: 30.255, lng: 120.105, speed: 1.1, heading: 280 },
  { timestamp: "2026-05-04T09:00:00+08:00", lat: 30.266, lng: 120.064, speed: 1.4, heading: 300 },
  { timestamp: "2026-05-04T10:00:00+08:00", lat: 30.281, lng: 120.12, speed: 4.2, heading: 68 },
  { timestamp: "2026-05-04T16:00:00+08:00", lat: 30.27, lng: 120.17, speed: 3.8, heading: 92 }
];

export const timelineStages = [
  { year: "2018", title: "学生时代", note: "0 - 7,300 天" },
  { year: "2021", title: "职场初期", note: "7,301 - 10,000 天" },
  { year: "2024", title: "创业阶段", note: "10,001 - 12,500 天" },
  { year: "2026", title: "世界生成", note: "Layer 3 解锁中" }
];

export const robotExhibitionMeaning = createEventMeaning({
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
    pois: [
      {
        name: "颐高广场A座",
        type: "商务住宅;楼宇;商务写字楼",
        distanceMeters: 67.64
      },
      {
        name: "颐高创业大厦",
        type: "商务住宅;楼宇;商务写字楼",
        distanceMeters: 64.66
      }
    ],
    roads: [{ name: "黄姑山路", distanceMeters: 22.22, direction: "西" }]
  },
  visualHints: ["robot", "smart hardware", "exhibition display"],
  userNote: "杭州刘小龙展会，拍了很多机器人"
});

export const sampleSnapshot = createWorldSnapshot({
  userId: "alex",
  places,
  events,
  eventMeanings: [robotExhibitionMeaning],
  timeline: timelineStages,
  generatedAt: "2026-05-04T10:00:00+08:00"
});

export const profiles = sampleSnapshot.profiles;
export const worldNodes = sampleSnapshot.worldNodes;
export const unlocks = sampleSnapshot.unlocks;
export const agentContext = sampleSnapshot.agentContext;
export const aiSuggestion = sampleSnapshot.aiSuggestion;
