import { describe, expect, it } from 'vitest';
import { deflateSync } from 'node:zlib';
import { decodePng, dominantColor } from '../src/import/coverColor.js';

// PNG 1×1 RVBA renvoyé par le CDN pour l'illustration d'Akali (Vendetta).
const AKALI_PIXEL =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAADUlEQVQImWOIcHT5DwADrwHdLIcnLQAAAABJRU5ErkJggg==';

/** PNG RVB minimal : chaque ligne est [filtre, ...octets]. */
function png(width, rows) {
  const chunk = (type, body) => {
    const head = Buffer.alloc(8);
    head.writeUInt32BE(body.length);
    head.write(type, 4, 'ascii');
    return Buffer.concat([head, body, Buffer.alloc(4)]); // CRC non vérifié par le décodeur
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(rows.length, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(Buffer.from(rows.flat()))),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

describe('decodePng', () => {
  it('lit un PNG RVBA du CDN', () => {
    expect(decodePng(Buffer.from(AKALI_PIXEL, 'base64'))).toEqual([[0x58, 0x41, 0x44]]);
  });

  it('annule les filtres Sub et Up', () => {
    const pixels = decodePng(
      png(2, [
        [1, 10, 20, 30, 5, 5, 5], // Sub : le 2e pixel s'ajoute au 1er
        [2, 1, 1, 1, 0, 0, 0], // Up : la ligne s'ajoute à celle du dessus
      ]),
    );
    expect(pixels).toEqual([
      [10, 20, 30],
      [15, 25, 35],
      [11, 21, 31],
      [15, 25, 35],
    ]);
  });
});

describe('dominantColor', () => {
  it('garde la teinte vive la plus présente plutôt que la moyenne', () => {
    const red = [200, 30, 40];
    const blue = [30, 40, 190];
    const grey = [120, 120, 120];
    expect(dominantColor([red, red, red, blue, grey, grey, grey, grey])).toBe('#c81e28');
  });

  it('retombe sur la moyenne pour une image sans couleur vive', () => {
    expect(
      dominantColor([
        [10, 10, 10],
        [30, 30, 30],
      ]),
    ).toBe('#141414');
  });
});
