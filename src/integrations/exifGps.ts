export type ExifGpsEvidence = {
  evidenceType: "gps_exif";
  latitude: number;
  longitude: number;
  altitude?: number;
  horizontalError?: number;
  confidence: 1;
  reviewState: "confirmed";
};

const TIFF_HEADER_BYTES = 8;
const TAG_GPS_IFD = 0x8825;
const GPS_LATITUDE_REF = 1;
const GPS_LATITUDE = 2;
const GPS_LONGITUDE_REF = 3;
const GPS_LONGITUDE = 4;
const GPS_ALTITUDE_REF = 5;
const GPS_ALTITUDE = 6;
const GPS_HORIZONTAL_ERROR = 31;
const BOX_HEADER_BYTES = 8;

type TiffReader = {
  view: DataView;
  tiffStart: number;
  littleEndian: boolean;
};

type IfdEntry = {
  tag: number;
  type: number;
  count: number;
  valueOffset: number;
  valueFieldOffset: number;
};

function hasBytes(reader: TiffReader, offset: number, length: number) {
  return offset >= 0 && length >= 0 && offset + length <= reader.view.byteLength;
}

function hasRelativeBytes(reader: TiffReader, relativeOffset: number, length: number) {
  return hasBytes(reader, reader.tiffStart + relativeOffset, length);
}

function readUint16(reader: TiffReader, offset: number) {
  return reader.view.getUint16(offset, reader.littleEndian);
}

function readUint32(reader: TiffReader, offset: number) {
  return reader.view.getUint32(offset, reader.littleEndian);
}

function readAscii(reader: TiffReader, relativeOffset: number, count: number) {
  if (!hasRelativeBytes(reader, relativeOffset, count)) return undefined;

  const start = reader.tiffStart + relativeOffset;
  let value = "";
  for (let index = 0; index < count; index += 1) {
    const byte = reader.view.getUint8(start + index);
    if (byte === 0) break;
    value += String.fromCharCode(byte);
  }
  return value;
}

function readInlineAscii(reader: TiffReader, entry: IfdEntry) {
  if (!hasBytes(reader, entry.valueFieldOffset, Math.min(entry.count, 4))) return undefined;

  let value = "";
  for (let index = 0; index < Math.min(entry.count, 4); index += 1) {
    const byte = reader.view.getUint8(entry.valueFieldOffset + index);
    if (byte === 0) break;
    value += String.fromCharCode(byte);
  }
  return value || undefined;
}

function readAsciiEntry(reader: TiffReader, entry: IfdEntry) {
  const inlineValue = entry.count <= 4 ? readInlineAscii(reader, entry) : undefined;
  if (inlineValue && /^[NSEW]$/i.test(inlineValue)) return inlineValue.toUpperCase();
  const offsetValue = readAscii(reader, entry.valueOffset, entry.count);
  return offsetValue?.toUpperCase();
}

function readRational(reader: TiffReader, relativeOffset: number) {
  if (!hasRelativeBytes(reader, relativeOffset, 8)) return undefined;

  const start = reader.tiffStart + relativeOffset;
  const numerator = readUint32(reader, start);
  const denominator = readUint32(reader, start + 4);
  if (denominator === 0) return undefined;
  return numerator / denominator;
}

function readRationalArray(reader: TiffReader, relativeOffset: number, count: number) {
  if (!hasRelativeBytes(reader, relativeOffset, count * 8)) return undefined;

  const values: number[] = [];
  for (let index = 0; index < count; index += 1) {
    const value = readRational(reader, relativeOffset + index * 8);
    if (value === undefined) return undefined;
    values.push(value);
  }
  return values;
}

function dmsToDecimal(values: number[], ref: string) {
  const decimal = values[0] + values[1] / 60 + values[2] / 3600;
  return ref === "S" || ref === "W" ? -decimal : decimal;
}

function readFourCc(view: DataView, offset: number) {
  if (offset + 4 > view.byteLength) return undefined;
  return String.fromCharCode(
    view.getUint8(offset),
    view.getUint8(offset + 1),
    view.getUint8(offset + 2),
    view.getUint8(offset + 3)
  );
}

