/*
 * algo.js
 *
 * POLICY-DRIVEN, HUMAN-READABLE TACTICAL PROOF SEARCH
 * ==================================================
 *
 * ScratchChess supplies legal moves, FEN transitions, SAN, and board state.
 * This module supplies:
 *
 *   - the predicate vocabulary;
 *   - strict tactics-policy/v1 validation;
 *   - live policy loading from /policy.json;
 *   - threat observation and ranking;
 *   - bounded AND/OR proof search;
 *   - a one-action-at-a-time DFS stepper with backtracking;
 *   - a non-mutating root preview for the worksheet Algo tab.
 *
 * Proof semantics:
 *
 *   our node      = EXISTS: one candidate must prove the objective;
 *   opponent node = FORALL: every legal reply must prove the objective.
 *
 * A depth leaf is recorded as unresolvedLeaf. At its parent, the universal
 * obligation is not met, so that candidate is refutedWithinPolicy rather than
 * claimed to be objectively losing chess.
 */

export const DEFAULT_POLICY_URL = "https://priyomes.com/policy.json";
export const POLICY_VERSION = "tactics-policy/v1";

const FILES = "abcdefgh";
const PIECE_VALUES = Object.freeze({ p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 });
const COLORS = Object.freeze(["w", "b"]);
const PROMOTIONS = Object.freeze(["q", "r", "b", "n"]);

export const POLICY_OPTIONS = Object.freeze({
  observationKinds: Object.freeze([
    "position_predicates",
    "threats_us",
    "threats_them"
  ]),
  threatTypes: Object.freeze([
    "mate",
    "mate_in_1",
    "check",
    "pin",
    "mobility_trap"
  ]),
  candidatePriority: Object.freeze([
    "achieve_objective",
    "answer_immediate_threat",
    "create_compound_threat",
    "create_highest_threat",
    "advance_matching_pattern",
    "other_legal_move"
  ]),
  stopReasons: Object.freeze([
    "objective_proven",
    "depth_exhausted",
    "quiet_no_progress"
  ]),
  ownLooseActions: Object.freeze([
    "achieve_objective",
    "move_target",
    "defend_target",
    "capture_attacker",
    "remove_attack",
    "force_then_save_target"
  ]),
  ownLooseOutcomes: Object.freeze([
    "objective_proven",
    "target_saved",
    "capture_made_unprofitable"
  ]),
  enemyLooseActions: Object.freeze([
    "capture_target",
    "add_attacker_to_defender"
  ]),
  replyOrder: Object.freeze([
    "protect_target",
    "move_target",
    "remove_attacker",
    "capture_attacker",
    "create_equal_or_higher_threat"
  ]),
  quietTests: Object.freeze([
    "no_material_gain",
    "no_threat_created",
    "no_threat_answered",
    "no_pattern_advanced"
  ])
});

export const PREDICATE_CATALOG = Object.freeze([
  {
    name: "attacks",
    signature: "attacks(attacker, target)",
    description: "A piece attacks the target square in the current geometry.",
    humanVisible: false
  },
  {
    name: "defends",
    signature: "defends(defender, target)",
    description: "A friendly piece attacks the occupied target square.",
    humanVisible: false
  },
  {
    name: "loose",
    signature: "loose(piece)",
    description: "A non-king is attacked, has no pawn defender, and attackers are at least defenders.",
    humanVisible: true
  },
  {
    name: "hanging",
    signature: "hanging(piece)",
    description: "A non-king has strictly more legal attackers than defenders.",
    humanVisible: true
  },
  {
    name: "capture_threat",
    signature: "capture_threat(attacker, loose_piece)",
    description: "A legal capture of a loose piece is available to the threatening side.",
    humanVisible: true
  },
  {
    name: "pin",
    signature: "pin(piece, king)",
    description: "A piece is absolutely pinned to its king by a bishop, rook, or queen.",
    humanVisible: true
  },
  {
    name: "mobility_trap",
    signature: "mobility_trap(piece)",
    description: "An attacked non-pawn, non-king has no legal move of its own.",
    humanVisible: true
  },
  {
    name: "in_check",
    signature: "in_check(side)",
    description: "The side to move is currently in check; the checking side owns a check threat.",
    humanVisible: true
  },
  {
    name: "mate_in_1",
    signature: "mate_in_1(side, moves)",
    description: "The side has at least one legal move that immediately checkmates.",
    humanVisible: true
  },
  {
    name: "mate",
    signature: "mate(winner)",
    description: "The side to move is checkmated.",
    humanVisible: true
  },
  {
    name: "align",
    signature: "align(a, b, line)",
    description: "Manual alignment observation.",
    humanVisible: true,
    manual: true
  },
  {
    name: "goal",
    signature: "goal(x)",
    description: "Manual tactical objective.",
    humanVisible: true,
    manual: true
  },
  {
    name: "threat",
    signature: "threat(x)",
    description: "Manual forcing-threat observation.",
    humanVisible: true,
    manual: true
  },
  {
    name: "focal_square",
    signature: "focal_square(square)",
    description: "Manual square around which the tactic is organized.",
    humanVisible: true,
    manual: true
  }
]);

export const MANUAL_OBSERVATION_PREDICATES = Object.freeze(
  PREDICATE_CATALOG.filter((item) => item.manual).map((item) => item.name)
);

export const HUMAN_VISIBLE_PREDICATES = Object.freeze(
  PREDICATE_CATALOG.filter((item) => item.humanVisible).map((item) => item.name)
);

export const FALLBACK_POLICY = deepFreeze({
  version: "tactics-policy/v1",
  name: "six-ply-loose-piece-proof",
  objective: {
    anyOf: [
      { type: "mate" },
      {
        type: "material",
        minimumAdvantagePawns: 2,
        requireNoOpponentThreat: true
      }
    ]
  },
  budget: { maxPlies: 6 },
  observe: {
    atEveryNode: ["position_predicates", "threats_us", "threats_them"],
    storeHistory: true
  },
  threatRanking: {
    order: ["mate", "mate_in_1", "check", "pin", "mobility_trap"],
    compound: {
      minimumDistinctTypes: 2,
      rank: "immediately_above_strongest_component"
    }
  },
  search: {
    ourNodes: "exists",
    opponentNodes: "forall",
    opponentReplies: "all_legal",
    candidatePriority: [
      "achieve_objective",
      "answer_immediate_threat",
      "create_compound_threat",
      "create_highest_threat",
      "advance_matching_pattern",
      "other_legal_move"
    ],
    stop: ["objective_proven", "depth_exhausted", "quiet_no_progress"]
  },
  branchResult: {
    proven: "objective_reached_against_every_legal_reply",
    refutedWithinPolicy: "one_legal_reply_has_no_proven_continuation_within_budget",
    unresolvedLeaf: "depth_exhausted_without_proof"
  },
  pruning: {
    quietNoProgress: {
      whenAll: [
        "no_material_gain",
        "no_threat_created",
        "no_threat_answered",
        "no_pattern_advanced"
      ]
    }
  },
  rules: [
    {
      id: "answer-threat-to-own-loose-piece",
      when: {
        threat: "capture",
        target: { predicate: "loose", side: "us" }
      },
      considerFirst: [
        "achieve_objective",
        "move_target",
        "defend_target",
        "capture_attacker",
        "remove_attack",
        "force_then_save_target"
      ],
      mustAchieveOneBeforeOpponentCanExecuteThreat: [
        "objective_proven",
        "target_saved",
        "capture_made_unprofitable"
      ],
      rejectIfAnyLegalReply: {
        canExecuteThreat: true,
        objectiveStillUnproven: true
      }
    },
    {
      id: "attack-defender-of-enemy-loose-piece",
      when: { predicate: "loose", side: "enemy" },
      consider: ["capture_target", "add_attacker_to_defender"],
      orderOpponentRepliesFirst: [
        "protect_target",
        "move_target",
        "remove_attacker",
        "capture_attacker",
        "create_equal_or_higher_threat"
      ],
      prove: "every_legal_reply_reaches_objective_within_budget"
    }
  ]
});

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function pushError(errors, path, message) {
  errors.push(`${path}: ${message}`);
}

function exactKeys(value, path, keys, errors) {
  if (!isObject(value)) {
    pushError(errors, path, "must be an object");
    return false;
  }
  const allowed = new Set(keys);
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) pushError(errors, `${path}.${key}`, "is not allowed");
  }
  for (const key of keys) {
    if (!(key in value)) pushError(errors, `${path}.${key}`, "is required");
  }
  return true;
}

function validateEnumArray(value, path, allowedValues, errors, options = {}) {
  const { min = 1, max = Infinity, exactSet = false } = options;
  if (!Array.isArray(value)) {
    pushError(errors, path, "must be an array");
    return;
  }
  if (value.length < min) pushError(errors, path, `must contain at least ${min} item(s)`);
  if (value.length > max) pushError(errors, path, `must contain at most ${max} item(s)`);
  if (new Set(value).size !== value.length) pushError(errors, path, "must contain unique items");
  for (const item of value) {
    if (!allowedValues.includes(item)) pushError(errors, path, `contains unsupported value ${JSON.stringify(item)}`);
  }
  if (exactSet) {
    const got = new Set(value);
    for (const item of allowedValues) {
      if (!got.has(item)) pushError(errors, path, `must contain ${JSON.stringify(item)}`);
    }
  }
}

/**
 * Strict, dependency-free equivalent of tactics-policy-v1.schema.json.
 * Returns every validation error instead of failing at the first one.
 */
