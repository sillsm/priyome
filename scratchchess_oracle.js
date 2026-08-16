/**
 * scratchchess_oracle.js
 *
 * Chess-only adapter for Predicate Chess.
 *
 * ScratchChess owns FEN, legal moves, checks, mate, SAN, promotion, and board
 * state. This file turns those facts into the finite position cards consumed by
 * predicate.js. It does not accept, reject, prove, refute, search, prioritize,
 * or alter the policy machine.
 */

export const SCRATCHCHESS_ORACLE_VERSION = "1.0.0";

const FILES = "abcdefgh";
const PROMOTIONS = Object.freeze(["q", "r", "b", "n"]);
const VALUES = Object.freeze({ p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 });
const PIECE_NAMES = Object.freeze({ p: "pawn", n: "knight", b: "bishop", r: "rook", q: "queen", k: "king" });

const clone = (value) => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
const other = (side) => side === "w" ? "b" : "w";
const normalizeSide = (side) => side === "b" ? "b" : "w";
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

function pieceLongLabel(piece, index) {
  if (!piece) return `piece@${squareName(index)}`;
  return `${PIECE_NAMES[piece.type] || "piece"}@${squareName(index)}`;
}

function boardOf(game) {
  return game?.state?.board || [];
}

function fenSide(fen) {
  return String(fen || "").trim().split(/\s+/)[1] === "b" ? "b" : "w";
}

function normalizedFen(fen) {
  return String(fen || "").trim().split(/\s+/).slice(0, 4).join(" ");
}

function forceFenSide(fen, side) {
  const fields = String(fen || "").trim().split(/\s+/);
  while (fields.length < 6) fields.push(fields.length === 4 ? "0" : "1");
  fields[1] = normalizeSide(side);
  // En-passant rights belong to the actual move sequence and can become invalid
  // when asking the counterfactual question "does this side have mate in one?".
  fields[3] = "-";
  return fields.join(" ");
}

function movePrefix(fen) {
  const fields = String(fen || "").trim().split(/\s+/);
  const side = fields[1] === "b" ? "b" : "w";
  const fullmove = Math.max(1, Number(fields[5] || 1));
  return side === "w" ? `${fullmove}.` : `${fullmove}…`;
}

function safeInCheck(game, side) {
  try { return Boolean(game?._isInCheck?.(normalizeSide(side))); }
  catch { return false; }
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
  const side = normalizeSide(game?.state?.side);
  let raw = [];
  try { raw = game?._allLegalMoves?.(side) || []; }
  catch { raw = []; }
  const records = [];
  for (const item of raw) {
    const from = Number(item?.from ?? item?.fromSq ?? item?.source ?? item?.src);
    const to = Number(item?.to ?? item?.toSq ?? item?.target ?? item?.dst);
    if (!Number.isInteger(from) || !Number.isInteger(to)) continue;
    const explicitPromotion = String(item?.promotion ?? item?.promote ?? item?.promo ?? "")
      .toLowerCase().replace(/[^qrbn]/g, "").slice(0, 1);
    const promotions = moveNeedsPromotion(game, from, to)
      ? explicitPromotion ? [explicitPromotion] : PROMOTIONS
      : [""];
    for (const promotion of promotions) {
      records.push({
        from,
        to,
        promotion,
        uci: `${squareName(from)}${squareName(to)}${promotion}`,
        mover: clone(boardOf(game)[from] || null),
        captured: clone(boardOf(game)[to] || null)
      });
    }
  }
  const seen = new Set();
  return records.filter((record) => !seen.has(record.uci) && seen.add(record.uci));
}

