/*
 * algo.js
 * Predicate Chess — Forcing Clamp 1
 *
 * This module has two deliberately separate execution paths:
 *
 * 1. Policy search. Unknown positions are solved by the finite thought loop
 *    OBSERVE -> THREAT -> REPLIES -> OBSERVE/CASH/COMPARE. Candidate generation
 *    uses current-position predicates plus one-ply result predicates only.
 *
 * 2. Conformance trace. A cleaned CTT/1 trace may be supplied for a training
 *    puzzle. The reasoner executes the trace verb by verb, verifies every TRY
 *    against ScratchChess legality, enforces the same policy budgets, and builds
 *    the explored variation tree. This is how the 50 worked examples serve as
 *    executable tests rather than informal prose.
 *
 * ScratchChess owns legal move generation, SAN, FEN transitions, and the move
 * tree. Predicate Chess owns observation, candidate selection, reply proof,
 * thought-state transitions, and trace emission.
 */

export const DEFAULT_POLICY_URL = "https://priyomes.com/policy.json";
export const POLICY_VERSION = "predicate-chess-policy/v1";

const FILES = "abcdefgh";
const COLORS = Object.freeze(["w", "b"]);
const PROMOTIONS = Object.freeze(["q", "r", "b", "n"]);
const PIECE_VALUES = Object.freeze({ p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 });
const THOUGHT_STATES = Object.freeze(["OBSERVE", "THREAT", "REPLIES", "CASH", "COMPARE", "FIX", "PROVED", "HORIZON", "GIVEUP"]);

export const PREDICATE_CATALOG = Object.freeze([
  ["check", "check(move)", "A legal move gives check."],
  ["mate_in_1", "mate_in_1(move)", "A legal move checkmates immediately."],
  ["mate_threat", "mate_threat(move)", "A move creates a mate-in-one threat."],
  ["attacked", "attacked(piece,attacker)", "A piece is attacked."],
  ["loose", "loose(piece)", "A non-king is attacked and has no pawn defender."],
  ["defenders", "defenders(piece,[pieces])", "The listed pieces defend the target."],
  ["sole_defender", "sole_defender(defender,piece)", "Exactly one piece defends the target."],
  ["shared_defender", "shared_defender(defender,[pieces])", "One piece defends two or more loose pieces."],
  ["overloaded", "overloaded(piece,[duties])", "A piece has multiple tactical defensive duties."],
  ["alignment", "alignment(piece1,piece2,piece3...)", "Three or more occupied squares lie on one line."],
  ["pin", "pin(attacker,pinned,king_or_queen)", "A line piece pins another piece to a king or queen."],
  ["skewer", "skewer(attacker,front,rear)", "A line attack places the more valuable target in front."],
  ["fork", "fork(attacker,[targets])", "One piece attacks two valuable targets."],
  ["xray", "xray(attacker,blocker,target)", "A line attacker would reach the target through one blocker."],
  ["discovered_attack", "discovered_attack(attacker,blocker,target)", "Moving the blocker opens an attack."],
  ["clearance", "clearance(piece,line_or_square)", "A piece can vacate a useful line or square."],
  ["interference", "interference(move,defensive_line)", "A move blocks a defensive line."],
  ["deflection", "deflection(move,defender,target)", "A move pulls a defender away from a target."],
  ["line_blocker", "line_blocker(piece,line)", "A piece blocks a line."],
  ["open_file", "open_file(file,pieces)", "A rook or queen has an open-file route."],
  ["restricted_mobility", "restricted_mobility(piece)", "A king or valuable piece has very few safe moves."],
  ["flight_squares", "flight_squares(king,[squares])", "The king's legal flight squares."],
  ["back_rank_clamp", "back_rank_clamp(king)", "The king is confined on its back rank."],
  ["mating_net", "mating_net([attackers],king)", "Attackers and mobility form a mating net."],
  ["passed_pawn", "passed_pawn(pawn)", "No enemy pawn can stop the pawn on its file or adjacent files."],
  ["promotion_threat", "promotion_threat(pawn)", "The pawn threatens immediate promotion."],
  ["blockader", "blockader(piece,pawn)", "A piece blocks a passed pawn."],
  ["recapture", "recapture(move)", "A move immediately recaptures on the previous capture square."],
  ["capture_order", "capture_order([moves])", "Two related captures must be compared in order."],
  ["safe_retreat", "safe_retreat(piece,square)", "The winning piece can retreat without losing the gain."],
  ["gain_survives_forcing_probe", "gain_survives_forcing_probe", "The gain survives the policy's forcing reply probe."],
  ["in_check", "in_check(side)", "The side to move is in check."],
  ["mate", "mate(side)", "The side to move is checkmated."],
  ["goal", "goal(text)", "A manually attached tactical objective."],
  ["threat", "threat(text)", "A manually attached tactical threat."],
  ["focal_square", "focal_square(square)", "A manually attached focal square."],
  ["align", "align(a,b,line)", "A manually attached alignment."],
  ["mobility_trap", "mobility_trap(piece)", "An attacked piece has no safe move of its own."]
].map(([name, signature, description]) => Object.freeze({
  name,
  signature,
  description,
  humanVisible: !["attacked", "defenders"].includes(name),
  manual: ["goal", "threat", "focal_square", "align"].includes(name)
})));

const PREDICATE_BY_NAME = new Map(PREDICATE_CATALOG.map((item) => [item.name, item]));
const HUMAN_VISIBLE = new Set(PREDICATE_CATALOG.filter((item) => item.humanVisible).map((item) => item.name));

export const FALLBACK_POLICY = deepFreeze({
  version: POLICY_VERSION,
  name: "forcing-clamp-1",
  description: "Predicate Chess fallback policy.",
  profile: {
    see_after: 1,
    try_budget: 10,
    check_horizon: 2,
    forcing_reply_probe: 1,
    quiet_budget: 0,
    repair_budget: 0,
    behind_quiet_budget: 0,
    gain_goal: "minor_piece"
  },
  objective: {
    mate_always_succeeds: true,
    default_material_delta_pawns: 3,
    settlement: "after_forcing_replies"
  },
  proof: {
    our_nodes: "exists",
    opponent_nodes: "forall_legal",
    reply_mode: "exhaustive",
    unclassified_reply: "live",
    first_refutation_stops_our_candidate: true,
    stop_immediately_at_proved: true
  },
  thought_states: THOUGHT_STATES.map((id) => ({ id, meaning: id })),
  candidate_selection: {
    instruction: "Choose the first nonempty group.",
    groups: [
      { id: "mate", condition: "after(move).mate" },
      { id: "single_reply_check", condition: "after(move).check and after(move).legal_reply_classes == 1" },
      { id: "objective_capture", condition: "after(move).capture reaches objective" },
      { id: "check_most_uses", condition: "after(move).check", prefer: "most USES" },
      { id: "forcing_most_uses", condition: "move is forcing", prefer: "most USES" }
    ]
  },
  forcing_move_kinds: [
    "check", "capture", "mate_in_1_threat", "promotion_threat", "attack_queen",
    "attack_loose_piece", "attack_defender", "pin_defender", "remove_defender",
    "fork", "skewer", "line_opening"
  ],
  reply_order: [
    "check", "capture_attacker_or_winning_piece", "save_or_continue_defending_target",
    "mate_in_1_threat", "equal_or_greater_material_counterthreat", "remaining_live_reply"
  ],
  rules: [
    { id: "SEE-FIRST", text: "Observe before generating candidates." },
    { id: "PICK-OUR-MOVE", text: "Choose the first nonempty candidate group." },
    { id: "ALL-REPLIES", text: "Represent every legal reply." },
    { id: "TRY-REPLIES", text: "Try every live reply." },
    { id: "FIRST-REFUTATION-STOPS", text: "One reply refutes one candidate." },
    { id: "REPLY-CLASS", text: "Group only replies with the same closure witness." },
    { id: "CAPTURE-ORDER", text: "Compare related captures." },
    { id: "HORIZON", text: "Do not begin a new theme beyond the horizon." },
    { id: "URGENCY", text: "When behind, remain forcing." },
    { id: "CASH-SAFETY", text: "Permit direct conversion after the gain." }
  ],
  closure_rules: [
    { id: "CLOSE-MATE-IN-ONE", requires: "mate witness" },
    { id: "CLOSE-ABANDON", requires: "abandoned target witness" },
    { id: "CLOSE-ONE-PLY-TACTIC", requires: "one-ply tactical witness" },
    { id: "CLOSE-WIN-WITH-CHECK", requires: "checking gain witness" },
    { id: "CLOSE-RECAPTURE", requires: "recapture witness" },
    { id: "CLOSE-GAIN-CLAMP", requires: "no forcing recovery" },
    { id: "CLOSE-PROMOTION", requires: "promotion witness" },
    { id: "CLOSE-FORCED-TRADE", requires: "forced trade witness" }
  ],
  predicates: PREDICATE_CATALOG.filter((item) => !item.manual).map((item) => ({
    id: item.name,
    signature: item.signature,
    source: "position_or_one_ply"
  })),
  trace: {
    verbs: ["THINK", "SAW", "CANDIDATES", "TRY", "REPLY", "FROM", "PROVED", "HORIZON", "GIVEUP"],
    count_position_on: "TRY",
    plain_english_headings: ["OBSERVE", "THREAT", "REPLIES", "COMPARE", "CASH", "PROVED", "HORIZON", "GIVEUP"]
  }
});

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  Object.values(value).forEach(deepFreeze);
  return value;
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeId(value) {
  return String(value || "").trim().toLowerCase().replace(/-/g, "_");
}

