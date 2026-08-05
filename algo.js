/*
 * algo.js
 *
 * POLICY IMPLEMENTER + PREDICATE DEFINER
 * ======================================
 *
 * ScratchChess owns the board, legal move generation, SAN, FEN transitions,
 * and the variation tree. This module deliberately does not generate chess
 * moves. At every cycle it asks ScratchChess for every legal one-ply move,
 * annotates the current position and each resulting position with predicates,
 * and lets a JSON policy FILTER that complete legal move set.
 *
 * Canonical trace cycle:
 *   THINK OBSERVE.
 *   SAW ...
 *   CANDIDATES ... / REPLIES ...
 *   TRY ... / REPLY ...
 *   REPORT STATE {...}
 *   END SOLVE ... / END FAIL ...
 *
 * Policies are data. Predicate, condition, filter, and reply-rule registries
 * are explicit and inspectable so the learning model can be extended without
 * replacing the search driver.
 */

export const POLICY_VERSION = "predicate-chess-policy/v5";
export const TRACE_VERSION = "predicate-chess-trace/v1";
export const DEFAULT_POLICY_URL = new URL("./engine/alpha.json", import.meta.url).href;
export const DEFAULT_TESTS_URL = new URL("./engine/test_cases.json", import.meta.url).href;

const FILES = "abcdefgh";
const COLORS = Object.freeze(["w", "b"]);
const PROMOTIONS = Object.freeze(["q", "r", "b", "n"]);
const PIECE_VALUES = Object.freeze({ p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 });
const GAIN_VALUES = Object.freeze({ pawn: 1, minor_piece: 3, exchange: 2, rook: 5, queen: 9 });
const OBSERVATION_PRIORITY = Object.freeze({
  mate: 0,
  in_check: 1,
  mate_in_1: 2,
  check: 3,
  hanging: 4,
  loose: 5,
  pin: 6,
  skewer: 7,
  fork: 8,
  double_attack: 9,
  shared_defender: 10,
  overloaded: 11,
  sole_defender: 12,
  alignment: 13,
  attacked: 14,
  defenders: 15,
  mobility_trap: 16,
  restricted_mobility: 17,
  passed_pawn: 18,
  promotion_threat: 19,
  capture: 20,
  line_blocker: 21
});

const PREDICATE_DEFINITIONS = new Map();
const MOVE_FILTERS = new Map();
const CONDITIONS = new Map();
const REPLY_RULES = new Map();

function asArray(value) {
  return Array.isArray(value) ? value : value == null ? [] : [value];
}

function other(color) {
  return color === "w" ? "b" : "w";
}

function colorName(color) {
  return color === "w" ? "white" : "black";
}

function indexToSquare(index) {
  const file = index % 8;
  const rank = 8 - Math.floor(index / 8);
  return `${FILES[file]}${rank}`;
}

function squareToIndex(square) {
  const text = String(square || "").toLowerCase();
  if (!/^[a-h][1-8]$/.test(text)) return -1;
  const file = FILES.indexOf(text[0]);
  const rank = Number(text[1]);
  return (8 - rank) * 8 + file;
}

function coords(index) {
  return [index % 8, 7 - Math.floor(index / 8)];
}

function indexFromCoords(file, rank) {
  return (7 - rank) * 8 + file;
}

function onBoard(file, rank) {
  return file >= 0 && file < 8 && rank >= 0 && rank < 8;
}

function pieceValue(piece) {
  return piece ? PIECE_VALUES[piece.type] || 0 : 0;
}

function clonePiece(piece) {
  return piece ? { id: piece.id, color: piece.color, type: piece.type } : null;
}

function copyBoard(board) {
  return (board || []).map(clonePiece);
}

function pieceToken(piece, squareOrIndex) {
  if (!piece) return "empty";
  const square = typeof squareOrIndex === "number" ? indexToSquare(squareOrIndex) : String(squareOrIndex || "?");
  return `${piece.color}${piece.type.toUpperCase()}@${square}`;
}

function uniqueSorted(values) {
  return [...new Set(asArray(values).filter((value) => value != null && String(value).trim()).map(String))].sort();
}

function deepClone(value) {
  if (typeof structuredClone === "function") {
    try { return structuredClone(value); } catch {}
  }
  return JSON.parse(JSON.stringify(value));
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!value || typeof value !== "object") return value;
  const output = {};
  for (const key of Object.keys(value).sort()) output[key] = stableValue(value[key]);
  return output;
}

export function stableStringify(value) {
  return JSON.stringify(stableValue(value));
}

function sanitizeRulePart(value) {
  return String(value || "unnamed").trim().replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_.-]/g, "");
}

function observationKey(observation) {
  return `${observation.predicate || observation.kind}|${observation.text}`;
}

function normalizeObservation(raw, fallbackPredicate = "manual") {
  if (typeof raw === "string") {
    return { predicate: fallbackPredicate, kind: fallbackPredicate, text: raw, humanVisible: true };
  }
  const predicate = String(raw?.predicate || raw?.kind || fallbackPredicate);
  return {
    ...raw,
    predicate,
    kind: predicate,
    text: String(raw?.text || `${predicate}()`),
    humanVisible: raw?.humanVisible !== false
  };
}

/**
 * Register or replace a predicate definition.
 *
 * A custom evaluator receives the current inspection context and may return
 * one observation or an array of observations. It must not mutate the game.
 */
export function definePredicate(nameOrDefinition, maybeDefinition = {}) {
  const definition = typeof nameOrDefinition === "string"
    ? { ...maybeDefinition, name: nameOrDefinition }
    : { ...(nameOrDefinition || {}) };
  const name = String(definition.name || "").trim();
  if (!name) throw new Error("definePredicate requires a name");
  const normalized = Object.freeze({
    name,
    signature: definition.signature || `${name}(...)`,
    description: definition.description || "Policy-visible chess predicate.",
    humanVisible: definition.humanVisible !== false,
    manual: Boolean(definition.manual),
    evaluate: typeof definition.evaluate === "function" ? definition.evaluate : null
  });
  PREDICATE_DEFINITIONS.set(name, normalized);
  return normalized;
}

export function defineMoveFilter(name, predicate) {
  if (!name || typeof predicate !== "function") throw new Error("defineMoveFilter(name, fn) required");
  MOVE_FILTERS.set(String(name), predicate);
  return predicate;
}

export function defineCondition(name, predicate) {
  if (!name || typeof predicate !== "function") throw new Error("defineCondition(name, fn) required");
  CONDITIONS.set(String(name), predicate);
  return predicate;
}

export function defineReplyRule(name, predicate) {
  if (!name || typeof predicate !== "function") throw new Error("defineReplyRule(name, fn) required");
  REPLY_RULES.set(String(name), predicate);
  return predicate;
}

export function predicateCatalog() {
  return [...PREDICATE_DEFINITIONS.values()].map(({ evaluate, ...metadata }) => ({ ...metadata }));
}

export const PREDICATE_CATALOG = predicateCatalog;

export function humanVisibleObservations(predicates) {
  const seen = new Set();
  const output = [];
  for (const raw of predicates || []) {
    const observation = normalizeObservation(raw);
    const definition = PREDICATE_DEFINITIONS.get(observation.predicate);
    if (definition?.humanVisible === false || observation.humanVisible === false) continue;
    const key = observationKey(observation);
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(observation);
  }
  return output;
}

function installPredicateCatalog() {
  const definitions = [
    ["check", "check(side)", "A move gives check or the side to move is checked."],
    ["in_check", "in_check(side)", "The side to move is in check."],
    ["mate", "mate(winner)", "The side to move is checkmated."],
    ["mate_in_1", "mate_in_1(side, moves)", "At least one legal move checkmates immediately."],
    ["mate_threat", "mate_threat(move)", "A one-ply result leaves very restricted king mobility and a visible mating threat."],
    ["capture", "capture(move, target)", "A legal one-ply move captures a piece."],
    ["attacked", "attacked(piece, attackers)", "An occupied square is attacked by the opposing color."],
    ["loose", "loose(piece)", "A non-king has no pawn defender and attackers are at least as numerous as defenders."],
    ["hanging", "hanging(piece)", "A non-king has no pawn defender and more attackers than defenders."],
    ["defenders", "defenders(piece, count)", "The number of same-color pieces defending an occupied square."],
    ["sole_defender", "sole_defender(defender, target)", "Exactly one piece defends a loose or pressured target."],
    ["shared_defender", "shared_defender(defender, targets)", "One piece defends at least two loose or pressured targets."],
    ["overloaded", "overloaded(defender, targets)", "A shared defender is carrying multiple tactical duties."],
    ["alignment", "alignment(front, middle, back, line)", "Exactly three occupied pieces form a slider-relevant line with opposite-colored endpoints."],
    ["line_blocker", "line_blocker(piece, line)", "The middle piece is the blocker in a three-piece alignment."],
    ["pin", "pin(piece, king)", "A middle piece is absolutely pinned to its king by an enemy slider."],
    ["skewer", "skewer(frontTarget, backTarget)", "A higher-value front target and lower-value back target share an enemy slider line."],
    ["fork", "fork(move, targets)", "A one-ply move attacks at least two objective-relevant targets."],
    ["double_attack", "double_attack(move, targets)", "A one-ply move attacks two occupied enemy targets."],
    ["xray", "xray(attacker, blocker, target)", "A slider relation exists through one blocker."],
    ["discovered_attack", "discovered_attack(move, target)", "Moving a line blocker reveals a slider attack."],
    ["clearance", "clearance(move, line)", "A move vacates a line-blocking square."],
    ["interference", "interference(move, line)", "A move occupies or removes a critical line square."],
    ["deflection", "deflection(move, defender)", "A capture removes a defender from a tactical duty."],
    ["restricted_mobility", "restricted_mobility(piece, safeSquares)", "An attacked piece has very few legal or safe destinations."],
    ["mating_net", "mating_net(king, mobility)", "The king has little legal mobility in the one-ply result."],
    ["passed_pawn", "passed_pawn(piece)", "A pawn has no opposing pawn ahead on its file or adjacent files."],
    ["promotion_threat", "promotion_threat(move)", "A pawn can promote immediately or reaches the seventh rank with force."],
    ["recapture", "recapture(move, square)", "A capture returns on the immediately preceding destination square."],
    ["capture_order", "capture_order(move, value)", "A capture is classified by the value of the captured piece."],
    ["safe_retreat", "safe_retreat(move)", "The moved piece is not loose in the one-ply result."],
    ["mobility_trap", "mobility_trap(piece)", "An attacked non-pawn, non-king has no legal move of its own."],
    ["major_piece_counterattack", "major_piece_counterattack(move, target)", "A move attacks a rook or queen with tempo."],
    ["manual", "manual(text)", "A human-authored observation attached to a node.", true]
  ];
  for (const [name, signature, description, manual = false] of definitions) {
    definePredicate({ name, signature, description, humanVisible: true, manual });
  }
  definePredicate({ name: "goal", signature: "goal(x)", description: "Manual tactical objective.", manual: true });
  definePredicate({ name: "threat", signature: "threat(x)", description: "Manual forcing-threat observation.", manual: true });
  definePredicate({ name: "focal_square", signature: "focal_square(square)", description: "Manual focal square.", manual: true });
}