function applyMove(createGame, gameOrFen, move) {
  const game = createGame({ Event: "Predicate Chess oracle", Site: "scratchchess_oracle.js" });
  game.loadFEN(typeof gameOrFen === "string" ? gameOrFen : gameOrFen.exportFEN());
  if (!game.makeMoveUCI(move.uci || move)) return null;
  if (game.state?.pendingPromotion || game._pendingPromotion) {
    const promotion = String(move.promotion || String(move.uci || move)[4] || "q").toUpperCase();
    game.resolvePendingPromotion(promotion);
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
  return String(after?.curNode?.san || move.uci || "?").trim();
}

function combineAttackTargets(targets) {
  const bySquare = new Map();
  for (const target of targets) {
    const existing = bySquare.get(target.target);
    if (!existing || target.value > existing.value || target.discovered) bySquare.set(target.target, target);
  }
  return [...bySquare.values()].sort((a, b) => b.value - a.value || a.target - b.target);
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
  constructor({ createGame, ...options } = {}) {
    if (typeof createGame !== "function") throw new TypeError("ScratchChessOracle requires createGame(options)");
    this.createGame = createGame;
    this.options = {
      reply_limit: 2,
      objective_gain: 3,
      max_positions: 900,
      mate_probe: true,
      mate_probe_limit: 48,
      attack_min_value: 1,
      ...options
    };
    this.cards = new Map();
    this.analysis = new Map();
    this.mateOneCache = new Map();
    this.rootSide = "w";
    this.rootMaterial = 0;
    this.rootId = "root";
    this.puzzle = null;
    this.policyDepth = 6;
  }

  reset({ fen, title = "Position", theme = "", solution = "", where = "", policyDepth = 6 } = {}) {
    if (!fen) throw new Error("Oracle reset requires a FEN");
    this.cards.clear();
    this.analysis.clear();
    this.mateOneCache.clear();
    this.rootSide = fenSide(fen);
    this.policyDepth = Math.max(0, Number(policyDepth || 0));
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
        materialSwing: 0
      }
    };
    this.cards.set(root.id, root);
    return cloneCard(root);
  }

  createProject(policy, name = this.puzzle?.title || "Predicate Chess") {
    if (!policy) throw new Error("createProject requires a predicate.js policy");
    return {
      schema: globalThis.PredicatePolicy?.PROJECT_SCHEMA || "predicate-policy-dfa-lab/project-v3",
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

  _game(fen, title = "Predicate Chess oracle") {
    const game = this.createGame({ Event: title, Site: "scratchchess_oracle.js" });
    game.loadFEN(fen);
    return game;
  }

  _mateInOneFacts(fen, side) {
    if (!this.options.mate_probe) return [];
    const key = `${normalizedFen(fen)}|${side}`;
    if (this.mateOneCache.has(key)) return clone(this.mateOneCache.get(key));
    const game = this._game(forceFenSide(fen, side), "mate-in-one probe");
    const legal = legalMoveRecords(game).slice(0, Math.max(1, Number(this.options.mate_probe_limit || 48)));
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

  _analyzeMove(parentCard, game, move) {
    const moverSide = normalizeSide(game.state.side);
    const boardBefore = boardOf(game);
    const mover = clone(boardBefore[move.from] || move.mover || null);
    const capturedBefore = clone(boardBefore[move.to] || move.captured || null);
    const beforeMaterial = materialBalance(game, this.rootSide);
    const after = applyMove(this.createGame, game, move);
    if (!after) return null;
    const san = safeSan(after, move);
    const afterFen = after.exportFEN();
    const terminal = terminalInfo(after);
    const check = safeInCheck(after, other(moverSide));
    const capture = Boolean(capturedBefore) || /x/.test(san);
    const captureBack = Boolean(capture && parentCard.meta?.lastMove && move.to === parentCard.meta.lastMove.to);
    const directTargets = movedTargets(after, move.to, moverSide);
    const newTargets = newAttackFacts(game, after, moverSide, move.to);
    const attackTargets = combineAttackTargets([...directTargets, ...newTargets])
      .filter((target) => target.value >= Number(this.options.attack_min_value || 1));
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
      facts.push("check");
    }
    if (capture) {
      predicates.push("capture");
      const capturedLabel = capturedBefore ? pieceLongLabel(capturedBefore, move.to) : `piece@${squareName(move.to)}`;
      facts.push(`capture(${capturedLabel})`);
    }
    if (captureBack) {
      predicates.push("capture_back");
      facts.push("capture_back");
    }
    if (attackTargets.length) {
      predicates.push("attack");
      attackTargets.slice(0, 6).forEach((target) => {
        facts.push(`${target.discovered ? "discovered_" : ""}attack(${pieceLongLabel(target.piece, target.target)})`);
      });
    }

    let mateThreats = [];
    if (!terminal && this._shouldProbeMateThreat(after, moverSide, move, capture, check, attackTargets)) {
      mateThreats = this._mateInOneFacts(afterFen, moverSide);
      if (mateThreats.length) {
        predicates.push("mate_in_1");
        facts.push(`mate_in_1(${mateThreats.slice(0, 3).map((item) => factToken(item.san)).join(",")})`);
      }
    }

    const objectiveGain = Number(this.options.objective_gain || 3);
    const returnedToRoot = fenSide(afterFen) === this.rootSide;
    if (materialSwing >= objectiveGain && returnedToRoot) {
      predicates.push("objective_won");
      facts.push(`stable_material_swing(+${materialSwing})`);
    } else if (materialSwing <= -objectiveGain && returnedToRoot) {
      predicates.push("objective_lost");
      facts.push(`stable_material_swing(${materialSwing})`);
    } else if (materialSwing !== 0) {
      facts.push(`material_swing(${materialSwing > 0 ? "+" : ""}${materialSwing})`);
    }

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
        : "This legal ply has no default-policy predicate.",
      fen: afterFen,
      depth: Number(parentCard.depth || 0) + 1,
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
        promotion: move.promotion || "",
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
        mateThreats,
        materialBefore: beforeMaterial,
        materialAfter: afterMaterial,
        materialSwing,
        legalReplyCount: null
      }
    };
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
    card.facts = unique([...card.facts, `legal_moves(${legal.length})`, ...(inCheck ? ["in_check"] : [])]);
    card.meta.legalReplyCount = legal.length;

    const terminal = terminalInfo(game);
    if (terminal?.kind === "mate") {
      card.predicates = unique([...card.predicates, terminal.winner === this.rootSide ? "mate" : "mated"]);
    } else if (terminal?.kind === "stalemate") {
      card.predicates = unique([...card.predicates, "stalemate"]);
    }

    const analyses = legal
      .map((move) => this._analyzeMove(card, game, move))
      .filter(Boolean)
      .sort((a, b) => String(a.move?.uci || "").localeCompare(String(b.move?.uci || "")));

    // A move of a piece just attacked by the previous ply is a factual reply
    // group. No equivalence or proof claim is made here; the oracle merely tags
    // the legal moves that satisfy the relation.
    const threatenedSquares = new Set((card.meta?.attackTargets || []).map((target) => Number(target.square)));
    for (const child of analyses) {
      const fromIndex = Number(child.move?.fromIndex);
      if (threatenedSquares.has(fromIndex)) {
        child.predicates = unique([...child.predicates, "save_piece"]);
        child.facts = unique([...child.facts, `save_piece(${child.move.from})`]);
      }
    }

    if (card.side === "their" && legal.length) {
      let relevant;
      if (legal.length <= Number(this.options.reply_limit || 2) || inCheck) {
        relevant = analyses;
        relevant.forEach((child) => {
          child.predicates = unique([...child.predicates, "forced_reply"]);
          child.facts = unique([...child.facts, "forced_reply"]);
        });
      } else {
        const scary = new Set(["mate", "mated", "mate_in_1", "check", "capture_back", "capture", "attack", "save_piece"]);
        relevant = analyses.filter((child) => child.predicates.some((predicate) => scary.has(predicate)));
      }

      const replyLimit = Math.max(1, Number(this.options.reply_limit || 2));
      if (relevant.length > replyLimit) {
        card.predicates = unique([...card.predicates, "unexplorable"]);
        card.facts = unique([...card.facts, `unexplorable_replies(${relevant.length})`, `reply_limit(${replyLimit})`]);
        card.help = `${relevant.length} relevant opponent plies exceed the oracle reply limit ${replyLimit}.`;
      } else {
        relevant.forEach((child) => {
          child.predicates = unique([...child.predicates, "reply_relevant"]);
          child.facts = unique([...child.facts, "reply_relevant"]);
        });
        card.facts = unique([...card.facts, `relevant_replies(${relevant.length})`]);
      }
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
    if (Number(card.depth || 0) >= this.policyDepth) {
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

    const maxPositions = Math.max(1, Number(this.options.max_positions || 900));
    const unseen = analyses.filter((child) => !this.cards.has(child.id));
    if (this.cards.size + unseen.length > maxPositions) {
      card.predicates = unique([...card.predicates, "oracle_limit", "unexplorable"]);
      card.facts = unique([...card.facts, `oracle_limit(${maxPositions})`]);
      card.help = `Expanding this legal ply set would exceed the oracle card limit ${maxPositions}.`;
      card.expanded = true;
      card.children = [];
      return this.getPosition(id);
    }

    for (const child of analyses) {
      if (!this.cards.has(child.id)) this.cards.set(child.id, child);
    }
    card.children = analyses.map((child) => child.id);
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
