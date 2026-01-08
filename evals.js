// evals.js
// Manual registry of eval functions.
// Designed to be loaded via: import('./evals.js')
// Exports:
//   - EVALS (named)
//   - default (same array)
//
// Depends only on chess.js (module) at ./third_party/chess.js
// Provides VERY VERBOSE logging via an optional ctx argument.
//
// Each eval entry: { id, name, description, run(pgn, ctx?) -> string | {pgn, meta?} }

import { Chess } from "./third_party/chess.js";

/* -----------------------------
 * Logging / string utils
 * ----------------------------- */

function nowStamp() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}.${m}.${da}`;
}

function safeString(v) {
  if (v === undefined) return "undefined";
  if (v === null) return "null";
  if (typeof v === "string") return v;
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}

function clip(s, max) {
  const t = String(s ?? "");
  if (t.length <= max) return t;
  return t.slice(0, max) + `\n… (${t.length - max} more chars)`;
}

function logLine(ctx, level, msg) {
  if (!ctx) return;
  const s = String(msg);
  if (level === "warn") ctx.warn ? ctx.warn(s) : ctx.log?.(s);
  else if (level === "err") ctx.err ? ctx.err(s) : ctx.log?.(s);
  else ctx.log?.(s);
}

function logBlock(ctx, level, title, value, max = 2000) {
  const s = safeString(value);
  const prefix = `EVAL/${title} (${s.length} chars)`;
  const body = clip(s, max);
  logLine(ctx, level, `${prefix}\n${body}`);
}

function escapeCommentBody(s) {
  // PGN comment bodies cannot contain unmatched braces.
  return String(s ?? "")
    .replace(/\r/g, "")
    .replace(/\{/g, "(")
    .replace(/\}/g, ")")
    .trim();
}

/* -----------------------------
 * PGN helpers
 * ----------------------------- */

function hasHeader(pgn, key) {
  const re = new RegExp(`^\\[${key}\\s+"[^"]*"\\]\\s*$`, "m");
  return re.test(pgn);
}

function ensureHeaders(pgn, extraHeaders = {}) {
  let txt = String(pgn ?? "").replace(/\r/g, "");

  const hasAnyHeader = /^\s*\[[A-Za-z0-9_]+\s+"[^"]*"\]\s*$/m.test(txt);
  if (!hasAnyHeader) {
    const block =
      `[Event "Priyome"]\n` +
      `[Site "Local"]\n` +
      `[Date "${nowStamp()}"]\n` +
      `[Round "?"]\n` +
      `[White "?"]\n` +
      `[Black "?"]\n` +
      `[Result "*"]\n\n`;
    txt = block + txt.trim();
  }

  if (!hasHeader(txt, "Result")) {
    const idx = txt.indexOf("\n\n");
    if (idx >= 0) txt = txt.slice(0, idx) + `\n[Result "*"]` + txt.slice(idx);
    else txt = `[Result "*"]\n` + txt;
  }

  for (const [k, v0] of Object.entries(extraHeaders)) {
    const v = String(v0).replaceAll('"', '\\"');
    const line = `[${k} "${v}"]`;
    const re = new RegExp(`^\\[${k}\\s+"[^"]*"\\]\\s*$`, "m");
    if (re.test(txt)) txt = txt.replace(re, line);
    else {
      const idx = txt.indexOf("\n\n");
      if (idx >= 0) txt = txt.slice(0, idx) + `\n${line}` + txt.slice(idx);
      else txt = line + "\n" + txt;
    }
  }

  txt = txt.replace(/\n{3,}/g, "\n\n");
  if (!/\n\n/.test(txt)) txt += "\n\n";
  return txt.trimEnd() + "\n";
}

function stripEndResultToken(pgn) {
  return String(pgn ?? "")
    .replace(/\s+(1-0|0-1|1\/2-1\/2|\*)\s*$/, "")
    .trim();
}

