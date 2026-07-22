/*
 * algo.js
 *
 * THREATS-FIRST HUMAN TACTICAL STATE MACHINE
 * ===========================================
 *
 * ScratchChess owns legality, SAN, FEN transitions, and the variation tree.
 * This module follows a deliberately human routine:
 *
 *   observe both sides' immediate threats -> answer check or mate danger ->
 *   try our threats from most forcing to least forcing -> inspect the
 *   defender's most forcing answers -> rescan after every ply -> use quiet
 *   position rules only after every first-order try has been stopped.
 *
 * The internal search stores continuations so the worksheet can explain each
 * branch, but the policy and visible trace use ordinary chess language.
 */

export const DEFAULT_POLICY_URL = "https://priyomes.com/policy.json";
export const POLICY_VERSION = "tactics-policy/v3";

const FILES = "abcdefgh";
const COLORS = Object.freeze(["w", "b"]);
const PROMOTIONS = Object.freeze(["q", "r", "b", "n"]);
const PIECE_VALUES = Object.freeze({ p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 });

const THREAT_KIND_TO_POLICY = Object.freeze({
  mate: "mate",
  stop_mate_in_1: "stop_their_mate_in_one",
  check: "check",
  mate_in_1: "threaten_mate_in_one",
  winning_capture: "take_material",
  fork: "double_attack",
  capture_recapture_fork: "double_attack",
  harass_defender: "quiet_idea",
  pin: "quiet_idea",
  mobility_trap: "quiet_idea",
  root_repair: "repair_once"
});

export const POLICY_OPTIONS = Object.freeze({
  settlement: Object.freeze(["after_defender_reply", "after_opponent_reply"]),
  threatKinds: Object.freeze([
    "mate",
    "stop_their_mate_in_one",
    "check",
    "threaten_mate_in_one",
    "take_material",
    "double_attack"
  ]),
  checkOrder: Object.freeze([
    "mate",
    "one_legal_reply",
    "check_and_take_queen",
    "fewest_legal_replies",
    "check_and_take_rook",
    "largest_capture",
    "move_name"
  ]),
  defenderReplyOrder: Object.freeze([
    "mate",
    "check",
    "create_mate_in_one",
    "stop_the_threat",
    "counterattack_same_or_more",
    "other_legal_answer"
  ]),
  predicateIds: Object.freeze([
    "mate",
    "mate_in_1_available",
    "check_available",
    "mate_threat_available",
    "opponent_mate_in_1",
    "in_check",
    "losing_material",
    "material_needed",
    "quiet",
    "loose",
    "defends",
    "shared_defender",
    "winning_capture_available",
    "fork_available",
    "harass_defender",
    "capture_recapture_fork",
    "forcing_counterthreat"
  ]),
  ruleIds: Object.freeze(["answer-check", "loose-piece"]),
  generators: Object.freeze([
    "answer_check_and_create_threat",
    "attack_the_defender",
    "capture_then_double_attack",
    "capture_then_rescan",
    "take_the_loose_piece"
  ])
});

export const PREDICATE_CATALOG = Object.freeze([
  { name: "mate", signature: "mate(winner)", description: "The side to move has no legal answer to check.", humanVisible: true },
  { name: "mate_in_1_available", signature: "mate_in_1_available(side, moves)", description: "A legal move mates now.", humanVisible: true },
  { name: "check_available", signature: "check_available(move, legal_answers, extra_target)", description: "A legal move gives check; legal answers and any extra attacked piece are recorded.", humanVisible: true },
  { name: "mate_threat_available", signature: "mate_threat_available(move, mating_moves)", description: "A legal move threatens mate on the next move.", humanVisible: true },
  { name: "opponent_mate_in_1", signature: "opponent_mate_in_1(side, moves)", description: "The other side would have a mating move if allowed to move now.", humanVisible: true },
  { name: "in_check", signature: "in_check(side)", description: "The side to move is in check.", humanVisible: true },
  { name: "losing_material", signature: "losing_material(side, deficit)", description: "The fighting side is behind and must recover the deficit before a material line can win.", humanVisible: true },
  { name: "material_needed", signature: "material_needed(side, pawns)", description: "The fighting side has not yet reached the configured material objective.", humanVisible: true },
  { name: "quiet", signature: "quiet(side)", description: "Every enabled first-order try has been stopped, so position rules may be tried.", humanVisible: true },
  { name: "loose", signature: "loose(piece)", description: "A non-king is attacked and has no pawn defender.", humanVisible: true },
  { name: "hanging", signature: "hanging(piece)", description: "A loose piece has more attackers than defenders.", humanVisible: true },
  { name: "attacks", signature: "attacks(attacker, target)", description: "A piece attacks an occupied target square.", humanVisible: false },
  { name: "defends", signature: "defends(defender, target)", description: "A friendly piece attacks an occupied target square.", humanVisible: false },
  { name: "shared_defender", signature: "shared_defender(defender, loose_targets)", description: "One piece defends two or more loose pieces.", humanVisible: true },
  { name: "winning_capture_available", signature: "winning_capture_available(move, target)", description: "A legal capture reaches the material objective after immediate recapture choices.", humanVisible: true },
  { name: "fork_available", signature: "fork_available(move, targets)", description: "A legal move creates an objective-relevant double attack.", humanVisible: true },
  { name: "harass_defender", signature: "harass_defender(attacker, defender, loose_targets)", description: "A move attacks the defender of loose pieces; ignoring it loses enough material.", humanVisible: true },
  { name: "capture_recapture_fork", signature: "capture_recapture_fork(capture, recapture, fork)", description: "A loose-piece capture invites a recapture that permits a double attack.", humanVisible: true },
  { name: "forcing_counterthreat", signature: "forcing_counterthreat(reply, kind)", description: "A reply mates, checks, creates mate in one, or counterattacks for enough value.", humanVisible: true },
  { name: "pin", signature: "pin(piece, king)", description: "A piece is absolutely pinned to its king.", humanVisible: true },
  { name: "mobility_trap", signature: "mobility_trap(piece)", description: "An attacked non-pawn, non-king has no legal move of its own.", humanVisible: true },
  { name: "align", signature: "align(a, b, line)", description: "Manual alignment observation.", humanVisible: true, manual: true },
  { name: "goal", signature: "goal(x)", description: "Manual tactical objective.", humanVisible: true, manual: true },
  { name: "threat", signature: "threat(x)", description: "Manual forcing-threat observation.", humanVisible: true, manual: true },
  { name: "focal_square", signature: "focal_square(square)", description: "Manual focal square.", humanVisible: true, manual: true }
]);

export const MANUAL_OBSERVATION_PREDICATES = Object.freeze(
  PREDICATE_CATALOG.filter((item) => item.manual).map((item) => item.name)
);

export const HUMAN_VISIBLE_PREDICATES = Object.freeze(
  PREDICATE_CATALOG.filter((item) => item.humanVisible).map((item) => item.name)
);

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

function exactKeys(value, path, keys, errors) {
  if (!isObject(value)) {
    errors.push(`${path}: must be an object`);
    return false;
  }
  const allowed = new Set(keys);
  for (const key of Object.keys(value)) if (!allowed.has(key)) errors.push(`${path}.${key}: is not allowed`);
  for (const key of keys) if (!(key in value)) errors.push(`${path}.${key}: is required`);
  return true;
}

function enumValue(value, path, allowed, errors) {
  if (!allowed.includes(value)) errors.push(`${path}: unsupported value ${JSON.stringify(value)}`);
}

function enumArray(value, path, allowed, errors, { min = 1, unique = true } = {}) {
  if (!Array.isArray(value)) {
    errors.push(`${path}: must be an array`);
    return;
  }
  if (value.length < min) errors.push(`${path}: must contain at least ${min} item(s)`);
  if (unique && new Set(value).size !== value.length) errors.push(`${path}: must contain unique items`);
  for (const item of value) enumValue(item, path, allowed, errors);
}

export const FALLBACK_POLICY = deepFreeze({
  "version": "tactics-policy/v3",
  "name": "threats-first-human-state-machine",
  "objective": {
    "fightingSide": "side_to_move_at_start",
    "defendingSide": "other_side",
    "startingMaterialState": "auto",
    "anyOf": [
      {
        "type": "mate"
      },
      {
        "type": "material",
        "minimumAdvantagePawns": 2,
        "settlement": "after_defender_reply"
      }
    ]
  },
  "budget": {
    "maxPlies": 8,
    "maxMovesPerState": 12,
    "maxDefenderReplies": 64,
    "maxPositions": 5000
  },
  "stateMachine": {
    "start": "observe",
    "afterEveryPly": "observe",
    "states": [
      {
        "id": "observe",
        "instruction": "Write down the material state, whether either king is in check, and the immediate threats available to both sides.",
        "next": "answer_danger"
      },
      {
        "id": "answer_danger",
        "instruction": "If our king is in check, answer it. If they have mate in one, mate now or play a forcing move that removes every mate in one.",
        "next": "try_threats"
      },
      {
        "id": "try_threats",
        "instruction": "Try our moves in the configured threat order. Finish one threat class before entering the quiet rules.",
        "next": "test_defender"
      },
      {
        "id": "test_defender",
        "instruction": "The defender tries mate, checks, direct answers to our threat, and counterattacks that meet or beat our payoff. Explore those replies in that order.",
        "next": "observe"
      },
      {
        "id": "quiet",
        "instruction": "After every enabled first-order threat has been tried and stopped, use a position rule such as attacking the defender of a loose piece.",
        "next": "test_defender"
      },
      {
        "id": "repair_once",
        "instruction": "If an otherwise strong root line fails only because of one forcing reply, try one root move that makes that reply illegal and still creates a named threat.",
        "next": "observe"
      }
    ]
  },
  "threats": {
    "priority": [
      "mate",
      "stop_their_mate_in_one",
      "check",
      "threaten_mate_in_one",
      "take_material",
      "double_attack"
    ],
    "look": {
      "mate": {
        "throughPly": 8,
        "maxMoves": 8,
        "when": "always"
      },
      "stop_their_mate_in_one": {
        "throughPly": 8,
        "maxMoves": 8,
        "when": "only when the defending side has mate in one"
      },
      "check": {
        "throughPly": 8,
        "maxMoves": 10,
        "when": "unless our king is already mated; while in check, keep only legal check answers"
      },
      "threaten_mate_in_one": {
        "throughPly": 6,
        "maxMoves": 6,
        "when": "when mate now is unavailable and the configured ply limit has not been reached"
      },
      "take_material": {
        "throughPly": 8,
        "maxMoves": 8,
        "when": "when the capture reaches the material objective after the defender's immediate recaptures"
      },
      "double_attack": {
        "throughPly": 8,
        "maxMoves": 8,
        "when": "when the smaller target is valuable enough to reach the material objective"
      }
    },
    "checkOrder": [
      "mate",
      "one_legal_reply",
      "check_and_take_queen",
      "fewest_legal_replies",
      "check_and_take_rook",
      "largest_capture",
      "move_name"
    ],
    "defenderReplyOrder": [
      "mate",
      "check",
      "create_mate_in_one",
      "stop_the_threat",
      "counterattack_same_or_more",
      "other_legal_answer"
    ],
    "quietWhen": "No enabled mate, check, mate-in-one threat, objective-winning capture, or objective-relevant double attack survives its defender test."
  },
  "cycles": {
    "perpetualCheck": {
      "enabled": true,
      "throughPly": 8,
      "repetitions": 3,
      "lookBackPlies": 12,
      "result": "defending_side_holds"
    }
  },
  "repair": {
    "enabled": true,
    "attempts": 1,
    "scope": "root",
    "trigger": "one_forcing_reply_is_the_only_reason_a_material_win_fails",
    "moveMust": [
      "make_that_reply_illegal_on_the_repaired_branch",
      "create_mate_check_mate_in_one_material_win_or_double_attack"
    ],
    "maxMoves": 6
  },
  "predicates": [
    {
      "id": "mate",
      "source": "position",
      "definition": "The side to move has no legal answer to check."
    },
    {
      "id": "mate_in_1_available",
      "source": "legal_moves",
      "definition": "A legal move mates now."
    },
    {
      "id": "check_available",
      "source": "legal_moves",
      "definition": "A legal move gives check; record how many legal answers it allows and what else it attacks."
    },
    {
      "id": "mate_threat_available",
      "source": "legal_moves",
      "definition": "A legal move threatens mate on the next move."
    },
    {
      "id": "opponent_mate_in_1",
      "source": "position",
      "definition": "If the other side could move now, it has a mating move."
    },
    {
      "id": "in_check",
      "source": "position",
      "definition": "The side to move is in check."
    },
    {
      "id": "losing_material",
      "source": "position",
      "definition": "The fighting side is behind in material, so a material line must recover the deficit and still reach the objective."
    },
    {
      "id": "material_needed",
      "source": "position",
      "definition": "The fighting side has not yet reached the configured material objective."
    },
    {
      "id": "quiet",
      "source": "threat_scan",
      "definition": "Every enabled first-order threat has been tried and stopped; position rules may now be tried."
    },
    {
      "id": "loose",
      "source": "position",
      "definition": "A non-king is attacked and has no pawn defender."
    },
    {
      "id": "defends",
      "source": "position",
      "definition": "A friendly piece attacks the occupied target square."
    },
    {
      "id": "shared_defender",
      "source": "position",
      "definition": "One piece defends two or more loose pieces."
    },
    {
      "id": "winning_capture_available",
      "source": "legal_moves",
      "definition": "A legal capture reaches the material objective after the defender's immediate recapture choices."
    },
    {
      "id": "fork_available",
      "source": "legal_moves",
      "definition": "A legal move attacks the king and a valuable piece, or two valuable pieces, with enough payoff to reach the objective."
    },
    {
      "id": "harass_defender",
      "source": "one_ply_result",
      "definition": "A legal move attacks a defender of one or more loose pieces; ignoring it loses enough material to meet the objective."
    },
    {
      "id": "capture_recapture_fork",
      "source": "legal_move_sequence",
      "definition": "Capture a loose piece; an immediate recapture permits a double attack."
    },
    {
      "id": "forcing_counterthreat",
      "source": "defender_reply",
      "definition": "A defender reply mates, checks, creates mate in one, or counterattacks for at least the value of the active threat."
    }
  ],
  "rules": [
    {
      "id": "answer-check",
      "when": {
        "all": [
          {
            "predicate": "in_check",
            "side": "us"
          }
        ]
      },
      "instruction": "Answer the check and prefer the answer that creates the highest-ranked threat.",
      "try": [
        "answer_check_and_create_threat"
      ]
    },
    {
      "id": "loose-piece",
      "when": {
        "all": [
          {
            "predicate": "quiet",
            "side": "us"
          },
          {
            "predicate": "loose",
            "side": "enemy"
          }
        ]
      },
      "instruction": "Name the loose piece and its defender. Try attacking the defender, then capture-recapture-double-attack ideas, then a direct capture.",
      "try": [
        "attack_the_defender",
        "capture_then_double_attack",
        "capture_then_rescan",
        "take_the_loose_piece"
      ]
    }
  ],
  "outcomes": {
    "fightingSideWins": "At least one fighting move reaches the objective against every ranked defender answer.",
    "defendingSideHolds": "One ranked defender answer prevents the objective, or the configured perpetual cycle is reached.",
    "notEnoughInformation": "The depth, move, position, or rule budget ends before either result is established."
  }
});