function findJpegExifTiffStart(buffer: ArrayBuffer) {
  const view = new DataView(buffer);
  if (view.byteLength < 4 || view.getUint8(0) !== 0xff || view.getUint8(1) !== 0xd8) {
    return undefined;
  }

  let offset = 2;
  while (offset + 4 <= view.byteLength) {
    if (view.getUint8(offset) !== 0xff) return undefined;
    const marker = view.getUint8(offset + 1);
    const segmentLength = view.getUint16(offset + 2, false);
    if (segmentLength < 2 || offset + 2 + segmentLength > view.byteLength) return undefined;

    if (marker === 0xe1) {
      const payloadStart = offset + 4;
      const hasExifHeader =
        view.getUint8(payloadStart) === 0x45 &&
        view.getUint8(payloadStart + 1) === 0x78 &&
        view.getUint8(payloadStart + 2) === 0x69 &&
        view.getUint8(payloadStart + 3) === 0x66 &&
        view.getUint8(payloadStart + 4) === 0 &&
        view.getUint8(payloadStart + 5) === 0;
      if (hasExifHeader) return payloadStart + 6;
    }

    offset += 2 + segmentLength;
  }

  return undefined;
}

type IsoBox = {
  type: string;
  contentStart: number;
  contentEnd: number;
};

function getIsoBox(view: DataView, offset: number, parentEnd: number): IsoBox | undefined {
  if (offset + BOX_HEADER_BYTES > parentEnd || offset + BOX_HEADER_BYTES > view.byteLength) return undefined;

  const size32 = view.getUint32(offset, false);
  const type = readFourCc(view, offset + 4);
  if (!type) return undefined;

  let headerSize = BOX_HEADER_BYTES;
  let size = size32;
  if (size32 === 1) {
    if (offset + 16 > parentEnd || offset + 16 > view.byteLength) return undefined;
    const high = view.getUint32(offset + 8, false);
    const low = view.getUint32(offset + 12, false);
    if (high > 0x1f_ffff) return undefined;
    size = high * 0x1_0000_0000 + low;
    headerSize = 16;
  } else if (size32 === 0) {
    size = parentEnd - offset;
  }

  if (size < headerSize || offset + size > parentEnd || offset + size > view.byteLength) return undefined;
  return {
    type,
    contentStart: offset + headerSize,
    contentEnd: offset + size
  };
}

function findIsoBox(view: DataView, start: number, end: number, type: string) {
  let offset = start;
  while (offset + BOX_HEADER_BYTES <= end) {
    const box = getIsoBox(view, offset, end);
    if (!box) return undefined;
    if (box.type === type) return box;
    offset = box.contentEnd;
  }
  return undefined;
}

function readSizedUnsigned(view: DataView, offset: number, size: number) {
  if (size === 0) return 0;
  if (offset + size > view.byteLength || size > 4) return undefined;

  let value = 0;
  for (let index = 0; index < size; index += 1) {
    value = value * 256 + view.getUint8(offset + index);
  }
  return value;
}

function findHeifExifItemId(view: DataView, iinf: IsoBox) {
  const version = view.getUint8(iinf.contentStart);
  let offset = iinf.contentStart + 4;
  if (offset + (version === 0 ? 2 : 4) > iinf.contentEnd) return undefined;

  const entryCount = version === 0 ? view.getUint16(offset, false) : view.getUint32(offset, false);
  offset += version === 0 ? 2 : 4;

  for (let index = 0; index < entryCount && offset + BOX_HEADER_BYTES <= iinf.contentEnd; index += 1) {
    const entry = getIsoBox(view, offset, iinf.contentEnd);
    if (!entry) return undefined;
    offset = entry.contentEnd;
    if (entry.type !== "infe" || entry.contentStart + 12 > entry.contentEnd) continue;

    const itemInfoVersion = view.getUint8(entry.contentStart);
    if (itemInfoVersion < 2) continue;

    const itemIdOffset = entry.contentStart + 4;
    const itemId = itemInfoVersion === 2 ? view.getUint16(itemIdOffset, false) : view.getUint32(itemIdOffset, false);
    const itemTypeOffset = itemIdOffset + (itemInfoVersion === 2 ? 4 : 6);
    if (readFourCc(view, itemTypeOffset) === "Exif") return itemId;
  }

  return undefined;
}

