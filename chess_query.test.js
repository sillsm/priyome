import { countMatchedPreconditions } from "./chess_query.js";

describe("countMatchedPreconditions (table-driven, schema v3)", () => {
  // "Greek Gift" preconditions (minimal, test-friendly)
  // Using schema keys: op + assert + {ref:""} objects.
  // IMPORTANT: black pawn is lowercase: "ph7" (not "Ph7").
  const greekGiftQuery = {
    name: "Greek Gift (minimal preconditions)",
    predicates: [
      // 1) White bishop is on d3
      { op: "at", piece: { ref: "Bd3" } },

      // 2) White knight is on g5
      { op: "at", piece: { ref: "Ng5" } },

      // 3) That knight attacks the pawn on h7
      { op: "attacks", attacker: { ref: "Ng5" }, target: { ref: "ph7" } },

      // 4) The bishop on d3 attacks the pawn on h7 (d3-e4-f5-g6-h7)
      { op: "attacks", attacker: { ref: "Bd3" }, target: { ref: "ph7" } },
    ],
  };

  const cases = [
    {
      name: "satisfied: Bd3 + Ng5, both attack h7",
      fen: "r1bqkbnr/pppppppp/2n5/6N1/8/3B4/PPPPPPPP/RNBQK2R b KQkq - 0 1",
      query: greekGiftQuery,
      expected: 4,
    },
    {
      name: "not satisfied: bishop attacks h7 but knight is not on g5",
      fen: "r1bqkbnr/pppppppp/2n5/8/8/3B1N2/PPPPPPPP/RNBQK2R b KQkq - 0 1",
      query: greekGiftQuery,
      expected: 2, // Bd3-at ✅, Ng5-at ❌, Ng5->ph7 ❌, Bd3->ph7 ✅
    },
  ];

  test.each(cases)("$name", ({ fen, query, expected }) => {
    const got = countMatchedPreconditions(fen, query);

    expect(got).toBe(expected);
    expect(got).toBeGreaterThanOrEqual(0);
    expect(got).toBeLessThanOrEqual(query.predicates.length);
  });
});
