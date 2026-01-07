/* evals.js
 *
 * Manual registry of PGN "eval" functions.
 *
 * Each eval function:
 *   - takes (pgn: string)
 *   - returns { pgn: string, text?: string } where `pgn` is an annotated PGN
 *
 * Uses chess.js from /third_party/chess.js
 */
import { Chess } from "/third_party/chess.js";

/**
 * Manual registry: add more evals here.
 * Each entry must have:
 *   - id: string
 *   - label: string
 *   - eval: (pgn:string) => {pgn:string, text?:string}
 */
export const EVALS = [
  { id: "mock", label: "Mock eval (demo annotations)", eval: mockEval },
];

/**
 * Mock eval:
 * - Replays the PGN move-by-move
 * - After each move, appends a human-ish comment like:
 *     "knight on the rim", "loose piece", "good development"
 * - Adds Lichess-style annotations inside the PGN comment:
 *     [%csl Rd5] (colored squares)
 *     [%cal Gg1f3] (colored arrows)
 *
 * This is intentionally simple and deterministic for testing.
 */
export function mockEval(pgn) {
  const input = new Chess();

  // Load the input PGN (allow sloppy SAN to be forgiving)
  const ok = input.loadPgn(pgn, { sloppy: true });
  if (!ok) {
    return {
      pgn: `{mockEval: could not parse PGN}`,
      text: "mockEval: could not parse PGN",
    };
  }

  const moves = input.history({ verbose: true });

  // Replay on a fresh game so we can examine positions at each ply
  const game = new Chess();

  let out = "";
  out += `[Event "mockEval"]\n`;
  out += `[Site "?"]\n`;
  out += `[Date "????.??.??"]\n`;
  out += `[Round "-"]\n`;
  out += `[White "?"]\n`;
  out += `[Black "?"]\n`;
  out += `[Result "*"]\n\n`;
  out += `{mockEval: demo annotations; terms are human-observable (loose piece, rim knight, development, etc.)}\n\n`;

  for (let i = 0; i < moves.length; i++) {
    const m = moves[i];

    // Move number formatting
    const ply = i + 1;
    const isWhiteMove = m.color === "w";
    const moveNumber = Math.floor((ply + 1) / 2);

    if (isWhiteMove) out += `${moveNumber}. `;
    else if (i === 0) out += `1... `;

    const fenBefore = game.fen();
    const before = new Chess(fenBefore);

    // Make the move in our replay game
    const played = game.move(m.san, { sloppy: true });
    if (!played) {
      // If something goes wrong mid-stream, bail gracefully with what we have.
      out += `{mockEval: failed to replay move "${m.san}" at ply ${ply}} `;
      break;
    }

    const comment = buildMockComment(before, game, played);
    out += `${m.san}${comment} `;

    // Line break occasionally for readability
    if (!isWhiteMove) out += "\n";
  }

  out += "\n*";

  return { pgn: out, text: "mockEval: annotated PGN generated" };
}

// ----------------------------
// Helpers (human-ish features)
// ----------------------------

const FILES = "abcdefgh";
const RANKS = "12345678";

function isEdgeSquare(sq) {
  const f = sq[0], r = sq[1];
  return f === "a" || f === "h" || r === "1" || r === "8";
}

function isGoodDevSquare(pieceType, toSq, color) {
  // Very human opening heuristics; intentionally simplistic.
  // Knights: to c3/f3 (white) or c6/f6 (black)
  if (pieceType === "n") {
    if (color === "w") return toSq === "c3" || toSq === "f3";
    return toSq === "c6" || toSq === "f6";
  }
  // Bishops: to c4/f4 (white) or c5/f5 (black)
  if (pieceType === "b") {
    if (color === "w") return toSq === "c4" || toSq === "f4";
    return toSq === "c5" || toSq === "f5";
  }
  return false;
}

function squareAttackDefendCounts(chess, targetSq) {
  // Count attackers/defenders by brute force using legal capture moves.
  // Returns { wAtt, bAtt, wDef, bDef } where Def ~= Att since defend means "could capture if occupied".
  // This is "starter-pack" speed; good enough for UI + tests.

  const pieces = listPieces(chess);
  const wPieces = pieces.filter(p => p.color === "w");
  const bPieces = pieces.filter(p => p.color === "b");

  const wAtt = countAttackers(chess, targetSq, wPieces);
  const bAtt = countAttackers(chess, targetSq, bPieces);

  // Defenders are attackers of the square if an enemy were there; approximate with same.
  const wDef = wAtt;
  const bDef = bAtt;

  return { wAtt, bAtt, wDef, bDef };
}

function listPieces(chess) {
  const board = chess.board();
  const out = [];
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const p = board[r][f];
      if (!p) continue;
      const sq = FILES[f] + RANKS[7 - r];
      out.push({ type: p.type, color: p.color, square: sq });
    }
  }
  return out;
}

function countAttackers(chess, targetSq, pieces) {
  let count = 0;
  for (const p of pieces) {
    const moves = chess.moves({ square: p.square, verbose: true });
    for (const m of moves) {
      if (m.to === targetSq && m.captured) {
        count++;
        break;
      }
    }
  }
  return count;
}

function buildMockComment(before, after, played) {
  const color = played.color;           // mover color
  const opp = color === "w" ? "b" : "w";
  const pieceType = played.piece;       // 'p','n','b','r','q','k'
  const from = played.from;
  const to = played.to;

  const notes = [];
  const csl = []; // square highlights, e.g. "Rd5"
  const cal = []; // arrows, e.g. "Gg1f3"

  // 1) Catastrophic-ish: "loose piece" (attacked more than defended)
  // We check AFTER the move: if opponent can capture it and it's under-defended.
  // For simplicity we use capture-move counts.
  const { wAtt, bAtt, wDef, bDef } = squareAttackDefendCounts(after, to);
  const oppAtt = opp === "w" ? wAtt : bAtt;
  const myDef = color === "w" ? wDef : bDef;

  if (oppAtt >= myDef + 1) {
    notes.push("loose piece (attacked more than defended)");
    csl.push(`R${to}`); // red square on the destination
  }

  // 2) Knight on the rim (classic human heuristic)
  if (pieceType === "n" && isEdgeSquare(to)) {
    notes.push("knight on the rim");
    csl.push(`Y${to}`); // yellow square
  }

  // 3) Simple “good development” arrow
  if ((pieceType === "n" || pieceType === "b") && isGoodDevSquare(pieceType, to, color)) {
    notes.push("good development");
    cal.push(`G${from}${to}`); // green arrow from->to
  }

  // 4) If move is a capture, mark the capture square (tactical landmark)
  if (played.captured) {
    notes.push(`capture on ${to}`);
    csl.push(`G${to}`);
  }

  // Ensure we always include at least one annotation in every PGN:
  // If nothing fired, add a neutral note with a small square mark.
  if (notes.length === 0) {
    notes.push("quiet move");
    csl.push(`Y${to}`);
  }

  const uniq = (arr) => [...new Set(arr)];
  const cslTag = uniq(csl).length ? `[%csl ${uniq(csl).join(",")}]` : "";
  const calTag = uniq(cal).length ? `[%cal ${uniq(cal).join(",")}]` : "";

  // Keep comments short & parseable
  const noteText = notes.join("; ");
  const tags = [cslTag, calTag].filter(Boolean).join(" ");
  const body = tags ? `${noteText} ${tags}` : noteText;

  return ` {mockEval: ${body}}`;
}

export function getEvalById(id) {
  return EVALS.find(e => e.id === id) ?? null;
}
