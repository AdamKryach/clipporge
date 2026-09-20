import { deflateRawSync } from "zlib";

/**
 * Minimal ZIP writer (no external dependency) using STORE + DEFLATE methods.
 * Produces a valid archive that any OS can open. Used for "Download all".
 */
export function createZip(
  files: Array<{ name: string; data: Uint8Array }>
): Buffer {
  const parts: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;
  const now = dosDateTime(new Date());

  for (const f of files) {
    const nameBuf = Buffer.from(f.name, "utf8");
    const compressed = deflateRawSync(Buffer.from(f.data));
    const crc = crc32(f.data);
    const method = 8; // deflate

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4); // version needed
    local.writeUInt16LE(0x0800, 6); // flags: UTF-8
    local.writeUInt16LE(method, 8);
    local.writeUInt16LE(now.time, 10);
    local.writeUInt16LE(now.date, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(f.data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28); // extra len

    parts.push(local, nameBuf, compressed);

    const cd = Buffer.alloc(46);
    cd.writeUInt32LE(0x02014b50, 0);
    cd.writeUInt16LE(20, 4);
    cd.writeUInt16LE(20, 6);
    cd.writeUInt16LE(0x0800, 8);
    cd.writeUInt16LE(method, 10);
    cd.writeUInt16LE(now.time, 12);
    cd.writeUInt16LE(now.date, 14);
    cd.writeUInt32LE(crc, 16);
    cd.writeUInt32LE(compressed.length, 20);
    cd.writeUInt32LE(f.data.length, 24);
    cd.writeUInt16LE(nameBuf.length, 28);
    cd.writeUInt16LE(0, 30); // extra
    cd.writeUInt16LE(0, 32); // comment
    cd.writeUInt16LE(0, 34); // disk
    cd.writeUInt16LE(0, 36); // int attrs
    cd.writeUInt32LE(0, 38); // ext attrs
    cd.writeUInt32LE(offset, 42);
    central.push(cd, nameBuf);

    offset += 30 + nameBuf.length + compressed.length;
  }

  const cdStart = parts.reduce((a, p) => a + p.length, 0);
  const cdEnd = central.reduce((a, p) => a + p.length, 0);

  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4); // disk
  eocd.writeUInt16LE(0, 6); // cd disk
  eocd.writeUInt16LE(files.length, 8);
  eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(cdEnd, 12);
  eocd.writeUInt32LE(cdStart, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([...parts, ...central, eocd]);
}

function dosDateTime(d: Date) {
  const time =
    (d.getHours() << 11) |
    (d.getMinutes() << 5) |
    (d.getSeconds() >> 1);
  const date =
    (((d.getFullYear() - 1980) & 0x7f) << 9) |
    ((d.getMonth() + 1) << 5) |
    d.getDate();
  return { time, date };
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

export function crc32(buf: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}