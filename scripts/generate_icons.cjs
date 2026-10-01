const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

function createPng(width, height, bgColor, fgColor) {
  // RGBA buffer for uncompressed scanlines: each row has 1 filter byte (0) + width * 4 bytes
  const rowBytes = 1 + width * 4;
  const rawData = Buffer.alloc(height * rowBytes);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowBytes;
    rawData[rowOffset] = 0; // Filter: None

    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;
      
      // Draw rounded rectangle background with inner icon design
      const cx = width / 2;
      const cy = height / 2;
      const r = width * 0.44;
      
      // Simple stylized geometric icon (bank building / M symbol)
      const nx = (x - cx) / (width * 0.35);
      const ny = (y - cy) / (height * 0.35);
      
      // Inside circle/squircle?
      const dist = Math.hypot((x - cx) / (width * 0.46), (y - cy) / (height * 0.46));
      
      let isFg = false;
      // Building / letter H/M lines
      if (Math.abs(ny) < 0.6) {
        if (Math.abs(nx + 0.5) < 0.12 || Math.abs(nx - 0.5) < 0.12) isFg = true;
        if (Math.abs(ny - 0.0) < 0.12 && Math.abs(nx) < 0.5) isFg = true;
        if (Math.abs(nx) < 0.12 && ny < 0.4 && ny > -0.4) isFg = true;
      }
      // Top dot
      if (Math.hypot(nx, ny - 0.55) < 0.12) isFg = true;

      if (dist < 1.0) {
        if (isFg) {
          rawData[pixelOffset] = fgColor[0];
          rawData[pixelOffset + 1] = fgColor[1];
          rawData[pixelOffset + 2] = fgColor[2];
          rawData[pixelOffset + 3] = 255;
        } else {
          rawData[pixelOffset] = bgColor[0];
          rawData[pixelOffset + 1] = bgColor[1];
          rawData[pixelOffset + 2] = bgColor[2];
          rawData[pixelOffset + 3] = 255;
        }
      } else {
        // Transparent outside
        rawData[pixelOffset] = 0;
        rawData[pixelOffset + 1] = 0;
        rawData[pixelOffset + 2] = 0;
        rawData[pixelOffset + 3] = 0;
      }
    }
  }

  const compressed = zlib.deflateSync(rawData);

  function crc32(buf) {
    let crc = 0 ^ (-1);
    for (let i = 0; i < buf.length; i++) {
      crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xFF];
    }
    return (crc ^ (-1)) >>> 0;
  }

  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
    }
    table[i] = c;
  }

  function makeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type);
    const crcBuf = Buffer.alloc(4);
    const crcVal = crc32(Buffer.concat([typeBuf, data]));
    crcBuf.writeUInt32BE(crcVal, 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }

  // PNG Signature
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // Bit depth
  ihdrData[9] = 6; // Color type: RGBA
  ihdrData[10] = 0; // Compression
  ihdrData[11] = 0; // Filter
  ihdrData[12] = 0; // Interlace
  const ihdr = makeChunk('IHDR', ihdrData);

  // IDAT
  const idat = makeChunk('IDAT', compressed);

  // IEND
  const iend = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdr, idat, iend]);
}

const publicDir = path.join(__dirname, '..', 'public');
const bg = [0, 132, 133]; // #008485 Hana Teal
const fg = [255, 255, 255]; // White

fs.writeFileSync(path.join(publicDir, 'icon-192.png'), createPng(192, 192, bg, fg));
fs.writeFileSync(path.join(publicDir, 'icon-512.png'), createPng(512, 512, bg, fg));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), createPng(180, 180, bg, fg));
console.log('Successfully generated PWA PNG icons!');
