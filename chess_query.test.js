import { countMatchedPreconditions } from "./chess_query.js";

/* ---------------- minimal test harness ---------------- */

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function assertEqual(actual, expected, msg) {
  if (actual !== expected) {
    throw new Error(`${msg}\n  expected: ${expected}\n  got: ${actual}`);
  }
}

function assertArrayEqual(actual, expected, msg) {
  assert(
    Array.isArray(actual) && Array.isArray(expected),
    `${msg} (not arrays)`
  );

  assertEqual(
    actual.length,
    expected.length,
    `${msg} (length mismatch)`
  );

  for (let i = 0; i < actual.length; i++) {
    assertEqual(
      actual[i],
      expected[i],
      `${msg} (index ${i})`
    );
  }
}

/* ---------------- Greek Gift query ---------------- */

const greekGiftQuery = {
  name: "Greek Gift (minimal preconditions)",
  predicates: [
    { op: "at", piece: { ref: "Bd3" } },
    { op: "at", piece: { ref: "Ng5" } },
    { op: "attacks", attacker: { ref: "Ng5" }, target: { ref: "ph7" } },
    { op: "attacks", attacker: { ref: "Bd3" }, target: { ref: "ph7" } }
  ]
};

/* ---------------- test cases ---------------- */

const tests = [
  {
    name: "satisfied: Bd3 + Ng5 both attack h7",
    fen: "r1bqkbnr/pppppppp/2n5/6N1/8/3B4/PPPPPPPP/RNBQK2R b KQkq - 0 1",
    expectedCount: 4,
    expectedMatches: [true, true, true, true]
  },
  {
    name: "not satisfied: knight not on g5",
    fen: "r1bqkbnr/pppppppp/2n5/8/8/3B1N2/PPPPPPPP/RNBQK2R b KQkq - 0 1",
    expectedCount: 2,
    expectedMatches: [true, false, false, true]
  }
];

/* ---------------- runner ---------------- */

console.log("Running chess_query verbose zero-dep tests...\n");

let passed = 0;

for (const t of tests) {
  try {
    const result = countMatchedPreconditions(
      t.fen,
      greekGiftQuery,
      { verbose: true }
    );

    assert(
      typeof result === "object",
      "verbose mode must return an object"
    );

    const { count, results } = result;

    assertEqual(
      count,
      t.expectedCount,
      `❌ ${t.name} (count)`
    );

    const actualMatches = results.map(r => r.matched);

    assertArrayEqual(
      actualMatches,
      t.expectedMatches,
      `❌ ${t.name} (predicate matches)`
    );

    console.log(`✅ ${t.name}`);
    passed++;

  } catch (err) {
    console.error(err.message);
  }
}

console.log(`\n${passed}/${tests.length} tests passed`);

if (passed !== tests.length) {
  process.exit(1);
}