installPredicateCatalog();

export const MANUAL_OBSERVATION_PREDICATES = Object.freeze(
  predicateCatalog().filter((item) => item.manual).map((item) => item.name)
);
export const HUMAN_VISIBLE_PREDICATES = Object.freeze(
  predicateCatalog().filter((item) => item.humanVisible).map((item) => item.name)
);

function makeGame(createGame, fen) {
  if (typeof createGame !== "function") throw new Error("A ScratchChess createGame function is required");
  const game = createGame({ Event: "Policy simulation", Site: "algo.js" });
  if (!game || typeof game.loadFEN !== "function") throw new Error("createGame did not return a ScratchChess-compatible Game");
  game.loadFEN(fen);
  return game;
}

function applyUci(game, uci) {
  const move = String(uci || "").toLowerCase();
  const ok = game.makeMoveUCI(move);
  if (!ok) throw new Error(`ScratchChess rejected legal move ${move}`);
  if (game.state?.pendingPromotion || game._pendingPromotion) {
    const promotion = (move[4] || "q").toUpperCase();
    game.resolvePendingPromotion(promotion);
  }
  return game.curNode;
}

function allLegalMoveSeeds(game) {
  const side = game.state?.side || "w";
  let raw = [];
  if (typeof game._allLegalMoves === "function") {
    raw = game._allLegalMoves(side) || [];
  } else if (typeof game._legalMovesFrom === "function") {
    for (let from = 0; from < 64; from += 1) {
      const piece = game.state?.board?.[from];
      if (!piece || piece.color !== side) continue;
      for (const to of game._legalMovesFrom(from, side) || []) raw.push({ from, to });
    }
  } else {
    throw new Error("ScratchChess Game must expose _allLegalMoves or _legalMovesFrom");
  }

  const output = [];
  for (const entry of raw) {
    const from = Number(entry.from);
    const to = Number(entry.to);
    const piece = game.state.board[from];
    if (!piece) continue;
    const [, targetRank] = coords(to);
    const promotes = piece.type === "p" && targetRank === (piece.color === "w" ? 7 : 0);
    const promotionList = promotes ? PROMOTIONS : [""];
    for (const promotion of promotionList) {
      output.push({
        from,
        to,
        promotion,
        uci: `${indexToSquare(from)}${indexToSquare(to)}${promotion}`
      });
    }
  }

  const seen = new Set();
  return output
    .filter((entry) => !seen.has(entry.uci) && seen.add(entry.uci))
    .sort((a, b) => a.uci.localeCompare(b.uci));
}

function boardMaterial(board) {
  const totals = { w: 0, b: 0 };
  for (const piece of board || []) {
    if (!piece || piece.type === "k") continue;
    totals[piece.color] += pieceValue(piece);
  }
  return totals;
}

function materialDifference(board, side) {
  const totals = boardMaterial(board);
  return totals[side] - totals[other(side)];
}

function lineClear(board, from, to) {
  const [ff, fr] = coords(from);
  const [tf, tr] = coords(to);
  const df = Math.sign(tf - ff);
  const dr = Math.sign(tr - fr);
  let file = ff + df;
  let rank = fr + dr;
  while (file !== tf || rank !== tr) {
    if (board[indexFromCoords(file, rank)]) return false;
    file += df;
    rank += dr;
  }
  return true;
}

function pieceAttacksSquare(board, from, target) {
  const piece = board[from];
  if (!piece || from === target) return false;
  const [ff, fr] = coords(from);
  const [tf, tr] = coords(target);
  const df = tf - ff;
  const dr = tr - fr;
  const adf = Math.abs(df);
  const adr = Math.abs(dr);

  if (piece.type === "p") {
    const direction = piece.color === "w" ? 1 : -1;
    return adr === 1 && adf === 1 && dr === direction;
  }
  if (piece.type === "n") return (adf === 1 && adr === 2) || (adf === 2 && adr === 1);
  if (piece.type === "k") return Math.max(adf, adr) === 1;
  if (piece.type === "b") return adf === adr && lineClear(board, from, target);
  if (piece.type === "r") return (df === 0 || dr === 0) && lineClear(board, from, target);
  if (piece.type === "q") return (df === 0 || dr === 0 || adf === adr) && lineClear(board, from, target);
  return false;
}

function attackersOf(board, target, color) {
  const output = [];
  for (let from = 0; from < 64; from += 1) {
    const piece = board[from];
    if (!piece || piece.color !== color) continue;
    if (pieceAttacksSquare(board, from, target)) output.push(from);
  }
  return output.sort((a, b) => a - b);
}

function attackedPiecesFrom(board, from) {
  const piece = board[from];
  if (!piece) return [];
  const output = [];
  for (let target = 0; target < 64; target += 1) {
    const victim = board[target];
    if (!victim || victim.color === piece.color) continue;
    if (pieceAttacksSquare(board, from, target)) output.push(target);
  }
  return output.sort((a, b) => a - b);
}

function isSliderForDirection(piece, df, dr) {
  if (!piece) return false;
  const diagonal = Math.abs(df) === Math.abs(dr) && df !== 0;
  const orthogonal = (df === 0) !== (dr === 0);
  if (piece.type === "q") return diagonal || orthogonal;
  if (piece.type === "b") return diagonal;
  if (piece.type === "r") return orthogonal;
  return false;
}

function lineKind(df, dr) {
  if (df === 0) return "file";
  if (dr === 0) return "rank";
  return df === dr ? "diagonal" : "anti_diagonal";
}

function alignmentFacts(board) {
  const facts = [];
  const seen = new Set();
  const directions = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]];

  for (let front = 0; front < 64; front += 1) {
    const frontPiece = board[front];
    if (!frontPiece) continue;
    const [ff, fr] = coords(front);

    for (const [df, dr] of directions) {
      const occupied = [];
      let file = ff + df;
      let rank = fr + dr;
      while (onBoard(file, rank) && occupied.length < 2) {
        const index = indexFromCoords(file, rank);
        if (board[index]) occupied.push(index);
        file += df;
        rank += dr;
      }
      if (occupied.length !== 2) continue;
      const [middle, back] = occupied;
      const middlePiece = board[middle];
      const backPiece = board[back];
      if (!middlePiece || !backPiece || frontPiece.color === backPiece.color) continue;
      const frontSlider = isSliderForDirection(frontPiece, df, dr);
      const backSlider = isSliderForDirection(backPiece, -df, -dr);
      if (!frontSlider && !backSlider) continue;

      const canonical = [front, middle, back].slice().sort((a, b) => a - b).join("-");
      if (seen.has(canonical)) continue;
      seen.add(canonical);

      let pin = false;
      let pinPiece = -1;
      let pinKing = -1;
      let attacker = -1;
      if (frontSlider && middlePiece.color === backPiece.color && backPiece.type === "k" && frontPiece.color !== backPiece.color) {
        pin = true;
        pinPiece = middle;
        pinKing = back;
        attacker = front;
      } else if (backSlider && middlePiece.color === frontPiece.color && frontPiece.type === "k" && backPiece.color !== frontPiece.color) {
        pin = true;
        pinPiece = middle;
        pinKing = front;
        attacker = back;
      }

      let skewer = false;
      let skewerFront = -1;
      let skewerBack = -1;
      if (frontSlider && middlePiece.color === backPiece.color && frontPiece.color !== backPiece.color && pieceValue(middlePiece) > pieceValue(backPiece)) {
        skewer = true;
        skewerFront = middle;
        skewerBack = back;
      } else if (backSlider && middlePiece.color === frontPiece.color && backPiece.color !== frontPiece.color && pieceValue(middlePiece) > pieceValue(frontPiece)) {
        skewer = true;
        skewerFront = middle;
        skewerBack = front;
      }

      facts.push({
        key: canonical,
        front,
        middle,
        back,
        line: lineKind(df, dr),
        frontSlider,
        backSlider,
        pin,
        pinPiece,
        pinKing,
        attacker,
        skewer,
        skewerFront,
        skewerBack
      });
    }
  }

  return facts.sort((a, b) => a.key.localeCompare(b.key));
}

function isPassedPawn(board, index) {
  const pawn = board[index];
  if (!pawn || pawn.type !== "p") return false;
  const [file, rank] = coords(index);
  const direction = pawn.color === "w" ? 1 : -1;
  const enemy = other(pawn.color);
  for (const candidateFile of [file - 1, file, file + 1]) {
    if (candidateFile < 0 || candidateFile > 7) continue;
    let candidateRank = rank + direction;
    while (candidateRank >= 0 && candidateRank <= 7) {
      const piece = board[indexFromCoords(candidateFile, candidateRank)];
      if (piece && piece.color === enemy && piece.type === "p") return false;
      candidateRank += direction;
    }
  }
  return true;
}

