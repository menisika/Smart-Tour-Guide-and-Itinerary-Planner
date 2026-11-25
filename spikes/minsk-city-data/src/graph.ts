// A compact pedestrian graph in typed arrays, with integer costs (ADR-0009), and a shortest-path
// search over it. Spike code: it shows the size and the speed, it is not the `routing` package.
//
// Binary layout (little-endian), all sections 4-byte aligned:
//   header   8 x uint32: magic "PGR1", version, nodeCount, edgeCount (directed), 4 reserved
//   lat      int32[nodeCount]      degrees * 1e7
//   lon      int32[nodeCount]      degrees * 1e7
//   firstOut uint32[nodeCount + 1] index of a node's first outgoing edge
//   head     uint32[edgeCount]     target node of an edge
//   len      uint16[edgeCount]     length in decimetres (an edge is never longer than 6553.5 m)
//   flags    uint8[edgeCount]      see FLAG_* below
// A walkable street is stored as two directed edges: 14 bytes per street segment, 12 bytes per node.

export const FLAG_STEPS = 1; // highway=steps: the Dealbreaker "no stairs" (PRF-3)
export const FLAG_CROSSING = 2; // footway=crossing
export const FLAG_TUNNEL = 4; // underpass
export const FLAG_BRIDGE = 8;
export const FLAG_UNPAVED = 16;
export const FLAG_ROAD = 32; // carriageway shared with cars (no separately mapped footway)
export const FLAG_BUSY = 64; // primary, secondary or trunk carriageway

export const MAX_LEN_DM = 65535;

export interface Graph {
  nodeCount: number;
  edgeCount: number;
  lat: Int32Array;
  lon: Int32Array;
  firstOut: Uint32Array;
  head: Uint32Array;
  len: Uint16Array;
  flags: Uint8Array;
}

export interface UndirectedEdge {
  a: number;
  b: number;
  lenDm: number;
  flags: number;
}

/** Builds the forward-star arrays from undirected edges. Parallel edges and loops are kept out. */
export function buildGraph(lat: Int32Array, lon: Int32Array, edges: UndirectedEdge[]): Graph {
  const n = lat.length;
  const firstOut = new Uint32Array(n + 1);
  for (const e of edges) {
    firstOut[e.a + 1]!++;
    firstOut[e.b + 1]!++;
  }
  for (let i = 0; i < n; i++) firstOut[i + 1]! += firstOut[i]!;
  const m = edges.length * 2;
  const head = new Uint32Array(m);
  const len = new Uint16Array(m);
  const flags = new Uint8Array(m);
  const cursor = firstOut.slice(0, n);
  for (const e of edges) {
    let k = cursor[e.a]!++;
    head[k] = e.b;
    len[k] = e.lenDm;
    flags[k] = e.flags;
    k = cursor[e.b]!++;
    head[k] = e.a;
    len[k] = e.lenDm;
    flags[k] = e.flags;
  }
  return { nodeCount: n, edgeCount: m, lat, lon, firstOut, head, len, flags };
}

const HEADER_WORDS = 8;
const MAGIC = 0x31524750; // "PGR1"
const pad4 = (x: number) => (x + 3) & ~3;

export function serialize(g: Graph): Uint8Array {
  const { nodeCount: n, edgeCount: m } = g;
  const size = HEADER_WORDS * 4 + 4 * n + 4 * n + 4 * (n + 1) + 4 * m + pad4(2 * m) + pad4(m);
  const buf = new ArrayBuffer(size);
  const header = new Uint32Array(buf, 0, HEADER_WORDS);
  header[0] = MAGIC;
  header[1] = 1;
  header[2] = n;
  header[3] = m;
  let off = HEADER_WORDS * 4;
  new Int32Array(buf, off, n).set(g.lat);
  off += 4 * n;
  new Int32Array(buf, off, n).set(g.lon);
  off += 4 * n;
  new Uint32Array(buf, off, n + 1).set(g.firstOut);
  off += 4 * (n + 1);
  new Uint32Array(buf, off, m).set(g.head);
  off += 4 * m;
  new Uint16Array(buf, off, m).set(g.len);
  off += pad4(2 * m);
  new Uint8Array(buf, off, m).set(g.flags);
  return new Uint8Array(buf);
}