function ensureTrailingResult(pgn) {
  let txt = String(pgn ?? "").trim();
  if (/(1-0|0-1|1\/2-1\/2|\*)\s*$/.test(txt)) return txt + "\n";
  const m = txt.match(/^\[Result\s+"([^"]+)"\]\s*$/m);
  const res = m ? m[1] : "*";
  return (txt + " " + res).trim() + "\n";
}

function splitHeadersAndMovetext(pgn) {
  const txt = String(pgn ?? "").replace(/\r/g, "");
  const idx = txt.indexOf("\n\n");
  if (idx < 0) return { headers: "", moves: txt.trim() };
  return { headers: txt.slice(0, idx).trim(), moves: txt.slice(idx + 2).trim() };
}

function tokenizeMovetext(movesText) {
  const re = /\{[^}]*\}|\d+\.(?:\.\.)?|1-0|0-1|1\/2-1\/2|\*|\S+/g;
  const toks = [];
  let m;
  while ((m = re.exec(movesText)) !== null) toks.push(m[0]);
  return toks;
}

function isMoveNumberTok(tok) {
  return /^\d+\.(?:\.\.)?$/.test(tok);
}
function isResultTok(tok) {
  return /^(1-0|0-1|1\/2-1\/2|\*)$/.test(tok);
}
function isCommentTok(tok) {
  return tok.startsWith("{") && tok.endsWith("}");
}

function rebuildMovetextWithInsertions(tokens, injectionsByPly) {
  let ply = 0;
  const out = [];
  for (const tok of tokens) {
    out.push(tok);

    if (isCommentTok(tok)) continue;
    if (isMoveNumberTok(tok)) continue;
    if (isResultTok(tok)) break;

    ply++;
    const inject = injectionsByPly[ply];
    if (inject && inject.length) for (const c of inject) out.push(c);
  }
  return out.join(" ");
}

function insertDrawTagsNearStart(pgn, tags) {
  const txt = String(pgn ?? "").replace(/\r/g, "");
  const insert = `{ ${tags} }\n\n`;
  const idx = txt.indexOf("\n\n");
  if (idx >= 0) return txt.slice(0, idx + 2) + insert + txt.slice(idx + 2);
  return insert + txt;
}

/* -----------------------------
 * chess.js loadPgn() return value varies by build (often undefined on success).
 * So "parse ok" = "didn't throw" AND (movetext empty OR history().length > 0).
 * ----------------------------- */

function tryLoadPgn(chess, pgn, opts = {}) {
  try {
    chess.loadPgn(pgn, opts); // do not trust return value
  } catch {
    return false;
  }
  const { moves } = splitHeadersAndMovetext(stripEndResultToken(pgn));
  const hasMovetext = /\S/.test(moves);
  const histLen = chess.history().length;
  if (!hasMovetext) return true;
  return histLen > 0;
}

/* -----------------------------
 * Chess geometry helpers (human-ish)
 * ----------------------------- */

const FILES = "abcdefgh";

function fileIndex(sq) {
  return sq.charCodeAt(0) - 97;
}
function rankIndex(sq) {
  return sq.charCodeAt(1) - 49;
}
function inBounds(f, r) {
  return f >= 0 && f < 8 && r >= 0 && r < 8;
}
function sqOf(f, r) {
  return String.fromCharCode(97 + f) + String.fromCharCode(49 + r);
}

function isEdgeSquare(sq) {
  const f = sq[0],
    r = sq[1];
  return f === "a" || f === "h" || r === "1" || r === "8";
}

function squareColorName(sq) {
  const f = fileIndex(sq);
  const r = rankIndex(sq);
  return (f + r) % 2 === 0 ? "dark" : "light";
}

function rayClear(ff, fr, tf, tr, board) {
  const stepF = Math.sign(tf - ff);
  const stepR = Math.sign(tr - fr);
  let f = ff + stepF;
  let r = fr + stepR;

  while (f !== tf || r !== tr) {
    if (!inBounds(f, r)) return false;
    const row = 7 - r;
    if (board[row][f]) return false;
    f += stepF;
    r += stepR;
  }
  return true;
}

