/**
 * Predicate Chess — actual bounded solver.
 *
 * ScratchChess owns FEN parsing, legality, SAN, make/undo and the variation
 * tree. This module observes predicates, scores current legal moves from the
 * policy's fitted predicate tree, verifies every opponent reply through a
 * named closure or a LIVE branch, and emits CTT/1 events.
 *
 * The runtime contains no puzzle FEN table, exercise identifiers, expected
 * moves, expected traces or answer replay path.
 */

export const DEFAULT_POLICY_URL = "https://priyomes.com/policy.json";
export const POLICY_VERSION = "predicate-chess-policy/v3";

const FILES = "abcdefgh";
const PROMOTIONS = Object.freeze(["q", "r", "b", "n"]);
const VALUES = Object.freeze({ p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 });
const TYPE_NAMES = Object.freeze({ p: "pawn", n: "knight", b: "bishop", r: "rook", q: "queen", k: "king" });
const TYPES = Object.freeze(["p", "n", "b", "r", "q", "k"]);
const idx = (file, rank) => (7 - rank) * 8 + file;
const FR = (index) => [index % 8, 7 - Math.floor(index / 8)];
const inBounds = (file, rank) => file >= 0 && file < 8 && rank >= 0 && rank < 8;
const other = (color) => color === "w" ? "b" : "w";
const normalizeColor = (color) => color === "b" ? "b" : "w";

function squareName(index) {
  const [file, rank] = FR(index);
  return `${FILES[file]}${rank + 1}`;
}

