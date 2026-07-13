/*
 * algo.js
 *
 * HUMAN-SHAPED TACTICAL PATTERN LIBRARY + ONE-STEP REASONER
 * ==========================================================
 *
 * This module is intentionally small and liftable.
 *
 * It exports:
 *
 *   ALGO
 *     Declarative rule library and predicate names.
 *
 *   observe(game)
 *     Static observation predicates for the current ScratchChess position.
 *
 *   createReasoner({ createGame })
 *     Stateful one-step tactical-reasoning driver.
 *
 *   runOnePass({ createGame, game })
 *     Non-mutating Algo-tab summary pass.
 *
 * The website owns the UI. This file owns the predicate vocabulary and the
 * human-shaped reasoning loop.
 */

const FILES = "abcdefgh";

export const MANUAL_OBSERVATION_PREDICATES = ["align", "pin", "goal", "threat", "focal_square"];

const idx = (f, r) => (7 - r) * 8 + f;
const FR = (i) => [i % 8, 7 - Math.floor(i / 8)];
const inB = (f, r) => f >= 0 && f < 8 && r >= 0 && r < 8;
const other = (c) => (c === "w" ? "b" : "w");
const sqName = (i) => {
  const [f, r] = FR(i);
  return FILES[f] + (r + 1);
};
const parseSq = (s) => idx(String(s)[0].charCodeAt(0) - 97, Number(String(s)[1]) - 1);

const pieceLetter = (p) => {
  if (!p) return "?";
  const L = ({ p: "P", n: "N", b: "B", r: "R", q: "Q", k: "K" })[p.type] || "?";
  return p.color === "w" ? L : L.toLowerCase();
};
const pieceAt = (p, i) => `${pieceLetter(p)}@${sqName(i)}`;
const stablePieceKey = (p, i) => `${p?.color || "?"}${p?.type || "?"}@${sqName(i)}`;

function clearLine(board, from, to, df, dr) {
  let [f, r] = FR(from);
  f += df;
  r += dr;
  while (inB(f, r)) {
    const k = idx(f, r);
    if (k === to) return true;
    if (board[k]) return false;
    f += df;
    r += dr;
  }
  return false;
}

export function attacksSquare(board, from, to) {
  const p = board?.[from];
  if (!p || from === to) return false;

  const [ff, fr] = FR(from);
  const [tf, tr] = FR(to);
  const df = tf - ff;
  const dr = tr - fr;
  const adf = Math.abs(df);
  const adr = Math.abs(dr);

  if (p.type === "p") {
    const dir = p.color === "w" ? 1 : -1;
    return adf === 1 && adr === 1 && dr === dir;
  }
  if (p.type === "n") return (adf === 1 && adr === 2) || (adf === 2 && adr === 1);
  if (p.type === "k") return Math.max(adf, adr) === 1;

  if ((p.type === "b" || p.type === "q") && adf === adr && adf > 0) {
    return clearLine(board, from, to, Math.sign(df), Math.sign(dr));
  }
  if ((p.type === "r" || p.type === "q") && ((df === 0 && adr > 0) || (dr === 0 && adf > 0))) {
    return clearLine(board, from, to, Math.sign(df), Math.sign(dr));
  }
  return false;
}

export function attackersOf(game, squareIndex, byColor) {
  const board = game?.state?.board || [];
  const out = [];
  for (let i = 0; i < 64; i++) {
    const p = board[i];
    if (!p || p.color !== byColor) continue;
    if (!attacksSquare(board, i, squareIndex)) continue;
    out.push({
      index: i,
      square: sqName(i),
      piece: p,
      label: pieceAt(p, i),
      key: stablePieceKey(p, i)
    });
  }
  return out;
}

function defendedByPawn(game, squareIndex, color) {
  const board = game?.state?.board || [];
  for (let i = 0; i < 64; i++) {
    const p = board[i];
    if (!p || p.color !== color || p.type !== "p") continue;
    if (attacksSquare(board, i, squareIndex)) return true;
  }
  return false;
}