export function validatePolicy(policy) {
  const errors = [];
  const topKeys = ["version", "name", "objective", "budget", "stateMachine", "threats", "cycles", "repair", "predicates", "rules", "outcomes"];
  if (!exactKeys(policy, "$", topKeys, errors)) return { valid: false, errors };

  if (policy.version !== POLICY_VERSION) errors.push(`$.version: must equal ${JSON.stringify(POLICY_VERSION)}`);
  if (typeof policy.name !== "string" || !/^[a-z0-9][a-z0-9-]*$/.test(policy.name)) errors.push("$.name: must be lowercase kebab-case");

  if (exactKeys(policy.objective, "$.objective", ["fightingSide", "defendingSide", "startingMaterialState", "anyOf"], errors)) {
    if (policy.objective.fightingSide !== "side_to_move_at_start") errors.push("$.objective.fightingSide: must be side_to_move_at_start");
    if (policy.objective.defendingSide !== "other_side") errors.push("$.objective.defendingSide: must be other_side");
    if (policy.objective.startingMaterialState !== "auto") errors.push("$.objective.startingMaterialState: must be auto");
    if (!Array.isArray(policy.objective.anyOf) || policy.objective.anyOf.length !== 2) {
      errors.push("$.objective.anyOf: must contain mate and material objectives");
    } else {
      const mate = policy.objective.anyOf.find((item) => item?.type === "mate");
      const material = policy.objective.anyOf.find((item) => item?.type === "material");
      if (!mate) errors.push("$.objective.anyOf: mate objective is required");
      if (!material) errors.push("$.objective.anyOf: material objective is required");
      if (material) {
        if (typeof material.minimumAdvantagePawns !== "number" || material.minimumAdvantagePawns < 0) errors.push("$.objective.anyOf.material.minimumAdvantagePawns: must be nonnegative");
        enumValue(material.settlement, "$.objective.anyOf.material.settlement", POLICY_OPTIONS.settlement, errors);
      }
    }
  }

  const budgetKeys = ["maxPlies", "maxMovesPerState", "maxDefenderReplies", "maxPositions"];
  if (exactKeys(policy.budget, "$.budget", budgetKeys, errors)) {
    for (const key of budgetKeys) if (!Number.isInteger(policy.budget[key]) || policy.budget[key] < 1) errors.push(`$.budget.${key}: must be a positive integer`);
  }

  if (exactKeys(policy.stateMachine, "$.stateMachine", ["start", "afterEveryPly", "states"], errors)) {
    if (policy.stateMachine.start !== "observe") errors.push("$.stateMachine.start: must be observe");
    if (policy.stateMachine.afterEveryPly !== "observe") errors.push("$.stateMachine.afterEveryPly: must be observe");
    if (!Array.isArray(policy.stateMachine.states) || !policy.stateMachine.states.length) {
      errors.push("$.stateMachine.states: must be a nonempty array");
    } else {
      const ids = new Set();
      policy.stateMachine.states.forEach((state, index) => {
        if (!exactKeys(state, `$.stateMachine.states[${index}]`, ["id", "instruction", "next"], errors)) return;
        if (typeof state.id !== "string" || !state.id) errors.push(`$.stateMachine.states[${index}].id: must be nonempty`);
        if (typeof state.instruction !== "string" || !state.instruction) errors.push(`$.stateMachine.states[${index}].instruction: must be nonempty`);
        if (typeof state.next !== "string" || !state.next) errors.push(`$.stateMachine.states[${index}].next: must be nonempty`);
        ids.add(state.id);
      });
      for (const id of ["observe", "answer_danger", "try_threats", "test_defender", "quiet", "repair_once"]) if (!ids.has(id)) errors.push(`$.stateMachine.states: missing ${id}`);
    }
  }

  if (exactKeys(policy.threats, "$.threats", ["priority", "look", "checkOrder", "defenderReplyOrder", "quietWhen"], errors)) {
    enumArray(policy.threats.priority, "$.threats.priority", POLICY_OPTIONS.threatKinds, errors);
    if (!isObject(policy.threats.look)) errors.push("$.threats.look: must be an object");
    else for (const kind of POLICY_OPTIONS.threatKinds) {
      const config = policy.threats.look[kind];
      if (!config) { errors.push(`$.threats.look.${kind}: is required`); continue; }
      if (!exactKeys(config, `$.threats.look.${kind}`, ["throughPly", "maxMoves", "when"], errors)) continue;
      for (const key of ["throughPly", "maxMoves"]) if (!Number.isInteger(config[key]) || config[key] < 0) errors.push(`$.threats.look.${kind}.${key}: must be a nonnegative integer`);
      if (typeof config.when !== "string" || !config.when) errors.push(`$.threats.look.${kind}.when: must be nonempty`);
    }
    enumArray(policy.threats.checkOrder, "$.threats.checkOrder", POLICY_OPTIONS.checkOrder, errors);
    enumArray(policy.threats.defenderReplyOrder, "$.threats.defenderReplyOrder", POLICY_OPTIONS.defenderReplyOrder, errors);
    if (typeof policy.threats.quietWhen !== "string" || !policy.threats.quietWhen) errors.push("$.threats.quietWhen: must be nonempty");
  }

  if (exactKeys(policy.cycles, "$.cycles", ["perpetualCheck"], errors)) {
    const cycle = policy.cycles.perpetualCheck;
    if (exactKeys(cycle, "$.cycles.perpetualCheck", ["enabled", "throughPly", "repetitions", "lookBackPlies", "result"], errors)) {
      if (typeof cycle.enabled !== "boolean") errors.push("$.cycles.perpetualCheck.enabled: must be boolean");
      for (const key of ["throughPly", "repetitions", "lookBackPlies"]) if (!Number.isInteger(cycle[key]) || cycle[key] < 1) errors.push(`$.cycles.perpetualCheck.${key}: must be a positive integer`);
      if (cycle.result !== "defending_side_holds") errors.push("$.cycles.perpetualCheck.result: must be defending_side_holds");
    }
  }

  if (exactKeys(policy.repair, "$.repair", ["enabled", "attempts", "scope", "trigger", "moveMust", "maxMoves"], errors)) {
    if (typeof policy.repair.enabled !== "boolean") errors.push("$.repair.enabled: must be boolean");
    if (!Number.isInteger(policy.repair.attempts) || policy.repair.attempts < 0) errors.push("$.repair.attempts: must be a nonnegative integer");
    if (policy.repair.scope !== "root") errors.push("$.repair.scope: must be root");
    if (typeof policy.repair.trigger !== "string" || !policy.repair.trigger) errors.push("$.repair.trigger: must be nonempty");
    if (!Array.isArray(policy.repair.moveMust) || !policy.repair.moveMust.length) errors.push("$.repair.moveMust: must be a nonempty array");
    if (!Number.isInteger(policy.repair.maxMoves) || policy.repair.maxMoves < 1) errors.push("$.repair.maxMoves: must be a positive integer");
  }

  if (!Array.isArray(policy.predicates) || !policy.predicates.length) errors.push("$.predicates: must be a nonempty array");
  else {
    const ids = [];
    policy.predicates.forEach((predicate, index) => {
      if (!exactKeys(predicate, `$.predicates[${index}]`, ["id", "source", "definition"], errors)) return;
      enumValue(predicate.id, `$.predicates[${index}].id`, POLICY_OPTIONS.predicateIds, errors);
      if (typeof predicate.source !== "string" || !predicate.source) errors.push(`$.predicates[${index}].source: must be nonempty`);
      if (typeof predicate.definition !== "string" || !predicate.definition) errors.push(`$.predicates[${index}].definition: must be nonempty`);
      ids.push(predicate.id);
    });
    if (new Set(ids).size !== ids.length) errors.push("$.predicates: ids must be unique");
  }

  if (!Array.isArray(policy.rules) || !policy.rules.length) errors.push("$.rules: must be a nonempty array");
  else {
    const ids = [];
    policy.rules.forEach((rule, index) => {
      if (!exactKeys(rule, `$.rules[${index}]`, ["id", "when", "instruction", "try"], errors)) return;
      enumValue(rule.id, `$.rules[${index}].id`, POLICY_OPTIONS.ruleIds, errors);
      ids.push(rule.id);
      if (!isObject(rule.when) || !Array.isArray(rule.when.all) || !rule.when.all.length) errors.push(`$.rules[${index}].when.all: must be a nonempty array`);
      if (typeof rule.instruction !== "string" || !rule.instruction) errors.push(`$.rules[${index}].instruction: must be nonempty`);
      enumArray(rule.try, `$.rules[${index}].try`, POLICY_OPTIONS.generators, errors);
    });
    if (new Set(ids).size !== ids.length) errors.push("$.rules: ids must be unique");
  }

  if (exactKeys(policy.outcomes, "$.outcomes", ["fightingSideWins", "defendingSideHolds", "notEnoughInformation"], errors)) {
    for (const key of ["fightingSideWins", "defendingSideHolds", "notEnoughInformation"]) if (typeof policy.outcomes[key] !== "string" || !policy.outcomes[key]) errors.push(`$.outcomes.${key}: must be nonempty`);
  }

  return { valid: errors.length === 0, errors };
}

export function assertPolicy(policy) {
  const validation = validatePolicy(policy);
  if (!validation.valid) {
    const error = new Error(`Invalid tactics policy:\n${validation.errors.map((item) => `- ${item}`).join("\n")}`);
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
      warning: `Could not load ${url}; using the embedded v3 policy. ${error?.message || error}`
    };
  }
}

/* -------------------------------------------------------------------------- */
/* Board and ScratchChess helpers                                              */
/* -------------------------------------------------------------------------- */

const idx = (file, rank) => (7 - rank) * 8 + file;
const FR = (index) => [index % 8, 7 - Math.floor(index / 8)];
const inBounds = (file, rank) => file >= 0 && file < 8 && rank >= 0 && rank < 8;
const other = (color) => (color === "w" ? "b" : "w");
const normalizeColor = (color) => (color === "b" ? "b" : "w");
const roleFor = (color, rootSide) => (color === rootSide ? "us" : "enemy");

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

function samePieceOn(game, ref) {
  if (!ref || ref.index == null) return false;
  const piece = boardOf(game)[ref.index];
  return Boolean(piece && piece.color === ref.color && piece.type === ref.type);
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
  for (const observation of observations || []) {
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
  const output = [];
  for (let from = 0; from < 64; from += 1) {
    const piece = board[from];
    if (!piece || piece.color !== byColor) continue;
    if (!attacksSquare(board, from, targetIndex)) continue;
    output.push({
      index: from,
      square: squareName(from),
      piece,
      label: pieceLabel(piece, from),
      ref: pieceRef(piece, from)
    });
  }
  return output;
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
  return cloneGame(createGame, fenWithSide(game.exportFEN(), side));
}

function normalizePromotion(raw) {
  return String(raw || "").toLowerCase().replace(/[^qrbn]/g, "").slice(0, 1);
}

function moveNeedsPromotion(game, from, to) {
  const piece = boardOf(game)[from];
  if (!piece || piece.type !== "p") return false;
  const [, rank] = FR(to);
  return (piece.color === "w" && rank === 7) || (piece.color === "b" && rank === 0);
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
  if (!applyMoveUCI(clone, typeof move === "string" ? move : move.uci)) return null;
  return clone;
}

function sanAfterMove(createGame, game, move) {
  const after = afterMove(createGame, game, move);
  return after ? String(after.curNode?.san || move.uci).trim() : move.uci;
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

function materialObjective(policy) {
  return policy.objective.anyOf.find((item) => item.type === "material");
}

function materialTarget(policy) {
  return Number(materialObjective(policy)?.minimumAdvantagePawns ?? Infinity);
}

function terminalInfo(createGame, game) {
  const side = normalizeColor(game?.state?.side);
  const legal = legalMoveRecords(createGame, game, side);
  if (legal.length) return null;
  if (safeInCheck(game, side)) return { kind: "mate", winner: other(side), loser: side };
  return { kind: "stalemate", winner: null, loser: null };
}

function locateMovedRef(ref, reply) {
  if (!ref) return null;
  if (reply?.from === ref.index) return { ...ref, index: reply.to, square: squareName(reply.to) };
  return ref;
}

function moveByUci(moves, uci) {
  return (moves || []).find((move) => move.uci === uci) || null;
}

function policyThreatKind(kind) {
  return THREAT_KIND_TO_POLICY[kind] || kind;
}

function threatPriorityScore(kind, policy) {
  const policyKind = policyThreatKind(kind);
  const index = policy.threats.priority.indexOf(policyKind);
  return index < 0 ? 0 : policy.threats.priority.length - index;
}

function threatLook(policy, kind) {
  return policy.threats.look?.[policyThreatKind(kind)] || { throughPly: -1, maxMoves: 0 };
}

function threatEnabledAtDepth(policy, kind, depth) {
  return Number(depth) <= Number(threatLook(policy, kind).throughPly ?? -1);
}

function maxMovesForThreat(policy, kind) {
  return Math.max(0, Number(threatLook(policy, kind).maxMoves ?? 0));
}

function maxMovesPerState(policy) {
  return Math.max(1, Number(policy.budget.maxMovesPerState || 1));
}

function maxDefenderReplies(policy) {
  return Math.max(1, Number(policy.budget.maxDefenderReplies || 1));
}

function result(status, reason, extra = {}) {
  return { status, reason, ...extra };
}

/* -------------------------------------------------------------------------- */
/* Position predicates                                                         */
/* -------------------------------------------------------------------------- */

function observePins(game, rootSide) {
  const board = boardOf(game);
  const observations = [];
  const directions = [
    [1, 0], [-1, 0], [0, 1], [0, -1],
    [1, 1], [1, -1], [-1, 1], [-1, -1]
  ];

  const sliderMatches = (piece, df, dr) => {
    if (!piece) return false;
    const diagonal = Math.abs(df) === 1 && Math.abs(dr) === 1;
    const orthogonal = Math.abs(df) + Math.abs(dr) === 1;
    if (diagonal) return piece.type === "b" || piece.type === "q";
    if (orthogonal) return piece.type === "r" || piece.type === "q";
    return false;
  };

  for (const color of COLORS) {
    const kingIndex = board.findIndex((piece) => piece && piece.color === color && piece.type === "k");
    if (kingIndex < 0) continue;
    const [kingFile, kingRank] = FR(kingIndex);

    for (const [df, dr] of directions) {
      let file = kingFile + df;
      let rank = kingRank + dr;
      let candidate = null;
      while (inBounds(file, rank)) {
        const current = idx(file, rank);
        const piece = board[current];
        if (!piece) {
          file += df;
          rank += dr;
          continue;
        }
        if (!candidate) {
          if (piece.color === color && piece.type !== "k") {
            candidate = { index: current, piece };
            file += df;
            rank += dr;
            continue;
          }
          break;
        }
        if (piece.color !== color && sliderMatches(piece, df, dr)) {
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
              detail: `pinned by ${pieceLabel(piece, current)}`
            }
          ));
        }
        break;
      }
    }
  }
  return observations;
}

function relationSnapshot(game, rootSide) {
  const board = boardOf(game);
  const observations = [];
  const relations = new Map();
  const loose = [];
  const hanging = [];

  for (let target = 0; target < 64; target += 1) {
    const piece = board[target];
    if (!piece) continue;
    const attackers = attackersOf(game, target, other(piece.color));
    const defenders = attackersOf(game, target, piece.color).filter((item) => item.index !== target);
    const pawnDefenders = defenders.filter((item) => item.piece.type === "p");
    const relation = { target, piece, attackers, defenders, pawnDefenders };
    relations.set(target, relation);

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
          args: { attacker: attacker.ref, target: pieceRef(piece, target) }
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
          args: { defender: defender.ref, target: pieceRef(piece, target) }
        }
      ));
    }

    // Human policy definition: attacked + no pawn defender. The number of
    // piece defenders is recorded, but does not prevent the loose predicate.
    if (piece.type !== "k" && attackers.length > 0 && pawnDefenders.length === 0) {
      const observation = makeObservation("loose", `loose(${pieceLabel(piece, target)})`, {
        square: squareName(target),
        side: roleFor(piece.color, rootSide),
        pieceColor: piece.color,
        pieceIndex: target,
        pieceRef: pieceRef(piece, target),
        attackers,
        defenders,
        detail: `attackers=${attackers.length}, defenders=${defenders.length}, pawn_defenders=0`
      });
      observations.push(observation);
      loose.push(observation);

      if (attackers.length > defenders.length) {
        const hangingObservation = makeObservation("hanging", `hanging(${pieceLabel(piece, target)})`, {
          square: squareName(target),
          side: roleFor(piece.color, rootSide),
          pieceColor: piece.color,
          pieceIndex: target,
          pieceRef: pieceRef(piece, target),
          attackers,
          defenders,
          detail: `attackers=${attackers.length}, defenders=${defenders.length}`
        });
        observations.push(hangingObservation);
        hanging.push(hangingObservation);
      }
    }
  }

  const looseByColor = {
    w: loose.filter((item) => item.pieceColor === "w"),
    b: loose.filter((item) => item.pieceColor === "b")
  };

  const defenderGroups = new Map();
  for (const target of loose) {
    const relation = relations.get(target.pieceIndex);
    for (const defender of relation?.defenders || []) {
      const key = `${defender.piece.color}${defender.piece.type}@${defender.index}`;
      if (!defenderGroups.has(key)) {
        defenderGroups.set(key, { defender, targets: [] });
      }
      defenderGroups.get(key).targets.push(target);
    }
  }

  const sharedDefenders = [];
  for (const group of defenderGroups.values()) {
    if (group.targets.length < 2) continue;
    const targetText = group.targets.map((target) => target.pieceRef.label).join(",");
    const observation = makeObservation(
      "shared_defender",
      `shared_defender(${group.defender.label},[${targetText}])`,
      {
        square: group.defender.square,
        side: roleFor(group.defender.piece.color, rootSide),
        defenderRef: group.defender.ref,
        targetRefs: group.targets.map((target) => target.pieceRef),
        targetIndices: group.targets.map((target) => target.pieceIndex),
        detail: `defends ${group.targets.length} loose pieces`
      }
    );
    observations.push(observation);
    sharedDefenders.push(observation);
  }

  return {
    relations,
    loose,
    hanging,
    looseByColor,
    defenderGroups,
    sharedDefenders,
    observations
  };
}

function immediateRecaptures(createGame, afterCaptureGame, captureSquare) {
  return legalMoveRecords(createGame, afterCaptureGame, afterCaptureGame.state.side)
    .filter((move) => move.to === captureSquare && Boolean(move.captured));
}

function captureFact(createGame, game, move, rootSide, policy) {
  if (!move?.captured) return null;
  const after = afterMove(createGame, game, move);
  if (!after) return null;
  const afterAdvantage = materialAdvantage(after, rootSide);
  const recaptures = immediateRecaptures(createGame, after, move.to);
  let worstAfterRecapture = afterAdvantage;
  const recaptureResults = [];
  for (const recapture of recaptures) {
    const afterRecapture = afterMove(createGame, after, recapture);
    if (!afterRecapture) continue;
    const advantage = materialAdvantage(afterRecapture, rootSide);
    worstAfterRecapture = Math.min(worstAfterRecapture, advantage);
    recaptureResults.push({
      uci: recapture.uci,
      san: sanAfterMove(createGame, after, recapture),
      advantage
    });
  }
  return {
    move,
    uci: move.uci,
    san: sanAfterMove(createGame, game, move),
    targetRef: pieceRef(move.captured, move.to),
    attackerRef: pieceRef(move.mover, move.from),
    captureSquare: move.to,
    afterFen: after.exportFEN(),
    afterAdvantage,
    worstAfterRecapture,
    recaptures: recaptureResults,
    stable: afterAdvantage >= materialTarget(policy) && worstAfterRecapture >= materialTarget(policy),
    payoffPawns: PIECE_VALUES[move.captured.type] || 0
  };
}

function winningCaptureFactsForSide(createGame, game, side, rootSide, policy) {
  const analysisGame = side === game.state.side ? game : gameForSide(createGame, game, side);
  const facts = [];
  for (const move of legalMoveRecords(createGame, analysisGame, side)) {
    if (!move.captured) continue;
    const fact = captureFact(createGame, analysisGame, move, rootSide, policy);
    if (fact?.stable) facts.push(fact);
  }
  facts.sort((a, b) => b.payoffPawns - a.payoffPawns || a.san.localeCompare(b.san));
  return facts;
}

function attackedEnemyPieces(game, from, color) {
  const board = boardOf(game);
  const output = [];
  for (let target = 0; target < 64; target += 1) {
    const piece = board[target];
    if (!piece || piece.color === color || piece.type === "k") continue;
    if (!attacksSquare(board, from, target)) continue;
    output.push(pieceRef(piece, target));
  }
  return output.sort((a, b) => b.value - a.value || a.square.localeCompare(b.square));
}

function forkFactsForSide(createGame, game, side, rootSide, policy) {
  const analysisGame = side === game.state.side ? game : gameForSide(createGame, game, side);
  const currentAdvantage = materialAdvantage(analysisGame, rootSide);
  const output = [];

  for (const move of legalMoveRecords(createGame, analysisGame, side)) {
    const after = afterMove(createGame, analysisGame, move);
    if (!after) continue;
    const movedPiece = boardOf(after)[move.to];
    if (!movedPiece || movedPiece.color !== side) continue;
    const check = safeInCheck(after, other(side));
    const targets = attackedEnemyPieces(after, move.to, side);
    if (!targets.length) continue;

    let payoffPawns = 0;
    if (check) payoffPawns = targets[0].value;
    else if (targets.length >= 2) payoffPawns = Math.min(targets[0].value, targets[1].value);
    else continue;

    if (currentAdvantage + payoffPawns < materialTarget(policy)) continue;
    output.push({
      move,
      uci: move.uci,
      san: sanAfterMove(createGame, analysisGame, move),
      afterFen: after.exportFEN(),
      forkerRef: pieceRef(movedPiece, move.to),
      targets,
      check,
      payoffPawns,
      resultPredicate: makeObservation(
        "fork_available",
        `fork_available(${move.uci},[${targets.map((target) => target.label).join(",")}])`,
        {
          side: roleFor(side, rootSide),
          from: squareName(move.from),
          to: squareName(move.to),
          square: squareName(move.to),
          moveUci: move.uci,
          targetRefs: targets,
          detail: `${check ? "check fork" : "fork"}; payoff=${payoffPawns}`
        }
      )
    });
  }

  output.sort((a, b) => Number(b.check) - Number(a.check) || b.payoffPawns - a.payoffPawns || a.san.localeCompare(b.san));
  return output;
}