/** Views into the file's bytes: loading is one read and no parsing. */
export function deserialize(bytes: Uint8Array): Graph {
  const buf = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const header = new Uint32Array(buf, 0, HEADER_WORDS);
  if (header[0] !== MAGIC || header[1] !== 1) throw new Error('not a PGR1 graph');
  const n = header[2]!;
  const m = header[3]!;
  let off = HEADER_WORDS * 4;
  const lat = new Int32Array(buf, off, n);
  off += 4 * n;
  const lon = new Int32Array(buf, off, n);
  off += 4 * n;
  const firstOut = new Uint32Array(buf, off, n + 1);
  off += 4 * (n + 1);
  const head = new Uint32Array(buf, off, m);
  off += 4 * m;
  const len = new Uint16Array(buf, off, m);
  off += pad4(2 * m);
  const flags = new Uint8Array(buf, off, m);
  return { nodeCount: n, edgeCount: m, lat, lon, firstOut, head, len, flags };
}

export const UNREACHED = 0xffffffff;

/**
 * One-to-many shortest paths (Dijkstra, binary heap with lazy deletion). Distances are integer
 * decimetres. The searcher owns its arrays, so repeated searches allocate nothing.
 */
export class Searcher {
  readonly dist: Uint32Array;
  readonly parent: Int32Array;
  private readonly g: Graph;
  private readonly heapNode: Uint32Array;
  private readonly heapKey: Uint32Array;
  private readonly touched: Uint32Array;
  private touchedCount = 0;
  settledCount = 0;

  constructor(g: Graph) {
    this.g = g;
    this.dist = new Uint32Array(g.nodeCount).fill(UNREACHED);
    this.parent = new Int32Array(g.nodeCount).fill(-1);
    // Lazy deletion: at most one heap entry per relaxed edge, plus the source.
    this.heapNode = new Uint32Array(g.edgeCount + 1);
    this.heapKey = new Uint32Array(g.edgeCount + 1);
    this.touched = new Uint32Array(g.nodeCount);
  }

  /** @param maxDm stop expanding beyond this distance; @param avoidMask edges with any of these flags are not used */
  run(source: number, maxDm: number = UNREACHED - 1, avoidMask = 0): void {
    const { firstOut, head, len, flags } = this.g;
    const { dist, parent, heapNode, heapKey, touched } = this;
    for (let i = 0; i < this.touchedCount; i++) {
      dist[touched[i]!] = UNREACHED;
      parent[touched[i]!] = -1;
    }
    this.touchedCount = 0;
    this.settledCount = 0;

    let size = 0;
    dist[source] = 0;
    touched[this.touchedCount++] = source;
    heapNode[0] = source;
    heapKey[0] = 0;
    size = 1;

    while (size > 0) {
      const u: number = heapNode[0]!;
      const du: number = heapKey[0]!;
      // pop
      size--;
      if (size > 0) {
        const node = heapNode[size]!;
        const key = heapKey[size]!;
        let i = 0;
        for (;;) {
          let c = 2 * i + 1;
          if (c >= size) break;
          if (c + 1 < size && heapKey[c + 1]! < heapKey[c]!) c++;
          if (heapKey[c]! >= key) break;
          heapNode[i] = heapNode[c]!;
          heapKey[i] = heapKey[c]!;
          i = c;
        }
        heapNode[i] = node;
        heapKey[i] = key;
      }
      if (du !== dist[u]) continue; // stale entry
      this.settledCount++;
      const end = firstOut[u + 1]!;
      for (let e: number = firstOut[u]!; e < end; e++) {
        if ((flags[e]! & avoidMask) !== 0) continue;
        const v = head[e]!;
        const dv = du + len[e]!;
        if (dv > maxDm) continue;
        const old = dist[v]!;
        if (dv < old) {
          if (old === UNREACHED) touched[this.touchedCount++] = v;
          dist[v] = dv;
          parent[v] = u;
          // push
          let i = size++;
          while (i > 0) {
            const p = (i - 1) >> 1;
            if (heapKey[p]! <= dv) break;
            heapNode[i] = heapNode[p]!;
            heapKey[i] = heapKey[p]!;
            i = p;
          }
          heapNode[i] = v;
          heapKey[i] = dv;
        }
      }
    }
  }