export function validatePolicy(policy) {
  const errors = [];

  if (!exactKeys(
    policy,
    "$",
    [
      "version",
      "name",
      "objective",
      "budget",
      "observe",
      "threatRanking",
      "search",
      "branchResult",
      "pruning",
      "rules"
    ],
    errors
  )) {
    return { valid: false, errors };
  }

  if (policy.version !== POLICY_VERSION) {
    pushError(errors, "$.version", `must equal ${JSON.stringify(POLICY_VERSION)}`);
  }
  if (typeof policy.name !== "string" || !/^[a-z0-9][a-z0-9-]*$/.test(policy.name)) {
    pushError(errors, "$.name", "must be a nonempty lowercase kebab-case string");
  }

  if (exactKeys(policy.objective, "$.objective", ["anyOf"], errors)) {
    const objectives = policy.objective.anyOf;
    if (!Array.isArray(objectives) || objectives.length !== 2) {
      pushError(errors, "$.objective.anyOf", "must contain exactly [mate, material]");
    } else {
      if (exactKeys(objectives[0], "$.objective.anyOf[0]", ["type"], errors)) {
        if (objectives[0].type !== "mate") {
          pushError(errors, "$.objective.anyOf[0].type", "must equal \"mate\"");
        }
      }
      if (exactKeys(
        objectives[1],
        "$.objective.anyOf[1]",
        ["type", "minimumAdvantagePawns", "requireNoOpponentThreat"],
        errors
      )) {
        if (objectives[1].type !== "material") {
          pushError(errors, "$.objective.anyOf[1].type", "must equal \"material\"");
        }
        if (typeof objectives[1].minimumAdvantagePawns !== "number" || objectives[1].minimumAdvantagePawns < 0) {
          pushError(errors, "$.objective.anyOf[1].minimumAdvantagePawns", "must be a nonnegative number");
        }
        if (typeof objectives[1].requireNoOpponentThreat !== "boolean") {
          pushError(errors, "$.objective.anyOf[1].requireNoOpponentThreat", "must be boolean");
        }
      }
    }
  }

  if (exactKeys(policy.budget, "$.budget", ["maxPlies"], errors)) {
    if (!Number.isInteger(policy.budget.maxPlies) || policy.budget.maxPlies < 1) {
      pushError(errors, "$.budget.maxPlies", "must be an integer of at least 1");
    }
  }

  if (exactKeys(policy.observe, "$.observe", ["atEveryNode", "storeHistory"], errors)) {
    validateEnumArray(
      policy.observe.atEveryNode,
      "$.observe.atEveryNode",
      POLICY_OPTIONS.observationKinds,
      errors,
      { min: 3, max: 3, exactSet: true }
    );
    if (typeof policy.observe.storeHistory !== "boolean") {
      pushError(errors, "$.observe.storeHistory", "must be boolean");
    }
  }

  if (exactKeys(policy.threatRanking, "$.threatRanking", ["order", "compound"], errors)) {
    validateEnumArray(
      policy.threatRanking.order,
      "$.threatRanking.order",
      POLICY_OPTIONS.threatTypes,
      errors,
      { min: 5, max: 5, exactSet: true }
    );
    if (exactKeys(
      policy.threatRanking.compound,
      "$.threatRanking.compound",
      ["minimumDistinctTypes", "rank"],
      errors
    )) {
      if (!Number.isInteger(policy.threatRanking.compound.minimumDistinctTypes) ||
          policy.threatRanking.compound.minimumDistinctTypes < 2) {
        pushError(errors, "$.threatRanking.compound.minimumDistinctTypes", "must be an integer of at least 2");
      }
      if (policy.threatRanking.compound.rank !== "immediately_above_strongest_component") {
        pushError(
          errors,
          "$.threatRanking.compound.rank",
          "must equal \"immediately_above_strongest_component\""
        );
      }
    }
  }

  if (exactKeys(
    policy.search,
    "$.search",
    ["ourNodes", "opponentNodes", "opponentReplies", "candidatePriority", "stop"],
    errors
  )) {
    if (policy.search.ourNodes !== "exists") pushError(errors, "$.search.ourNodes", "must equal \"exists\"");
    if (policy.search.opponentNodes !== "forall") pushError(errors, "$.search.opponentNodes", "must equal \"forall\"");
    if (policy.search.opponentReplies !== "all_legal") {
      pushError(errors, "$.search.opponentReplies", "must equal \"all_legal\"");
    }
    validateEnumArray(
      policy.search.candidatePriority,
      "$.search.candidatePriority",
      POLICY_OPTIONS.candidatePriority,
      errors,
      { min: 1 }
    );
    validateEnumArray(
      policy.search.stop,
      "$.search.stop",
      POLICY_OPTIONS.stopReasons,
      errors,
      { min: 1 }
    );
  }

  if (exactKeys(
    policy.branchResult,
    "$.branchResult",
    ["proven", "refutedWithinPolicy", "unresolvedLeaf"],
    errors
  )) {
    const constants = {
      proven: "objective_reached_against_every_legal_reply",
      refutedWithinPolicy: "one_legal_reply_has_no_proven_continuation_within_budget",
      unresolvedLeaf: "depth_exhausted_without_proof"
    };
    for (const [key, expected] of Object.entries(constants)) {
      if (policy.branchResult[key] !== expected) {
        pushError(errors, `$.branchResult.${key}`, `must equal ${JSON.stringify(expected)}`);
      }
    }
  }

  if (exactKeys(policy.pruning, "$.pruning", ["quietNoProgress"], errors) &&
      exactKeys(policy.pruning.quietNoProgress, "$.pruning.quietNoProgress", ["whenAll"], errors)) {
    validateEnumArray(
      policy.pruning.quietNoProgress.whenAll,
      "$.pruning.quietNoProgress.whenAll",
      POLICY_OPTIONS.quietTests,
      errors,
      { min: 4, max: 4, exactSet: true }
    );
  }

  if (!Array.isArray(policy.rules) || policy.rules.length !== 2) {
    pushError(errors, "$.rules", "must contain exactly the two v1 rules in schema order");
  } else {
    const own = policy.rules[0];
    if (exactKeys(
      own,
      "$.rules[0]",
      [
        "id",
        "when",
        "considerFirst",
        "mustAchieveOneBeforeOpponentCanExecuteThreat",
        "rejectIfAnyLegalReply"
      ],
      errors
    )) {
      if (own.id !== "answer-threat-to-own-loose-piece") {
        pushError(errors, "$.rules[0].id", "must equal \"answer-threat-to-own-loose-piece\"");
      }
      if (exactKeys(own.when, "$.rules[0].when", ["threat", "target"], errors)) {
        if (own.when.threat !== "capture") pushError(errors, "$.rules[0].when.threat", "must equal \"capture\"");
        if (exactKeys(own.when.target, "$.rules[0].when.target", ["predicate", "side"], errors)) {
          if (own.when.target.predicate !== "loose") {
            pushError(errors, "$.rules[0].when.target.predicate", "must equal \"loose\"");
          }
          if (own.when.target.side !== "us") {
            pushError(errors, "$.rules[0].when.target.side", "must equal \"us\"");
          }
        }
      }
      validateEnumArray(
        own.considerFirst,
        "$.rules[0].considerFirst",
        POLICY_OPTIONS.ownLooseActions,
        errors,
        { min: 1 }
      );
      validateEnumArray(
        own.mustAchieveOneBeforeOpponentCanExecuteThreat,
        "$.rules[0].mustAchieveOneBeforeOpponentCanExecuteThreat",
        POLICY_OPTIONS.ownLooseOutcomes,
        errors,
        { min: 1 }
      );
      if (exactKeys(
        own.rejectIfAnyLegalReply,
        "$.rules[0].rejectIfAnyLegalReply",
        ["canExecuteThreat", "objectiveStillUnproven"],
        errors
      )) {
        if (own.rejectIfAnyLegalReply.canExecuteThreat !== true) {
          pushError(errors, "$.rules[0].rejectIfAnyLegalReply.canExecuteThreat", "must equal true");
        }
        if (own.rejectIfAnyLegalReply.objectiveStillUnproven !== true) {
          pushError(errors, "$.rules[0].rejectIfAnyLegalReply.objectiveStillUnproven", "must equal true");
        }
      }
    }

    const enemy = policy.rules[1];
    if (exactKeys(
      enemy,
      "$.rules[1]",
      ["id", "when", "consider", "orderOpponentRepliesFirst", "prove"],
      errors
    )) {
      if (enemy.id !== "attack-defender-of-enemy-loose-piece") {
        pushError(errors, "$.rules[1].id", "must equal \"attack-defender-of-enemy-loose-piece\"");
      }
      if (exactKeys(enemy.when, "$.rules[1].when", ["predicate", "side"], errors)) {
        if (enemy.when.predicate !== "loose") {
          pushError(errors, "$.rules[1].when.predicate", "must equal \"loose\"");
        }
        if (enemy.when.side !== "enemy") {
          pushError(errors, "$.rules[1].when.side", "must equal \"enemy\"");
        }
      }
      validateEnumArray(
        enemy.consider,
        "$.rules[1].consider",
        POLICY_OPTIONS.enemyLooseActions,
        errors,
        { min: 1 }
      );
      validateEnumArray(
        enemy.orderOpponentRepliesFirst,
        "$.rules[1].orderOpponentRepliesFirst",
        POLICY_OPTIONS.replyOrder,
        errors,
        { min: 1 }
      );
      if (enemy.prove !== "every_legal_reply_reaches_objective_within_budget") {
        pushError(
          errors,
          "$.rules[1].prove",
          "must equal \"every_legal_reply_reaches_objective_within_budget\""
        );
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

export function assertPolicy(policy) {
  const result = validatePolicy(policy);
  if (!result.valid) {
    const error = new Error(`Invalid tactics policy:\n${result.errors.map((x) => `- ${x}`).join("\n")}`);
    error.validationErrors = result.errors;
    throw error;
  }
  return policy;
}

export async function loadPolicy(
  url = DEFAULT_POLICY_URL,
  { allowFallback = true, fallbackPolicy = FALLBACK_POLICY } = {}
) {
  try {
    const response = await fetch(url, {
      cache: "no-store",
      headers: { Accept: "application/json" }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const policy = await response.json();
    assertPolicy(policy);
    return {
      policy: deepFreeze(cloneJson(policy)),
      source: "live",
      url,
      warning: ""
    };
  } catch (error) {
    if (!allowFallback) throw error;
    assertPolicy(fallbackPolicy);
    return {
      policy: deepFreeze(cloneJson(fallbackPolicy)),
      source: "fallback",
      url,
      warning: `Could not load ${url}; using the embedded validated fallback. ${error?.message || error}`
    };
  }
}

const idx = (file, rank) => (7 - rank) * 8 + file;
const FR = (index) => [index % 8, 7 - Math.floor(index / 8)];
const inBounds = (file, rank) => file >= 0 && file < 8 && rank >= 0 && rank < 8;
const other = (color) => (color === "w" ? "b" : "w");
const roleFor = (color, rootSide) => (color === rootSide ? "us" : "enemy");
const normalizeColor = (color) => (color === "b" ? "b" : "w");

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
  const letter = ({ p: "P", n: "N", b: "B", r: "R", q: "Q", k: "K" })[piece.type] || "?";
  return piece.color === "w" ? letter : letter.toLowerCase();
}

function pieceLabel(piece, index) {
  return `${pieceLetter(piece)}@${squareName(index)}`;
}

function pieceKey(piece, index) {
  return `${piece?.color || "?"}${piece?.type || "?"}@${squareName(index)}`;
}

function makeObservation(predicate, text, extra = {}) {
  const catalog = PREDICATE_CATALOG.find((item) => item.name === predicate);
  return {
    predicate,
    kind: predicate,
    text,
    humanVisible: Boolean(catalog?.humanVisible),
    ...extra
  };
}

export function makeManualObservation(predicate, args = [], extra = {}) {
  const name = String(predicate || "").trim();
  if (!MANUAL_OBSERVATION_PREDICATES.includes(name)) {
    throw new Error(`Unknown manual predicate: ${name}`);
  }
  const cleanArgs = Array.isArray(args)
    ? args.map((item) => String(item).trim()).filter(Boolean)
    : [String(args).trim()].filter(Boolean);
  return makeObservation(name, `${name}(${cleanArgs.join(",")})`, {
    manual: true,
    args: cleanArgs,
    ...extra
  });
}

function dedupeObservations(observations) {
  const seen = new Set();
  const output = [];
  for (const observation of observations) {
    const key = [
      observation.predicate,
      observation.text,
      observation.square || "",
      observation.from || "",
      observation.to || "",
      observation.side || ""
    ].join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(observation);
  }
  return output;
}

function clearLine(board, from, to, deltaFile, deltaRank) {
  let [file, rank] = FR(from);
  file += deltaFile;
  rank += deltaRank;
  while (inBounds(file, rank)) {
    const current = idx(file, rank);
    if (current === to) return true;
    if (board[current]) return false;
    file += deltaFile;
    rank += deltaRank;
  }
  return false;
}

export function attacksSquare(board, from, to) {
  const piece = board?.[from];
  if (!piece || from === to) return false;

  const [fromFile, fromRank] = FR(from);
  const [toFile, toRank] = FR(to);
  const deltaFile = toFile - fromFile;
  const deltaRank = toRank - fromRank;
  const absFile = Math.abs(deltaFile);
  const absRank = Math.abs(deltaRank);

  if (piece.type === "p") {
    const direction = piece.color === "w" ? 1 : -1;
    return absFile === 1 && deltaRank === direction;
  }
  if (piece.type === "n") {
    return (absFile === 1 && absRank === 2) || (absFile === 2 && absRank === 1);
  }
  if (piece.type === "k") return Math.max(absFile, absRank) === 1;

  if ((piece.type === "b" || piece.type === "q") && absFile === absRank && absFile > 0) {
    return clearLine(board, from, to, Math.sign(deltaFile), Math.sign(deltaRank));
  }
  if (
    (piece.type === "r" || piece.type === "q") &&
    ((deltaFile === 0 && absRank > 0) || (deltaRank === 0 && absFile > 0))
  ) {
    return clearLine(board, from, to, Math.sign(deltaFile), Math.sign(deltaRank));
  }
  return false;
}

export function attackersOf(game, targetIndex, byColor) {
  const board = boardOf(game);
  const attackers = [];
  for (let from = 0; from < 64; from += 1) {
    const piece = board[from];
    if (!piece || piece.color !== byColor) continue;
    if (!attacksSquare(board, from, targetIndex)) continue;
    attackers.push({
      index: from,
      square: squareName(from),
      piece,
      label: pieceLabel(piece, from),
      key: pieceKey(piece, from)
    });
  }
  return attackers;
}

function pawnDefendersOf(game, targetIndex, color) {
  return attackersOf(game, targetIndex, color).filter((item) => item.piece.type === "p");
}

function raySliderMatches(piece, deltaFile, deltaRank) {
  if (!piece) return false;
  const diagonal = Math.abs(deltaFile) === 1 && Math.abs(deltaRank) === 1;
  const orthogonal = Math.abs(deltaFile) + Math.abs(deltaRank) === 1;
  if (diagonal) return piece.type === "b" || piece.type === "q";
  if (orthogonal) return piece.type === "r" || piece.type === "q";
  return false;
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
  try {
    return Boolean(game?._isInCheck?.(color));
  } catch {
    return false;
  }
}

function fenWithSide(fen, side) {
  const fields = String(fen || "").trim().split(/\s+/);
  if (fields.length < 4) throw new Error("Invalid FEN");
  const changed = fields[1] !== side;
  fields[1] = side;
  if (changed) fields[3] = "-";
  return fields.join(" ");
}

function normalizedPositionKey(fen) {
  return String(fen || "").trim().split(/\s+/).slice(0, 4).join(" ");
}

function cloneGame(createGame, fen, tags = {}) {
  const game = createGame({ Event: "policy clone", Site: "algo.js", ...tags });
  game.loadFEN(fen);
  return game;
}

function gameForSide(createGame, game, side) {
  const fen = game.exportFEN();
  return cloneGame(createGame, fenWithSide(fen, side));
}

function moveNeedsPromotion(game, from, to) {
  const piece = boardOf(game)[from];
  if (!piece || piece.type !== "p") return false;
  const [, rank] = FR(to);
  return (piece.color === "w" && rank === 7) || (piece.color === "b" && rank === 0);
}

function normalizePromotion(raw) {
  const value = String(raw || "").toLowerCase().replace(/[^qrbn]/g, "");
  return value.slice(0, 1);
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

    const explicitPromotion = normalizePromotion(
      raw?.promotion ?? raw?.promote ?? raw?.promo ?? raw?.promotionPiece
    );
    const promotions = moveNeedsPromotion(analysisGame, from, to)
      ? explicitPromotion
        ? [explicitPromotion]
        : PROMOTIONS
      : [""];

    for (const promotion of promotions) {
      const uci = `${squareName(from)}${squareName(to)}${promotion}`;
      output.push({
        raw,
        from,
        to,
        promotion,
        uci,
        mover: boardOf(analysisGame)[from] || null,
        captured: boardOf(analysisGame)[to] || null
      });
    }
  }

  const seen = new Set();
  return output.filter((move) => {
    if (seen.has(move.uci)) return false;
    seen.add(move.uci);
    return true;
  });
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
  if (!applyMoveUCI(clone, move.uci)) return null;
  return clone;
}

function materialFor(game, color) {
  let total = 0;
  for (const piece of boardOf(game)) {
    if (!piece || piece.color !== color) continue;
    total += PIECE_VALUES[piece.type] || 0;
  }
  return total;
}

function materialAdvantage(game, color) {
  return materialFor(game, color) - materialFor(game, other(color));
}

function materialSnapshot(game, rootSide) {
  return {
    w: materialFor(game, "w"),
    b: materialFor(game, "b"),
    advantageUs: materialAdvantage(game, rootSide)
  };
}

function observePins(game, rootSide) {
  const board = boardOf(game);
  const observations = [];
  const directions = [
    [1, 0], [-1, 0], [0, 1], [0, -1],
    [1, 1], [1, -1], [-1, 1], [-1, -1]
  ];

  for (const color of COLORS) {
    const kingIndex = board.findIndex((piece) => piece && piece.color === color && piece.type === "k");
    if (kingIndex < 0) continue;
    const [kingFile, kingRank] = FR(kingIndex);

    for (const [deltaFile, deltaRank] of directions) {
      let file = kingFile + deltaFile;
      let rank = kingRank + deltaRank;
      let candidate = null;

      while (inBounds(file, rank)) {
        const current = idx(file, rank);
        const piece = board[current];

        if (!piece) {
          file += deltaFile;
          rank += deltaRank;
          continue;
        }

        if (!candidate) {
          if (piece.color === color && piece.type !== "k") {
            candidate = { index: current, piece };
            file += deltaFile;
            rank += deltaRank;
            continue;
          }
          break;
        }

        if (piece.color !== color && raySliderMatches(piece, deltaFile, deltaRank)) {
          observations.push(makeObservation(
            "pin",
            `pin(${pieceLabel(candidate.piece, candidate.index)},${pieceLabel(board[kingIndex], kingIndex)})`,
            {
              square: squareName(candidate.index),
              from: squareName(current),
              to: squareName(candidate.index),
              side: roleFor(candidate.piece.color, rootSide),
              pieceColor: candidate.piece.color,
              attackerColor: piece.color,
              pieceIndex: candidate.index,
              attackerIndex: current,
              kingIndex,
              args: {
                piece: pieceKey(candidate.piece, candidate.index),
                pinnedTo: pieceKey(board[kingIndex], kingIndex),
                attacker: pieceKey(piece, current),
                side: roleFor(candidate.piece.color, rootSide)
              },
              detail: `pinned to king by ${pieceLabel(piece, current)}`
            }
          ));
        }
        break;
      }
    }
  }

  return observations;
}

function threatRank(types, policy) {
  const order = policy.threatRanking.order;
  const unique = [...new Set(types.filter((type) => order.includes(type)))];
  if (!unique.length) {
    return { score: 0, strongest: null, compound: false, types: [] };
  }

  let strongestIndex = order.length;
  for (const type of unique) strongestIndex = Math.min(strongestIndex, order.indexOf(type));
  const base = (order.length - strongestIndex) * 2;
  const compound = unique.length >= policy.threatRanking.compound.minimumDistinctTypes;
  return {
    score: base + (compound ? 1 : 0),
    strongest: order[strongestIndex],
    compound,
    types: unique.sort((a, b) => order.indexOf(a) - order.indexOf(b))
  };
}

function terminalInfo(createGame, game) {
  const side = normalizeColor(game?.state?.side);
  const legal = legalMoveRecords(createGame, game, side);
  if (legal.length) return null;
  if (safeInCheck(game, side)) {
    return { kind: "mate", winner: other(side), loser: side };
  }
  return { kind: "stalemate", winner: null, loser: null };
}

function mateInOneMoves(createGame, game, side, legalCache = null) {
  const analysisGame = side === game.state.side ? game : gameForSide(createGame, game, side);
  const moves = legalCache || legalMoveRecords(createGame, analysisGame, side);
  const mates = [];

  for (const move of moves) {
    const after = afterMove(createGame, analysisGame, move);
    if (!after) continue;
    const defender = after.state.side;
    if (!safeInCheck(after, defender)) continue;
    const replies = legalMoveRecords(createGame, after, defender);
    if (replies.length === 0) {
      mates.push({
        ...move,
        san: String(after.curNode?.san || move.uci).trim(),
        afterFen: after.exportFEN()
      });
    }
  }
  return mates;
}

function snapshotThreatBucket(items, captures, policy) {
  const types = [...new Set(items.map((item) => item.type))];
  return {
    items,
    captures,
    types,
    rank: threatRank(types, policy),
    hasAny: items.length > 0 || captures.length > 0
  };
}

/**
 * Computes every automatic predicate and the stored threat sets for both sides.
 */
export function inspectPosition({ createGame, game, rootSide = game?.state?.side, policy }) {
  if (typeof createGame !== "function") throw new Error("inspectPosition requires createGame");
  if (!game) throw new Error("inspectPosition requires a ScratchChess game");
  assertPolicy(policy);

  const root = normalizeColor(rootSide);
  const board = boardOf(game);
  const observations = [];
  const relationByTarget = new Map();

  for (let target = 0; target < 64; target += 1) {
    const piece = board[target];
    if (!piece) continue;

    const attackers = attackersOf(game, target, other(piece.color));
    const defenders = attackersOf(game, target, piece.color).filter((item) => item.index !== target);
    const pawnDefenders = pawnDefendersOf(game, target, piece.color);
    relationByTarget.set(target, { piece, attackers, defenders, pawnDefenders });

    for (const attacker of attackers) {
      observations.push(makeObservation(
        "attacks",
        `attacks(${attacker.label},${pieceLabel(piece, target)})`,
        {
          humanVisible: false,
          from: attacker.square,
          to: squareName(target),
          square: squareName(target),
          attackerColor: attacker.piece.color,
          targetColor: piece.color,
          args: {
            attacker: attacker.key,
            target: pieceKey(piece, target),
            side: roleFor(attacker.piece.color, root)
          }
        }
      ));
    }

    for (const defender of defenders) {
      observations.push(makeObservation(
        "defends",
        `defends(${defender.label},${pieceLabel(piece, target)})`,
        {
          humanVisible: false,
          from: defender.square,
          to: squareName(target),
          square: squareName(target),
          defenderColor: defender.piece.color,
          targetColor: piece.color,
          args: {
            defender: defender.key,
            target: pieceKey(piece, target),
            side: roleFor(defender.piece.color, root)
          }
        }
      ));
    }

    if (piece.type === "k" || attackers.length === 0 || pawnDefenders.length > 0) continue;

    if (attackers.length >= defenders.length) {
      observations.push(makeObservation("loose", `loose(${pieceLabel(piece, target)})`, {
        square: squareName(target),
        side: roleFor(piece.color, root),
        pieceColor: piece.color,
        pieceIndex: target,
        piece,
        attackers,
        defenders,
        args: {
          piece: pieceKey(piece, target),
          side: roleFor(piece.color, root),
          attackers: attackers.length,
          defenders: defenders.length
        },
        detail: `attackers=${attackers.length}, defenders=${defenders.length}, pawn_defenders=0`
      }));
    }

    if (attackers.length > defenders.length) {
      observations.push(makeObservation("hanging", `hanging(${pieceLabel(piece, target)})`, {
        square: squareName(target),
        side: roleFor(piece.color, root),
        pieceColor: piece.color,
        pieceIndex: target,
        piece,
        attackers,
        defenders,
        args: {
          piece: pieceKey(piece, target),
          side: roleFor(piece.color, root),
          attackers: attackers.length,
          defenders: defenders.length
        },
        detail: `attackers=${attackers.length}, defenders=${defenders.length}`
      }));
    }
  }

  observations.push(...observePins(game, root));

  const legalByColor = {
    w: legalMoveRecords(createGame, game, "w"),
    b: legalMoveRecords(createGame, game, "b")
  };

  const looseByIndex = new Map(
    observations
      .filter((observation) => observation.predicate === "loose")
      .map((observation) => [observation.pieceIndex, observation])
  );

  const capturesByColor = { w: [], b: [] };
  for (const color of COLORS) {
    for (const move of legalByColor[color]) {
      const loose = looseByIndex.get(move.to);
      const targetPiece = board[move.to];
      if (!loose || !targetPiece || targetPiece.color === color) continue;
      const attacker = board[move.from];
      const capture = {
        type: "capture",
        side: color,
        role: roleFor(color, root),
        from: move.from,
        to: move.to,
        uci: move.uci,
        attacker: pieceKey(attacker, move.from),
        target: pieceKey(targetPiece, move.to),
        targetIndex: move.to,
        targetColor: targetPiece.color,
        targetRole: roleFor(targetPiece.color, root)
      };
      capturesByColor[color].push(capture);
      observations.push(makeObservation(
        "capture_threat",
        `capture_threat(${pieceLabel(attacker, move.from)},${pieceLabel(targetPiece, move.to)})`,
        {
          from: squareName(move.from),
          to: squareName(move.to),
          square: squareName(move.to),
          side: roleFor(color, root),
          targetSide: roleFor(targetPiece.color, root),
          attackerColor: color,
          targetColor: targetPiece.color,
          attackerIndex: move.from,
          targetIndex: move.to,
          uci: move.uci,
          args: capture,
          detail: `${move.uci} is a legal capture of a loose ${pieceLabel(targetPiece, move.to)}`
        }
      ));
    }
  }

  for (const color of COLORS) {
    const movesFrom = new Map();
    for (const move of legalByColor[color]) {
      if (!movesFrom.has(move.from)) movesFrom.set(move.from, []);
      movesFrom.get(move.from).push(move);
    }

    for (let index = 0; index < 64; index += 1) {
      const piece = board[index];
      if (!piece || piece.color !== color || piece.type === "p" || piece.type === "k") continue;
      const relation = relationByTarget.get(index);
      if (!relation?.attackers?.length) continue;
      if ((movesFrom.get(index) || []).length > 0) continue;
      observations.push(makeObservation(
        "mobility_trap",
        `mobility_trap(${pieceLabel(piece, index)})`,
        {
          square: squareName(index),
          side: roleFor(piece.color, root),
          pieceColor: piece.color,
          attackerColor: other(piece.color),
          pieceIndex: index,
          args: {
            piece: pieceKey(piece, index),
            side: roleFor(piece.color, root)
          },
          detail: "attacked and has no legal move"
        }
      ));
    }
  }

  const currentSide = normalizeColor(game.state.side);
  const terminal = terminalInfo(createGame, game);
  if (terminal?.kind === "mate") {
    observations.push(makeObservation("mate", `mate(${terminal.winner})`, {
      side: roleFor(terminal.winner, root),
      winner: terminal.winner,
      loser: terminal.loser,
      args: { winner: terminal.winner, loser: terminal.loser },
      detail: `${terminal.loser} is checkmated`
    }));
  } else if (safeInCheck(game, currentSide)) {
    observations.push(makeObservation("in_check", `in_check(${currentSide})`, {
      side: roleFor(currentSide, root),
      checkedSide: currentSide,
      attackerColor: other(currentSide),
      args: { side: currentSide },
      detail: `${currentSide} to move is in check`
    }));
  }

  if (!terminal) {
    for (const color of COLORS) {
      const mates = mateInOneMoves(createGame, game, color, legalByColor[color]);
      if (!mates.length) continue;
      observations.push(makeObservation("mate_in_1", `mate_in_1(${color})`, {
        side: roleFor(color, root),
        threatColor: color,
        moves: mates.map((move) => ({ uci: move.uci, san: move.san })),
        args: { side: color, moves: mates.map((move) => move.san) },
        detail: `mate in one: ${mates.map((move) => move.san).join(", ")}`
      }));
    }
  }

  const deduped = dedupeObservations(observations);
  const rankedItems = { w: [], b: [] };

  for (const observation of deduped) {
    if (observation.predicate === "mate") {
      rankedItems[observation.winner].push({ type: "mate", observation });
    } else if (observation.predicate === "mate_in_1") {
      rankedItems[observation.threatColor].push({ type: "mate_in_1", observation });
    } else if (observation.predicate === "in_check") {
      rankedItems[observation.attackerColor].push({ type: "check", observation });
    } else if (observation.predicate === "pin") {
      rankedItems[observation.attackerColor].push({ type: "pin", observation });
    } else if (observation.predicate === "mobility_trap") {
      rankedItems[observation.attackerColor].push({ type: "mobility_trap", observation });
    }
  }

  const buckets = {
    w: snapshotThreatBucket(rankedItems.w, capturesByColor.w, policy),
    b: snapshotThreatBucket(rankedItems.b, capturesByColor.b, policy)
  };

  return {
    fen: game.exportFEN(),
    positionKey: normalizedPositionKey(game.exportFEN()),
    rootSide: root,
    sideToMove: currentSide,
    predicates: deduped,
    relationByTarget,
    legalByColor,
    terminal,
    material: materialSnapshot(game, root),
    threats: {
      w: buckets.w,
      b: buckets.b,
      us: buckets[root],
      them: buckets[other(root)]
    },
    captureThreats: {
      w: capturesByColor.w,
      b: capturesByColor.b,
      us: capturesByColor[root],
      them: capturesByColor[other(root)]
    }
  };
}

export function observe(game, { createGame, rootSide = game?.state?.side, policy = FALLBACK_POLICY } = {}) {
  return inspectPosition({ createGame, game, rootSide, policy }).predicates;
}

export function humanVisibleObservations(observations) {
  const allowed = new Set(HUMAN_VISIBLE_PREDICATES);
  return (observations || []).filter((observation) => allowed.has(observation.predicate));
}

function goalStatus(snapshot, policy) {
  const rootSide = snapshot.rootSide;
  const enemy = other(rootSide);

  if (snapshot.terminal?.kind === "mate") {
    if (snapshot.terminal.winner === rootSide) {
      return { achieved: true, type: "mate", detail: `${rootSide} delivered mate` };
    }
    return { achieved: false, terminalFailure: true, type: "mated", detail: `${rootSide} is mated` };
  }

  if (snapshot.terminal?.kind === "stalemate") {
    return { achieved: false, terminalFailure: true, type: "stalemate", detail: "stalemate is not the objective" };
  }

  for (const objective of policy.objective.anyOf) {
    if (objective.type !== "material") continue;
    const advantage = snapshot.material.advantageUs;
    const opponentHasThreat = snapshot.threats[enemy].hasAny;
    const settled = !objective.requireNoOpponentThreat || !opponentHasThreat;
    if (advantage >= objective.minimumAdvantagePawns && settled) {
      return {
        achieved: true,
        type: "material",
        advantage,
        settled,
        detail: `${advantage} pawn-unit advantage with opponent threats ${opponentHasThreat ? "present" : "cleared"}`
      };
    }
  }

  return {
    achieved: false,
    terminalFailure: false,
    type: "none",
    advantage: snapshot.material.advantageUs,
    opponentHasThreat: snapshot.threats.them.hasAny
  };
}

function defendersForTarget(snapshot, targetIndex, color) {
  const relation = snapshot.relationByTarget.get(targetIndex);
  if (!relation || relation.piece.color !== color) return [];
  return relation.defenders || [];
}

function attackersForTarget(snapshot, targetIndex, color) {
  const relation = snapshot.relationByTarget.get(targetIndex);
  if (!relation || relation.piece.color === color) return [];
  return (relation.attackers || []).filter((item) => item.piece.color === color);
}

function captureThreatsAgainst(snapshot, targetColor, targetIndex = null) {
  const threats = snapshot.captureThreats[other(targetColor)] || [];
  return threats.filter((threat) => targetIndex == null || threat.targetIndex === targetIndex);
}

function uniqueTargetThreats(captures) {
  const map = new Map();
  for (const capture of captures) {
    if (!map.has(capture.targetIndex)) {
      map.set(capture.targetIndex, {
        targetIndex: capture.targetIndex,
        targetColor: capture.targetColor,
        target: capture.target,
        captures: [],
        attackerIndices: new Set()
      });
    }
    const item = map.get(capture.targetIndex);
    item.captures.push(capture);
    item.attackerIndices.add(capture.from);
  }
  return [...map.values()];
}

function targetAfterMove(target, move) {
  return move.from === target.targetIndex ? move.to : target.targetIndex;
}

function captureMadeUnprofitable({
  createGame,
  afterGame,
  targetIndex,
  targetColor,
  rootSide,
  minimumAcceptableAdvantage
}) {
  const captures = legalMoveRecords(createGame, afterGame, other(targetColor))
    .filter((move) => move.to === targetIndex && boardOf(afterGame)[targetIndex]?.color === targetColor);
  if (!captures.length) return true;

  for (const capture of captures) {
    const afterCapture = afterMove(createGame, afterGame, capture);
    if (!afterCapture) return false;
    const recaptures = legalMoveRecords(createGame, afterCapture, targetColor)
      .filter((move) => move.to === targetIndex);
    let acceptableRecapture = false;
    for (const recapture of recaptures) {
      const afterRecapture = afterMove(createGame, afterCapture, recapture);
      if (!afterRecapture) continue;
      if (materialAdvantage(afterRecapture, rootSide) >= minimumAcceptableAdvantage) {
        acceptableRecapture = true;
        break;
      }
    }
    if (!acceptableRecapture) return false;
  }
  return true;
}

function enemyLoosePredicates(snapshot) {
  return snapshot.predicates.filter(
    (observation) => observation.predicate === "loose" && observation.side === "enemy"
  );
}

function ownLooseCaptureTargets(snapshot) {
  return uniqueTargetThreats(
    snapshot.captureThreats.them.filter((threat) => threat.targetColor === snapshot.rootSide)
  );
}

function moveSummary(record) {
  return {
    uci: record.uci,
    san: record.san,
    from: squareName(record.from),
    to: squareName(record.to),
    category: record.category,
    priority: record.priority,
    ownActionPriority: record.ownActionPriority,
    patternActionPriority: record.patternActionPriority,
    tags: [...record.tags],
    reasons: [...record.reasons],
    threatScore: record.threatScore,
    compoundThreat: record.compoundThreat,
    materialDeltaUs: record.materialDeltaUs,
    quietNoProgress: record.quietNoProgress,
    immediateRuleViolation: record.immediateRuleViolation
  };
}

function analyzeMove({ createGame, game, move, before, rootSide, policy }) {
  const mover = normalizeColor(game.state.side);
  const afterGame = afterMove(createGame, game, move);
  if (!afterGame) return null;

  const after = inspectPosition({ createGame, game: afterGame, rootSide, policy });
  const objective = goalStatus(after, policy);
  const tags = new Set();
  const reasons = [];
  const ownLooseRule = policy.rules.find((rule) => rule.id === "answer-threat-to-own-loose-piece");
  const enemyLooseRule = policy.rules.find((rule) => rule.id === "attack-defender-of-enemy-loose-piece");
  const allowedOwnOutcomes = new Set(ownLooseRule?.mustAchieveOneBeforeOpponentCanExecuteThreat || []);
  const moverBucketBefore = before.threats[mover];
  const moverBucketAfter = after.threats[mover];
  const materialDeltaUs = after.material.advantageUs - before.material.advantageUs;
  const materialDeltaMover = materialAdvantage(afterGame, mover) - materialAdvantage(game, mover);

  if (objective.achieved && mover === rootSide) {
    tags.add("achieve_objective");
    reasons.push(`achieves ${objective.type}`);
  }

  if (after.terminal?.kind === "mate" && after.terminal.winner === mover) {
    tags.add("mate");
    reasons.push("delivers mate");
  }
  if (after.predicates.some(
    (observation) => observation.predicate === "in_check" && observation.attackerColor === mover
  )) {
    tags.add("check");
    reasons.push("gives check");
  }
  if (after.predicates.some(
    (observation) => observation.predicate === "mate_in_1" && observation.threatColor === mover
  )) {
    tags.add("mate_in_1");
    reasons.push("creates mate in one");
  }
  if (move.captured) {
    tags.add("capture");
    reasons.push(`captures ${pieceLabel(move.captured, move.to)}`);
  }
  if (materialDeltaMover > 0) tags.add("gains_material");

  const newThreatTypes = moverBucketAfter.types.filter((type) => !moverBucketBefore.types.includes(type));
  const createsThreat = moverBucketAfter.rank.score > moverBucketBefore.rank.score || newThreatTypes.length > 0;
  if (createsThreat) {
    tags.add("creates_threat");
    reasons.push(`raises ${mover === rootSide ? "our" : "their"} threat rank to ${moverBucketAfter.rank.score}`);
  }
  if (moverBucketAfter.rank.compound && moverBucketAfter.rank.score > moverBucketBefore.rank.score) {
    tags.add("create_compound_threat");
    reasons.push(`creates compound threat: ${moverBucketAfter.rank.types.join("+")}`);
  }
  if (createsThreat) tags.add("create_highest_threat");

  const ownTargets = mover === rootSide ? ownLooseCaptureTargets(before) : [];
  const targetOutcomes = [];
  for (const target of ownTargets) {
    const afterIndex = targetAfterMove(target, move);
    const moved = move.from === target.targetIndex;
    const capturedAttacker = target.attackerIndices.has(move.to);
    const beforeDefenders = defendersForTarget(before, target.targetIndex, target.targetColor).length;
    const afterPiece = boardOf(afterGame)[afterIndex];
    const afterDefenders = afterPiece?.color === target.targetColor
      ? defendersForTarget(after, afterIndex, target.targetColor).length
      : 0;
    const afterAttackers = afterPiece?.color === target.targetColor
      ? attackersForTarget(after, afterIndex, other(target.targetColor)).length
      : 0;
    const legalCapturesRemain = afterPiece?.color === target.targetColor
      ? captureThreatsAgainst(after, target.targetColor, afterIndex)
      : [];
    const saved = Boolean(afterPiece?.color === target.targetColor) && legalCapturesRemain.length === 0;
    const defended = Boolean(afterPiece?.color === target.targetColor) && afterDefenders > beforeDefenders;
    const attackRemoved = Boolean(afterPiece?.color === target.targetColor) && afterAttackers < target.captures.length;
    const unprofitable = Boolean(afterPiece?.color === target.targetColor) && captureMadeUnprofitable({
      createGame,
      afterGame,
      targetIndex: afterIndex,
      targetColor: target.targetColor,
      rootSide,
      minimumAcceptableAdvantage: before.material.advantageUs
    });

    if (moved) tags.add("move_target");
    if (defended) tags.add("defend_target");
    if (capturedAttacker) tags.add("capture_attacker");
    if (attackRemoved || saved) tags.add("remove_attack");
    if (saved) tags.add("target_saved");
    if (unprofitable) tags.add("capture_made_unprofitable");

    targetOutcomes.push({
      target,
      afterIndex,
      moved,
      defended,
      capturedAttacker,
      attackRemoved,
      saved,
      unprofitable,
      legalCapturesRemain: legalCapturesRemain.length
    });
  }

  let ownActionPriority = Number.POSITIVE_INFINITY;
  if (ownTargets.length) {
    if (tags.has("check") || tags.has("mate_in_1") || tags.has("mate")) {
      tags.add("force_then_save_target");
    }
    const outcomeAccepted = (outcome) => (
      (allowedOwnOutcomes.has("objective_proven") && objective.achieved) ||
      (allowedOwnOutcomes.has("target_saved") && outcome.saved) ||
      (allowedOwnOutcomes.has("capture_made_unprofitable") && outcome.unprofitable)
    );
    const allHandled = targetOutcomes.every(outcomeAccepted);
    const matchedActions = (ownLooseRule?.considerFirst || []).filter((action) => tags.has(action));
    ownActionPriority = matchedActions.length
      ? Math.min(...matchedActions.map((action) => ownLooseRule.considerFirst.indexOf(action)))
      : Number.POSITIVE_INFINITY;
    if (allHandled && matchedActions.length) {
      tags.add("answer_immediate_threat");
      reasons.push("answers every legal capture threat against our loose piece");
    }
  }

  let patternAdvanced = false;
  let patternActionPriority = Number.POSITIVE_INFINITY;
  for (const loose of enemyLoosePredicates(before)) {
    if (move.to === loose.pieceIndex) {
      tags.add("capture_target");
      patternAdvanced = true;
      reasons.push(`captures enemy loose target ${loose.text}`);
    }

    const targetKey = loose.args?.piece;
    const defenders = before.predicates
      .filter((observation) => observation.predicate === "defends" && observation.args?.target === targetKey)
      .map((observation) => parseSquare(String(observation.args?.defender || "").split("@")[1]))
      .filter((index) => index != null);

    for (const defenderIndex of defenders) {
      if (move.to === defenderIndex) {
        tags.add("add_attacker_to_defender");
        patternAdvanced = true;
        reasons.push(`removes defender on ${squareName(defenderIndex)}`);
        continue;
      }
      const beforeCount = attackersOf(game, defenderIndex, mover).length;
      const afterPiece = boardOf(afterGame)[defenderIndex];
      if (!afterPiece) continue;
      const afterCount = attackersOf(afterGame, defenderIndex, mover).length;
      if (afterCount > beforeCount) {
        tags.add("add_attacker_to_defender");
        patternAdvanced = true;
        reasons.push(`adds an attacker to defender on ${squareName(defenderIndex)}`);
      }
    }
  }

  const matchedPatternActions = (enemyLooseRule?.consider || []).filter((action) => tags.has(action));
  patternAdvanced = patternAdvanced && matchedPatternActions.length > 0;
  if (patternAdvanced) {
    tags.add("advance_matching_pattern");
    patternActionPriority = Math.min(
      ...matchedPatternActions.map((action) => enemyLooseRule.consider.indexOf(action))
    );
  }

  const threatAnswered = ownTargets.length > 0 && targetOutcomes.every((outcome) => (
    (allowedOwnOutcomes.has("objective_proven") && objective.achieved) ||
    (allowedOwnOutcomes.has("target_saved") && outcome.saved) ||
    (allowedOwnOutcomes.has("capture_made_unprofitable") && outcome.unprofitable)
  ));

  const quietNoProgress = mover === rootSide &&
    materialDeltaUs <= 0 &&
    !createsThreat &&
    !threatAnswered &&
    !patternAdvanced;

  const immediateRuleViolation = mover === rootSide &&
    ownTargets.length > 0 &&
    !objective.achieved &&
    targetOutcomes.some((outcome) => outcome.legalCapturesRemain > 0 && !outcome.unprofitable);

  if (quietNoProgress) tags.add("quiet_no_progress");
  if (immediateRuleViolation) {
    tags.add("leaves_loose_piece_capturable");
    reasons.push("leaves a legal profitable capture of our threatened loose piece");
  }

  const replyTags = new Set();
  if (mover !== rootSide) {
    for (const loose of enemyLoosePredicates(before)) {
      const targetIndex = loose.pieceIndex;
      const targetColor = loose.pieceColor;
      const beforeDefenders = defendersForTarget(before, targetIndex, targetColor).length;
      const beforeAttackers = attackersForTarget(before, targetIndex, rootSide).map((item) => item.index);

      if (move.from === targetIndex) replyTags.add("move_target");
      if (beforeAttackers.includes(move.to)) {
        replyTags.add("remove_attacker");
        replyTags.add("capture_attacker");
      }

      const targetAfter = move.from === targetIndex ? move.to : targetIndex;
      const targetPieceAfter = boardOf(afterGame)[targetAfter];
      if (targetPieceAfter?.color === targetColor) {
        const afterDefenders = defendersForTarget(after, targetAfter, targetColor).length;
        const afterRootCaptures = captureThreatsAgainst(after, targetColor, targetAfter)
          .filter((capture) => capture.side === rootSide);
        if (afterDefenders > beforeDefenders || afterRootCaptures.length === 0) {
          replyTags.add("protect_target");
        }
      }
    }

    if (after.threats[mover].rank.score >= Math.max(1, before.threats[rootSide].rank.score)) {
      replyTags.add("create_equal_or_higher_threat");
    }
  }

  const matchedPriority = policy.search.candidatePriority.findIndex((category) => {
    if (category === "achieve_objective") return tags.has("achieve_objective");
    if (category === "answer_immediate_threat") return tags.has("answer_immediate_threat");
    if (category === "create_compound_threat") return tags.has("create_compound_threat");
    if (category === "create_highest_threat") return tags.has("create_highest_threat");
    if (category === "advance_matching_pattern") return tags.has("advance_matching_pattern");
    if (category === "other_legal_move") return true;
    return false;
  });
  const priority = matchedPriority < 0 ? policy.search.candidatePriority.length : matchedPriority;
  const category = matchedPriority < 0
    ? "excluded_by_policy"
    : policy.search.candidatePriority[matchedPriority];

  const san = String(afterGame.curNode?.san || move.uci).trim();
  if (!reasons.length) reasons.push("other legal move");

  return {
    ...move,
    san,
    afterFen: afterGame.exportFEN(),
    afterSnapshot: after,
    objective,
    tags,
    replyTags,
    reasons,
    priority,
    category,
    ownActionPriority,
    patternActionPriority,
    threatScore: moverBucketAfter.rank.score,
    compoundThreat: moverBucketAfter.rank.compound,
    materialDeltaUs,
    materialDeltaMover,
    quietNoProgress,
    immediateRuleViolation,
    ownTargets,
    targetOutcomes,
    patternAdvanced
  };
}

function replyOrderIndex(record, policy) {
  const rule = policy.rules.find((item) => item.id === "attack-defender-of-enemy-loose-piece");
  const order = rule?.orderOpponentRepliesFirst || [];
  let best = order.length;
  for (const tag of record.replyTags) {
    const index = order.indexOf(tag);
    if (index >= 0) best = Math.min(best, index);
  }
  return best;
}

function compareOurMoves(a, b) {
  return (
    a.priority - b.priority ||
    Number(b.objective.achieved) - Number(a.objective.achieved) ||
    Number(b.tags.has("answer_immediate_threat")) - Number(a.tags.has("answer_immediate_threat")) ||
    a.ownActionPriority - b.ownActionPriority ||
    a.patternActionPriority - b.patternActionPriority ||
    b.threatScore - a.threatScore ||
    b.materialDeltaUs - a.materialDeltaUs ||
    Number(a.immediateRuleViolation) - Number(b.immediateRuleViolation) ||
    a.san.localeCompare(b.san)
  );
}

function compareOpponentMoves(a, b, policy) {
  return (
    Number(b.tags.has("mate")) - Number(a.tags.has("mate")) ||
    replyOrderIndex(a, policy) - replyOrderIndex(b, policy) ||
    b.threatScore - a.threatScore ||
    b.materialDeltaMover - a.materialDeltaMover ||
    a.san.localeCompare(b.san)
  );
}

function generateMoveAnalyses({ createGame, game, before, rootSide, policy }) {
  const mover = normalizeColor(game.state.side);
  const analyses = [];
  for (const move of legalMoveRecords(createGame, game, mover)) {
    const analysis = analyzeMove({ createGame, game, move, before, rootSide, policy });
    if (analysis) analyses.push(analysis);
  }
  const retained = mover === rootSide
    ? analyses.filter((record) => record.priority < policy.search.candidatePriority.length)
    : analyses;
  retained.sort(mover === rootSide
    ? compareOurMoves
    : (a, b) => compareOpponentMoves(a, b, policy));
  return retained;
}

function syncGameToFrame(game, frame) {
  if (!game || !frame) return;
  try {
    if (frame.externalNode?.fenAfter && typeof game._applyFENToState === "function") {
      game._applyFENToState(frame.externalNode.fenAfter);
      game.curNode = frame.externalNode;
    } else if (typeof game._applyFENToState === "function") {
      game._applyFENToState(frame.fen);
      if (frame.externalNode) game.curNode = frame.externalNode;
    } else {
      game.loadFEN(frame.fen);
    }
    if (game.sel) {
      game.sel.fromSq = null;
      game.sel.legalTo = [];
    }
    game._emit?.();
  } catch {
    try {
      game.loadFEN(frame.fen);
    } catch {
      // The search state remains valid even if this optional UI synchronization fails.
    }
  }
}

function result(status, reason, extra = {}) {
  return { status, reason, ...extra };
}

function makeFrame({ fen, depth, externalNode = null, incoming = null, snapshot = null }) {
  return {
    fen,
    depth,
    externalNode,
    incoming,
    snapshot,
    stage: "enter",
    nodeType: null,
    moves: [],
    nextMoveIndex: 0,
    childResults: [],
    result: null
  };
}

function framePath(stack) {
  return stack.slice(1).map((frame) => frame.incoming?.uci).filter(Boolean);
}

function eventObservations(frame) {
  return humanVisibleObservations(frame?.snapshot?.predicates || []);
}

function describeThreats(snapshot) {
  const us = snapshot.threats.us.rank.types.join("+") || "none";
  const them = snapshot.threats.them.rank.types.join("+") || "none";
  const ownCaptures = snapshot.captureThreats.us.length;
  const enemyCaptures = snapshot.captureThreats.them.length;
  return `threats us=${us} (${ownCaptures} capture), them=${them} (${enemyCaptures} capture)`;
}

/**
 * Stateful, one-operation-at-a-time depth-first proof stepper.
 *
 * The stepper mutates the supplied worksheet game only to display the current
 * search edge. It keeps every explored edge in ScratchChess's variation tree
 * and returns a backtrack event before trying the next sibling.
 */
export function createReasoner({ createGame, policy, maxSteps = 5000 } = {}) {
  if (typeof createGame !== "function") {
    throw new Error("createReasoner requires { createGame } from scratchchess.js");
  }
  assertPolicy(policy);

  const state = {
    policy,
    status: "idle",
    stepCount: 0,
    nodes: 0,
    rootFen: "",
    rootSide: "w",
    expectedFen: "",
    stack: [],
    history: [],
    finalResult: null,
    lastEvent: null
  };

  function reset(game = null) {
    state.status = "idle";
    state.stepCount = 0;
    state.nodes = 0;
    state.rootFen = "";
    state.rootSide = "w";
    state.expectedFen = "";
    state.stack = [];
    state.history = [];
    state.finalResult = null;
    state.lastEvent = null;
    if (game) start(game);
  }

  function start(game) {
    if (!game) throw new Error("reasoner.start requires a ScratchChess game");
    state.rootFen = game.exportFEN();
    state.rootSide = normalizeColor(game.state.side);
    state.expectedFen = state.rootFen;
    state.stack = [makeFrame({
      fen: state.rootFen,
      depth: 0,
      externalNode: game.curNode || game.root || null
    })];
    state.status = "searching";
    state.finalResult = null;
  }

  function inspect(game, rootSide = game?.state?.side) {
    return inspectPosition({ createGame, game, rootSide, policy });
  }

  function observeCurrent(game, rootSide = game?.state?.side) {
    return inspect(game, rootSide).predicates;
  }

  function ensureSynchronized(game) {
    const currentFen = game.exportFEN();
    if (state.status === "idle" || !state.stack.length) {
      start(game);
      return { restarted: true, reason: "new search root" };
    }
    if (normalizedPositionKey(currentFen) !== normalizedPositionKey(state.expectedFen)) {
      start(game);
      return { restarted: true, reason: "board changed outside the stepper" };
    }
    return { restarted: false, reason: "" };
  }

  function recordEvent(event) {
    state.lastEvent = event;
    if (policy.observe.storeHistory) state.history.push(event);
    return event;
  }

  function finishFrame(frame, frameResult) {
    frame.result = frameResult;
    frame.stage = "done";
  }

  function aggregateFrame(frame) {
    if (frame.nodeType === policy.search.ourNodes) {
      const provenChild = frame.childResults.find((child) => child.result.status === "proven");
      if (provenChild) {
        return result("proven", "one_candidate_proved_objective", {
          move: provenChild.move,
          child: provenChild.result
        });
      }
      return result("refutedWithinPolicy", "no_candidate_proved_objective", {
        children: frame.childResults
      });
    }

    const failedReply = frame.childResults.find((child) => child.result.status !== "proven");
    if (failedReply) {
      return result("refutedWithinPolicy", "one_legal_reply_not_proven", {
        move: failedReply.move,
        child: failedReply.result
      });
    }
    return result("proven", "every_legal_reply_proved", {
      children: frame.childResults
    });
  }

  function attachChildResult(parent, child) {
    const item = {
      move: moveSummary(child.incoming),
      result: child.result
    };
    parent.childResults.push(item);

    if (parent.nodeType === policy.search.ourNodes && child.result.status === "proven") {
      finishFrame(parent, result("proven", "one_candidate_proved_objective", {
        move: item.move,
        child: child.result
      }));
    } else if (parent.nodeType === policy.search.opponentNodes && child.result.status !== "proven") {
      finishFrame(parent, result("refutedWithinPolicy", "one_legal_reply_not_proven", {
        move: item.move,
        child: child.result
      }));
    } else if (parent.nextMoveIndex >= parent.moves.length) {
      finishFrame(parent, aggregateFrame(parent));
    }
  }

  function step(game) {
    if (!game) throw new Error("reasoner.step(game) requires a ScratchChess game");
    const sync = ensureSynchronized(game);

    if (state.status !== "searching") {
      return recordEvent({
        type: "done",
        status: state.status,
        result: state.finalResult,
        log: `Search already ended: ${state.status}. Restart the proof to search again.`
      });
    }

    state.stepCount += 1;
    if (state.stepCount > maxSteps) {
      state.status = "inconclusive";
      state.finalResult = result("unresolvedLeaf", "step_budget_exhausted", { maxSteps });
      return recordEvent({
        type: "terminal",
        status: state.status,
        result: state.finalResult,
        log: `Stepper safety budget ${maxSteps} was exhausted.`
      });
    }

    const frame = state.stack[state.stack.length - 1];
    if (!frame) {
      state.status = "inconclusive";
      state.finalResult = result("unresolvedLeaf", "empty_search_stack");
      return recordEvent({
        type: "terminal",
        status: state.status,
        result: state.finalResult,
        log: "Search stack unexpectedly became empty."
      });
    }

    if (frame.stage === "enter") {
      const positionGame = cloneGame(createGame, frame.fen);
      frame.snapshot = frame.snapshot || inspectPosition({
        createGame,
        game: positionGame,
        rootSide: state.rootSide,
        policy
      });
      frame.nodeType = frame.snapshot.sideToMove === state.rootSide
        ? policy.search.ourNodes
        : policy.search.opponentNodes;
      state.nodes += 1;

      const goal = goalStatus(frame.snapshot, policy);
      if (goal.achieved) {
        finishFrame(frame, result("proven", "objective_proven", { goal }));
        return recordEvent({
          type: "leaf",
          status: "proven",
          depth: frame.depth,
          path: framePath(state.stack),
          observations: eventObservations(frame),
          goal,
          log: `Goal proven at ply ${frame.depth}: ${goal.detail}.`
        });
      }

      if (goal.terminalFailure) {
        finishFrame(frame, result("refutedWithinPolicy", goal.type, { goal }));
        return recordEvent({
          type: "leaf",
          status: "refutedWithinPolicy",
          depth: frame.depth,
          path: framePath(state.stack),
          observations: eventObservations(frame),
          goal,
          log: `Terminal non-goal leaf at ply ${frame.depth}: ${goal.detail}.`
        });
      }

      if (frame.incoming?.immediateRuleViolation) {
        finishFrame(frame, result("refutedWithinPolicy", "own_loose_piece_capture_still_works", {
          move: moveSummary(frame.incoming)
        }));
        return recordEvent({
          type: "leaf",
          status: "refutedWithinPolicy",
          depth: frame.depth,
          path: framePath(state.stack),
          observations: eventObservations(frame),
          log: "Candidate rejected: a legal profitable capture of our threatened loose piece remains."
        });
      }

      if (frame.depth >= policy.budget.maxPlies) {
        finishFrame(frame, result("unresolvedLeaf", "depth_exhausted", {
          maxPlies: policy.budget.maxPlies
        }));
        return recordEvent({
          type: "leaf",
          status: "unresolvedLeaf",
          depth: frame.depth,
          path: framePath(state.stack),
          observations: eventObservations(frame),
          log: `Depth ${policy.budget.maxPlies} reached without proving the objective.`
        });
      }

      if (
        frame.incoming?.quietNoProgress &&
        policy.search.stop.includes("quiet_no_progress")
      ) {
        finishFrame(frame, result("refutedWithinPolicy", "quiet_no_progress", {
          move: moveSummary(frame.incoming)
        }));
        return recordEvent({
          type: "leaf",
          status: "refutedWithinPolicy",
          depth: frame.depth,
          path: framePath(state.stack),
          observations: eventObservations(frame),
          log: "Branch stopped: our preceding move gained no material, created no threat, answered no threat, and advanced no pattern."
        });
      }

      frame.stage = "expand";
      return recordEvent({
        type: "observe",
        status: "searching",
        restarted: sync.restarted,
        depth: frame.depth,
        nodeType: frame.nodeType,
        path: framePath(state.stack),
        observations: eventObservations(frame),
        snapshot: {
          fen: frame.snapshot.fen,
          sideToMove: frame.snapshot.sideToMove,
          materialAdvantageUs: frame.snapshot.material.advantageUs,
          threatsUs: frame.snapshot.threats.us.rank,
          threatsThem: frame.snapshot.threats.them.rank,
          captureThreatsUs: frame.snapshot.captureThreats.us.length,
          captureThreatsThem: frame.snapshot.captureThreats.them.length
        },
        comment: `policy observe ply ${frame.depth}: ${describeThreats(frame.snapshot)}`,
        log: `${sync.restarted ? `${sync.reason}; ` : ""}Observed ply ${frame.depth} ${frame.nodeType.toUpperCase()} node: ${describeThreats(frame.snapshot)}.`
      });
    }

    if (frame.stage === "expand") {
      const positionGame = cloneGame(createGame, frame.fen);
      frame.moves = generateMoveAnalyses({
        createGame,
        game: positionGame,
        before: frame.snapshot,
        rootSide: state.rootSide,
        policy
      });
      frame.nextMoveIndex = 0;
      frame.stage = "children";

      if (!frame.moves.length) {
        finishFrame(frame, result("refutedWithinPolicy", "no_legal_moves_without_goal"));
        return recordEvent({
          type: "leaf",
          status: "refutedWithinPolicy",
          depth: frame.depth,
          observations: eventObservations(frame),
          log: "No legal move reaches the objective at this node."
        });
      }

      const summaries = frame.moves.map(moveSummary);
      const label = frame.nodeType === policy.search.ourNodes ? "candidates" : "legal replies";
      return recordEvent({
        type: frame.nodeType === policy.search.ourNodes ? "candidates" : "replies",
        status: "searching",
        depth: frame.depth,
        nodeType: frame.nodeType,
        path: framePath(state.stack),
        observations: eventObservations(frame),
        candidates: frame.nodeType === policy.search.ourNodes ? summaries : undefined,
        replies: frame.nodeType === policy.search.opponentNodes ? summaries : undefined,
        totalMoves: summaries.length,
        comment: `${label}: ${summaries.slice(0, 8).map((move) => `${move.san}[${move.category}]`).join("; ")}`,
        log: `Ranked ${summaries.length} ${label}; next is ${summaries[0].san} (${summaries[0].category}).`
      });
    }

    if (frame.stage === "children") {
      if (frame.result) {
        frame.stage = "done";
        return recordEvent({
          type: "aggregate",
          status: frame.result.status,
          depth: frame.depth,
          path: framePath(state.stack),
          result: frame.result,
          log: frame.nodeType === policy.search.ourNodes
            ? `EXISTS node resolved ${frame.result.status}: ${frame.result.reason}.`
            : `FORALL node resolved ${frame.result.status}: ${frame.result.reason}.`
        });
      }

      if (frame.nextMoveIndex >= frame.moves.length) {
        finishFrame(frame, aggregateFrame(frame));
        return recordEvent({
          type: "aggregate",
          status: frame.result.status,
          depth: frame.depth,
          path: framePath(state.stack),
          result: frame.result,
          log: `${frame.nodeType.toUpperCase()} node exhausted all ${frame.moves.length} move(s): ${frame.result.status}.`
        });
      }

      const move = frame.moves[frame.nextMoveIndex];
      frame.nextMoveIndex += 1;
      syncGameToFrame(game, frame);
      const played = applyMoveUCI(game, move.uci);
      if (!played) {
        finishFrame(frame, result("refutedWithinPolicy", "scratchchess_rejected_legal_move", {
          move: moveSummary(move)
        }));
        state.expectedFen = game.exportFEN();
        return recordEvent({
          type: "error",
          status: "searching",
          move: moveSummary(move),
          log: `ScratchChess rejected generated legal move ${move.uci}.`
        });
      }

      const actualAfterFen = game.exportFEN();
      const child = makeFrame({
        fen: actualAfterFen,
        depth: frame.depth + 1,
        externalNode: game.curNode || null,
        incoming: move,
        snapshot: normalizedPositionKey(actualAfterFen) === normalizedPositionKey(move.afterFen)
          ? move.afterSnapshot
          : null
      });
      state.stack.push(child);
      state.expectedFen = actualAfterFen;

      return recordEvent({
        type: "play",
        status: "searching",
        depth: child.depth,
        nodeType: frame.nodeType,
        path: framePath(state.stack),
        move: moveSummary(move),
        playedMove: moveSummary(move),
        comment: `policy ${frame.nodeType}: ${move.category}; ${move.reasons.join("; ")}`,
        log: `${frame.nodeType === policy.search.ourNodes ? "Candidate" : "Reply"} ${move.san} played at ply ${child.depth}: ${move.reasons.join("; ")}.`
      });
    }

    if (frame.stage === "done") {
      if (state.stack.length === 1) {
        state.finalResult = frame.result;
        state.status = frame.result.status === "proven"
          ? "proven"
          : frame.result.status === "refutedWithinPolicy"
            ? "refutedWithinPolicy"
            : "inconclusive";
        syncGameToFrame(game, frame);
        state.expectedFen = game.exportFEN();
        return recordEvent({
          type: "terminal",
          status: state.status,
          result: state.finalResult,
          nodes: state.nodes,
          steps: state.stepCount,
          path: [],
          log: `Proof search ended ${state.status} after ${state.nodes} node(s) and ${state.stepCount} step(s): ${state.finalResult.reason}.`
        });
      }

      const child = state.stack.pop();
      const parent = state.stack[state.stack.length - 1];
      attachChildResult(parent, child);
      syncGameToFrame(game, parent);
      state.expectedFen = game.exportFEN();

      return recordEvent({
        type: "backtrack",
        status: "searching",
        depth: parent.depth,
        path: framePath(state.stack),
        move: moveSummary(child.incoming),
        childResult: child.result,
        observations: eventObservations(parent),
        log: `Backtracked from ${child.incoming.san}: ${child.result.status} (${child.result.reason}).`
      });
    }

    frame.stage = "enter";
    return recordEvent({
      type: "repair",
      status: "searching",
      log: "Unknown frame stage repaired by returning to observation."
    });
  }

  function preview(game, { maxCandidates = 8 } = {}) {
    const rootSide = normalizeColor(game.state.side);
    const snapshot = inspectPosition({ createGame, game, rootSide, policy });
    const goal = goalStatus(snapshot, policy);
    const moves = goal.achieved
      ? []
      : generateMoveAnalyses({
        createGame,
        game,
        before: snapshot,
        rootSide,
        policy
      });
    const visible = humanVisibleObservations(snapshot.predicates);
    const candidates = moves.slice(0, maxCandidates).map(moveSummary);
    const ownTargets = ownLooseCaptureTargets(snapshot);
    const steps = [
      `Root FEN: ${snapshot.fen}`,
      `Root side: ${rootSide === "w" ? "White" : "Black"}; proof depth: ${policy.budget.maxPlies} plies.`,
      `Node semantics: our turns are EXISTS; opponent turns are FORALL over all legal replies.`,
      `Stored ${describeThreats(snapshot)}.`,
      ownTargets.length
        ? `Immediate duty: ${ownTargets.length} of our loose piece target(s) have legal capture threats; answer them or prove a forcing exception.`
        : "No legal capture threat against one of our loose pieces is active at the root.",
      visible.length
        ? `Predicates: ${visible.map((observation) => observation.text).join("; ")}.`
        : "No human-visible automatic predicate fired.",
      goal.achieved
        ? `Objective already proven: ${goal.detail}.`
        : candidates.length
          ? `Top candidates: ${candidates.map((move) => `${move.san} [${move.category}: ${move.reasons.join(", ")}]`).join("; ")}.`
          : "No legal candidate was generated."
    ];
    return {
      type: "policy_preview",
      status: goal.achieved ? "proven" : candidates.length ? "searching" : "refutedWithinPolicy",
      policy,
      snapshot,
      observations: visible,
      candidates,
      steps,
      log: steps.join(" / ")
    };
  }

  return {
    state,
    policy,
    reset,
    start,
    step,
    inspect,
    observe: observeCurrent,
    preview
  };
}

export function runOnePass({ createGame, game, policy, maxCandidates = 8 } = {}) {
  if (!game) {
    return {
      type: "policy_preview",
      status: "error",
      observations: [],
      candidates: [],
      steps: ["No ScratchChess game was provided."],
      log: "Policy preview failed: no game."
    };
  }
  const reasoner = createReasoner({ createGame, policy });
  return reasoner.preview(game, { maxCandidates });
}

export function describeAlgorithm(policy = FALLBACK_POLICY) {
  assertPolicy(policy);
  const ownRule = policy.rules.find((rule) => rule.id === "answer-threat-to-own-loose-piece");
  const enemyRule = policy.rules.find((rule) => rule.id === "attack-defender-of-enemy-loose-piece");
  return [
    `${policy.name} (${policy.version})`,
    "",
    `1. Observe predicates and both threat sets at every node.`,
    `2. Rank threats: ${policy.threatRanking.order.join(" > ")}; compound threats sit immediately above their strongest component.`,
    `3. Search at most ${policy.budget.maxPlies} plies. Our nodes are EXISTS; opponent nodes are FORALL over ${policy.search.opponentReplies.replaceAll("_", " ")}.`,
    `4. Candidate order: ${policy.search.candidatePriority.join(" → ")}.`,
    `5. If our loose piece has a legal capture threat, consider: ${ownRule.considerFirst.join(", ")}.`,
    `6. That danger is answered only by: ${ownRule.mustAchieveOneBeforeOpponentCanExecuteThreat.join(", ")}.`,
    `7. Against an enemy loose piece, consider: ${enemyRule.consider.join(", ")}.`,
    `8. Stop on: ${policy.search.stop.join(", ")}.`,
    "9. A single opponent reply without a proven continuation refutes that candidate within this policy; a depth leaf remains explicitly unresolved."
  ].join("\n");
}

export function predicateCatalog() {
  return PREDICATE_CATALOG.map((item) => ({ ...item }));
}

export const ALGO = Object.freeze({
  version: "1.0.0",
  policyVersion: POLICY_VERSION,
  policyUrl: DEFAULT_POLICY_URL,
  predicates: PREDICATE_CATALOG,
  options: POLICY_OPTIONS
});

export const describe = describeAlgorithm;
export default ALGO;

if (typeof window !== "undefined") {
  window.ALGO = ALGO;
  window.ALGO_MODULE = {
    ALGO,
    DEFAULT_POLICY_URL,
    FALLBACK_POLICY,
    POLICY_OPTIONS,
    PREDICATE_CATALOG,
    validatePolicy,
    assertPolicy,
    loadPolicy,
    inspectPosition,
    observe,
    humanVisibleObservations,
    makeManualObservation,
    createReasoner,
    runOnePass,
    describeAlgorithm,
    predicateCatalog
  };
  window.algo = window.ALGO_MODULE;
}