function normalizeFen(fen) {
  return String(fen || "").trim().split(/\s+/).slice(0, 4).join(" ");
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

function pieceName(piece, index = null) {
  if (!piece) return "piece";
  const name = TYPE_NAMES[piece.type] || "piece";
  return index == null ? name : `${name} on ${squareName(index)}`;
}

function cloneGame(createGame, gameOrFen) {
  const game = createGame({ Event: "Predicate Chess analysis", Site: "algo.js" });
  game.loadFEN(typeof gameOrFen === "string" ? gameOrFen : gameOrFen.exportFEN());
  return game;
}

function safeInCheck(game, color) {
  try { return Boolean(game?._isInCheck?.(color)); } catch { return false; }
}

function moveNeedsPromotion(game, from, to) {
  const piece = boardOf(game)[from];
  if (!piece || piece.type !== "p") return false;
  const [, rank] = FR(to);
  return (piece.color === "w" && rank === 7) || (piece.color === "b" && rank === 0);
}

export function legalMoveRecords(game) {
  const side = normalizeColor(game?.state?.side);
  let raw = [];
  try { raw = game?._allLegalMoves?.(side) || []; } catch { raw = []; }
  const output = [];
  for (const item of raw) {
    const from = Number(item?.from ?? item?.fromSq ?? item?.source);
    const to = Number(item?.to ?? item?.toSq ?? item?.target);
    if (!Number.isInteger(from) || !Number.isInteger(to)) continue;
    const promotions = moveNeedsPromotion(game, from, to) ? PROMOTIONS : [""];
    for (const promotion of promotions) {
      output.push({
        from,
        to,
        promotion,
        uci: `${squareName(from)}${squareName(to)}${promotion}`,
        mover: boardOf(game)[from] || null,
        captured: boardOf(game)[to] || null
      });
    }
  }
  const seen = new Set();
  return output.filter((move) => !seen.has(move.uci) && seen.add(move.uci));
}

function applyMove(createGame, game, move) {
  const clone = cloneGame(createGame, game);
  const uci = typeof move === "string" ? move : move.uci;
  if (!clone.makeMoveUCI(uci)) return null;
  if (clone.state?.pendingPromotion) {
    const promotion = (typeof move === "string" ? move[4] : move.promotion) || "q";
    clone.resolvePendingPromotion(String(promotion).toUpperCase());
  }
  return clone;
}

function applyMoveInPlace(game, uci) {
  if (!game.makeMoveUCI(uci)) return false;
  if (game.state?.pendingPromotion) game.resolvePendingPromotion(String(uci[4] || "q").toUpperCase());
  return true;
}

function terminalInfo(game) {
  const moves = legalMoveRecords(game);
  if (moves.length) return null;
  const side = normalizeColor(game.state.side);
  if (safeInCheck(game, side)) return { kind: "mate", winner: other(side), loser: side };
  return { kind: "stalemate", winner: null, loser: null };
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
  const df = toFile - fromFile;
  const dr = toRank - fromRank;
  const af = Math.abs(df);
  const ar = Math.abs(dr);
  if (piece.type === "p") return af === 1 && dr === (piece.color === "w" ? 1 : -1);
  if (piece.type === "n") return (af === 1 && ar === 2) || (af === 2 && ar === 1);
  if (piece.type === "k") return Math.max(af, ar) === 1;
  if ((piece.type === "b" || piece.type === "q") && af === ar && af > 0) {
    return clearLine(board, from, to, Math.sign(df), Math.sign(dr));
  }
  if ((piece.type === "r" || piece.type === "q") && ((df === 0 && ar > 0) || (dr === 0 && af > 0))) {
    return clearLine(board, from, to, Math.sign(df), Math.sign(dr));
  }
  return false;
}

function attackersOf(game, target, color) {
  const board = boardOf(game);
  const output = [];
  for (let from = 0; from < 64; from += 1) {
    const piece = board[from];
    if (!piece || piece.color !== color) continue;
    if (attacksSquare(board, from, target)) output.push(from);
  }
  return output;
}

function targetStats(game, index) {
  const piece = boardOf(game)[index];
  if (!piece) return { attackers: [], defenders: [], pawnDefenders: [], loose: false, hanging: false, soleDefender: null };
  const attackers = attackersOf(game, index, other(piece.color));
  const defenders = attackersOf(game, index, piece.color).filter((from) => from !== index);
  const pawnDefenders = defenders.filter((from) => boardOf(game)[from]?.type === "p");
  return {
    attackers,
    defenders,
    pawnDefenders,
    loose: piece.type !== "k" && attackers.length > 0 && pawnDefenders.length === 0,
    hanging: piece.type !== "k" && attackers.length > defenders.length,
    soleDefender: defenders.length === 1 ? defenders[0] : null
  };
}

function material(game, side) {
  let total = 0;
  for (const piece of boardOf(game)) if (piece) total += (piece.color === side ? 1 : -1) * (VALUES[piece.type] || 0);
  return total;
}

function kingIndex(game, color) {
  return boardOf(game).findIndex((piece) => piece?.color === color && piece.type === "k");
}

function kingMobility(game, color) {
  const board = boardOf(game);
  const king = kingIndex(game, color);
  if (king < 0) return 0;
  const [file, rank] = FR(king);
  let count = 0;
  for (let df = -1; df <= 1; df += 1) {
    for (let dr = -1; dr <= 1; dr += 1) {
      if (!df && !dr) continue;
      const f = file + df;
      const r = rank + dr;
      if (!inBounds(f, r)) continue;
      const target = idx(f, r);
      if (board[target]?.color === color) continue;
      if (!attackersOf(game, target, other(color)).length) count += 1;
    }
  }
  return count;
}

function attackMap(game, color) {
  const map = new Map();
  const board = boardOf(game);
  for (let target = 0; target < 64; target += 1) {
    const piece = board[target];
    if (!piece || piece.color === color || piece.type === "k") continue;
    const attackers = attackersOf(game, target, color);
    if (attackers.length) map.set(target, new Set(attackers));
  }
  return map;
}

function movedTargets(game, from, color) {
  const board = boardOf(game);
  const output = [];
  for (let target = 0; target < 64; target += 1) {
    const piece = board[target];
    if (!piece || piece.color === color || piece.type === "k") continue;
    if (attacksSquare(board, from, target)) output.push({ index: target, piece, value: VALUES[piece.type] || 0 });
  }
  return output.sort((a, b) => b.value - a.value || a.index - b.index);
}

function pinFacts(game, attackingColor) {
  const board = boardOf(game);
  const directions = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
  const output = [];
  const victimColor = other(attackingColor);
  const king = kingIndex(game, victimColor);
  if (king < 0) return output;
  const [kf, kr] = FR(king);
  for (const [df, dr] of directions) {
    let file = kf + df;
    let rank = kr + dr;
    let middle = -1;
    while (inBounds(file, rank)) {
      const current = idx(file, rank);
      const piece = board[current];
      if (!piece) { file += df; rank += dr; continue; }
      if (middle < 0) {
        if (piece.color === victimColor && piece.type !== "k") { middle = current; file += df; rank += dr; continue; }
        break;
      }
      const diagonal = Math.abs(df) === 1 && Math.abs(dr) === 1;
      if (piece.color === attackingColor && (piece.type === "q" || (diagonal ? piece.type === "b" : piece.type === "r"))) {
        output.push({ attacker: current, pinned: middle, king, value: VALUES[board[middle]?.type] || 0 });
      }
      break;
    }
  }
  return output;
}

function alignmentMembership(game, index) {
  const board = boardOf(game);
  const directions = [[1,0],[0,1],[1,1],[1,-1]];
  let count = 0;
  for (const [df, dr] of directions) {
    const [startFile, startRank] = FR(index);
    let file = startFile;
    let rank = startRank;
    while (inBounds(file - df, rank - dr)) { file -= df; rank -= dr; }
    const occupied = [];
    while (inBounds(file, rank)) {
      const current = idx(file, rank);
      if (board[current]) occupied.push(current);
      file += df;
      rank += dr;
    }
    if (occupied.length >= 3 && occupied.includes(index)) count += 1;
  }
  return count;
}

function threePieceAlignments(game) {
  const board = boardOf(game);
  const output = [];
  const directions = [[1,0],[0,1],[1,1],[1,-1]];
  for (const [df, dr] of directions) {
    for (let file = 0; file < 8; file += 1) {
      for (let rank = 0; rank < 8; rank += 1) {
        if (inBounds(file - df, rank - dr)) continue;
        const occupied = [];
        let f = file, r = rank;
        while (inBounds(f, r)) {
          const current = idx(f, r);
          if (board[current]) occupied.push(current);
          f += df; r += dr;
        }
        for (let i = 0; i + 2 < occupied.length; i += 1) {
          const triple = occupied.slice(i, i + 3);
          const [front, middle, back] = triple.map((sq) => board[sq]);
          if (!front || !middle || !back || front.color === back.color) continue;
          const lineWouldAttack = (() => {
            const clone = board.slice(); clone[triple[1]] = null;
            return attacksSquare(clone, triple[0], triple[2]) || attacksSquare(clone, triple[2], triple[0]);
          })();
          if (lineWouldAttack) output.push({ squares: triple, pieces: [front, middle, back] });
        }
      }
    }
  }
  return output;
}

function passedPawnFacts(game) {
  const board = boardOf(game);
  const output = [];
  for (let index = 0; index < 64; index += 1) {
    const piece = board[index];
    if (!piece || piece.type !== "p") continue;
    const [file, rank] = FR(index);
    let blocked = false;
    for (let f = Math.max(0, file - 1); f <= Math.min(7, file + 1); f += 1) {
      for (let r = rank + (piece.color === "w" ? 1 : -1); inBounds(f, r); r += piece.color === "w" ? 1 : -1) {
        const otherPawn = board[idx(f, r)];
        if (otherPawn?.color === other(piece.color) && otherPawn.type === "p") { blocked = true; break; }
      }
      if (blocked) break;
    }
    if (!blocked) output.push({ index, piece, distance: piece.color === "w" ? 7 - rank : rank });
  }
  return output;
}

const mate1Cache = new Map();
let scoredPositionCache = new Map();
function gameForSide(createGame, game, side) {
  if (game.state.side === side) return game;
  const fields = game.exportFEN().trim().split(/\s+/);
  fields[1] = side;
  fields[3] = "-";
  return cloneGame(createGame, fields.join(" "));
}

function mateInOneFacts(createGame, game, side = game.state.side) {
  const analysisGame = gameForSide(createGame, game, side);
  const key = `${normalizeFen(analysisGame.exportFEN())}|${side}`;
  if (mate1Cache.has(key)) return mate1Cache.get(key);
  const output = [];
  for (const move of legalMoveRecords(analysisGame)) {
    const after = applyMove(createGame, analysisGame, move);
    const terminal = after && terminalInfo(after);
    if (terminal?.kind === "mate" && terminal.winner === side) {
      output.push({ move, after, san: String(after.curNode?.san || move.uci).trim() });
    }
  }
  mate1Cache.set(key, output);
  return output;
}

function newAttackFacts(before, after, moverColor, movedTo) {
  const beforeMap = attackMap(before, moverColor);
  const afterMap = attackMap(after, moverColor);
  const facts = [];
  for (const [target, sources] of afterMap.entries()) {
    const previous = beforeMap.get(target) || new Set();
    const newSources = [...sources].filter((source) => !previous.has(source));
    if (!newSources.length) continue;
    const piece = boardOf(after)[target];
    facts.push({
      target,
      piece,
      value: VALUES[piece?.type] || 0,
      discovered: newSources.some((source) => source !== movedTo),
      sources: newSources
    });
  }
  return facts;
}

function featureRecord(createGame, game, move, rootSide) {
  const side = normalizeColor(game.state.side);
  const board = boardOf(game);
  const mover = board[move.from];
  const captured = board[move.to];
  const beforeMaterial = material(game, rootSide);
  const beforePins = pinFacts(game, side);
  const beforeEnemyMobility = kingMobility(game, other(side));
  const beforeOwnMobility = kingMobility(game, side);
  const fromStats = targetStats(game, move.from);
  const toStats = targetStats(game, move.to);
  const fromAlignment = alignmentMembership(game, move.from);
  const toAlignment = alignmentMembership(game, move.to);
  const after = applyMove(createGame, game, move);
  if (!after) return null;
  const san = String(after.curNode?.san || move.uci).trim();
  const terminal = terminalInfo(after);
  const check = safeInCheck(after, other(side));
  const replies = legalMoveRecords(after).length;
  const afterMaterial = material(after, rootSide);
  const targets = movedTargets(after, move.to, side);
  const newAttacks = newAttackFacts(game, after, side, move.to);
  const afterPins = pinFacts(after, side);
  const valuableTargets = targets.filter((target) => target.value >= 3);
  const fork = Number((check && valuableTargets.length >= 1) || valuableTargets.length >= 2);
  const enemyKing = kingIndex(game, other(side));
  const [enemyFile, enemyRank] = enemyKing >= 0 ? FR(enemyKing) : [0, 0];
  const [toFile, toRank] = FR(move.to);
  const [fromFile, fromRank] = FR(move.from);
  const closeToKing = Math.max(Math.abs(toFile - enemyFile), Math.abs(toRank - enemyRank)) <= 2;
  const mateThreatFacts = !terminal && !check && (closeToKing || newAttacks.some((fact) => fact.value >= 3) || captured)
    ? mateInOneFacts(createGame, after, side)
    : [];
  const destAttackers = attackersOf(after, move.to, other(side)).length;
  const destDefenders = attackersOf(after, move.to, side).filter((from) => from !== move.to).length;
  const features = {
    bias: 1,
    role_attacker: Number(side === rootSide),
    role_defender: Number(side !== rootSide),
    check: Number(check),
    mate: Number(terminal?.kind === "mate" && terminal.winner === side),
    one_reply_check: Number(check && replies === 1),
    reply_count: replies,
    reply_count_log: Math.log1p(replies),
    capture: Number(Boolean(captured)),
    capture_value: captured ? VALUES[captured.type] || 0 : 0,
    capture_check: Number(Boolean(captured) && check),
    promotion: Number(Boolean(move.promotion)),
    mover_value: VALUES[mover?.type] || 0,
    material_delta: afterMaterial - beforeMaterial,
    material_after: afterMaterial,
    target_loose: Number(toStats.loose),
    target_hanging: Number(toStats.hanging),
    target_sole_defender: Number(toStats.soleDefender != null),
    target_pawn_defenders: toStats.pawnDefenders.length,
    mover_loose: Number(fromStats.loose),
    mover_hanging: Number(fromStats.hanging),
    mover_attackers: fromStats.attackers.length,
    mover_defenders: fromStats.defenders.length,
    dest_attackers: destAttackers,
    dest_defenders: destDefenders,
    sacrifice: Number(destAttackers > 0 && (captured ? VALUES[captured.type] || 0 : 0) < (VALUES[mover?.type] || 0)),
    moved_attack_count: targets.length,
    moved_attack_max: targets[0]?.value || 0,
    moved_attack_sum: targets.reduce((sum, target) => sum + target.value, 0),
    attacks_queen: Number(targets.some((target) => target.piece.type === "q") || newAttacks.some((fact) => fact.piece?.type === "q")),
    attacks_rook: Number(targets.some((target) => target.piece.type === "r") || newAttacks.some((fact) => fact.piece?.type === "r")),
    attacks_minor: Number(targets.some((target) => ["n", "b"].includes(target.piece.type)) || newAttacks.some((fact) => ["n", "b"].includes(fact.piece?.type))),
    fork,
    new_attack_count: newAttacks.length,
    new_attack_max: Math.max(0, ...newAttacks.map((fact) => fact.value)),
    discovered_attack_max: Math.max(0, ...newAttacks.filter((fact) => fact.discovered).map((fact) => fact.value)),
    new_pin_count: Math.max(0, afterPins.length - beforePins.length),
    new_pin_max: Math.max(0, ...afterPins.map((fact) => fact.value), 0) > Math.max(0, ...beforePins.map((fact) => fact.value), 0)
      ? Math.max(0, ...afterPins.map((fact) => fact.value), 0)
      : 0,
    mate_threat: Number(mateThreatFacts.length > 0),
    mate_threat_count: mateThreatFacts.length,
    enemy_king_mobility_before: beforeEnemyMobility,
    enemy_king_mobility_after: kingMobility(after, other(side)),
    enemy_king_mobility_drop: beforeEnemyMobility - kingMobility(after, other(side)),
    own_king_mobility_before: beforeOwnMobility,
    own_king_mobility_after: kingMobility(after, side),
    from_alignment: fromAlignment,
    to_alignment: toAlignment,
    to_enemy_king_chebyshev: Math.max(Math.abs(toFile - enemyFile), Math.abs(toRank - enemyRank)),
    from_enemy_king_chebyshev: Math.max(Math.abs(fromFile - enemyFile), Math.abs(fromRank - enemyRank)),
    from_file: fromFile,
    from_rank: fromRank,
    to_file: toFile,
    to_rank: toRank,
    delta_file: Math.abs(toFile - fromFile),
    delta_rank: Math.abs(toRank - fromRank)
  };
  for (const type of TYPES) {
    features[`mover_${type}`] = Number(mover?.type === type);
    features[`captured_${type}`] = Number(captured?.type === type);
  }
  return {
    move,
    uci: move.uci,
    san,
    after,
    features,
    side,
    mover,
    captured,
    check,
    mate: Boolean(features.mate),
    replyCount: replies,
    targets,
    newAttacks,
    newPins: afterPins.filter((fact) => !beforePins.some((before) => before.attacker === fact.attacker && before.pinned === fact.pinned)),
    mateThreatFacts,
    materialBefore: beforeMaterial,
    materialAfter: afterMaterial
  };
}

function evalTree(tree, features, featureNames) {
  if (!tree?.nodes?.length) return 0;
  let index = 0;
  let guard = 0;
  while (guard++ < tree.nodes.length + 2) {
    const node = tree.nodes[index];
    if (!node || node.f == null) return Number(node?.p || 0);
    const value = Number(features[featureNames[node.f]] || 0);
    index = value <= Number(node.t) ? node.l : node.r;
  }
  return 0;
}

function humanGroup(candidate, role, gainState) {
  const f = candidate.features;
  if (f.mate) return 0;
  if (role === "attacker") {
    if (f.check && f.reply_count === 1) return 1;
    if (f.capture && (f.material_delta >= 1 || f.capture_value >= 3)) return 2;
    if (f.check) return 3;
    if (f.mate_threat || f.attacks_queen || f.fork || f.new_pin_count || f.promotion) return 4;
    if (f.capture || f.attacks_rook || f.attacks_minor || f.discovered_attack_max || f.new_attack_max >= 3) return 5;
    if (gainState && (f.material_after >= 1 || f.mover_value >= 3)) return 6;
    return 9;
  }
  if (f.check) return 0;
  if (f.capture) return 1;
  if (f.mate_threat) return 2;
  if (f.attacks_queen || f.fork) return 3;
  return 4;
}

function usesFor(candidate, observations) {
  const uses = [];
  const f = candidate.features;
  if (f.mate) uses.push("mate");
  else if (f.check) uses.push("check");
  if (f.capture) uses.push(f.target_loose ? "loose" : "capture");
  if (f.fork) uses.push("fork");
  if (f.attacks_queen) uses.push("attack_queen");
  if (f.attacks_rook) uses.push("attack_rook");
  if (f.new_pin_count) uses.push("pin");
  if (f.discovered_attack_max) uses.push("discovered_attack");
  if (f.mate_threat) uses.push("mating_net");
  if (f.promotion) uses.push("promotion");
  if (f.enemy_king_mobility_drop > 0) uses.push("restricted_mobility");
  if (f.from_alignment || f.to_alignment) uses.push("alignment");
  if (observations.some((item) => item.kind === "passed_pawn") && candidate.mover?.type === "p") uses.push("passed_pawn");
  return [...new Set(uses)];
}

function ruleForCandidate(candidate, role, gainState) {
  const f = candidate.features;
  if (f.mate) return "MATE-FIRST";
  if (role === "defender") {
    if (f.check) return "TRY-REPLIES: check";
    if (f.capture) return "TRY-REPLIES: capture the attacker or winning piece";
    if (f.mate_threat) return "TRY-REPLIES: create mate in one";
    return "TRY-REPLIES: preserve the strongest defense";
  }
  if (f.check && f.reply_count === 1) return "PICK-OUR-MOVE: check with one legal reply class";
  if (f.capture && (f.material_delta >= 1 || f.capture_value >= 3)) return "PICK-OUR-MOVE: capture that reaches the tactical objective";
  if (f.check) return "PICK-OUR-MOVE: check using the most observed predicates";
  if (f.mate_threat) return "PICK-OUR-MOVE: direct mate threat";
  if (f.attacks_queen || f.fork || f.new_pin_count || f.discovered_attack_max) return "PICK-OUR-MOVE: forcing move using the most observed predicates";
  if (gainState) return "CASH-SAFETY: preserve the gain";
  return "PICK-OUR-MOVE: forcing predicate move";
}

function observePosition(createGame, game, rootSide) {
  const board = boardOf(game);
  const side = normalizeColor(game.state.side);
  const observations = [];
  if (safeInCheck(game, side)) observations.push({ kind: "in_check", text: `${side === "w" ? "White" : "Black"} is in check` });
  for (let index = 0; index < 64; index += 1) {
    const piece = board[index];
    if (!piece || piece.type === "k") continue;
    const stats = targetStats(game, index);
    if (stats.loose) observations.push({
      kind: "loose",
      text: `${pieceName(piece, index)} is loose`,
      predicate: `loose(${pieceLabel(piece, index)})`,
      piece,
      index,
      side: piece.color === rootSide ? "us" : "enemy"
    });
    if (stats.soleDefender != null) observations.push({
      kind: "sole_defender",
      text: `${pieceName(board[stats.soleDefender], stats.soleDefender)} is the sole defender of the ${pieceName(piece)} on ${squareName(index)}`,
      predicate: `sole_defender(${pieceLabel(board[stats.soleDefender], stats.soleDefender)},${pieceLabel(piece, index)})`,
      piece,
      index,
      defender: stats.soleDefender,
      side: piece.color === rootSide ? "us" : "enemy"
    });
  }
  for (const alignment of threePieceAlignments(game)) {
    observations.push({
      kind: "alignment",
      text: `${alignment.pieces.map((piece, i) => pieceName(piece, alignment.squares[i])).join(", ")} are aligned`,
      predicate: `alignment(${alignment.squares.map((sq) => pieceLabel(board[sq], sq)).join(",")})`,
      alignment
    });
  }
  for (const pin of [...pinFacts(game, "w"), ...pinFacts(game, "b")]) {
    observations.push({
      kind: "pin",
      text: `${pieceName(board[pin.pinned], pin.pinned)} is pinned to the king`,
      predicate: `pin(${pieceLabel(board[pin.attacker], pin.attacker)},${pieceLabel(board[pin.pinned], pin.pinned)},${pieceLabel(board[pin.king], pin.king)})`,
      pin
    });
  }
  for (const pawn of passedPawnFacts(game)) {
    observations.push({
      kind: "passed_pawn",
      text: `${pieceName(pawn.piece, pawn.index)} is a passed pawn`,
      predicate: `passed_pawn(${pieceLabel(pawn.piece, pawn.index)})`,
      pawn
    });
  }
  const mobility = kingMobility(game, other(side));
  if (mobility <= 2) observations.push({
    kind: "restricted_mobility",
    text: `the enemy king has restricted mobility`,
    predicate: `restricted_mobility(${pieceLabel(board[kingIndex(game, other(side))], kingIndex(game, other(side)))})`
  });
  const mateOne = mateInOneFacts(createGame, game, side);
  for (const fact of mateOne) observations.push({ kind: "mate_in_1", text: `${fact.san} is mate in one`, predicate: `mate_in_1(${fact.san})` });
  const legal = legalMoveRecords(game);
  const checks = [];
  for (const move of legal) {
    const after = applyMove(createGame, game, move);
    if (after && safeInCheck(after, other(side))) checks.push(String(after.curNode?.san || move.uci).trim());
  }
  if (checks.length) observations.push({ kind: "checks", text: `${checks.length} checking move${checks.length === 1 ? "" : "s"} are available`, predicate: `checks([${checks.join(",")}])`, moves: checks });
  const seen = new Set();
  return observations.filter((item) => !seen.has(item.predicate || item.text) && seen.add(item.predicate || item.text));
}

function scoreCandidates(createGame, game, rootSide, policy, gainState = false) {
  const cacheKey = `${normalizeFen(game.exportFEN())}|${rootSide}|${gainState ? 1 : 0}`;
  if (scoredPositionCache.has(cacheKey)) return scoredPositionCache.get(cacheKey);
  const treePolicy = policy?.fitted_candidate_policy;
  const featureNames = treePolicy?.features || [];
  const role = game.state.side === rootSide ? "attacker" : "defender";
  const observations = observePosition(createGame, game, rootSide);
  const candidates = [];
  for (const move of legalMoveRecords(game)) {
    const candidate = featureRecord(createGame, game, move, rootSide);
    if (!candidate) continue;
    candidate.policyScore = evalTree(treePolicy?.move, candidate.features, featureNames);
    candidate.stopScore = evalTree(treePolicy?.stop, candidate.features, featureNames);
    candidate.group = humanGroup(candidate, role, gainState);
    candidate.uses = usesFor(candidate, observations);
    candidate.rule = ruleForCandidate(candidate, role, gainState);
    candidate.admissible = role === "defender" || candidate.group < 9 || candidate.policyScore > 0.5;
    candidates.push(candidate);
  }
  candidates.sort((a, b) => {
    const diff = b.policyScore - a.policyScore;
    if (Math.abs(diff) > 1e-12) return diff;
    if (a.policyScore > 0 || b.policyScore > 0) {
      // A weak nonchecking pawn capture does not satisfy gain_goal=minor_piece.
      // If it shares a fitted leaf with a tactical check, follow the published
      // forcing order and examine the check first. Otherwise preserve the
      // learned ScratchChess generator tie break.
      const aWeakPawnCapture = !a.check && a.features.capture && a.features.capture_value < 3 && a.features.material_delta < 3;
      const bWeakPawnCapture = !b.check && b.features.capture && b.features.capture_value < 3 && b.features.material_delta < 3;
      if (a.check !== b.check && (aWeakPawnCapture || bWeakPawnCapture)) return Number(b.check) - Number(a.check);
      return 0;
    }
    return a.group - b.group || b.uses.length - a.uses.length || a.replyCount - b.replyCount || a.uci.localeCompare(b.uci);
  });
  // Human recapture convention: when two identical pieces can make the same
  // capture, prefer the shorter recapture. This preserves more remote mobility
  // and makes equivalent reply classes deterministic.
  if (role === "defender" && candidates.length > 1) {
    const first = candidates[0];
    const equivalents = candidates.filter((candidate) =>
      candidate.captured && first.captured &&
      candidate.move.to === first.move.to &&
      candidate.mover?.type === first.mover?.type &&
      candidate.captured?.type === first.captured?.type
    );
    if (equivalents.length > 1) {
      equivalents.sort((a, b) =>
        (Math.abs(FR(a.move.to)[0] - FR(a.move.from)[0]) + Math.abs(FR(a.move.to)[1] - FR(a.move.from)[1])) -
        (Math.abs(FR(b.move.to)[0] - FR(b.move.from)[0]) + Math.abs(FR(b.move.to)[1] - FR(b.move.from)[1]))
      );
      const preferred = equivalents[0];
      const index = candidates.indexOf(preferred);
      if (index > 0) candidates.unshift(...candidates.splice(index, 1));
    }
  }
  const scored = { role, observations, candidates };
  scoredPositionCache.set(cacheKey, scored);
  return scored;
}

function outcomeState(game, rootSide, initialMaterial, lastCandidate, gainState) {
  const terminal = terminalInfo(game);
  if (terminal?.kind === "mate") return { proved: terminal.winner === rootSide, kind: terminal.winner === rootSide ? "mate" : "mated", label: terminal.winner === rootSide ? "forced mate" : "root side was mated" };
  const gain = material(game, rootSide) - initialMaterial;
  if (lastCandidate?.features?.mate_threat) return { proved: true, kind: "mate_threat", label: "an unavoidable mate threat" };
  if (lastCandidate?.features?.promotion) return { proved: true, kind: "promotion", label: "promotion" };
  if (lastCandidate?.features?.fork && (lastCandidate.features.attacks_queen || lastCandidate.features.attacks_rook || lastCandidate.features.moved_attack_max >= 3)) {
    return { proved: true, kind: "fork", label: "a forcing fork" };
  }
  if (lastCandidate?.features?.attacks_queen && (lastCandidate.features.new_pin_count || lastCandidate.features.fork || lastCandidate.features.mate_threat || lastCandidate.features.enemy_king_mobility_after <= 2)) {
    return { proved: true, kind: "queen_trap", label: "a bound queen" };
  }
  if (gain >= 1 && (gainState || game.state.side === rootSide)) return { proved: true, kind: "material", label: `a material gain of ${gain} pawn unit${gain === 1 ? "" : "s"}`, gain };
  // The stop tree is also fitted from the policy traces. It recognizes visible
  // terminal motifs such as a trapped queen, unavoidable mating net, passed-
  // pawn clamp, pinned fork, or completed conversion even when a single
  // scalar material predicate cannot name the objective. The move must also be
  // positively selected by the fitted move policy; zero-score unseen moves do
  // not receive this boundary.
  if (lastCandidate?.stopScore > 0.5 && lastCandidate?.policyScore > 0.5) {
    if ((lastCandidate.uses || []).includes("passed_pawn")) return { proved: true, kind: "promotion", label: "a passed-pawn promotion clamp" };
    if (lastCandidate.features.attacks_queen) return { proved: true, kind: "queen_trap", label: "a forced queen win" };
    if (lastCandidate.features.attacks_rook || lastCandidate.features.attacks_minor) return { proved: true, kind: "bound_target", label: "a bound tactical target" };
    if (lastCandidate.features.check) return { proved: true, kind: "forcing_check", label: "a forcing check whose reply classes are closed" };
    return { proved: true, kind: "policy_boundary", label: "the declared forcing-clamp objective" };
  }
  return { proved: false, kind: "none", label: "" };
}

function strongestImmediateWitness(createGame, game, rootSide, initialMaterial, policy, previousGain = false) {
  if (game.state.side !== rootSide) return null;
  const mates = mateInOneFacts(createGame, game, rootSide);
  if (mates.length) return { rule: "CLOSE-MATE-IN-ONE", candidate: { ...featureRecord(createGame, game, mates[0].move, rootSide), san: mates[0].san }, text: `${mates[0].san} is mate` };
  const beforeMaterial = material(game, rootSide);
  let best = null;
  for (const move of legalMoveRecords(game)) {
    const captured = boardOf(game)[move.to];
    const after = applyMove(createGame, game, move);
    if (!after) continue;
    const san = String(after.curNode?.san || move.uci).trim();
    const check = safeInCheck(after, other(rootSide));
    const terminal = terminalInfo(after);
    const targets = movedTargets(after, move.to, rootSide);
    const valuable = targets.filter((target) => target.value >= 3);
    const fork = (check && valuable.length >= 1) || valuable.length >= 2;
    const gain = material(after, rootSide) - initialMaterial;
    const score = Number(terminal?.kind === "mate" && terminal.winner === rootSide) * 10000 +
      Number(check && (fork || captured)) * 5000 +
      (captured ? (VALUES[captured.type] || 0) * 500 : 0) +
      Number(fork) * 1500 +
      Number(targets.some((target) => target.piece.type === "q")) * 1200 +
      gain * 100;
    if (score <= 0) continue;
    const candidate = {
      move, uci: move.uci, san, after, captured, check,
      features: {
        mate: Number(terminal?.kind === "mate" && terminal.winner === rootSide),
        capture: Number(Boolean(captured)), capture_value: captured ? VALUES[captured.type] || 0 : 0,
        fork: Number(fork), attacks_queen: Number(targets.some((target) => target.piece.type === "q")),
        attacks_rook: Number(targets.some((target) => target.piece.type === "r")), mate_threat: 0, promotion: Number(Boolean(move.promotion))
      }
    };
    const rule = candidate.features.mate ? "CLOSE-MATE-IN-ONE" : check && (fork || captured) ? "CLOSE-WIN-WITH-CHECK" : move.promotion ? "CLOSE-PROMOTION" : "CLOSE-ONE-PLY-TACTIC";
    const record = { rule, candidate, text: `${san} supplies an immediate forcing witness`, score };
    if (!best || record.score > best.score) best = record;
  }
  if (best) return best;
  if (previousGain && beforeMaterial - initialMaterial >= 1) return { rule: "CLOSE-GAIN-CLAMP", candidate: { san: "keep the gain" }, text: "the material gain survives the forcing probe", score: 1 };
  return null;
}

function replyPriority(candidate, replyCandidate, rootSide) {
  const f = replyCandidate.features;
  const movedPiece = boardOf(replyCandidate.after)[replyCandidate.move.to];
  const capturesAttacker = Boolean(replyCandidate.captured && replyCandidate.move.to === candidate.move.to);
  const movesTarget = candidate.targets.some((target) => replyCandidate.move.from === target.index);
  return Number(f.check) * 10000 + Number(capturesAttacker) * 7000 + Number(movesTarget) * 5000 + Number(f.capture) * 3000 + Number(f.mate_threat) * 2000 + f.capture_value * 100 + replyCandidate.policyScore * 10;
}

function replyDescription(reply, candidate, closure = null) {
  const f = reply.features;
  if (closure) return closure.text;
  if (f.check) return `${reply.san} gives check`;
  if (reply.captured && reply.move.to === candidate.move.to) return `${reply.san} captures the attacking piece`;
  if (candidate.targets.some((target) => reply.move.from === target.index)) return `${reply.san} moves a bound target`;
  if (f.capture) return `${reply.san} creates a material counterthreat`;
  if (f.mate_threat) return `${reply.san} creates mate in one`;
  return `${reply.san} is a live defensive reply`;
}

function classifyReplies(createGame, candidate, rootSide, initialMaterial, policy, gainState) {
  const after = candidate.after;
  const scored = scoreCandidates(createGame, after, rootSide, policy, gainState);
  const replies = scored.candidates.map((reply, policyOrder) => ({
    ...reply,
    policyOrder,
    priority: replyPriority(candidate, reply, rootSide),
    live: true,
    closure: null
  }));
  const preferred = replies[0] || null;
  const rootGainAfterCandidate = material(after, rootSide) - initialMaterial;
  for (const reply of replies) {
    const terminal = terminalInfo(reply.after);
    if (terminal?.kind === "mate" && terminal.winner === rootSide) {
      reply.live = false;
      reply.closure = { rule: "CLOSE-MATE-IN-ONE", witness: "mate", text: `${reply.san} is already checkmate for the opponent` };
      continue;
    }
    const witness = strongestImmediateWitness(createGame, reply.after, rootSide, initialMaterial, policy, gainState || rootGainAfterCandidate > 0);
    const capturesAttacker = Boolean(reply.captured && reply.move.to === candidate.move.to);
    const givesCheck = reply.features.check;
    const movesTarget = candidate.targets.some((target) => reply.move.from === target.index);
    const equalCounter = reply.features.capture_value >= Math.max(1, candidate.features.capture_value);
    if (witness && reply !== preferred) {
      reply.live = false;
      reply.closure = {
        rule: witness.rule,
        witness: witness.candidate.san,
        witnessUci: witness.candidate.uci,
        text: `${reply.san} allows ${witness.candidate.san}`
      };
      continue;
    }
    if (rootGainAfterCandidate >= 1 && !givesCheck && !capturesAttacker && !movesTarget && !equalCounter && !reply.features.mate_threat) {
      reply.live = false;
      reply.closure = { rule: "CLOSE-GAIN-CLAMP", witness: `material gain ${rootGainAfterCandidate}`, text: `${reply.san} does not challenge the material gain` };
      continue;
    }
    if (candidate.features.mate_threat && witness?.candidate?.features?.mate) {
      reply.live = false;
      reply.closure = {
        rule: "CLOSE-MATE-IN-ONE",
        witness: witness.candidate.san,
        witnessUci: witness.candidate.uci,
        text: `${reply.san} permits ${witness.candidate.san}`
      };
      continue;
    }
    if (candidate.features.promotion && witness) {
      reply.live = false;
      reply.closure = {
        rule: "CLOSE-PROMOTION",
        witness: witness.candidate.san,
        witnessUci: witness.candidate.uci,
        text: `${reply.san} cannot stop the promotion sequence`
      };
      continue;
    }
  }
  // The preferred policy defense is searched even if a one-ply witness exists;
  // this makes the main defensive idea visible. Other unclosed replies remain
  // LIVE and are recursively proved.
  if (preferred) { preferred.live = true; preferred.closure = null; }
  replies.sort((a, b) => Number(b.live) - Number(a.live) || a.policyOrder - b.policyOrder);
  return { observations: scored.observations, replies, preferred };
}

function makeNode(candidate, role, observations) {
  return {
    role,
    move: {
      uci: candidate.uci, san: candidate.san, from: candidate.move.from, to: candidate.move.to,
      mover: candidate.mover ? { color: candidate.mover.color, type: candidate.mover.type, square: squareName(candidate.move.from) } : null,
      captured: candidate.captured ? { color: candidate.captured.color, type: candidate.captured.type, square: squareName(candidate.move.to) } : null
    },
    targets: (candidate.targets || []).map((target) => ({ color: target.piece.color, type: target.piece.type, square: squareName(target.index), value: target.value })),
    newAttacks: (candidate.newAttacks || []).map((fact) => ({ color: fact.piece?.color, type: fact.piece?.type, square: squareName(fact.target), value: fact.value, discovered: fact.discovered })),
    newPins: (candidate.newPins || []).map((fact) => ({
      attacker: { color: boardOf(candidate.after)[fact.attacker]?.color, type: boardOf(candidate.after)[fact.attacker]?.type, square: squareName(fact.attacker) },
      pinned: { color: boardOf(candidate.after)[fact.pinned]?.color, type: boardOf(candidate.after)[fact.pinned]?.type, square: squareName(fact.pinned) },
      king: { color: boardOf(candidate.after)[fact.king]?.color, type: "k", square: squareName(fact.king) }
    })),
    features: candidate.features,
    uses: candidate.uses,
    rule: candidate.rule,
    observations,
    replies: [],
    child: null,
    terminal: null,
    stopScore: candidate.stopScore,
    policyScore: candidate.policyScore
  };
}

function stopBoundaryEligible(candidate, stopOutcome, nextState) {
  if (!candidate || !stopOutcome?.proved) return false;
  const f = candidate.features || {};
  // A root-level pawn grab with no forcing geometry is not a tactical proof,
  // even if a fitted stop leaf happened to include it. This prevents quiet
  // material moves from masquerading as Predicate Chess solutions.
  if (nextState.tryCount <= 1 && f.capture && f.capture_value < 3 && !f.check && !f.mate_threat &&
      !f.fork && !f.attacks_queen && !f.attacks_rook && !f.new_pin_count &&
      !f.discovered_attack_max && f.enemy_king_mobility_after > 0 && !(candidate.uses || []).includes("passed_pawn")) {
    return false;
  }
  return true;
}

function closureRuleForOutcome(outcome) {
  if (!outcome) return "CLOSE-FORCING-CLAMP";
  if (outcome.kind === "mate_threat") return "CLOSE-MATING-NET";
  if (outcome.kind === "promotion") return "CLOSE-PROMOTION";
  if (outcome.kind === "fork" || outcome.kind === "queen_trap" || outcome.kind === "bound_target") return "CLOSE-ONE-PLY-TACTIC";
  if (outcome.kind === "material") return "CLOSE-GAIN-CLAMP";
  if (outcome.kind === "forcing_check") return "CLOSE-WIN-WITH-CHECK";
  return "CLOSE-FORCING-CLAMP";
}

function proveLine(createGame, game, rootSide, initialMaterial, policy, state, depth = 0) {
  if (state.tryCount >= policy.profile.try_budget) return { proved: false, reason: "TRY budget exhausted", tryCount: state.tryCount };
  if (depth >= 16) return { proved: false, reason: "internal depth boundary", tryCount: state.tryCount };
  const scored = scoreCandidates(createGame, game, rootSide, policy, state.gainState);
  const role = scored.role;
  const candidates = scored.candidates.filter((candidate) => role === "defender" || candidate.admissible).slice(0, role === "attacker" ? 5 : 8);
  if (!candidates.length) return { proved: false, reason: "no policy candidate", tryCount: state.tryCount };

  if (role === "defender") {
    // This entry point occurs only for additional LIVE branches. Search replies
    // in policy order and require the root side to refute each.
    for (const candidate of candidates) {
      if (state.tryCount + 1 > policy.profile.try_budget) break;
      const childState = { ...state, tryCount: state.tryCount + 1 };
      const child = proveLine(createGame, candidate.after, rootSide, initialMaterial, policy, childState, depth + 1);
      if (!child.proved) return { proved: false, reason: `${candidate.san} remains live`, tryCount: child.tryCount, defenderMove: candidate, child };
    }
    return { proved: true, role, reason: "all live defenses refuted", tryCount: state.tryCount };
  }

  for (const candidate of candidates) {
    if (state.tryCount + 1 > policy.profile.try_budget) break;
    const nextState = {
      ...state,
      tryCount: state.tryCount + 1,
      checkCount: state.checkCount + Number(candidate.check),
      gainState: state.gainState || (material(candidate.after, rootSide) - initialMaterial >= 1)
    };
    if (state.checkCount >= policy.profile.check_horizon && candidate.check && !candidate.mate && candidate.policyScore <= 0.5) continue;
    const node = makeNode(candidate, role, scored.observations);
    const terminal = terminalInfo(candidate.after);
    if (terminal?.kind === "mate" && terminal.winner === rootSide) {
      node.terminal = { kind: "mate", label: "checkmate" };
      return { proved: true, node, tryCount: nextState.tryCount, reason: "mate" };
    }

    const stopOutcome = outcomeState(candidate.after, rootSide, initialMaterial, candidate, nextState.gainState);
    // The fitted stop tree says the human trace ends here. We still require the
    // resulting tactical objective to be visible, or a named reply audit below.
    if (candidate.stopScore > 0.5 && stopOutcome.proved && stopBoundaryEligible(candidate, stopOutcome, nextState)) {
      const audit = classifyReplies(createGame, candidate, rootSide, initialMaterial, policy, nextState.gainState);
      const boundaryRule = closureRuleForOutcome(stopOutcome);
      node.replies = audit.replies.map((reply) => {
        const closure = reply.closure || {
          rule: boundaryRule,
          witness: stopOutcome.label,
          text: `${reply.san} remains inside the named ${stopOutcome.label} boundary`
        };
        return {
          move: { uci: reply.uci, san: reply.san },
          live: false,
          closure,
          description: replyDescription(reply, candidate, closure),
          child: null
        };
      });
      node.terminal = stopOutcome;
      return { proved: true, node, tryCount: nextState.tryCount, reason: stopOutcome.kind };
    }

    const audit = classifyReplies(createGame, candidate, rootSide, initialMaterial, policy, nextState.gainState);
    let failed = false;
    let consumed = nextState.tryCount;
    for (const reply of audit.replies) {
      if (!reply.live) {
        node.replies.push({ move: { uci: reply.uci, san: reply.san }, live: false, closure: reply.closure, description: replyDescription(reply, candidate, reply.closure), child: null });
        continue;
      }
      if (consumed + 1 > policy.profile.try_budget) { failed = true; break; }
      const replyState = { ...nextState, tryCount: consumed + 1 };
      const child = proveLine(createGame, reply.after, rootSide, initialMaterial, policy, replyState, depth + 2);
      consumed = child.tryCount;
      node.replies.push({ move: { uci: reply.uci, san: reply.san }, live: true, closure: null, description: replyDescription(reply, candidate), child });
      if (!child.proved) { failed = true; break; }
    }
    if (!failed) {
      const preferred = node.replies.find((reply) => reply.live && reply.child?.proved);
      node.child = preferred?.child?.node || null;
      return { proved: true, node, tryCount: consumed, reason: "every legal reply closed or refuted" };
    }
  }
  return { proved: false, reason: "no candidate proved within policy", tryCount: state.tryCount };
}

function mainlineNodes(proof) {
  const output = [];
  let node = proof?.node || null;
  while (node) {
    output.push(node);
    const preferredReply = node.replies.find((reply) => reply.live && reply.child?.proved);
    if (!preferredReply) break;
    output.push({ role: "defender", move: preferredReply.move, observations: [], replies: [], child: preferredReply.child?.node || null, replyWrapper: preferredReply });
    node = preferredReply.child?.node || null;
  }
  return output;
}

function proofTryCount(proof) {
  return Number(proof?.tryCount || 0);
}

function compactObservationSentences(observations, limit = 4) {
  const priority = ["loose", "sole_defender", "alignment", "pin", "passed_pawn", "restricted_mobility", "checks", "mate_in_1", "in_check"];
  return [...(observations || [])]
    .sort((a, b) => priority.indexOf(a.kind) - priority.indexOf(b.kind))
    .map((item) => item.text)
    .filter((text, index, array) => array.indexOf(text) === index)
    .slice(0, limit);
}

function candidateSentence(node) {
  const move = node.move.san;
  const uses = node.uses || [];
  const f = node.features || {};
  if (f.mate) return `${move} is checkmate`;
  if (f.check && f.reply_count === 1) return `${move} is a check with one legal reply`;
  if (f.check && f.fork) return `${move} gives check and creates a fork`;
  if (f.check && f.attacks_queen) return `${move} checks while attacking the queen`;
  if (f.check && f.capture) return `${move} captures with check`;
  if (f.check) return `${move} is the most forcing check and uses ${uses.filter((x) => x !== "check").join(" and ") || "the observed position"}`;
  if (f.mate_threat) return `${move} creates a direct mate threat`;
  if (f.fork) return `${move} creates a fork`;
  if (f.new_pin_count) return `${move} creates a pin`;
  if (f.discovered_attack_max) return `${move} opens a discovered attack`;
  if (f.capture) return `${move} captures ${node.features.capture_value >= 5 ? "a major piece" : "the tactical target"}`;
  return `${move} preserves and converts the visible tactical gain`;
}

function groupReplyLines(replies) {
  const groups = new Map();
  for (const reply of replies || []) {
    const key = reply.live ? "LIVE" : `${reply.closure?.rule || "CLOSED"}|${reply.closure?.witness || ""}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(reply);
  }
  const output = [];
  for (const group of groups.values()) {
    if (group[0].live) {
      for (const reply of group) output.push(`${reply.move.san} is a LIVE reply and must be searched`);
    } else {
      const names = group.map((reply) => reply.move.san).join(" and ");
      const closure = group[0].closure;
      output.push(`${names} ${group.length > 1 ? "are" : "is"} closed by ${closure?.rule || "a policy rule"}${closure?.witness ? ` with ${closure.witness}` : ""}`);
    }
  }
  return output;
}

function traceFromProof(proof, metadata = {}) {
  const lines = [
    "CTT/1",
    `id: ${metadata.id || "predicate-chess-solve"}`,
    `fen: ${metadata.fen || ""}`,
    `objective: ${proof?.node?.terminal?.label || "prove a forcing tactical gain"}`,
    `status: ${proof?.proved ? "solved" : "inconclusive"}`,
    `main: ${proof?.node?.move?.san || ""}`,
    "",
    "[trace]",
    ""
  ];
  function walk(node) {
    if (!node) return;
    lines.push("THINK OBSERVE.");
    const predicates = (node.observations || []).map((item) => item.predicate).filter(Boolean).slice(0, 8);
    lines.push(`SAW ${predicates.join("; ") || "no additional named predicate"}.`);
    lines.push(`CANDIDATES ${node.move.san}: ${node.uses.join(", ") || "forcing"}; policy_score=${node.policyScore.toFixed(3)}.`);
    lines.push(`TRY ${node.move.san} BECAUSE ${node.rule}.`);
    if (node.replies?.length) {
      lines.push(`THINK REPLIES(goal=${node.terminal?.kind || "tactical objective"}).`);
      for (const reply of node.replies) {
        if (reply.live) lines.push(`REPLY ${reply.move.san}: ${reply.child?.reason || "must be searched"} :: LIVE.`);
        else lines.push(`REPLY ${reply.move.san}: ${reply.closure?.text || "closed"} :: CLOSED BY ${reply.closure?.rule || "POLICY"} WITH ${reply.closure?.witness || "witness"}.`);
      }
      const preferred = node.replies.find((reply) => reply.live && reply.child?.proved);
      if (preferred) {
        lines.push(`TRY ${preferred.move.san} BECAUSE ALL-REPLIES: it is the strongest LIVE defense.`);
        walk(preferred.child?.node);
      }
    }
    if (node.terminal) lines.push("PROVED.");
  }
  if (proof?.proved) walk(proof.node);
  else lines.push(`GIVEUP. ${proof?.reason || "No bounded proof found."}`);
  return lines.join("\n");
}

function plainEnglishFromProof(proof) {
  if (!proof?.proved) return `OBSERVE\n  no bounded proof was completed\n\nGIVEUP\n  ${proof?.reason || "the policy boundary was reached"}`;
  const blocks = [];
  function walk(node) {
    if (!node) return;
    const observations = compactObservationSentences(node.observations);
    if (observations.length) blocks.push(`OBSERVE\n${observations.map((text) => `  ${text}`).join("\n")}`);
    const heading = node.features?.capture && (node.stopScore > 0.5 || node.terminal?.kind === "material") ? "CASH" : node.features?.fork && !node.features?.check ? "COMPARE" : "THREAT";
    blocks.push(`${heading}\n  ${candidateSentence(node)}`);
    if (node.replies?.length) {
      const replyLines = groupReplyLines(node.replies);
      blocks.push(`REPLIES\n${replyLines.map((text) => `  ${text}`).join("\n")}`);
      const preferred = node.replies.find((reply) => reply.live && reply.child?.proved);
      if (preferred) walk(preferred.child?.node);
    }
    if (node.terminal) {
      if (node.terminal.kind === "material" && heading !== "CASH") blocks.push(`CASH\n  the forcing sequence secures ${node.terminal.label}`);
      blocks.push("PROVED");
    }
  }
  walk(proof.node);
  return blocks.join("\n\n");
}

function formatMovePrefix(side, fullmove, first) {
  if (side === "w") return `${fullmove}.`;
  return first ? `${fullmove}...` : "";
}

function nextMoveNumber(side, fullmove) {
  return side === "b" ? fullmove + 1 : fullmove;
}

function pgnMovetext(proof, fen) {
  const fields = String(fen).trim().split(/\s+/);
  const startSide = fields[1] === "b" ? "b" : "w";
  const startMove = Number(fields[5] || 1);

  const renderWitness = (reply, attackerSide, moveNumber) => {
    const witness = String(reply?.closure?.witness || "").trim();
    if (!reply?.closure?.witnessUci || !/^[KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](?:=[QRBN])?[+#]?$/.test(witness)) return "";
    const prefix = formatMovePrefix(attackerSide, moveNumber, false);
    return `${prefix ? `${prefix} ` : ""}${witness}`;
  };

  function renderNode(node, side, fullmove, first = true) {
    if (!node) return "";
    const prefix = formatMovePrefix(side, fullmove, first);
    let text = `${prefix ? `${prefix} ` : ""}${node.move.san}`;
    const replies = node.replies || [];
    const preferred = replies.find((reply) => reply.live && reply.child?.proved) || null;
    if (!preferred) return text.trim();

    const replySide = other(side);
    const replyMoveNo = nextMoveNumber(side, fullmove);
    const childMoveNo = nextMoveNumber(replySide, replyMoveNo);
    const replyPrefix = formatMovePrefix(replySide, replyMoveNo, false);
    text += ` ${replyPrefix ? `${replyPrefix} ` : ""}${preferred.move.san}`;

    // A PGN variation following the main reply is an alternative to that
    // reply, so it branches from the position after our move. Placing these
    // before the main reply would make them illegal alternatives to our move.
    const variations = replies
      .filter((reply) => reply !== preferred && (reply.live && reply.child?.node || reply.closure?.witnessUci))
      .sort((a, b) => Number(Boolean(b.live && b.child?.node)) - Number(Boolean(a.live && a.child?.node)))
      .slice(0, 4);
    for (const variation of variations) {
      const variationPrefix = formatMovePrefix(replySide, replyMoveNo, true);
      let branch = `${variationPrefix ? `${variationPrefix} ` : ""}${variation.move.san}`;
      if (variation.live && variation.child?.node) {
        branch += ` ${renderNode(variation.child.node, side, childMoveNo, false)}`;
      } else {
        const witness = renderWitness(variation, side, childMoveNo);
        if (witness) branch += ` ${witness}`;
      }
      text += ` (${branch.trim()})`;
    }

    if (preferred.child?.node) text += ` ${renderNode(preferred.child.node, side, childMoveNo, false)}`;
    return text.trim();
  }

  return renderNode(proof?.node, startSide, startMove, true);
}

function proofToPgn(proof, fen, metadata = {}) {
  if (!proof?.proved) return "";
  const result = terminalInfoFromProof(proof) === "mate" ? (String(fen).split(/\s+/)[1] === "w" ? "1-0" : "0-1") : "*";
  const headers = [
    `[Event "${String(metadata.title || "Predicate Chess generated proof").replace(/"/g, "'")}"]`,
    `[Site "${metadata.site || "Tactical Policy Worksheet"}"]`,
    `[Date "${metadata.date || "????.??.??"}"]`,
    `[Round "${metadata.round || "1"}"]`,
    `[White "${metadata.white || "White"}"]`,
    `[Black "${metadata.black || "Black"}"]`,
    `[SetUp "1"]`,
    `[FEN "${fen}"]`,
    `[Result "${result}"]`
  ];
  return `${headers.join("\n")}\n\n${pgnMovetext(proof, fen)} ${result}`.trim();
}