  /** Nodes from source to target, or an empty array when the target was not reached. */
  path(target: number): number[] {
    if (this.dist[target] === UNREACHED) return [];
    const out: number[] = [];
    for (let v = target; v !== -1; v = this.parent[v]!) out.push(v);
    return out.reverse();
  }
}

/** Nearest graph node to a point, by a uniform grid over the nodes. */
export class NodeIndex {
  private readonly g: Graph;
  private readonly cellDeg: number;
  private readonly cells = new Map<number, number[]>();
  private readonly cosLat: number;

  constructor(g: Graph, cellMetres = 150) {
    this.g = g;
    let sum = 0;
    for (let i = 0; i < g.nodeCount; i += 97) sum += g.lat[i]!;
    const meanLat = sum / Math.ceil(g.nodeCount / 97) / 1e7;
    this.cosLat = Math.cos((meanLat * Math.PI) / 180);
    this.cellDeg = cellMetres / 111_320;
    for (let i = 0; i < g.nodeCount; i++) {
      const key = this.key(g.lat[i]! / 1e7, g.lon[i]! / 1e7);
      const list = this.cells.get(key);
      if (list) list.push(i);
      else this.cells.set(key, [i]);
    }
  }

  private cx(lon: number): number {
    return Math.floor((lon * this.cosLat) / this.cellDeg);
  }
  private cy(lat: number): number {
    return Math.floor(lat / this.cellDeg);
  }
  private key(lat: number, lon: number): number {
    return this.cy(lat) * 1_000_003 + this.cx(lon);
  }

  /** @returns node index and distance in metres, or node -1 when nothing lies within maxMetres */
  nearest(lat: number, lon: number, maxMetres = 300, accept?: (node: number) => boolean): { node: number; metres: number } {
    const rings = Math.ceil(maxMetres / (this.cellDeg * 111_320));
    const cy = this.cy(lat);
    const cx = this.cx(lon);
    let best = -1;
    let bestD2 = Infinity;
    for (let r = 0; r <= rings; r++) {
      // Once a candidate is found, one more ring is enough to be sure it is the nearest.
      if (best !== -1 && (r - 1) * this.cellDeg * 111_320 > Math.sqrt(bestD2)) break;
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          const list = this.cells.get((cy + dy) * 1_000_003 + (cx + dx));
          if (!list) continue;
          for (const i of list) {
            if (accept && !accept(i)) continue;
            const y = (this.g.lat[i]! / 1e7 - lat) * 111_320;
            const x = (this.g.lon[i]! / 1e7 - lon) * 111_320 * this.cosLat;
            const d2 = x * x + y * y;
            if (d2 < bestD2) {
              bestD2 = d2;
              best = i;
            }
          }
        }
      }
    }
    const metres = Math.sqrt(bestD2);
    return best !== -1 && metres <= maxMetres ? { node: best, metres } : { node: -1, metres: Infinity };
  }
}

/** Labels connected components; returns the label per node and the node count per label. */
export function components(g: Graph): { label: Int32Array; sizes: number[] } {
  const label = new Int32Array(g.nodeCount).fill(-1);
  const sizes: number[] = [];
  const stack = new Uint32Array(g.nodeCount);
  for (let s = 0; s < g.nodeCount; s++) {
    if (label[s] !== -1) continue;
    const id = sizes.length;
    let top = 0;
    let count = 0;
    stack[top++] = s;
    label[s] = id;
    while (top > 0) {
      const u = stack[--top]!;
      count++;
      for (let e = g.firstOut[u]!; e < g.firstOut[u + 1]!; e++) {
        const v = g.head[e]!;
        if (label[v] === -1) {
          label[v] = id;
          stack[top++] = v;
        }
      }
    }
    sizes.push(count);
  }
  return { label, sizes };
}
