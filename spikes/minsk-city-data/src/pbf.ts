// A minimal reader of the OpenStreetMap PBF format that yields what DuckDB's ST_ReadOSM leaves
// out: the version and the timestamp of every object, and the replication state in the header.
// It decodes only the fields it needs and skips the rest. Spike code, single-threaded.
import { closeSync, openSync, readSync } from 'node:fs';
import { inflateSync } from 'node:zlib';

/** Protocol-buffer wire reader over a byte array. Numbers stay exact up to 2^53. */
class Wire {
  readonly buf: Uint8Array;
  pos: number;
  readonly end: number;
  constructor(buf: Uint8Array, pos = 0, end = buf.length) {
    this.buf = buf;
    this.pos = pos;
    this.end = end;
  }
  varint(): number {
    let result = 0;
    let mul = 1;
    for (;;) {
      const b = this.buf[this.pos++]!;
      result += (b & 0x7f) * mul;
      if (b < 0x80) return result;
      mul *= 128;
    }
  }
  /** ZigZag-decoded signed varint. */
  svarint(): number {
    const n = this.varint();
    return n % 2 === 0 ? n / 2 : -(n + 1) / 2;
  }
  /** A length-delimited field as a sub-reader over the same bytes. */
  sub(): Wire {
    const len = this.varint();
    const w = new Wire(this.buf, this.pos, this.pos + len);
    this.pos += len;
    return w;
  }
  skip(wireType: number): void {
    if (wireType === 0) this.varint();
    else if (wireType === 1) this.pos += 8;
    else if (wireType === 2) {
      const len = this.varint(); // read first: the read itself moves the position
      this.pos += len;
    }
    else if (wireType === 5) this.pos += 4;
    else throw new Error(`unsupported wire type ${wireType}`);
  }
  get more(): boolean {
    return this.pos < this.end;
  }
}

export interface PbfHeader {
  writingProgram: string | null;
  source: string | null;
  replicationTimestamp: number | null; // seconds since 1970
  replicationSequence: number | null;
  replicationUrl: string | null;
  requiredFeatures: string[];
  optionalFeatures: string[];
}

export type OsmType = 'node' | 'way' | 'relation';

export interface PbfHandlers {
  header?(h: PbfHeader): void;
  /** version 0 and timestamp 0 mean the file carries no metadata for the object. */
  object?(type: OsmType, id: number, version: number, timestampSec: number): void;
}

export interface PbfStats {
  blobs: number;
  nodes: number;
  ways: number;
  relations: number;
  withVersion: number;
  withTimestamp: number;
}

const text = new TextDecoder();

function parseHeader(w: Wire): PbfHeader {
  const h: PbfHeader = { writingProgram: null, source: null, replicationTimestamp: null, replicationSequence: null, replicationUrl: null, requiredFeatures: [], optionalFeatures: [] };
  while (w.more) {
    const key = w.varint();
    const field = key >>> 3;
    const type = key & 7;
    if (type === 2 && [4, 5, 16, 17, 34].includes(field)) {
      const s = w.sub();
      const str = text.decode(s.buf.subarray(s.pos, s.end));
      if (field === 4) h.requiredFeatures.push(str);
      else if (field === 5) h.optionalFeatures.push(str);
      else if (field === 16) h.writingProgram = str;
      else if (field === 17) h.source = str;
      else h.replicationUrl = str;
    } else if (type === 0 && field === 32) h.replicationTimestamp = w.varint();
    else if (type === 0 && field === 33) h.replicationSequence = w.varint();
    else w.skip(type);
  }
  return h;
}

/** Info { version = 1; timestamp = 2; … } */
function parseInfo(w: Wire): [number, number] {
  let version = 0;
  let timestamp = 0;
  while (w.more) {
    const key = w.varint();
    const field = key >>> 3;
    const type = key & 7;
    if (field === 1 && type === 0) version = w.varint();
    else if (field === 2 && type === 0) timestamp = w.varint();
    else w.skip(type);
  }
  return [version, timestamp];
}