function positionFacts(board) {
  const pressure = new Map();
  const looseBySquare = new Set();
  const hangingBySquare = new Set();
  const defendersBySquare = new Map();
  const attackersBySquare = new Map();
  const soleDefenders = [];
  const targetDefenders = new Map();

  for (let square = 0; square < 64; square += 1) {
    const piece = board[square];
    if (!piece || piece.type === "k") continue;
    const attackers = attackersOf(board, square, other(piece.color));
    const defenders = attackersOf(board, square, piece.color);
    const pawnDefenders = defenders.filter((index) => board[index]?.type === "p");
    const loose = attackers.length > 0 && pawnDefenders.length === 0 && attackers.length >= defenders.length;
    const hanging = attackers.length > 0 && pawnDefenders.length === 0 && attackers.length > defenders.length;
    const info = { square, piece, attackers, defenders, pawnDefenders, loose, hanging };
    pressure.set(square, info);
    attackersBySquare.set(square, attackers);
    defendersBySquare.set(square, defenders);
    targetDefenders.set(square, defenders);
    if (loose) looseBySquare.add(square);
    if (hanging) hangingBySquare.add(square);
    if (loose && defenders.length === 1) soleDefenders.push({ defender: defenders[0], target: square });
  }

  const defenderTargets = new Map();
  for (const target of looseBySquare) {
    for (const defender of targetDefenders.get(target) || []) {
      if (!defenderTargets.has(defender)) defenderTargets.set(defender, []);
      defenderTargets.get(defender).push(target);
    }
  }
  const sharedDefenders = [...defenderTargets.entries()]
    .filter(([, targets]) => targets.length >= 2)
    .map(([defender, targets]) => ({ defender, targets: targets.slice().sort((a, b) => a - b) }))
    .sort((a, b) => a.defender - b.defender);

  const alignments = alignmentFacts(board);
  const pins = alignments.filter((fact) => fact.pin);
  const skewers = alignments.filter((fact) => fact.skewer);
  const passedPawns = [];
  for (let index = 0; index < 64; index += 1) {
    if (isPassedPawn(board, index)) passedPawns.push(index);
  }

  return {
    pressure,
    looseBySquare,
    hangingBySquare,
    defendersBySquare,
    attackersBySquare,
    soleDefenders,
    sharedDefenders,
    alignments,
    pins,
    skewers,
    passedPawns
  };
}

function captureTargetAt(game, seed) {
  const board = game.state.board;
  const moving = board[seed.from];
  let targetSquare = seed.to;
  let target = board[targetSquare];
  if (!target && moving?.type === "p" && game.state.ep === seed.to) {
    const [file, rank] = coords(seed.to);
    targetSquare = indexFromCoords(file, rank + (moving.color === "w" ? -1 : 1));
    target = board[targetSquare];
  }
  return { targetSquare, target: clonePiece(target) };
}

function legalKingMobility(game, color) {
  const kingIndex = game.state.board.findIndex((piece) => piece && piece.color === color && piece.type === "k");
  if (kingIndex < 0 || typeof game._legalMovesFrom !== "function") return null;
  try { return (game._legalMovesFrom(kingIndex, color) || []).length; } catch { return null; }
}

function threatSummary(move) {
  if (move.givesMate) return `${move.san} checkmates`;
  if (move.givesCheck && move.isCapture) return `${move.san} checks and captures ${move.capturedToken}`;
  if (move.givesCheck && move.fork) return `${move.san} checks and forks ${move.forkTargets.join("/")}`;
  if (move.givesCheck) return `${move.san} checks the king`;
  if (move.isCapture) return `${move.san} captures ${move.capturedToken}`;
  if (move.fork) return `${move.san} forks ${move.forkTargets.join("/")}`;
  if (move.attacksLoosePiece) return `${move.san} attacks a loose piece`;
  if (move.promotion) return `${move.san} promotes`;
  return "";
}

function analyzeMove({ createGame, game, seed, beforeFacts, beforeBoard }) {
  const fenBefore = game.exportFEN();
  const side = game.state.side;
  const movingPiece = clonePiece(beforeBoard[seed.from]);
  const { targetSquare, target } = captureTargetAt(game, seed);
  const clone = makeGame(createGame, fenBefore);
  const node = applyUci(clone, seed.uci);
  const fenAfter = clone.exportFEN();
  const afterBoard = copyBoard(clone.state.board);
  const afterFacts = positionFacts(afterBoard);
  const opponent = clone.state.side;
  const replies = allLegalMoveSeeds(clone);
  const givesCheck = typeof clone._isInCheck === "function"
    ? Boolean(clone._isInCheck(opponent))
    : (() => {
      const king = afterBoard.findIndex((piece) => piece && piece.color === opponent && piece.type === "k");
      return king >= 0 && attackersOf(afterBoard, king, side).length > 0;
    })();
  const givesMate = givesCheck && replies.length === 0;
  const movedPiece = clonePiece(afterBoard[seed.to]);
  const destinationPressure = afterFacts.pressure.get(seed.to) || {
    attackers: attackersOf(afterBoard, seed.to, opponent),
    defenders: attackersOf(afterBoard, seed.to, side),
    pawnDefenders: []
  };
  const safe = destinationPressure.attackers.length === 0 ||
    destinationPressure.pawnDefenders.length > 0 ||
    destinationPressure.defenders.length >= destinationPressure.attackers.length;

  const attackedTargetSquares = attackedPiecesFrom(afterBoard, seed.to);
  const relevantTargetSquares = attackedTargetSquares.filter((square) => {
    const piece = afterBoard[square];
    return piece && (piece.type === "k" || pieceValue(piece) >= 3);
  });
  const doubleAttack = attackedTargetSquares.length >= 2;
  const fork = relevantTargetSquares.length >= 2;
  const forkTargets = relevantTargetSquares.map((square) => pieceToken(afterBoard[square], square));
  const attacksLooseSquares = attackedTargetSquares.filter((square) => afterFacts.looseBySquare.has(square));
  const defenderSquares = new Set([
    ...beforeFacts.soleDefenders.map((entry) => entry.defender),
    ...beforeFacts.sharedDefenders.map((entry) => entry.defender)
  ]);
  const attacksDefenderSquares = attackedTargetSquares.filter((square) => defenderSquares.has(square));
  const capturesDefender = Boolean(target && defenderSquares.has(targetSquare));
  const beforeAlignmentKeys = new Set(beforeFacts.alignments.map((fact) => fact.key));
  const beforePinKeys = new Set(beforeFacts.pins.map((fact) => fact.key));
  const beforeSkewerKeys = new Set(beforeFacts.skewers.map((fact) => fact.key));
  const newAlignments = afterFacts.alignments.filter((fact) => !beforeAlignmentKeys.has(fact.key));
  const newPins = afterFacts.pins.filter((fact) => !beforePinKeys.has(fact.key));
  const newSkewers = afterFacts.skewers.filter((fact) => !beforeSkewerKeys.has(fact.key));
  const movedAlignmentBlocker = beforeFacts.alignments.some((fact) => fact.middle === seed.from);
  const promotion = Boolean(seed.promotion);
  const movedPassedPawn = movedPiece?.type === "p" && afterFacts.passedPawns.includes(seed.to);
  const kingMobility = legalKingMobility(clone, opponent);
  const matingNet = Boolean(givesCheck && kingMobility != null && kingMobility <= 2);
  const mateThreat = Boolean(!givesCheck && kingMobility != null && kingMobility <= 1 && relevantTargetSquares.some((square) => afterBoard[square]?.type === "k"));
  const isCapture = Boolean(target || node?.moveInfo?.capturedId || node?.moveInfo?.epCapture);
  const usedPredicates = [];
  if (givesCheck) usedPredicates.push("check");
  if (givesMate) usedPredicates.push("mate_in_1");
  if (isCapture) usedPredicates.push("capture", "capture_order");
  if (target && beforeFacts.looseBySquare.has(targetSquare)) usedPredicates.push("loose");
  if (fork) usedPredicates.push("fork", "double_attack");
  else if (doubleAttack) usedPredicates.push("double_attack");
  if (newPins.length) usedPredicates.push("pin", "alignment");
  if (newSkewers.length) usedPredicates.push("skewer", "alignment");
  if (newAlignments.length) usedPredicates.push("alignment");
  if (movedAlignmentBlocker) usedPredicates.push("line_blocker", "clearance", "discovered_attack");
  if (attacksLooseSquares.length) usedPredicates.push("attacked", "loose");
  if (attacksDefenderSquares.length) usedPredicates.push("sole_defender", "shared_defender");
  if (capturesDefender) usedPredicates.push("deflection");
  if (promotion || movedPassedPawn) usedPredicates.push("promotion_threat", "passed_pawn");
  if (matingNet) usedPredicates.push("mating_net", "restricted_mobility");
  if (safe) usedPredicates.push("safe_retreat", "defenders");

  const move = {
    uci: seed.uci,
    san: String(node?.san || seed.uci),
    from: seed.from,
    to: seed.to,
    fromSquare: indexToSquare(seed.from),
    toSquare: indexToSquare(seed.to),
    promotion: seed.promotion || "",
    side,
    movingPiece,
    movingToken: pieceToken(movingPiece, seed.from),
    movedPiece,
    targetSquare,
    targetSquareName: indexToSquare(targetSquare),
    capturedPiece: target,
    capturedToken: target ? pieceToken(target, targetSquare) : "nothing",
    capturedValue: pieceValue(target),
    isCapture,
    majorCapture: pieceValue(target) >= 5,
    capturedWasLoose: Boolean(target && beforeFacts.looseBySquare.has(targetSquare)),
    givesCheck,
    givesMate,
    replyCount: replies.length,
    oneReply: replies.length === 1,
    safe,
    destinationAttackers: destinationPressure.attackers.map(indexToSquare),
    destinationDefenders: destinationPressure.defenders.map(indexToSquare),
    attackedTargetSquares,
    attackedTargets: attackedTargetSquares.map((square) => pieceToken(afterBoard[square], square)),
    relevantTargetSquares,
    doubleAttack,
    fork,
    forkTargets,
    attacksLooseSquares,
    attacksLoosePiece: attacksLooseSquares.length > 0,
    attacksDefenderSquares,
    attacksDefender: attacksDefenderSquares.length > 0,
    capturesDefender,
    newAlignments,
    newPins,
    newSkewers,
    createsAlignment: newAlignments.length > 0,
    createsPin: newPins.length > 0,
    createsSkewer: newSkewers.length > 0,
    movedAlignmentBlocker,
    clearance: movedAlignmentBlocker,
    interference: capturesDefender || newAlignments.length > 0,
    deflection: capturesDefender,
    promotionThreat: promotion || movedPassedPawn,
    passedPawn: movedPassedPawn,
    kingMobility,
    matingNet,
    mateThreat,
    attacksMajor: attackedTargetSquares.some((square) => pieceValue(afterBoard[square]) >= 5),
    fenBefore,
    fenAfter,
    beforeBoard,
    afterBoard,
    beforeFacts,
    afterFacts,
    materialBefore: boardMaterial(beforeBoard),
    materialAfter: boardMaterial(afterBoard),
    usedPredicates: uniqueSorted(usedPredicates)
  };
  move.policyThreat = threatSummary(move);
  return move;
}

