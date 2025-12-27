// geometry.js
// Bitboard mapping: bit 0 = a1, bit 7 = h1, bit 56 = a8, bit 63 = h8.
//
// KNIGHT_ATTACKS[sq] is a 64-bit mask (BigInt) of squares attacked by a knight
// placed on square index sq.

export function forkable(squareA, squareB, options = {}) {
  const verbose = options.verbose === true;

  const a = squareToIndex(squareA);
  const b = squareToIndex(squareB);

  const ma = KNIGHT_ATTACKS[a];
  const mb = KNIGHT_ATTACKS[b];
  const inter = ma & mb;

  const ok = inter !== 0n;

  if (verbose) {
    console.log("=== forkable ===");
    console.log(`A: ${squareA} (idx ${a})`);
    console.log(bitboardToAscii(ma, { label: `Knight attacks from ${squareA}` }));
    console.log(`B: ${squareB} (idx ${b})`);
    console.log(bitboardToAscii(mb, { label: `Knight attacks from ${squareB}` }));
    console.log(bitboardToAscii(inter, { label: `Intersection (A & B)` }));
    console.log("Result:", ok ? "true (non-empty intersection)" : "false (disjoint)");
    console.log("================\n");
  }

  return ok;
}

export const KNIGHT_ATTACKS = [
  // rank 1 (a1..h1)
  0x0000000000020400n, 0x0000000000050800n, 0x00000000000a1100n, 0x0000000000142200n,
  0x0000000000284400n, 0x0000000000508800n, 0x0000000000a01000n, 0x0000000000402000n,
  // rank 2 (a2..h2)
  0x0000000002040004n, 0x0000000005080008n, 0x000000000a110011n, 0x0000000014220022n,
  0x0000000028440044n, 0x0000000050880088n, 0x00000000a0100010n, 0x0000000040200020n,
  // rank 3 (a3..h3)
  0x0000000204000402n, 0x0000000508000805n, 0x0000000a1100110an, 0x0000001422002214n,
  0x0000002844004428n, 0x0000005088008850n, 0x000000a0100010a0n, 0x0000004020002040n,
  // rank 4 (a4..h4)
  0x0000020400040200n, 0x0000050800080500n, 0x00000a1100110a00n, 0x0000142200221400n,
  0x0000284400442800n, 0x0000508800885000n, 0x0000a0100010a000n, 0x0000402000204000n,
  // rank 5 (a5..h5)
  0x0002040004020000n, 0x0005080008050000n, 0x000a1100110a0000n, 0x0014220022140000n,
  0x0028440044280000n, 0x0050880088500000n, 0x00a0100010a00000n, 0x0040200020400000n,
  // rank 6 (a6..h6)
  0x0204000402000000n, 0x0508000805000000n, 0x0a1100110a000000n, 0x1422002214000000n,
  0x2844004428000000n, 0x5088008850000000n, 0xa0100010a0000000n, 0x4020002040000000n,
  // rank 7 (a7..h7)
  0x0400040200000000n, 0x0800080500000000n, 0x1100110a00000000n, 0x2200221400000000n,
  0x4400442800000000n, 0x8800885000000000n, 0x100010a000000000n, 0x2000204000000000n,
  // rank 8 (a8..h8)
  0x0004020000000000n, 0x0008050000000000n, 0x00110a0000000000n, 0x0022140000000000n,
  0x0044280000000000n, 0x0088500000000000n, 0x0010a00000000000n, 0x0020400000000000n,
];

function squareToIndex(sq) {
  if (typeof sq !== "string" || sq.length !== 2) throw new Error(`Invalid square: ${sq}`);

  const file = "abcdefgh".indexOf(sq[0]);
  const rank = sq.charCodeAt(1) - "1".charCodeAt(0); // 0..7

  if (file < 0 || rank < 0 || rank > 7) throw new Error(`Invalid square: ${sq}`);

  return rank * 8 + file;
}

function bitAt(mask, index) {
  return (mask & (1n << BigInt(index))) !== 0n;
}

/**
 * Render a bitboard as ASCII.
 * Ranks are printed 8..1, files a..h.
 */
export function bitboardToAscii(mask, { label } = {}) {
  const lines = [];
  if (label) lines.push(label);

  lines.push("    a b c d e f g h");
  lines.push("  +-----------------+");

  for (let rank = 7; rank >= 0; rank--) {
    let row = `${rank + 1} |`;
    for (let file = 0; file < 8; file++) {
      const idx = rank * 8 + file; // a1=0
      row += " " + (bitAt(mask, idx) ? "1" : ".");
    }
    row += " |";
    lines.push(row);
  }

  lines.push("  +-----------------+");
  return lines.join("\n");
}