function mateInOneFactsForSide(createGame, game, side) {
  const analysisGame = side === game.state.side ? game : gameForSide(createGame, game, side);
  const output = [];
  for (const move of legalMoveRecords(createGame, analysisGame, side)) {
    const after = afterMove(createGame, analysisGame, move);
    if (!after) continue;
    const terminal = terminalInfo(createGame, after);
    if (terminal?.kind === "mate" && terminal.winner === side) {
      output.push({ move, uci: move.uci, san: String(after.curNode?.san || move.uci).trim(), afterFen: after.exportFEN() });
    }
  }
  return output;
}

function checkFactMetric(fact, criterion) {
  if (criterion === "mate") return fact.mate ? 1 : 0;
  if (criterion === "one_legal_reply") return fact.replyCount === 1 ? 1 : 0;
  if (criterion === "check_and_take_queen") return fact.extraTargets.some((target) => target.type === "q") ? 1 : 0;
  if (criterion === "fewest_legal_replies") return -fact.replyCount;
  if (criterion === "check_and_take_rook") return fact.extraTargets.some((target) => target.type === "r") ? 1 : 0;
  if (criterion === "largest_capture") return fact.captureValue;
  return 0;
}

function compareCheckFacts(a, b, policy) {
  for (const criterion of policy.threats.checkOrder || []) {
    if (criterion === "move_name") continue;
    const difference = checkFactMetric(b, criterion) - checkFactMetric(a, criterion);
    if (difference) return difference;
  }
  return a.san.localeCompare(b.san);
}

function checkingMoveFactsForSide(createGame, game, side, rootSide, policy) {
  const analysisGame = side === game.state.side ? game : gameForSide(createGame, game, side);
  const output = [];
  for (const move of legalMoveRecords(createGame, analysisGame, side)) {
    const after = afterMove(createGame, analysisGame, move);
    if (!after || !safeInCheck(after, other(side))) continue;
    const terminal = terminalInfo(createGame, after);
    const movedPiece = boardOf(after)[move.to];
    const extraTargets = movedPiece && movedPiece.color === side
      ? attackedEnemyPieces(after, move.to, side)
      : [];
    const legalReplies = terminal?.kind === "mate" ? [] : legalMoveRecords(createGame, after, other(side));
    const captureValue = PIECE_VALUES[move.captured?.type] || 0;
    const extraTargetValue = extraTargets[0]?.value || 0;
    const san = String(after.curNode?.san || move.uci).trim();
    output.push({
      move,
      uci: move.uci,
      san,
      afterFen: after.exportFEN(),
      mate: terminal?.kind === "mate" && terminal.winner === side,
      replyCount: legalReplies.length,
      legalReplyUcis: legalReplies.map((reply) => reply.uci),
      checkerRef: movedPiece ? pieceRef(movedPiece, move.to) : null,
      extraTargets,
      captureValue,
      payoffPawns: Math.max(captureValue, extraTargetValue),
      resultPredicate: makeObservation(
        "check_available",
        `check_available(${san},${legalReplies.length},${extraTargets[0]?.label || "none"})`,
        {
          side: roleFor(side, rootSide),
          from: squareName(move.from),
          to: squareName(move.to),
          square: squareName(move.to),
          moveUci: move.uci,
          targetRefs: extraTargets,
          detail: `${legalReplies.length} legal answer(s)${extraTargets.length ? `; also attacks ${extraTargets.map((target) => target.label).join(", ")}` : ""}`
        }
      )
    });
  }
  return output.sort((a, b) => compareCheckFacts(a, b, policy));
}

function mateThreatFactsForSide(createGame, game, side, rootSide) {
  const analysisGame = side === game.state.side ? game : gameForSide(createGame, game, side);
  const output = [];
  for (const move of legalMoveRecords(createGame, analysisGame, side)) {
    const after = afterMove(createGame, analysisGame, move);
    if (!after || terminalInfo(createGame, after)) continue;
    const mates = mateInOneFactsForSide(createGame, after, side);
    if (!mates.length) continue;
    const san = String(after.curNode?.san || move.uci).trim();
    output.push({
      move,
      uci: move.uci,
      san,
      afterFen: after.exportFEN(),
      mates,
      payoffPawns: 100,
      resultPredicate: makeObservation(
        "mate_threat_available",
        `mate_threat_available(${san},[${mates.map((mate) => mate.san).join(",")}])`,
        {
          side: roleFor(side, rootSide),
          from: squareName(move.from),
          to: squareName(move.to),
          square: squareName(move.to),
          moveUci: move.uci,
          detail: `threatens ${mates.map((mate) => mate.san).join(", ")}`
        }
      )
    });
  }
  output.sort((a, b) => b.mates.length - a.mates.length || a.san.localeCompare(b.san));
  return output;
}

function basePositionSnapshot({ createGame, game, rootSide, policy, includeMoveFacts = true }) {
  const root = normalizeColor(rootSide);
  const sideToMove = normalizeColor(game.state.side);
  const relation = relationSnapshot(game, root);
  const observations = [...relation.observations, ...observePins(game, root)];
  const terminal = terminalInfo(createGame, game);
  const inCheck = safeInCheck(game, sideToMove);
  const advantageUs = materialAdvantage(game, root);
  const target = materialTarget(policy);

  if (terminal?.kind === "mate") {
    observations.push(makeObservation("mate", `mate(${terminal.winner})`, {
      side: roleFor(terminal.winner, root), winner: terminal.winner, loser: terminal.loser,
      detail: `${terminal.loser} is checkmated`
    }));
  } else if (inCheck) {
    observations.push(makeObservation("in_check", `in_check(${sideToMove})`, {
      side: roleFor(sideToMove, root), checkedSide: sideToMove,
      detail: `${sideToMove} to move is in check`
    }));
  }

  if (advantageUs < 0) {
    observations.push(makeObservation(
      "losing_material", `losing_material(us,${Math.abs(advantageUs)})`,
      { side: "us", detail: `behind by ${Math.abs(advantageUs)} pawn unit(s); need ${target - advantageUs} to reach the objective` }
    ));
  }
  if (advantageUs < target) {
    observations.push(makeObservation(
      "material_needed", `material_needed(us,${target - advantageUs})`,
      { side: "us", detail: `need ${target - advantageUs} more pawn unit(s) to reach +${target}` }
    ));
  }

  const opponentMateInOneFacts = !terminal ? mateInOneFactsForSide(createGame, game, other(sideToMove)) : [];
  if (opponentMateInOneFacts.length) {
    observations.push(makeObservation(
      "opponent_mate_in_1",
      `opponent_mate_in_1(${other(sideToMove)},[${opponentMateInOneFacts.map((fact) => fact.san).join(",")}])`,
      { side: roleFor(other(sideToMove), root), detail: opponentMateInOneFacts.map((fact) => fact.san).join(", ") }
    ));
  }

  const snapshot = {
    fen: game.exportFEN(),
    positionKey: normalizedPositionKey(game.exportFEN()),
    rootSide: root,
    sideToMove,
    terminal,
    inCheck,
    material: {
      w: materialFor(game, "w"),
      b: materialFor(game, "b"),
      advantageUs,
      target,
      needed: Math.max(0, target - advantageUs),
      state: advantageUs < 0 ? "losing_material" : advantageUs < target ? "material_needed" : "objective_ready"
    },
    relations: relation.relations,
    loose: relation.loose,
    looseByColor: relation.looseByColor,
    sharedDefenders: relation.sharedDefenders,
    predicates: observations,
    legalMoves: legalMoveRecords(createGame, game, sideToMove),
    winningCaptures: [],
    forkFacts: [],
    mateInOneFacts: [],
    checkingMoves: [],
    mateThreats: [],
    opponentMateInOneFacts,
    _winningCaptureFactsComputed: false,
    _forkFactsComputed: false,
    _mateInOneFactsComputed: false,
    _checkingMovesComputed: false,
    _mateThreatsComputed: false
  };

  if (includeMoveFacts && !terminal) {
    snapshot.winningCaptures = winningCaptureFactsForSide(createGame, game, sideToMove, root, policy);
    snapshot.forkFacts = forkFactsForSide(createGame, game, sideToMove, root, policy);
    snapshot.mateInOneFacts = mateInOneFactsForSide(createGame, game, sideToMove);
    snapshot.checkingMoves = checkingMoveFactsForSide(createGame, game, sideToMove, root, policy);
    snapshot.mateThreats = mateThreatFactsForSide(createGame, game, sideToMove, root);
    snapshot._winningCaptureFactsComputed = true;
    snapshot._forkFactsComputed = true;
    snapshot._mateInOneFactsComputed = true;
    snapshot._checkingMovesComputed = true;
    snapshot._mateThreatsComputed = true;

    for (const fact of snapshot.winningCaptures) {
      observations.push(makeObservation(
        "winning_capture_available", `winning_capture_available(${fact.san},${fact.targetRef.label})`,
        { side: roleFor(sideToMove, root), from: squareName(fact.move.from), to: squareName(fact.move.to), square: squareName(fact.move.to), moveUci: fact.uci, detail: `after immediate recaptures the material score is at least ${fact.worstAfterRecapture}` }
      ));
    }
    for (const fact of snapshot.forkFacts) observations.push(fact.resultPredicate);
    for (const fact of snapshot.checkingMoves) observations.push(fact.resultPredicate);
    for (const fact of snapshot.mateThreats) observations.push(fact.resultPredicate);
    if (snapshot.mateInOneFacts.length) {
      observations.push(makeObservation(
        "mate_in_1_available", `mate_in_1_available(${sideToMove},[${snapshot.mateInOneFacts.map((fact) => fact.san).join(",")}])`,
        { side: roleFor(sideToMove, root), detail: snapshot.mateInOneFacts.map((fact) => fact.san).join(", ") }
      ));
    }
  }

  snapshot.predicates = dedupeObservations(observations);
  return snapshot;
}

export function inspectPosition({ createGame, game, rootSide = game?.state?.side, policy = FALLBACK_POLICY } = {}) {
  if (typeof createGame !== "function") throw new Error("inspectPosition requires createGame");
  if (!game) throw new Error("inspectPosition requires a ScratchChess game");
  assertPolicy(policy);
  return basePositionSnapshot({ createGame, game, rootSide, policy, includeMoveFacts: false });
}

export function observe(game, { createGame, rootSide = game?.state?.side, policy = FALLBACK_POLICY } = {}) {
  return inspectPosition({ createGame, game, rootSide, policy }).predicates;
}

export function humanVisibleObservations(observations) {
  const allowed = new Set(HUMAN_VISIBLE_PREDICATES);
  return (observations || []).filter((observation) => allowed.has(observation.predicate));
}

function goalStatus(snapshot, policy) {
  if (snapshot.terminal?.kind === "mate") {
    return snapshot.terminal.winner === snapshot.rootSide
      ? { achieved: true, type: "mate", detail: `${snapshot.rootSide} delivered mate` }
      : { achieved: false, terminalFailure: true, type: "mated", detail: `${snapshot.rootSide} is mated` };
  }
  if (snapshot.terminal?.kind === "stalemate") {
    return { achieved: false, terminalFailure: true, type: "stalemate", detail: "stalemate is not the objective" };
  }

  const objective = materialObjective(policy);
  const settleAfterReply = ["after_opponent_reply", "after_defender_reply"].includes(objective?.settlement);
  const settledTurn = !settleAfterReply || snapshot.sideToMove === snapshot.rootSide;
  if (settledTurn && !snapshot.inCheck && snapshot.material.advantageUs >= Number(objective?.minimumAdvantagePawns ?? Infinity)) {
    return {
      achieved: true,
      type: "material",
      advantage: snapshot.material.advantageUs,
      detail: `settled material advantage ${snapshot.material.advantageUs}`
    };
  }
  return {
    achieved: false,
    terminalFailure: false,
    type: "none",
    advantage: snapshot.material.advantageUs,
    settledTurn
  };
}

/* -------------------------------------------------------------------------- */
/* Quiet position rules and named tactical ideas                                */
/* -------------------------------------------------------------------------- */

function enemyLooseTargets(snapshot, mover) {
  return (snapshot.looseByColor[other(mover)] || []);
}

function defenderGroupsForLoose(snapshot, mover) {
  const groups = new Map();
  for (const target of enemyLooseTargets(snapshot, mover)) {
    const relation = snapshot.relations.get(target.pieceIndex);
    for (const defender of relation?.defenders || []) {
      if (defender.piece.type === "k") continue;
      if (!groups.has(defender.index)) {
        groups.set(defender.index, {
          defenderRef: pieceRef(defender.piece, defender.index),
          targets: []
        });
      }
      groups.get(defender.index).targets.push(target);
    }
  }
  return [...groups.values()].sort((a, b) => b.targets.length - a.targets.length || b.defenderRef.value - a.defenderRef.value);
}

function legalCaptureBySquares(createGame, game, side, from, to) {
  const analysisGame = side === game.state.side ? game : gameForSide(createGame, game, side);
  return legalMoveRecords(createGame, analysisGame, side)
    .find((move) => move.from === from && move.to === to && Boolean(move.captured)) || null;
}