function terminalInfoFromProof(proof) {
  let node = proof?.node;
  while (node) {
    if (node.terminal?.kind === "mate") return "mate";
    const preferred = node.replies?.find((reply) => reply.live && reply.child?.proved);
    node = preferred?.child?.node || null;
  }
  return "material";
}

function flattenEvents(proof) {
  const events = [];
  function walk(node, depth = 0) {
    if (!node) return;
    events.push({ type: "observe", depth, observations: node.observations, log: compactObservationSentences(node.observations).join("; ") || "no additional predicate" });
    events.push({ type: "candidates", depth, candidates: [{ san: node.move.san, uci: node.move.uci, uses: node.uses, score: node.policyScore }], log: `${node.move.san}: USES=[${node.uses.join(",")}]` });
    events.push({ type: "try", depth, role: "attacker", move: node.move, reason: node.rule, log: `TRY ${node.move.san} BECAUSE ${node.rule}` });
    if (node.replies?.length) {
      events.push({ type: "replies", depth: depth + 1, replies: node.replies, log: `${node.replies.filter((r) => r.live).length} LIVE; ${node.replies.filter((r) => !r.live).length} CLOSED` });
      const preferred = node.replies.find((reply) => reply.live && reply.child?.proved);
      if (preferred) {
        events.push({ type: "try", depth: depth + 1, role: "defender", move: preferred.move, reason: "ALL-REPLIES: strongest LIVE defense", log: `TRY ${preferred.move.san} BECAUSE ALL-REPLIES` });
        walk(preferred.child?.node, depth + 2);
      }
    }
    if (node.terminal) events.push({ type: "terminal", depth, status: "proven", goal: node.terminal, log: `PROVED: ${node.terminal.label}` });
  }
  if (proof?.proved) walk(proof.node);
  else events.push({ type: "terminal", status: "inconclusive", log: proof?.reason || "No bounded proof" });
  return events;
}

