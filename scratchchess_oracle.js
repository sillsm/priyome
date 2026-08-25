/**
 * scratchchess_oracle.js
 *
 * Chess-only adapter for Predicate Chess.
 *
 * ScratchChess owns FEN, legal moves, checks, mate, SAN, promotion, and board
 * state. This file turns the current board and each legal one-ply result into
 * finite position cards consumed by predicate.js. It never applies a move from
 * a child position, searches a continuation, proves a branch, chooses a policy
 * move, pushes or pops the PDA stack, or changes the DFA.
 *
 * Horizon contract: for current position P, the oracle may inspect P, enumerate
 * legal moves m from P, apply each m once to obtain Pm, and assign predicates
 * derived from P, m, and Pm. All proof and continuation reasoning belongs to the
 * visible predicate-policy DFA.
 */

export const SCRATCHCHESS_ORACLE_VERSION = "2.2.0";
export const SCRATCHCHESS_ORACLE_HORIZON = 1;

const PROJECT_SCHEMA = "predicate-policy-dfa-lab/project-v3";

const FILES = "abcdefgh";
const PROMOTIONS = Object.freeze(["q", "r", "b", "n"]);
const VALUES = Object.freeze({ p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 });
const PIECE_NAMES = Object.freeze({ p: "pawn", n: "knight", b: "bishop", r: "rook", q: "queen", k: "king" });

const clone = (value) => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
const other = (side) => side === "w" ? "b" : "w";
const normalizeSide = (side) => {
  if (side !== "w" && side !== "b") throw new Error(`Expected side "w" or "b"; received ${String(side)}`);
  return side;
};
const idx = (file, rank) => (7 - rank) * 8 + file;
const fr = (index) => [index % 8, 7 - Math.floor(index / 8)];
const inBounds = (file, rank) => file >= 0 && file < 8 && rank >= 0 && rank < 8;

function unique(values) {
  return [...new Set(values)];
}

function squareName(index) {
  const [file, rank] = fr(index);
  return `${FILES[file]}${rank + 1}`;
}

function pieceLetter(piece) {
  if (!piece) return "?";
  const letter = ({ p: "P", n: "N", b: "B", r: "R", q: "Q", k: "K" })[piece.type] || "?";
  return piece.color === "w" ? letter : letter.toLowerCase();
}

function pieceLabel(piece, index) {
  return `${pieceLetter(piece)}@${squareName(index)}`;
}

function coloredPieceLabel(piece, index) {
  if (!piece) return `?@${squareName(index)}`;
  const letter = ({ p: "P", n: "N", b: "B", r: "R", q: "Q", k: "K" })[piece.type] || "?";
  return `${piece.color}${letter}@${squareName(index)}`;
}

function pieceLongLabel(piece, index) {
  if (!piece) return `piece@${squareName(index)}`;
  return `${PIECE_NAMES[piece.type] || "piece"}@${squareName(index)}`;
}

function boardOf(game) {
  if (!game?.state || !Array.isArray(game.state.board) || game.state.board.length !== 64) {
    throw new Error("ScratchChess game.state.board[64] is required");
  }
  return game.state.board;
}

function fenFields(fen) {
  if (typeof fen !== "string" || !fen.trim()) throw new Error("A non-empty six-field FEN string is required");
  const fields = fen.trim().split(/\s+/);
  if (fields.length !== 6) throw new Error(`Expected a six-field FEN; received ${fields.length} fields`);
  normalizeSide(fields[1]);
  const fullmove = Number(fields[5]);
  if (!Number.isInteger(fullmove) || fullmove < 1) throw new Error(`Invalid FEN fullmove number ${fields[5]}`);
  return fields;
}

function fenSide(fen) {
  return fenFields(fen)[1];
}


function movePrefix(fen) {
  const fields = fenFields(fen);
  const side = fields[1];
  const fullmove = Number(fields[5]);
  return side === "w" ? `${fullmove}.` : `${fullmove}…`;
}

function safeInCheck(game, side) {
  if (!game || typeof game._isInCheck !== "function") {
    throw new Error("ScratchChess Game._isInCheck(side) is required");
  }
  return Boolean(game._isInCheck(normalizeSide(side)));
}