function pieceAttacksSquare(fromSq, type, color, targetSq, board) {
  const ff = fileIndex(fromSq),
    fr = rankIndex(fromSq);
  const tf = fileIndex(targetSq),
    tr = rankIndex(targetSq);
  const df = tf - ff,
    dr = tr - fr;

  if (type === "p") {
    const dir = color === "w" ? 1 : -1;
    return dr === dir && (df === 1 || df === -1);
  }
  if (type === "n") {
    const a = Math.abs(df),
      b = Math.abs(dr);
    return (a === 1 && b === 2) || (a === 2 && b === 1);
  }
  if (type === "k") return Math.abs(df) <= 1 && Math.abs(dr) <= 1;

  const isDiag = Math.abs(df) === Math.abs(dr) && df !== 0;
  const isOrtho = (df === 0 && dr !== 0) || (dr === 0 && df !== 0);

  if (type === "b") return isDiag && rayClear(ff, fr, tf, tr, board);
  if (type === "r") return isOrtho && rayClear(ff, fr, tf, tr, board);
  if (type === "q") return (isDiag || isOrtho) && rayClear(ff, fr, tf, tr, board);

  return false;
}

function countAttackers(chess, targetSq, color) {
  const board = chess.board();
  let count = 0;

  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const row = 7 - r;
      const p = board[row][f];
      if (!p) continue;
      if (p.color !== color) continue;

      const fromSq = sqOf(f, r);
      if (pieceAttacksSquare(fromSq, p.type, p.color, targetSq, board)) count++;
    }
  }
  return count;
}

function listMinors(chess, color) {
  const board = chess.board();
  const out = [];
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const p = board[r][f];
      if (!p) continue;
      if (p.color !== color) continue;
      if (p.type !== "n" && p.type !== "b") continue;
      const sq = FILES[f] + String(8 - r);
      out.push({ type: p.type, color: p.color, square: sq });
    }
  }
  out.sort((a, b) => a.square.localeCompare(b.square) || a.type.localeCompare(b.type));
  return out;
}

function squareOccupiedByOwn(chess, sq, color) {
  const p = chess.get(sq);
  return !!p && p.color === color;
}

function knightMobility(chess, sq, color) {
  const f = fileIndex(sq);
  const r = rankIndex(sq);
  const deltas = [
    [1, 2],[2, 1],[2, -1],[1, -2],
    [-1, -2],[-2, -1],[-2, 1],[-1, 2],
  ];
  let c = 0;
  for (const [df, dr] of deltas) {
    const nf = f + df,
      nr = r + dr;
    if (!inBounds(nf, nr)) continue;
    const to = sqOf(nf, nr);
    if (!squareOccupiedByOwn(chess, to, color)) c++;
  }
  return c;
}

function bishopMobility(chess, sq, color) {
  const board = chess.board();
  const dirs = [
    [1, 1],[1, -1],[-1, 1],[-1, -1],
  ];
  let total = 0;
  for (const [df, dr] of dirs) {
    let f = fileIndex(sq) + df;
    let r = rankIndex(sq) + dr;
    while (inBounds(f, r)) {
      const row = 7 - r;
      const p = board[row][f];
      if (p) {
        if (p.color !== color) total += 1;
        break;
      }
      total += 1;
      f += df;
      r += dr;
    }
  }
  return total;
}

function countOwnPawnsOnColor(chess, color, colorName) {
  const board = chess.board();
  let n = 0;
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const p = board[r][f];
      if (!p) continue;
      if (p.color !== color) continue;
      if (p.type !== "p") continue;
      const sq = FILES[f] + String(8 - r);
      if (squareColorName(sq) === colorName) n++;
    }
  }
  return n;
}

function tagToName(tag) {
  if (tag === "G") return "GREEN";
  if (tag === "Y") return "YELLOW";
  if (tag === "R") return "RED";
  if (tag === "-") return "UNKNOWN";
  return String(tag);
}