function observation(predicate, text, extras = {}) {
  return normalizeObservation({ predicate, text, ...extras }, predicate);
}

function collectPositionObservations({ game, board, facts, moves }) {
  const output = [];
  const side = game.state.side;
  const legalCount = moves.length;
  const inCheck = typeof game._isInCheck === "function"
    ? Boolean(game._isInCheck(side))
    : (() => {
      const king = board.findIndex((piece) => piece && piece.color === side && piece.type === "k");
      return king >= 0 && attackersOf(board, king, other(side)).length > 0;
    })();

  if (inCheck) output.push(observation("in_check", `in_check(${side})`, { side }));
  if (inCheck && legalCount === 0) output.push(observation("mate", `mate(${other(side)})`, { side: other(side) }));

  for (const info of facts.pressure.values()) {
    if (!info.attackers.length) continue;
    const token = pieceToken(info.piece, info.square);
    const attackerTokens = info.attackers.map((index) => pieceToken(board[index], index));
    output.push(observation("attacked", `attacked(${token};by=${attackerTokens.join("+")})`, {
      side: info.piece.color,
      square: indexToSquare(info.square),
      from: info.attackers.length === 1 ? indexToSquare(info.attackers[0]) : undefined,
      to: indexToSquare(info.square),
      detail: `${info.attackers.length} attacker(s)`
    }));
    output.push(observation("defenders", `defenders(${token}=${info.defenders.length})`, {
      side: info.piece.color,
      square: indexToSquare(info.square),
      detail: `${info.defenders.length} defender(s)`
    }));
    if (info.loose) output.push(observation("loose", `loose(${token})`, {
      side: info.piece.color,
      square: indexToSquare(info.square),
      detail: `${info.attackers.length} attacker(s), ${info.defenders.length} defender(s), no pawn defender`
    }));
    if (info.hanging) output.push(observation("hanging", `hanging(${token})`, {
      side: info.piece.color,
      square: indexToSquare(info.square),
      detail: `${info.attackers.length} attacker(s) > ${info.defenders.length} defender(s)`
    }));
  }

  for (const entry of facts.soleDefenders) {
    output.push(observation("sole_defender", `sole_defender(${pieceToken(board[entry.defender], entry.defender)}->${pieceToken(board[entry.target], entry.target)})`, {
      side: board[entry.defender]?.color,
      from: indexToSquare(entry.defender),
      to: indexToSquare(entry.target)
    }));
  }

  for (const entry of facts.sharedDefenders) {
    const targets = entry.targets.map((index) => pieceToken(board[index], index));
    const defender = pieceToken(board[entry.defender], entry.defender);
    output.push(observation("shared_defender", `shared_defender(${defender}->${targets.join("+")})`, {
      side: board[entry.defender]?.color,
      square: indexToSquare(entry.defender),
      detail: `${targets.length} loose targets`
    }));
    output.push(observation("overloaded", `overloaded(${defender};duties=${targets.length})`, {
      side: board[entry.defender]?.color,
      square: indexToSquare(entry.defender)
    }));
  }

  for (const fact of facts.alignments) {
    const front = pieceToken(board[fact.front], fact.front);
    const middle = pieceToken(board[fact.middle], fact.middle);
    const back = pieceToken(board[fact.back], fact.back);
    output.push(observation("alignment", `alignment(${front}>${middle}>${back};${fact.line})`, {
      side: board[fact.front]?.color,
      from: indexToSquare(fact.front),
      to: indexToSquare(fact.back),
      detail: fact.line
    }));
    output.push(observation("line_blocker", `line_blocker(${middle};${fact.line})`, {
      side: board[fact.middle]?.color,
      square: indexToSquare(fact.middle)
    }));
    if (fact.pin) {
      output.push(observation("pin", `pin(${pieceToken(board[fact.pinPiece], fact.pinPiece)}->${pieceToken(board[fact.pinKing], fact.pinKing)})`, {
        side: board[fact.pinPiece]?.color,
        from: indexToSquare(fact.attacker),
        to: indexToSquare(fact.pinKing)
      }));
    }
    if (fact.skewer) {
      output.push(observation("skewer", `skewer(${pieceToken(board[fact.skewerFront], fact.skewerFront)}>${pieceToken(board[fact.skewerBack], fact.skewerBack)})`, {
        side: board[fact.skewerFront]?.color,
        square: indexToSquare(fact.skewerFront)
      }));
    }
  }

  for (const index of facts.passedPawns) {
    const piece = board[index];
    if (!piece) continue;
    const [, rank] = coords(index);
    if ((piece.color === "w" && rank >= 5) || (piece.color === "b" && rank <= 2)) {
      output.push(observation("passed_pawn", `passed_pawn(${pieceToken(piece, index)})`, {
        side: piece.color,
        square: indexToSquare(index)
      }));
    }
  }

  const mateMoves = moves.filter((move) => move.givesMate);
  if (mateMoves.length) output.push(observation("mate_in_1", `mate_in_1(${side}:${mateMoves.map((move) => move.san).join("|")})`, { side }));
  const checks = moves.filter((move) => move.givesCheck);
  if (checks.length) output.push(observation("check", `check_moves(${side}=${checks.length}:${checks.slice(0, 4).map((move) => move.san).join("|")})`, { side }));
  const captures = moves.filter((move) => move.isCapture);
  if (captures.length) output.push(observation("capture", `capture_moves(${side}=${captures.length})`, { side }));
  const forks = moves.filter((move) => move.fork);
  if (forks.length) output.push(observation("fork", `fork_moves(${side}:${forks.slice(0, 4).map((move) => move.san).join("|")})`, { side }));
  const doubles = moves.filter((move) => move.doubleAttack);
  if (doubles.length) output.push(observation("double_attack", `double_attack_moves(${side}=${doubles.length})`, { side }));
  const promotions = moves.filter((move) => move.promotionThreat);
  if (promotions.length) output.push(observation("promotion_threat", `promotion_moves(${side}:${promotions.slice(0, 4).map((move) => move.san).join("|")})`, { side }));

  const context = { game, board, facts, moves, side, observations: output.slice() };
  for (const definition of PREDICATE_DEFINITIONS.values()) {
    if (!definition.evaluate) continue;
    let extra = [];
    try { extra = asArray(definition.evaluate(context)); } catch { extra = []; }
    for (const raw of extra) output.push(normalizeObservation(raw, definition.name));
  }

  const seen = new Set();
  return output
    .filter((item) => !seen.has(observationKey(item)) && seen.add(observationKey(item)))
    .sort((a, b) => {
      const pa = OBSERVATION_PRIORITY[a.predicate] ?? 99;
      const pb = OBSERVATION_PRIORITY[b.predicate] ?? 99;
      return pa - pb || a.text.localeCompare(b.text);
    });
}

export function inspectPosition({ createGame, game = null, fen = "" } = {}) {
  const working = game || makeGame(createGame, fen);
  const currentFen = working.exportFEN();
  const board = copyBoard(working.state.board);
  const facts = positionFacts(board);
  const seeds = allLegalMoveSeeds(working);
  const moves = seeds.map((seed) => analyzeMove({ createGame, game: working, seed, beforeFacts: facts, beforeBoard: board }));
  const predicates = collectPositionObservations({ game: working, board, facts, moves });
  const predicateNames = new Set(predicates.map((item) => item.predicate));
  return {
    fen: currentFen,
    side: working.state.side,
    fullmove: Number(working.state.fullmove || 1),
    board,
    facts,
    moves,
    predicates,
    predicateNames,
    inCheck: predicateNames.has("in_check"),
    legalCount: moves.length,
    material: boardMaterial(board)
  };
}

function goalValue(policy) {
  const requested = policy?.objective?.gain_goal || policy?.profile?.gain_goal || "minor_piece";
  if (typeof requested === "number" && Number.isFinite(requested)) return requested;
  return GAIN_VALUES[requested] ?? 3;
}

function materialDeltaAfter(move, state) {
  return materialDifference(move.afterBoard, state.rootSide) - state.initialMaterialDifference;
}

function materialDeltaSnapshot(snapshot, state) {
  return materialDifference(snapshot.board, state.rootSide) - state.initialMaterialDifference;
}