function harassDefenderFacts(createGame, game, snapshot, rootSide, policy) {
  const mover = snapshot.sideToMove;
  const groups = defenderGroupsForLoose(snapshot, mover);
  const output = [];
  const beforeBoard = boardOf(game);

  for (const move of snapshot.legalMoves) {
    const after = afterMove(createGame, game, move);
    if (!after) continue;
    const afterBoard = boardOf(after);
    const movedPiece = afterBoard[move.to];
    if (!movedPiece || movedPiece.color !== mover) continue;

    for (const group of groups) {
      const defender = group.defenderRef;
      const defenderPiece = afterBoard[defender.index];
      if (!defenderPiece || defenderPiece.color !== other(mover) || defenderPiece.type !== defender.type) continue;
      if (!attacksSquare(afterBoard, move.to, defender.index)) continue;

      const attackedBefore = attacksSquare(beforeBoard, move.from, defender.index);
      if (attackedBefore && move.from === move.to) continue;

      const nextTurnGame = gameForSide(createGame, after, mover);
      const witnessMove = legalCaptureBySquares(createGame, nextTurnGame, mover, move.to, defender.index);
      if (!witnessMove) continue;
      const witness = captureFact(createGame, nextTurnGame, witnessMove, rootSide, policy);
      if (!witness || witness.afterAdvantage < materialTarget(policy)) continue;

      const opponentCapturesHarasser = legalMoveRecords(createGame, after, after.state.side)
        .filter((reply) => reply.to === move.to && Boolean(reply.captured)).length;
      const resultPredicate = makeObservation(
        "harass_defender",
        `harass_defender(${pieceLabel(movedPiece, move.to)},${defender.label},[${group.targets.map((target) => target.pieceRef.label).join(",")}])`,
        {
          side: roleFor(mover, rootSide),
          from: squareName(move.from),
          to: squareName(move.to),
          square: squareName(defender.index),
          moveUci: move.uci,
          defenderRef: defender,
          targetRefs: group.targets.map((target) => target.pieceRef),
          detail: `ignoring permits ${witness.san}; shared_targets=${group.targets.length}`
        }
      );

      output.push({
        kind: "harass_defender",
        move,
        san: String(after.curNode?.san || move.uci).trim(),
        afterFen: after.exportFEN(),
        harasserRef: pieceRef(movedPiece, move.to),
        defenderRef: defender,
        targetRefs: group.targets.map((target) => target.pieceRef),
        targetSquares: group.targets.map((target) => target.pieceIndex),
        directWitness: {
          type: "capture_defender",
          uci: witnessMove.uci,
          san: witness.san,
          targetRef: defender,
          payoffPawns: defender.value
        },
        resultPredicate,
        payoffPawns: Math.max(defender.value, ...group.targets.map((target) => target.pieceRef.value)),
        score:
          group.targets.length * 1000 +
          defender.value * 100 -
          opponentCapturesHarasser * 250 +
          (move.captured ? 20 : 80),
        exposureCount: opponentCapturesHarasser
      });
    }
  }

  output.sort((a, b) => b.score - a.score || a.san.localeCompare(b.san));
  const seen = new Set();
  return output.filter((fact) => {
    const key = `${fact.move.uci}|${fact.defenderRef.index}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function directCaptureRecaptureForkFacts(createGame, game, snapshot, rootSide, policy) {
  const mover = snapshot.sideToMove;
  const looseSquares = new Set(enemyLooseTargets(snapshot, mover).map((target) => target.pieceIndex));
  const output = [];

  for (const move of snapshot.legalMoves) {
    if (!move.captured || !looseSquares.has(move.to)) continue;
    const afterCapture = afterMove(createGame, game, move);
    if (!afterCapture) continue;
    const recaptures = immediateRecaptures(createGame, afterCapture, move.to);
    if (!recaptures.length) continue;

    const lines = [];
    let allRecapturesHaveFork = true;
    for (const recapture of recaptures) {
      const afterRecapture = afterMove(createGame, afterCapture, recapture);
      if (!afterRecapture) {
        allRecapturesHaveFork = false;
        break;
      }
      const recapturer = boardOf(afterRecapture)[recapture.to];
      const forks = forkFactsForSide(createGame, afterRecapture, mover, rootSide, policy)
        .filter((fork) => fork.targets.some((target) => target.index === recapture.to));
      const fork = forks[0];
      if (!fork) {
        allRecapturesHaveFork = false;
        break;
      }
      lines.push({
        replyUci: recapture.uci,
        replySan: String(afterRecapture.curNode?.san || recapture.uci).trim(),
        recapturerRef: pieceRef(recapturer, recapture.to),
        continuation: {
          ruleId: "fork",
          uci: fork.uci,
          san: fork.san,
          kind: "fork",
          certificate: fork
        }
      });
    }
    if (!allRecapturesHaveFork || !lines.length) continue;

    const captureSan = String(afterCapture.curNode?.san || move.uci).trim();
    output.push({
      kind: "capture_recapture_fork",
      move,
      san: captureSan,
      afterFen: afterCapture.exportFEN(),
      targetRef: pieceRef(move.captured, move.to),
      captureSquare: move.to,
      recaptureLines: lines,
      payoffPawns: Math.max(...lines.map((line) => line.continuation.certificate.payoffPawns)),
      score: 900 + (PIECE_VALUES[move.captured.type] || 0) * 20,
      resultPredicate: makeObservation(
        "capture_recapture_fork",
        `capture_recapture_fork(${captureSan},${lines.map((line) => `${line.replySan}->${line.continuation.san}`).join("|")})`,
        {
          side: roleFor(mover, rootSide),
          from: squareName(move.from),
          to: squareName(move.to),
          square: squareName(move.to),
          moveUci: move.uci,
          detail: lines.map((line) => `${line.replySan} permits ${line.continuation.san}`).join("; ")
        }
      )
    });
  }

  return output.sort((a, b) => b.score - a.score || a.san.localeCompare(b.san));
}

function captureWithRuleContinuationFacts(createGame, game, snapshot, rootSide, policy) {
  const mover = snapshot.sideToMove;
  const looseSquares = new Set(enemyLooseTargets(snapshot, mover).map((target) => target.pieceIndex));
  const output = [];

  for (const move of snapshot.legalMoves) {
    if (!move.captured || !looseSquares.has(move.to)) continue;
    const afterCapture = afterMove(createGame, game, move);
    if (!afterCapture) continue;
    const recaptures = immediateRecaptures(createGame, afterCapture, move.to);
    if (!recaptures.length) continue;

    const lines = [];
    let allHaveContinuation = true;
    for (const recapture of recaptures) {
      const afterRecapture = afterMove(createGame, afterCapture, recapture);
      if (!afterRecapture) {
        allHaveContinuation = false;
        break;
      }
      const continuationSnapshot = basePositionSnapshot({
        createGame,
        game: afterRecapture,
        rootSide,
        policy,
        includeMoveFacts: true
      });
      const directSequences = directCaptureRecaptureForkFacts(
        createGame,
        afterRecapture,
        continuationSnapshot,
        rootSide,
        policy
      );
      const stableCapture = continuationSnapshot.winningCaptures[0] || null;
      const continuation = directSequences[0]
        ? {
            ruleId: "loose-piece",
            uci: directSequences[0].move.uci,
            san: directSequences[0].san,
            kind: "capture_recapture_fork",
            certificate: directSequences[0]
          }
        : stableCapture
          ? {
              ruleId: "winning-capture",
              uci: stableCapture.uci,
              san: stableCapture.san,
              kind: "winning_capture",
              certificate: stableCapture
            }
          : null;
      if (!continuation) {
        allHaveContinuation = false;
        break;
      }
      lines.push({
        replyUci: recapture.uci,
        replySan: String(afterRecapture.curNode?.san || recapture.uci).trim(),
        continuation
      });
    }
    if (!allHaveContinuation || !lines.length) continue;

    const captureSan = String(afterCapture.curNode?.san || move.uci).trim();
    output.push({
      kind: "capture_rule_continuation",
      move,
      san: captureSan,
      afterFen: afterCapture.exportFEN(),
      targetRef: pieceRef(move.captured, move.to),
      captureSquare: move.to,
      recaptureLines: lines,
      payoffPawns: Math.max(...lines.map((line) => line.continuation.certificate.payoffPawns || 0)),
      score: 700 + (PIECE_VALUES[move.captured.type] || 0) * 20,
      resultPredicate: makeObservation(
        "capture_recapture_fork",
        `capture_rule_continuation(${captureSan},${lines.map((line) => `${line.replySan}->${line.continuation.san}`).join("|")})`,
        {
          side: roleFor(mover, rootSide),
          from: squareName(move.from),
          to: squareName(move.to),
          square: squareName(move.to),
          moveUci: move.uci,
          detail: lines.map((line) => `${line.replySan} activates ${line.continuation.ruleId}:${line.continuation.san}`).join("; ")
        }
      )
    });
  }

  return output.sort((a, b) => b.score - a.score || a.san.localeCompare(b.san));
}

function stableLooseCaptureFacts(createGame, game, snapshot, rootSide, policy) {
  const mover = snapshot.sideToMove;
  const looseSquares = new Set(enemyLooseTargets(snapshot, mover).map((target) => target.pieceIndex));
  return snapshot.winningCaptures.filter((fact) => looseSquares.has(fact.move.to));
}

function standingThreatForSide(createGame, game, side, rootSide, policy) {
  const mates = mateInOneFactsForSide(createGame, game, side);
  if (mates.length) {
    return {
      kind: "mate_in_1",
      payoffPawns: 100,
      priority: threatPriorityScore("mate_in_1", policy),
      witnesses: mates.map((fact) => ({ type: "mate", uci: fact.uci, san: fact.san }))
    };
  }

  const captures = winningCaptureFactsForSide(createGame, game, side, rootSide, policy);
  if (captures.length) {
    const fact = captures[0];
    return {
      kind: "winning_capture",
      payoffPawns: fact.payoffPawns,
      priority: threatPriorityScore("winning_capture", policy),
      attackerRef: fact.attackerRef,
      targetRef: fact.targetRef,
      witnesses: [{ type: "capture_target", uci: fact.uci, san: fact.san }]
    };
  }
  return null;
}

function candidateRecord({ rule, idea, move, san, afterFen, premises, resultPredicates, threat, score, reasons, tags = [] }) {
  return {
    move,
    uci: move.uci,
    san,
    from: move.from,
    to: move.to,
    afterFen,
    ruleId: rule.id,
    ideaId: idea,
    category: idea,
    premises,
    resultPredicates,
    threat,
    score,
    reasons,
    tags: [...new Set([rule.id, idea, threat.kind, ...tags])]
  };
}

function looseRuleCandidates({ createGame, game, snapshot, rootSide, policy, rule }) {
  const output = [];
  const premises = enemyLooseTargets(snapshot, snapshot.sideToMove);

  if (rule.try.includes("attack_the_defender")) {
    for (const fact of harassDefenderFacts(createGame, game, snapshot, rootSide, policy)) {
      output.push(candidateRecord({
        rule,
        idea: "attack_the_defender",
        move: fact.move,
        san: fact.san,
        afterFen: fact.afterFen,
        premises: [
          ...premises.filter((item) => fact.targetSquares.includes(item.pieceIndex)),
          ...snapshot.sharedDefenders.filter((item) => item.defenderRef.index === fact.defenderRef.index)
        ],
        resultPredicates: [fact.resultPredicate],
        threat: {
          kind: "harass_defender",
          priority: threatPriorityScore("harass_defender", policy),
          payoffPawns: fact.payoffPawns,
          harasserRef: fact.harasserRef,
          defenderRef: fact.defenderRef,
          targetRefs: fact.targetRefs,
          witnesses: [fact.directWitness]
        },
        score: 4000 + fact.score,
        reasons: [
          `I see ${fact.targetRefs.length} loose target(s) defended by ${fact.defenderRef.label}`,
          `${fact.san} creates ${fact.resultPredicate.text}`,
          `if ignored, ${fact.directWitness.san} reaches the objective`
        ],
        tags: fact.targetRefs.length >= 2 ? ["shared_defender"] : []
      }));
    }
  }

  if (rule.try.includes("capture_then_double_attack")) {
    for (const fact of directCaptureRecaptureForkFacts(createGame, game, snapshot, rootSide, policy)) {
      output.push(candidateRecord({
        rule,
        idea: "capture_then_double_attack",
        move: fact.move,
        san: fact.san,
        afterFen: fact.afterFen,
        premises: premises.filter((item) => item.pieceIndex === fact.captureSquare),
        resultPredicates: [fact.resultPredicate],
        threat: {
          kind: "capture_recapture_fork",
          priority: threatPriorityScore("fork", policy),
          payoffPawns: fact.payoffPawns,
          captureSquare: fact.captureSquare,
          targetRef: fact.targetRef,
          recaptureLines: fact.recaptureLines,
          witnesses: fact.recaptureLines.map((line) => ({
            type: "recapture_then_fork",
            replyUci: line.replyUci,
            replySan: line.replySan,
            continuation: line.continuation
          }))
        },
        score: 9000 + fact.score,
        reasons: [
          `I see ${fact.targetRef.label} is loose`,
          `${fact.san} invites a recapture and then a double attack`,
          ...fact.recaptureLines.map((line) => `${line.replySan} permits ${line.continuation.san}`)
        ]
      }));
    }
  }

  if (rule.try.includes("capture_then_rescan")) {
    for (const fact of captureWithRuleContinuationFacts(createGame, game, snapshot, rootSide, policy)) {
      output.push(candidateRecord({
        rule,
        idea: "capture_then_rescan",
        move: fact.move,
        san: fact.san,
        afterFen: fact.afterFen,
        premises: premises.filter((item) => item.pieceIndex === fact.captureSquare),
        resultPredicates: [fact.resultPredicate],
        threat: {
          kind: "capture_recapture_fork",
          priority: threatPriorityScore("fork", policy),
          payoffPawns: fact.payoffPawns,
          captureSquare: fact.captureSquare,
          targetRef: fact.targetRef,
          recaptureLines: fact.recaptureLines,
          witnesses: fact.recaptureLines.map((line) => ({
            type: "recapture_then_rule",
            replyUci: line.replyUci,
            replySan: line.replySan,
            continuation: line.continuation
          }))
        },
        score: 7500 + fact.score,
        reasons: [
          `I see ${fact.targetRef.label} is loose`,
          `${fact.san} invites a recapture and then a fresh threat scan`,
          ...fact.recaptureLines.map((line) => `${line.replySan} activates ${line.continuation.ruleId}:${line.continuation.san}`)
        ]
      }));
    }
  }

  if (rule.try.includes("take_the_loose_piece")) {
    for (const fact of stableLooseCaptureFacts(createGame, game, snapshot, rootSide, policy)) {
      output.push(candidateRecord({
        rule,
        idea: "take_the_loose_piece",
        move: fact.move,
        san: fact.san,
        afterFen: fact.afterFen,
        premises: premises.filter((item) => item.pieceIndex === fact.move.to),
        resultPredicates: snapshot.predicates.filter((item) => item.predicate === "winning_capture_available" && item.moveUci === fact.uci),
        threat: {
          kind: "winning_capture",
          priority: threatPriorityScore("winning_capture", policy),
          payoffPawns: fact.payoffPawns,
          captureSquare: fact.captureSquare,
          targetRef: fact.targetRef,
          witnesses: [{ type: "keep_material_gain", uci: fact.uci, san: fact.san }]
        },
        score: 10000 + fact.payoffPawns * 100,
        reasons: [
          `I see ${fact.targetRef.label} is loose`,
          `${fact.san} still reaches the material objective after every immediate recapture`
        ]
      }));
    }
  }

  return output;
}

function winningCaptureRuleCandidates({ snapshot, policy, rule }) {
  return snapshot.winningCaptures.map((fact) => candidateRecord({
    rule,
    idea: "take_the_loose_piece",
    move: fact.move,
    san: fact.san,
    afterFen: fact.afterFen,
    premises: snapshot.predicates.filter((item) => item.predicate === "winning_capture_available" && item.moveUci === fact.uci),
    resultPredicates: snapshot.predicates.filter((item) => item.predicate === "winning_capture_available" && item.moveUci === fact.uci),
    threat: {
      kind: "winning_capture",
      priority: threatPriorityScore("winning_capture", policy),
      payoffPawns: fact.payoffPawns,
      captureSquare: fact.captureSquare,
      targetRef: fact.targetRef,
      witnesses: [{ type: "keep_material_gain", uci: fact.uci, san: fact.san }]
    },
    score: 6000 + fact.payoffPawns * 100,
    reasons: [`${fact.san} still reaches the material objective after immediate recaptures`]
  }));
}

function forkRuleCandidates({ snapshot, policy, rule }) {
  return snapshot.forkFacts.map((fact) => candidateRecord({
    rule,
    idea: "double_attack",
    move: fact.move,
    san: fact.san,
    afterFen: fact.afterFen,
    premises: snapshot.predicates.filter((item) => item.predicate === "fork_available" && item.moveUci === fact.uci),
    resultPredicates: [fact.resultPredicate],
    threat: {
      kind: "fork",
      priority: threatPriorityScore("fork", policy),
      payoffPawns: fact.payoffPawns,
      forkerRef: fact.forkerRef,
      targetRefs: fact.targets,
      check: fact.check,
      witnesses: fact.targets.map((target) => ({
        type: "capture_forked_target",
        from: fact.forkerRef.index,
        to: target.index,
        targetRef: target
      }))
    },
    score: 5500 + Number(fact.check) * 500 + fact.payoffPawns * 100,
    reasons: [
      `I see ${fact.resultPredicate.text}`,
      `${fact.san} threatens ${fact.targets.map((target) => target.label).join(" and ")}`
    ]
  }));
}

function answerCheckCandidates({ createGame, game, snapshot, rootSide, policy, rule }) {
  const output = [];
  for (const move of snapshot.legalMoves) {
    const after = afterMove(createGame, game, move);
    if (!after || safeInCheck(after, rootSide)) continue;
    const terminal = terminalInfo(createGame, after);
    if (terminal?.kind === "mate" && terminal.winner === rootSide) {
      output.push(candidateRecord({
        rule,
        idea: "answer_check_with_mate",
        move,
        san: String(after.curNode?.san || move.uci).trim(),
        afterFen: after.exportFEN(),
        premises: snapshot.predicates.filter((item) => item.predicate === "in_check"),
        resultPredicates: [makeObservation("mate", `mate(${rootSide})`, { side: "us" })],
        threat: { kind: "mate", priority: threatPriorityScore("mate", policy), payoffPawns: 100, witnesses: [] },
        score: 10000,
        reasons: ["I see our king is in check", "this legal answer checkmates"]
      }));
      continue;
    }

    const standingThreat = standingThreatForSide(createGame, after, rootSide, rootSide, policy);
    if (!standingThreat) continue;
    const san = String(after.curNode?.san || move.uci).trim();
    output.push(candidateRecord({
      rule,
      idea: "answer_check_and_create_threat",
      move,
      san,
      afterFen: after.exportFEN(),
      premises: snapshot.predicates.filter((item) => item.predicate === "in_check"),
      resultPredicates: [makeObservation(
        standingThreat.kind === "winning_capture" ? "winning_capture_available" : "mate_in_1_available",
        `new_threat(${standingThreat.kind},${standingThreat.witnesses.map((followUp) => followUp.san).join("|")})`,
        { side: "us", moveUci: move.uci, detail: `after ${san}, ${standingThreat.witnesses.map((followUp) => followUp.san).join(", ")}` }
      )],
      threat: standingThreat,
      score: 7000 + standingThreat.priority * 100 + standingThreat.payoffPawns,
      reasons: [
        "I see our king is in check",
        `${san} answers the check`,
        `the resulting position creates ${policyThreatKind(standingThreat.kind)}: ${standingThreat.witnesses.map((followUp) => followUp.san).join(", ")}`
      ]
    }));
  }
  return output;
}


function appendMateInOneObservation(snapshot, rootSide) {
  if (!snapshot.mateInOneFacts.length) return;
  snapshot.predicates.push(makeObservation(
    "mate_in_1_available",
    `mate_in_1_available(${snapshot.sideToMove},[${snapshot.mateInOneFacts.map((fact) => fact.san).join(",")}])`,
    { side: roleFor(snapshot.sideToMove, rootSide), detail: snapshot.mateInOneFacts.map((fact) => fact.san).join(", ") }
  ));
  snapshot.predicates = dedupeObservations(snapshot.predicates);
}

function appendCheckObservations(snapshot) {
  for (const fact of snapshot.checkingMoves) snapshot.predicates.push(fact.resultPredicate);
  snapshot.predicates = dedupeObservations(snapshot.predicates);
}

function appendMateThreatObservations(snapshot) {
  for (const fact of snapshot.mateThreats) snapshot.predicates.push(fact.resultPredicate);
  snapshot.predicates = dedupeObservations(snapshot.predicates);
}

function ensureThreatFacts(createGame, game, snapshot, rootSide, policy) {
  if (!snapshot._mateInOneFactsComputed) {
    snapshot.mateInOneFacts = mateInOneFactsForSide(createGame, game, snapshot.sideToMove);
    snapshot._mateInOneFactsComputed = true;
    appendMateInOneObservation(snapshot, rootSide);
  }
  if (!snapshot._checkingMovesComputed) {
    snapshot.checkingMoves = checkingMoveFactsForSide(createGame, game, snapshot.sideToMove, rootSide, policy);
    snapshot._checkingMovesComputed = true;
    appendCheckObservations(snapshot);
  }
  if (!snapshot._mateThreatsComputed) {
    snapshot.mateThreats = mateThreatFactsForSide(createGame, game, snapshot.sideToMove, rootSide);
    snapshot._mateThreatsComputed = true;
    appendMateThreatObservations(snapshot);
  }
  if (!snapshot._winningCaptureFactsComputed) {
    snapshot.winningCaptures = winningCaptureFactsForSide(createGame, game, snapshot.sideToMove, rootSide, policy);
    snapshot._winningCaptureFactsComputed = true;
    appendWinningCaptureObservations(snapshot, rootSide);
  }
  if (!snapshot._forkFactsComputed) {
    snapshot.forkFacts = forkFactsForSide(createGame, game, snapshot.sideToMove, rootSide, policy);
    snapshot._forkFactsComputed = true;
    appendForkObservations(snapshot);
  }
}

function threatScanRule() {
  return { id: "try-threats", instruction: "Try enabled first-order threats in order.", try: [] };
}

function mateNowCandidates(snapshot, policy, rule) {
  return snapshot.mateInOneFacts.map((fact) => candidateRecord({
    rule,
    idea: "mate",
    move: fact.move,
    san: fact.san,
    afterFen: fact.afterFen,
    premises: snapshot.predicates.filter((item) => item.predicate === "mate_in_1_available"),
    resultPredicates: [makeObservation("mate", `mate(${snapshot.sideToMove})`, { side: "us", moveUci: fact.uci })],
    threat: { kind: "mate", priority: threatPriorityScore("mate", policy), payoffPawns: 100, followUps: [] },
    score: 1_000_000,
    reasons: [`${fact.san} mates now`]
  }));
}

function checkingCandidates(snapshot, policy, rule) {
  return snapshot.checkingMoves.filter((fact) => !fact.mate).map((fact, index) => {
    const extra = fact.extraTargets[0] || null;
    return candidateRecord({
      rule,
      idea: "check",
      move: fact.move,
      san: fact.san,
      afterFen: fact.afterFen,
      premises: snapshot.predicates.filter((item) => item.predicate === "check_available" && item.moveUci === fact.uci),
      resultPredicates: [fact.resultPredicate],
      threat: {
        kind: "check",
        priority: threatPriorityScore("check", policy),
        payoffPawns: Math.max(1, fact.payoffPawns),
        checkerRef: fact.checkerRef,
        targetRefs: fact.extraTargets,
        legalReplyUcis: fact.legalReplyUcis,
        replyCount: fact.replyCount,
        followUps: extra ? [{ type: "take_extra_target", targetRef: extra }] : []
      },
      score: 900_000 - index * 100,
      reasons: [
        `${fact.san} gives check and allows ${fact.replyCount} legal answer${fact.replyCount === 1 ? "" : "s"}`,
        ...(extra ? [`the checking piece also attacks ${extra.label}`] : [])
      ],
      tags: extra ? [extra.type === "q" ? "royal_fork" : "check_double_attack"] : []
    });
  });
}

function mateThreatCandidates(snapshot, policy, rule) {
  return snapshot.mateThreats.map((fact) => candidateRecord({
    rule,
    idea: "threaten_mate_in_one",
    move: fact.move,
    san: fact.san,
    afterFen: fact.afterFen,
    premises: snapshot.predicates.filter((item) => item.predicate === "mate_threat_available" && item.moveUci === fact.uci),
    resultPredicates: [fact.resultPredicate],
    threat: {
      kind: "mate_in_1",
      priority: threatPriorityScore("mate_in_1", policy),
      payoffPawns: 100,
      followUps: fact.mates.map((mate) => ({ type: "mate", uci: mate.uci, san: mate.san })),
      witnesses: fact.mates.map((mate) => ({ type: "mate", uci: mate.uci, san: mate.san }))
    },
    score: 800_000 + fact.mates.length * 100,
    reasons: [`${fact.san} threatens ${fact.mates.map((mate) => mate.san).join(" or ")}`]
  }));
}

function materialCandidates(snapshot, policy, rule) {
  return snapshot.winningCaptures.map((fact) => candidateRecord({
    rule,
    idea: "take_material",
    move: fact.move,
    san: fact.san,
    afterFen: fact.afterFen,
    premises: snapshot.predicates.filter((item) => item.predicate === "winning_capture_available" && item.moveUci === fact.uci),
    resultPredicates: snapshot.predicates.filter((item) => item.predicate === "winning_capture_available" && item.moveUci === fact.uci),
    threat: {
      kind: "winning_capture",
      priority: threatPriorityScore("winning_capture", policy),
      payoffPawns: fact.payoffPawns,
      captureSquare: fact.captureSquare,
      targetRef: fact.targetRef,
      followUps: [{ type: "keep_material_gain", uci: fact.uci, san: fact.san }],
      witnesses: [{ type: "candidate_is_objective_capture", uci: fact.uci, san: fact.san }]
    },
    score: 700_000 + fact.payoffPawns * 100,
    reasons: [`${fact.san} reaches the material objective after immediate recaptures`]
  }));
}

function doubleAttackCandidates(snapshot, policy, rule) {
  return snapshot.forkFacts.filter((fact) => !fact.check).map((fact) => candidateRecord({
    rule,
    idea: "double_attack",
    move: fact.move,
    san: fact.san,
    afterFen: fact.afterFen,
    premises: snapshot.predicates.filter((item) => item.predicate === "fork_available" && item.moveUci === fact.uci),
    resultPredicates: [fact.resultPredicate],
    threat: {
      kind: "fork",
      priority: threatPriorityScore("fork", policy),
      payoffPawns: fact.payoffPawns,
      forkerRef: fact.forkerRef,
      targetRefs: fact.targets,
      check: false,
      followUps: fact.targets.map((target) => ({ type: "take_target", from: fact.forkerRef.index, to: target.index, targetRef: target })),
      witnesses: fact.targets.map((target) => ({ type: "capture_forked_target", from: fact.forkerRef.index, to: target.index, targetRef: target }))
    },
    score: 600_000 + fact.payoffPawns * 100,
    reasons: [`${fact.san} attacks ${fact.targets.map((target) => target.label).join(" and ")}`]
  }));
}

function candidateStopsMateDanger(createGame, candidate, rootSide) {
  const after = cloneGame(createGame, candidate.afterFen);
  const terminal = terminalInfo(createGame, after);
  if (terminal?.kind === "mate" && terminal.winner === rootSide) return true;
  return mateInOneFactsForSide(createGame, after, other(rootSide)).length === 0;
}

function firstOrderThreatCandidates({ createGame, game, snapshot, rootSide, policy, depth }) {
  ensureThreatFacts(createGame, game, snapshot, rootSide, policy);
  const rule = threatScanRule();
  const groups = [];

  if (snapshot.inCheck && snapshot.sideToMove === rootSide) {
    const answerRule = policy.rules.find((item) => item.id === "answer-check") || rule;
    groups.push(...answerCheckCandidates({ createGame, game, snapshot, rootSide, policy, rule: answerRule }));
  }
  if (threatEnabledAtDepth(policy, "mate", depth)) groups.push(...mateNowCandidates(snapshot, policy, rule).slice(0, maxMovesForThreat(policy, "mate")));
  if (threatEnabledAtDepth(policy, "check", depth)) groups.push(...checkingCandidates(snapshot, policy, rule).slice(0, maxMovesForThreat(policy, "check")));
  if (threatEnabledAtDepth(policy, "mate_in_1", depth)) groups.push(...mateThreatCandidates(snapshot, policy, rule).slice(0, maxMovesForThreat(policy, "mate_in_1")));
  if (threatEnabledAtDepth(policy, "winning_capture", depth)) groups.push(...materialCandidates(snapshot, policy, rule).slice(0, maxMovesForThreat(policy, "winning_capture")));
  if (threatEnabledAtDepth(policy, "fork", depth)) groups.push(...doubleAttackCandidates(snapshot, policy, rule).slice(0, maxMovesForThreat(policy, "fork")));

  const danger = snapshot.sideToMove === rootSide && snapshot.opponentMateInOneFacts.length > 0;
  const filtered = danger
    ? groups.filter((candidate) => candidateStopsMateDanger(createGame, candidate, rootSide)).map((candidate) => ({
        ...candidate,
        threat: candidate.threat.kind === "mate" ? candidate.threat : { ...candidate.threat, priority: threatPriorityScore("stop_mate_in_1", policy) },
        reasons: [...candidate.reasons, "this move also removes every immediate mate"]
      }))
    : groups;

  filtered.sort((a, b) => (b.threat.priority || 0) - (a.threat.priority || 0) || b.score - a.score || a.san.localeCompare(b.san));
  const seen = new Set();
  return filtered.filter((candidate) => {
    if (seen.has(candidate.uci)) return false;
    seen.add(candidate.uci);
    return true;
  }).slice(0, maxMovesPerState(policy));
}


function appendWinningCaptureObservations(snapshot, rootSide) {
  for (const fact of snapshot.winningCaptures) {
    snapshot.predicates.push(makeObservation(
      "winning_capture_available",
      `winning_capture_available(${fact.san},${fact.targetRef.label})`,
      {
        side: roleFor(snapshot.sideToMove, rootSide),
        from: squareName(fact.move.from),
        to: squareName(fact.move.to),
        square: squareName(fact.move.to),
        moveUci: fact.uci,
        detail: `worst immediate-recapture material=${fact.worstAfterRecapture}`
      }
    ));
  }
  snapshot.predicates = dedupeObservations(snapshot.predicates);
}

function appendForkObservations(snapshot) {
  for (const fact of snapshot.forkFacts) snapshot.predicates.push(fact.resultPredicate);
  snapshot.predicates = dedupeObservations(snapshot.predicates);
}

function ensureRuleFacts(createGame, game, snapshot, rootSide, policy, ruleId) {
  if (ruleId === "winning-capture" && !snapshot._winningCaptureFactsComputed) {
    snapshot.winningCaptures = winningCaptureFactsForSide(
      createGame,
      game,
      snapshot.sideToMove,
      rootSide,
      policy
    );
    snapshot._winningCaptureFactsComputed = true;
    appendWinningCaptureObservations(snapshot, rootSide);
  }
  if (ruleId === "fork" && !snapshot._forkFactsComputed) {
    snapshot.forkFacts = forkFactsForSide(
      createGame,
      game,
      snapshot.sideToMove,
      rootSide,
      policy
    );
    snapshot._forkFactsComputed = true;
    appendForkObservations(snapshot);
  }
  // The loose-piece rule can use direct objective-winning captures, but only
  // after the board fact loose has selected that rule.
  if (ruleId === "loose-piece" && !snapshot._winningCaptureFactsComputed) {
    snapshot.winningCaptures = winningCaptureFactsForSide(
      createGame,
      game,
      snapshot.sideToMove,
      rootSide,
      policy
    );
    snapshot._winningCaptureFactsComputed = true;
  }
}

function conditionMatches(condition, snapshot, rootSide) {
  const wantedSide = condition.side;
  const sideMatches = (observation) => !wantedSide || observation.side === wantedSide;
  if (condition.predicate === "in_check") {
    return snapshot.inCheck && snapshot.sideToMove === rootSide && wantedSide === "us";
  }
  if (condition.predicate === "loose") {
    return snapshot.loose.some((observation) => sideMatches(observation));
  }
  if (condition.predicate === "winning_capture_available") {
    return snapshot.sideToMove === rootSide && snapshot.winningCaptures.length > 0;
  }
  if (condition.predicate === "fork_available") {
    return snapshot.sideToMove === rootSide && snapshot.forkFacts.length > 0;
  }
  return snapshot.predicates.some((observation) => observation.predicate === condition.predicate && sideMatches(observation));
}

function matchingRule({ createGame, game, snapshot, policy, rootSide, expectedContinuation = null }) {
  if (expectedContinuation?.ruleId) {
    const expected = policy.rules.find((rule) => rule.id === expectedContinuation.ruleId);
    if (expected) {
      ensureRuleFacts(createGame, game, snapshot, rootSide, policy, expected.id);
      return { rule: expected, expected: true };
    }
  }
  for (const rule of policy.rules) {
    ensureRuleFacts(createGame, game, snapshot, rootSide, policy, rule.id);
    if ((rule.when?.all || []).every((condition) => conditionMatches(condition, snapshot, rootSide))) {
      return { rule, expected: false };
    }
  }
  return null;
}

function rulePremises(rule, snapshot) {
  const output = [];
  for (const condition of rule.when?.all || []) {
    const matches = snapshot.predicates.filter((observation) => {
      if (observation.predicate !== condition.predicate) return false;
      return !condition.side || observation.side === condition.side;
    });
    output.push(...matches);
  }
  return dedupeObservations(output);
}

function generateCandidates({ createGame, game, snapshot, rootSide, policy, match, expectedContinuation = null, depth = 0 }) {
  const rule = match.rule;
  let candidates = [];
  if (match.forcing && Array.isArray(match.candidates)) {
    candidates = match.candidates.slice();
  } else if (rule.id === "answer-check") {
    candidates = answerCheckCandidates({ createGame, game, snapshot, rootSide, policy, rule });
  } else if (rule.id === "loose-piece") {
    candidates = looseRuleCandidates({ createGame, game, snapshot, rootSide, policy, rule });
  }

  if (expectedContinuation?.uci) {
    const preferred = candidates.filter((candidate) => candidate.uci === expectedContinuation.uci);
    if (preferred.length) candidates = preferred;
  }

  candidates.sort((a, b) => {
    const priorityDifference = (b.threat?.priority || 0) - (a.threat?.priority || 0);
    return priorityDifference || b.score - a.score || a.san.localeCompare(b.san);
  });
  const seen = new Set();
  return candidates.filter((candidate) => {
    if (seen.has(candidate.uci)) return false;
    seen.add(candidate.uci);
    return true;
  }).slice(0, maxMovesPerState(policy));
}

/* -------------------------------------------------------------------------- */
/* Defender replies                                                            */
/* -------------------------------------------------------------------------- */

function counterThreatAfterReply(createGame, afterReply, opponentSide, rootSide, activeThreat, policy, reply = null) {
  const terminal = terminalInfo(createGame, afterReply);
  if (terminal?.kind === "mate" && terminal.winner === opponentSide) {
    return { relevant: true, kind: "mate", payoffPawns: 100, text: "reply checkmates" };
  }
  if (safeInCheck(afterReply, rootSide)) {
    return { relevant: true, kind: "check", payoffPawns: 100, text: "reply gives check" };
  }

  const opponentAnalysis = gameForSide(createGame, afterReply, opponentSide);
  const mates = mateInOneFactsForSide(createGame, opponentAnalysis, opponentSide);
  if (mates.length) {
    return { relevant: true, kind: "mate_in_1", payoffPawns: 100, text: `reply creates mate in one: ${mates.map((item) => item.san).join(", ")}` };
  }

  // A non-check counter-threat must be caused by the reply itself. We do not
  // retain a reply merely because some unrelated opponent piece already had a
  // capture somewhere on the board.
  let createdPayoff = reply?.captured && reply.captured.color === rootSide
    ? PIECE_VALUES[reply.captured.type] || 0
    : 0;
  const movedPiece = reply ? boardOf(afterReply)[reply.to] : null;
  if (movedPiece && movedPiece.color === opponentSide) {
    for (const target of attackedEnemyPieces(afterReply, reply.to, opponentSide)) {
      createdPayoff = Math.max(createdPayoff, target.value);
    }
  }
  if (createdPayoff >= Number(activeThreat?.payoffPawns || Infinity)) {
    return {
      relevant: true,
      kind: "winning_capture",
      payoffPawns: createdPayoff,
      text: `reply creates a counter-threat worth ${createdPayoff}`
    };
  }
  return { relevant: false, kind: null, payoffPawns: 0, text: "" };
}

function verifiedCaptureWitness(createGame, afterReply, rootSide, from, to, policy) {
  const analysisGame = gameForSide(createGame, afterReply, rootSide);
  const move = legalCaptureBySquares(createGame, analysisGame, rootSide, from, to);
  if (!move) return null;
  const fact = captureFact(createGame, analysisGame, move, rootSide, policy);
  if (!fact || fact.afterAdvantage < materialTarget(policy)) return null;
  return {
    type: "available_capture",
    uci: move.uci,
    san: fact.san,
    targetRef: fact.targetRef,
    stable: fact.stable,
    afterAdvantage: fact.afterAdvantage,
    worstAfterRecapture: fact.worstAfterRecapture
  };
}

function stableTargetCaptureWitness(createGame, afterReply, rootSide, targetIndices, policy) {
  const captures = winningCaptureFactsForSide(createGame, afterReply, rootSide, rootSide, policy);
  const targetSet = new Set(targetIndices);
  const fact = captures.find((item) => targetSet.has(item.move.to));
  if (!fact) return null;
  return {
    type: "capture_abandoned_loose_target",
    uci: fact.uci,
    san: fact.san,
    targetRef: fact.targetRef,
    afterAdvantage: fact.afterAdvantage,
    worstAfterRecapture: fact.worstAfterRecapture
  };
}

function directSequenceWitness(createGame, afterReply, rootSide, targetIndices, policy) {
  const snapshot = basePositionSnapshot({
    createGame,
    game: afterReply,
    rootSide,
    policy,
    includeMoveFacts: true
  });
  const targetSet = new Set(targetIndices);
  const fact = directCaptureRecaptureForkFacts(createGame, afterReply, snapshot, rootSide, policy)
    .find((item) => targetSet.has(item.captureSquare));
  if (!fact) return null;
  return {
    type: "capture_then_double_attack_line",
    uci: fact.move.uci,
    san: fact.san,
    line: fact.recaptureLines.map((line) => `${line.replySan} ${line.continuation.san}`),
    certificate: fact
  };
}

function threatStillExecutable(createGame, afterReply, candidate, rootSide, policy) {
  const threat = candidate.threat;
  if (threat.kind === "winning_capture") {
    const witness = threat.witnesses?.[0];
    if (!witness?.uci) return null;
    const analysisGame = gameForSide(createGame, afterReply, rootSide);
    const move = moveByUci(legalMoveRecords(createGame, analysisGame, rootSide), witness.uci);
    if (!move) return null;
    const fact = captureFact(createGame, analysisGame, move, rootSide, policy);
    if (!fact || fact.afterAdvantage < materialTarget(policy)) return null;
    return { type: "execute_winning_capture", uci: move.uci, san: fact.san };
  }
  if (threat.kind === "mate_in_1") {
    const witnessUcis = new Set((threat.witnesses || []).map((item) => item.uci));
    const mates = mateInOneFactsForSide(createGame, afterReply, rootSide);
    const mate = mates.find((item) => witnessUcis.has(item.uci)) || mates[0];
    return mate ? { type: "execute_mate", uci: mate.uci, san: mate.san } : null;
  }
  return null;
}

function analyzeHarassReply({ createGame, afterReply, reply, candidate, rootSide, policy }) {
  const threat = candidate.threat;
  const counter = counterThreatAfterReply(createGame, afterReply, other(rootSide), rootSide, threat, policy, reply);
  if (counter.relevant) {
    return {
      disposition: "relevant",
      predicates: [makeObservation("forcing_counterthreat", `forcing_counterthreat(${reply.uci},${counter.kind})`, { detail: counter.text })],
      reason: counter.text
    };
  }

  const harasserWasCaptured = reply.to === threat.harasserRef.index && Boolean(reply.captured);
  if (harasserWasCaptured) {
    return {
      disposition: "relevant",
      predicates: [makeObservation("forcing_counterthreat", `capture_harasser(${reply.uci})`, { detail: "reply captures the harassing piece" })],
      reason: "reply captures the harasser"
    };
  }

  const defenderAfter = locateMovedRef(threat.defenderRef, reply);
  const targetsAfter = threat.targetRefs.map((target) => locateMovedRef(target, reply));
  const board = boardOf(afterReply);
  const harasserPiece = board[threat.harasserRef.index];
  const defenderPiece = board[defenderAfter.index];
  const harassRemains = Boolean(
    harasserPiece &&
    harasserPiece.color === rootSide &&
    defenderPiece &&
    defenderPiece.color === other(rootSide) &&
    attacksSquare(board, threat.harasserRef.index, defenderAfter.index)
  );

  if (harassRemains) {
    const witness = verifiedCaptureWitness(
      createGame,
      afterReply,
      rootSide,
      threat.harasserRef.index,
      defenderAfter.index,
      policy
    );
    if (witness) {
      return {
        disposition: "discharged",
        predicates: [makeObservation("harass_defender", `ignored_harass(${reply.uci})`, { detail: `${witness.san} wins` })],
        reason: `reply does not stop ${witness.san}`,
        witness
      };
    }
  }

  const existingTargets = targetsAfter.filter((target) => {
    const piece = board[target.index];
    return piece && piece.color === other(rootSide) && piece.type === target.type;
  });
  const defenderKeeps = existingTargets.filter((target) => attacksSquare(board, defenderAfter.index, target.index));
  const movedDefender = reply.from === threat.defenderRef.index;
  const movedTarget = threat.targetRefs.some((target) => reply.from === target.index);

  if (movedTarget) {
    return {
      disposition: "relevant",
      predicates: [makeObservation("forcing_counterthreat", `move_loose_target(${reply.uci})`, { detail: "reply moves a bound loose target" })],
      reason: "reply moves one of the loose targets"
    };
  }

  if (movedDefender && defenderKeeps.length === existingTargets.length && existingTargets.length) {
    return {
      disposition: "relevant",
      predicates: [makeObservation(
        "defends",
        `save_defender_keep_all_loose(${reply.uci})`,
        { detail: `defender still protects ${defenderKeeps.map((target) => target.label).join(", ")}` }
      )],
      reason: "reply saves the defender while keeping every bound loose target defended"
    };
  }

  const abandoned = existingTargets.filter((target) => !attacksSquare(board, defenderAfter.index, target.index));
  if (abandoned.length) {
    const targetIndices = abandoned.map((target) => target.index);
    const stableWitness = stableTargetCaptureWitness(createGame, afterReply, rootSide, targetIndices, policy);
    if (stableWitness) {
      return {
        disposition: "discharged",
        predicates: [makeObservation("loose", `abandoned_loose_target(${reply.uci})`, { detail: `${stableWitness.san} wins` })],
        reason: `reply abandons ${stableWitness.targetRef.label}`,
        witness: stableWitness
      };
    }
    const sequenceWitness = directSequenceWitness(createGame, afterReply, rootSide, targetIndices, policy);
    if (sequenceWitness) {
      return {
        disposition: "discharged",
        predicates: [makeObservation("capture_recapture_fork", `abandoned_target_sequence(${reply.uci})`, { detail: `${sequenceWitness.san}: ${sequenceWitness.line.join("; ")}` })],
        reason: "reply abandons a target to a recorded capture-then-double-attack line",
        witness: sequenceWitness
      };
    }
    return {
      disposition: "relevant",
      predicates: [makeObservation("defends", `partial_defense(${reply.uci})`, { detail: `keeps ${defenderKeeps.length}/${existingTargets.length} bound targets defended` })],
      reason: "reply only partially answers the multi-target threat; the continuation must be rescanned"
    };
  }

  if (!harassRemains) {
    return {
      disposition: "relevant",
      predicates: [makeObservation("defends", `refute_harass(${reply.uci})`, { detail: "the direct capture is no longer available" })],
      reason: "reply stops the attack on the defender"
    };
  }

  return {
    disposition: "refutation",
    predicates: [],
    reason: "reply stops the stated idea and is not one of the allowed defender answers"
  };
}

function analyzeSequenceReply({ createGame, afterReply, reply, candidate, rootSide, policy, depth }) {
  const threat = candidate.threat;
  const counter = counterThreatAfterReply(createGame, afterReply, other(rootSide), rootSide, threat, policy, reply);
  if (counter.relevant) {
    return {
      disposition: "relevant",
      predicates: [makeObservation("forcing_counterthreat", `forcing_counterthreat(${reply.uci},${counter.kind})`, { detail: counter.text })],
      reason: counter.text
    };
  }

  const line = (threat.recaptureLines || []).find((item) => item.replyUci === reply.uci);
  if (line) {
    // At the boundary, the recorded line is enough. Away from the boundary,
    // expose every reasoning move in the
    // stepper by descending to the bound continuation.
    if (depth + 1 >= policy.budget.maxPlies) {
      return {
        disposition: "discharged",
        predicates: [makeObservation("capture_recapture_fork", `boundary_follow_up(${line.continuation.san})`, { detail: "the recorded follow-up settles the line at the ply boundary" })],
        reason: `recapture is met by the recorded follow-up ${line.continuation.san}`,
        witness: line.continuation
      };
    }
    return {
      disposition: "relevant",
      predicates: [makeObservation("capture_recapture_fork", `expected_recapture(${reply.uci})`, { detail: `next rule move ${line.continuation.san}` })],
      reason: `reply is the bound recapture; rescan with ${line.continuation.ruleId}`,
      expectedContinuation: line.continuation
    };
  }

  const snapshot = basePositionSnapshot({ createGame, game: afterReply, rootSide, policy, includeMoveFacts: false });
  const goal = goalStatus(snapshot, policy);
  if (goal.achieved) {
    return {
      disposition: "discharged",
      predicates: [makeObservation("winning_capture_available", `declined_recapture(${reply.uci})`, { detail: goal.detail })],
      reason: `reply declines the recapture and leaves ${goal.detail}`,
      witness: { type: "settled_material", detail: goal.detail }
    };
  }

  if (reply.to === threat.captureSquare && Boolean(reply.captured)) {
    return {
      disposition: "relevant",
      predicates: [makeObservation("capture_recapture_fork", `unbound_recapture(${reply.uci})`, { detail: "recapture was not one of the recorded replies" })],
      reason: "reply recaptures, but this recapture was not in the recorded line"
    };
  }

  const standing = standingThreatForSide(createGame, afterReply, rootSide, rootSide, policy);
  if (standing) {
    return {
      disposition: "discharged",
      predicates: [makeObservation(
        standing.kind === "winning_capture" ? "winning_capture_available" : "mate_in_1_available",
        `declined_reavailable_capture(${reply.uci})`,
        { detail: standing.witnesses.map((witness) => witness.san).join(", ") }
      )],
      reason: `reply declines the recapture and leaves ${standing.kind}`,
      witness: standing.witnesses[0] || standing
    };
  }

  return {
    disposition: "refutation",
    predicates: [],
    reason: "declining the expected recapture did not leave the objective or another stated threat"
  };
}

function analyzeCheckReply({ createGame, afterReply, reply, candidate, rootSide, policy }) {
  const threat = candidate.threat;
  const counter = counterThreatAfterReply(createGame, afterReply, other(rootSide), rootSide, threat, policy, reply);
  if (counter.relevant) {
    return {
      disposition: "relevant",
      predicates: [makeObservation("forcing_counterthreat", `forcing_counterthreat(${reply.uci},${counter.kind})`, { detail: counter.text })],
      reason: counter.text,
      replyRank: counter.kind === "mate" ? 600 : counter.kind === "check" ? 550 : counter.kind === "mate_in_1" ? 500 : 350
    };
  }

  if (threat.checkerRef && reply.to === threat.checkerRef.index && Boolean(reply.captured)) {
    return {
      disposition: "relevant",
      predicates: [makeObservation("check_available", `capture_checker(${reply.uci})`, { detail: "reply captures the checking piece" })],
      reason: "reply captures the checking piece",
      replyRank: 450
    };
  }

  const movedTarget = (threat.targetRefs || []).some((target) => reply.from === target.index);
  if (movedTarget) {
    return {
      disposition: "relevant",
      predicates: [makeObservation("check_available", `save_extra_target(${reply.uci})`, { detail: "reply answers the check and moves the extra target" })],
      reason: "reply answers the check and saves the extra target",
      replyRank: 425
    };
  }

  for (const target of threat.targetRefs || []) {
    const followUp = verifiedCaptureWitness(createGame, afterReply, rootSide, threat.checkerRef?.index, target.index, policy);
    if (followUp) {
      return {
        disposition: "discharged",
        predicates: [makeObservation("check_available", `check_follow_up(${reply.uci})`, { detail: `${followUp.san} reaches the objective` })],
        reason: `reply answers the check but leaves ${followUp.san}`,
        witness: followUp,
        replyRank: 0
      };
    }
  }

  return {
    disposition: "relevant",
    predicates: [makeObservation("check_available", `legal_check_answer(${reply.uci})`, { detail: "legal answer to the check; rescan the position" })],
    reason: "legal answer to the check; rescan the position",
    replyRank: 300
  };
}

function analyzeForkReply({ createGame, afterReply, reply, candidate, rootSide, policy }) {
  const threat = candidate.threat;
  const counter = counterThreatAfterReply(createGame, afterReply, other(rootSide), rootSide, threat, policy, reply);
  if (counter.relevant && counter.kind !== "check") {
    return {
      disposition: "relevant",
      predicates: [makeObservation("forcing_counterthreat", `forcing_counterthreat(${reply.uci},${counter.kind})`, { detail: counter.text })],
      reason: counter.text
    };
  }

  if (reply.to === threat.forkerRef.index && Boolean(reply.captured)) {
    return {
      disposition: "relevant",
      predicates: [makeObservation("fork_available", `capture_forker(${reply.uci})`, { detail: "reply captures the forking piece" })],
      reason: "reply captures the forker"
    };
  }

  const movedTarget = threat.targetRefs.some((target) => reply.from === target.index);
  if (movedTarget) {
    return {
      disposition: "relevant",
      predicates: [makeObservation("fork_available", `save_forked_target(${reply.uci})`, { detail: "reply moves a forked target while answering the forcing move" })],
      reason: "reply saves a forked target"
    };
  }

  for (const target of threat.targetRefs) {
    const witness = verifiedCaptureWitness(
      createGame,
      afterReply,
      rootSide,
      threat.forkerRef.index,
      target.index,
      policy
    );
    if (witness) {
      return {
        disposition: "discharged",
        predicates: [makeObservation("fork_available", `ignored_fork(${reply.uci})`, { detail: `${witness.san} wins` })],
        reason: `reply answers the check but leaves ${witness.san}`,
        witness
      };
    }
  }

  return {
    disposition: "relevant",
    predicates: [makeObservation("fork_available", `refute_fork(${reply.uci})`, { detail: "neither forked target can still be taken" })],
    reason: "reply stops the double attack"
  };
}

function analyzeStandingThreatReply({ createGame, afterReply, reply, candidate, rootSide, policy }) {
  const threat = candidate.threat;
  const counter = counterThreatAfterReply(createGame, afterReply, other(rootSide), rootSide, threat, policy, reply);
  if (counter.relevant) {
    return {
      disposition: "relevant",
      predicates: [makeObservation("forcing_counterthreat", `forcing_counterthreat(${reply.uci},${counter.kind})`, { detail: counter.text })],
      reason: counter.text
    };
  }

  if (threat.attackerRef && reply.to === threat.attackerRef.index && Boolean(reply.captured)) {
    return {
      disposition: "relevant",
      predicates: [makeObservation("winning_capture_available", `capture_threatener(${reply.uci})`, { detail: "reply captures the threatening piece" })],
      reason: "reply captures the threatener"
    };
  }
  if (threat.targetRef && reply.from === threat.targetRef.index) {
    return {
      disposition: "relevant",
      predicates: [makeObservation("winning_capture_available", `move_threatened_target(${reply.uci})`, { detail: "reply moves the threatened target" })],
      reason: "reply moves the threatened target"
    };
  }

  const witness = threatStillExecutable(createGame, afterReply, candidate, rootSide, policy);
  if (witness) {
    return {
      disposition: "discharged",
      predicates: [makeObservation("winning_capture_available", `ignored_standing_threat(${reply.uci})`, { detail: `${witness.san} wins` })],
      reason: `reply does not stop ${witness.san}`,
      witness
    };
  }
  return {
    disposition: "relevant",
    predicates: [makeObservation("winning_capture_available", `refute_standing_threat(${reply.uci})`, { detail: "the stated follow-up is no longer available" })],
    reason: "reply neutralizes the standing threat"
  };
}

function classifyOpponentReplies({ createGame, game, candidate, rootSide, policy, depth }) {
  const replies = legalMoveRecords(createGame, game, game.state.side);
  const relevant = [];
  const discharged = [];
  const refutations = [];

  for (const reply of replies) {
    const afterReply = afterMove(createGame, game, reply);
    if (!afterReply) {
      refutations.push({ reply, reason: "ScratchChess could not apply a legal reply", predicates: [] });
      continue;
    }
    const settledSnapshot = basePositionSnapshot({
      createGame,
      game: afterReply,
      rootSide,
      policy,
      includeMoveFacts: false
    });
    const settledGoal = goalStatus(settledSnapshot, policy);
    if (settledGoal.achieved) {
      discharged.push({
        move: reply,
        uci: reply.uci,
        san: String(afterReply.curNode?.san || reply.uci).trim(),
        afterFen: afterReply.exportFEN(),
        predicates: [makeObservation("winning_capture_available", `settled_after_reply(${reply.uci})`, { detail: settledGoal.detail })],
        reason: `the opponent reply leaves ${settledGoal.detail}`,
        witness: { type: "settled_objective", detail: settledGoal.detail },
        expectedContinuation: null
      });
      continue;
    }

    let analysis;
    if (candidate.threat.kind === "harass_defender") {
      analysis = analyzeHarassReply({ createGame, afterReply, reply, candidate, rootSide, policy });
    } else if (candidate.threat.kind === "capture_recapture_fork") {
      analysis = analyzeSequenceReply({ createGame, afterReply, reply, candidate, rootSide, policy, depth });
    } else if (candidate.threat.kind === "check") {
      analysis = analyzeCheckReply({ createGame, afterReply, reply, candidate, rootSide, policy });
    } else if (candidate.threat.kind === "fork") {
      analysis = analyzeForkReply({ createGame, afterReply, reply, candidate, rootSide, policy });
    } else if (["winning_capture", "mate_in_1"].includes(candidate.threat.kind)) {
      analysis = analyzeStandingThreatReply({ createGame, afterReply, reply, candidate, rootSide, policy });
    } else if (candidate.threat.kind === "mate") {
      analysis = { disposition: "discharged", predicates: [], reason: "mate has no legal reply", witness: { type: "mate" } };
    } else {
      analysis = { disposition: "refutation", predicates: [], reason: `unsupported threat kind ${candidate.threat.kind}` };
    }

    const entry = {
      move: reply,
      uci: reply.uci,
      san: String(afterReply.curNode?.san || reply.uci).trim(),
      afterFen: afterReply.exportFEN(),
      predicates: analysis.predicates || [],
      reason: analysis.reason,
      witness: analysis.witness || null,
      expectedContinuation: analysis.expectedContinuation || null,
      replyRank: Number(analysis.replyRank || 0)
    };
    if (analysis.disposition === "relevant") relevant.push(entry);
    else if (analysis.disposition === "discharged") discharged.push(entry);
    else refutations.push(entry);
  }

  relevant.sort((a, b) => {
    const rankDifference = (b.replyRank || 0) - (a.replyRank || 0);
    if (rankDifference) return rankDifference;
    const aCheck = a.predicates.some((item) => item.text.includes("check")) ? 1 : 0;
    const bCheck = b.predicates.some((item) => item.text.includes("check")) ? 1 : 0;
    return bCheck - aCheck || a.san.localeCompare(b.san);
  });

  const limit = maxDefenderReplies(policy);
  const overflow = relevant.slice(limit);
  const kept = relevant.slice(0, limit);

  return {
    total: replies.length,
    relevant: kept,
    discharged,
    refutations,
    truncated: overflow.length > 0,
    overflow: overflow.map((entry) => ({ uci: entry.uci, san: entry.san, reason: entry.reason }))
  };
}

function candidateSummary(candidate) {
  return {
    uci: candidate.uci,
    san: candidate.san,
    from: squareName(candidate.from),
    to: squareName(candidate.to),
    ruleId: candidate.ruleId,
    ideaId: candidate.ideaId,
    category: candidate.category,
    tags: candidate.tags,
    reasons: candidate.reasons,
    premises: candidate.premises.map((item) => item.text),
    resultPredicates: candidate.resultPredicates.map((item) => item.text),
    threat: {
      kind: policyThreatKind(candidate.threat.kind),
      payoffPawns: candidate.threat.payoffPawns,
      legalReplies: candidate.threat.replyCount ?? null,
      followUps: (candidate.threat.followUps || candidate.threat.witnesses || []).map((item) => item.san || item.targetRef?.label || item.type)
    },
    score: candidate.score
  };
}

function replySummary(reply) {
  return {
    uci: reply.uci,
    san: reply.san,
    category: reply.predicates.map((item) => item.predicate).join("+") || "reply",
    tags: reply.predicates.map((item) => item.predicate),
    reasons: [reply.reason],
    predicates: reply.predicates.map((item) => item.text),
    expectedContinuation: reply.expectedContinuation
      ? `${reply.expectedContinuation.ruleId}:${reply.expectedContinuation.san}`
      : null
  };
}

/* -------------------------------------------------------------------------- */
/* One-operation human state-machine stepper                                   */
/* -------------------------------------------------------------------------- */

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
    try { game.loadFEN(frame.fen); } catch {}
  }
}

function isForcingMoveSummary(move) {
  if (!move?.uci) return false;
  const text = `${move.san || ""} ${(move.tags || []).join(" ")} ${move.category || ""} ${(move.reasons || []).join(" ")}`;
  return /[+#]/.test(move.san || "") || /check|mate|forcing_counterthreat/i.test(text);
}

function findSingleForcingBlocker(childResults) {
  const choices = [];
  for (const child of childResults || []) {
    const failedMove = child?.move || null;
    const branch = child?.result || null;
    const blocker = branch?.move || null;
    const directSingleReply = ["one_relevant_reply_was_not_proved", "one_defender_reply_holds"].includes(branch?.reason) &&
      Number(branch?.relevantReplyCount || 0) === 1;
    if (failedMove?.ideaId !== "take_material") continue;
    if (!directSingleReply || !isForcingMoveSummary(blocker)) continue;
    choices.push({
      blocker,
      failedMove,
      materialWin: 1,
      payoff: Number(failedMove?.threat?.payoffPawns || 0),
      score: Number(failedMove?.score || 0)
    });
  }
  choices.sort((a, b) => b.materialWin - a.materialWin || b.payoff - a.payoff || b.score - a.score);
  return choices[0] || null;
}

function blockerDisabledBySetup(createGame, afterSetup, blocker, rootSide) {
  const opponent = other(rootSide);
  const same = moveByUci(legalMoveRecords(createGame, afterSetup, opponent), blocker.uci);
  if (!same) return true;
  const originalSan = String(blocker.san || "");
  if (originalSan.includes("x") && !same.captured) return true;
  const afterBlocker = afterMove(createGame, afterSetup, same);
  if (!afterBlocker) return true;
  if (/[+#]/.test(originalSan) && !safeInCheck(afterBlocker, rootSide)) return true;
  return false;
}

function namedThreatAfterSetup(createGame, afterSetup, setupMove, rootSide, policy) {
  const opponent = other(rootSide);
  if (safeInCheck(afterSetup, opponent)) {
    const checkingFacts = checkingMoveFactsForSide(createGame, gameForSide(createGame, afterSetup, rootSide), rootSide, rootSide, policy);
    const fact = checkingFacts.find((item) => item.uci === setupMove.uci) || null;
    const movedPiece = boardOf(afterSetup)[setupMove.to];
    const replies = legalMoveRecords(createGame, afterSetup, opponent);
    return {
      threat: {
        kind: "check",
        priority: threatPriorityScore("check", policy),
        payoffPawns: Math.max(1, PIECE_VALUES[setupMove.captured?.type] || 0),
        checkerRef: movedPiece ? pieceRef(movedPiece, setupMove.to) : null,
        targetRefs: fact?.extraTargets || [],
        replyCount: replies.length,
        legalReplyUcis: replies.map((reply) => reply.uci),
        followUps: []
      },
      predicate: makeObservation("check_available", `repair_check(${setupMove.uci},${replies.length})`, { side: "us", moveUci: setupMove.uci, detail: `${replies.length} legal answer(s)` }),
      text: "gives check",
      score: 900_000 - replies.length * 100
    };
  }

  const rootTurn = gameForSide(createGame, afterSetup, rootSide);
  const mates = mateInOneFactsForSide(createGame, rootTurn, rootSide);
  if (mates.length) {
    return {
      threat: { kind: "mate_in_1", priority: threatPriorityScore("mate_in_1", policy), payoffPawns: 100, followUps: mates.map((mate) => ({ type: "mate", uci: mate.uci, san: mate.san })), witnesses: mates },
      predicate: makeObservation("mate_threat_available", `repair_mate_threat([${mates.map((mate) => mate.san).join(",")}])`, { side: "us", detail: `threatens ${mates.map((mate) => mate.san).join(", ")}` }),
      text: `threatens ${mates.map((mate) => mate.san).join(" or ")}`,
      score: 800_000
    };
  }

  const captures = winningCaptureFactsForSide(createGame, rootTurn, rootSide, rootSide, policy);
  if (captures.length) {
    const fact = captures[0];
    return {
      threat: { kind: "winning_capture", priority: threatPriorityScore("winning_capture", policy), payoffPawns: fact.payoffPawns, attackerRef: fact.attackerRef, targetRef: fact.targetRef, followUps: [{ type: "take_target", uci: fact.uci, san: fact.san }], witnesses: [{ type: "capture_target", uci: fact.uci, san: fact.san }] },
      predicate: makeObservation("winning_capture_available", `repair_material_threat(${fact.san},${fact.targetRef.label})`, { side: "us", moveUci: fact.uci, detail: `${fact.san} reaches the material objective` }),
      text: `threatens ${fact.san}`,
      score: 700_000 + fact.payoffPawns * 100
    };
  }

  const forks = forkFactsForSide(createGame, rootTurn, rootSide, rootSide, policy).filter((fact) => !fact.check);
  if (forks.length) {
    const fact = forks[0];
    return {
      threat: { kind: "fork", priority: threatPriorityScore("fork", policy), payoffPawns: fact.payoffPawns, forkerRef: fact.forkerRef, targetRefs: fact.targets, followUps: fact.targets.map((target) => ({ type: "take_target", from: fact.forkerRef.index, to: target.index, targetRef: target })), witnesses: [] },
      predicate: fact.resultPredicate,
      text: `sets up a double attack on ${fact.targets.map((target) => target.label).join(" and ")}`,
      score: 600_000 + fact.payoffPawns * 100
    };
  }
  return null;
}

function rootRepairCandidates({ createGame, rootFen, rootSide, policy, blocker, alreadyTried = [] }) {
  if (!policy.repair?.enabled || !blocker?.uci) return [];
  const rootGame = cloneGame(createGame, rootFen);
  const tried = new Set(alreadyTried);
  const rule = { id: "repair-once", instruction: `Make ${blocker.san || blocker.uci} unavailable and keep a named threat.`, try: [] };
  const output = [];
  for (const move of legalMoveRecords(createGame, rootGame, rootSide)) {
    if (tried.has(move.uci)) continue;
    const afterSetup = afterMove(createGame, rootGame, move);
    if (!afterSetup || !blockerDisabledBySetup(createGame, afterSetup, blocker, rootSide)) continue;
    const named = namedThreatAfterSetup(createGame, afterSetup, move, rootSide, policy);
    if (!named) continue;
    const san = String(afterSetup.curNode?.san || move.uci).trim();
    output.push(candidateRecord({
      rule,
      idea: "repair_once",
      move,
      san,
      afterFen: afterSetup.exportFEN(),
      premises: [makeObservation("forcing_counterthreat", `only_blocker(${blocker.san || blocker.uci})`, { side: "enemy", detail: `${blocker.san || blocker.uci} was the sole forcing reply` })],
      resultPredicates: [named.predicate],
      threat: { ...named.threat, repairedBlocker: blocker },
      score: named.score,
      reasons: [
        `${blocker.san || blocker.uci} was the sole forcing reply to the material win`,
        `${san} makes that reply unavailable on this branch`,
        named.text
      ],
      tags: ["repair_once", "block_forcing_reply"]
    }));
  }
  output.sort((a, b) => (b.threat.priority || 0) - (a.threat.priority || 0) || b.score - a.score || a.san.localeCompare(b.san));
  return output.slice(0, Math.max(1, Number(policy.repair.maxMoves || 1)));
}

function repeatedPositionCycle(stack, policy) {
  const config = policy.cycles?.perpetualCheck;
  if (!config?.enabled || !stack.length) return null;
  const current = stack[stack.length - 1];
  if (current.depth > config.throughPly) return null;
  const start = Math.max(0, stack.length - Number(config.lookBackPlies || 12));
  const key = normalizedPositionKey(current.fen);
  const matches = stack.slice(start).filter((frame) => normalizedPositionKey(frame.fen) === key);
  if (matches.length < Number(config.repetitions || 3)) return null;
  return { key, repetitions: matches.length };
}

function makeFrame({
  fen,
  depth,
  externalNode = null,
  incomingMove = null,
  activeCandidate = null,
  expectedContinuation = null
}) {
  return {
    fen,
    depth,
    externalNode,
    incomingMove,
    activeCandidate,
    expectedContinuation,
    snapshot: null,
    kind: null,
    stage: "enter",
    phase: "",
    match: null,
    candidates: [],
    replies: [],
    dischargedReplies: [],
    nextIndex: 0,
    childResults: [],
    result: null,
    quietAttempted: false,
    repairAttempted: false,
    repairBlocker: null
  };
}

function framePath(stack) {
  return stack.slice(1).map((frame) => frame.incomingMove?.uci).filter(Boolean);
}

function visibleFrameObservations(frame) {
  return humanVisibleObservations(frame?.snapshot?.predicates || []);
}

function matchedPremiseText(match, snapshot) {
  if (match?.forcing) return "an enabled first-order threat is available";
  const premises = rulePremises(match.rule, snapshot);
  const fallback = (match.rule.when?.all || []).map((item) => item.predicate).join(" + ");
  return premises.length ? premises.map((item) => item.text).join("; ") : fallback || match.rule.id;
}

function finishFrame(frame, frameResult) {
  frame.result = frameResult;
  frame.stage = "done";
}

function aggregateOurFrame(frame) {
  const proven = frame.childResults.find((item) => item.result.status === "proven");
  if (proven) return result("proven", "one_ranked_move_reaches_the_objective", { move: proven.move, child: proven.result });
  const unresolved = frame.childResults.find((item) => item.result.status === "unresolvedLeaf");
  if (unresolved) return result("unresolvedLeaf", "no_move_won_and_at_least_one_line_reached_a_budget", { children: frame.childResults });
  return result("refutedWithinPolicy", "every_ranked_move_was_stopped", { children: frame.childResults });
}

function attachChildResult(parent, child) {
  const item = { move: child.incomingMove?.summary || child.incomingMove || null, result: child.result };
  parent.childResults.push(item);

  if (parent.kind === "our") {
    if (child.result.status === "proven") finishFrame(parent, result("proven", "one_ranked_move_reaches_the_objective", { move: item.move, child: child.result }));
    return;
  }

  if (child.result.status !== "proven") {
    finishFrame(parent, result(child.result.status, "one_defender_reply_holds", {
      move: item.move,
      child: child.result,
      relevantReplyCount: parent.replies.length
    }));
  } else if (parent.nextIndex >= parent.replies.length) {
    finishFrame(parent, result("proven", "every_defender_reply_still_loses", {
      children: parent.childResults,
      alreadyLosingReplies: parent.dischargedReplies.length
    }));
  }
}

export function createReasoner({ createGame, policy = FALLBACK_POLICY, maxSteps = 5000 } = {}) {
  if (typeof createGame !== "function") throw new Error("createReasoner requires createGame");
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
    lastEvent: null,
    repairAttempts: 0
  };

  function start(game) {
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
    state.repairAttempts = 0;
  }

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
    state.repairAttempts = 0;
    if (game) start(game);
  }

  function inspect(game, rootSide = game?.state?.side) {
    return inspectPosition({ createGame, game, rootSide, policy });
  }

  function observeCurrent(game, rootSide = game?.state?.side) {
    return inspect(game, rootSide).predicates;
  }

  function recordEvent(event) {
    state.lastEvent = event;
    state.history.push(event);
    return event;
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

  function step(game) {
    if (!game) throw new Error("reasoner.step(game) requires a ScratchChess game");
    const synchronization = ensureSynchronized(game);

    if (state.status !== "searching") {
      return recordEvent({
        type: "done",
        status: state.status,
        result: state.finalResult,
        log: `Search already ended: ${state.status}. Restart the state machine to search again.`
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
      return recordEvent({ type: "terminal", status: state.status, result: state.finalResult, log: "Search stack is empty." });
    }

    if (frame.stage === "enter") {
      const positionGame = cloneGame(createGame, frame.fen);
      frame.snapshot = basePositionSnapshot({
        createGame,
        game: positionGame,
        rootSide: state.rootSide,
        policy,
        includeMoveFacts: false
      });
      frame.kind = frame.snapshot.sideToMove === state.rootSide ? "our" : "opponent";
      state.nodes += 1;

      if (state.nodes > Number(policy.budget.maxPositions || Infinity)) {
        finishFrame(frame, result("unresolvedLeaf", "position_budget_exhausted", { maxPositions: policy.budget.maxPositions }));
        return recordEvent({
          type: "leaf",
          status: "unresolvedLeaf",
          depth: frame.depth,
          path: framePath(state.stack),
          observations: visibleFrameObservations(frame),
          log: `The configured position budget ${policy.budget.maxPositions} was reached.`
        });
      }

      const cycle = repeatedPositionCycle(state.stack, policy);
      if (cycle) {
        finishFrame(frame, result("refutedWithinPolicy", "perpetual_cycle", { cycle }));
        return recordEvent({
          type: "leaf",
          status: "refutedWithinPolicy",
          depth: frame.depth,
          path: framePath(state.stack),
          observations: visibleFrameObservations(frame),
          cycle,
          log: `The position repeated ${cycle.repetitions} times inside the configured cycle window. The defending side holds.`
        });
      }

      const goal = goalStatus(frame.snapshot, policy);
      if (goal.achieved) {
        finishFrame(frame, result("proven", "objective_proven", { goal }));
        return recordEvent({
          type: "leaf",
          status: "proven",
          depth: frame.depth,
          path: framePath(state.stack),
          observations: visibleFrameObservations(frame),
          goal,
          log: `Objective proven at ply ${frame.depth}: ${goal.detail}.`
        });
      }
      if (goal.terminalFailure) {
        finishFrame(frame, result("refutedWithinPolicy", goal.type, { goal }));
        return recordEvent({
          type: "leaf",
          status: "refutedWithinPolicy",
          depth: frame.depth,
          path: framePath(state.stack),
          observations: visibleFrameObservations(frame),
          goal,
          log: `Terminal non-objective leaf: ${goal.detail}.`
        });
      }
      if (frame.kind === "our" && frame.depth >= policy.budget.maxPlies) {
        finishFrame(frame, result("unresolvedLeaf", "depth_exhausted", { maxPlies: policy.budget.maxPlies }));
        return recordEvent({
          type: "leaf",
          status: "unresolvedLeaf",
          depth: frame.depth,
          path: framePath(state.stack),
          observations: visibleFrameObservations(frame),
          log: `Maximum depth ${policy.budget.maxPlies} reached before the fighting side established the objective.`
        });
      }

      frame.stage = frame.kind === "our" ? "select_rule" : "classify_replies";
      const visible = visibleFrameObservations(frame);
      return recordEvent({
        type: "observe",
        status: "searching",
        restarted: synchronization.restarted,
        depth: frame.depth,
        nodeType: frame.kind,
        path: framePath(state.stack),
        observations: visible,
        comment: `observe ply ${frame.depth}: ${visible.map((item) => item.text).join("; ") || "no visible predicate"}`,
        log: `${synchronization.restarted ? `${synchronization.reason}; ` : ""}Observe ply ${frame.depth}: material state ${frame.snapshot.material.state}; ${visible.length} visible fact(s). Next, answer danger and try threats in order.`
      });
    }

    if (frame.stage === "select_rule") {
      const ruleGame = cloneGame(createGame, frame.fen);
      const forcing = firstOrderThreatCandidates({
        createGame,
        game: ruleGame,
        snapshot: frame.snapshot,
        rootSide: state.rootSide,
        policy,
        depth: frame.depth
      });

      if (forcing.length) {
        frame.match = { rule: threatScanRule(), forcing: true, candidates: forcing, expected: false };
        frame.phase = "forcing";
        frame.stage = "generate_candidates";
        const first = forcing[0];
        return recordEvent({
          type: "state",
          state: frame.snapshot.inCheck ? "answer_danger" : "try_threats",
          status: "searching",
          depth: frame.depth,
          path: framePath(state.stack),
          rule: frame.match.rule,
          observations: visibleFrameObservations(frame),
          candidates: forcing.map(candidateSummary),
          comment: `threat scan: ${forcing.map((item) => `${item.san}[${item.ideaId}]`).join("; ")}`,
          log: `${frame.snapshot.inCheck ? "Our king is in check. " : ""}Threat scan found ${forcing.length} move(s), ranked by forcing class. First: ${first.san} [${first.ideaId}].`
        });
      }

      const immediateDanger = frame.snapshot.sideToMove === state.rootSide && frame.snapshot.opponentMateInOneFacts.length > 0;
      if (immediateDanger) {
        finishFrame(frame, result("refutedWithinPolicy", "opponent_mate_in_one_not_removed", {
          mates: frame.snapshot.opponentMateInOneFacts.map((fact) => fact.san)
        }));
        return recordEvent({
          type: "state",
          state: "answer_danger",
          status: "refutedWithinPolicy",
          depth: frame.depth,
          path: framePath(state.stack),
          observations: visibleFrameObservations(frame),
          log: `The defending side threatens mate in one (${frame.snapshot.opponentMateInOneFacts.map((fact) => fact.san).join(", ")}), and no enabled move removes every mate.`
        });
      }

      if (frame.snapshot.inCheck) {
        finishFrame(frame, result("refutedWithinPolicy", "check_answer_does_not_continue_the_objective"));
        return recordEvent({
          type: "state",
          state: "answer_danger",
          status: "refutedWithinPolicy",
          depth: frame.depth,
          path: framePath(state.stack),
          observations: visibleFrameObservations(frame),
          log: "The check can be answered legally, but no ranked answer continues the tactical objective. The defending side holds this line."
        });
      }

      frame.snapshot.predicates.push(makeObservation(
        "quiet",
        `quiet(${frame.snapshot.sideToMove})`,
        { side: roleFor(frame.snapshot.sideToMove, state.rootSide), detail: policy.threats.quietWhen }
      ));
      frame.snapshot.predicates = dedupeObservations(frame.snapshot.predicates);
      frame.quietAttempted = true;
      frame.match = matchingRule({
        createGame,
        game: ruleGame,
        snapshot: frame.snapshot,
        policy,
        rootSide: state.rootSide,
        expectedContinuation: frame.expectedContinuation
      });
      if (!frame.match) {
        finishFrame(frame, result("unresolvedLeaf", "quiet_without_matching_rule", {
          predicates: visibleFrameObservations(frame).map((item) => item.text)
        }));
        return recordEvent({
          type: "state",
          state: "quiet",
          status: "unresolvedLeaf",
          depth: frame.depth,
          path: framePath(state.stack),
          observations: visibleFrameObservations(frame),
          log: "Every enabled first-order try was stopped, and no quiet position rule matches. Stop this branch."
        });
      }
      frame.phase = "quiet";
      frame.stage = "generate_candidates";
      const premiseText = matchedPremiseText(frame.match, frame.snapshot);
      return recordEvent({
        type: "state",
        state: frame.match.rule.id === "answer-check" ? "answer_danger" : "quiet",
        status: "searching",
        depth: frame.depth,
        path: framePath(state.stack),
        rule: frame.match.rule,
        observations: visibleFrameObservations(frame),
        comment: `state ${frame.match.rule.id}: ${premiseText}`,
        log: `Threats are exhausted. I see ${premiseText}. Apply ${frame.match.rule.id}: ${frame.match.rule.instruction}`
      });
    }

    if (frame.stage === "generate_candidates") {
      const positionGame = cloneGame(createGame, frame.fen);
      const alreadyTried = new Set(frame.childResults.map((item) => item.move?.uci).filter(Boolean));
      frame.candidates = generateCandidates({
        createGame,
        game: positionGame,
        snapshot: frame.snapshot,
        rootSide: state.rootSide,
        policy,
        match: frame.match,
        expectedContinuation: frame.expectedContinuation,
        depth: frame.depth
      }).filter((candidate) => !alreadyTried.has(candidate.uci));
      frame.nextIndex = 0;
      frame.stage = "candidate_children";

      if (!frame.candidates.length) {
        const dangerState = frame.snapshot.inCheck || frame.snapshot.opponentMateInOneFacts.length > 0;
        finishFrame(frame, result(dangerState ? "refutedWithinPolicy" : "unresolvedLeaf", "state_has_no_move", { stateId: frame.match.rule.id }));
        return recordEvent({
          type: "candidates",
          status: dangerState ? "refutedWithinPolicy" : "unresolvedLeaf",
          depth: frame.depth,
          path: framePath(state.stack),
          observations: visibleFrameObservations(frame),
          log: `State ${frame.match.rule.id} matched, but no legal move carries out the instruction and continues the objective.`
        });
      }

      const summaries = frame.candidates.map(candidateSummary);
      return recordEvent({
        type: "candidates",
        status: "searching",
        depth: frame.depth,
        path: framePath(state.stack),
        candidates: summaries,
        observations: visibleFrameObservations(frame),
        comment: `state candidates: ${summaries.map((item) => `${item.san}[${item.ideaId}]`).join("; ")}`,
        log: `State ${frame.match.rule.id} produced ${summaries.length} move(s) in ranked order. First: ${summaries[0].san} [${summaries[0].ideaId}].`
      });
    }

    if (frame.stage === "classify_replies") {
      if (!frame.activeCandidate) {
        finishFrame(frame, result("refutedWithinPolicy", "defender_node_without_active_threat"));
        return recordEvent({ type: "error", status: "refutedWithinPolicy", depth: frame.depth, log: "The defending side reached a node with no stated threat to answer. The fighting line is not established." });
      }
      const positionGame = cloneGame(createGame, frame.fen);
      const classification = classifyOpponentReplies({
        createGame,
        game: positionGame,
        candidate: frame.activeCandidate,
        rootSide: state.rootSide,
        policy,
        depth: frame.depth
      });
      frame.replies = classification.relevant;
      frame.dischargedReplies = classification.discharged;
      frame.nextIndex = 0;
      frame.stage = "reply_children";

      if (classification.truncated) {
        finishFrame(frame, result("unresolvedLeaf", "defender_reply_budget_exhausted", {
          kept: frame.replies.map(replySummary),
          overflow: classification.overflow
        }));
        return recordEvent({
          type: "replies",
          status: "unresolvedLeaf",
          depth: frame.depth,
          path: framePath(state.stack),
          replies: frame.replies.map(replySummary),
          dischargedReplies: classification.discharged.map(replySummary),
          log: `The defender has more than ${maxDefenderReplies(policy)} relevant replies. The reply budget ends this branch without a result.`
        });
      }

      if (classification.refutations.length) {
        finishFrame(frame, result("refutedWithinPolicy", "legal_reply_stops_the_stated_idea", {
          refutations: classification.refutations.map(replySummary)
        }));
        return recordEvent({
          type: "replies",
          status: "refutedWithinPolicy",
          depth: frame.depth,
          path: framePath(state.stack),
          replies: classification.relevant.map(replySummary),
          dischargedReplies: classification.discharged.map(replySummary),
          refutations: classification.refutations.map(replySummary),
          log: `${policyThreatKind(frame.activeCandidate.threat.kind)} failed: ${classification.refutations.length} legal defender reply/replies stop the stated idea and do not leave the objective.`
        });
      }

      if (!frame.replies.length) {
        finishFrame(frame, result("proven", "every_legal_reply_loses_to_stated_follow_up", {
          alreadyLosing: classification.discharged.map(replySummary)
        }));
        return recordEvent({
          type: "replies",
          status: "proven",
          depth: frame.depth,
          path: framePath(state.stack),
          replies: [],
          dischargedReplies: classification.discharged.map(replySummary),
          log: `All ${classification.total} legal defender replies leave the stated winning follow-up. No extra reply position is explored.`
        });
      }

      if (frame.depth >= policy.budget.maxPlies) {
        finishFrame(frame, result("unresolvedLeaf", "depth_exhausted_with_relevant_replies", { replies: frame.replies.map(replySummary) }));
        return recordEvent({
          type: "replies",
          status: "unresolvedLeaf",
          depth: frame.depth,
          path: framePath(state.stack),
          replies: frame.replies.map(replySummary),
          dischargedReplies: classification.discharged.map(replySummary),
          log: `${frame.replies.length} relevant defender reply/replies remain at the depth boundary.`
        });
      }

      return recordEvent({
        type: "replies",
        status: "searching",
        depth: frame.depth,
        path: framePath(state.stack),
        replies: frame.replies.map(replySummary),
        dischargedReplies: classification.discharged.map(replySummary),
        totalMoves: classification.total,
        comment: `relevant replies: ${frame.replies.map((item) => `${item.san}[${item.reason}]`).join("; ")}`,
        log: `Of ${classification.total} legal defender replies, ${classification.discharged.length} already lose to the stated follow-up. Explore only the ${frame.replies.length} replies that answer the threat or create a forcing counterattack.`
      });
    }

    if (frame.stage === "candidate_children") {
      if (frame.result) {
        frame.stage = "done";
        return recordEvent({ type: "aggregate", status: frame.result.status, depth: frame.depth, result: frame.result, log: `The fighting-side move state resolved ${frame.result.status}: ${frame.result.reason}.` });
      }

      // A human does not need to finish every lower-priority root idea before
      // noticing that a strong material win failed to one forcing reply. Insert
      // the one allowed repair immediately after that failure, then resume the
      // remaining ranked threats if the repair also fails.
      if (
        frame.phase === "forcing" &&
        frame.depth === 0 &&
        policy.repair?.enabled &&
        !frame.repairAttempted &&
        state.repairAttempts < Number(policy.repair.attempts || 0) &&
        frame.childResults.length
      ) {
        const latest = frame.childResults[frame.childResults.length - 1];
        const finding = findSingleForcingBlocker([latest]);
        if (finding?.blocker) {
          const tried = frame.childResults.map((item) => item.move?.uci).filter(Boolean);
          const repairs = rootRepairCandidates({
            createGame,
            rootFen: state.rootFen,
            rootSide: state.rootSide,
            policy,
            blocker: finding.blocker,
            alreadyTried: tried
          });
          if (repairs.length) {
            frame.repairAttempted = true;
            frame.repairBlocker = finding.blocker;
            state.repairAttempts += 1;
            frame.candidates.splice(frame.nextIndex, 0, ...repairs);
            return recordEvent({
              type: "repair",
              state: "repair_once",
              status: "searching",
              depth: 0,
              blocker: finding.blocker,
              failedMove: finding.failedMove,
              candidates: repairs.map(candidateSummary),
              comment: `repair once: stop ${finding.blocker.san || finding.blocker.uci}`,
              log: `${finding.failedMove?.san || "The material win"} failed only to ${finding.blocker.san || finding.blocker.uci}. Before trying lower-priority ideas, try ${repairs.length} root move(s) that make that reply unavailable and keep a named threat. First: ${repairs[0].san}.`
            });
          }
        }
      }

      if (frame.nextIndex >= frame.candidates.length) {
        const forcingPhaseEnded = frame.phase === "forcing";

        // Fallback: if the decisive one-reply failure was discovered only after
        // the forcing list ended, append the repair moves rather than replacing
        // the list. This preserves the state-machine order and the search trace.
        if (forcingPhaseEnded && frame.depth === 0 && policy.repair?.enabled && !frame.repairAttempted && state.repairAttempts < Number(policy.repair.attempts || 0)) {
          const finding = findSingleForcingBlocker(frame.childResults);
          if (finding?.blocker) {
            const tried = frame.childResults.map((item) => item.move?.uci).filter(Boolean);
            const repairs = rootRepairCandidates({
              createGame,
              rootFen: state.rootFen,
              rootSide: state.rootSide,
              policy,
              blocker: finding.blocker,
              alreadyTried: tried
            });
            if (repairs.length) {
              frame.repairAttempted = true;
              frame.repairBlocker = finding.blocker;
              state.repairAttempts += 1;
              frame.candidates.push(...repairs);
              return recordEvent({
                type: "repair",
                state: "repair_once",
                status: "searching",
                depth: 0,
                blocker: finding.blocker,
                failedMove: finding.failedMove,
                candidates: repairs.map(candidateSummary),
                comment: `repair once: stop ${finding.blocker.san || finding.blocker.uci}`,
                log: `${finding.failedMove?.san || "The material win"} failed only to ${finding.blocker.san || finding.blocker.uci}. Try ${repairs.length} root move(s) that make that reply unavailable and keep a named threat. First: ${repairs[0].san}.`
              });
            }
          }
        }

        if (forcingPhaseEnded && !frame.quietAttempted && !frame.snapshot.inCheck && !frame.snapshot.opponentMateInOneFacts.length) {
          frame.quietAttempted = true;
          frame.snapshot.predicates.push(makeObservation(
            "quiet",
            `quiet(${frame.snapshot.sideToMove})`,
            { side: roleFor(frame.snapshot.sideToMove, state.rootSide), detail: policy.threats.quietWhen }
          ));
          frame.snapshot.predicates = dedupeObservations(frame.snapshot.predicates);
          const quietGame = cloneGame(createGame, frame.fen);
          const quietMatch = matchingRule({
            createGame,
            game: quietGame,
            snapshot: frame.snapshot,
            policy,
            rootSide: state.rootSide,
            expectedContinuation: frame.expectedContinuation
          });
          if (quietMatch && quietMatch.rule.id !== "answer-check") {
            frame.match = quietMatch;
            frame.phase = "quiet";
            frame.stage = "generate_candidates";
            const premiseText = matchedPremiseText(quietMatch, frame.snapshot);
            return recordEvent({
              type: "state",
              state: "quiet",
              status: "searching",
              depth: frame.depth,
              path: framePath(state.stack),
              rule: quietMatch.rule,
              observations: visibleFrameObservations(frame),
              comment: `quiet after threats: ${premiseText}`,
              log: `Every ranked first-order move was stopped. Now use the quiet rule ${quietMatch.rule.id}: ${quietMatch.rule.instruction}`
            });
          }
        }

        finishFrame(frame, aggregateOurFrame(frame));
        const repairText = frame.repairAttempted
          ? frame.repairBlocker
            ? ` One repair pass looked for a root move that stops ${frame.repairBlocker.san || frame.repairBlocker.uci}.`
            : " One repair pass found no single forcing blocker attached to a material win."
          : "";
        return recordEvent({ type: "aggregate", status: frame.result.status, depth: frame.depth, result: frame.result, log: `State ${frame.match?.rule?.id || frame.phase || "moves"} exhausted its ranked moves: ${frame.result.status}.${repairText}` });
      }

      const candidate = frame.candidates[frame.nextIndex++];
      syncGameToFrame(game, frame);
      if (!applyMoveUCI(game, candidate.uci)) {
        finishFrame(frame, result("refutedWithinPolicy", "scratchchess_rejected_candidate", { move: candidateSummary(candidate) }));
        state.expectedFen = game.exportFEN();
        return recordEvent({ type: "error", status: "searching", move: candidateSummary(candidate), log: `ScratchChess rejected candidate ${candidate.uci}.` });
      }

      const afterFen = game.exportFEN();
      const summary = candidateSummary(candidate);
      const child = makeFrame({
        fen: afterFen,
        depth: frame.depth + 1,
        externalNode: game.curNode || null,
        incomingMove: { ...summary, summary },
        activeCandidate: candidate
      });
      state.stack.push(child);
      state.expectedFen = afterFen;

      return recordEvent({
        type: "play",
        status: "searching",
        depth: child.depth,
        nodeType: "our",
        path: framePath(state.stack),
        move: summary,
        playedMove: summary,
        comment: `state ${candidate.ruleId}; observations: ${summary.premises.join("; ")}; result: ${summary.resultPredicates.join("; ")}; threat: ${policyThreatKind(candidate.threat.kind)}`,
        log: `Played ${candidate.san}. ${candidate.reasons.join(" ")} Active threat: ${policyThreatKind(candidate.threat.kind)}.`
      });
    }

    if (frame.stage === "reply_children") {
      if (frame.result) {
        frame.stage = "done";
        return recordEvent({ type: "aggregate", status: frame.result.status, depth: frame.depth, result: frame.result, log: `The defender-reply state resolved ${frame.result.status}: ${frame.result.reason}.` });
      }
      if (frame.nextIndex >= frame.replies.length) {
        finishFrame(frame, result("proven", "every_defender_reply_still_loses", {
          children: frame.childResults,
          alreadyLosingReplies: frame.dischargedReplies.length
        }));
        return recordEvent({ type: "aggregate", status: "proven", depth: frame.depth, result: frame.result, log: `Every relevant defender reply still reaches the objective; ${frame.dischargedReplies.length} other legal replies already lose to the stated follow-up.` });
      }

      const reply = frame.replies[frame.nextIndex++];
      syncGameToFrame(game, frame);
      if (!applyMoveUCI(game, reply.uci)) {
        finishFrame(frame, result("refutedWithinPolicy", "scratchchess_rejected_reply", { move: replySummary(reply) }));
        state.expectedFen = game.exportFEN();
        return recordEvent({ type: "error", status: "searching", move: replySummary(reply), log: `ScratchChess rejected defender reply ${reply.uci}.` });
      }

      const afterFen = game.exportFEN();
      const summary = replySummary(reply);
      const child = makeFrame({
        fen: afterFen,
        depth: frame.depth + 1,
        externalNode: game.curNode || null,
        incomingMove: { ...summary, summary },
        expectedContinuation: reply.expectedContinuation
      });
      state.stack.push(child);
      state.expectedFen = afterFen;

      return recordEvent({
        type: "play",
        status: "searching",
        depth: child.depth,
        nodeType: "opponent",
        path: framePath(state.stack),
        move: summary,
        playedMove: summary,
        comment: `defender reply: ${summary.predicates.join("; ")}; ${reply.reason}`,
        log: `Played defender reply ${reply.san}: ${reply.reason}. Rescan the resulting position.`
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
          log: `Threats-first state machine ended ${state.status} after ${state.nodes} explored position(s): ${state.finalResult.reason}.`
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
        move: child.incomingMove?.summary || child.incomingMove,
        childResult: child.result,
        observations: visibleFrameObservations(parent),
        log: `Backtracked from ${child.incomingMove?.san || child.incomingMove?.uci || "child"}: ${child.result.status} (${child.result.reason}).`
      });
    }

    frame.stage = "enter";
    return recordEvent({ type: "repair_stage", status: "searching", log: "Unknown state repaired by returning to observation." });
  }

  function preview(game, { maxCandidates = 8 } = {}) {
    const rootSide = normalizeColor(game.state.side);
    const snapshot = basePositionSnapshot({ createGame, game, rootSide, policy, includeMoveFacts: false });
    const goal = goalStatus(snapshot, policy);
    let match = null;
    let candidates = [];
    let stateName = "observe";

    if (!goal.achieved) {
      candidates = firstOrderThreatCandidates({ createGame, game, snapshot, rootSide, policy, depth: 0 }).slice(0, maxCandidates);
      if (candidates.length) {
        match = { rule: threatScanRule(), forcing: true, candidates };
        stateName = snapshot.inCheck || snapshot.opponentMateInOneFacts.length ? "answer_danger" : "try_threats";
      } else if (!snapshot.inCheck && !snapshot.opponentMateInOneFacts.length) {
        snapshot.predicates.push(makeObservation("quiet", `quiet(${snapshot.sideToMove})`, { side: "us", detail: policy.threats.quietWhen }));
        snapshot.predicates = dedupeObservations(snapshot.predicates);
        match = matchingRule({ createGame, game, snapshot, policy, rootSide, expectedContinuation: null });
        candidates = match ? generateCandidates({ createGame, game, snapshot, rootSide, policy, match, depth: 0 }).slice(0, maxCandidates) : [];
        stateName = "quiet";
      } else {
        stateName = "answer_danger";
      }
    }

    const visible = humanVisibleObservations(snapshot.predicates);
    const enemyLoose = snapshot.loose.filter((item) => item.side === "enemy");
    const steps = [
      `Root FEN: ${snapshot.fen}`,
      `Observe: material state ${snapshot.material.state}; ${visible.map((item) => item.text).join("; ") || "no visible board fact"}.`,
      goal.achieved
        ? `Objective already reached: ${goal.detail}.`
        : stateName === "answer_danger" && snapshot.opponentMateInOneFacts.length && !candidates.length
          ? `Danger: the defender threatens ${snapshot.opponentMateInOneFacts.map((fact) => fact.san).join(", ")}; no enabled move removes every mate.`
          : match?.forcing
            ? `State try_threats: ${candidates.length} ranked first-order move(s). If all are stopped, enter quiet.`
            : match
              ? `State quiet: ${match.rule.instruction}`
              : "No state has an allowed move; stop this branch.",
      enemyLoose.length ? `Enemy loose pieces: ${enemyLoose.map((item) => item.pieceRef.label).join(", ")}.` : "No enemy loose piece.",
      candidates.length ? `Moves in order: ${candidates.map((candidate) => `${candidate.san} [${candidate.ideaId}]`).join("; ")}.` : "No move entered the configured search."
    ];
    return {
      type: "policy_preview",
      status: goal.achieved ? "proven" : candidates.length ? "searching" : "inconclusive",
      state: stateName,
      policy,
      snapshot,
      rule: match?.rule || null,
      observations: visible,
      candidates: candidates.map(candidateSummary),
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

export function runOnePass({ createGame, game, policy = FALLBACK_POLICY, maxCandidates = 8 } = {}) {
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
  return createReasoner({ createGame, policy }).preview(game, { maxCandidates });
}

export function describeAlgorithm(policy = FALLBACK_POLICY) {
  assertPolicy(policy);
  const states = new Map(policy.stateMachine.states.map((state) => [state.id, state.instruction]));
  return [
    `${policy.name} (${policy.version})`,
    "",
    `OBSERVE — ${states.get("observe")}`,
    `ANSWER DANGER — ${states.get("answer_danger")}`,
    `TRY THREATS — ${states.get("try_threats")}`,
    `TEST THE DEFENDER — ${states.get("test_defender")}`,
    `QUIET — ${states.get("quiet")}`,
    `REPAIR ONCE — ${states.get("repair_once")}`,
    "",
    `Threat order: ${policy.threats.priority.join(" > ")}.`,
    `Check order: ${policy.threats.checkOrder.join(" > ")}.`,
    `Defender reply order: ${policy.threats.defenderReplyOrder.join(" > ")}.`,
    `Search limits: ${policy.budget.maxPlies} plies, ${policy.budget.maxMovesPerState} moves per state, ${policy.budget.maxDefenderReplies} defender replies, ${policy.budget.maxPositions} positions.`,
    `Quiet rules: ${policy.rules.map((rule) => `${rule.id} — ${rule.instruction}`).join(" | ")}.`
  ].join("\n");
}

export function predicateCatalog() {
  return PREDICATE_CATALOG.map((item) => ({ ...item }));
}

export const ALGO = Object.freeze({
  version: "3.0.0",
  policyVersion: POLICY_VERSION,
  policyUrl: DEFAULT_POLICY_URL,
  mode: "threats-first-human-state-machine",
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
    attacksSquare,
    attackersOf,
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