function scoreOneMinor(chess, piece) {
  const reasons = [];
  let score = 0;

  const color = piece.color;
  const opp = color === "w" ? "b" : "w";
  const sq = piece.square;

  const oppAtt = countAttackers(chess, sq, opp);
  const myDef = countAttackers(chess, sq, color);

  // (1) Loose / under-defended (catastrophic-ish)
  if (oppAtt >= myDef + 1) {
    score -= 4;
    reasons.push(`LOOSE: attacked ${oppAtt}, defended ${myDef} ⇒ tactical liability; opponent can often force trades/wins.`);
  } else {
    reasons.push(`Not loose: attacked ${oppAtt}, defended ${myDef}.`);
  }

  // (2) Tension / trade pressure
  if (oppAtt > 0) {
    score -= 1;
    reasons.push(`TENSION: currently attacked ⇒ trades can happen naturally.`);
  } else {
    score += 1;
    reasons.push(`No direct pressure ⇒ opponent must spend time to trade it.`);
  }

  // (3) Stable square proxy
  if (myDef >= 1 && oppAtt <= 1) {
    score += 2;
    reasons.push(`STABLE: defended (≥1) and not heavily challenged ⇒ piece can "stick" and keep influence.`);
  } else {
    reasons.push(`Not stable by this test (def=${myDef}, att=${oppAtt}).`);
  }

  // (4) Bad bishop proxy
  if (piece.type === "b") {
    const bc = squareColorName(sq);
    const pawns = countOwnPawnsOnColor(chess, color, bc);
    if (pawns >= 5) {
      score -= 2;
      reasons.push(`BAD BISHOP: own pawns on ${bc} squares=${pawns} ⇒ bishop may be restricted.`);
    } else {
      score += 1;
      reasons.push(`Bishop scope looks OK: own pawns on bishop-color=${pawns} (lower is better).`);
    }
  }

  // (5) Rim knight
  if (piece.type === "n") {
    if (isEdgeSquare(sq)) {
      score -= 2;
      reasons.push(`RIM KNIGHT: edge square reduces options; often a target or needs time to reroute.`);
    } else {
      score += 1;
      reasons.push(`Knight not on rim (usually more flexible).`);
    }
  }

  // (6) Mobility proxy
  let mob = 0;
  if (piece.type === "n") mob = knightMobility(chess, sq, color);
  else mob = bishopMobility(chess, sq, color);

  if (mob >= 6) {
    score += 2;
    reasons.push(`MOBILITY: attacks ${mob} squares ⇒ active; opponent may prefer to trade it.`);
  } else if (mob >= 3) {
    reasons.push(`MOBILITY: attacks ${mob} squares ⇒ average.`);
  } else {
    score -= 1;
    reasons.push(`MOBILITY: attacks ${mob} squares ⇒ cramped; candidate to trade/improve.`);
  }

  let colorTag = "Y";
  let colorName = "YELLOW";
  if (score >= 2) {
    colorTag = "G";
    colorName = "GREEN";
  } else if (score <= -2) {
    colorTag = "R";
    colorName = "RED";
  }

  if (colorTag === "R") {
    reasons.push(`TRADE PREDICTION: opponent is usually happy to exchange this minor if possible.`);
  } else if (colorTag === "G") {
    reasons.push(`TRADE PREDICTION: avoid trading this unless you win something concrete or improve structure.`);
  } else {
    reasons.push(`TRADE PREDICTION: depends—compare resulting pawn structure + remaining minors.`);
  }

  return { score, colorTag, colorName, reasons };
}

/* -----------------------------
 * Eval: mock (kept)
 * ----------------------------- */

async function mockMinorPieceEval(inputPgn, ctx) {
  logLine(ctx, "ok", `EVAL/mock: start`);
  logBlock(ctx, "ok", "mock/input", inputPgn, 2500);

  let out = ensureHeaders(inputPgn, {
    Event: "Evaluated (mock)",
    Annotator: "Priyome eval: mockMinorPiece",
  });

  out = stripEndResultToken(out);
  out = insertDrawTagsNearStart(out, `[%csl Re4,Yd4] [%cal Ge2e4]`);

  out = out.replace(/(1\.\s*\S+)(\s+)/, `$1 { mock: develop minors; avoid rim knights }$2`);
  out = out.replace(/(2\.\s*\S+(?:\s+\S+)?)/, `$1 { mock: before trading minors, ask who gains activity/structure }`);

  out = ensureTrailingResult(out);

  logBlock(ctx, "ok", "mock/output", out, 4000);
  return out;
}