function clearLine(board, from, to, df, dr) {
  let [file, rank] = fr(from);
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
  const [fromFile, fromRank] = fr(from);
  const [toFile, toRank] = fr(to);
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

function attackersOf(game, target, bySide) {
  const board = boardOf(game);
  const output = [];
  for (let from = 0; from < 64; from += 1) {
    const piece = board[from];
    if (!piece || piece.color !== bySide) continue;
    if (attacksSquare(board, from, target)) output.push(from);
  }
  return output;
}

function attackMap(game, bySide) {
  const board = boardOf(game);
  const map = new Map();
  for (let target = 0; target < 64; target += 1) {
    const piece = board[target];
    if (!piece || piece.color === bySide || piece.type === "k") continue;
    const sources = attackersOf(game, target, bySide);
    if (sources.length) map.set(target, new Set(sources));
  }
  return map;
}

function newAttackFacts(before, after, moverSide, movedTo) {
  const beforeMap = attackMap(before, moverSide);
  const afterMap = attackMap(after, moverSide);
  const facts = [];
  for (const [target, sources] of afterMap.entries()) {
    const previous = beforeMap.get(target) || new Set();
    const newSources = [...sources].filter((source) => !previous.has(source));
    if (!newSources.length) continue;
    const piece = boardOf(after)[target];
    facts.push({
      target,
      piece: clone(piece),
      value: VALUES[piece?.type] || 0,
      sources: newSources,
      discovered: newSources.some((source) => source !== movedTo)
    });
  }
  return facts;
}

function movedTargets(game, from, moverSide) {
  const board = boardOf(game);
  const targets = [];
  for (let target = 0; target < 64; target += 1) {
    const piece = board[target];
    if (!piece || piece.color === moverSide || piece.type === "k") continue;
    if (!attacksSquare(board, from, target)) continue;
    targets.push({ target, piece: clone(piece), value: VALUES[piece.type] || 0, sources: [from], discovered: false });
  }
  return targets;
}

function kingIndex(game, side) {
  return boardOf(game).findIndex((piece) => piece?.color === side && piece.type === "k");
}

function materialBalance(game, perspective) {
  let score = 0;
  for (const piece of boardOf(game)) {
    if (!piece) continue;
    const value = VALUES[piece.type] || 0;
    score += piece.color === perspective ? value : -value;
  }
  return score;
}

function moveNeedsPromotion(game, from, to) {
  const piece = boardOf(game)[from];
  if (!piece || piece.type !== "p") return false;
  const [, rank] = fr(to);
  return (piece.color === "w" && rank === 7) || (piece.color === "b" && rank === 0);
}

export function legalMoveRecords(game) {
  if (!game || typeof game._allLegalMoves !== "function") {
    throw new Error("ScratchChess Game._allLegalMoves(side) is required");
  }
  const side = normalizeSide(game.state?.side);
  const raw = game._allLegalMoves(side);
  if (!Array.isArray(raw)) throw new Error("ScratchChess _allLegalMoves(side) did not return an array");
  const records = [];
  for (const [index, item] of raw.entries()) {
    if (!item || !Number.isInteger(item.from) || !Number.isInteger(item.to)) {
      throw new Error(`ScratchChess legal move ${index} must be {from:int,to:int}`);
    }
    const { from, to } = item;
    const promotions = moveNeedsPromotion(game, from, to) ? PROMOTIONS : [""];
    for (const promotion of promotions) {
      records.push({
        from,
        to,
        promotion,
        uci: `${squareName(from)}${squareName(to)}${promotion}`,
        mover: clone(boardOf(game)[from]),
        captured: clone(boardOf(game)[to])
      });
    }
  }
  const seen = new Set();
  return records.filter((record) => !seen.has(record.uci) && seen.add(record.uci));
}

function applyMove(createGame, gameOrFen, move) {
  if (!move || typeof move.uci !== "string") throw new Error("Oracle move object with uci is required");
  const sourceFen = typeof gameOrFen === "string" ? gameOrFen : gameOrFen?.exportFEN?.();
  fenFields(sourceFen);
  const game = createGame({ Event: "Predicate Chess oracle", Site: "scratchchess_oracle.js" });
  game.loadFEN(sourceFen);
  if (!game.makeMoveUCI(move.uci)) {
    throw new Error(`ScratchChess rejected oracle-generated legal move ${move.uci}`);
  }
  if (game.state?.pendingPromotion || game._pendingPromotion) {
    if (!PROMOTIONS.includes(move.promotion)) throw new Error(`Promotion letter missing for ${move.uci}`);
    game.resolvePendingPromotion(move.promotion.toUpperCase());
  }
  return game;
}

function terminalInfo(game) {
  const moves = legalMoveRecords(game);
  if (moves.length) return null;
  const side = normalizeSide(game.state.side);
  return safeInCheck(game, side)
    ? { kind: "mate", winner: other(side), loser: side }
    : { kind: "stalemate", winner: null, loser: null };
}

function safeSan(after, move) {
  const san = typeof after?.curNode?.san === "string" ? after.curNode.san.trim() : "";
  if (!san) throw new Error(`ScratchChess did not provide SAN for ${move.uci}`);
  return san;
}

function combineAttackTargets(targets) {
  const bySquare = new Map();
  for (const target of targets) {
    const existing = bySquare.get(target.target);
    if (!existing || target.value > existing.value || target.discovered) bySquare.set(target.target, target);
  }
  return [...bySquare.values()].sort((a, b) => b.value - a.value || a.target - b.target);
}


const RAY_DIRECTIONS = Object.freeze([
  [1, 0], [-1, 0], [0, 1], [0, -1],
  [1, 1], [1, -1], [-1, 1], [-1, -1]
]);

function sliderSupportsDirection(piece, df, dr) {
  if (!piece) return false;
  const diagonal = Math.abs(df) === 1 && Math.abs(dr) === 1;
  const straight = (df === 0) !== (dr === 0);
  if (piece.type === "q") return diagonal || straight;
  if (piece.type === "r") return straight;
  if (piece.type === "b") return diagonal;
  return false;
}

function findAlignments(game, side) {
  const board = boardOf(game);
  const output = [];
  const seen = new Set();
  for (let front = 0; front < 64; front += 1) {
    const frontPiece = board[front];
    if (!frontPiece || frontPiece.color !== side) continue;
    const [frontFile, frontRank] = fr(front);
    for (const [df, dr] of RAY_DIRECTIONS) {
      if (!sliderSupportsDirection(frontPiece, df, dr)) continue;
      let file = frontFile + df;
      let rank = frontRank + dr;
      let middle = -1;
      while (inBounds(file, rank)) {
        const square = idx(file, rank);
        const piece = board[square];
        if (piece) {
          if (middle < 0) {
            if (piece.color !== side) break;
            middle = square;
          } else {
            if (piece.color !== side && piece.type !== "k") {
              const key = `${front}:${middle}:${square}`;
              if (!seen.has(key)) {
                seen.add(key);
                output.push({
                  side,
                  front,
                  middle,
                  back: square,
                  direction: [df, dr],
                  frontPiece: clone(frontPiece),
                  middlePiece: clone(board[middle]),
                  backPiece: clone(piece),
                  backValue: VALUES[piece.type] || 0
                });
              }
            }
            break;
          }
        }
        file += df;
        rank += dr;
      }
    }
  }
  return output.sort((a, b) => b.backValue - a.backValue || a.front - b.front || a.middle - b.middle || a.back - b.back);
}

function alignmentFact(binding) {
  return `alignment(front=${coloredPieceLabel(binding.frontPiece, binding.front)},middle=${coloredPieceLabel(binding.middlePiece, binding.middle)},back=${coloredPieceLabel(binding.backPiece, binding.back)})`;
}

function bindingSurvives(board, binding) {
  const frontPiece = board[binding.front];
  const backPiece = board[binding.back];
  const [df, dr] = binding.direction;
  return Boolean(
    frontPiece
    && frontPiece.color === binding.side
    && sliderSupportsDirection(frontPiece, df, dr)
    && !board[binding.middle]
    && backPiece
    && backPiece.color === other(binding.side)
  );
}



function attackersOnBoard(board, target, bySide) {
  const output = [];
  for (let from = 0; from < 64; from += 1) {
    const piece = board[from];
    if (!piece || piece.color !== bySide || from === target) continue;
    if (attacksSquare(board, from, target)) output.push(from);
  }
  return output;
}

function directionBetween(from, to) {
  const [fromFile, fromRank] = fr(from);
  const [toFile, toRank] = fr(to);
  const df = toFile - fromFile;
  const dr = toRank - fromRank;
  if (df === 0 && dr !== 0) return [0, Math.sign(dr)];
  if (dr === 0 && df !== 0) return [Math.sign(df), 0];
  if (Math.abs(df) === Math.abs(dr) && df !== 0) return [Math.sign(df), Math.sign(dr)];
  return null;
}

function isAbsolutelyPinnedOnBoard(board, square, side) {
  const piece = board[square];
  if (!piece || piece.color !== side || piece.type === "k") return false;
  const king = board.findIndex((item) => item?.color === side && item.type === "k");
  if (king < 0) return false;
  const direction = directionBetween(king, square);
  if (!direction) return false;
  const [df, dr] = direction;
  let [file, rank] = fr(king);
  file += df;
  rank += dr;
  while (inBounds(file, rank)) {
    const current = idx(file, rank);
    if (current === square) break;
    if (board[current]) return false;
    file += df;
    rank += dr;
  }
  if (!inBounds(file, rank)) return false;
  file += df;
  rank += dr;
  while (inBounds(file, rank)) {
    const current = idx(file, rank);
    const blocker = board[current];
    if (!blocker) {
      file += df;
      rank += dr;
      continue;
    }
    return blocker.color !== side && sliderSupportsDirection(blocker, df, dr);
  }
  return false;
}

function effectiveDefendersOnBoard(board, target, side) {
  return attackersOnBoard(board, target, side)
    .filter((square) => !isAbsolutelyPinnedOnBoard(board, square, side));
}

function effectiveAttackersOnBoard(board, target, side) {
  return attackersOnBoard(board, target, side)
    .filter((square) => !isAbsolutelyPinnedOnBoard(board, square, side));
}

function findAddedTacticalAttacks(beforeBoard, afterBoard, moverSide) {
  const looseNonPawns = [];
  const pinnedPieces = [];

  for (let target = 0; target < 64; target += 1) {
    const targetPiece = afterBoard[target];
    if (!targetPiece || targetPiece.color === moverSide || targetPiece.type === "k") continue;

    const beforeAttackers = new Set(effectiveAttackersOnBoard(beforeBoard, target, moverSide));
    const afterAttackers = effectiveAttackersOnBoard(afterBoard, target, moverSide);
    const addedAttackers = afterAttackers.filter((square) => !beforeAttackers.has(square));
    if (afterAttackers.length <= beforeAttackers.size || !addedAttackers.length) continue;

    const defenders = effectiveDefendersOnBoard(afterBoard, target, targetPiece.color);
    const record = {
      target,
      targetPiece: clone(targetPiece),
      addedAttackers,
      afterAttackers,
      defenders
    };

    if (targetPiece.type !== "p" && defenders.length === 0) looseNonPawns.push(record);
    if (isAbsolutelyPinnedOnBoard(afterBoard, target, targetPiece.color)) pinnedPieces.push(record);
  }

  const order = (a, b) =>
    (VALUES[b.targetPiece?.type] || 0) - (VALUES[a.targetPiece?.type] || 0)
    || a.target - b.target;
  looseNonPawns.sort(order);
  pinnedPieces.sort(order);
  return { looseNonPawns, pinnedPieces };
}

function samePieceAt(board, square, descriptor) {
  const piece = board[square];
  return Boolean(piece && descriptor && piece.color === descriptor.color && piece.type === descriptor.type);
}

function targetObjectiveKey(target) {
  return `${target.attackerSquare}:${target.targetSquare}:${target.source}`;
}

function factToken(value) {
  return String(value || "").replace(/\s+/g, "_");
}

function stateSideForFen(fen, rootSide) {
  return fenSide(fen) === rootSide ? "my" : "their";
}

function cloneCard(card) {
  return clone(card);
}

export class ScratchChessOracle {
  constructor(config = {}) {
    if (!config || typeof config !== "object" || Array.isArray(config)) {
      throw new TypeError("ScratchChessOracle requires one configuration object");
    }
    const allowed = new Set([
      "createGame", "reply_limit", "reply_class_limit", "objective_gain",
      "max_positions", "attack_min_value"
    ]);
    const unknown = Object.keys(config).filter((key) => !allowed.has(key));
    if (unknown.length) throw new Error(`Unknown oracle option(s): ${unknown.join(", ")}`);
    if (typeof config.createGame !== "function") throw new TypeError("ScratchChessOracle requires createGame(options)");
    const integerMinimums = {
      reply_limit: 1,
      reply_class_limit: 1,
      objective_gain: 1,
      max_positions: 1,
      attack_min_value: 0
    };
    for (const [key, minimum] of Object.entries(integerMinimums)) {
      const value = config[key];
      if (!Number.isInteger(value) || value < minimum) {
        throw new Error(`oracle ${key} must be an integer >= ${minimum}`);
      }
    }
    this.createGame = config.createGame;
    this.options = {
      reply_limit: config.reply_limit,
      reply_class_limit: config.reply_class_limit,
      objective_gain: config.objective_gain,
      max_positions: config.max_positions,
      attack_min_value: config.attack_min_value
    };
    this.cards = new Map();
    this.analysis = new Map();
    this.rootSide = null;
    this.rootMaterial = null;
    this.rootId = "root";
    this.puzzle = null;
    this.policyDepth = null;
    this.horizon = SCRATCHCHESS_ORACLE_HORIZON;
  }

  reset({ fen, title, theme = "", solution = "", where = "", policyDepth } = {}) {
    fenFields(fen);
    if (typeof title !== "string" || !title.trim()) throw new Error("Oracle reset requires a non-empty title");
    if (!Number.isInteger(policyDepth) || policyDepth < 0) throw new Error("Oracle reset requires policyDepth as an integer >= 0");
    this.cards.clear();
    this.analysis.clear();
    this.rootSide = fenSide(fen);
    this.policyDepth = policyDepth;
    const rootGame = this.createGame({ Event: title, Site: "Predicate Chess" });
    rootGame.loadFEN(fen);
    this.rootMaterial = materialBalance(rootGame, this.rootSide);
    this.puzzle = { title, fen, theme, solution, where };
    const rootPredicates = ["starting_position"];
    if (safeInCheck(rootGame, this.rootSide)) rootPredicates.push("in_check");
    const terminal = terminalInfo(rootGame);
    if (terminal?.kind === "mate") rootPredicates.push(terminal.winner === this.rootSide ? "mate" : "mated");
    if (terminal?.kind === "stalemate") rootPredicates.push("stalemate");
    const root = {
      id: this.rootId,
      display: title,
      label: title,
      side: "my",
      predicates: unique(rootPredicates),
      facts: [theme ? `theme(${factToken(theme)})` : "root_position", "oracle_horizon(1)"],
      help: "ScratchChess root position. Oracle horizon: current board plus one legal ply.",
      fen,
      depth: 0,
      children: [],
      expanded: false,
      prepared: false,
      move: null,
      meta: {
        root: true,
        theme,
        solution,
        where,
        lastMove: null,
        attackTargets: [],
        alignments: [],
        activeAlignmentBindings: [],
        alignmentCapture: null,
        activeObjective: null,
        materialSwing: 0
      }
    };
    this.cards.set(root.id, root);
    return cloneCard(root);
  }

  createProject(policy, name) {
    if (!this.puzzle) throw new Error("createProject requires oracle.reset(...) first");
    if (!policy) throw new Error("createProject requires a predicate.js policy");
    if (typeof name !== "string" || !name.trim()) throw new Error("createProject requires a non-empty project name");
    return {
      schema: PROJECT_SCHEMA,
      name,
      initial: [this.rootId],
      policy: clone(policy),
      positions: [...this.cards.values()].map(cloneCard),
      tests: []
    };
  }

  getPosition(id) {
    const card = this.cards.get(id);
    return card ? cloneCard(card) : null;
  }

  getPositions() {
    return [...this.cards.values()].map(cloneCard);
  }

  _game(fen, title) {
    fenFields(fen);
    if (typeof title !== "string" || !title.trim()) throw new Error("Oracle game creation requires a non-empty title");
    const game = this.createGame({ Event: title, Site: "scratchchess_oracle.js" });
    game.loadFEN(fen);
    return game;
  }


  _staticSoleDefenderTargets(beforeGame, afterGame, move, capturedBefore, materialSwing) {
    if (!capturedBefore || capturedBefore.color === this.rootSide || capturedBefore.type === "k") return [];
    const beforeBoard = boardOf(beforeGame);
    const afterBoard = boardOf(afterGame);
    const defenderSquare = move.to;
    const targetSide = capturedBefore.color;
    const minimumGain = Number(this.options.objective_gain);
    const output = [];

    for (let targetSquare = 0; targetSquare < 64; targetSquare += 1) {
      if (targetSquare === defenderSquare) continue;
      const targetBefore = beforeBoard[targetSquare];
      const targetAfter = afterBoard[targetSquare];
      if (!targetBefore || !targetAfter || targetBefore.color !== targetSide || targetBefore.type === "k") continue;
      if (targetAfter.color !== targetSide || targetAfter.type !== targetBefore.type) continue;
      const defenders = effectiveDefendersOnBoard(beforeBoard, targetSquare, targetSide);
      if (defenders.length !== 1 || defenders[0] !== defenderSquare) continue;
      const attackers = attackersOnBoard(afterBoard, targetSquare, this.rootSide)
        .filter((square) => !isAbsolutelyPinnedOnBoard(afterBoard, square, this.rootSide));
      if (!attackers.length) continue;
      const targetValue = VALUES[targetAfter.type] || 0;
      const projectedMaterialSwing = materialSwing + targetValue;
      if (projectedMaterialSwing < minimumGain) continue;
      output.push({
        source: "sole_defender_removed",
        minimumGain,
        targetSquare,
        targetPiece: clone(targetAfter),
        targetValue,
        attackerSquare: attackers[0],
        attackerPiece: clone(afterBoard[attackers[0]]),
        defenderSquare,
        defenderPiece: clone(capturedBefore),
        projectedMaterialSwing,
        sourceMove: move.uci
      });
    }
    return output;
  }

  _staticCheckingTargets(afterGame, move, check, materialSwing) {
    if (!check) return [];
    const board = boardOf(afterGame);
    const attacker = board[move.to];
    if (!attacker || attacker.color !== this.rootSide || !["b", "r", "q"].includes(attacker.type)) return [];

    // A king-adjacent attacker is not promoted to a target objective. That is a
    // static board predicate, not a legal-response probe; the move remains an
    // ordinary check for the policy to consider later.
    const enemyKing = board.findIndex((piece) => piece?.color === other(this.rootSide) && piece.type === "k");
    if (enemyKing >= 0 && attacksSquare(board, enemyKing, move.to)) return [];

    const minimumGain = Number(this.options.objective_gain);
    const output = [];

    // Direct attacked targets on the resulting one-ply board.
    for (let targetSquare = 0; targetSquare < 64; targetSquare += 1) {
      const targetPiece = board[targetSquare];
      if (!targetPiece || targetPiece.color === this.rootSide || targetPiece.type === "k") continue;
      if (!attacksSquare(board, move.to, targetSquare)) continue;
      const targetValue = VALUES[targetPiece.type] || 0;
      const projectedMaterialSwing = materialSwing + targetValue;
      if (targetValue < this.options.attack_min_value || projectedMaterialSwing < minimumGain) continue;
      output.push({
        source: "checking_attack",
        minimumGain,
        targetSquare,
        targetPiece: clone(targetPiece),
        targetValue,
        attackerSquare: move.to,
        attackerPiece: clone(attacker),
        projectedMaterialSwing,
        sourceMove: move.uci
      });
    }

    // Skewers visible on the resulting one-ply board: attacker, enemy king,
    // then an enemy material target on the same ray.
    const [attackerFile, attackerRank] = fr(move.to);
    for (const [df, dr] of RAY_DIRECTIONS) {
      if (!sliderSupportsDirection(attacker, df, dr)) continue;
      let file = attackerFile + df;
      let rank = attackerRank + dr;
      let blockerSquare = -1;
      let blockerPiece = null;
      while (inBounds(file, rank)) {
        const square = idx(file, rank);
        const piece = board[square];
        if (piece) {
          if (blockerSquare < 0) {
            if (piece.color !== this.rootSide && piece.type === "k") {
              blockerSquare = square;
              blockerPiece = clone(piece);
            } else {
              break;
            }
          } else {
            if (piece.color !== this.rootSide && piece.type !== "k") {
              const targetValue = VALUES[piece.type] || 0;
              const projectedMaterialSwing = materialSwing + targetValue;
              if (targetValue >= this.options.attack_min_value && projectedMaterialSwing >= minimumGain) {
                output.push({
                  source: "skewer",
                  minimumGain,
                  targetSquare: square,
                  targetPiece: clone(piece),
                  targetValue,
                  attackerSquare: move.to,
                  attackerPiece: clone(attacker),
                  blockerSquare,
                  blockerPiece,
                  projectedMaterialSwing,
                  sourceMove: move.uci
                });
              }
            }
            break;
          }
        }
        file += df;
        rank += dr;
      }
    }

    const seen = new Set();
    return output.filter((target) => {
      const key = targetObjectiveKey(target);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  _targetStillLiveOnBoard(board, target, currentMaterialSwing, movedTargetSquare = null) {
    const targetSquare = Number.isInteger(movedTargetSquare) ? movedTargetSquare : target.targetSquare;
    const targetPiece = board[targetSquare];
    const attackerPiece = board[target.attackerSquare];
    if (!targetPiece || targetPiece.color === this.rootSide || targetPiece.type === "k") {
      return { live: false, targetSquare, reason: "target_gone", defenders: [] };
    }
    if (!attackerPiece || attackerPiece.color !== this.rootSide
      || attackerPiece.type !== target.attackerPiece?.type) {
      return { live: false, targetSquare, reason: "attacker_gone", defenders: [] };
    }
    if (!attacksSquare(board, target.attackerSquare, targetSquare)) {
      return { live: false, targetSquare, reason: "line_or_attack_broken", defenders: [] };
    }
    const defenders = effectiveDefendersOnBoard(board, targetSquare, targetPiece.color);
    if (defenders.length) {
      return { live: false, targetSquare, reason: "defended", defenders };
    }
    const projectedMaterialSwing = Number(currentMaterialSwing) + (VALUES[targetPiece.type] || 0);
    if (projectedMaterialSwing < target.minimumGain) {
      return { live: false, targetSquare, reason: "below_objective", defenders: [] };
    }
    return { live: true, targetSquare, reason: "pending_capture_remains", defenders: [], projectedMaterialSwing };
  }

  _objectiveAfterOurMove(parentCard, beforeGame, afterGame, move, capturedBefore, materialSwing, check) {
    const minimumGain = Number(this.options.objective_gain);
    if (materialSwing >= minimumGain) {
      return {
        kind: "material_lead",
        minimumGain,
        materialSwing,
        sourceMove: move.uci
      };
    }

    // Bind one concrete, human-readable tactical relation. Direct checking
    // attacks are listed before skewers; a removed sole defender is listed
    // before either. The oracle records the relation but does not play the
    // intended capture or search a continuation.
    const candidates = [
      ...this._staticSoleDefenderTargets(beforeGame, afterGame, move, capturedBefore, materialSwing),
      ...this._staticCheckingTargets(afterGame, move, check, materialSwing)
    ];

    const primary = candidates[0] || null;
    if (primary) {
      const kind = primary.source === "skewer"
        ? "skewer"
        : primary.source === "sole_defender_removed"
          ? "loose_piece"
          : "attacked_piece";
      return { ...clone(primary), kind };
    }

    const inherited = parentCard.meta?.activeObjective;
    if (inherited && ["attacked_piece", "loose_piece", "skewer"].includes(inherited.kind)) {
      const status = this._targetStillLiveOnBoard(boardOf(afterGame), inherited, materialSwing);
      if (status.live) return clone(inherited);
    }
    return null;
  }

  _tagHumanReply(child, tactic) {
    const predicates = [];
    const facts = [];
    const add = (predicate, fact) => {
      predicates.push(predicate);
      if (fact) facts.push(fact);
    };

    // Up-material reply generation needs no invented predicate: mate,
    // recapture, and check are already ordinary one-ply move predicates.
    if (!tactic || tactic.kind === "material_lead") return [];

    const game = this._game(child.fen, `${child.display} human reply facts`);
    const board = boardOf(game);
    const movedTargetSquare = child.move?.fromIndex === tactic.targetSquare
      ? child.move.toIndex
      : null;
    const status = this._targetStillLiveOnBoard(
      board,
      tactic,
      child.meta?.materialSwing,
      movedTargetSquare
    );

    const capturedAttacker = Number.isInteger(tactic.attackerSquare)
      && child.move?.toIndex === tactic.attackerSquare
      && child.move?.captured?.color === this.rootSide;
    if (capturedAttacker || status.reason === "attacker_gone") {
      add("capture_attacker", `capture_attacker(${child.move?.san || child.display})`);
    }

    if (Number.isInteger(movedTargetSquare)) {
      const predicate = tactic.kind === "skewer" ? "move_skewered_piece" : "move_attacked_piece";
      add(predicate, `${predicate}(${child.move?.san || child.display})`);
    }

    if (status.reason === "defended") {
      const predicate = tactic.kind === "skewer" ? "defend_skewered_piece" : "defend_attacked_piece";
      add(predicate, `${predicate}(${squareName(status.targetSquare)},count=${status.defenders.length})`);
    }

    if (status.reason === "line_or_attack_broken") {
      const predicate = tactic.kind === "skewer" ? "block_skewer" : "block_attack";
      add(predicate, `${predicate}(${child.move?.san || child.display})`);
    }

    if (predicates.length) child.predicates = unique([...child.predicates, ...predicates]);
    child.facts = unique([
      ...child.facts,
      `tactical_reply_status(kind=${tactic.kind},target=${squareName(tactic.targetSquare)},status=${status.reason})`,
      ...facts
    ]);
    return unique(predicates);
  }
  _analyzeMove(parentCard, game, move) {
    const moverSide = normalizeSide(game.state.side);
    const boardBefore = boardOf(game);
    const mover = clone(boardBefore[move.from]);
    const capturedBefore = clone(boardBefore[move.to]);
    const beforeMaterial = materialBalance(game, this.rootSide);
    const after = applyMove(this.createGame, game, move); // the oracle's only applied ply
    const san = safeSan(after, move);
    const afterFen = after.exportFEN();
    const mate = /#$/.test(san);
    const check = mate || safeInCheck(after, other(moverSide));
    const capture = Boolean(capturedBefore) || /x/.test(san);
    const recapture = Boolean(capture && parentCard.meta?.lastMove && move.to === parentCard.meta.lastMove.to);
    const directTargets = movedTargets(after, move.to, moverSide);
    const newTargets = newAttackFacts(game, after, moverSide, move.to);
    const attackTargets = combineAttackTargets([...directTargets, ...newTargets])
      .filter((target) => target.value >= this.options.attack_min_value);
    const afterMaterial = materialBalance(after, this.rootSide);
    const materialSwing = afterMaterial - this.rootMaterial;
    const predicates = ["legal_move"];
    const facts = [`legal_move(${san})`];

    if (mate) {
      predicates.push(moverSide === this.rootSide ? "mate" : "mated");
      facts.push(`mate(${san})`);
    } else if (check) {
      predicates.push("check");
      facts.push(`check(${san})`);
    }
    if (mover?.type === "k") {
      predicates.push("king_move");
      facts.push(`king_move(${san})`);
    }
    if (capture) {
      predicates.push("capture");
      const capturedLabel = capturedBefore ? coloredPieceLabel(capturedBefore, move.to) : `piece@${squareName(move.to)}`;
      facts.push(`capture(${san},${capturedLabel})`);
      facts.push(`capture_value(${VALUES[capturedBefore?.type] || 0})`);
      if (capturedBefore && !["p", "k"].includes(capturedBefore.type)
        && effectiveDefendersOnBoard(boardBefore, move.to, capturedBefore.color).length === 0) {
        predicates.push("capture_loose_non_pawn_piece");
        facts.push(`capture_loose_non_pawn_piece(${san},${capturedLabel})`);
      }
    }
    if (recapture) {
      predicates.push("recapture");
      facts.push(`recapture(${san},${squareName(move.to)})`);
    }
    if (parentCard.side === "my" && parentCard.predicates.includes("in_check")) {
      predicates.push("check_response");
      facts.push(`check_response(${san})`);
    }
    if (materialSwing >= Number(this.options.objective_gain)) {
      predicates.push("up_material");
      facts.push(`up_material(+${materialSwing})`);
    } else if (materialSwing <= -Number(this.options.objective_gain)) {
      predicates.push("down_material");
      facts.push(`down_material(${materialSwing})`);
    }
    if (attackTargets.length) {
      attackTargets.slice(0, 6).forEach((target) => {
        facts.push(`${target.discovered ? "discovered_" : ""}attack(${pieceLongLabel(target.piece, target.target)})`);
      });
    }

    if (moverSide === this.rootSide) {
      const tacticalAttacks = findAddedTacticalAttacks(boardBefore, boardOf(after), moverSide);
      if (tacticalAttacks.looseNonPawns.length) {
        predicates.push("add_attacker_to_loose_non_pawn_piece");
        tacticalAttacks.looseNonPawns.slice(0, 6).forEach((target) => {
          facts.push(
            `add_attacker_to_loose_non_pawn_piece(target=${coloredPieceLabel(target.targetPiece, target.target)},added=${target.addedAttackers.map(squareName).join("+")})`
          );
        });
      }
      if (tacticalAttacks.pinnedPieces.length) {
        predicates.push("add_attacker_to_pinned_piece");
        tacticalAttacks.pinnedPieces.slice(0, 6).forEach((target) => {
          facts.push(
            `add_attacker_to_pinned_piece(target=${coloredPieceLabel(target.targetPiece, target.target)},added=${target.addedAttackers.map(squareName).join("+")})`
          );
        });
      }
    }

    const availableAlignments = moverSide === this.rootSide
      ? (parentCard.meta?.alignments?.length ? parentCard.meta.alignments : findAlignments(game, moverSide))
      : [];
    const inheritedBindings = Array.isArray(parentCard.meta?.activeAlignmentBindings)
      ? parentCard.meta.activeAlignmentBindings.map(clone)
      : [];
    const candidateBindings = [...inheritedBindings];

    for (const binding of availableAlignments) {
      if (binding.backValue < this.options.objective_gain) continue;
      if (move.from !== binding.middle || !check || boardOf(after)[binding.middle]) continue;
      const frontPiece = boardOf(after)[binding.front];
      const backPiece = boardOf(after)[binding.back];
      if (!frontPiece || frontPiece.color !== binding.side || !backPiece || backPiece.color === binding.side) continue;
      predicates.push("move_middle_with_check");
      facts.push(alignmentFact(binding));
      facts.push(`move_middle_with_check(${san},${squareName(binding.middle)})`);
      candidateBindings.push({ ...clone(binding), phase: "middle_cleared", middleMove: san });
    }

    let alignmentCapture = null;
    for (const binding of candidateBindings) {
      if (moverSide !== binding.side || move.from !== binding.front || move.to !== binding.back || !capture) continue;
      predicates.push("capture_back_of_alignment");
      facts.push(alignmentFact(binding));
      facts.push(`alignment_square_cleared(${squareName(binding.middle)})`);
      facts.push(`capture_back_of_alignment(${san},${coloredPieceLabel(binding.backPiece, binding.back)})`);
      alignmentCapture = {
        target: binding.back,
        targetName: squareName(binding.back),
        capturedValue: VALUES[binding.backPiece?.type] || 0,
        binding: clone(binding)
      };
      break;
    }

    const survivingBindings = candidateBindings.filter((binding) => {
      if (alignmentCapture && binding.back === alignmentCapture.target) return false;
      return bindingSurvives(boardOf(after), binding);
    });

    let activeObjective = clone(parentCard.meta?.activeObjective || null);
    if (moverSide === this.rootSide) {
      activeObjective = this._objectiveAfterOurMove(
        parentCard,
        game,
        after,
        move,
        capturedBefore,
        materialSwing,
        check
      );
      const createdNow = activeObjective?.sourceMove === move.uci;
      if (activeObjective?.kind === "loose_piece") {
        predicates.push("loose_piece");
        if (createdNow) {
          predicates.push("remove_sole_defender");
          facts.push(
            `remove_sole_defender(target=${coloredPieceLabel(activeObjective.targetPiece, activeObjective.targetSquare)},defender=${coloredPieceLabel(activeObjective.defenderPiece, activeObjective.defenderSquare)})`
          );
        }
      } else if (activeObjective?.kind === "attacked_piece") {
        predicates.push("attacked_piece");
        if (createdNow) {
          predicates.push("check_and_attack_piece");
          facts.push(
            `check_and_attack_piece(${san},target=${coloredPieceLabel(activeObjective.targetPiece, activeObjective.targetSquare)})`
          );
        }
      } else if (activeObjective?.kind === "skewer") {
        predicates.push("skewer");
        if (createdNow) {
          facts.push(
            `skewer(attacker=${coloredPieceLabel(activeObjective.attackerPiece, activeObjective.attackerSquare)},middle=${coloredPieceLabel(activeObjective.blockerPiece, activeObjective.blockerSquare)},target=${coloredPieceLabel(activeObjective.targetPiece, activeObjective.targetSquare)})`
          );
        }
      }
    }

    if (materialSwing !== 0) facts.push(`material_swing(${materialSwing > 0 ? "+" : ""}${materialSwing})`);

    const id = `${parentCard.id}/${move.uci}`;
    const display = `${movePrefix(parentCard.fen)} ${san}`;
    return {
      id,
      display,
      label: display,
      side: stateSideForFen(afterFen, this.rootSide),
      predicates: unique(predicates),
      facts: unique(facts),
      help: predicates.length
        ? `One-ply oracle predicates: ${unique(predicates).join(" · ")}`
        : "This legal ply has no configured-policy predicate.",
      fen: afterFen,
      depth: Number(parentCard.depth) + 1,
      children: [],
      expanded: false,
      prepared: false,
      move: {
        uci: move.uci,
        san,
        from: squareName(move.from),
        to: squareName(move.to),
        fromIndex: move.from,
        toIndex: move.to,
        promotion: move.promotion,
        mover: mover ? { color: mover.color, type: mover.type, label: pieceLabel(mover, move.from) } : null,
        captured: capturedBefore ? { color: capturedBefore.color, type: capturedBefore.type, label: pieceLabel(capturedBefore, move.to) } : null
      },
      meta: {
        root: false,
        parentId: parentCard.id,
        lastMove: { from: move.from, to: move.to, uci: move.uci, san, moverSide },
        attackTargets: attackTargets.map((target) => ({
          square: target.target,
          squareName: squareName(target.target),
          piece: clone(target.piece),
          value: target.value,
          discovered: Boolean(target.discovered)
        })),
        alignments: [],
        activeAlignmentBindings: survivingBindings.map(clone),
        alignmentCapture,
        activeObjective: clone(activeObjective),
        materialBefore: beforeMaterial,
        materialAfter: afterMaterial,
        materialSwing,
        captureValue: VALUES[capturedBefore?.type] || 0,
        legalReplyCount: null,
        oracleHorizon: 1
      }
    };
  }

  _classifyHumanReplies(card, analyses) {
    if (card.side !== "their") return false;

    let replyPredicates = null;
    const tactic = card.meta?.activeObjective || null;
    if (card.predicates.includes("up_material")) {
      replyPredicates = ["mated", "recapture", "check"];
    } else if (tactic?.kind === "skewer") {
      analyses.forEach((child) => this._tagHumanReply(child, tactic));
      replyPredicates = [
        "mated",
        "capture_attacker",
        "move_skewered_piece",
        "defend_skewered_piece",
        "block_skewer",
        "check",
        "capture"
      ];
    } else if (["attacked_piece", "loose_piece"].includes(tactic?.kind)) {
      analyses.forEach((child) => this._tagHumanReply(child, tactic));
      replyPredicates = [
        "mated",
        "capture_attacker",
        "move_attacked_piece",
        "defend_attacked_piece",
        "block_attack",
        "check",
        "capture"
      ];
    } else {
      return false;
    }

    const relevant = analyses.filter((child) => replyPredicates.some((predicate) => child.predicates.includes(predicate)));
    const limit = Number(this.options.reply_class_limit);
    if (!Number.isInteger(limit) || limit < 1) {
      throw new Error("oracle reply_class_limit must be an integer >= 1");
    }

    card.facts = unique([
      ...card.facts,
      `relevant_replies(count=${relevant.length},limit=${limit},predicates=${replyPredicates.join("+")})`
    ]);
    if (relevant.length > limit) {
      card.predicates = unique([...card.predicates, "more_than_two_relevant_replies"]);
      card.help = `${relevant.length} immediate replies match the visible human reply card; the policy limit is ${limit}.`;
    }
    return true;
  }

  _preparePosition(id) {
    const card = this.cards.get(id);
    if (!card) throw new Error(`Oracle position ${id} does not exist`);
    if (card.prepared && this.analysis.has(id)) return this.analysis.get(id);

    const game = this._game(card.fen, card.display);
    const sideToMove = normalizeSide(game.state.side);
    const legal = legalMoveRecords(game);
    const inCheck = safeInCheck(game, sideToMove);
    if (inCheck) card.predicates = unique([...card.predicates, "in_check"]);
    card.facts = unique([...card.facts, `legal_moves(${legal.length})`, ...(inCheck ? ["in_check"] : []), "oracle_horizon(1)"]);
    card.meta.legalReplyCount = legal.length;

    const terminal = terminalInfo(game);
    if (terminal?.kind === "mate") {
      card.predicates = unique([...card.predicates, terminal.winner === this.rootSide ? "mate" : "mated"]);
    } else if (terminal?.kind === "stalemate") {
      card.predicates = unique([...card.predicates, "stalemate"]);
    }

    const alignments = sideToMove === this.rootSide ? findAlignments(game, sideToMove) : [];
    card.meta.alignments = alignments.map(clone);
    if (alignments.length) {
      card.predicates = unique([...card.predicates, "alignment"]);
      card.facts = unique([...card.facts, ...alignments.slice(0, 8).map(alignmentFact)]);
    }

    // Exactly one applied move per legal response. Lexical UCI ordering is only
    // deterministic presentation; predicate order in the DFA supplies interest.
    const analyses = legal
      .map((move) => this._analyzeMove(card, game, move))
      .filter(Boolean)
      .sort((a, b) => String(a.move?.uci || "").localeCompare(String(b.move?.uci || "")));

    const threatenedSquares = new Set((card.meta?.attackTargets || []).map((target) => Number(target.square)));
    for (const child of analyses) {
      const fromIndex = Number(child.move?.fromIndex);
      if (threatenedSquares.has(fromIndex)) {
        child.predicates = unique([...child.predicates, "save_piece"]);
        child.facts = unique([...child.facts, `save_piece(${child.move.from})`]);
      }
    }

    const replyLimit = Number(this.options.reply_limit);
    if (!Number.isInteger(replyLimit) || replyLimit < 1) throw new Error("oracle reply_limit must be an integer >= 1");

    const twoOrFewer = card.side === "their" && legal.length <= replyLimit;
    if (twoOrFewer) {
      card.predicates = unique([...card.predicates, "two_or_fewer_legal_moves"]);
      card.facts = unique([...card.facts, `two_or_fewer_legal_moves(count=${legal.length},limit=${replyLimit})`]);
    }

    let classified = false;
    if (card.side === "their" && card.predicates.includes("up_material")) {
      classified = this._classifyHumanReplies(card, analyses);
    } else if (card.side === "their" && !twoOrFewer
      && ["attacked_piece", "loose_piece", "skewer"].includes(card.meta?.activeObjective?.kind)) {
      classified = this._classifyHumanReplies(card, analyses);
    }

    if (card.side === "their"
      && !card.predicates.includes("up_material")
      && !twoOrFewer
      && !classified
      && !card.predicates.includes("mated")
      && !card.predicates.includes("stalemate")) {
      card.predicates = unique([...card.predicates, "more_than_two_legal_replies"]);
      card.facts = unique([...card.facts, `more_than_two_legal_replies(count=${legal.length},limit=${replyLimit})`]);
      card.help = `The opponent has ${legal.length} legal moves and no human reply card in this basic policy narrows them.`;
    }

    card.prepared = true;
    this.analysis.set(id, analyses);
    return analyses;
  }

  preparePosition(id) {
    this._preparePosition(id);
    return this.getPosition(id);
  }

  expandPosition(id) {
    const card = this.cards.get(id);
    if (!card) throw new Error(`Oracle position ${id} does not exist`);
    if (card.expanded) return this.getPosition(id);
    if (Number(card.depth) >= this.policyDepth) {
      card.expanded = true;
      card.children = [];
      return this.getPosition(id);
    }

    const analyses = this._preparePosition(id);
    if (card.predicates.includes("unexplorable")) {
      card.expanded = true;
      card.children = [];
      return this.getPosition(id);
    }

    const expandedChildren = analyses;

    const maxPositions = this.options.max_positions;
    const unseen = expandedChildren.filter((child) => !this.cards.has(child.id));
    if (this.cards.size + unseen.length > maxPositions) {
      card.predicates = unique([...card.predicates, "oracle_limit", "unexplorable"]);
      card.facts = unique([...card.facts, `oracle_limit(${maxPositions})`]);
      card.help = `Expanding this legal ply set would exceed the oracle card limit ${maxPositions}.`;
      card.expanded = true;
      card.children = [];
      return this.getPosition(id);
    }

    for (const child of expandedChildren) {
      if (!this.cards.has(child.id)) this.cards.set(child.id, child);
    }
    card.children = expandedChildren.map((child) => child.id);
    card.expanded = true;
    return this.getPosition(id);
  }

  _syncCardToRunner(runner, id) {
    const card = this.cards.get(id);
    if (!card) return;
    runner.positions.set(id, cloneCard(card));
    if (!Array.isArray(runner.project.positions)) runner.project.positions = [];
    const index = runner.project.positions.findIndex((position) => position.id === id);
    if (index >= 0) runner.project.positions[index] = cloneCard(card);
    else runner.project.positions.push(cloneCard(card));
  }

  /**
   * Make the current ScratchChess facts available before predicate.js executes
   * its next state. This mutates only the runner's oracle position map.
   */
  hydrateRunner(runner) {
    const snapshot = runner?.snapshot?.();
    const id = snapshot?.current?.id;
    if (!id) return { changed: false, added: [] };
    const beforeIds = new Set(this.cards.keys());
    if (snapshot.stateKind === "inspect") this.preparePosition(id);
    if (snapshot.stateKind === "search") this.expandPosition(id);
    this._syncCardToRunner(runner, id);
    const added = [...this.cards.keys()].filter((cardId) => !beforeIds.has(cardId));
    added.forEach((cardId) => this._syncCardToRunner(runner, cardId));
    // Existing child cards may have received reply-group predicates while the
    // parent was prepared, so synchronize every listed child as well.
    const parent = this.cards.get(id);
    (parent?.children || []).forEach((childId) => this._syncCardToRunner(runner, childId));
    return { changed: true, added };
  }

  summary() {
    return {
      version: SCRATCHCHESS_ORACLE_VERSION,
      horizon: SCRATCHCHESS_ORACLE_HORIZON,
      puzzle: clone(this.puzzle),
      rootSide: this.rootSide,
      rootMaterial: this.rootMaterial,
      cards: this.cards.size,
      prepared: [...this.cards.values()].filter((card) => card.prepared).length,
      expanded: [...this.cards.values()].filter((card) => card.expanded).length,
      options: clone(this.options)
    };
  }
}

export function createScratchChessOracle(options) {
  return new ScratchChessOracle(options);
}

export default createScratchChessOracle;