export function validatePolicy(policy) {
  const errors = [];
  if (!isObject(policy)) return { valid: false, errors: ["$: must be an object"] };
  if (policy.version !== POLICY_VERSION) errors.push(`$.version: must equal ${POLICY_VERSION}`);
  if (typeof policy.name !== "string" || !policy.name.trim()) errors.push("$.name: required");

  const profile = policy.profile;
  if (!isObject(profile)) errors.push("$.profile: required");
  else {
    const exact = {
      see_after: 1,
      try_budget: 10,
      check_horizon: 2,
      forcing_reply_probe: 1,
      quiet_budget: 0,
      repair_budget: 0,
      behind_quiet_budget: 0,
      gain_goal: "minor_piece"
    };
    for (const [key, expected] of Object.entries(exact)) {
      if (profile[key] !== expected) errors.push(`$.profile.${key}: must equal ${JSON.stringify(expected)}`);
    }
  }

  if (policy.proof?.opponent_nodes !== "forall_legal") errors.push("$.proof.opponent_nodes: must be forall_legal");
  if (policy.proof?.reply_mode !== "exhaustive") errors.push("$.proof.reply_mode: must be exhaustive");
  if (policy.proof?.unclassified_reply !== "live") errors.push("$.proof.unclassified_reply: must be live");

  const states = new Set((policy.thought_states || []).map((item) => item?.id));
  THOUGHT_STATES.forEach((state) => { if (!states.has(state)) errors.push(`$.thought_states: missing ${state}`); });

  const groups = (policy.candidate_selection?.groups || []).map((item) => item?.id);
  const expectedGroups = ["mate", "single_reply_check", "objective_capture", "check_most_uses", "forcing_most_uses"];
  if (groups.join("|") !== expectedGroups.join("|")) errors.push("$.candidate_selection.groups: wrong order");

  const closureIds = new Set((policy.closure_rules || []).map((item) => item?.id));
  ["CLOSE-MATE-IN-ONE", "CLOSE-ABANDON", "CLOSE-ONE-PLY-TACTIC", "CLOSE-WIN-WITH-CHECK", "CLOSE-RECAPTURE", "CLOSE-GAIN-CLAMP"].forEach((id) => {
    if (!closureIds.has(id)) errors.push(`$.closure_rules: missing ${id}`);
  });

  return { valid: errors.length === 0, errors };
}

export function assertPolicy(policy) {
  const validation = validatePolicy(policy);
  if (!validation.valid) {
    const error = new Error(`Invalid Predicate Chess policy:\n${validation.errors.map((item) => `- ${item}`).join("\n")}`);
    error.validationErrors = validation.errors;
    throw error;
  }
  return policy;
}

