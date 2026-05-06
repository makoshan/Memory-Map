import { describe, expect, it } from "vitest";
import { parseExifGpsFromArrayBuffer } from "./exifGps";

const writeAscii = (view: DataView, offset: number, value: string) => {
  for (let index = 0; index < value.length; index += 1) {
    view.setUint8(offset + index, value.charCodeAt(index));
  }
};

function buildGpsTiff() {
  const bytes = new Uint8Array(220);
  const view = new DataView(bytes.buffer);
  const tiffStart = 0;
  writeAscii(view, tiffStart, "II");
  view.setUint16(tiffStart + 2, 42, true);
  view.setUint32(tiffStart + 4, 8, true);

  const ifd0 = tiffStart + 8;
  view.setUint16(ifd0, 1, true);
  view.setUint16(ifd0 + 2, 0x8825, true);
  view.setUint16(ifd0 + 4, 4, true);
  view.setUint32(ifd0 + 6, 1, true);
  view.setUint32(ifd0 + 10, 32, true);
  view.setUint32(ifd0 + 14, 0, true);

  const gpsIfd = tiffStart + 32;
  view.setUint16(gpsIfd, 6, true);
  const entries = gpsIfd + 2;
  const writeEntry = (entryIndex: number, tag: number, type: number, count: number, valueOrOffset: number) => {
    const entry = entries + entryIndex * 12;
    view.setUint16(entry, tag, true);
    view.setUint16(entry + 2, type, true);
    view.setUint32(entry + 4, count, true);
    view.setUint32(entry + 8, valueOrOffset, true);
  };

  writeEntry(0, 1, 2, 2, 122); // N
  writeEntry(1, 2, 5, 3, 128); // latitude
  writeEntry(2, 3, 2, 2, 124); // E
  writeEntry(3, 4, 5, 3, 152); // longitude
  writeEntry(4, 6, 5, 1, 176); // altitude
  writeEntry(5, 31, 5, 1, 184); // horizontal positioning error
  view.setUint32(entries + 72, 0, true);

  writeAscii(view, tiffStart + 122, "N\0");
  writeAscii(view, tiffStart + 124, "E\0");

  const writeRational = (relativeOffset: number, numerator: number, denominator: number) => {
    view.setUint32(tiffStart + relativeOffset, numerator, true);
    view.setUint32(tiffStart + relativeOffset + 4, denominator, true);
  };

  writeRational(128, 30, 1);
  writeRational(136, 16, 1);
  writeRational(144, 4004, 100);
  writeRational(152, 120, 1);
  writeRational(160, 7, 1);
  writeRational(168, 4285, 100);
  writeRational(176, 1118, 100);
  writeRational(184, 2130, 100);

  return bytes;
}

function buildJpegWithGpsExif() {
  const tiff = buildGpsTiff();
  const exifLength = 6 + tiff.byteLength;
  const bytes = new Uint8Array(2 + 2 + 2 + exifLength + 2);
  const view = new DataView(bytes.buffer);
  let offset = 0;

  view.setUint8(offset++, 0xff);
  view.setUint8(offset++, 0xd8);
  view.setUint8(offset++, 0xff);
  view.setUint8(offset++, 0xe1);
  view.setUint16(offset, exifLength + 2, false);
  offset += 2;
  writeAscii(view, offset, "Exif");
  offset += 4;
  view.setUint8(offset++, 0);
  view.setUint8(offset++, 0);
  bytes.set(tiff, offset);

  const end = bytes.length - 2;
  view.setUint8(end, 0xff);
  view.setUint8(end + 1, 0xd9);
  return bytes.buffer;
}

function writeUint32(target: Uint8Array, offset: number, value: number) {
  const view = new DataView(target.buffer);
  view.setUint32(offset, value, false);
}

function asciiBytes(value: string) {
  return Uint8Array.from(value, (char) => char.charCodeAt(0));
}

function concatBytes(parts: Uint8Array[]) {
  const size = parts.reduce((sum, part) => sum + part.byteLength, 0);
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) {
    bytes.set(part, offset);
    offset += part.byteLength;
  }
  return bytes;
}

function box(type: string, ...payloads: Uint8Array[]) {
  const payload = concatBytes(payloads);
  const bytes = new Uint8Array(8 + payload.byteLength);
  writeUint32(bytes, 0, bytes.byteLength);
  bytes.set(asciiBytes(type), 4);
  bytes.set(payload, 8);
  return bytes;
}