function raySliderMatches(piece, df, dr) {
  if (!piece) return false;
  const diag = Math.abs(df) === 1 && Math.abs(dr) === 1;
  const ortho = Math.abs(df) + Math.abs(dr) === 1;
  if (diag) return piece.type === "b" || piece.type === "q";
  if (ortho) return piece.type === "r" || piece.type === "q";
  return false;
}

function legalMovesFor(game, color = null) {
  try {
    const c = color || game?.state?.side;
    if (c !== "w" && c !== "b") return [];
    const xs = game._allLegalMoves(c);
    return Array.isArray(xs) ? xs : [];
  } catch {
    return [];
  }
}

function isInCheck(game, color) {
  try {
    return Boolean(game._isInCheck(color));
  } catch {
    return false;
  }
}

function uciForMove(move, promo = "") {
  return sqName(move.from) + sqName(move.to) + String(promo || "").toLowerCase();
}

function moveNeedsPromotion(game, move) {
  const p = game?.state?.board?.[move.from];
  if (!p || p.type !== "p") return false;
  const [, r] = FR(move.to);
  return (p.color === "w" && r === 7) || (p.color === "b" && r === 0);
}

function cloneGame(createGame, fen) {
  const g = createGame({ Event: "algo clone", Site: "algo.js" });
  g.loadFEN(fen);
  return g;
}

function applyMoveUCI(game, uci) {
  const ok = game.makeMoveUCI(uci);
  if (!ok) return false;
  if (game.state?.pendingPromotion) {
    try {
      game.resolvePendingPromotion("Q");
    } catch {
      return false;
    }
  }
  return true;
}

function sanForMove(createGame, game, move) {
  const fen = game.exportFEN();
  const clone = cloneGame(createGame, fen);
  const uci = uciForMove(move, moveNeedsPromotion(game, move) ? "q" : "");
  const ok = applyMoveUCI(clone, uci);
  if (!ok) return uci;
  return String(clone.curNode?.san || uci).trim();
}

function afterMove(createGame, game, move) {
  const fen = game.exportFEN();
  const clone = cloneGame(createGame, fen);
  const uci = uciForMove(move, moveNeedsPromotion(game, move) ? "q" : "");
  const ok = applyMoveUCI(clone, uci);
  return ok ? clone : null;
}

function makeObs(predicate, text, extra = {}) {
  return { predicate, kind: predicate, text, humanVisible: true, ...extra };
}

export function makeManualObservation(predicate, args = [], extra = {}) {
  const name = String(predicate || "").trim();
  if (!MANUAL_OBSERVATION_PREDICATES.includes(name)) {
    throw new Error(`Unknown manual predicate: ${name}`);
  }
  const cleanArgs = Array.isArray(args)
    ? args.map(x => String(x).trim()).filter(Boolean)
    : [String(args).trim()].filter(Boolean);
  return makeObs(name, `${name}(${cleanArgs.join(",")})`, { manual: true, args: cleanArgs, ...extra });
}