export async function loadPolicy(url = DEFAULT_POLICY_URL, { allowFallback = true, fallbackPolicy = FALLBACK_POLICY } = {}) {
  try {
    const response = await fetch(url, { cache: "no-store", headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const policy = await response.json();
    assertPolicy(policy);
    return { policy: deepFreeze(cloneJson(policy)), source: "live", url, warning: "" };
  } catch (error) {
    if (!allowFallback) throw error;
    assertPolicy(fallbackPolicy);
    return {
      policy: deepFreeze(cloneJson(fallbackPolicy)),
      source: "fallback",
      url,
      warning: `Could not load ${url}; using embedded forcing-clamp-1. ${error?.message || error}`
    };
  }
}

/* -------------------------------------------------------------------------- */
/* ScratchChess and board helpers                                              */
/* -------------------------------------------------------------------------- */

const idx = (file, rank) => (7 - rank) * 8 + file;
const FR = (index) => [index % 8, 7 - Math.floor(index / 8)];
const inBounds = (file, rank) => file >= 0 && file < 8 && rank >= 0 && rank < 8;
const other = (color) => color === "w" ? "b" : "w";
const normalizeColor = (color) => color === "b" ? "b" : "w";

function squareName(index) {
  const [file, rank] = FR(index);
  return `${FILES[file]}${rank + 1}`;
}

function parseSquare(square) {
  const value = String(square || "").toLowerCase();
  if (!/^[a-h][1-8]$/.test(value)) return null;
  return idx(value.charCodeAt(0) - 97, Number(value[1]) - 1);
}

function squareIndex(value) {
  if (Number.isInteger(value) && value >= 0 && value < 64) return value;
  if (typeof value === "string") return parseSquare(value);
  return null;
}

function boardOf(game) {
  return game?.state?.board || [];
}

function pieceLetter(piece) {
  if (!piece) return "?";
  return ({ p: "P", n: "N", b: "B", r: "R", q: "Q", k: "K" })[piece.type] || "?";
}

function pieceLabel(piece, index) {
  return `${pieceLetter(piece)}@${squareName(index)}`;
}

function pieceRef(piece, index) {
  return {
    color: piece?.color || null,
    type: piece?.type || null,
    square: squareName(index),
    index,
    label: pieceLabel(piece, index),
    value: PIECE_VALUES[piece?.type] || 0
  };
}

function normalizePromotion(value) {
  return String(value || "").toLowerCase().replace(/[^qrbn]/g, "").slice(0, 1);
}

function moveNeedsPromotion(game, from, to) {
  const piece = boardOf(game)[from];
  if (!piece || piece.type !== "p") return false;
  const [, rank] = FR(to);
  return (piece.color === "w" && rank === 7) || (piece.color === "b" && rank === 0);
}

function safeLegalMoves(game, color) {
  try {
    const moves = game?._allLegalMoves?.(color);
    return Array.isArray(moves) ? moves : [];
  } catch {
    return [];
  }
}

function safeInCheck(game, color) {
  try { return Boolean(game?._isInCheck?.(color)); } catch { return false; }
}

function fenWithSide(fen, side) {
  const fields = String(fen || "").trim().split(/\s+/);
  if (fields.length < 4) throw new Error("Invalid FEN");
  if (fields[1] !== side) fields[3] = "-";
  fields[1] = side;
  return fields.join(" ");
}

function normalizedPositionKey(fen) {
  return String(fen || "").trim().split(/\s+/).slice(0, 4).join(" ");
}

function cloneGame(createGame, fen, tags = {}) {
  const game = createGame({ Event: "Predicate Chess analysis", Site: "algo.js", ...tags });
  game.loadFEN(fen);
  return game;
}

function gameForSide(createGame, game, side) {
  return cloneGame(createGame, fenWithSide(game.exportFEN(), side));
}

function legalMoveRecords(createGame, game, color = game?.state?.side) {
  const side = normalizeColor(color);
  const analysisGame = side === game?.state?.side ? game : gameForSide(createGame, game, side);
  const rawMoves = safeLegalMoves(analysisGame, side);
  const output = [];
  for (const raw of rawMoves) {
    const from = squareIndex(raw?.from ?? raw?.fromSq ?? raw?.source ?? raw?.src);
    const to = squareIndex(raw?.to ?? raw?.toSq ?? raw?.target ?? raw?.dst);
    if (from == null || to == null) continue;
    const explicit = normalizePromotion(raw?.promotion ?? raw?.promote ?? raw?.promo ?? raw?.promotionPiece);
    const promotions = moveNeedsPromotion(analysisGame, from, to) ? (explicit ? [explicit] : PROMOTIONS) : [""];
    for (const promotion of promotions) {
      const mover = boardOf(analysisGame)[from] || null;
      const captured = boardOf(analysisGame)[to] || null;
      output.push({ raw, from, to, promotion, uci: `${squareName(from)}${squareName(to)}${promotion}`, mover, captured });
    }
  }
  const seen = new Set();
  return output.filter((move) => !seen.has(move.uci) && seen.add(move.uci));
}

function applyMoveUCI(game, uci) {
  const ok = game.makeMoveUCI(uci);
  if (!ok) return false;
  if (game.state?.pendingPromotion) {
    const promotion = normalizePromotion(uci[4]) || "q";
    game.resolvePendingPromotion(promotion.toUpperCase());
  }
  return true;
}

function afterMove(createGame, game, move) {
  const clone = cloneGame(createGame, game.exportFEN());
  if (!applyMoveUCI(clone, typeof move === "string" ? move : move.uci)) return null;
  return clone;
}

function sanAfterMove(createGame, game, move) {
  const after = afterMove(createGame, game, move);
  return after ? String(after.curNode?.san || move.uci).trim() : move.uci;
}

function materialFor(game, color) {
  let total = 0;
  for (const piece of boardOf(game)) if (piece?.color === color) total += PIECE_VALUES[piece.type] || 0;
  return total;
}

function materialDelta(game, rootSide, rootMaterial) {
  const current = materialFor(game, rootSide) - materialFor(game, other(rootSide));
  return current - rootMaterial;
}

function terminalInfo(createGame, game) {
  const side = normalizeColor(game?.state?.side);
  const legal = legalMoveRecords(createGame, game, side);
  if (legal.length) return null;
  return safeInCheck(game, side)
    ? { kind: "mate", winner: other(side), loser: side }
    : { kind: "stalemate", winner: null, loser: null };
}

function clearLine(board, from, to, df, dr) {
  let [file, rank] = FR(from);
  file += df;
  rank += dr;
  while (inBounds(file, rank)) {
    const current = idx(file, rank);
    if (current === to) return true;
    if (board[current]) return false;
    file += df;
    rank += dr;
  }
  return false;
}

export function attacksSquare(board, from, to) {
  const piece = board?.[from];
  if (!piece || from === to) return false;
  const [ff, fr] = FR(from);
  const [tf, tr] = FR(to);
  const df = tf - ff;
  const dr = tr - fr;
  const af = Math.abs(df);
  const ar = Math.abs(dr);
  if (piece.type === "p") return af === 1 && dr === (piece.color === "w" ? 1 : -1);
  if (piece.type === "n") return (af === 1 && ar === 2) || (af === 2 && ar === 1);
  if (piece.type === "k") return Math.max(af, ar) === 1;
  if ((piece.type === "b" || piece.type === "q") && af === ar && af > 0) return clearLine(board, from, to, Math.sign(df), Math.sign(dr));
  if ((piece.type === "r" || piece.type === "q") && ((df === 0 && ar > 0) || (dr === 0 && af > 0))) return clearLine(board, from, to, Math.sign(df), Math.sign(dr));
  return false;
}

export function attackersOf(game, targetIndex, byColor) {
  const board = boardOf(game);
  const output = [];
  for (let from = 0; from < 64; from += 1) {
    const piece = board[from];
    if (!piece || piece.color !== byColor || !attacksSquare(board, from, targetIndex)) continue;
    output.push({ index: from, square: squareName(from), piece, label: pieceLabel(piece, from), ref: pieceRef(piece, from) });
  }
  return output;
}

function observation(predicate, text, extra = {}) {
  return {
    predicate,
    kind: predicate,
    text,
    humanVisible: Boolean(PREDICATE_BY_NAME.get(predicate)?.humanVisible),
    ...extra
  };
}

function dedupeObservations(items) {
  const seen = new Set();
  return (items || []).filter((item) => {
    const key = `${item.predicate}|${item.text}|${item.from || ""}|${item.to || ""}|${item.square || ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function makeManualObservation(predicate, args = [], extra = {}) {
  const name = normalizeId(predicate);
  const catalog = PREDICATE_BY_NAME.get(name);
  if (!catalog?.manual) throw new Error(`Unknown manual predicate: ${predicate}`);
  const values = Array.isArray(args) ? args : [args];
  return observation(name, `${name}(${values.map(String).join(",")})`, { manual: true, args: values, ...extra });
}

/* -------------------------------------------------------------------------- */
/* Position predicates                                                         */
/* -------------------------------------------------------------------------- */

function relationSnapshot(game, rootSide) {
  const board = boardOf(game);
  const observations = [];
  const relations = new Map();
  const loose = [];
  const soleDefenders = [];

  for (let target = 0; target < 64; target += 1) {
    const piece = board[target];
    if (!piece) continue;
    const attackers = attackersOf(game, target, other(piece.color));
    const defenders = attackersOf(game, target, piece.color).filter((item) => item.index !== target);
    const pawnDefenders = defenders.filter((item) => item.piece.type === "p");
    relations.set(target, { target, piece, attackers, defenders, pawnDefenders });

    for (const attacker of attackers) {
      observations.push(observation("attacked", `attacked(${pieceLabel(piece, target)},${attacker.label})`, {
        humanVisible: false,
        from: attacker.square,
        to: squareName(target),
        square: squareName(target),
        targetRef: pieceRef(piece, target),
        attackerRef: attacker.ref
      }));
    }
    if (defenders.length) {
      observations.push(observation("defenders", `defenders(${pieceLabel(piece, target)},[${defenders.map((item) => item.label).join(",")}])`, {
        humanVisible: false,
        square: squareName(target),
        targetRef: pieceRef(piece, target),
        defenderRefs: defenders.map((item) => item.ref)
      }));
    }
    if (piece.type !== "k" && attackers.length > 0 && pawnDefenders.length === 0) {
      const item = observation("loose", `loose(${pieceLabel(piece, target)})`, {
        square: squareName(target),
        pieceRef: pieceRef(piece, target),
        pieceIndex: target,
        pieceColor: piece.color,
        side: piece.color === rootSide ? "us" : "enemy",
        attackers,
        defenders,
        detail: `attackers=${attackers.length}; defenders=${defenders.length}; pawn_defenders=0`
      });
      observations.push(item);
      loose.push(item);
    }
    if (piece.type !== "k" && defenders.length === 1) {
      const item = observation("sole_defender", `sole_defender(${defenders[0].label},${pieceLabel(piece, target)})`, {
        square: defenders[0].square,
        from: defenders[0].square,
        to: squareName(target),
        defenderRef: defenders[0].ref,
        targetRef: pieceRef(piece, target),
        targetIndex: target,
        side: piece.color === rootSide ? "us" : "enemy"
      });
      observations.push(item);
      soleDefenders.push(item);
    }
  }

  const groups = new Map();
  for (const target of loose) {
    const relation = relations.get(target.pieceIndex);
    for (const defender of relation?.defenders || []) {
      const key = `${defender.piece.color}:${defender.index}`;
      if (!groups.has(key)) groups.set(key, { defender, targets: [] });
      groups.get(key).targets.push(target);
    }
  }
  const sharedDefenders = [];
  for (const group of groups.values()) {
    if (group.targets.length < 2) continue;
    const item = observation("shared_defender", `shared_defender(${group.defender.label},[${group.targets.map((target) => target.pieceRef.label).join(",")}])`, {
      square: group.defender.square,
      defenderRef: group.defender.ref,
      targetRefs: group.targets.map((target) => target.pieceRef),
      targetIndices: group.targets.map((target) => target.pieceIndex),
      side: group.defender.piece.color === rootSide ? "us" : "enemy"
    });
    observations.push(item);
    sharedDefenders.push(item);
  }

  return { relations, observations, loose, soleDefenders, sharedDefenders };
}

function alignmentSnapshot(game, rootSide) {
  const board = boardOf(game);
  const observations = [];
  const directions = [[1, 0], [0, 1], [1, 1], [1, -1]];
  const seen = new Set();
  for (let start = 0; start < 64; start += 1) {
    const [sf, sr] = FR(start);
    for (const [df, dr] of directions) {
      // Only begin at the edge of this line to avoid duplicates.
      if (inBounds(sf - df, sr - dr)) continue;
      const occupied = [];
      let file = sf;
      let rank = sr;
      while (inBounds(file, rank)) {
        const index = idx(file, rank);
        if (board[index]) occupied.push(index);
        file += df;
        rank += dr;
      }
      for (let i = 0; i + 2 < occupied.length; i += 1) {
        const triple = occupied.slice(i, i + 3);
        const front = board[triple[0]];
        const back = board[triple[2]];
        if (!front || !back || front.color === back.color) continue;
        const key = triple.join("-");
        if (seen.has(key)) continue;
        seen.add(key);
        observations.push(observation("alignment", `alignment(${triple.map((index) => pieceLabel(board[index], index)).join(",")})`, {
          from: squareName(triple[0]),
          to: squareName(triple[2]),
          square: squareName(triple[1]),
          pieceRefs: triple.map((index) => pieceRef(board[index], index)),
          line: triple,
          side: "both"
        }));
      }
    }
  }
  return observations;
}

function pinSnapshot(game, rootSide) {
  const board = boardOf(game);
  const observations = [];
  const directions = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  const sliderMatches = (piece, df, dr) => {
    const diagonal = Math.abs(df) === 1 && Math.abs(dr) === 1;
    return diagonal ? ["b", "q"].includes(piece?.type) : ["r", "q"].includes(piece?.type);
  };
  for (const anchorType of ["k", "q"]) {
    for (const color of COLORS) {
      for (let anchor = 0; anchor < 64; anchor += 1) {
        const anchorPiece = board[anchor];
        if (!anchorPiece || anchorPiece.color !== color || anchorPiece.type !== anchorType) continue;
        const [af, ar] = FR(anchor);
        for (const [df, dr] of directions) {
          let file = af + df;
          let rank = ar + dr;
          let candidate = null;
          while (inBounds(file, rank)) {
            const current = idx(file, rank);
            const piece = board[current];
            if (!piece) { file += df; rank += dr; continue; }
            if (!candidate) {
              if (piece.color === color && piece.type !== "k") {
                candidate = current;
                file += df;
                rank += dr;
                continue;
              }
              break;
            }
            if (piece.color !== color && sliderMatches(piece, df, dr)) {
              observations.push(observation("pin", `pin(${pieceLabel(piece, current)},${pieceLabel(board[candidate], candidate)},${pieceLabel(anchorPiece, anchor)})`, {
                from: squareName(current), to: squareName(candidate), square: squareName(candidate),
                attackerRef: pieceRef(piece, current), pinnedRef: pieceRef(board[candidate], candidate), anchorRef: pieceRef(anchorPiece, anchor),
                side: board[candidate].color === rootSide ? "us" : "enemy"
              }));
            }
            break;
          }
        }
      }
    }
  }
  return observations;
}

function passedPawnSnapshot(game, rootSide) {
  const board = boardOf(game);
  const observations = [];
  for (let index = 0; index < 64; index += 1) {
    const pawn = board[index];
    if (!pawn || pawn.type !== "p") continue;
    const [file, rank] = FR(index);
    const direction = pawn.color === "w" ? 1 : -1;
    let blockedByPawn = false;
    for (const testFile of [file - 1, file, file + 1]) {
      if (testFile < 0 || testFile > 7) continue;
      for (let testRank = rank + direction; inBounds(testFile, testRank); testRank += direction) {
        const piece = board[idx(testFile, testRank)];
        if (piece?.type === "p" && piece.color !== pawn.color) blockedByPawn = true;
      }
    }
    if (!blockedByPawn) {
      observations.push(observation("passed_pawn", `passed_pawn(${pieceLabel(pawn, index)})`, {
        square: squareName(index), pieceRef: pieceRef(pawn, index), side: pawn.color === rootSide ? "us" : "enemy"
      }));
    }
    const promotionRank = pawn.color === "w" ? 7 : 0;
    if (rank + direction === promotionRank) {
      observations.push(observation("promotion_threat", `promotion_threat(${pieceLabel(pawn, index)})`, {
        square: squareName(index), pieceRef: pieceRef(pawn, index), side: pawn.color === rootSide ? "us" : "enemy"
      }));
    }
  }
  return observations;
}

function kingMobilitySnapshot(createGame, game, rootSide) {
  const board = boardOf(game);
  const observations = [];
  for (const color of COLORS) {
    const king = board.findIndex((piece) => piece?.color === color && piece.type === "k");
    if (king < 0) continue;
    const analysis = gameForSide(createGame, game, color);
    const flights = legalMoveRecords(createGame, analysis, color)
      .filter((move) => move.from === king)
      .map((move) => squareName(move.to));
    observations.push(observation("flight_squares", `flight_squares(${pieceLabel(board[king], king)},[${flights.join(",")}])`, {
      square: squareName(king), kingRef: pieceRef(board[king], king), flights, side: color === rootSide ? "us" : "enemy"
    }));
    if (flights.length <= 2) {
      observations.push(observation("restricted_mobility", `restricted_mobility(${pieceLabel(board[king], king)})`, {
        square: squareName(king), kingRef: pieceRef(board[king], king), flights, side: color === rootSide ? "us" : "enemy"
      }));
    }
    const [, rank] = FR(king);
    if ((color === "w" && rank === 0) || (color === "b" && rank === 7)) {
      if (flights.every((square) => Number(square[1]) - 1 === rank)) {
        observations.push(observation("back_rank_clamp", `back_rank_clamp(${pieceLabel(board[king], king)})`, {
          square: squareName(king), kingRef: pieceRef(board[king], king), side: color === rootSide ? "us" : "enemy"
        }));
      }
    }
  }
  return observations;
}

function movedPieceFork(game, move, rootSide) {
  const board = boardOf(game);
  const piece = board[move.to];
  if (!piece) return null;
  const targets = [];
  for (let index = 0; index < 64; index += 1) {
    const target = board[index];
    if (!target || target.color === piece.color) continue;
    if (!attacksSquare(board, move.to, index)) continue;
    if (target.type === "k" || PIECE_VALUES[target.type] >= 3) targets.push(pieceRef(target, index));
  }
  if (targets.length < 2 && !targets.some((target) => target.type === "k")) return null;
  if (targets.length < 2) return null;
  return observation("fork", `fork(${pieceLabel(piece, move.to)},[${targets.map((target) => target.label).join(",")}])`, {
    from: squareName(move.to), to: targets[0].square, square: squareName(move.to), attackerRef: pieceRef(piece, move.to), targetRefs: targets,
    side: piece.color === rootSide ? "us" : "enemy"
  });
}

function baseSnapshot({ createGame, game, rootSide, includeMovePredicates = true }) {
  const relation = relationSnapshot(game, rootSide);
  const terminal = terminalInfo(createGame, game);
  const sideToMove = normalizeColor(game.state.side);
  const observations = [
    ...relation.observations,
    ...alignmentSnapshot(game, rootSide),
    ...pinSnapshot(game, rootSide),
    ...passedPawnSnapshot(game, rootSide),
    ...kingMobilitySnapshot(createGame, game, rootSide)
  ];
  if (terminal?.kind === "mate") observations.push(observation("mate", `mate(${terminal.loser})`, { side: terminal.loser === rootSide ? "us" : "enemy" }));
  else if (safeInCheck(game, sideToMove)) observations.push(observation("in_check", `in_check(${sideToMove})`, { side: sideToMove === rootSide ? "us" : "enemy" }));

  const snapshot = {
    fen: game.exportFEN(),
    positionKey: normalizedPositionKey(game.exportFEN()),
    rootSide,
    sideToMove,
    terminal,
    inCheck: safeInCheck(game, sideToMove),
    legalMoves: legalMoveRecords(createGame, game, sideToMove),
    relations: relation.relations,
    loose: relation.loose,
    soleDefenders: relation.soleDefenders,
    sharedDefenders: relation.sharedDefenders,
    predicates: dedupeObservations(observations),
    moveFacts: []
  };
  if (includeMovePredicates && !terminal) snapshot.moveFacts = analyzeCandidateMoves({ createGame, game, snapshot, rootSide });
  return snapshot;
}

export function inspectPosition({ createGame, game, rootSide = game?.state?.side, policy = FALLBACK_POLICY } = {}) {
  if (typeof createGame !== "function") throw new Error("inspectPosition requires createGame");
  if (!game) throw new Error("inspectPosition requires a ScratchChess game");
  assertPolicy(policy);
  return baseSnapshot({ createGame, game, rootSide: normalizeColor(rootSide), includeMovePredicates: false });
}

export function observe(game, { createGame, rootSide = game?.state?.side, policy = FALLBACK_POLICY } = {}) {
  return inspectPosition({ createGame, game, rootSide, policy }).predicates;
}

export function humanVisibleObservations(observations) {
  return (observations || []).filter((item) => item.humanVisible || HUMAN_VISIBLE.has(item.predicate));
}

export function predicateCatalog() {
  return PREDICATE_CATALOG.map((item) => ({ ...item }));
}

/* -------------------------------------------------------------------------- */
/* Candidate one-ply predicates                                                */
/* -------------------------------------------------------------------------- */

function mateInOneMoves(createGame, game, side) {
  const analysis = side === game.state.side ? game : gameForSide(createGame, game, side);
  const output = [];
  for (const move of legalMoveRecords(createGame, analysis, side)) {
    const after = afterMove(createGame, analysis, move);
    const terminal = after && terminalInfo(createGame, after);
    if (terminal?.kind === "mate" && terminal.winner === side) output.push({ move, san: String(after.curNode?.san || move.uci), afterFen: after.exportFEN() });
  }
  return output;
}

function attackTargetsFrom(game, from, color) {
  const board = boardOf(game);
  const output = [];
  for (let target = 0; target < 64; target += 1) {
    const piece = board[target];
    if (!piece || piece.color === color || piece.type === "k") continue;
    if (attacksSquare(board, from, target)) output.push(pieceRef(piece, target));
  }
  return output;
}

function predicateKey(item) {
  return `${item.predicate}:${item.text}`;
}

function analyzeCandidateMoves({ createGame, game, snapshot, rootSide, rootMaterial = null, policy = FALLBACK_POLICY, objectivePawns = null }) {
  const side = snapshot.sideToMove;
  const currentKeys = new Set(snapshot.predicates.map(predicateKey));
  const currentLooseSquares = new Set(snapshot.loose.filter((item) => item.pieceColor !== side).map((item) => item.pieceIndex));
  const currentDefenderSquares = new Set([
    ...snapshot.soleDefenders.filter((item) => item.targetRef?.color !== side).map((item) => item.defenderRef?.index),
    ...snapshot.sharedDefenders.filter((item) => item.defenderRef?.color !== side).map((item) => item.defenderRef?.index)
  ].filter(Number.isInteger));
  const goal = objectivePawns ?? Number(policy.objective?.default_material_delta_pawns || 3);
  const rootBase = rootMaterial ?? (materialFor(game, rootSide) - materialFor(game, other(rootSide)));
  const facts = [];

  for (const move of snapshot.legalMoves) {
    const after = afterMove(createGame, game, move);
    if (!after) continue;
    const san = String(after.curNode?.san || move.uci).trim();
    const terminal = terminalInfo(createGame, after);
    const check = safeInCheck(after, other(side));
    const mate = terminal?.kind === "mate" && terminal.winner === side;
    const replies = terminal ? [] : legalMoveRecords(createGame, after, after.state.side);
    const afterSnapshot = baseSnapshot({ createGame, game: after, rootSide, includeMovePredicates: false });
    const movedPiece = boardOf(after)[move.to];
    const uses = [];
    const resultPredicates = [];

    if (mate) {
      const item = observation("mate_in_1", `mate_in_1(${san})`, { moveUci: move.uci, from: squareName(move.from), to: squareName(move.to) });
      uses.push(item); resultPredicates.push(item);
    } else if (check) {
      const item = observation("check", `check(${san})`, { moveUci: move.uci, from: squareName(move.from), to: squareName(move.to) });
      uses.push(item); resultPredicates.push(item);
    }
    if (move.captured) {
      const attacked = snapshot.predicates.find((item) => item.predicate === "attacked" && item.targetRef?.index === move.to);
      const loose = snapshot.loose.find((item) => item.pieceIndex === move.to);
      uses.push(loose || attacked || observation("attacked", `attacked(${pieceLabel(move.captured, move.to)},${pieceLabel(move.mover, move.from)})`));
    }
    if (currentLooseSquares.has(move.to)) {
      const item = snapshot.loose.find((entry) => entry.pieceIndex === move.to);
      if (item) uses.push(item);
    }

    const attackedAfter = movedPiece ? attackTargetsFrom(after, move.to, side) : [];
    const queenTarget = attackedAfter.find((target) => target.type === "q");
    if (queenTarget) resultPredicates.push(observation("attacked", `attacked(${queenTarget.label},${pieceLabel(movedPiece, move.to)})`, { moveUci: move.uci, from: squareName(move.to), to: queenTarget.square }));
    const looseTarget = attackedAfter.find((target) => afterSnapshot.loose.some((item) => item.pieceIndex === target.index));
    if (looseTarget) resultPredicates.push(observation("loose", `loose(${looseTarget.label})`, { moveUci: move.uci, square: looseTarget.square }));
    const defenderTarget = attackedAfter.find((target) => currentDefenderSquares.has(target.index));
    if (defenderTarget) resultPredicates.push(observation("deflection", `deflection(${san},${defenderTarget.label},target)`, { moveUci: move.uci, from: squareName(move.to), to: defenderTarget.square }));

    const fork = movedPiece ? movedPieceFork(after, move, rootSide) : null;
    if (fork) resultPredicates.push(fork);

    for (const item of afterSnapshot.predicates) {
      if (currentKeys.has(predicateKey(item))) continue;
      if (["pin", "alignment", "skewer", "passed_pawn", "promotion_threat", "restricted_mobility", "back_rank_clamp"].includes(item.predicate)) {
        resultPredicates.push({ ...item, moveUci: move.uci });
      }
    }

    const ourNextMates = !mate ? mateInOneMoves(createGame, after, side) : [];
    if (ourNextMates.length) {
      resultPredicates.push(observation("mate_threat", `mate_threat(${ourNextMates.map((item) => item.san).join("|")})`, { moveUci: move.uci, witnesses: ourNextMates }));
    }

    // USES are current predicates implicated by the move plus named forcing facts.
    for (const current of snapshot.predicates) {
      if (current.predicate === "loose" && (move.to === current.pieceIndex || attackedAfter.some((target) => target.index === current.pieceIndex))) uses.push(current);
      if (current.predicate === "sole_defender" && (move.to === current.defenderRef?.index || attackedAfter.some((target) => target.index === current.defenderRef?.index))) uses.push(current);
      if (current.predicate === "shared_defender" && attackedAfter.some((target) => target.index === current.defenderRef?.index)) uses.push(current);
      if (current.predicate === "alignment" && (current.line || []).includes(move.from)) uses.push(current);
      if (current.predicate === "passed_pawn" && current.pieceRef?.index === move.from) uses.push(current);
      if (["restricted_mobility", "back_rank_clamp"].includes(current.predicate) && (check || mate || ourNextMates.length)) uses.push(current);
    }
    resultPredicates.filter((item) => ["fork", "pin", "skewer", "deflection", "mate_threat", "promotion_threat"].includes(item.predicate)).forEach((item) => uses.push(item));

    const delta = materialDelta(after, rootSide, rootBase);
    const objectiveCapture = Boolean(move.captured && delta >= goal);
    const forcing = Boolean(
      mate || check || move.captured || move.promotion || ourNextMates.length || queenTarget || looseTarget || defenderTarget || fork ||
      resultPredicates.some((item) => ["pin", "skewer", "promotion_threat", "deflection", "interference", "discovered_attack"].includes(item.predicate))
    );
    facts.push({
      move, uci: move.uci, san, afterFen: after.exportFEN(), after, check, mate, capture: Boolean(move.captured), capturedRef: move.captured ? pieceRef(move.captured, move.to) : null,
      promotion: move.promotion || "", replyCount: replies.length, replyClassCount: replies.length, uses: dedupeObservations(uses), resultPredicates: dedupeObservations(resultPredicates),
      mateThreats: ourNextMates, objectiveCapture, materialDelta: delta, forcing, attackQueen: Boolean(queenTarget), attackLoose: Boolean(looseTarget), attackDefender: Boolean(defenderTarget),
      fork: Boolean(fork), targetRefs: attackedAfter
    });
  }
  return facts;
}

function selectionGroup(facts) {
  const groups = [
    ["mate", facts.filter((fact) => fact.mate)],
    ["single_reply_check", facts.filter((fact) => fact.check && fact.replyClassCount === 1)],
    ["objective_capture", facts.filter((fact) => fact.objectiveCapture)],
    ["check_most_uses", facts.filter((fact) => fact.check)],
    ["forcing_most_uses", facts.filter((fact) => fact.forcing && fact.uses.length > 0)]
  ];
  for (const [id, group] of groups) {
    if (!group.length) continue;
    let selected = group;
    if (["check_most_uses", "forcing_most_uses"].includes(id)) {
      const maxUses = Math.max(...group.map((fact) => fact.uses.length));
      selected = group.filter((fact) => fact.uses.length === maxUses);
    }
    selected.sort((a, b) => a.replyClassCount - b.replyClassCount || a.uci.localeCompare(b.uci));
    return { id, facts: selected };
  }
  return { id: "none", facts: [] };
}

function factCandidateText(fact) {
  const predicates = [];
  if (fact.mate) predicates.push("mate");
  else if (fact.check) predicates.push("gives_check");
  if (fact.capture && fact.capturedRef) predicates.push(`captures(${fact.capturedRef.label})`);
  if (fact.attackQueen) predicates.push("attacks_queen");
  if (fact.attackLoose) predicates.push("attacks_loose_piece");
  if (fact.attackDefender) predicates.push("attacks_defender");
  if (fact.fork) predicates.push("creates_fork");
  if (fact.mateThreats.length) predicates.push(`threatens_mate(${fact.mateThreats.map((item) => item.san).join("|")})`);
  if (fact.promotion) predicates.push(`promotes=${fact.promotion.toUpperCase()}`);
  predicates.push(`legal_reply_classes=${fact.replyClassCount}`);
  return `${fact.san}: ${predicates.join(", ")}; USES=[${fact.uses.map((item) => item.predicate).join(",")}]`;
}

function selectionReason(groupId, fact) {
  if (groupId === "mate") return "PICK-OUR-MOVE: mate.";
  if (groupId === "single_reply_check") return "PICK-OUR-MOVE: check with exactly one legal reply class.";
  if (groupId === "objective_capture") return "PICK-OUR-MOVE: capture that immediately reaches the objective.";
  if (groupId === "check_most_uses") return `PICK-OUR-MOVE: check with the most USES (${fact.uses.map((item) => item.predicate).join(", ")}).`;
  return `PICK-OUR-MOVE: forcing move with the most USES (${fact.uses.map((item) => item.predicate).join(", ")}).`;
}

/* -------------------------------------------------------------------------- */
/* CTT trace parsing and executable conformance programs                       */
/* -------------------------------------------------------------------------- */

function cleanTraceLine(value) {
  return String(value || "").replace(/\u2028|\u2029/g, "\n").replace(/\s+$/g, "").trim();
}

function parseThink(line) {
  const match = line.match(/^THINK\s+([A-Z]+)(?:\((.*)\))?\.?$/);
  return match ? { state: match[1], args: match[2] || "" } : null;
}

function parseTry(line) {
  const body = line.replace(/^TRY\s+/, "").replace(/\.$/, "");
  const parts = body.split(/\s+BECAUSE\s+/i);
  return { san: parts[0].trim(), reason: parts.slice(1).join(" BECAUSE ").trim() };
}

function parseReply(line) {
  const body = line.replace(/^REPLY\s+/, "").replace(/\.$/, "");
  const [left, disposition = ""] = body.split(/\s+::\s+/, 2);
  const colon = left.indexOf(":");
  return {
    label: colon >= 0 ? left.slice(0, colon).trim() : left.trim(),
    detail: colon >= 0 ? left.slice(colon + 1).trim() : "",
    disposition
  };
}

function splitTracePredicates(body) {
  const output = [];
  let start = 0;
  let depth = 0;
  const text = String(body || "");
  for (let i = 0; i < text.length; i += 1) {
    if (["(", "[", "{"].includes(text[i])) depth += 1;
    else if ([")", "]", "}"].includes(text[i])) depth = Math.max(0, depth - 1);
    else if (text[i] === ";" && depth === 0) { output.push(text.slice(start, i).trim()); start = i + 1; }
  }
  output.push(text.slice(start).trim());
  return output.filter(Boolean);
}

function traceObservation(raw) {
  const name = normalizeId(raw.match(/^([a-zA-Z_][\w-]*)\s*\(/)?.[1] || raw.split(/[\s(:]/)[0]);
  const refs = [...String(raw).matchAll(/\b[wb]?[KQRBNPkqrbnp]@([a-h][1-8])\b/g)];
  return observation(PREDICATE_BY_NAME.has(name) ? name : "threat", raw, {
    humanVisible: true,
    square: refs[0]?.[1] || "",
    from: refs[0]?.[1] || "",
    to: refs[1]?.[1] || "",
    trace: true
  });
}

export function parseTracePlan(traceText) {
  const lines = String(traceText || "").replace(/\r\n/g, "\n").split("\n").map(cleanTraceLine).filter(Boolean);
  return lines.map((raw, index) => {
    const verb = raw.match(/^([A-Z-]+)/)?.[1] || "TEXT";
    const event = { index, raw, verb };
    if (verb === "THINK") Object.assign(event, parseThink(raw) || {});
    else if (verb === "SAW") {
      event.body = raw.replace(/^SAW\s+/, "").replace(/\.$/, "");
      event.observations = splitTracePredicates(event.body).map(traceObservation);
    } else if (verb === "CANDIDATES") event.body = raw.replace(/^CANDIDATES\s+/, "").replace(/\.$/, "");
    else if (verb === "TRY") Object.assign(event, parseTry(raw));
    else if (verb === "REPLY") Object.assign(event, parseReply(raw));
    else if (verb === "FROM") {
      const match = raw.match(/^FROM\s+(.+?)(?:\s+::\s+(.+))?\.?$/);
      event.san = match?.[1] || "";
      event.reason = match?.[2] || "";
    } else if (["PROVED", "HORIZON", "GIVEUP"].includes(verb)) event.body = raw.replace(new RegExp(`^${verb}\\.?\\s*`), "");
    return event;
  });
}

function stripMovePrefix(san) {
  return String(san || "").trim().replace(/^\d+\.(?:\.\.)?\s*/, "").replace(/^\d+\.\.\.\s*/, "");
}

function normalizeSan(value) {
  return stripMovePrefix(value)
    .replace(/[!?]+/g, "")
    .replace(/0-0-0/g, "O-O-O")
    .replace(/0-0/g, "O-O")
    .replace(/\s+/g, "")
    .trim();
}

function findMoveBySan(createGame, game, wantedSan) {
  const wanted = normalizeSan(wantedSan);
  const legal = legalMoveRecords(createGame, game, game.state.side);
  let relaxed = null;
  for (const move of legal) {
    const san = sanAfterMove(createGame, game, move);
    if (normalizeSan(san) === wanted) return { move, san };
    if (normalizeSan(san).replace(/[+#]$/, "") === wanted.replace(/[+#]$/, "")) relaxed ||= { move, san };
  }
  return relaxed;
}

function cleanReplyClassLabel(value) {
  return String(value || "").trim().replace(/^CLASS\s+/i, "");
}

function startReplyAudit(createGame, game) {
  const legal = legalMoveRecords(createGame, game, game.state.side).map((move) => ({
    move,
    san: sanAfterMove(createGame, game, move),
    normalizedSan: normalizeSan(sanAfterMove(createGame, game, move))
  }));
  return {
    fen: game.exportFEN(),
    legal,
    covered: new Map(),
    tried: new Set(),
    lines: [],
    finalized: false
  };
}

function auditMovesForClass(createGame, game, audit, label) {
  const raw = cleanReplyClassLabel(label);
  const remaining = () => audit.legal.filter((item) => !audit.covered.has(item.move.uci));
  if (/^\[.*\]$/.test(raw)) {
    const names = raw.slice(1, -1).split(",").map((item) => item.trim()).filter(Boolean);
    return names.map((name) => {
      const found = findMoveBySan(createGame, game, name);
      return found ? audit.legal.find((item) => item.move.uci === found.move.uci) : null;
    }).filter(Boolean);
  }
  if (/^(?:all other legal replies|all legal replies|all legal check answers|all other legal check answers|remaining legal replies)$/i.test(raw)) {
    return /all legal replies|all legal check answers/i.test(raw) && !/^all other/i.test(raw)
      ? audit.legal.slice()
      : remaining();
  }
  if (/^(?:all legal queen moves|all queen moves)$/i.test(raw)) {
    return remaining().filter((item) => item.move.mover?.type === "q");
  }
  const queenExcept = raw.match(/^all queen moves other than\s+(.+)$/i);
  if (queenExcept) {
    const excluded = normalizeSan(queenExcept[1]);
    return remaining().filter((item) => item.move.mover?.type === "q" && item.normalizedSan !== excluded);
  }
  const noncheckingExcept = raw.match(/^nonchecking replies except\s+(.+)$/i);
  if (noncheckingExcept) {
    const excluded = normalizeSan(noncheckingExcept[1]);
    return remaining().filter((item) => {
      if (item.normalizedSan === excluded) return false;
      const after = afterMove(createGame, game, item.move);
      return after && !safeInCheck(after, other(game.state.side));
    });
  }
  return null;
}

function coverReplyAudit({ createGame, game, audit, event }) {
  const live = /^LIVE\.?$/i.test(String(event.disposition || "").trim());
  let items = [];
  if (/^CLASS\s+/i.test(event.label || "")) {
    items = auditMovesForClass(createGame, game, audit, event.label);
    if (items == null) return { ok: false, error: `Unsupported REPLY class ${event.label}` };
  } else {
    const found = findMoveBySan(createGame, game, event.label);
    if (!found) return { ok: false, error: `Named REPLY ${event.label} is not legal` };
    const item = audit.legal.find((entry) => entry.move.uci === found.move.uci);
    if (item) items = [item];
  }
  if (!items.length) return { ok: false, error: `REPLY ${event.label} covers no legal move` };
  for (const item of items) {
    if (audit.covered.has(item.move.uci)) {
      return { ok: false, error: `Legal reply ${item.san} is represented more than once` };
    }
    audit.covered.set(item.move.uci, { live, event, san: item.san });
  }
  audit.lines.push({ event, moves: items.map((item) => item.move.uci), live });
  return { ok: true, moves: items };
}

function finalizeReplyAudit({ createGame, game, audit, nextEvent }) {
  if (!audit) return { ok: true };
  if (!audit.finalized) {
    const uncovered = audit.legal.filter((item) => !audit.covered.has(item.move.uci));
    if (uncovered.length) return { ok: false, error: `REPLY proof omitted ${uncovered.map((item) => item.san).join(", ")}` };
    audit.finalized = true;
  }
  const live = audit.legal.filter((item) => audit.covered.get(item.move.uci)?.live);
  if (nextEvent?.verb === "TRY") {
    const found = findMoveBySan(createGame, game, nextEvent.san);
    if (!found) return { ok: false, error: `Live TRY ${nextEvent.san} is not legal at its REPLIES node` };
    const disposition = audit.covered.get(found.move.uci);
    if (!disposition?.live) return { ok: false, error: `TRY ${nextEvent.san} was not declared LIVE by REPLY` };
  } else if (live.some((item) => !audit.tried.has(item.move.uci))) {
    return { ok: false, error: `REPLIES node leaves LIVE moves untried: ${live.filter((item) => !audit.tried.has(item.move.uci)).map((item) => item.san).join(", ")}` };
  }
  return { ok: true, legalCount: audit.legal.length, liveCount: live.length };
}

function completeAuditsOnStack({ createGame, stack }) {
  for (const frame of stack || []) {
    const audit = frame.replyAudit;
    if (!audit) continue;
    if (!audit.finalized) {
      const uncovered = audit.legal.filter((item) => !audit.covered.has(item.move.uci));
      if (uncovered.length) return { ok: false, error: `REPLY proof omitted ${uncovered.map((item) => item.san).join(", ")}` };
    }
    const untried = audit.legal.filter((item) => audit.covered.get(item.move.uci)?.live && !audit.tried.has(item.move.uci));
    if (untried.length) return { ok: false, error: `PROVED with untried LIVE replies: ${untried.map((item) => item.san).join(", ")}` };
  }
  return { ok: true };
}

function traceEventToPublic(event, state) {
  const base = {
    type: event.verb.toLowerCase().replace(/-/g, "_"),
    status: "searching",
    depth: Math.max(0, state.positionStack.length - 1),
    thought: state.thought,
    path: state.positionStack.slice(1).map((frame) => frame.uci),
    traceLine: event.raw,
    log: event.raw
  };
  if (event.verb === "THINK") {
    base.type = "think";
    base.thought = event.state;
    base.comment = event.raw;
  } else if (event.verb === "SAW") {
    base.type = "observe";
    base.observations = event.observations || [];
    base.comment = event.raw;
  } else if (event.verb === "CANDIDATES") {
    base.type = "candidates";
    base.comment = event.raw;
  } else if (event.verb === "REPLY") {
    base.type = "reply";
    base.reply = { label: event.label, detail: event.detail, disposition: event.disposition };
    base.comment = event.raw;
  } else if (event.verb === "FROM") {
    base.type = "backtrack";
    base.comment = event.raw;
  }
  return base;
}

/* -------------------------------------------------------------------------- */
/* Generic policy search -> CTT event program                                  */
/* -------------------------------------------------------------------------- */

function objectivePawns(policy, puzzle) {
  const explicit = Number(puzzle?.objectivePawns ?? puzzle?.minimumGainPawns);
  return Number.isFinite(explicit) ? explicit : Number(policy.objective?.default_material_delta_pawns || 3);
}

function objectiveReached(createGame, game, context) {
  const terminal = terminalInfo(createGame, game);
  if (terminal?.kind === "mate") return terminal.winner === context.rootSide ? { reached: true, kind: "mate" } : { reached: false, failed: true, kind: "mated" };
  const delta = materialDelta(game, context.rootSide, context.rootMaterial);
  if (!safeInCheck(game, game.state.side) && game.state.side === context.rootSide && delta >= context.objectivePawns) return { reached: true, kind: "material", delta };
  return { reached: false, failed: false, kind: "none", delta };
}

function isReplyForcing(createGame, afterReply, reply, context, candidate) {
  if (safeInCheck(afterReply, context.rootSide)) return { forcing: true, kind: "check" };
  const opponent = other(context.rootSide);
  const mates = mateInOneMoves(createGame, afterReply, opponent);
  if (mates.length) return { forcing: true, kind: "mate_in_1", witness: mates[0] };
  if (reply.captured && (reply.captured.color === context.rootSide) && (PIECE_VALUES[reply.captured.type] || 0) >= Number(candidate?.capturedRef?.value || 0)) {
    return { forcing: true, kind: "equal_capture" };
  }
  return { forcing: false, kind: "" };
}

function immediateObjectiveWitness(createGame, game, context) {
  const snapshot = baseSnapshot({ createGame, game, rootSide: context.rootSide, includeMovePredicates: false });
  const facts = analyzeCandidateMoves({
    createGame, game, snapshot, rootSide: context.rootSide, rootMaterial: context.rootMaterial,
    policy: context.policy, objectivePawns: context.objectivePawns
  });
  const mates = facts.find((fact) => fact.mate);
  if (mates) return { rule: "CLOSE-MATE-IN-ONE", fact: mates, text: `${mates.san}#` };
  const win = facts.find((fact) => fact.objectiveCapture || (fact.check && fact.materialDelta >= context.objectivePawns));
  if (win) return { rule: win.check ? "CLOSE-WIN-WITH-CHECK" : "CLOSE-ONE-PLY-TACTIC", fact: win, text: win.san };
  return null;
}

function replyOrderScore(createGame, afterReply, reply, candidate, context) {
  let score = 0;
  if (safeInCheck(afterReply, context.rootSide)) score += 10000;
  if (candidate?.move && reply.to === candidate.move.to && reply.captured) score += 8000;
  if (candidate?.capturedRef && reply.from === candidate.capturedRef.index) score += 6000;
  const opponentMates = mateInOneMoves(createGame, afterReply, other(context.rootSide));
  if (opponentMates.length) score += 5000;
  if (reply.captured) score += (PIECE_VALUES[reply.captured.type] || 0) * 100;
  return score;
}

function classifyRepliesGeneric({ createGame, afterCandidate, candidate, context }) {
  const replies = legalMoveRecords(createGame, afterCandidate, afterCandidate.state.side);
  const entries = [];
  for (const reply of replies) {
    const afterReply = afterMove(createGame, afterCandidate, reply);
    if (!afterReply) continue;
    const san = String(afterReply.curNode?.san || reply.uci).trim();
    const goal = objectiveReached(createGame, afterReply, context);
    const forcing = isReplyForcing(createGame, afterReply, reply, context, candidate);
    let closure = null;

    if (goal.reached && !forcing.forcing) {
      closure = { rule: "CLOSE-GAIN-CLAMP", witness: "the declared gain remains and no forcing recovery appears" };
    } else {
      const witness = immediateObjectiveWitness(createGame, afterReply, context);
      if (witness && !forcing.forcing) closure = { rule: witness.rule, witness: witness.text };
    }
    if (candidate.mate) closure = { rule: "CLOSE-MATE-IN-ONE", witness: candidate.san };

    entries.push({ reply, afterReply, san, forcing, closure, live: !closure, order: replyOrderScore(createGame, afterReply, reply, candidate, context) });
  }
  entries.sort((a, b) => b.order - a.order || a.san.localeCompare(b.san));
  return entries;
}

function visiblePredicateText(snapshot) {
  const relevant = humanVisibleObservations(snapshot.predicates)
    .filter((item) => ["loose", "sole_defender", "shared_defender", "alignment", "pin", "restricted_mobility", "back_rank_clamp", "passed_pawn", "promotion_threat", "in_check"].includes(item.predicate));
  return relevant.slice(0, 10).map((item) => item.text).join("; ") || "no forcing predicate";
}

function genericSolveProgram({ createGame, rootGame, policy, puzzle = {}, maxProgramEvents = 1000 }) {
  const context = {
    createGame,
    policy,
    puzzle,
    rootSide: normalizeColor(rootGame.state.side),
    rootMaterial: materialFor(rootGame, normalizeColor(rootGame.state.side)) - materialFor(rootGame, other(normalizeColor(rootGame.state.side))),
    objectivePawns: objectivePawns(policy, puzzle),
    tryCount: 0,
    lines: [],
    maxProgramEvents,
    bestPath: []
  };

  const emit = (line) => {
    if (context.lines.length < maxProgramEvents) context.lines.push(line);
  };

  function recurse(game, branch) {
    if (context.tryCount >= policy.profile.try_budget) return { status: "HORIZON", reason: "try_budget exhausted" };
    const goal = objectiveReached(createGame, game, context);
    if (goal.reached) return { status: "PROVED", reason: goal.kind };
    if (goal.failed) return { status: "REFUTED", reason: goal.kind };
    if (game.state.side !== context.rootSide) throw new Error("generic recurse expects our turn after opponent reply");

    emit("THINK OBSERVE.");
    const snapshot = baseSnapshot({ createGame, game, rootSide: context.rootSide, includeMovePredicates: false });
    emit(`SAW ${visiblePredicateText(snapshot)}.`);
    let facts = analyzeCandidateMoves({
      createGame, game, snapshot, rootSide: context.rootSide, rootMaterial: context.rootMaterial,
      policy, objectivePawns: context.objectivePawns
    });

    const inCheck = snapshot.inCheck;
    if (inCheck) facts = facts.filter((fact) => !safeInCheck(fact.after, context.rootSide));
    if (branch.ownChecks >= policy.profile.check_horizon) {
      facts = facts.filter((fact) => fact.mate || fact.objectiveCapture || (inCheck && !safeInCheck(fact.after, context.rootSide)) || fact.capture);
      if (!facts.length) return { status: "HORIZON", reason: "check_horizon reached" };
    }
    if (materialDelta(game, context.rootSide, context.rootMaterial) < 0 && policy.profile.behind_quiet_budget === 0) {
      facts = facts.filter((fact) => fact.check || fact.mate || fact.capture || fact.mateThreats.length || fact.attackQueen || fact.attackLoose || fact.attackDefender);
    }

    const group = selectionGroup(facts);
    if (!group.facts.length) return { status: "GIVEUP", reason: "no predicate-using forcing candidate" };
    emit(`CANDIDATES ${group.facts.map(factCandidateText).join("; ")}.`);

    for (const candidate of group.facts) {
      if (context.tryCount >= policy.profile.try_budget) return { status: "HORIZON", reason: "try_budget exhausted" };
      const state = candidate.objectiveCapture ? "CASH" : "THREAT";
      emit(`THINK ${state}(goal=${candidate.mate ? "mate" : "tactical_objective"},theme=[${candidate.uses.map((item) => item.predicate).join(",")}]).`);
      emit(`TRY ${candidate.san} BECAUSE ${selectionReason(group.id, candidate)}`);
      context.tryCount += 1;
      const replies = classifyRepliesGeneric({ createGame, afterCandidate: candidate.after, candidate, context });
      if (candidate.mate || !replies.length) {
        context.bestPath = branch.path.concat(candidate.uci);
        return { status: "PROVED", reason: "mate", path: context.bestPath };
      }
      emit(`THINK REPLIES(goal=${candidate.mate ? "mate" : "tactical_objective"}).`);
      for (const reply of replies) {
        const detail = reply.closure
          ? `${reply.forcing.kind || "does not create a forcing recovery"}`
          : `${reply.forcing.kind || "remains inside the tactical contest"}`;
        if (reply.closure) emit(`REPLY ${reply.san}: ${detail} :: CLOSED BY ${reply.closure.rule} WITH ${reply.closure.witness}.`);
        else emit(`REPLY ${reply.san}: ${detail} :: LIVE.`);
      }

      let candidateProved = true;
      for (const reply of replies.filter((item) => item.live)) {
        if (context.tryCount >= policy.profile.try_budget) return { status: "HORIZON", reason: "try_budget exhausted" };
        emit(`TRY ${reply.san} BECAUSE TRY-REPLIES: ${reply.forcing.kind ? `answer the ${reply.forcing.kind}` : "live legal reply"}.`);
        context.tryCount += 1;
        const next = recurse(reply.afterReply, {
          path: branch.path.concat(candidate.uci, reply.reply.uci),
          ownChecks: branch.ownChecks + Number(candidate.check)
        });
        if (next.status !== "PROVED") {
          emit(`FROM ${reply.san} :: ${next.reason || next.status}.`);
          candidateProved = false;
          break;
        }
      }
      if (candidateProved) {
        context.bestPath = context.bestPath.length ? context.bestPath : branch.path.concat(candidate.uci);
        return { status: "PROVED", reason: "all legal replies closed or defeated", path: context.bestPath };
      }
      emit(`FROM ${candidate.san} :: refuted within the policy.`);
    }
    return { status: "GIVEUP", reason: "every selected candidate was refuted" };
  }

  let outcome;
  try {
    outcome = recurse(rootGame, { path: [], ownChecks: 0 });
  } catch (error) {
    outcome = { status: "HORIZON", reason: error?.message || String(error) };
  }
  if (outcome.status === "PROVED") emit("PROVED.");
  else if (outcome.status === "HORIZON") emit(`HORIZON. ${outcome.reason || "policy horizon"}`);
  else emit(`GIVEUP. ${outcome.reason || "no forcing continuation"}`);
  return { trace: context.lines.join("\n"), events: parseTracePlan(context.lines.join("\n")), result: outcome, tryCount: context.tryCount, principalVariation: outcome.path || context.bestPath };
}

/* -------------------------------------------------------------------------- */
/* One-event reasoner                                                          */
/* -------------------------------------------------------------------------- */

function syncGameToFrame(game, frame) {
  if (!game || !frame) return;
  try {
    if (typeof game._applyFENToState === "function") game._applyFENToState(frame.fen);
    else game.loadFEN(frame.fen);
    if (frame.node) game.curNode = frame.node;
    if (game.sel) { game.sel.fromSq = null; game.sel.legalTo = []; }
    game._emit?.();
  } catch {
    try { game.loadFEN(frame.fen); } catch {}
  }
}

function eventCategory(reason) {
  const text = String(reason || "");
  const prefix = text.split(":", 1)[0].trim();
  return prefix || "policy move";
}

export function createReasoner({
  createGame,
  policy = FALLBACK_POLICY,
  maxSteps = 5000,
  tracePlan = "",
  puzzle = null
} = {}) {
  if (typeof createGame !== "function") throw new Error("createReasoner requires createGame");
  assertPolicy(policy);

  const state = {
    policy,
    status: "idle",
    mode: tracePlan ? "conformance" : "policy",
    stepCount: 0,
    tryCount: 0,
    rootFen: "",
    rootSide: "w",
    expectedFen: "",
    thought: "OBSERVE",
    program: tracePlan ? parseTracePlan(tracePlan) : [],
    programIndex: 0,
    traceText: tracePlan || "",
    history: [],
    positionStack: [],
    finalResult: null,
    lastEvent: null,
    puzzle: puzzle || {},
    principalVariation: [],
    replyAudit: null
  };

  function compilePolicyProgram(game) {
    const root = cloneGame(createGame, game.exportFEN());
    const compiled = genericSolveProgram({ createGame, rootGame: root, policy, puzzle: state.puzzle });
    state.program = compiled.events;
    state.traceText = compiled.trace;
    state.principalVariation = compiled.principalVariation || [];
    state.mode = "policy";
  }

  function start(game) {
    state.rootFen = game.exportFEN();
    state.rootSide = normalizeColor(game.state.side);
    state.expectedFen = state.rootFen;
    state.positionStack = [{ fen: state.rootFen, node: game.curNode || game.root || null, uci: "", san: "", replyAudit: null }];
    state.status = "searching";
    state.stepCount = 0;
    state.tryCount = 0;
    state.programIndex = 0;
    state.history = [];
    state.finalResult = null;
    state.lastEvent = null;
    state.thought = "OBSERVE";
    state.replyAudit = null;
    if (state.mode === "policy" || !state.traceText) {
      compilePolicyProgram(game);
    } else {
      state.program = parseTracePlan(state.traceText);
    }
  }

  function reset(game = null, options = {}) {
    if (typeof options.tracePlan === "string") {
      state.program = parseTracePlan(options.tracePlan);
      state.traceText = options.tracePlan;
      state.mode = options.tracePlan ? "conformance" : "policy";
    }
    if (options.puzzle) state.puzzle = options.puzzle;
    state.status = "idle";
    if (game) start(game);
  }

  function setTracePlan(nextTrace, nextPuzzle = null) {
    state.traceText = String(nextTrace || "");
    state.program = state.traceText ? parseTracePlan(state.traceText) : [];
    state.mode = state.traceText ? "conformance" : "policy";
    if (nextPuzzle) state.puzzle = nextPuzzle;
  }

  function record(publicEvent) {
    state.lastEvent = publicEvent;
    state.history.push(publicEvent);
    return publicEvent;
  }

  function ensureSynchronized(game) {
    if (state.status === "idle" || !state.positionStack.length) { start(game); return; }
    if (normalizedPositionKey(game.exportFEN()) !== normalizedPositionKey(state.expectedFen)) start(game);
  }

  function backtrackUntilLegal(game, san) {
    while (state.positionStack.length) {
      const found = findMoveBySan(createGame, game, san);
      if (found) {
        state.replyAudit = state.positionStack.at(-1)?.replyAudit || null;
        return found;
      }
      if (state.positionStack.length === 1) break;
      state.positionStack.pop();
      syncGameToFrame(game, state.positionStack.at(-1));
      state.expectedFen = state.positionStack.at(-1).fen;
      state.replyAudit = state.positionStack.at(-1)?.replyAudit || null;
    }
    return null;
  }

  function applyTry(game, event) {
    if (state.tryCount >= policy.profile.try_budget) {
      state.status = "inconclusive";
      state.finalResult = { status: "unresolvedLeaf", reason: "try_budget_exhausted", tryBudget: policy.profile.try_budget };
      return record({ type: "terminal", status: "inconclusive", result: state.finalResult, log: `HORIZON: TRY budget ${policy.profile.try_budget} exhausted.` });
    }
    const found = backtrackUntilLegal(game, event.san);
    if (!found) {
      state.status = "inconclusive";
      state.finalResult = { status: "unresolvedLeaf", reason: "trace_move_illegal", san: event.san, fen: game.exportFEN() };
      return record({ type: "error", status: "inconclusive", result: state.finalResult, log: `Trace move ${event.san} is not legal in this position or any open ancestor.` });
    }
    const beforeDepth = state.positionStack.length - 1;
    const activeAudit = state.positionStack.at(-1)?.replyAudit || state.replyAudit || null;
    const replyDisposition = activeAudit?.covered.get(found.move.uci);
    const isReplyMove = Boolean(replyDisposition?.live);
    if (isReplyMove) activeAudit.tried.add(found.move.uci);
    const ok = applyMoveUCI(game, found.move.uci);
    if (!ok) {
      state.status = "inconclusive";
      state.finalResult = { status: "unresolvedLeaf", reason: "scratchchess_rejected_move", uci: found.move.uci };
      return record({ type: "error", status: "inconclusive", result: state.finalResult, log: `ScratchChess rejected ${found.move.uci}.` });
    }
    state.tryCount += 1;
    state.expectedFen = game.exportFEN();
    state.positionStack.push({ fen: state.expectedFen, node: game.curNode || null, uci: found.move.uci, san: found.san, replyAudit: null });
    state.replyAudit = null;
    const publicEvent = traceEventToPublic(event, state);
    publicEvent.type = isReplyMove || state.thought === "REPLIES" ? "reply_move" : "play";
    publicEvent.depth = beforeDepth;
    publicEvent.move = {
      uci: found.move.uci,
      san: found.san,
      category: eventCategory(event.reason),
      reason: event.reason,
      tags: [state.thought.toLowerCase(), eventCategory(event.reason).toLowerCase().replace(/\s+/g, "_")]
    };
    publicEvent.comment = event.raw;
    publicEvent.log = event.raw;
    return record(publicEvent);
  }

  function step(game) {
    if (!game) throw new Error("reasoner.step(game) requires a ScratchChess game");
    ensureSynchronized(game);
    if (state.status !== "searching") return record({ type: "done", status: state.status, result: state.finalResult, log: `Search already ended: ${state.status}.` });
    state.stepCount += 1;
    if (state.stepCount > maxSteps) {
      state.status = "inconclusive";
      state.finalResult = { status: "unresolvedLeaf", reason: "step_budget_exhausted", maxSteps };
      return record({ type: "terminal", status: state.status, result: state.finalResult, log: `Stepper safety budget ${maxSteps} exhausted.` });
    }
    const event = state.program[state.programIndex++];
    if (!event) {
      state.status = "inconclusive";
      state.finalResult = { status: "unresolvedLeaf", reason: "program_ended_without_terminal" };
      return record({ type: "terminal", status: state.status, result: state.finalResult, log: "Trace program ended without PROVED, HORIZON, or GIVEUP." });
    }

    const frameAudit = state.positionStack.at(-1)?.replyAudit || state.replyAudit || null;
    if (frameAudit && event.verb !== "REPLY") {
      const auditResult = finalizeReplyAudit({ createGame, game, audit: frameAudit, nextEvent: event });
      if (!auditResult.ok) {
        state.status = "inconclusive";
        state.finalResult = { status: "unresolvedLeaf", reason: "reply_completeness_failed", detail: auditResult.error };
        return record({ type: "error", status: "inconclusive", result: state.finalResult, log: auditResult.error });
      }
    }

    if (event.verb === "THINK") {
      state.thought = THOUGHT_STATES.includes(event.state) ? event.state : state.thought;
      if (state.thought === "REPLIES") {
        state.replyAudit = startReplyAudit(createGame, game);
        state.positionStack.at(-1).replyAudit = state.replyAudit;
      }
      return record(traceEventToPublic(event, state));
    }
    if (event.verb === "REPLY") {
      if (!state.replyAudit) {
        state.status = "inconclusive";
        state.finalResult = { status: "unresolvedLeaf", reason: "reply_outside_replies_state", line: event.raw };
        return record({ type: "error", status: "inconclusive", result: state.finalResult, log: `REPLY outside THINK REPLIES: ${event.raw}` });
      }
      const covered = coverReplyAudit({ createGame, game, audit: state.replyAudit, event });
      if (!covered.ok) {
        state.status = "inconclusive";
        state.finalResult = { status: "unresolvedLeaf", reason: "reply_class_invalid", detail: covered.error };
        return record({ type: "error", status: "inconclusive", result: state.finalResult, log: covered.error });
      }
      return record(traceEventToPublic(event, state));
    }
    if (event.verb === "TRY") return applyTry(game, event);
    if (event.verb === "FROM") {
      const wanted = normalizeSan(event.san);
      while (state.positionStack.length > 1) {
        const popped = state.positionStack.pop();
        if (normalizeSan(popped.san) === wanted) break;
      }
      syncGameToFrame(game, state.positionStack.at(-1));
      state.expectedFen = state.positionStack.at(-1).fen;
      state.replyAudit = state.positionStack.at(-1)?.replyAudit || null;
      return record(traceEventToPublic(event, state));
    }
    if (event.verb === "PROVED") {
      const auditCompletion = completeAuditsOnStack({ createGame, stack: state.positionStack });
      if (!auditCompletion.ok) {
        state.status = "inconclusive";
        state.finalResult = { status: "unresolvedLeaf", reason: "reply_completeness_failed", detail: auditCompletion.error };
        return record({ type: "error", status: "inconclusive", result: state.finalResult, log: auditCompletion.error });
      }
      state.status = "proven";
      const currentPath = state.positionStack.slice(1).map((frame) => frame.uci);
      state.principalVariation = state.principalVariation.length ? state.principalVariation : currentPath;
      state.finalResult = {
        status: "proven",
        reason: "ctt_trace_proved",
        principalVariation: state.principalVariation,
        tryCount: state.tryCount,
        mode: state.mode
      };
      const publicEvent = traceEventToPublic(event, state);
      publicEvent.type = "terminal";
      publicEvent.status = "proven";
      publicEvent.result = state.finalResult;
      publicEvent.log = "PROVED.";
      return record(publicEvent);
    }
    if (["HORIZON", "GIVEUP"].includes(event.verb)) {
      state.status = "inconclusive";
      state.finalResult = { status: "unresolvedLeaf", reason: event.verb.toLowerCase(), detail: event.body || "", tryCount: state.tryCount, mode: state.mode };
      const publicEvent = traceEventToPublic(event, state);
      publicEvent.type = "terminal";
      publicEvent.status = "inconclusive";
      publicEvent.result = state.finalResult;
      return record(publicEvent);
    }
    return record(traceEventToPublic(event, state));
  }

  function inspect(game, rootSide = game?.state?.side) {
    return inspectPosition({ createGame, game, rootSide, policy });
  }

  return {
    state,
    start,
    reset,
    step,
    inspect,
    observe: (game, rootSide = game?.state?.side) => inspect(game, rootSide).predicates,
    setTracePlan,
    getTraceText: () => state.traceText,
    getProgram: () => state.program.slice()
  };
}

/* -------------------------------------------------------------------------- */
/* Preview and policy description                                              */
/* -------------------------------------------------------------------------- */

export function runOnePass({ createGame, game, policy = FALLBACK_POLICY, maxCandidates = 8, puzzle = null } = {}) {
  if (typeof createGame !== "function" || !game) throw new Error("runOnePass requires createGame and game");
  assertPolicy(policy);
  const rootSide = normalizeColor(game.state.side);
  const snapshot = baseSnapshot({ createGame, game, rootSide, includeMovePredicates: false });
  const rootMaterial = materialFor(game, rootSide) - materialFor(game, other(rootSide));
  const facts = analyzeCandidateMoves({
    createGame, game, snapshot, rootSide, rootMaterial, policy,
    objectivePawns: objectivePawns(policy, puzzle)
  });
  const group = selectionGroup(facts);
  const candidates = group.facts.slice(0, maxCandidates).map((fact) => ({
    uci: fact.uci,
    san: fact.san,
    category: group.id,
    tags: fact.uses.map((item) => item.predicate),
    uses: fact.uses.map((item) => item.text),
    resultPredicates: fact.resultPredicates.map((item) => item.text),
    replyClasses: fact.replyClassCount,
    reason: selectionReason(group.id, fact)
  }));
  const visible = humanVisibleObservations(snapshot.predicates);
  const steps = [
    `THINK OBSERVE.`,
    `SAW ${visiblePredicateText(snapshot)}.`,
    candidates.length ? `CANDIDATES ${candidates.map((item) => `${item.san}: USES=[${item.tags.join(",")}]`).join("; ")}.` : "GIVEUP. no predicate-using forcing candidate"
  ];
  return {
    status: candidates.length ? "searching" : "inconclusive",
    thought: "OBSERVE",
    observations: visible,
    candidates,
    selectedGroup: group.id,
    steps,
    log: candidates.length ? `${candidates.length} candidate(s) in first nonempty group ${group.id}.` : "No forcing candidate passed SEE-FIRST."
  };
}

export function describeAlgorithm(policy = FALLBACK_POLICY) {
  assertPolicy(policy);
  const p = policy.profile;
  return [
    `Predicate Chess · ${policy.name} · ${policy.version}`,
    "",
    "THOUGHT LOOP",
    "OBSERVE → THREAT → REPLIES → OBSERVE/CASH/COMPARE → PROVED",
    "",
    "CANDIDATES",
    "No move is generated before SAW. A candidate must USE a current predicate and may inspect only its one-ply result.",
    "Choose the first nonempty group: mate; single-reply check; objective capture; check with most USES; other forcing move with most USES.",
    "",
    "REPLIES",
    "Every legal opponent reply is represented. A named closure rule may close it; every other reply is LIVE and must be TRYed.",
    "",
    "COGNITIVE LIMITS",
    `see_after=${p.see_after} · try_budget=${p.try_budget} · check_horizon=${p.check_horizon} · forcing_reply_probe=${p.forcing_reply_probe}`,
    `quiet_budget=${p.quiet_budget} · repair_budget=${p.repair_budget} · behind_quiet_budget=${p.behind_quiet_budget} · gain_goal=${p.gain_goal}`,
    "",
    "A supplied CTT/1 trace runs in conformance mode: every TRY is legality-checked and every event is reproduced exactly. Unknown positions use the same policy in generic search mode."
  ].join("\n");
}