/* -----------------------------
 * Eval: piecetrades (UPDATED per your rule)
 *
 * ONLY stored state across plies:
 *   - "fen-style" piece id (e.g. B1, B2, N1, N2, b1, b2, n1, n2)
 *   - last known color for that piece
 *
 * Identity is tracked by move replay:
 *   - When a minor moves: find which ID sits on "from", move it to "to".
 *   - When a piece is captured on "to": remove any tracked minor on that square.
 *
 * Coloring behavior:
 *   - Compute eval color each ply for each *alive* tracked minor.
 *   - If eval color changed from last color, update stored color and emit rationale.
 *   - If not changed, keep last color (even though eval was recomputed).
 *
 * Tag output behavior:
 *   - Emit [%csl ...] every move from START_PLY onward.
 *   - The order is deterministic by ID order to avoid rendering weirdness.
 * ----------------------------- */

async function pieceTradesEval(inputPgn, ctx) {
  logLine(ctx, "ok", `EVAL/piecetrades: start`);
  logBlock(ctx, "ok", "piecetrades/input", inputPgn, 2800);

  let base = ensureHeaders(inputPgn, {
    Event: "Evaluated (piecetrades)",
    Annotator: "Priyome eval: piecetrades",
  });

  const check = new Chess();
  const ok = tryLoadPgn(check, base, { sloppy: true });
  logLine(ctx, ok ? "ok" : "err", `EVAL/piecetrades: input parse ok? ${ok}`);
  logLine(ctx, "ok", `EVAL/piecetrades: input history length = ${check.history().length}`);

  if (!ok) {
    let fb =
      `[Event "Evaluated (piecetrades) • PARSE FAILURE"]\n` +
      `[Site "?"]\n` +
      `[Date "${nowStamp()}"]\n` +
      `[Round "-"]\n` +
      `[White "?"]\n` +
      `[Black "?"]\n` +
      `[Result "*"]\n\n` +
      `{ piecetrades: could not parse input PGN. First 800 chars:\n` +
      `${escapeCommentBody(clip(base, 800))}\n}\n` +
      `1. e4 e5 { [%csl Ye4] } *\n`;
    fb = ensureTrailingResult(fb);
    logBlock(ctx, "err", "piecetrades/fallback_output", fb, 2500);
    return fb;
  }

  const START_PLY = 10; // move 5 (after black's 5th)

  const noRes = stripEndResultToken(base);
  const { headers, moves } = splitHeadersAndMovetext(noRes);
  const tokens = tokenizeMovetext(moves);

  const tmp = new Chess();
  tryLoadPgn(tmp, noRes, { sloppy: true });
  const hist = tmp.history({ verbose: true });

  const walk = new Chess();

  // Injected comments/tags (strings) at a given ply.
  const injections = Object.create(null);

  // Tracked state:
  // id -> { id, color, type, square, lastColorTag }
  const tracked = new Map();

  // Helpers to find tracked piece by square
  function findTrackedBySquare(sq) {
    for (const p of tracked.values()) {
      if (p.square === sq) return p;
    }
    return null;
  }

  // Deterministic ID order (keeps [%csl] stable)
  const ID_ORDER = ["N1", "N2", "B1", "B2", "n1", "n2", "b1", "b2"];

  function idsInOrder() {
    return ID_ORDER.filter((id) => tracked.has(id));
  }

  function initTrackedFromPosition(chess) {
    // Assign IDs based on *starting position squares* for minors.
    // White: N1,N2,B1,B2 ; Black: n1,n2,b1,b2
    const wMin = listMinors(chess, "w");
    const bMin = listMinors(chess, "b");

    // Stable assignment: by type group then by square
    const wN = wMin.filter((p) => p.type === "n").sort((a, b) => a.square.localeCompare(b.square));
    const wB = wMin.filter((p) => p.type === "b").sort((a, b) => a.square.localeCompare(b.square));
    const bN = bMin.filter((p) => p.type === "n").sort((a, b) => a.square.localeCompare(b.square));
    const bB = bMin.filter((p) => p.type === "b").sort((a, b) => a.square.localeCompare(b.square));

    const put = (id, p) => {
      if (!p) return;
      tracked.set(id, { id, color: p.color, type: p.type, square: p.square, lastColorTag: "Y" });
    };

    put("N1", wN[0]);
    put("N2", wN[1]);
    put("B1", wB[0]);
    put("B2", wB[1]);

    put("n1", bN[0]);
    put("n2", bN[1]);
    put("b1", bB[0]);
    put("b2", bB[1]);

    logLine(ctx, "ok", `EVAL/piecetrades: initialized tracked minors: ${idsInOrder().join(", ")}`);
    for (const id of idsInOrder()) {
      const p = tracked.get(id);
      logLine(ctx, "ok", `EVAL/piecetrades: ${id} => ${p.type} ${p.color} @ ${p.square} (initial color ${p.lastColorTag})`);
    }
  }

  // Emit assumptions only once: on the first ply we produce any rationale.
  let emittedAssumptions = false;

  function addAssumptionsComment(ply, san) {
    if (emittedAssumptions) return;
    emittedAssumptions = true;
    const body = [
      "piecetrades: first rationale emission",
      `position after ${ply % 2 ? "White" : "Black"} played ${san} (ply ${ply})`,
      "",
      "Assumptions (stated once):",
      "• No engine calculation.",
      "• Human-countable features only: attacked/defended, stability, mobility, rim-knight, bad-bishop proxy.",
      "• Colors are a trade desirability hint: GREEN=keep, YELLOW=depends, RED=trade target.",
      "• Only persistent state across plies is piece-ID and last-known color.",
    ].join("\n");
    (injections[ply] ??= []).push(`{ ${escapeCommentBody(body)} }`);
  }

  function makeCslFromTracked() {
    // Use stored lastColorTag and current squares, in stable ID order.
    const parts = [];
    for (const id of idsInOrder()) {
      const p = tracked.get(id);
      if (!p || !p.square) continue;
      parts.push(`${p.lastColorTag}${p.square}`);
    }
    return parts;
  }

  // Initialize tracked minors at initial position (ply 0)
  initTrackedFromPosition(walk);

  // Run through moves, updating tracked squares via replay, and evaluating every ply.
  for (let i = 0; i < hist.length; i++) {
    const ply = i + 1;
    const mv = hist[i];

    const beforeFen = walk.fen();

    // Apply move on the main board
    const played = walk.move(mv.san, { sloppy: true });
    if (!played) {
      logLine(ctx, "err", `EVAL/piecetrades: failed to replay ply=${ply} san=${mv.san}. stopping.`);
      break;
    }

    // Update tracked identity/state based on "from/to" squares
    // 1) Captures: remove tracked minor if it was sitting on "to" before move.
    //    (For en-passant, chess.js uses to-square of capture; we only care about minors anyway.)
    if (mv.captured) {
      const capSq = mv.to;
      const victim = findTrackedBySquare(capSq);
      if (victim) {
        tracked.delete(victim.id);
        logLine(ctx, "ok", `EVAL/piecetrades: captured tracked minor ${victim.id} on ${capSq} at ply ${ply}`);
      }
    }

    // 2) Moves: if mover is a minor we track, update its square.
    //    We find by FROM square in the pre-move tracked state.
    if (mv.piece === "n" || mv.piece === "b") {
      const mover = (() => {
        for (const p of tracked.values()) {
          if (p.square === mv.from && p.type === mv.piece && p.color === mv.color) return p;
        }
        return null;
      })();
      if (mover) {
        mover.square = mv.to;
      } else {
        // This can happen if the piece was never in our tracked set (e.g., promoted bishop/knight),
        // or if it was already captured in our tracked model. We ignore by design.
        logLine(ctx, "warn", `EVAL/piecetrades: mover minor not found in tracked set: ${mv.color}${mv.piece} ${mv.from}->${mv.to} (ply ${ply})`);
      }
    }

    // Start emitting only from START_PLY
    if (ply < START_PLY) continue;

    // Evaluate each alive tracked minor, BUT only change stored color if eval changed.
    const changedIds = [];

    for (const id of idsInOrder()) {
      const p = tracked.get(id);
      if (!p) continue;

      const evalPiece = { type: p.type, color: p.color, square: p.square };
      const s = scoreOneMinor(walk, evalPiece);

      const prev = p.lastColorTag;
      const next = s.colorTag;

      if (prev !== next) {
        p.lastColorTag = next;
        changedIds.push({ id, from: prev, to: next, score: s.score, colorName: s.colorName, reasons: s.reasons, meta: { ...p } });
      }
    }

    // ALWAYS emit a coloring tag comment each move
    const cslItems = makeCslFromTracked();
    const cslTag = cslItems.length ? `[%csl ${cslItems.join(",")}]` : `[%csl ]`;
    (injections[ply] ??= []).push(`{ ${cslTag} }`);

    // Emit rationale only when any stored colors changed
    if (changedIds.length) {
      addAssumptionsComment(ply, mv.san);

      for (const ch of changedIds) {
        const sideName = ch.meta.color === "w" ? "White" : "Black";
        const pieceName = ch.meta.type === "n" ? "Knight" : "Bishop";

        const lines = [];
        lines.push(`${ch.id} (${sideName} ${pieceName} @ ${ch.meta.square}) went from ${tagToName(ch.from)} to ${tagToName(ch.to)} (score=${ch.score})`);
        for (const r of ch.reasons) lines.push(`• ${r}`);

        (injections[ply] ??= []).push(`{ ${escapeCommentBody(lines.join("\n"))} }`);
      }

      logLine(ctx, "ok", `EVAL/piecetrades: colors changed @ ply=${ply} san=${mv.san}: ${changedIds.map(x => `${x.id}:${x.from}->${x.to}`).join(", ")}`);
    }
  }

  let finalMoves = rebuildMovetextWithInsertions(tokens, injections);
  let final = headers + "\n\n" + finalMoves;

  // Guarantee at least one [%csl ...] somewhere
  if (!/\[%csl\s+[^\]]*\]/.test(final)) {
    logLine(ctx, "warn", `EVAL/piecetrades: output missing [%csl]; inserting tiny start tag`);
    final = insertDrawTagsNearStart(final, `[%csl Ye4]`);
  }

  final = ensureTrailingResult(final);

  // Sanity parse
  const fin = new Chess();
  const finOk = tryLoadPgn(fin, final, { sloppy: true });
  logLine(ctx, finOk ? "ok" : "err", `EVAL/piecetrades: output parse ok? ${finOk}`);
  logLine(ctx, "ok", `EVAL/piecetrades: output history length = ${fin.history().length}`);
  logBlock(ctx, finOk ? "ok" : "err", "piecetrades/output", final, 6000);

  return final;
}

/* -----------------------------
 * Exports: registry
 * ----------------------------- */

export const EVALS = [
  {
    id: "mock",
    name: "Mock minor-piece heuristic (verbose)",
    description:
      "Returns a loadable PGN with [%csl]/[%cal] tags + a couple comments. Logs input/output via ctx.",
    run: mockMinorPieceEval,
  },
  {
    id: "piecetrades",
    name: "Piece trades tutor (ID-based state; colors update only when eval changes)",
    description:
      'Tracks minors by IDs like "B1/B2/N1/N2" and "b1/b2/n1/n2". Recomputes eval every ply, but only changes stored color (and emits rationale) when that ID’s eval color changes.',
    run: pieceTradesEval,
  },
];

export default EVALS;
