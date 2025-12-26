import { countMatchedPreconditions } from "./chess_query.js";

/*
  Minimal zero-dep test harness
*/

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}\n  expected: ${expected}\n  got: ${actual}`);
  }
}

function runTest({ name, fen, query, expected }) {
  const got = countMatchedPreconditions(fen, query, { verbose: true });

  assertEqual(
    got,
    expected,
    `❌ ${name}`
  );

  console.log(`✅ ${name}`);
}

/*
  Greek Gift — schema-compliant predicates
*/
const greekGiftQuery = {
  name: "Greek Gift (minimal preconditions)",
  predicates: [
    { op: "at", piece: { ref: "Bd3" } },
    { op: "at", piece: { ref: "Ng5" } },
    { op: "attacks", attacker: { ref: "Ng5" }, target: { ref: "ph7" } },
    { op: "attacks", attacker: { ref: "Bd3" }, target: { ref: "ph7" } }
  ]
};

const tests = [
  {
    name: "satisfied: Bd3 + Ng5 both attack h7",
    fen: "r1bqkbnr/pppppppp/2n5/6N1/8/3B4/PPPPPPPP/RNBQK2R b KQkq - 0 1",
    query: greekGiftQuery,
    expected: 4
  },
  {
    name: "not satisfied: knight not on g5",
    fen: "r1bqkbnr/pppppppp/2n5/8/8/3B1N2/PPPPPPPP/RNBQK2R b KQkq - 0 1",
    query: greekGiftQuery,
    expected: 2
  }
];

/*
  Runner
*/
console.log("Running chess_query zero-dep tests...\n");

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