function parsePrimitiveBlock(w: Wire, handlers: PbfHandlers, stats: PbfStats): void {
  let dateGranularity = 1000;
  const groups: Wire[] = [];
  while (w.more) {
    const key = w.varint();
    const field = key >>> 3;
    const type = key & 7;
    if (field === 2 && type === 2) groups.push(w.sub());
    else if (field === 18 && type === 0) dateGranularity = w.varint();
    else w.skip(type);
  }
  const toSec = dateGranularity / 1000;
  const emit = handlers.object;
  for (const g of groups) {
    while (g.more) {
      const key = g.varint();
      const field = key >>> 3;
      const type = key & 7;
      if (type !== 2) {
        g.skip(type);
        continue;
      }
      const m = g.sub();
      if (field === 2) {
        // DenseNodes { id = 1 (sint64, delta); denseinfo = 5 { version = 1; timestamp = 2 (sint64, delta) } }
        let ids: Wire | null = null;
        let versions: Wire | null = null;
        let stamps: Wire | null = null;
        while (m.more) {
          const k = m.varint();
          const f = k >>> 3;
          const t = k & 7;
          if (f === 1 && t === 2) ids = m.sub();
          else if (f === 5 && t === 2) {
            const info = m.sub();
            while (info.more) {
              const ik = info.varint();
              const inf = ik >>> 3;
              const it = ik & 7;
              if (inf === 1 && it === 2) versions = info.sub();
              else if (inf === 2 && it === 2) stamps = info.sub();
              else info.skip(it);
            }
          } else m.skip(t);
        }
        if (!ids) continue;
        let id = 0;
        let ts = 0;
        while (ids.more) {
          id += ids.svarint();
          const version = versions && versions.more ? versions.varint() : 0;
          if (stamps && stamps.more) ts += stamps.svarint();
          stats.nodes++;
          if (version > 0) stats.withVersion++;
          if (ts > 0) stats.withTimestamp++;
          if (emit) emit('node', id, version, ts * toSec);
        }
      } else if (field === 1 || field === 3 || field === 4) {
        // Node, Way, Relation { id = 1; info = 4 }
        let id = 0;
        let version = 0;
        let ts = 0;
        while (m.more) {
          const k = m.varint();
          const f = k >>> 3;
          const t = k & 7;
          if (f === 1 && t === 0) id = field === 1 ? zigzagOrPlain(m, true) : m.varint();
          else if (f === 4 && t === 2) [version, ts] = parseInfo(m.sub());
          else m.skip(t);
        }
        const kind: OsmType = field === 1 ? 'node' : field === 3 ? 'way' : 'relation';
        if (kind === 'node') stats.nodes++;
        else if (kind === 'way') stats.ways++;
        else stats.relations++;
        if (version > 0) stats.withVersion++;
        if (ts > 0) stats.withTimestamp++;
        if (emit) emit(kind, id, version, ts * toSec);
      }
    }
  }
}

// A plain Node message stores its id as sint64; ways and relations as int64.
function zigzagOrPlain(w: Wire, signed: boolean): number {
  return signed ? w.svarint() : w.varint();
}

/** Reads the whole file, block by block. */
export function readPbf(path: string, handlers: PbfHandlers): PbfStats {
  const stats: PbfStats = { blobs: 0, nodes: 0, ways: 0, relations: 0, withVersion: 0, withTimestamp: 0 };
  const fd = openSync(path, 'r');
  try {
    const lenBuf = Buffer.alloc(4);
    let offset = 0;
    for (;;) {
      if (readSync(fd, lenBuf, 0, 4, offset) < 4) break;
      offset += 4;
      const headerLen = lenBuf.readUInt32BE(0);
      const headerBuf = Buffer.alloc(headerLen);
      readSync(fd, headerBuf, 0, headerLen, offset);
      offset += headerLen;
      // BlobHeader { type = 1; datasize = 3 }
      const bh = new Wire(headerBuf);
      let blobType = '';
      let dataSize = 0;
      while (bh.more) {
        const key = bh.varint();
        const field = key >>> 3;
        const type = key & 7;
        if (field === 1 && type === 2) {
          const s = bh.sub();
          blobType = text.decode(s.buf.subarray(s.pos, s.end));
        } else if (field === 3 && type === 0) dataSize = bh.varint();
        else bh.skip(type);
      }
      const blobBuf = Buffer.alloc(dataSize);
      readSync(fd, blobBuf, 0, dataSize, offset);
      offset += dataSize;
      // Blob { raw = 1; raw_size = 2; zlib_data = 3 }
      const bw = new Wire(blobBuf);
      let data: Uint8Array | null = null;
      while (bw.more) {
        const key = bw.varint();
        const field = key >>> 3;
        const type = key & 7;
        if (field === 1 && type === 2) {
          const s = bw.sub();
          data = s.buf.subarray(s.pos, s.end);
        } else if (field === 3 && type === 2) {
          const s = bw.sub();
          data = inflateSync(s.buf.subarray(s.pos, s.end));
        } else bw.skip(type);
      }
      if (!data) throw new Error(`blob ${stats.blobs} uses a compression this reader does not know`);
      stats.blobs++;
      if (blobType === 'OSMHeader') handlers.header?.(parseHeader(new Wire(data)));
      else if (blobType === 'OSMData') parsePrimitiveBlock(new Wire(data), handlers, stats);
    }
  } finally {
    closeSync(fd);
  }
  return stats;
}
