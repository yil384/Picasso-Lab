// All 133,784,560 seven-card hands -> exact category counts. Runs only with SLOW=1 (npm run test:slow).
import test from 'node:test';
import assert from 'node:assert/strict';
import { rankMasks, CATS } from '../src/engine/evaluator.js';

test('all 133,784,560 seven-card hands: exact category counts', { skip: process.env.SLOW !== '1' && 'set SLOW=1' }, () => {
  const cnt = new Float64Array(9);
  const S = new Int32Array(4 * 7); // suit masks after depth k at S[4k..4k+3]
  const add = (dst, src, card) => {
    S[dst] = S[src]; S[dst + 1] = S[src + 1]; S[dst + 2] = S[src + 2]; S[dst + 3] = S[src + 3];
    S[dst + (card & 3)] |= 1 << (card >> 2);
  };
  const t0 = Date.now();
  let total = 0;
  for (let a = 0; a < 52; a++) {
    S.fill(0, 0, 4); S[a & 3] = 1 << (a >> 2);
    for (let b = a + 1; b < 52; b++) {
      add(4, 0, b);
      for (let c = b + 1; c < 52; c++) {
        add(8, 4, c);
        for (let d = c + 1; d < 52; d++) {
          add(12, 8, d);
          for (let e = d + 1; e < 52; e++) {
            add(16, 12, e);
            for (let f = e + 1; f < 52; f++) {
              add(20, 16, f);
              const s0 = S[20], s1 = S[21], s2 = S[22], s3 = S[23];
              for (let g = f + 1; g < 52; g++) {
                const bit = 1 << (g >> 2);
                const su = g & 3;
                const r = rankMasks(
                  su === 0 ? s0 | bit : s0, su === 1 ? s1 | bit : s1,
                  su === 2 ? s2 | bit : s2, su === 3 ? s3 | bit : s3);
                cnt[(r / 1048576) | 0]++;
              }
              total += 51 - f;
            }
          }
        }
      }
    }
  }
  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`# 7-card enumeration: ${total} hands in ${secs} s`);
  assert.equal(total, 133784560);
  const counts = Object.fromEntries(CATS.map((c, i) => [c, cnt[i]]));
  assert.deepEqual(counts, {
    high: 23294460, pair: 58627800, two_pair: 31433400, trips: 6461620, straight: 6180020,
    flush: 4047644, full_house: 3473184, quads: 224848, straight_flush: 41584,
  });
});