export function observe(game) {
  const board = game?.state?.board || [];
  const sideToMove = game?.state?.side || "w";
  const observations = [];

  for (let target = 0; target < 64; target++) {
    const p = board[target];
    if (!p) continue;

    const enemy = other(p.color);
    const attackers = attackersOf(game, target, enemy);
    const defenders = attackersOf(game, target, p.color);

    for (const a of attackers) {
      observations.push(makeObs("attacks", `attacks(${a.label}, ${pieceAt(p, target)})`, {
        humanVisible: false,
        from: a.square,
        to: sqName(target),
        square: sqName(target),
        args: { attacker: a.key, target: stablePieceKey(p, target), side: a.piece.color }
      }));
    }

    for (const d of defenders) {
      if (d.index === target) continue;
      observations.push(makeObs("defends", `defends(${d.label}, ${pieceAt(p, target)})`, {
        humanVisible: false,
        from: d.square,
        to: sqName(target),
        square: sqName(target),
        args: { defender: d.key, target: stablePieceKey(p, target), side: d.piece.color }
      }));
    }

    if (p.type !== "k" && attackers.length > 0 && !defendedByPawn(game, target, p.color)) {
      if (attackers.length >= defenders.length) {
        observations.push(makeObs("loose", `loose(${pieceAt(p, target)})`, {
          square: sqName(target),
          side: p.color === sideToMove ? "friendly" : "enemy",
          pieceColor: p.color,
          pieceIndex: target,
          piece: p,
          attackers,
          defenders,
          args: {
            piece: stablePieceKey(p, target),
            side: p.color === sideToMove ? "friendly" : "enemy",
            attackers: attackers.length,
            defenders: defenders.length
          },
          detail: `attackers=${attackers.length}, defenders=${defenders.length}`
        }));
      }

      if (attackers.length > defenders.length) {
        observations.push(makeObs("hanging", `hanging(${pieceAt(p, target)})`, {
          square: sqName(target),
          side: p.color === sideToMove ? "friendly" : "enemy",
          pieceColor: p.color,
          pieceIndex: target,
          piece: p,
          attackers,
          defenders,
          args: {
            piece: stablePieceKey(p, target),
            side: p.color === sideToMove ? "friendly" : "enemy",
            attackers: attackers.length,
            defenders: defenders.length
          },
          detail: `attackers=${attackers.length}, defenders=${defenders.length}`
        }));
      }
    }
  }

  observations.push(...observePins(game));

  if (isInCheck(game, sideToMove)) {
    observations.push(makeObs("check", `check(${sideToMove})`, {
      side: "side_to_move",
      args: { side: sideToMove },
      detail: `${sideToMove} to move is in check`
    }));
  }

  const mates = mateInOneMoves(game);
  if (mates.length) {
    observations.push(makeObs("mate_threat", `mate_threat(${sideToMove})`, {
      side: "side_to_move",
      args: { side: sideToMove, moves: mates.map(m => m.san) },
      detail: `mate-in-1 available: ${mates.map(m => m.san).join(", ")}`
    }));
  }

  return dedupeObservations(observations);
}

export function observePins(game) {
  const board = game?.state?.board || [];
  const sideToMove = game?.state?.side || "w";
  const out = [];
  const dirs = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];

  for (const color of ["w", "b"]) {
    const kingIndex = board.findIndex(p => p && p.color === color && p.type === "k");
    if (kingIndex < 0) continue;
    const [kf, kr] = FR(kingIndex);

    for (const [df, dr] of dirs) {
      let f = kf + df;
      let r = kr + dr;
      let candidate = null;

      while (inB(f, r)) {
        const bi = idx(f, r);
        const p = board[bi];

        if (!p) {
          f += df;
          r += dr;
          continue;
        }

        if (!candidate) {
          if (p.color === color && p.type !== "k") {
            candidate = { index: bi, piece: p };
            f += df;
            r += dr;
            continue;
          }
          break;
        }

        if (p.color !== color && raySliderMatches(p, df, dr)) {
          out.push(makeObs("pin", `pin(${pieceAt(candidate.piece, candidate.index)}, ${pieceAt(board[kingIndex], kingIndex)})`, {
            square: sqName(candidate.index),
            from: sqName(bi),
            to: sqName(candidate.index),
            side: candidate.piece.color === sideToMove ? "friendly" : "enemy",
            pieceColor: candidate.piece.color,
            pieceIndex: candidate.index,
            piece: candidate.piece,
            attacker: { index: bi, square: sqName(bi), piece: p, label: pieceAt(p, bi) },
            king: { index: kingIndex, square: sqName(kingIndex), piece: board[kingIndex], label: pieceAt(board[kingIndex], kingIndex) },
            args: {
              piece: stablePieceKey(candidate.piece, candidate.index),
              pinnedTo: stablePieceKey(board[kingIndex], kingIndex),
              side: candidate.piece.color === sideToMove ? "friendly" : "enemy"
            },
            detail: `pinned to king by ${pieceAt(p, bi)}`
          }));
        }
        break;
      }
    }
  }
  return out;
}