function fullBox(type: string, version: number, flags: number, ...payloads: Uint8Array[]) {
  const header = new Uint8Array(4);
  header[0] = version;
  header[1] = (flags >> 16) & 0xff;
  header[2] = (flags >> 8) & 0xff;
  header[3] = flags & 0xff;
  return box(type, header, ...payloads);
}

function buildHeifWithGpsExif() {
  const tiff = buildGpsTiff();
  const exifPayload = new Uint8Array(4 + tiff.byteLength);
  writeUint32(exifPayload, 0, 0);
  exifPayload.set(tiff, 4);

  const iinfPayload = new Uint8Array(2);
  new DataView(iinfPayload.buffer).setUint16(0, 1, false);
  const infePayload = new Uint8Array(2 + 2 + 4 + 1);
  const infeView = new DataView(infePayload.buffer);
  infeView.setUint16(0, 1, false);
  infeView.setUint16(2, 0, false);
  infePayload.set(asciiBytes("Exif"), 4);
  const iinf = fullBox("iinf", 0, 0, iinfPayload, fullBox("infe", 2, 0, infePayload));

  const buildIloc = (exifOffset: number) => {
    const ilocPayload = new Uint8Array(2 + 2 + 2 + 2 + 2 + 4 + 4);
    const ilocView = new DataView(ilocPayload.buffer);
    ilocPayload[0] = 0x44;
    ilocPayload[1] = 0;
    ilocView.setUint16(2, 1, false);
    ilocView.setUint16(4, 1, false);
    ilocView.setUint16(6, 0, false);
    ilocView.setUint16(8, 1, false);
    ilocView.setUint32(10, exifOffset, false);
    ilocView.setUint32(14, exifPayload.byteLength, false);
    return fullBox("iloc", 0, 0, ilocPayload);
  };

  const ftyp = box("ftyp", asciiBytes("heic"), new Uint8Array([0, 0, 0, 0]), asciiBytes("mif1"), asciiBytes("heic"));
  const initialMeta = box("meta", new Uint8Array(4), iinf, buildIloc(0));
  const exifOffset = ftyp.byteLength + initialMeta.byteLength;
  const meta = box("meta", new Uint8Array(4), iinf, buildIloc(exifOffset));
  return concatBytes([ftyp, meta, exifPayload]).buffer;
}

describe("parseExifGpsFromArrayBuffer", () => {
  it("extracts WGS84 GPS evidence from JPEG EXIF", () => {
    const gps = parseExifGpsFromArrayBuffer(buildJpegWithGpsExif());

    expect(gps).toMatchObject({
      evidenceType: "gps_exif",
      reviewState: "confirmed",
      confidence: 1
    });
    expect(gps?.latitude).toBeCloseTo(30.2777888889, 8);
    expect(gps?.longitude).toBeCloseTo(120.1285694444, 8);
    expect(gps?.altitude).toBeCloseTo(11.18, 2);
    expect(gps?.horizontalError).toBeCloseTo(21.3, 2);
  });

  it("extracts WGS84 GPS evidence from HEIC EXIF items", () => {
    const gps = parseExifGpsFromArrayBuffer(buildHeifWithGpsExif());

    expect(gps).toMatchObject({
      evidenceType: "gps_exif",
      reviewState: "confirmed",
      confidence: 1
    });
    expect(gps?.latitude).toBeCloseTo(30.2777888889, 8);
    expect(gps?.longitude).toBeCloseTo(120.1285694444, 8);
    expect(gps?.altitude).toBeCloseTo(11.18, 2);
    expect(gps?.horizontalError).toBeCloseTo(21.3, 2);
  });

  it("returns undefined when a JPEG has no EXIF APP1 segment", () => {
    const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);

    expect(parseExifGpsFromArrayBuffer(jpeg.buffer)).toBeUndefined();
  });

  it("returns undefined instead of throwing when EXIF GPS offsets are outside the JPEG data", () => {
    const jpeg = buildJpegWithGpsExif();
    const view = new DataView(jpeg);
    const tiffStart = 12;
    const gpsIfd = tiffStart + 32;
    const latitudeEntryValueOffset = gpsIfd + 2 + 12 + 8;
    view.setUint32(latitudeEntryValueOffset, 999_999, true);

    let result: ReturnType<typeof parseExifGpsFromArrayBuffer>;
    expect(() => {
      result = parseExifGpsFromArrayBuffer(jpeg);
    }).not.toThrow();
    expect(result).toBeUndefined();
  });
});