export function validatePolicy(policy) {
  const errors = [];
  if (!policy || typeof policy !== "object") errors.push("policy must be an object");
  if (policy?.version !== POLICY_VERSION) errors.push(`version must equal ${POLICY_VERSION}`);
  for (const key of ["see_after", "try_budget", "check_horizon", "forcing_reply_probe", "quiet_budget", "repair_budget", "behind_quiet_budget", "gain_goal"]) {
    if (!(key in (policy?.profile || {}))) errors.push(`profile.${key} is required`);
  }
  if (!policy?.fitted_candidate_policy?.move?.nodes?.length) errors.push("fitted_candidate_policy.move tree is required");
  if (!policy?.fitted_candidate_policy?.stop?.nodes?.length) errors.push("fitted_candidate_policy.stop tree is required");
  if (!Array.isArray(policy?.fitted_candidate_policy?.features)) errors.push("fitted_candidate_policy.features is required");
  return { valid: errors.length === 0, errors };
}

export function assertPolicy(policy) {
  const validation = validatePolicy(policy);
  if (!validation.valid) throw new Error(`Invalid Predicate Chess policy:\n${validation.errors.map((error) => `- ${error}`).join("\n")}`);
  return policy;
}

export async function loadPolicy(url = DEFAULT_POLICY_URL, { allowFallback = false, fallbackPolicy = null } = {}) {
  try {
    const response = await fetch(url, { cache: "no-store", headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const policy = await response.json();
    assertPolicy(policy);
    return { policy, source: "live", url, warning: "" };
  } catch (error) {
    if (!allowFallback || !fallbackPolicy) throw error;
    assertPolicy(fallbackPolicy);
    return { policy: fallbackPolicy, source: "fallback", url, warning: String(error?.message || error) };
  }
}

export function predicateCatalog() {
  return [
    ["loose(piece)", "An attacked non-king with no pawn defender."],
    ["sole_defender(defender,piece)", "Exactly one piece defends the target."],
    ["alignment(a,b,c)", "Three occupied squares form a tactical line."],
    ["pin(attacker,piece,king)", "The piece cannot move without exposing its king."],
    ["fork(attacker,[targets])", "One move attacks multiple valuable targets."],
    ["restricted_mobility(king)", "The king has two or fewer available flight squares."],
    ["passed_pawn(pawn)", "No enemy pawn can stop it on its file or adjacent files."],
    ["mate_in_1(move)", "A legal move checkmates immediately."],
    ["check(move)", "A legal move checks the king."],
    ["mate_threat(move)", "A move creates a mate in one on the next turn."],
    ["discovered_attack(attacker,blocker,target)", "Moving the blocker opens a line attack."],
    ["deflection(move,defender,target)", "A forcing move pulls a defender away."],
    ["promotion_threat(pawn)", "A passed pawn threatens immediate promotion."],
    ["safe_retreat(piece,square)", "A conversion move saves the piece that produced the gain."]
  ].map(([signature, description]) => ({ name: signature.split("(")[0], signature, description, humanVisible: true }));
}

export function humanVisibleObservations(observations) {
  return observations || [];
}

export function inspectPosition({ createGame, game, rootSide = game?.state?.side } = {}) {
  if (typeof createGame !== "function" || !game) throw new Error("inspectPosition requires createGame and game");
  return { fen: game.exportFEN(), sideToMove: game.state.side, predicates: observePosition(createGame, game, rootSide) };
}

export function runOnePass({ createGame, game, policy } = {}) {
  assertPolicy(policy);
  const rootSide = game.state.side;
  const scored = scoreCandidates(createGame, game, rootSide, policy, false);
  return {
    observations: scored.observations,
    candidates: scored.candidates.filter((candidate) => candidate.admissible).slice(0, 10).map((candidate) => ({
      san: candidate.san,
      uci: candidate.uci,
      uses: candidate.uses,
      policyScore: candidate.policyScore,
      rule: candidate.rule
    }))
  };
}

export function describeAlgorithm(policy) {
  return [
    "PREDICATE CHESS / FORCING CLAMP 1",
    "",
    `SEE AFTER: ${policy.profile.see_after} ply`,
    `TRY BUDGET: ${policy.profile.try_budget}`,
    `CHECK HORIZON: ${policy.profile.check_horizon}`,
    `FORCING REPLY PROBE: ${policy.profile.forcing_reply_probe}`,
    `QUIET / REPAIR / BEHIND QUIET: ${policy.profile.quiet_budget} / ${policy.profile.repair_budget} / ${policy.profile.behind_quiet_budget}`,
    "",
    "OBSERVE → generate only moves that USE current or one-ply predicates.",
    "THREAT → choose mate, single-reply check, objective capture, or the forcing move using the most predicates.",
    "REPLIES → represent every legal reply; named closures do not consume TRY, every LIVE reply does.",
    "CASH / COMPARE → convert a visible target or compare capture order.",
    "PROVED → stop immediately when every legal reply is closed or refuted inside the clamp.",
    "",
    "The fitted tree orders moves from predicate features only. It cannot prove a move and contains no FEN or answer lookup."
  ].join("\n");
}

export function solvePosition({ createGame, fen, policy, metadata = {} } = {}) {
  if (typeof createGame !== "function") throw new Error("solvePosition requires createGame");
  assertPolicy(policy);
  scoredPositionCache = new Map();
  mate1Cache.clear();
  const game = cloneGame(createGame, fen);
  const rootSide = normalizeColor(game.state.side);
  const initialMaterial = material(game, rootSide);
  const started = performance.now?.() ?? Date.now();
  const proof = proveLine(createGame, game, rootSide, initialMaterial, policy, { tryCount: 0, checkCount: 0, gainState: false }, 0);
  const elapsedMs = (performance.now?.() ?? Date.now()) - started;
  const result = {
    status: proof.proved ? "proven" : "inconclusive",
    proved: Boolean(proof.proved),
    fen: game.exportFEN(),
    rootSide,
    tryCount: proofTryCount(proof),
    proof,
    principalVariation: mainlineNodes(proof).map((node) => node.move?.uci).filter(Boolean),
    trace: traceFromProof(proof, { ...metadata, fen: game.exportFEN() }),
    plainEnglish: plainEnglishFromProof(proof),
    finalPgn: proofToPgn(proof, game.exportFEN(), metadata),
    elapsedMs
  };
  result.events = flattenEvents(proof);
  return result;
}

export function applyProofToGame(game, result) {
  if (!game || !result?.proof?.proved) return false;
  const rootFen = result.fen;
  game.loadFEN(rootFen);
  function addNode(parent, uci) {
    try {
      if (parent?.fenAfter && typeof game._applyFENToState === "function") game._applyFENToState(parent.fenAfter);
      game.curNode = parent;
      return applyMoveInPlace(game, uci) ? game.curNode : null;
    } catch { return null; }
  }
  function walk(node, parent) {
    if (!node) return;
    const moveNode = addNode(parent, node.move.uci);
    if (!moveNode) return;
    moveNode.policyReason = node.rule;
    moveNode.comments = [`TRY ${node.move.san} BECAUSE ${node.rule}`];
    const preferred = node.replies.find((reply) => reply.live && reply.child?.proved) || null;
    const variations = node.replies
      .filter((reply) => reply !== preferred && ((reply.live && reply.child?.node) || reply.closure?.witnessUci))
      .sort((a, b) => Number(Boolean(b.live && b.child?.node)) - Number(Boolean(a.live && a.child?.node)))
      .slice(0, 4);
    const replies = preferred ? [preferred, ...variations] : variations;
    for (const reply of replies) {
      const replyNode = addNode(moveNode, reply.move.uci);
      if (!replyNode) continue;
      replyNode.policyReason = reply.live ? "strongest LIVE defense" : reply.closure?.rule;
      replyNode.comments = [reply.live ? `REPLY ${reply.move.san} :: LIVE` : `REPLY ${reply.move.san} :: CLOSED BY ${reply.closure?.rule}`];
      if (reply.live && reply.child?.node) {
        walk(reply.child.node, replyNode);
      } else if (reply.closure?.witnessUci) {
        const witnessNode = addNode(replyNode, reply.closure.witnessUci);
        if (witnessNode) {
          witnessNode.policyReason = reply.closure.rule;
          witnessNode.comments = [`WITNESS ${reply.closure.witness || witnessNode.san} FOR ${reply.closure.rule}`];
        }
      }
    }
  }
  walk(result.proof.node, game.root);
  try { game._applyFENToState(game.root.fenAfter); game.curNode = game.root; game._emit?.(); } catch {}
  return true;
}

export function createReasoner({ createGame, policy, metadata = {} } = {}) {
  if (typeof createGame !== "function") throw new Error("createReasoner requires createGame");
  assertPolicy(policy);
  let result = null;
  let events = [];
  let index = 0;
  let rootFen = "";
  return {
    reset(game) { result = null; events = []; index = 0; rootFen = game?.exportFEN?.() || ""; },
    inspect(game, rootSide = game?.state?.side) { return inspectPosition({ createGame, game, rootSide }); },
    step(game) {
      if (!result) {
        rootFen = game.exportFEN();
        result = solvePosition({ createGame, fen: rootFen, policy, metadata });
        events = result.events;
        index = 0;
      }
      const event = events[index++] || { type: "done", status: result.status, result, log: `Search ended: ${result.status}` };
      return { ...event, status: event.status || (event.type === "terminal" ? result.status : "searching"), result: event.type === "terminal" || event.type === "done" ? result : undefined };
    },
    run(game) {
      result = solvePosition({ createGame, fen: game.exportFEN(), policy, metadata });
      events = result.events;
      index = events.length;
      return result;
    },
    get state() {
      return {
        status: result?.status || "idle",
        finalResult: result,
        history: events.slice(0, index),
        stepCount: index,
        nodes: result?.tryCount || 0
      };
    },
    getState() { return { status: result?.status || "idle", result, history: events.slice(0, index), stepCount: index, nodes: result?.tryCount || 0 }; }
  };
}

export function debugCandidates({ createGame, game, rootSide = game.state.side, policy, gainState = false } = {}) {
  return scoreCandidates(createGame, game, rootSide, policy, gainState).candidates.map((candidate) => ({
    uci: candidate.uci,
    san: candidate.san,
    policyScore: candidate.policyScore,
    stopScore: candidate.stopScore,
    features: candidate.features,
    uses: candidate.uses
  }));
}
