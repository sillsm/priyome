// chess_query.zero.test.js
import { countMatchedPreconditions } from "./chess_query.js";

/* ---------------- minimal zero-dep test harness ---------------- */

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}\n  expected: ${expected}\n  got: ${actual}`);
  }
}

function runTest({ name, fen, query, expected }) {
  // Verbose mode should "barf" to console but still return a number.
  const got = countMatchedPreconditions(fen, query, { verbose: true });

  assertEqual(got, expected, `❌ ${name}`);

  // Bounds sanity
  assertEqual(
    Number.isInteger(got),
    true,
    `❌ ${name} (result must be integer)`
  );
  if (got < 0 || got > (query.predicates?.length ?? 0)) {
    throw new Error(
      `❌ ${name} (result out of range)\n  got: ${got}\n  range: 0..${query.predicates?.length ?? 0}`
    );
  }

  console.log(`✅ ${name}`);
}

/* ---------------- Greek Gift query ---------------- */

const greekGiftQuery = {
  name: "Greek Gift (minimal preconditions)",
  predicates: [
    { op: "at", piece: { ref: "Bd3" } },
    { op: "at", piece: { ref: "Ng5" } },
    { op: "attacks", attacker: { ref: "Ng5" }, target: { ref: "ph7" } },
    { op: "attacks", attacker: { ref: "Bd3" }, target: { ref: "ph7" } },
  ],
};

/* ---------------- table-driven cases ---------------- */

const tests = [
  {
    name: "satisfied: Bd3 + Ng5 both attack h7",
    fen: "r1bqkbnr/pppppppp/2n5/6N1/8/3B4/PPPPPPPP/RNBQK2R b KQkq - 0 1",
    query: greekGiftQuery,
    expected: 4,
  },
  {
    name: "not satisfied: knight not on g5",
    fen: "r1bqkbnr/pppppppp/2n5/8/8/3B1N2/PPPPPPPP/RNBQK2R b KQkq - 0 1",
    query: greekGiftQuery,
    expected: 2,
  },
];

/* ---------------- runner ---------------- */

console.log("Running chess_query zero-dep tests (verbose enabled)...\n");

let passed = 0;

for (const t of tests) {
  try {
    runTest(t);
    passed++;
  } catch (err) {
    console.error(err.message);
  }
}

console.log(`\n${passed}/${tests.length} tests passed`);

if (passed !== tests.length) {
  process.exit(1);
}
