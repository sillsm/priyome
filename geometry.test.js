// geometry.zero.test.js
import { forkable } from "./geometry.js";

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}\n  expected: ${expected}\n  got: ${actual}`);
  }
}

const tests = [
  // TRUE: intersection exists
  { name: "c3 & e3 overlap", a: "c3", b: "e3", expected: true },
  { name: "d4 & e1 overlap", a: "d4", b: "e1", expected: true },

  // FALSE: disjoint
  { name: "b1 & g2 disjoint", a: "b1", b: "g2", expected: false },
  { name: "a1 & h8 disjoint", a: "a1", b: "h8", expected: false },
];

console.log("Running geometry zero-dep tests (verbose enabled)...\n");

let passed = 0;

for (const t of tests) {
  try {
    const got = forkable(t.a, t.b, { verbose: true });
    assertEqual(got, t.expected, `❌ ${t.name}`);
    console.log(`✅ ${t.name}\n`);
    passed++;
  } catch (err) {
    console.error(err.message);
  }
}

console.log(`\n${passed}/${tests.length} tests passed`);
if (passed !== tests.length) process.exit(1);