function contextPredicatesForCondition(conditionName) {
  const map = {
    in_check_us: ["in_check"],
    mate_in_1_available_us: ["mate_in_1"],
    visible_gain_needs_conversion: ["capture", "safe_retreat"],
    interference_mate_threat_available_us: ["interference", "mate_threat"],
    safe_check_with_one_reply_available_us: ["check", "safe_retreat"],
    after_forcing_check_capture_tightens_mating_net: ["check", "capture", "mating_net"],
    checking_fork_or_double_attack_available_us: ["check", "fork", "double_attack"],
    capture_with_forced_continuation_available_us: ["capture", "check", "fork"],
    safe_check_available_us: ["check", "safe_retreat"],
    immediate_objective_capture_available_us: ["capture"],
    mate_in_1_threat_available_us: ["mate_threat"],
    capture_reaches_or_advances_objective_us: ["capture"],
    double_attack_available_us: ["double_attack"],
    forkable_alignment_us: ["fork", "alignment"],
    pinnable_or_skewer_alignment_us: ["pin", "skewer", "alignment"],
    enemy_loose_piece: ["loose"],
    promotion_threat_available_us: ["promotion_threat", "passed_pawn"],
    any_forcing_move_available_us: ["check", "capture", "fork", "promotion_threat"],
    check_available_us: ["check"],
    capture_available_us: ["capture"]
  };
  return map[conditionName] || [];
}

function installConditions() {
  defineCondition("always", () => true);
  defineCondition("in_check_us", ({ snapshot }) => snapshot.inCheck);
  defineCondition("mate_in_1_available_us", ({ snapshot }) => snapshot.moves.some((move) => move.givesMate));
  defineCondition("visible_gain_needs_conversion", ({ snapshot, state }) => Boolean(state.boundTarget && snapshot.moves.some((move) => move.isCapture)));
  defineCondition("interference_mate_threat_available_us", ({ snapshot }) => snapshot.moves.some((move) => move.interference && (move.mateThreat || move.matingNet)));
  defineCondition("safe_check_with_one_reply_available_us", ({ snapshot }) => snapshot.moves.some((move) => move.givesCheck && move.oneReply && move.safe));
  defineCondition("after_forcing_check_capture_tightens_mating_net", ({ snapshot, state }) => Boolean(state.lastMove?.givesCheck && snapshot.moves.some((move) => move.isCapture && move.matingNet)));
  defineCondition("checking_fork_or_double_attack_available_us", ({ snapshot }) => snapshot.moves.some((move) => move.givesCheck && (move.fork || move.doubleAttack)));
  defineCondition("capture_with_forced_continuation_available_us", ({ snapshot }) => snapshot.moves.some((move) => move.isCapture && (move.givesCheck || move.fork || move.oneReply || move.createsPin || move.createsSkewer)));
  defineCondition("safe_check_available_us", ({ snapshot }) => snapshot.moves.some((move) => move.givesCheck && (move.safe || move.givesMate)));
  defineCondition("immediate_objective_capture_available_us", ({ snapshot, state }) => snapshot.moves.some((move) => move.isCapture && materialDeltaAfter(move, state) >= state.goalValue));
  defineCondition("mate_in_1_threat_available_us", ({ snapshot }) => snapshot.moves.some((move) => move.mateThreat));
  defineCondition("capture_reaches_or_advances_objective_us", ({ snapshot }) => snapshot.moves.some((move) => move.isCapture));
  defineCondition("double_attack_available_us", ({ snapshot }) => snapshot.moves.some((move) => move.doubleAttack));
  defineCondition("forkable_alignment_us", ({ snapshot }) => snapshot.moves.some((move) => move.fork || (move.createsAlignment && move.doubleAttack)));
  defineCondition("pinnable_or_skewer_alignment_us", ({ snapshot }) => snapshot.moves.some((move) => move.createsPin || move.createsSkewer || move.interference));
  defineCondition("enemy_loose_piece", ({ snapshot }) => [...snapshot.facts.looseBySquare].some((square) => snapshot.board[square]?.color !== snapshot.side));
  defineCondition("promotion_threat_available_us", ({ snapshot }) => snapshot.moves.some((move) => move.promotionThreat));
  defineCondition("any_forcing_move_available_us", ({ snapshot }) => snapshot.moves.some((move) => move.givesCheck || move.isCapture || move.fork || move.createsPin || move.createsSkewer || move.promotionThreat));
  defineCondition("check_available_us", ({ snapshot }) => snapshot.moves.some((move) => move.givesCheck));
  defineCondition("capture_available_us", ({ snapshot }) => snapshot.moves.some((move) => move.isCapture));
}

function installMoveFilters() {
  const add = defineMoveFilter;
  add("mate_check_answers", (move, ctx) => ctx.snapshot.inCheck && move.givesMate);
  add("check_answers_with_forcing_continuation", (move, ctx) => ctx.snapshot.inCheck && (move.givesCheck || move.isCapture || move.fork || move.createsPin));
  add("all_check_answers", (_move, ctx) => ctx.snapshot.inCheck);
  add("checking_check_answers", (move, ctx) => ctx.snapshot.inCheck && move.givesCheck);
  add("capture_check_answers", (move, ctx) => ctx.snapshot.inCheck && move.isCapture);
  add("mate_in_1_moves", (move) => move.givesMate);
  add("captures_of_bound_target", (move, ctx) => move.isCapture && Boolean(ctx.state.boundTarget) && move.targetSquareName === ctx.state.boundTarget);
  add("safe_rook_conversion_moves", (move) => move.isCapture && move.capturedPiece?.type === "r" && move.safe);
  add("safe_conversion_moves", (move) => move.isCapture && move.safe && move.capturedValue > 0);
  add("interference_moves", (move) => move.interference && (move.mateThreat || move.matingNet || move.givesCheck));
  add("safe_checks_with_one_reply", (move) => move.givesCheck && move.oneReply && move.safe);
  add("captures_tightening_mating_net", (move) => move.isCapture && (move.matingNet || move.kingMobility === 0));
  add("checking_double_attacks", (move) => move.givesCheck && move.doubleAttack);
  add("moves_creating_checking_fork", (move) => move.givesCheck && move.fork);
  add("checking_major_captures_with_forced_continuation", (move) => move.givesCheck && move.majorCapture && (move.oneReply || move.fork));
  add("checking_captures_with_forced_continuation", (move) => move.givesCheck && move.isCapture && (move.replyCount <= 3 || move.fork));
  add("major_captures_with_forced_continuation", (move) => move.majorCapture && (move.givesCheck || move.fork || move.createsPin || move.replyCount <= 3));
  add("tactical_captures_with_forced_continuation", (move) => move.isCapture && (move.givesCheck || move.fork || move.createsPin || move.createsSkewer || move.oneReply));
  add("checks_binding_objective_target", (move, ctx) => move.givesCheck && Boolean(ctx.state.boundTarget || move.attacksLoosePiece || move.attacksMajor));
  add("checks_creating_fork_or_skewer", (move) => move.givesCheck && (move.fork || move.createsSkewer));
  add("checks_moving_alignment_blocker", (move) => move.givesCheck && move.movedAlignmentBlocker);
  add("checks_attacking_loose_piece_or_defender", (move) => move.givesCheck && (move.attacksLoosePiece || move.attacksDefender));
  add("checking_captures", (move) => move.givesCheck && move.isCapture);
  add("remaining_safe_checks", (move) => move.givesCheck && (move.safe || move.givesMate));
  add("captures_completing_objective", (move, ctx) => move.isCapture && materialDeltaAfter(move, ctx.state) >= ctx.state.goalValue);
  add("mate_threats_using_position_predicates", (move) => move.mateThreat || (move.matingNet && !move.givesCheck));
  add("captures_with_forced_continuation", (move) => move.isCapture && (move.givesCheck || move.fork || move.createsPin || move.createsSkewer || move.oneReply));
  add("captures_of_loose_or_high_value_piece", (move) => move.isCapture && (move.capturedWasLoose || move.capturedValue >= 3));
  add("captures_creating_clearance_or_deflection", (move) => move.isCapture && (move.clearance || move.deflection));
  add("remaining_forcing_captures", (move) => move.isCapture);
  add("queen_double_attacks", (move) => move.movingPiece?.type === "q" && move.doubleAttack);
  add("other_double_attacks", (move) => move.movingPiece?.type !== "q" && move.doubleAttack);
  add("moves_creating_material_fork", (move) => move.fork);
  add("moves_pinning_to_king", (move) => move.createsPin);
  add("moves_pinning_to_queen", (move) => move.newAlignments.some((fact) => move.afterBoard[fact.back]?.type === "q" || move.afterBoard[fact.front]?.type === "q"));
  add("moves_creating_skewer", (move) => move.createsSkewer);
  add("captures_of_loose_piece", (move) => move.isCapture && move.capturedWasLoose);
  add("attacks_on_loose_piece", (move) => move.attacksLoosePiece);
  add("attacks_on_loose_piece_defender", (move) => move.attacksDefender);
  add("attacks_on_shared_defender", (move) => move.attacksDefender && move.beforeFacts.sharedDefenders.some((entry) => move.attacksDefenderSquares.includes(entry.defender)));
  add("promotion_moves", (move) => Boolean(move.promotion));
  add("passed_pawn_forcing_moves", (move) => move.passedPawn && (move.givesCheck || move.promotionThreat));
  add("fallback_checks", (move) => move.givesCheck);
  add("fallback_captures", (move) => move.isCapture);
  add("fallback_tactical_moves", (move) => move.fork || move.createsPin || move.createsSkewer || move.promotionThreat);
  add("checking_moves", (move) => move.givesCheck);
  add("capture_moves", (move) => move.isCapture);
  add("all_legal_moves", () => true);
}