function findHeifItemExtent(view: DataView, iloc: IsoBox, targetItemId: number) {
  const version = view.getUint8(iloc.contentStart);
  let offset = iloc.contentStart + 4;
  if (offset + 4 > iloc.contentEnd) return undefined;

  const offsetSize = view.getUint8(offset) >> 4;
  const lengthSize = view.getUint8(offset) & 0x0f;
  const baseOffsetSize = view.getUint8(offset + 1) >> 4;
  const indexSize = version === 1 || version === 2 ? view.getUint8(offset + 1) & 0x0f : 0;
  offset += 2;

  const itemCount = version < 2 ? view.getUint16(offset, false) : view.getUint32(offset, false);
  offset += version < 2 ? 2 : 4;

  for (let itemIndex = 0; itemIndex < itemCount; itemIndex += 1) {
    if (offset >= iloc.contentEnd) return undefined;
    const itemId = version < 2 ? view.getUint16(offset, false) : view.getUint32(offset, false);
    offset += version < 2 ? 2 : 4;

    if (version === 1 || version === 2) offset += 2;
    offset += 2;

    const baseOffset = readSizedUnsigned(view, offset, baseOffsetSize);
    if (baseOffset === undefined) return undefined;
    offset += baseOffsetSize;

    if (offset + 2 > iloc.contentEnd) return undefined;
    const extentCount = view.getUint16(offset, false);
    offset += 2;

    for (let extentIndex = 0; extentIndex < extentCount; extentIndex += 1) {
      if (indexSize > 0) offset += indexSize;
      const extentOffset = readSizedUnsigned(view, offset, offsetSize);
      if (extentOffset === undefined) return undefined;
      offset += offsetSize;

      const extentLength = readSizedUnsigned(view, offset, lengthSize);
      if (extentLength === undefined) return undefined;
      offset += lengthSize;

      if (itemId === targetItemId) {
        return {
          offset: baseOffset + extentOffset,
          length: extentLength
        };
      }
    }
  }

  return undefined;
}

function findTiffHeaderInExifItem(view: DataView, itemOffset: number, itemLength: number) {
  const itemEnd = itemOffset + itemLength;
  if (itemOffset < 0 || itemLength <= 0 || itemEnd > view.byteLength) return undefined;

  if (itemOffset + 4 <= itemEnd) {
    const tiffOffset = view.getUint32(itemOffset, false);
    const tiffStart = itemOffset + 4 + tiffOffset;
    const byteOrder = readFourCc(view, tiffStart)?.slice(0, 2);
    if ((byteOrder === "II" || byteOrder === "MM") && tiffStart + TIFF_HEADER_BYTES <= itemEnd) return tiffStart;
  }

  for (let offset = itemOffset; offset + TIFF_HEADER_BYTES <= itemEnd; offset += 1) {
    const byteOrder = String.fromCharCode(view.getUint8(offset), view.getUint8(offset + 1));
    if (byteOrder === "II" || byteOrder === "MM") return offset;
  }

  return undefined;
}

function findHeifExifTiffStart(buffer: ArrayBuffer) {
  const view = new DataView(buffer);
  const ftyp = findIsoBox(view, 0, view.byteLength, "ftyp");
  if (!ftyp) return undefined;

  const meta = findIsoBox(view, ftyp.contentEnd, view.byteLength, "meta");
  if (!meta || meta.contentStart + 4 > meta.contentEnd) return undefined;

  const childStart = meta.contentStart + 4;
  const iinf = findIsoBox(view, childStart, meta.contentEnd, "iinf");
  const iloc = findIsoBox(view, childStart, meta.contentEnd, "iloc");
  if (!iinf || !iloc) return undefined;

  const exifItemId = findHeifExifItemId(view, iinf);
  if (exifItemId === undefined) return undefined;

  const extent = findHeifItemExtent(view, iloc, exifItemId);
  if (!extent) return undefined;

  return findTiffHeaderInExifItem(view, extent.offset, extent.length);
}

function findExifTiffStart(buffer: ArrayBuffer) {
  return findJpegExifTiffStart(buffer) ?? findHeifExifTiffStart(buffer);
}

