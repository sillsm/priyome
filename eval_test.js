/* evals_test.js
 *
 * Table-driven tests for mockEval().
 * Uses chess.js from /third_party/chess.js
 *
 * How to run:
 *   - In a browser (module script) OR
 *   - In Node (ESM) if your environment can resolve /third_party/chess.js.
 *
 * The tests verify:
 *   1) input PGN parses
 *   2) output annotated PGN parses
 *   3) final FEN is identical (annotations didn't change moves)
 *   4) output contains mockEval comments and at least one [%csl ...] tag
 */

import { Chess } from "/third_party/chess.js";
import { mockEval } from "./evals.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg || "assertion failed");
}

function finalFenFromPgn(pgn) {
  const c = new Chess();
  const ok = c.loadPgn(pgn, { sloppy: true });
  assert(ok, "Could not parse PGN");
  return c.fen();
}

function runOne(name, pgn) {
  // Input parses
  const fenIn = finalFenFromPgn(pgn);

  // Eval output
  const out = mockEval(pgn);
  assert(out && typeof out.pgn === "string", `${name}: mockEval did not return {pgn:string}`);

  // Output contains mockEval comments and at least one colored-square tag
  assert(out.pgn.includes("{mockEval:"), `${name}: output PGN missing "{mockEval:" comments`);
  assert(out.pgn.includes("[%csl "), `${name}: output PGN missing [%csl ...] tag`);

  // Output parses & yields same final position
  const fenOut = finalFenFromPgn(out.pgn);
  assert(fenOut === fenIn, `${name}: final FEN mismatch.\nIN : ${fenIn}\nOUT: ${fenOut}`);

  // Bonus: should keep same move count
  const cin = new Chess(); cin.loadPgn(pgn, { sloppy: true });
  const cout = new Chess(); cout.loadPgn(out.pgn, { sloppy: true });
  assert(
    cin.history().length === cout.history().length,
    `${name}: move count mismatch (input ${cin.history().length} vs output ${cout.history().length})`
  );

  return true;
}

// ----------------------------
// Table-driven test cases
// ----------------------------
const TESTS = [
  {
    name: "Italian (quiet dev + capture potential later)",
    pgn: `
[Event "?"]
[Site "?"]
[Date "????.??.??"]
[Round "?"]
[White "?"]
[Black "?"]
[Result "*"]

1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 5. d3 d6 *
`.trim(),
  },
  {
    name: "Sicilian (knight dev + edge-square cases possible)",
    pgn: `
1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6 *
`.trim(),
  },
  {
    name: "French Advance (locked center; quiet moves)",
    pgn: `
1. e4 e6 2. d4 d5 3. e5 c5 4. c3 Nc6 5. Nf3 *
`.trim(),
  },
  {
    name: "Queen's Gambit Declined (development, no tactics)",
    pgn: `
1. d4 d5 2. c4 e6 3. Nc3 Nf6 4. Bg5 Be7 5. e3 *
`.trim(),
  },
  {
    name: "Contains early capture (ensures capture annotation triggers)",
    pgn: `
1. e4 e5 2. Nf3 Nc6 3. Nxe5 Nxe5 4. d4 Nc6 *
`.trim(),
  },
];

export function runAllEvalsTests() {
  const results = [];
  for (const t of TESTS) {
    runOne(t.name, t.pgn);
    results.push(`PASS: ${t.name}`);
  }
  return results;
}

// Auto-run in environments where top-level execution is desired
// (comment out if you prefer manual calling)
try {
  const res = runAllEvalsTests();
  // eslint-disable-next-line no-console
  console.log(res.join("\n"));
} catch (e) {
  // eslint-disable-next-line no-console
  console.error("TEST FAILURE:", e);
  throw e;
}