function installReplyRules() {
  defineReplyRule("reply_checkmates_us", (move) => move.givesMate);
  defineReplyRule("only_legal_reply", (_move, ctx) => ctx.snapshot.moves.length === 1);
  defineReplyRule("reply_is_legal_answer_to_active_check", (_move, ctx) => Boolean(ctx.state.lastMove?.givesCheck));
  defineReplyRule("reply_forcing_move_has_named_answer_preserving_objective", (move, ctx) => {
    if (!move.givesCheck && !move.isCapture) return false;
    return materialDeltaAfter(move, ctx.state) >= ctx.state.goalValue && move.safe;
  });
  defineReplyRule("reply_gives_check", (move) => move.givesCheck);
  defineReplyRule("reply_is_capture", (move) => move.isCapture);
  defineReplyRule("reply_captures_attacker_but_named_recapture_restores_objective", (move, ctx) => {
    if (!move.isCapture || !ctx.state.lastMove) return false;
    if (move.targetSquareName !== ctx.state.lastMove.toSquare) return false;
    const rootAttackers = attackersOf(move.afterBoard, move.to, ctx.state.rootSide);
    return rootAttackers.length > 0 && materialDeltaAfter(move, ctx.state) >= 0;
  });
  defineReplyRule("reply_captures_attacker_or_winning_piece", (move, ctx) => move.isCapture && (
    move.targetSquareName === ctx.state.lastMove?.toSquare || move.capturedValue >= 3
  ));
  defineReplyRule("reply_saves_or_continues_defending_target", (move, ctx) => {
    if (!ctx.state.boundTarget) return false;
    if (move.fromSquare === ctx.state.boundTarget) return true;
    const target = squareToIndex(ctx.state.boundTarget);
    return target >= 0 && attackersOf(move.afterBoard, target, move.side).length > 0;
  });
  defineReplyRule("reply_attacks_major_piece_with_tempo", (move) => move.attacksMajor && (move.givesCheck || move.doubleAttack));
  defineReplyRule("reply_traps_or_attacks_winning_piece_with_no_safe_retreat", (move, ctx) => Boolean(
    ctx.state.lastMove && move.attackedTargetSquares.includes(ctx.state.lastMove.to) && !ctx.state.lastMove.safe
  ));
  defineReplyRule("reply_creates_mate_in_1", (move) => move.mateThreat || move.matingNet);
  defineReplyRule("reply_creates_equal_or_greater_material_threat", (move, ctx) => move.capturedValue >= Math.max(ctx.state.goalValue, Math.max(0, materialDeltaSnapshot(ctx.snapshot, ctx.state))));
  defineReplyRule("reply_allows_named_mate_in_1", (move) => move.kingMobility === 0 && !move.givesCheck);
  defineReplyRule("reply_abandons_bound_target_without_forcing_recovery", (move, ctx) => Boolean(
    ctx.state.boundTarget && move.fromSquare !== ctx.state.boundTarget && !move.givesCheck && !move.isCapture &&
    attackersOf(move.afterBoard, squareToIndex(ctx.state.boundTarget), move.side).length === 0
  ));
  defineReplyRule("reply_allows_named_one_ply_tactic", (move, ctx) => {
    const enemyLooseMajor = [...move.afterFacts.looseBySquare].some((square) => {
      const piece = move.afterBoard[square];
      return piece?.color === move.side && pieceValue(piece) >= 3;
    });
    return !move.givesCheck && enemyLooseMajor && materialDeltaAfter(move, ctx.state) >= 0;
  });
  defineReplyRule("objective_reached_and_reply_has_no_forcing_recovery", (move, ctx) => materialDeltaAfter(move, ctx.state) >= ctx.state.goalValue && !move.givesCheck && move.capturedValue < ctx.state.goalValue);
  defineReplyRule("reply_is_nonforcing_and_does_not_answer_active_threat", (move, ctx) => Boolean(
    ctx.state.activeThreat && !move.givesCheck && !move.isCapture && move.fromSquare !== ctx.state.boundTarget
  ));
  defineReplyRule("always", () => true);
}

installConditions();
installMoveFilters();
installReplyRules();

const FALLBACK_POLICY = deepFreeze({
  version: POLICY_VERSION,
  id: "fallback",
  name: "Fallback filter policy",
  description: "Checks, then captures, using ScratchChess legal moves.",
  profile: {
    see_after: 1,
    try_budget: 6,
    max_plies: 6,
    gain_goal: "minor_piece",
    max_live_replies: 3,
    max_candidates_per_case: 6,
    trace_predicate_limit: 14
  },
  semantics: {
    priority: "case_order_then_filter_order",
    move_source: "scratchchess_all_legal_moves",
    policy_operation: "filter_only"
  },
  objective: { type: "mate_or_material_gain", gain_goal: "minor_piece", settle_after: "opponent_reply" },
  our_move_flow: [
    { case: "answer_check", when: "in_check_us", filter: ["all_check_answers"], fallthrough: false },
    { case: "checks", when: "check_available_us", filter: ["checking_moves"], fallthrough: false },
    { case: "captures", when: "capture_available_us", filter: ["capture_moves"], fallthrough: false }
  ],
  opponent_reply_flow: [
    { case: "reply_check", when: "reply_gives_check", action: "live" },
    { case: "reply_capture", when: "reply_is_capture", action: "live" },
    { case: "remaining_reply", when: "always", action: "live" }
  ],
  closure_rules: [],
  predicates: ["check", "capture", "attacked", "loose", "alignment"]
});

function validatePolicyObject(input) {
  const policy = deepClone(input || {});
  const errors = [];
  if (!policy.version) errors.push("missing version");
  if (!policy.id) policy.id = sanitizeRulePart(policy.name || "policy").toLowerCase();
  if (!policy.name) errors.push("missing name");
  if (!Array.isArray(policy.our_move_flow)) errors.push("our_move_flow must be an array");
  if (!Array.isArray(policy.opponent_reply_flow)) errors.push("opponent_reply_flow must be an array");

  for (const entry of policy.our_move_flow || []) {
    if (Object.prototype.hasOwnProperty.call(entry, "generate")) {
      errors.push(`${entry.case || "unnamed case"} uses forbidden "generate"; use "filter"`);
    }
    if (!entry.case || !entry.when || !Array.isArray(entry.filter)) {
      errors.push(`invalid our_move_flow entry ${JSON.stringify(entry)}`);
      continue;
    }
    if (!CONDITIONS.has(entry.when)) errors.push(`unknown condition ${entry.when}`);
    for (const filter of entry.filter) if (!MOVE_FILTERS.has(filter)) errors.push(`unknown move filter ${filter}`);
  }

  for (const entry of policy.opponent_reply_flow || []) {
    if (!entry.case || !entry.when || !["live", "close"].includes(entry.action)) {
      errors.push(`invalid opponent_reply_flow entry ${JSON.stringify(entry)}`);
      continue;
    }
    if (!REPLY_RULES.has(entry.when)) errors.push(`unknown reply rule ${entry.when}`);
  }

  policy.profile = {
    see_after: 1,
    try_budget: 10,
    max_plies: 6,
    gain_goal: "minor_piece",
    max_live_replies: 3,
    max_candidates_per_case: 3,
    candidate_probe_budget: 40,
    trace_predicate_limit: 18,
    ...(policy.profile || {})
  };
  policy.semantics = {
    priority: "case_order_then_filter_order",
    move_source: "scratchchess_all_legal_moves",
    policy_operation: "filter_only",
    ...(policy.semantics || {})
  };
  policy.objective = {
    type: "mate_or_material_gain",
    gain_goal: policy.profile.gain_goal,
    settle_after: "opponent_reply",
    ...(policy.objective || {})
  };

  if (errors.length) throw new Error(`Invalid policy ${policy.name || "(unnamed)"}: ${errors.join("; ")}`);
  return deepFreeze(policy);
}

export function validatePolicy(policy) {
  return validatePolicyObject(policy);
}