function entryValueOffset(reader: TiffReader, entryOffset: number) {
  return readUint32(reader, entryOffset + 8);
}

function getIfdEntries(reader: TiffReader, ifdRelativeOffset: number) {
  const ifdOffset = reader.tiffStart + ifdRelativeOffset;
  if (ifdOffset + 2 > reader.view.byteLength) return [];
  const count = readUint16(reader, ifdOffset);
  const entries: IfdEntry[] = [];

  for (let index = 0; index < count; index += 1) {
    const entryOffset = ifdOffset + 2 + index * 12;
    if (entryOffset + 12 > reader.view.byteLength) break;
    entries.push({
      tag: readUint16(reader, entryOffset),
      type: readUint16(reader, entryOffset + 2),
      count: readUint32(reader, entryOffset + 4),
      valueOffset: entryValueOffset(reader, entryOffset),
      valueFieldOffset: entryOffset + 8
    });
  }

  return entries;
}

export function parseExifGpsFromArrayBuffer(buffer: ArrayBuffer): ExifGpsEvidence | undefined {
  try {
    const tiffStart = findExifTiffStart(buffer);
    if (tiffStart === undefined || tiffStart + TIFF_HEADER_BYTES > buffer.byteLength) return undefined;

    const view = new DataView(buffer);
    const byteOrder = String.fromCharCode(view.getUint8(tiffStart), view.getUint8(tiffStart + 1));
    const littleEndian = byteOrder === "II";
    if (!littleEndian && byteOrder !== "MM") return undefined;

    const reader: TiffReader = { view, tiffStart, littleEndian };
    if (readUint16(reader, tiffStart + 2) !== 42) return undefined;

    const ifd0Offset = readUint32(reader, tiffStart + 4);
    const gpsPointer = getIfdEntries(reader, ifd0Offset).find((entry) => entry.tag === TAG_GPS_IFD);
    if (!gpsPointer) return undefined;

    const gpsEntries = getIfdEntries(reader, gpsPointer.valueOffset);
    const byTag = new Map(gpsEntries.map((entry) => [entry.tag, entry]));
    const latitudeRefEntry = byTag.get(GPS_LATITUDE_REF);
    const latitudeEntry = byTag.get(GPS_LATITUDE);
    const longitudeRefEntry = byTag.get(GPS_LONGITUDE_REF);
    const longitudeEntry = byTag.get(GPS_LONGITUDE);
    if (!latitudeRefEntry || !latitudeEntry || !longitudeRefEntry || !longitudeEntry) return undefined;

    const latitudeRef = readAsciiEntry(reader, latitudeRefEntry);
    const longitudeRef = readAsciiEntry(reader, longitudeRefEntry);
    const latitudeDms = readRationalArray(reader, latitudeEntry.valueOffset, latitudeEntry.count);
    const longitudeDms = readRationalArray(reader, longitudeEntry.valueOffset, longitudeEntry.count);
    if (
      !latitudeRef ||
      !longitudeRef ||
      !latitudeDms ||
      !longitudeDms ||
      latitudeDms.length !== 3 ||
      longitudeDms.length !== 3
    ) return undefined;

    const altitudeEntry = byTag.get(GPS_ALTITUDE);
    const altitudeRefEntry = byTag.get(GPS_ALTITUDE_REF);
    const altitudeValue = altitudeEntry ? readRational(reader, altitudeEntry.valueOffset) : undefined;
    const belowSeaLevel = altitudeRefEntry ? altitudeRefEntry.valueOffset === 1 : false;
    const horizontalErrorEntry = byTag.get(GPS_HORIZONTAL_ERROR);

    return {
      evidenceType: "gps_exif",
      latitude: dmsToDecimal(latitudeDms, latitudeRef),
      longitude: dmsToDecimal(longitudeDms, longitudeRef),
      altitude: altitudeValue === undefined ? undefined : belowSeaLevel ? -altitudeValue : altitudeValue,
      horizontalError: horizontalErrorEntry ? readRational(reader, horizontalErrorEntry.valueOffset) : undefined,
      confidence: 1,
      reviewState: "confirmed"
    };
  } catch {
    return undefined;
  }
}
