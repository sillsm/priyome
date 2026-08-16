/**
 * scratchchess_oracle.js
 *
 * Chess-only adapter for Predicate Chess.
 *
 * ScratchChess owns FEN, legal moves, checks, mate, SAN, promotion, and board
 * state. This file turns those facts into the finite position cards consumed by
 * predicate.js. It also certifies bounded material-objective reply classes, but
 * it never chooses a policy move, pushes a position, pops a position, or changes
 * the DFA.
 */

export const SCRATCHCHESS_ORACLE_VERSION = "1.4.0";

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

function normalizedFen(fen) {
  return fenFields(fen).slice(0, 4).join(" ");
}

function forceFenSide(fen, side) {
  const fields = fenFields(fen);
  fields[1] = normalizeSide(side);
  // En-passant rights belong to the actual move sequence and can become invalid
  // when asking the counterfactual question "does this side have mate in one?".
  fields[3] = "-";
  return fields.join(" ");
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

function childInterestScore(child) {
  const predicates = new Set(child.predicates || []);
  let score = 0;
  if (predicates.has("mate") || predicates.has("mated")) score += 100000;
  if (predicates.has("move_middle_with_check")) score += 90000;
  if (predicates.has("capture_back_of_alignment")) score += 85000;
  if (predicates.has("recapture")) score += 80000;
  if (predicates.has("check")) score += 10000;
  if (predicates.has("capture")) score += 1000;
  score += Number(child.meta?.captureValue || 0) * 100;
  score += Number(child.meta?.materialSwing || 0);
  return score;
}

function compareAnalyses(a, b) {
  return childInterestScore(b) - childInterestScore(a)
    || Number(b.meta?.captureValue || 0) - Number(a.meta?.captureValue || 0)
    || String(a.move?.uci || "").localeCompare(String(b.move?.uci || ""));
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

function controlMarkerCard(parentCard, kind) {
  const isOr = kind === "or_choice_boundary";
  const id = `${parentCard.id}/@${isOr ? "or" : "and"}`;
  return {
    id,
    display: isOr ? "OR choice boundary" : "AND reply boundary",
    label: isOr ? "OR choice boundary" : "AND reply boundary",
    side: parentCard.side,
    predicates: [kind, "control_marker"],
    facts: [`control_marker(${isOr ? "or_choice" : "and_replies"})`],
    help: isOr
      ? "Control position: every retained candidate above this boundary failed."
      : "Control position: every required opponent reply above this boundary was discharged.",
    fen: parentCard.fen,
    depth: Number(parentCard.depth) + 1,
    children: [],
    expanded: true,
    prepared: true,
    move: null,
    meta: {
      root: false,
      parentId: parentCard.id,
      controlMarker: kind,
      materialSwing: Number(parentCard.meta?.materialSwing || 0)
    }
  };
}

export class ScratchChessOracle {
  constructor(config = {}) {
    if (!config || typeof config !== "object" || Array.isArray(config)) {
      throw new TypeError("ScratchChessOracle requires one configuration object");
    }
    const allowed = new Set([
      "createGame", "reply_limit", "reply_class_limit", "objective_gain",
      "objective_probe_depth", "objective_probe_limit", "max_positions",
      "mate_probe", "mate_probe_limit", "attack_min_value"
    ]);
    const unknown = Object.keys(config).filter((key) => !allowed.has(key));
    if (unknown.length) throw new Error(`Unknown oracle option(s): ${unknown.join(", ")}`);
    if (typeof config.createGame !== "function") throw new TypeError("ScratchChessOracle requires createGame(options)");
    const integerMinimums = {
      reply_limit: 1,
      reply_class_limit: 1,
      objective_gain: 1,
      objective_probe_depth: 1,
      objective_probe_limit: 1,
      max_positions: 1,
      mate_probe_limit: 1,
      attack_min_value: 0
    };
    for (const [key, minimum] of Object.entries(integerMinimums)) {
      const value = config[key];
      if (!Number.isInteger(value) || value < minimum) {
        throw new Error(`oracle ${key} must be an integer >= ${minimum}`);
      }
    }
    if (typeof config.mate_probe !== "boolean") throw new Error("oracle mate_probe must be boolean");
    this.createGame = config.createGame;
    this.options = {
      reply_limit: config.reply_limit,
      reply_class_limit: config.reply_class_limit,
      objective_gain: config.objective_gain,
      objective_probe_depth: config.objective_probe_depth,
      objective_probe_limit: config.objective_probe_limit,
      max_positions: config.max_positions,
      mate_probe: config.mate_probe,
      mate_probe_limit: config.mate_probe_limit,
      attack_min_value: config.attack_min_value
    };
    this.cards = new Map();
    this.analysis = new Map();
    this.mateOneCache = new Map();
    this.rootSide = null;
    this.rootMaterial = null;
    this.rootId = "root";
    this.puzzle = null;
    this.policyDepth = null;
  }

  reset({ fen, title, theme = "", solution = "", where = "", policyDepth } = {}) {
    fenFields(fen);
    if (typeof title !== "string" || !title.trim()) throw new Error("Oracle reset requires a non-empty title");
    if (!Number.isInteger(policyDepth) || policyDepth < 0) throw new Error("Oracle reset requires policyDepth as an integer >= 0");
    this.cards.clear();
    this.analysis.clear();
    this.mateOneCache.clear();
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
      facts: [theme ? `theme(${factToken(theme)})` : "root_position"],
      help: "ScratchChess root position.",
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

  _mateInOneFacts(fen, side) {
    if (!this.options.mate_probe) return [];
    const key = `${normalizedFen(fen)}|${side}`;
    if (this.mateOneCache.has(key)) return clone(this.mateOneCache.get(key));
    const game = this._game(forceFenSide(fen, side), "mate-in-one probe");
    const legal = legalMoveRecords(game).slice(0, this.options.mate_probe_limit);
    const output = [];
    for (const move of legal) {
      const after = applyMove(this.createGame, game, move);
      if (!after) continue;
      const terminal = terminalInfo(after);
      if (terminal?.kind === "mate" && terminal.winner === side) {
        output.push({ uci: move.uci, san: safeSan(after, move) });
      }
    }
    this.mateOneCache.set(key, output);
    return clone(output);
  }

  _shouldProbeMateThreat(after, moverSide, move, isCapture, isCheck, attackTargets) {
    if (!this.options.mate_probe) return false;
    if (isCheck || isCapture || attackTargets.some((target) => target.value >= 3)) return true;
    const king = kingIndex(after, other(moverSide));
    if (king < 0) return false;
    const [kf, kr] = fr(king);
    const [mf, mr] = fr(move.to);
    return Math.max(Math.abs(kf - mf), Math.abs(kr - mr)) <= 2;
  }

  _rawMoveInfo(game, move, parentLastMove = null) {
    const moverSide = normalizeSide(game.state.side);
    const boardBefore = boardOf(game);
    const captured = clone(boardBefore[move.to]);
    const after = applyMove(this.createGame, game, move);
    const san = safeSan(after, move);
    const terminal = terminalInfo(after);
    const check = safeInCheck(after, other(moverSide));
    const capture = Boolean(captured) || /x/.test(san);
    const recapture = Boolean(capture && parentLastMove && move.to === parentLastMove.to);
    return {
      move,
      moverSide,
      after,
      afterFen: after.exportFEN(),
      san,
      terminal,
      check,
      capture,
      recapture,
      captureValue: VALUES[captured?.type] || 0,
      materialSwing: materialBalance(after, this.rootSide) - this.rootMaterial
    };
  }

  _objectiveCanBeHeld(fen, depth, memo = new Map()) {
    const objectiveGain = Number(this.options.objective_gain);
    const probeLimit = Number(this.options.objective_probe_limit);
    if (!Number.isFinite(objectiveGain) || objectiveGain < 1) throw new Error("oracle objective_gain must be a number >= 1");
    if (!Number.isInteger(probeLimit) || probeLimit < 1) throw new Error("oracle objective_probe_limit must be an integer >= 1");

    const key = `${normalizedFen(fen)}|${depth}`;
    if (memo.has(key)) return memo.get(key);
    if (depth < 0) return false;

    const game = this._game(fen, "objective lock probe");
    const side = normalizeSide(game.state.side);
    const legal = legalMoveRecords(game);
    const inCheck = safeInCheck(game, side);
    const swing = materialBalance(game, this.rootSide) - this.rootMaterial;

    if (!legal.length) {
      const result = inCheck ? other(side) === this.rootSide : false;
      memo.set(key, result);
      return result;
    }
    if (depth === 0) {
      const result = swing >= objectiveGain && !inCheck;
      memo.set(key, result);
      return result;
    }
    if (legal.length > probeLimit) {
      memo.set(key, false);
      return false;
    }

    const infos = legal.map((move) => this._rawMoveInfo(game, move)).sort((a, b) => {
      const score = (info) => (info.terminal?.kind === "mate" ? 100000 : 0)
        + (info.check ? 10000 : 0)
        + (info.capture ? 1000 : 0)
        + info.captureValue * 100;
      return score(b) - score(a) || String(a.move.uci).localeCompare(String(b.move.uci));
    });

    if (side === this.rootSide) {
      for (const info of infos) {
        if (this._objectiveCanBeHeld(info.afterFen, depth - 1, memo)) {
          memo.set(key, true);
          return true;
        }
      }
      memo.set(key, false);
      return false;
    }

    if (swing < objectiveGain) {
      memo.set(key, false);
      return false;
    }

    const forcing = inCheck
      ? infos
      : infos.filter((info) => info.terminal?.kind === "mate" || info.check || info.capture);
    if (!forcing.length) {
      memo.set(key, true);
      return true;
    }
    const result = forcing.every((info) => this._objectiveCanBeHeld(info.afterFen, depth - 1, memo));
    memo.set(key, result);
    return result;
  }

  _analyzeMove(parentCard, game, move) {
    const moverSide = normalizeSide(game.state.side);
    const boardBefore = boardOf(game);
    const mover = clone(boardBefore[move.from]);
    const capturedBefore = clone(boardBefore[move.to]);
    const beforeMaterial = materialBalance(game, this.rootSide);
    const after = applyMove(this.createGame, game, move);
    const san = safeSan(after, move);
    const afterFen = after.exportFEN();
    const terminal = terminalInfo(after);
    const check = safeInCheck(after, other(moverSide));
    const capture = Boolean(capturedBefore) || /x/.test(san);
    const recapture = Boolean(capture && parentCard.meta?.lastMove && move.to === parentCard.meta.lastMove.to);
    const directTargets = movedTargets(after, move.to, moverSide);
    const newTargets = newAttackFacts(game, after, moverSide, move.to);
    const attackTargets = combineAttackTargets([...directTargets, ...newTargets])
      .filter((target) => target.value >= this.options.attack_min_value);
    const afterMaterial = materialBalance(after, this.rootSide);
    const materialSwing = afterMaterial - this.rootMaterial;
    const predicates = [];
    const facts = [];

    if (terminal?.kind === "mate" && terminal.winner === moverSide) {
      predicates.push(moverSide === this.rootSide ? "mate" : "mated");
      facts.push("mate");
    }
    if (terminal?.kind === "stalemate") {
      predicates.push("stalemate");
      facts.push("stalemate");
    }
    if (check && terminal?.kind !== "mate") {
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
    }
    if (recapture) {
      predicates.push("capture_back", "recapture");
      facts.push(`recapture(${san},${squareName(move.to)})`);
    }
    if (attackTargets.length) {
      predicates.push("attack");
      attackTargets.slice(0, 6).forEach((target) => {
        facts.push(`${target.discovered ? "discovered_" : ""}attack(${pieceLongLabel(target.piece, target.target)})`);
      });
    }

    const availableAlignments = moverSide === this.rootSide
      ? (parentCard.meta?.alignments?.length ? parentCard.meta.alignments : findAlignments(game, moverSide))
      : [];
    const inheritedBindings = Array.isArray(parentCard.meta?.activeAlignmentBindings)
      ? parentCard.meta.activeAlignmentBindings.map(clone)
      : [];
    const candidateBindings = [...inheritedBindings];

    for (const binding of availableAlignments) {
      if (move.from !== binding.middle || !check || boardOf(after)[binding.middle]) continue;
      const frontPiece = boardOf(after)[binding.front];
      const backPiece = boardOf(after)[binding.back];
      if (!frontPiece || frontPiece.color !== binding.side || !backPiece || backPiece.color === binding.side) continue;
      predicates.push("move_middle_with_check");
      facts.push(alignmentFact(binding));
      facts.push(`move_middle_with_check(${san},${squareName(binding.middle)})`);
      candidateBindings.push({ ...clone(binding), phase: "middle_cleared", middleMove: san });
    }

    // Test the inherited relation before asking whether it survives the move.
    // A front-to-back capture necessarily empties the old front square and
    // replaces the enemy back piece, so the binding will not survive *after*
    // the move even though this move is precisely the relation's cash-out.
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

    let mateThreats = [];
    if (!terminal && this._shouldProbeMateThreat(after, moverSide, move, capture, check, attackTargets)) {
      mateThreats = this._mateInOneFacts(afterFen, moverSide);
      if (mateThreats.length) {
        predicates.push("mate_in_1");
        facts.push(`mate_in_1(${mateThreats.slice(0, 3).map((item) => factToken(item.san)).join(",")})`);
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
        ? `Oracle predicates: ${unique(predicates).join(" · ")}`
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
        mateThreats,
        materialBefore: beforeMaterial,
        materialAfter: afterMaterial,
        materialSwing,
        captureValue: VALUES[capturedBefore?.type] || 0,
        legalReplyCount: null
      }
    };
  }

  _classifyObjectiveReplies(card, analyses) {
    if (card.side !== "their") return;
    const objectiveGain = Number(this.options.objective_gain);
    const materialSwing = Number(card.meta?.materialSwing || 0);
    if (materialSwing < objectiveGain) return;

    const classLimit = Number(this.options.reply_class_limit);
    const probeDepth = Number(this.options.objective_probe_depth);
    if (!Number.isInteger(classLimit) || classLimit < 1) throw new Error("oracle reply_class_limit must be an integer >= 1");
    if (!Number.isInteger(probeDepth) || probeDepth < 1) throw new Error("oracle objective_probe_depth must be an integer >= 1");

    const required = [];
    const certified = [];
    const proofMemo = new Map();
    const alignmentCapture = card.predicates.includes("capture_back_of_alignment") || Boolean(card.meta?.alignmentCapture);

    for (const child of analyses) {
      const isRefutation = child.predicates.includes("mated");
      const isRequiredRecapture = alignmentCapture && child.predicates.includes("recapture");
      if (isRefutation) {
        child.predicates = unique([...child.predicates, "objective_refutation", "reply_relevant"]);
        child.facts = unique([...child.facts, "reply_class(objective_refutation)"]);
        required.push(child);
        continue;
      }
      if (isRequiredRecapture) {
        child.predicates = unique([...child.predicates, "reply_class_recapture", "repairs_objective", "reply_relevant"]);
        child.facts = unique([...child.facts, "reply_class(recapture)", "repairs_objective"]);
        required.push(child);
        continue;
      }

      const held = this._objectiveCanBeHeld(child.fen, probeDepth, proofMemo);
      if (held) {
        certified.push(child);
        child.facts = unique([...child.facts, "certified_nonclass_reply"]);
      } else {
        child.predicates = unique([...child.predicates, "repairs_objective", "reply_relevant"]);
        child.facts = unique([...child.facts, "reply_class(repairs_objective)"]);
        required.push(child);
      }
    }

    if (required.length > classLimit) {
      card.predicates = unique([...card.predicates, "unexplorable"]);
      card.facts = unique([
        ...card.facts,
        `unexplorable_reply_class_members(${required.length})`,
        `reply_class_limit(${classLimit})`
      ]);
      card.help = `${required.length} objective-relevant reply-class members exceed the configured limit ${classLimit}.`;
      return;
    }

    card.predicates = unique([...card.predicates, "reply_classes_certified"]);
    card.facts = unique([
      ...card.facts,
      `reply_classes_certified(${required.length})`,
      `certified_nonclass_replies(${certified.length})`,
      ...(required.some((child) => child.predicates.includes("recapture")) ? ["reply_class(recapture)"] : []),
      ...(required.some((child) => child.predicates.includes("repairs_objective")) ? ["reply_class(repairs_objective)"] : [])
    ]);

    if (!required.length) {
      const greater = materialSwing > objectiveGain;
      card.predicates = unique([
        ...card.predicates,
        "branch_proved",
        "objective_won",
        greater ? "gain_greater_than_exchange_locked" : "gain_at_least_exchange_locked"
      ]);
      card.facts = unique([
        ...card.facts,
        `locked_material_swing(+${materialSwing})`,
        "all_opponent_reply_classes_discharged"
      ]);
      card.help = `Material gain +${materialSwing} is locked: every opponent reply class was certified harmless.`;
    } else {
      card.help = `${required.length} objective-relevant reply-class member${required.length === 1 ? "" : "s"} must be explored; ${certified.length} nonclass replies are certified harmless.`;
    }
  }

  _preparePosition(id) {
    const card = this.cards.get(id);
    if (!card) throw new Error(`Oracle position ${id} does not exist`);
    if (card.meta?.controlMarker) {
      card.prepared = true;
      card.expanded = true;
      card.children = [];
      if (!this.analysis.has(id)) this.analysis.set(id, []);
      return this.analysis.get(id);
    }
    if (card.prepared && this.analysis.has(id)) return this.analysis.get(id);

    const game = this._game(card.fen, card.display);
    const sideToMove = normalizeSide(game.state.side);
    const legal = legalMoveRecords(game);
    const inCheck = safeInCheck(game, sideToMove);
    if (inCheck) card.predicates = unique([...card.predicates, "in_check"]);
    card.facts = unique([...card.facts, `legal_moves(${legal.length})`, ...(inCheck ? ["in_check"] : [])]);
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

    const analyses = legal
      .map((move) => this._analyzeMove(card, game, move))
      .filter(Boolean)
      .sort(compareAnalyses);

    const threatenedSquares = new Set((card.meta?.attackTargets || []).map((target) => Number(target.square)));
    for (const child of analyses) {
      const fromIndex = Number(child.move?.fromIndex);
      if (threatenedSquares.has(fromIndex)) {
        child.predicates = unique([...child.predicates, "save_piece"]);
        child.facts = unique([...child.facts, `save_piece(${child.move.from})`]);
      }
    }

    // Expose which *class* of our moves is available on the parent card. The
    // DFA—not the oracle—uses these facts to choose one search card. Each search
    // card can then collect every move in that class before POP_POSITION runs.
    if (card.side === "my") {
      const mateMoves = analyses.filter((child) => child.predicates.includes("mate"));
      const forcingMoves = analyses.filter((child) => child.predicates.some((predicate) =>
        ["mate_in_1", "move_middle_with_check", "check"].includes(predicate)
      ));
      const captureMoves = analyses.filter((child) => child.predicates.some((predicate) =>
        ["capture_back_of_alignment", "recapture", "capture"].includes(predicate)
      ));
      const attackMoves = analyses.filter((child) => child.predicates.includes("attack"));

      if (mateMoves.length) {
        card.predicates = unique([...card.predicates, "mate_moves_available"]);
        card.facts = unique([...card.facts, `mate_moves_available(${mateMoves.length})`]);
      }
      if (forcingMoves.length) {
        card.predicates = unique([...card.predicates, "forcing_moves_available"]);
        card.facts = unique([...card.facts, `forcing_moves_available(${forcingMoves.length})`]);
      }
      if (captureMoves.length) {
        card.predicates = unique([...card.predicates, "capture_moves_available"]);
        card.facts = unique([...card.facts, `capture_moves_available(${captureMoves.length})`]);
      }
      if (attackMoves.length) {
        card.predicates = unique([...card.predicates, "attack_moves_available"]);
        card.facts = unique([...card.facts, `attack_moves_available(${attackMoves.length})`]);
      }
    }

    const replyLimit = Number(this.options.reply_limit);
    if (!Number.isInteger(replyLimit) || replyLimit < 1) throw new Error("oracle reply_limit must be an integer >= 1");

    const boundedReplySet = legal.length <= replyLimit;
    if (boundedReplySet) {
      card.predicates = unique([...card.predicates, "legal_replies_at_most_2"]);
      card.facts = unique([...card.facts, `legal_replies_at_most_2(${legal.length})`]);
      analyses.forEach((child) => {
        const boundedPredicates = ["forced_reply", "bounded_reply"];
        const boundedFacts = ["forced_reply", "bounded_reply"];
        if (child.predicates.includes("capture")) {
          boundedPredicates.push("bounded_capture");
          boundedFacts.push(`bounded_capture(value=${child.meta.captureValue})`);
        }
        if (child.predicates.includes("check")) {
          boundedPredicates.push("bounded_check");
          boundedFacts.push("bounded_check");
        }
        if (child.predicates.includes("king_move")) {
          boundedPredicates.push("bounded_king_move");
          boundedFacts.push("bounded_king_move");
        }
        if (child.predicates.includes("mate_in_1")) {
          boundedPredicates.push("bounded_mate_in_1");
          boundedFacts.push("bounded_mate_in_1");
        }
        child.predicates = unique([...child.predicates, ...boundedPredicates]);
        child.facts = unique([...child.facts, ...boundedFacts]);
      });
    } else {
      card.facts = unique([...card.facts, `legal_replies_more_than_2(${legal.length})`]);
    }

    this._classifyObjectiveReplies(card, analyses);

    if (card.side === "their" && legal.length > replyLimit
      && !card.predicates.includes("reply_classes_certified")
      && !card.predicates.includes("branch_proved")
      && !card.predicates.includes("mated")
      && !card.predicates.includes("stalemate")) {
      card.predicates = unique([...card.predicates, "unexplorable"]);
      card.facts = unique([...card.facts, "unexplorable(no_certified_reply_classes)"]);
      card.help = "Opponent has more than two legal replies and the oracle could not certify objective-relevant reply classes.";
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

    const markerKind = card.side === "my" ? "or_choice_boundary" : "and_reply_boundary";
    const marker = controlMarkerCard(card, markerKind);
    const expandedChildren = [...analyses, marker];

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
      if (child.meta?.controlMarker && !this.analysis.has(child.id)) this.analysis.set(child.id, []);
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