export async function loadPolicy(url = DEFAULT_POLICY_URL, { allowFallback = false } = {}) {
  const target = String(url || DEFAULT_POLICY_URL);
  try {
    const response = await fetch(target, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const policy = validatePolicyObject(await response.json());
    return { policy, source: "live", url: target, warning: "" };
  } catch (error) {
    if (!allowFallback) throw error;
    return {
      policy: FALLBACK_POLICY,
      source: "fallback",
      url: target,
      warning: error?.message || String(error)
    };
  }
}

function policyId(policy) {
  return sanitizeRulePart(policy.id || policy.name || "policy").toLowerCase();
}

function annotateCandidate(move, entry, filterName, conditionName, policy) {
  return {
    ...move,
    policy: policyId(policy),
    ruleCase: entry.case,
    filterName,
    conditionName,
    ruleName: `${entry.case}.${filterName}`,
    ruleCite: `${policyId(policy)}.${entry.case}.${filterName}`,
    think: entry.think || ""
  };
}

function selectCandidates(snapshot, policy, state) {
  const selected = [];
  const seen = new Set();
  const invoked = [];
  const context = { snapshot, policy, state };
  const globalCap = Math.max(1, Number(policy.profile.try_budget || 10));

  for (const entry of policy.our_move_flow) {
    const condition = CONDITIONS.get(entry.when);
    let matchesCondition = false;
    try { matchesCondition = Boolean(condition?.(context)); } catch { matchesCondition = false; }
    if (!matchesCondition) continue;
    invoked.push(entry.case, entry.when, ...contextPredicatesForCondition(entry.when));
    const caseCap = Math.max(1, Number(entry.max_candidates || policy.profile.max_candidates_per_case || 3));
    let addedInCase = 0;

    for (const filterName of entry.filter) {
      const filter = MOVE_FILTERS.get(filterName);
      invoked.push(filterName);
      for (const move of snapshot.moves) {
        if (seen.has(move.uci)) continue;
        let accepted = false;
        try { accepted = Boolean(filter?.(move, context)); } catch { accepted = false; }
        if (!accepted) continue;
        const annotated = annotateCandidate(move, entry, filterName, entry.when, policy);
        selected.push(annotated);
        seen.add(move.uci);
        addedInCase += 1;
        invoked.push(...move.usedPredicates);
        if (addedInCase >= caseCap || selected.length >= globalCap) break;
      }
      if (addedInCase >= caseCap || selected.length >= globalCap) break;
    }

    if (!entry.fallthrough || selected.length >= globalCap) break;
  }

  return { moves: selected, uses: uniqueSorted(invoked) };
}

function annotateReply(move, entry, policy) {
  return {
    ...move,
    policy: policyId(policy),
    ruleCase: entry.case,
    replyCondition: entry.when,
    ruleName: entry.case,
    ruleCite: `${policyId(policy)}.${entry.case}`,
    replyAction: entry.action,
    closeWith: entry.close_with || "",
    witness: entry.witness || "",
    think: entry.think || ""
  };
}

function selectReplies(snapshot, policy, state) {
  const unmatched = new Map(snapshot.moves.map((move) => [move.uci, move]));
  const live = [];
  const closed = [];
  const invoked = [];
  const context = { snapshot, policy, state };

  for (const entry of policy.opponent_reply_flow) {
    const rule = REPLY_RULES.get(entry.when);
    const matches = [];
    for (const move of unmatched.values()) {
      let accepted = false;
      try { accepted = Boolean(rule?.(move, context)); } catch { accepted = false; }
      if (accepted) matches.push(move);
    }
    if (!matches.length) continue;
    invoked.push(entry.case, entry.when);
    for (const move of matches) {
      unmatched.delete(move.uci);
      const annotated = annotateReply(move, entry, policy);
      invoked.push(...move.usedPredicates);
      if (entry.action === "live") live.push(annotated);
      else closed.push(annotated);
    }
  }

  // Validation normally guarantees an `always` rule. Preserve unmatched legal
  // replies as live instead of silently discarding them.
  for (const move of unmatched.values()) {
    live.push(annotateReply(move, {
      case: "implicit_remaining_reply",
      when: "always",
      action: "live",
      think: "No explicit reply rule matched; legal replies remain live."
    }, policy));
    invoked.push("implicit_remaining_reply");
  }

  const cap = Math.max(1, Number(policy.profile.max_live_replies || 3));
  const representedLive = live.slice(0, cap);
  const deferred = live.slice(cap);
  return {
    moves: representedLive,
    closed,
    deferred,
    allLive: live,
    uses: uniqueSorted(invoked)
  };
}

function formatObservationText(snapshot, policy) {
  const visible = humanVisibleObservations(snapshot.predicates);
  const limit = Math.max(1, Number(policy.profile.trace_predicate_limit || 18));
  const texts = visible.slice(0, limit).map((item) => item.text);
  const omitted = Math.max(0, visible.length - texts.length);
  const suffix = omitted ? `; +${omitted} more` : "";
  return {
    visible,
    line: `SAW side=${colorName(snapshot.side)} predicates=[${texts.join("; ") || "none"}${suffix}]`
  };
}

function formatSelectionLine(kind, selection) {
  const label = kind === "our" ? "CANDIDATES" : "REPLIES";
  const moves = selection.moves.length
    ? selection.moves.map((move) => `${move.san}[${move.ruleCite}]`).join(" ")
    : "none";
  const extras = kind === "reply"
    ? ` CLOSED=[${selection.closed.map((move) => `${move.san}[${move.ruleCite}]`).join(" ") || "none"}] DEFERRED=[${selection.deferred.map((move) => move.san).join(" ") || "none"}]`
    : "";
  return `${label} ${moves}${extras} USES=[${selection.uses.join(",") || "none"}]`;
}

function movePrefix(snapshot, san) {
  return snapshot.side === "w" ? `${snapshot.fullmove}.${san}` : `${snapshot.fullmove}...${san}`;
}

function slimMove(move) {
  return {
    uci: move.uci,
    san: move.san,
    from: move.from,
    to: move.to,
    fromSquare: move.fromSquare,
    toSquare: move.toSquare,
    side: move.side,
    category: move.ruleName || move.ruleCase || "move",
    reason: move.think || move.ruleName || move.ruleCase || "policy filter",
    ruleCase: move.ruleCase || "",
    ruleName: move.ruleName || "",
    ruleCite: move.ruleCite || "",
    filterName: move.filterName || "",
    replyCondition: move.replyCondition || "",
    tags: uniqueSorted(move.usedPredicates),
    policyThreat: move.policyThreat,
    givesCheck: move.givesCheck,
    givesMate: move.givesMate,
    isCapture: move.isCapture,
    capturedValue: move.capturedValue,
    capturedToken: move.capturedToken,
    fork: move.fork,
    safe: move.safe,
    fenBefore: move.fenBefore,
    fenAfter: move.fenAfter
  };
}

function chooseBoundTarget(move) {
  if (move.isCapture) return move.targetSquareName;
  const target = move.relevantTargetSquares
    .map((square) => ({ square, value: pieceValue(move.afterBoard[square]) }))
    .sort((a, b) => b.value - a.value || a.square - b.square)[0];
  return target ? indexToSquare(target.square) : "";
}

function activeThreatFor(move) {
  if (move.givesMate) return "mate";
  if (move.givesCheck) return "check";
  if (move.fork) return "fork";
  if (move.isCapture) return "capture";
  if (move.attacksLoosePiece) return "loose_piece";
  if (move.promotionThreat) return "promotion";
  return "";
}

function stateReport(state, game, selection = null) {
  const sideToMove = game.state.side;
  const board = copyBoard(game.state.board);
  const report = {
    active_rule: state.activeRule || "",
    active_threat: state.activeThreat || "",
    bound_target: state.boundTarget || "",
    candidate_queue: selection?.kind === "our" ? selection.moves.map((move) => move.uci) : [],
    closed_replies: selection?.kind === "reply" ? selection.closed.map((move) => move.uci) : [],
    deferred_replies: selection?.kind === "reply" ? selection.deferred.map((move) => move.uci) : [],
    fen: game.exportFEN(),
    material_delta: materialDifference(board, state.rootSide) - state.initialMaterialDifference,
    path: state.path.slice(),
    phase: sideToMove === state.rootSide ? "our_move" : "opponent_reply",
    ply: state.ply,
    reply_queue: selection?.kind === "reply" ? selection.moves.map((move) => move.uci) : [],
    root_side: state.rootSide,
    side_to_move: sideToMove,
    try_budget_left: Math.max(0, state.tryBudget - state.triesUsed)
  };
  return report;
}

function terminalAtObservation(snapshot, state, policy) {
  if (snapshot.legalCount === 0) {
    if (snapshot.inCheck) {
      const winner = other(snapshot.side);
      return winner === state.rootSide
        ? { status: "solve", reason: "checkmate" }
        : { status: "fail", reason: "root_side_checkmated" };
    }
    return { status: "fail", reason: "stalemate" };
  }

  const delta = materialDeltaSnapshot(snapshot, state);
  const settleAfterReply = (policy.objective?.settle_after || policy.profile?.settle_after) === "opponent_reply";
  const settled = !settleAfterReply || state.lastActor === "reply";
  if (settled && state.ply > 0 && delta >= state.goalValue) {
    return { status: "solve", reason: `gain_goal_reached_${delta}` };
  }
  if (state.ply >= state.maxPlies) return { status: "fail", reason: "max_plies" };
  if (state.triesUsed >= state.tryBudget && snapshot.side === state.rootSide) return { status: "fail", reason: "try_budget" };
  return null;
}

function createInitialRunState(game, policy, name = "") {
  const rootSide = game.state.side;
  return {
    name,
    rootSide,
    initialMaterialDifference: materialDifference(game.state.board, rootSide),
    goalValue: goalValue(policy),
    maxPlies: Math.max(1, Number(policy.profile.max_plies || 6)),
    tryBudget: Math.max(1, Number(policy.profile.try_budget || 10)),
    triesUsed: 0,
    ply: 0,
    path: [],
    activeRule: "",
    activeThreat: "",
    boundTarget: "",
    lastMove: null,
    lastActor: "",
    status: "searching",
    reason: ""
  };
}

function finalStatusForReasoner(status) {
  return status === "solve" ? "proven" : "refutedWithinPolicy";
}

function makeFinal({ lines, events, state, game, status, reason }) {
  state.status = status;
  state.reason = reason;
  const finalState = { ...stateReport(state, game), status, stop_reason: reason };
  const stateLine = `REPORT STATE ${stableStringify(finalState)}`;
  lines.push(stateLine);
  events.push({ type: "state", depth: state.ply, log: stateLine, state: finalState });

  const endLine = `END ${status === "solve" ? "SOLVE" : "FAIL"} reason=${reason}`;
  lines.push(endLine);
  const result = {
    status: finalStatusForReasoner(status),
    traceStatus: status,
    reason,
    principalVariation: state.path.slice(),
    finalFen: game.exportFEN(),
    internalState: finalState
  };
  events.push({
    type: "done",
    depth: state.ply,
    status: result.status,
    traceStatus: status,
    log: endLine,
    comment: endLine,
    state: finalState,
    result
  });
  return {
    traceVersion: TRACE_VERSION,
    status,
    reason,
    output: lines.join("\n"),
    lines,
    events,
    finalFen: game.exportFEN(),
    principalVariation: state.path.slice(),
    state: finalState,
    result
  };
}

/**
 * Run one deterministic policy trace from a FEN.
 *
 * This is intentionally a transparent single-path policy execution, not a
 * hidden evaluator. Every policy decision is represented in the trace, and
 * all mutable driver state is reported after each action.
 */
export function runPolicyTrace({ createGame, fen, policy: rawPolicy, name = "" } = {}) {
  const policy = validatePolicyObject(rawPolicy || FALLBACK_POLICY);
  let game = makeGame(createGame, fen);
  const state = createInitialRunState(game, policy, name);
  const lines = [];
  const events = [];
  let guard = 0;

  while (guard++ < state.maxPlies + 8) {
    const snapshot = inspectPosition({ createGame, game });
    const observed = formatObservationText(snapshot, policy);
    lines.push("THINK OBSERVE.");
    lines.push(observed.line);
    events.push({
      type: "observe",
      depth: state.ply,
      log: `THINK OBSERVE. ${observed.line}`,
      comment: `THINK OBSERVE. ${observed.line}`,
      observations: observed.visible,
      fen: snapshot.fen,
      side: snapshot.side
    });

    const terminal = terminalAtObservation(snapshot, state, policy);
    if (terminal) return makeFinal({ lines, events, state, game, ...terminal });

    const role = snapshot.side === state.rootSide ? "our" : "reply";
    if (role === "our") {
      const selection = selectCandidates(snapshot, policy, state);
      const selectionWithKind = { ...selection, kind: "our" };
      const selectionLine = formatSelectionLine("our", selectionWithKind);
      lines.push(selectionLine);
      events.push({
        type: "filter",
        depth: state.ply,
        role: "our",
        log: selectionLine,
        candidates: selection.moves.map(slimMove),
        uses: selection.uses
      });
      if (!selection.moves.length) return makeFinal({
        lines,
        events,
        state,
        game,
        status: "fail",
        reason: "no_filtered_candidate"
      });

      const chosen = selection.moves[0];
      state.activeRule = chosen.ruleName;
      state.activeThreat = activeThreatFor(chosen);
      state.boundTarget = chooseBoundTarget(chosen) || state.boundTarget;
      const actionLine = `TRY ${movePrefix(snapshot, chosen.san)} BECAUSE ${chosen.ruleName}`;
      lines.push(actionLine);
      events.push({
        type: "try",
        depth: state.ply,
        role: "our",
        log: actionLine,
        comment: actionLine,
        move: slimMove(chosen),
        fenBefore: chosen.fenBefore,
        fenAfter: chosen.fenAfter,
        policyThreat: chosen.policyThreat
      });
      game = makeGame(createGame, chosen.fenAfter);
      state.path.push(chosen.uci);
      state.ply += 1;
      state.triesUsed += 1;
      state.lastMove = chosen;
      state.lastActor = "try";
      const report = stateReport(state, game, selectionWithKind);
      const stateLine = `REPORT STATE ${stableStringify(report)}`;
      lines.push(stateLine);
      events.push({ type: "state", depth: state.ply, log: stateLine, state: report });
    } else {
      const selection = selectReplies(snapshot, policy, state);
      const selectionWithKind = { ...selection, kind: "reply" };
      const selectionLine = formatSelectionLine("reply", selectionWithKind);
      lines.push(selectionLine);
      events.push({
        type: "filter",
        depth: state.ply,
        role: "reply",
        log: selectionLine,
        replies: selection.moves.map(slimMove),
        closed: selection.closed.map(slimMove),
        deferred: selection.deferred.map(slimMove),
        uses: selection.uses
      });
      if (!selection.moves.length) {
        if (snapshot.moves.length && selection.closed.length === snapshot.moves.length) {
          return makeFinal({ lines, events, state, game, status: "solve", reason: "all_replies_closed_by_policy" });
        }
        return makeFinal({ lines, events, state, game, status: "fail", reason: "no_live_reply" });
      }

      const chosen = selection.moves[0];
      state.activeRule = chosen.ruleName;
      const actionLine = `REPLY ${movePrefix(snapshot, chosen.san)} BECAUSE ${chosen.ruleName}`;
      lines.push(actionLine);
      events.push({
        type: "reply",
        depth: state.ply,
        role: "reply",
        log: actionLine,
        comment: actionLine,
        move: slimMove(chosen),
        fenBefore: chosen.fenBefore,
        fenAfter: chosen.fenAfter,
        policyThreat: chosen.policyThreat
      });
      game = makeGame(createGame, chosen.fenAfter);
      state.path.push(chosen.uci);
      state.ply += 1;
      state.lastMove = chosen;
      state.lastActor = "reply";
      state.activeThreat = activeThreatFor(chosen);
      if (chosen.isCapture) state.boundTarget = chosen.targetSquareName;
      const report = stateReport(state, game, selectionWithKind);
      const stateLine = `REPORT STATE ${stableStringify(report)}`;
      lines.push(stateLine);
      events.push({ type: "state", depth: state.ply, log: stateLine, state: report });
    }
  }

  return makeFinal({ lines, events, state, game, status: "fail", reason: "driver_guard" });
}

export function runOnePass({ createGame, game, policy: rawPolicy, maxCandidates = 8 } = {}) {
  const policy = validatePolicyObject(rawPolicy || FALLBACK_POLICY);
  const snapshot = inspectPosition({ createGame, game });
  const state = createInitialRunState(game, policy, "preview");
  const observed = formatObservationText(snapshot, policy);
  const role = snapshot.side === state.rootSide ? "our" : "reply";
  const selection = role === "our"
    ? { ...selectCandidates(snapshot, policy, state), kind: "our", closed: [], deferred: [] }
    : { ...selectReplies(snapshot, policy, state), kind: "reply" };
  selection.moves = selection.moves.slice(0, Math.max(1, Number(maxCandidates || 8)));
  const line = formatSelectionLine(role === "our" ? "our" : "reply", selection);
  return {
    status: selection.moves.length ? "searching" : "inconclusive",
    log: line,
    steps: ["THINK OBSERVE.", observed.line, line],
    observations: observed.visible,
    candidates: selection.moves.map(slimMove),
    uses: selection.uses,
    policyThreats: selection.moves.map((move) => move.policyThreat).filter(Boolean)
  };
}

function cloneEvent(event) {
  const output = { ...event };
  if (event.move) output.move = { ...event.move, tags: [...(event.move.tags || [])] };
  if (event.observations) output.observations = event.observations.map((item) => ({ ...item }));
  if (event.state) output.state = deepClone(event.state);
  if (event.result) output.result = deepClone(event.result);
  return output;
}

export function createReasoner({ createGame, policy: rawPolicy, maxSteps = 5000 } = {}) {
  const policy = validatePolicyObject(rawPolicy || FALLBACK_POLICY);
  let plan = null;
  let cursor = 0;
  let startFen = "";

  const reasoner = {
    state: {
      status: "idle",
      cursor: 0,
      totalSteps: 0,
      finalResult: null,
      output: ""
    },

    reset(game) {
      startFen = game.exportFEN();
      const run = runPolicyTrace({ createGame, fen: startFen, policy, name: game.tags?.Event || "" });
      plan = run;
      cursor = 0;
      reasoner.state = {
        status: "searching",
        cursor: 0,
        totalSteps: Math.min(run.events.length, Math.max(1, Number(maxSteps || 5000))),
        finalResult: run.result,
        output: run.output
      };
      return reasoner.state;
    },

    inspect(game) {
      return inspectPosition({ createGame, game });
    },

    step(game) {
      if (!game) throw new Error("reasoner.step(game) requires a ScratchChess Game");
      if (!plan) reasoner.reset(game);
      if (cursor >= reasoner.state.totalSteps) {
        reasoner.state.status = plan.result.status;
        return {
          type: "done",
          status: plan.result.status,
          log: `END ${plan.status === "solve" ? "SOLVE" : "FAIL"} reason=${plan.reason}`,
          result: plan.result
        };
      }

      const event = cloneEvent(plan.events[cursor]);
      cursor += 1;
      reasoner.state.cursor = cursor;

      if ((event.type === "try" || event.type === "reply") && event.move?.uci) {
        const currentFen = game.exportFEN();
        if (currentFen !== event.fenBefore) {
          throw new Error(`Reasoner/display FEN divergence before ${event.move.uci}: expected ${event.fenBefore}, saw ${currentFen}`);
        }
        const node = applyUci(game, event.move.uci);
        event.node = node;
        event.move.node = node;
        event.move.san = node?.san || event.move.san;
        event.move.policyThreat = event.policyThreat || event.move.policyThreat;
      }

      if (event.type === "done") {
        reasoner.state.status = event.status || plan.result.status;
        reasoner.state.finalResult = event.result || plan.result;
      } else {
        reasoner.state.status = "searching";
      }
      return event;
    }
  };

  return reasoner;
}

export function describeAlgorithm(policyInput = FALLBACK_POLICY) {
  const policy = validatePolicyObject(policyInput);
  const ourCases = policy.our_move_flow.map((entry, index) =>
    `${index + 1}. ${entry.case}: when ${entry.when}, FILTER all ScratchChess moves through ${entry.filter.join(" → ")}${entry.fallthrough ? "; then fall through" : "; stop at this case"}.`
  );
  const replies = policy.opponent_reply_flow.map((entry, index) =>
    `${index + 1}. ${entry.case}: ${entry.when} → ${entry.action}${entry.close_with ? ` (${entry.close_with})` : ""}.`
  );
  return [
    `${policy.name} (${policy.version})`,
    "",
    "Invariant: ScratchChess enumerates every legal one-ply move. The policy never generates a move; it only filters and orders that legal set.",
    `Objective: ${policy.objective.type}; gain goal ${policy.objective.gain_goal}; settlement ${policy.objective.settle_after}.`,
    `Limits: ${policy.profile.max_plies} plies, ${policy.profile.try_budget} tries, ${policy.profile.max_live_replies} live replies, see-after ${policy.profile.see_after}.`,
    "",
    "OUR MOVE SWITCH",
    ...ourCases,
    "",
    "OPPONENT REPLY SWITCH",
    ...replies,
    "",
    "TRACE",
    "THINK OBSERVE. → SAW predicates → CANDIDATES/REPLIES with rule citations → TRY/REPLY → REPORT STATE → END SOLVE/FAIL."
  ].join("\n");
}

export const POLICY_OPTIONS = Object.freeze({
  moveSource: "scratchchess_all_legal_moves",
  policyOperation: "filter_only",
  traceVersion: TRACE_VERSION,
  conditions: Object.freeze([...CONDITIONS.keys()].sort()),
  filters: Object.freeze([...MOVE_FILTERS.keys()].sort()),
  replyRules: Object.freeze([...REPLY_RULES.keys()].sort()),
  predicates: Object.freeze([...PREDICATE_DEFINITIONS.keys()].sort())
});
