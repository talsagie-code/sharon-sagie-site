// Minimal build-time image dimension reader (WebP / JPEG / PNG).
// Used to give every gallery tile its true aspect ratio so nothing is cropped.
import { readFileSync } from 'node:fs';

function fromWebp(b) {
  if (b.toString('ascii', 0, 4) !== 'RIFF' || b.toString('ascii', 8, 12) !== 'WEBP') return null;
  const chunk = b.toString('ascii', 12, 16);
  if (chunk === 'VP8 ') {
    return { width: b.readUInt16LE(26) & 0x3fff, height: b.readUInt16LE(28) & 0x3fff };
  }
  if (chunk === 'VP8L') {
    const b0 = b[21], b1 = b[22], b2 = b[23], b3 = b[24];
    return {
      width: 1 + (((b1 & 0x3f) << 8) | b0),
      height: 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6)),
    };
  }
  if (chunk === 'VP8X') {
    return {
      width: 1 + (b[24] | (b[25] << 8) | (b[26] << 16)),
      height: 1 + (b[27] | (b[28] << 8) | (b[29] << 16)),
    };
  }
  return null;
}

function fromPng(b) {
  if (b.readUInt32BE(0) !== 0x89504e47) return null;
  return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
}

function fromJpeg(b) {
  if (b[0] !== 0xff || b[1] !== 0xd8) return null;
  let o = 2;
  while (o < b.length - 9) {
    if (b[o] !== 0xff) { o++; continue; }
    const m = b[o + 1];
    if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) {
      return { height: b.readUInt16BE(o + 5), width: b.readUInt16BE(o + 7) };
    }
    o += 2 + b.readUInt16BE(o + 2);
  }
  return null;
}

export function imageSize(path) {
  try {
    const b = readFileSync(path);
    const d = fromWebp(b) || fromPng(b) || fromJpeg(b);
    return d && d.width > 0 && d.height > 0 ? d : null;
  } catch {
    return null;
  }
}

export function aspectOf(path, fallback = 4 / 3) {
  const d = imageSize(path);
  return d ? d.width / d.height : fallback;
}