function dedupeObservations(xs) {
  const seen = new Set();
  const out = [];
  for (const x of xs) {
    const k = `${x.predicate}:${x.text}:${x.square || ""}:${x.from || ""}:${x.to || ""}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(x);
  }
  return out;
}

function mateInOneMoves(game) {
  const createGame = game.__algoCreateGame;
  if (!createGame) return [];

  const moves = legalMovesFor(game);
  const out = [];
  for (const move of moves) {
    const after = afterMove(createGame, game, move);
    if (!after) continue;
    const defender = after.state.side;
    if (isInCheck(after, defender) && legalMovesFor(after, defender).length === 0) {
      out.push({
        move,
        uci: uciForMove(move, moveNeedsPromotion(game, move) ? "q" : ""),
        san: String(after.curNode?.san || uciForMove(move)).trim()
      });
    }
  }
  return out;
}

function enemyLoosePieces(observations) {
  return observations.filter(o => o.predicate === "loose" && o.side === "enemy");
}

function defendersOfPiece(observations, pieceKey) {
  return observations
    .filter(o => o.predicate === "defends" && o.args?.target === pieceKey)
    .map(o => o.args?.defender)
    .filter(Boolean);
}

function indexFromPieceKey(pieceKey) {
  const m = String(pieceKey || "").match(/@([a-h][1-8])$/);
  return m ? parseSq(m[1]) : null;
}

function moveCapturesTarget(game, move, targetIndex) {
  return targetIndex != null && move.to === targetIndex && Boolean(game.state.board[targetIndex]);
}

function moveAttackerDelta(createGame, game, move, targetIndex, attackingColor) {
  if (targetIndex == null) return 0;
  const before = attackersOf(game, targetIndex, attackingColor).length;
  const after = afterMove(createGame, game, move);
  if (!after) return 0;
  if (!after.state.board[targetIndex]) return 0;
  return attackersOf(after, targetIndex, attackingColor).length - before;
}

function defenderRemoved(createGame, game, move, defenderIndex, looseIndex, defenderColor) {
  if (defenderIndex == null || looseIndex == null) return false;
  const beforeDefenders = attackersOf(game, looseIndex, defenderColor).map(x => x.index);
  if (!beforeDefenders.includes(defenderIndex)) return false;

  const after = afterMove(createGame, game, move);
  if (!after) return false;
  if (!after.state.board[looseIndex]) return true;

  const afterDefenders = attackersOf(after, looseIndex, defenderColor).map(x => x.index);
  return !afterDefenders.includes(defenderIndex);
}

function createsCheck(createGame, game, move) {
  const after = afterMove(createGame, game, move);
  return after ? isInCheck(after, after.state.side) : false;
}

function createsMate(createGame, game, move) {
  const after = afterMove(createGame, game, move);
  if (!after) return false;
  const defender = after.state.side;
  return isInCheck(after, defender) && legalMovesFor(after, defender).length === 0;
}

function makeCandidate(createGame, game, move, looseObs, observations) {
  const mover = game.state.side;
  const looseIndex = looseObs.pieceIndex;
  const looseKey = looseObs.args?.piece;
  const looseColor = looseObs.pieceColor;
  const defenderKeys = defendersOfPiece(observations, looseKey);

  const reasons = [];
  let score = 0;

  if (moveCapturesTarget(game, move, looseIndex)) {
    reasons.push(`captures loose piece ${looseObs.text}`);
    score += 100;
  }

  for (const dk of defenderKeys) {
    const defenderIndex = indexFromPieceKey(dk);

    if (moveCapturesTarget(game, move, defenderIndex)) {
      reasons.push(`captures defender ${dk}`);
      score += 70;
    }

    const delta = moveAttackerDelta(createGame, game, move, defenderIndex, mover);
    if (delta > 0) {
      reasons.push(`adds attacker to defender ${dk}`);
      score += 50 + delta;
    }

    if (defenderRemoved(createGame, game, move, defenderIndex, looseIndex, looseColor)) {
      reasons.push(`removes defender ${dk}`);
      score += 60;
    }
  }

  if (createsCheck(createGame, game, move)) {
    reasons.push("creates check");
    score += 35;
  }

  if (createsMate(createGame, game, move)) {
    reasons.push("creates mate");
    score += 1000;
  }

  if (!reasons.length) return null;

  const after = afterMove(createGame, game, move);
  const san = after?.curNode?.san || uciForMove(move, moveNeedsPromotion(game, move) ? "q" : "");

  return {
    move,
    uci: uciForMove(move, moveNeedsPromotion(game, move) ? "q" : ""),
    san,
    score,
    reasons,
    looseObs,
    ruleId: "loose_piece"
  };
}

export function candidateMovesForLoosePieceRule(createGame, game, observations) {
  const looseTargets = enemyLoosePieces(observations);
  const moves = legalMovesFor(game);
  const out = [];

  for (const loose of looseTargets) {
    for (const move of moves) {
      const c = makeCandidate(createGame, game, move, loose, observations);
      if (c) out.push(c);
    }
  }

  out.sort((a, b) => b.score - a.score || String(a.san).localeCompare(String(b.san)));

  const seen = new Set();
  const deduped = [];
  for (const c of out) {
    if (seen.has(c.uci)) continue;
    seen.add(c.uci);
    deduped.push(c);
  }

  return deduped.slice(0, ALGO.rulesById.loose_piece.candidateConstraints.maximum);
}

function relevantReplies(createGame, game, candidate) {
  const replies = legalMovesFor(game);
  const out = [];

  for (const move of replies) {
    const san = sanForMove(createGame, game, move);
    const board = game.state.board;
    const reasons = [];

    if (createsCheck(createGame, game, move)) reasons.push("gives check");
    if (createsMate(createGame, game, move)) reasons.push("creates mate");
    if (board[move.to]) reasons.push("captures");

    const after = afterMove(createGame, game, move);
    if (after && candidate?.looseObs?.pieceIndex != null && after.state.board[candidate.looseObs.pieceIndex]) {
      const targetColor = candidate.looseObs.pieceColor;
      const defenders = attackersOf(after, candidate.looseObs.pieceIndex, targetColor);
      if (defenders.length) reasons.push("still protects loose piece");
    }

    if (reasons.length) {
      out.push({ move, uci: uciForMove(move, moveNeedsPromotion(game, move) ? "q" : ""), san, reasons });
    }
  }

  return out.slice(0, ALGO.rulesById.loose_piece.replyConstraints.maximumPerClass);
}

function terminalState(game) {
  const side = game?.state?.side;
  const moves = legalMovesFor(game, side);
  if (moves.length > 0) return null;
  if (isInCheck(game, side)) {
    return { status: "solved", verdict: "checkmate", log: `${side} is checkmated. The tactic is solved at this leaf.` };
  }
  return { status: "inconclusive", verdict: "stalemate", log: "No legal moves, but not checkmate. Search is inconclusive." };
}

export const ALGO = {
  version: "0.5.0",
  objective: { materialAdvantagePawns: 2, opponentMayHaveThreat: false },
  observationPredicates: ["loose", "hanging", "pin", "attacks", "defends", "check", "mate_threat", "align", "goal", "threat", "focal_square"],
  humanVisibleObservationPredicates: ["loose", "hanging", "pin", "check", "mate_threat", "align", "goal", "threat", "focal_square"],
  candidatePredicates: ["adds_attacker", "removes_defender", "captures", "creates_check", "creates_mate_threat", "creates_higher_order_threat"],
  replyPredicates: ["still_defends", "answers_threat", "gives_check", "creates_threat"],
  rules: [
    {
      id: "loose_piece",
      when: [{ predicate: "loose", args: { piece: "$loosePiece", side: "enemy" } }],
      hint: "I see a loose piece. Can I capture it, capture its defender, or add an attacker to its defender?",
      depth: { candidatePlies: 1, replyPlies: 1 },
      candidateConstraints: {
        maximum: 3,
        requireAny: [
          { predicate: "captures", args: { candidate: "$candidate", target: "$loosePiece" } },
          { all: [{ predicate: "defends", args: { defender: "$defender", target: "$loosePiece" } }, { predicate: "adds_attacker", args: { candidate: "$candidate", target: "$defender", minimumAdded: 1 } }] },
          { all: [{ predicate: "defends", args: { defender: "$defender", target: "$loosePiece" } }, { predicate: "captures", args: { candidate: "$candidate", target: "$defender" } }] },
          { all: [{ predicate: "defends", args: { defender: "$defender", target: "$loosePiece" } }, { predicate: "removes_defender", args: { candidate: "$candidate", defender: "$defender", target: "$loosePiece" } }] }
        ],
        prefer: [
          { predicate: "captures", args: { candidate: "$candidate", target: "$loosePiece" } },
          { predicate: "creates_check", args: { candidate: "$candidate" } },
          { all: [{ predicate: "defends", args: { defender: "$defender", target: "$loosePiece" } }, { predicate: "adds_attacker", args: { candidate: "$candidate", target: "$defender", minimumAdded: 1 } }] }
        ],
        exclude: []
      },
      candidateMarker: {
        label: "Loose-piece idea",
        explain: [
          "This move acts against a loose piece or its defender.",
          "Prefer direct captures, checks, captures of defenders, and added attackers on defenders."
        ]
      },
      replyConstraints: {
        maximumPerClass: 5,
        retainAny: [
          { id: "still_protects_loose_piece", label: "Still protects loose piece" },
          { id: "answers_our_threat", label: "Answers threat" },
          { id: "check", label: "Check" },
          { id: "mate_threat", label: "Mate threat" },
          { id: "higher_order_threat", label: "Higher-order threat" }
        ],
        ignoreRestBecause: "Replies that neither preserve the loose piece, answer our threat, nor create a higher-order threat do not address the tactical idea."
      },
      then: "rescan"
    }
  ]
};

ALGO.rulesById = Object.fromEntries(ALGO.rules.map(r => [r.id, r]));

export function humanVisibleObservations(observations) {
  const allowed = new Set(ALGO.humanVisibleObservationPredicates);
  return observations.filter(o => allowed.has(o.predicate));
}

export function createReasoner({ createGame, maxSteps = 48 } = {}) {
  if (typeof createGame !== "function") {
    throw new Error("createReasoner requires { createGame } from scratchchess.js");
  }

  const state = {
    phase: "observe",
    stepCount: 0,
    status: "searching",
    activeRule: null,
    observations: [],
    candidates: [],
    candidateIndex: 0,
    activeCandidate: null,
    replies: [],
    replyIndex: 0,
    lastFen: ""
  };

  function reset() {
    state.phase = "observe";
    state.stepCount = 0;
    state.status = "searching";
    state.activeRule = null;
    state.observations = [];
    state.candidates = [];
    state.candidateIndex = 0;
    state.activeCandidate = null;
    state.replies = [];
    state.replyIndex = 0;
    state.lastFen = "";
  }

  function observeWithCreateGame(game) {
    game.__algoCreateGame = createGame;
    return observe(game);
  }

  function syncToExternalBoard(game) {
    const fen = game.exportFEN();
    if (state.lastFen && fen !== state.lastFen && state.phase !== "observe") {
      state.phase = "observe";
      state.activeRule = null;
      state.candidates = [];
      state.activeCandidate = null;
      state.replies = [];
    }
    state.lastFen = fen;
  }

  function step(game) {
    if (!game) throw new Error("step(game) requires a ScratchChess game");
    syncToExternalBoard(game);

    if (state.status !== "searching") {
      return { type: "done", status: state.status, log: `Search already ended: ${state.status}. Reset the reasoner to search again.`, observations: humanVisibleObservations(state.observations) };
    }

    state.stepCount += 1;
    if (state.stepCount > maxSteps) {
      state.status = "inconclusive";
      return { type: "terminal", status: "inconclusive", log: `Search exceeded ${maxSteps} steps. Remaining inconclusive.`, observations: humanVisibleObservations(state.observations) };
    }

    const terminal = terminalState(game);
    if (terminal) {
      state.status = terminal.status;
      return { type: "terminal", ...terminal, observations: humanVisibleObservations(state.observations) };
    }

    if (state.phase === "observe") {
      state.observations = observeWithCreateGame(game);
      const visible = humanVisibleObservations(state.observations);
      const loose = enemyLoosePieces(state.observations);

      if (!loose.length) {
        state.status = "inconclusive";
        return {
          type: "observe",
          status: "inconclusive",
          observations: visible,
          comment: visible.length ? `observed: ${visible.map(o => o.text).join("; ")}` : "",
          log: visible.length
            ? `Observed ${visible.length} predicate(s), but no active rule matched. Search remains inconclusive.`
            : "No human-visible predicates and no active rule matched. Search remains inconclusive."
        };
      }

      state.activeRule = ALGO.rulesById.loose_piece;
      state.phase = "candidates";
      return {
        type: "observe",
        status: "searching",
        rule: state.activeRule,
        observations: visible,
        comment: visible.length ? `observed: ${visible.map(o => o.text).join("; ")}` : "",
        log: `${state.activeRule.hint} Found ${loose.length} enemy loose piece predicate(s).`
      };
    }

    if (state.phase === "candidates") {
      state.candidates = candidateMovesForLoosePieceRule(createGame, game, state.observations);
      state.candidateIndex = 0;

      if (!state.candidates.length) {
        state.status = "inconclusive";
        return { type: "candidates", status: "inconclusive", observations: humanVisibleObservations(state.observations), log: "Loose-piece rule matched, but no candidate survived the human-sized constraints." };
      }

      state.phase = "play_candidate";
      return {
        type: "candidates",
        status: "searching",
        candidates: state.candidates,
        observations: humanVisibleObservations(state.observations),
        comment: `candidate scan: ${state.candidates.map(c => `${c.san} [${c.reasons.join(", ")}]`).join("; ")}`,
        log: `Candidate scan retained ${state.candidates.length} move(s): ${state.candidates.map(c => c.san).join(", ")}.`
      };
    }

    if (state.phase === "play_candidate") {
      if (state.candidateIndex >= state.candidates.length) {
        state.status = "not_true";
        return { type: "terminal", status: "not_true", observations: humanVisibleObservations(state.observations), log: "All retained candidates were exhausted under the current rule. The tactic is not proven true in this search." };
      }

      const c = state.candidates[state.candidateIndex++];
      state.activeCandidate = c;
      const ok = applyMoveUCI(game, c.uci);
      if (!ok) return { type: "error", status: "searching", log: `Tried to play candidate ${c.san}, but ScratchChess rejected ${c.uci}.`, candidate: c };

      state.phase = "replies";
      state.lastFen = game.exportFEN();
      return { type: "play_candidate", status: "searching", candidate: c, playedMove: c, comment: `algo candidate: ${c.reasons.join("; ")}`, log: `Played candidate ${c.san}: ${c.reasons.join("; ")}.` };
    }

    if (state.phase === "replies") {
      const terminalAfterCandidate = terminalState(game);
      if (terminalAfterCandidate) {
        state.status = terminalAfterCandidate.status;
        return { type: "terminal", ...terminalAfterCandidate, comment: terminalAfterCandidate.verdict, observations: humanVisibleObservations(state.observations) };
      }

      state.replies = relevantReplies(createGame, game, state.activeCandidate);
      state.replyIndex = 0;

      if (!state.replies.length) {
        state.status = "inconclusive";
        return { type: "replies", status: "inconclusive", comment: "reply scan: no retained replies", log: "Candidate was played, but no enemy reply matched the retained reply classes. Search remains inconclusive until deeper rules are added." };
      }

      state.phase = "play_reply";
      return {
        type: "replies",
        status: "searching",
        replies: state.replies,
        comment: `reply scan: ${state.replies.map(r => `${r.san} [${r.reasons.join(", ")}]`).join("; ")}`,
        log: `Retained ${state.replies.length} enemy repl${state.replies.length === 1 ? "y" : "ies"}: ${state.replies.map(r => r.san).join(", ")}.`
      };
    }

    if (state.phase === "play_reply") {
      const r = state.replies[state.replyIndex++];
      if (!r) {
        state.phase = "observe";
        return { type: "rescan", status: "searching", log: "No reply left in this class. Rescanning the current position." };
      }

      const ok = applyMoveUCI(game, r.uci);
      if (!ok) return { type: "error", status: "searching", log: `Tried to play reply ${r.san}, but ScratchChess rejected ${r.uci}.`, reply: r };

      state.phase = "observe";
      state.lastFen = game.exportFEN();
      return { type: "play_reply", status: "searching", reply: r, playedMove: r, comment: `algo retained reply: ${r.reasons.join("; ")}`, log: `Played retained reply ${r.san}: ${r.reasons.join("; ")}. Rescan next.` };
    }

    state.phase = "observe";
    return { type: "rescan", status: "searching", log: "Unknown phase; resetting to observation scan." };
  }

  return { state, reset, observe: observeWithCreateGame, step };
}

function scoreCandidateForDisplay(candidate) {
  const base = Number(candidate?.score || 0);
  let bonus = 0;
  const reasons = candidate?.reasons || [];
  if (reasons.some(r => /mate/.test(r))) bonus += 1000;
  if (reasons.some(r => /check/.test(r))) bonus += 100;
  if (reasons.some(r => /captures/.test(r))) bonus += 80;
  if (reasons.some(r => /defender|attacker/.test(r))) bonus += 50;
  return base + bonus;
}

export function runOnePass({ createGame, game, observations = null, maxCandidates = 5 } = {}) {
  if (!game) {
    return {
      type: "algo_pass",
      status: "error",
      observations: [],
      candidates: [],
      steps: ["No ScratchChess game was provided."],
      log: "algo pass failed: no game"
    };
  }

  const obs = observations || (typeof createGame === "function" ? (() => {
    game.__algoCreateGame = createGame;
    return observe(game);
  })() : observe(game));
  const visible = humanVisibleObservations(obs);

  let candidates = [];
  if (typeof createGame === "function") {
    candidates = candidateMovesForLoosePieceRule(createGame, game, obs)
      .slice()
      .sort((a, b) => scoreCandidateForDisplay(b) - scoreCandidateForDisplay(a) || String(a.san).localeCompare(String(b.san)))
      .slice(0, maxCandidates);
  }

  const steps = [];
  steps.push(`Head FEN: ${game.exportFEN?.() || "(unknown)"}`);
  steps.push(`Side to move: ${game.state?.side === "b" ? "black" : "white"}.`);

  if (visible.length) steps.push(`Notice: ${visible.map(o => o.text).join("; ")}.`);
  else steps.push("Notice: no human-visible predicates fired yet.");

  const loose = enemyLoosePieces(obs);
  if (loose.length) steps.push(`Loose-piece rule is active: ${loose.map(o => o.text).join("; ")}.`);
  else steps.push("No enemy loose piece rule matched, so the current reasoner has no forced tactic claim yet.");

  if (candidates.length) {
    steps.push(`Candidate moves: ${candidates.map(c => `${c.san} [${c.reasons.join(", ")}]`).join("; ")}.`);
    steps.push("UI action: play the first candidate on the board; to compare siblings, click root or a ply anchor and play another candidate.");
  } else {
    steps.push("No retained candidate moves under the current human-sized constraints.");
  }

  return {
    type: "algo_pass",
    status: candidates.length ? "searching" : "inconclusive",
    observations: visible,
    candidates,
    steps,
    log: `algo pass: ${steps.join(" / ")}`
  };
}

export function describeAlgorithm() {
  return [
    "Automated human-like theorem-proving stepper:",
    "",
    "1. Observe the current position using algo.js observation predicates.",
    "2. Activate a small human-shaped rule, currently loose_piece.",
    "3. Retain only a few candidate moves that match the rule.",
    "4. Play one candidate, then retain only important enemy replies.",
    "5. Play one retained reply and rescan from the new position.",
    "6. Use the UI anchors/root/ply navigation to branch candidates without losing the tree.",
    "7. End as solved, not_true, or inconclusive when the current search can no longer proceed."
  ].join("\n");
}

export const describe = describeAlgorithm;

export default ALGO;

if (typeof window !== "undefined") {
  window.ALGO = ALGO;
  window.ALGO_MODULE = {
    ALGO,
    observe,
    observePins,
    humanVisibleObservations,
    makeManualObservation,
    candidateMovesForLoosePieceRule,
    createReasoner,
    runOnePass,
    describeAlgorithm,
    describe
  };
  window.algo = {
    ALGO,
    observe,
    humanVisibleObservations,
    createReasoner,
    runOnePass,
    describe: describeAlgorithm
  };
}
