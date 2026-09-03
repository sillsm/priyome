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
 * derived from P, m, and Pm. For two bounded terminal certificates it may also
 * enumerate one hypothetical legal ply from Pm: (1) the complete set of
 * immediate checkmates for a named side, and (2) legal captures that immediately
 * reach the policy's declared material objective. These terminal probes have no
 * evaluation, strategic ordering, recursion, stored refutation, or proof
 * propagation.
 * All continuation reasoning belongs to the visible DFA.
 */

export const SCRATCHCHESS_ORACLE_VERSION = "2.16.0-back-rank-entry-square";
export const SCRATCHCHESS_ORACLE_HORIZON = 1;
export const SCRATCHCHESS_ORACLE_TERMINAL_PROBE = "mate_in_1+material_objective_capture_in_1";

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

/**
 * Exact terminal probe used only to partition replies to an announced mate-in-one
 * threat. The supplied position must have attackerSide to move. This enumerates
 * one legal ply and keeps only immediate checkmates; it does not score or search
 * any continuation beyond the mate terminal.
 */
function legalMateInOneMoves(createGame, gameOrFen, attackerSide) {
  const sourceFen = typeof gameOrFen === "string" ? gameOrFen : gameOrFen?.exportFEN?.();
  fenFields(sourceFen);
  const game = createGame({ Event: "Predicate Chess mate-in-one terminal probe", Site: "scratchchess_oracle.js" });
  game.loadFEN(sourceFen);
  if (normalizeSide(game.state?.side) !== normalizeSide(attackerSide)) return [];
  const output = [];
  for (const move of legalMoveRecords(game)) {
    const after = applyMove(createGame, game, move);
    const terminal = terminalInfo(after);
    if (!terminal || terminal.kind !== "mate" || terminal.winner !== normalizeSide(attackerSide)) continue;
    output.push({
      from: move.from,
      to: move.to,
      uci: move.uci,
      san: safeSan(after, move),
      mateSquare: move.to
    });
  }
  return output;
}

/**
 * Exact board feature used for a mate-in-one threat. The just-moved side is
 * placed back on move and the en-passant field is cleared, which models a pass
 * only for the terminal question: which legal moves by attackerSide would mate
 * immediately on this resulting board? No continuation beyond mate is explored.
 */
function legalMateThreatMoves(createGame, gameOrFen, attackerSide) {
  const sourceFen = typeof gameOrFen === "string" ? gameOrFen : gameOrFen?.exportFEN?.();
  const fields = fenFields(sourceFen);
  fields[1] = normalizeSide(attackerSide);
  fields[3] = "-";
  return legalMateInOneMoves(createGame, fields.join(" "), attackerSide);
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


/**
 * Find a static overloaded-alignment relation:
 *
 *   our slider -> enemy sole defender -> enemy loose back piece
 *                                \-> enemy target defended only by the middle piece
 *
 * This is only a board relation. It does not assume the defender will recapture,
 * choose a continuation, or prove the line. The policy may use a move that
 * captures the sole-defended target as an early candidate; ordinary universal
 * reply search must still verify every opponent response.
 */
function findLooseAlignmentSoleDefenderTargets(board, attackerSide) {
  const enemy = other(attackerSide);
  const output = [];
  const seen = new Set();

  for (let slider = 0; slider < 64; slider += 1) {
    const sliderPiece = board[slider];
    if (!sliderPiece || sliderPiece.color !== attackerSide) continue;
    const [sliderFile, sliderRank] = fr(slider);

    for (const [df, dr] of RAY_DIRECTIONS) {
      if (!sliderSupportsDirection(sliderPiece, df, dr)) continue;
      let file = sliderFile + df;
      let rank = sliderRank + dr;
      let defender = -1;
      let back = -1;

      while (inBounds(file, rank)) {
        const square = idx(file, rank);
        const piece = board[square];
        if (piece) {
          if (defender < 0) {
            if (piece.color !== enemy || piece.type === "k") break;
            defender = square;
          } else {
            if (piece.color === enemy && piece.type !== "k") back = square;
            break;
          }
        }
        file += df;
        rank += dr;
      }

      if (defender < 0 || back < 0) continue;
      const backPiece = board[back];
      if (effectiveDefendersOnBoard(board, back, enemy).length !== 0) continue;

      for (let target = 0; target < 64; target += 1) {
        if (target === defender || target === back) continue;
        const targetPiece = board[target];
        if (!targetPiece || targetPiece.color !== enemy || targetPiece.type === "k") continue;
        const defenders = effectiveDefendersOnBoard(board, target, enemy);
        if (defenders.length !== 1 || defenders[0] !== defender) continue;

        const key = `${slider}:${defender}:${back}:${target}`;
        if (seen.has(key)) continue;
        seen.add(key);
        output.push({
          kind: "loose_alignment_sole_defender",
          side: attackerSide,
          slider,
          defender,
          back,
          target,
          direction: [df, dr],
          sliderPiece: clone(sliderPiece),
          defenderPiece: clone(board[defender]),
          backPiece: clone(backPiece),
          targetPiece: clone(targetPiece),
          backValue: VALUES[backPiece.type] || 0,
          targetValue: VALUES[targetPiece.type] || 0
        });
      }
    }
  }

  return output.sort((a, b) =>
    b.backValue - a.backValue
    || b.targetValue - a.targetValue
    || a.slider - b.slider
    || a.defender - b.defender
    || a.target - b.target
  );
}

function looseAlignmentSoleDefenderFact(relation) {
  return `loose_alignment_sole_defender(slider=${coloredPieceLabel(relation.sliderPiece, relation.slider)},defender=${coloredPieceLabel(relation.defenderPiece, relation.defender)},back=${coloredPieceLabel(relation.backPiece, relation.back)},target=${coloredPieceLabel(relation.targetPiece, relation.target)})`;
}

function capturedSoleDefendedTargetOfLooseAlignment(beforeBoard, afterBoard, moverSide, move) {
  const captured = beforeBoard[move.to];
  if (!captured || captured.color === moverSide || captured.type === "k") return [];
  const relations = findLooseAlignmentSoleDefenderTargets(beforeBoard, moverSide);
  return relations.filter((relation) => {
    if (relation.target !== move.to) return false;
    if (!samePieceAt(afterBoard, relation.slider, relation.sliderPiece)) return false;
    if (!samePieceAt(afterBoard, relation.defender, relation.defenderPiece)) return false;
    if (!samePieceAt(afterBoard, relation.back, relation.backPiece)) return false;
    const afterDefenders = effectiveDefendersOnBoard(afterBoard, relation.target, other(moverSide));
    return afterDefenders.length === 1 && afterDefenders[0] === relation.defender;
  });
}

/**
 * Find a check that newly defends a vulnerable entry square on our own back rank.
 *
 * Static geometry only:
 *   - our king and a capturer stand on our back rank;
 *   - the capturer currently blocks an enemy rook/queen from entering on that rank;
 *   - the capturer can take a loose enemy non-pawn along the back rank, vacating the blocker;
 *   - the candidate move gives check and newly defends the enemy entry square.
 *
 * This does not play the future capture or choose a continuation. It only records
 * that the checking move repairs the currently visible back-rank entry square.
 */
function findChecksAddingDefenderToBackRankEntrySquare(beforeBoard, afterBoard, attackerSide, move) {
  const movedBefore = beforeBoard[move.from];
  const movedAfter = afterBoard[move.to];
  if (!movedBefore || !movedAfter || movedAfter.color !== attackerSide) return [];

  const enemy = other(attackerSide);
  const homeRank = attackerSide === "w" ? 0 : 7;
  const kingSquare = beforeBoard.findIndex((piece) => piece?.color === attackerSide && piece.type === "k");
  if (kingSquare < 0 || fr(kingSquare)[1] !== homeRank) return [];

  const output = [];
  const seen = new Set();

  for (let capturer = 0; capturer < 64; capturer += 1) {
    const capturerPiece = beforeBoard[capturer];
    const capturerAfter = afterBoard[capturer];
    if (!capturerPiece || capturerPiece.color !== attackerSide || !["r", "q"].includes(capturerPiece.type)) continue;
    if (!capturerAfter || capturerAfter.color !== capturerPiece.color || capturerAfter.type !== capturerPiece.type) continue;
    if (fr(capturer)[1] !== homeRank) continue;

    for (let target = 0; target < 64; target += 1) {
      const targetPiece = beforeBoard[target];
      if (!targetPiece || targetPiece.color !== enemy || ["p", "k"].includes(targetPiece.type)) continue;
      if (fr(target)[1] !== homeRank) continue;
      if (!attacksSquare(beforeBoard, capturer, target)) continue;
      if (effectiveDefendersOnBoard(beforeBoard, target, enemy).length) continue;

      const route = raySquaresBetween(capturer, target);
      for (const entry of route) {
        if (fr(entry)[1] !== homeRank || beforeBoard[entry]) continue;
        if (!attacksSquare(afterBoard, move.to, entry)) continue;
        if (attacksSquare(beforeBoard, move.from, entry)) continue;

        const kingRay = raySquaresBetween(entry, kingSquare);
        if (!kingRay.includes(capturer)) continue;
        const occupiedBetween = kingRay.filter((square) => beforeBoard[square]);
        if (occupiedBetween.length !== 1 || occupiedBetween[0] !== capturer) continue;

        for (let invader = 0; invader < 64; invader += 1) {
          if (invader === target) continue;
          const invaderPiece = beforeBoard[invader];
          if (!invaderPiece || invaderPiece.color !== enemy || !["r", "q"].includes(invaderPiece.type)) continue;
          if (!attacksSquare(beforeBoard, invader, entry)) continue;

          const projected = cloneBoardPosition(beforeBoard);
          projected[capturer] = null;
          projected[target] = clone(capturerPiece);
          projected[invader] = null;
          projected[entry] = clone(invaderPiece);
          if (!attacksSquare(projected, entry, kingSquare)) continue;

          const key = [move.uci, entry, capturer, target, invader, kingSquare].join(":");
          if (seen.has(key)) continue;
          seen.add(key);
          output.push({
            kind: "back_rank_entry_repair",
            sourceMove: move.uci,
            entrySquare: entry,
            kingSquare,
            capturerSquare: capturer,
            capturerPiece: clone(capturerPiece),
            targetSquare: target,
            targetPiece: clone(targetPiece),
            invaderSquare: invader,
            invaderPiece: clone(invaderPiece),
            defenderSquare: move.to,
            defenderPiece: clone(movedAfter)
          });
        }
      }
    }
  }

  return output;
}

/**
 * Exact, bounded material certificate on one current board. This does not pick
 * a continuation: it enumerates every legal capture by rootSide whose resulting
 * material balance reaches the policy's objective and leaves rootSide not behind,
 * and emits the moves as witnesses. It never searches beyond that one capture ply.
 */
function materialObjectiveCaptureMoves(createGame, gameOrFen, rootSide, rootMaterial, objectiveGain) {
  const sourceFen = typeof gameOrFen === "string" ? gameOrFen : gameOrFen?.exportFEN?.();
  const game = createGame({ Event: "Predicate Chess material-objective probe", Site: "scratchchess_oracle.js" });
  game.loadFEN(sourceFen);
  if (normalizeSide(game.state?.side) !== normalizeSide(rootSide)) return [];
  const board = boardOf(game);
  const output = [];

  for (const move of legalMoveRecords(game)) {
    const captured = board[move.to];
    if (!captured || captured.color === rootSide || captured.type === "k") continue;
    const after = applyMove(createGame, game, move);
    const afterMaterial = materialBalance(after, rootSide);
    const materialSwing = afterMaterial - Number(rootMaterial);
    if (materialSwing < Number(objectiveGain) || afterMaterial < 0) continue;
    output.push({
      uci: move.uci,
      san: safeSan(after, move),
      from: move.from,
      to: move.to,
      captured: clone(captured),
      materialSwing,
      materialBalance: afterMaterial
    });
  }

  return output.sort((a, b) =>
    b.materialSwing - a.materialSwing
    || (VALUES[b.captured?.type] || 0) - (VALUES[a.captured?.type] || 0)
    || String(a.uci).localeCompare(String(b.uci))
  );
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


function findSoleDefendedAttackedPieces(board, attackerSide) {
  const enemy = other(attackerSide);
  const output = [];
  for (let target = 0; target < 64; target += 1) {
    const targetPiece = board[target];
    if (!targetPiece || targetPiece.color !== enemy || ["p", "k"].includes(targetPiece.type)) continue;
    const attackers = effectiveAttackersOnBoard(board, target, attackerSide);
    const defenders = effectiveDefendersOnBoard(board, target, enemy);
    if (!attackers.length || defenders.length !== 1) continue;
    const defenderSquare = defenders[0];
    const defenderPiece = board[defenderSquare];
    if (!defenderPiece || defenderPiece.color !== enemy || defenderPiece.type === "k") continue;
    output.push({
      targetSquare: target,
      targetPiece: clone(targetPiece),
      targetValue: VALUES[targetPiece.type] || 0,
      defenderSquare,
      defenderPiece: clone(defenderPiece),
      defenderValue: VALUES[defenderPiece.type] || 0,
      targetAttackers: attackers.map((square) => ({ square, piece: clone(board[square]) }))
    });
  }
  return output.sort((a, b) =>
    b.targetValue - a.targetValue
    || b.defenderValue - a.defenderValue
    || a.targetSquare - b.targetSquare
  );
}

function addedAttackerIsSafe(board, attackerSquare, defenderSquare, side) {
  const attacker = board[attackerSquare];
  const defender = board[defenderSquare];
  if (!attacker || attacker.color !== side || !defender || defender.color === side) return false;
  const enemyAttackers = effectiveAttackersOnBoard(board, attackerSquare, other(side));
  if (!enemyAttackers.length) return true;
  if (enemyAttackers.some((square) => square !== defenderSquare)) return false;
  const recapturers = effectiveDefendersOnBoard(board, attackerSquare, side);
  return recapturers.length > 0 && (VALUES[defender.type] || 0) > (VALUES[attacker.type] || 0);
}

function findSafeAttacksOnSoleDefenders(beforeBoard, afterBoard, moverSide, movedTo) {
  const output = [];
  for (const relation of findSoleDefendedAttackedPieces(beforeBoard, moverSide)) {
    if (!samePieceAt(afterBoard, relation.targetSquare, relation.targetPiece)) continue;
    if (!samePieceAt(afterBoard, relation.defenderSquare, relation.defenderPiece)) continue;
    const afterTargetAttackers = effectiveAttackersOnBoard(afterBoard, relation.targetSquare, moverSide);
    const afterTargetDefenders = effectiveDefendersOnBoard(afterBoard, relation.targetSquare, other(moverSide));
    if (!afterTargetAttackers.length || afterTargetDefenders.length !== 1
      || afterTargetDefenders[0] !== relation.defenderSquare) continue;

    const beforeDefenderAttackers = new Set(effectiveAttackersOnBoard(beforeBoard, relation.defenderSquare, moverSide));
    const afterDefenderAttackers = effectiveAttackersOnBoard(afterBoard, relation.defenderSquare, moverSide);
    const addedAttackers = afterDefenderAttackers.filter((square) => !beforeDefenderAttackers.has(square));
    if (!addedAttackers.includes(movedTo)) continue;
    if (!addedAttackerIsSafe(afterBoard, movedTo, relation.defenderSquare, moverSide)) continue;

    output.push({
      kind: "defender_chase",
      targetSquare: relation.targetSquare,
      targetPiece: clone(relation.targetPiece),
      targetValue: relation.targetValue,
      defenderSquare: relation.defenderSquare,
      defenderPiece: clone(relation.defenderPiece),
      defenderValue: relation.defenderValue,
      chaserSquare: movedTo,
      chaserPiece: clone(afterBoard[movedTo]),
      targetAttackers: afterTargetAttackers.map((square) => ({ square, piece: clone(afterBoard[square]) }))
    });
  }
  return output;
}

function updateDefenderChaseOnBoard(board, chase, move = null) {
  if (!chase || chase.kind !== "defender_chase") return null;
  if (!samePieceAt(board, chase.targetSquare, chase.targetPiece)) return null;
  let defenderSquare = chase.defenderSquare;
  if (move && move.from === chase.defenderSquare) defenderSquare = move.to;
  if (!samePieceAt(board, defenderSquare, chase.defenderPiece)) return null;
  const targetAttackers = effectiveAttackersOnBoard(board, chase.targetSquare, chase.targetPiece.color === "w" ? "b" : "w");
  const targetDefenders = effectiveDefendersOnBoard(board, chase.targetSquare, chase.targetPiece.color);
  if (!targetAttackers.length || !targetDefenders.includes(defenderSquare)) return null;
  return {
    ...clone(chase),
    defenderSquare,
    defenderPiece: clone(board[defenderSquare]),
    targetAttackers: targetAttackers.map((square) => ({ square, piece: clone(board[square]) }))
  };
}

function defenderChaseFact(chase) {
  return `sole_defender_of_attacked_piece(target=${coloredPieceLabel(chase.targetPiece, chase.targetSquare)},defender=${coloredPieceLabel(chase.defenderPiece, chase.defenderSquare)})`;
}

function samePieceAt(board, square, descriptor) {
  const piece = board[square];
  return Boolean(piece && descriptor && piece.color === descriptor.color && piece.type === descriptor.type);
}

function rayHasMiddleAndBack(board, front, middle, back, direction) {
  const [df, dr] = direction || [];
  if (!Number.isInteger(df) || !Number.isInteger(dr) || (!df && !dr)) return false;
  let [file, rank] = fr(front);
  file += df;
  rank += dr;
  let first = -1;
  while (inBounds(file, rank)) {
    const square = idx(file, rank);
    if (board[square]) {
      if (first < 0) first = square;
      else return first === middle && square === back;
    }
    file += df;
    rank += dr;
  }
  return false;
}

function alignmentDefenderChainFact(chain) {
  const others = (chain.otherDefenders || [])
    .map((item) => coloredPieceLabel(item.piece, item.square))
    .join("+") || "none";
  return `alignment_middle_defends_piece(front=${coloredPieceLabel(chain.frontPiece, chain.front)},middle=${coloredPieceLabel(chain.middlePiece, chain.middle)},back=${coloredPieceLabel(chain.backPiece, chain.back)},target=${coloredPieceLabel(chain.targetPiece, chain.target)},other_defenders=${others})`;
}

function findAlignmentDefenderChains(game, side, minimumGain) {
  const board = boardOf(game);
  const enemy = other(side);
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
      let back = -1;

      while (inBounds(file, rank)) {
        const square = idx(file, rank);
        const piece = board[square];
        if (piece) {
          if (middle < 0) {
            if (piece.color !== enemy || piece.type === "k") break;
            middle = square;
          } else {
            if (piece.color === enemy && piece.type !== "k") back = square;
            break;
          }
        }
        file += df;
        rank += dr;
      }

      if (middle < 0 || back < 0) continue;
      const middlePiece = board[middle];
      const backPiece = board[back];
      const backValue = VALUES[backPiece?.type] || 0;
      if (backValue < minimumGain) continue;

      for (let target = 0; target < 64; target += 1) {
        if (target === middle || target === back) continue;
        const targetPiece = board[target];
        if (!targetPiece || targetPiece.color !== enemy || ["p", "k"].includes(targetPiece.type)) continue;
        if (!attacksSquare(board, middle, target)) continue;

        const defenders = effectiveDefendersOnBoard(board, target, enemy);
        if (!defenders.includes(middle)) continue;
        const otherDefenderSquares = defenders.filter((square) => square !== middle);
        if (!otherDefenderSquares.length) continue;
        const attackers = effectiveAttackersOnBoard(board, target, side);
        if (!attackers.length) continue;

        const key = `${front}:${middle}:${back}:${target}`;
        if (seen.has(key)) continue;
        seen.add(key);
        output.push({
          kind: "alignment_defender_chain",
          side,
          front,
          middle,
          back,
          target,
          direction: [df, dr],
          frontPiece: clone(frontPiece),
          middlePiece: clone(middlePiece),
          backPiece: clone(backPiece),
          targetPiece: clone(targetPiece),
          backValue,
          targetValue: VALUES[targetPiece.type] || 0,
          otherDefenders: otherDefenderSquares.map((square) => ({ square, piece: clone(board[square]) })),
          attackers: attackers.map((square) => ({ square, piece: clone(board[square]) }))
        });
      }
    }
  }

  return output.sort((a, b) =>
    b.backValue - a.backValue
    || b.targetValue - a.targetValue
    || a.front - b.front
    || a.middle - b.middle
    || a.target - b.target
  );
}

function alignmentDefenderChainSurvives(board, chain) {
  return Boolean(
    samePieceAt(board, chain.front, chain.frontPiece)
    && samePieceAt(board, chain.middle, chain.middlePiece)
    && samePieceAt(board, chain.back, chain.backPiece)
    && samePieceAt(board, chain.target, chain.targetPiece)
    && rayHasMiddleAndBack(board, chain.front, chain.middle, chain.back, chain.direction)
    && attacksSquare(board, chain.middle, chain.target)
    && effectiveAttackersOnBoard(board, chain.target, chain.side).length
  );
}

function refreshAlignmentDefenderChain(board, chain) {
  const refreshed = clone(chain);
  const enemy = other(chain.side);
  refreshed.otherDefenders = effectiveDefendersOnBoard(board, chain.target, enemy)
    .filter((square) => square !== chain.middle)
    .map((square) => ({ square, piece: clone(board[square]) }));
  refreshed.attackers = effectiveAttackersOnBoard(board, chain.target, chain.side)
    .map((square) => ({ square, piece: clone(board[square]) }));
  return refreshed;
}

function openedAlignmentBinding(board, chain) {
  if (!samePieceAt(board, chain.front, chain.frontPiece)) return null;
  if (!samePieceAt(board, chain.back, chain.backPiece)) return null;
  if (board[chain.middle]) return null;
  if (!attacksSquare(board, chain.front, chain.back)) return null;
  return {
    side: chain.side,
    front: chain.front,
    middle: chain.middle,
    back: chain.back,
    direction: clone(chain.direction),
    frontPiece: clone(chain.frontPiece),
    middlePiece: clone(chain.middlePiece),
    backPiece: clone(chain.backPiece),
    backValue: chain.backValue,
    phase: "middle_cleared",
    source: "alignment_capture_chain"
  };
}


function cloneBoardPosition(board) {
  return board.map((piece) => piece ? { ...piece } : null);
}

function adjacentSquares(square) {
  const [file, rank] = fr(square);
  const output = [];
  for (let df = -1; df <= 1; df += 1) {
    for (let dr = -1; dr <= 1; dr += 1) {
      if (!df && !dr) continue;
      const nextFile = file + df;
      const nextRank = rank + dr;
      if (inBounds(nextFile, nextRank)) output.push(idx(nextFile, nextRank));
    }
  }
  return output;
}

function raySquaresBetween(from, to) {
  const direction = directionBetween(from, to);
  if (!direction) return [];
  const [df, dr] = direction;
  let [file, rank] = fr(from);
  file += df;
  rank += dr;
  const output = [];
  while (inBounds(file, rank)) {
    const square = idx(file, rank);
    if (square === to) return output;
    output.push(square);
    file += df;
    rank += dr;
  }
  return [];
}

function kingHasStaticEscapeAfterContactCapture(board, kingSquare, defenderSide, attackerSide) {
  for (const destination of adjacentSquares(kingSquare)) {
    const occupant = board[destination];
    if (occupant?.color === defenderSide) continue;
    const next = cloneBoardPosition(board);
    next[kingSquare] = null;
    next[destination] = { color: defenderSide, type: "k", id: "static-king" };
    if (!attackersOnBoard(next, destination, attackerSide).length) return true;
  }
  return false;
}

/**
 * Recognize a visible contact-mate capture threat without asking ScratchChess
 * to play a second ply. The relation is entirely on the current board:
 * an attacking piece can capture an enemy piece next to the king, the capturing
 * piece would give contact check, the mating square is protected, no effective
 * non-king defender can capture there, and the king has no static escape square.
 */
function findVisibleMateInOneThreats(board, attackerSide) {
  const defenderSide = other(attackerSide);
  const kingSquare = board.findIndex((piece) => piece?.color === defenderSide && piece.type === "k");
  if (kingSquare < 0) return [];
  const output = [];
  const seen = new Set();

  for (const mateSquare of adjacentSquares(kingSquare)) {
    const targetPiece = board[mateSquare];
    if (!targetPiece || targetPiece.color !== defenderSide || targetPiece.type === "k") continue;

    for (let attackerSquare = 0; attackerSquare < 64; attackerSquare += 1) {
      const attackerPiece = board[attackerSquare];
      if (!attackerPiece || attackerPiece.color !== attackerSide || attackerPiece.type === "k") continue;
      if (!attacksSquare(board, attackerSquare, mateSquare)) continue;

      const afterMateCapture = cloneBoardPosition(board);
      afterMateCapture[attackerSquare] = null;
      afterMateCapture[mateSquare] = { ...attackerPiece };
      if (!attacksSquare(afterMateCapture, mateSquare, kingSquare)) continue;

      const ownKing = afterMateCapture.findIndex((piece) => piece?.color === attackerSide && piece.type === "k");
      if (ownKing >= 0 && attackersOnBoard(afterMateCapture, ownKing, defenderSide).length) continue;

      const supportSquares = effectiveAttackersOnBoard(afterMateCapture, mateSquare, attackerSide)
        .filter((square) => square !== mateSquare && square !== attackerSquare);
      if (!supportSquares.length) continue;

      const nonKingCapturers = effectiveAttackersOnBoard(afterMateCapture, mateSquare, defenderSide)
        .filter((square) => afterMateCapture[square]?.type !== "k");
      if (nonKingCapturers.length) continue;
      if (kingHasStaticEscapeAfterContactCapture(afterMateCapture, kingSquare, defenderSide, attackerSide)) continue;

      const supportSquare = supportSquares.find((square) => {
        const piece = afterMateCapture[square];
        const direction = directionBetween(square, mateSquare);
        return direction && sliderSupportsDirection(piece, ...direction);
      }) ?? supportSquares[0];
      const supportPiece = afterMateCapture[supportSquare];
      const lineSquares = supportPiece && directionBetween(supportSquare, mateSquare)
        && sliderSupportsDirection(supportPiece, ...directionBetween(supportSquare, mateSquare))
        ? raySquaresBetween(supportSquare, mateSquare)
        : [];
      const key = `${attackerSquare}:${mateSquare}:${kingSquare}:${supportSquare}`;
      if (seen.has(key)) continue;
      seen.add(key);
      output.push({
        kind: "mate_threat",
        attackerSide,
        defenderSide,
        attackerSquare,
        attackerPiece: clone(attackerPiece),
        mateSquare,
        targetPiece: clone(targetPiece),
        kingSquare,
        kingPiece: clone(board[kingSquare]),
        supportSquare,
        supportPiece: clone(supportPiece),
        lineSquares,
        mateMoveUci: `${squareName(attackerSquare)}${squareName(mateSquare)}`
      });
    }
  }
  return output;
}

function mateThreatFact(threat) {
  return `threaten_mate_in_1(move=${threat.mateMoveUci},attacker=${coloredPieceLabel(threat.attackerPiece, threat.attackerSquare)},target=${coloredPieceLabel(threat.targetPiece, threat.mateSquare)},king=${coloredPieceLabel(threat.kingPiece, threat.kingSquare)},support=${coloredPieceLabel(threat.supportPiece, threat.supportSquare)})`;
}

function sameMateThreat(left, right) {
  return Boolean(left && right
    && left.attackerSquare === right.attackerSquare
    && left.mateSquare === right.mateSquare
    && left.kingSquare === right.kingSquare);
}

function newEffectiveAttackers(beforeBoard, afterBoard, target, side, { excludeKing = false } = {}) {
  const before = new Set(effectiveAttackersOnBoard(beforeBoard, target, side));
  return effectiveAttackersOnBoard(afterBoard, target, side).filter((square) => {
    if (before.has(square)) return false;
    if (excludeKing && afterBoard[square]?.type === "k") return false;
    return true;
  });
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
        alignmentDefenderChains: [],
        activeAlignmentBindings: [],
        activeAlignmentChains: [],
        alignmentCapture: null,
        activeRelations: [],
        mateThreat: null,
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

  _relationsAfterOurMove(parentCard, beforeGame, afterGame, move, capturedBefore, materialSwing, check) {
    const created = this._staticCheckingTargets(afterGame, move, check, materialSwing)
      .map((target) => ({
        ...clone(target),
        kind: target.source === "skewer" ? "skewer" : "attacked_piece"
      }));

    const inherited = Array.isArray(parentCard.meta?.activeRelations)
      ? parentCard.meta.activeRelations
      : [];
    const surviving = [];
    for (const relation of inherited) {
      if (!relation || !["attacked_piece", "skewer"].includes(relation.kind)) continue;
      const status = this._targetStillLiveOnBoard(boardOf(afterGame), relation, materialSwing);
      if (status.live) surviving.push(clone(relation));
    }

    const output = [...created, ...surviving];
    const seen = new Set();
    return output.filter((relation) => {
      const key = `${relation.kind}:${targetObjectiveKey(relation)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
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

  _checkHasOnlyInterpositionReplies(afterGame, checkingSquare, attackerSide) {
    const board = boardOf(afterGame);
    const checker = board[checkingSquare];
    const defenderSide = other(attackerSide);
    const kingSquare = board.findIndex((piece) => piece?.color === defenderSide && piece.type === "k");
    if (!checker || checker.color !== attackerSide || !["b", "r", "q"].includes(checker.type) || kingSquare < 0) return false;
    const direction = directionBetween(checkingSquare, kingSquare);
    if (!direction || !sliderSupportsDirection(checker, ...direction)) return false;
    const between = new Set(raySquaresBetween(checkingSquare, kingSquare));
    if (!between.size) return false;
    const replies = legalMoveRecords(afterGame);
    if (!replies.length) return false;
    return replies.every((reply) => {
      const mover = board[reply.from];
      return mover?.color === defenderSide
        && mover.type !== "k"
        && reply.to !== checkingSquare
        && between.has(reply.to);
    });
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
    const legalReplyCount = legalMoveRecords(after).length;
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
      if (legalReplyCount === 1) predicates.push("check_with_one_reply");
      if (legalReplyCount === 2) predicates.push("check_with_two_replies");
      if (moverSide === this.rootSide && this._checkHasOnlyInterpositionReplies(after, move.to, moverSide)) {
        predicates.push("check_with_only_interpositions");
        facts.push(`check_with_only_interpositions(${san},count=${legalReplyCount})`);
      }
      predicates.push("check");
      facts.push(`check(${san})`);
      facts.push(`check_reply_count(${legalReplyCount})`);
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
        predicates.push("capture_undefended_non_pawn_piece");
        facts.push(`capture_undefended_non_pawn_piece(${san},${capturedLabel})`);
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
    const objectiveGainReached = materialSwing >= Number(this.options.objective_gain);
    if (objectiveGainReached) {
      predicates.push("objective_gain_reached");
      facts.push(`objective_gain_reached(+${materialSwing})`);
    } else if (materialSwing <= -Number(this.options.objective_gain)) {
      predicates.push("down_material");
      facts.push(`down_material(${materialSwing})`);
    }
    if (afterMaterial < 0) {
      predicates.push("material_deficit");
      facts.push(`material_deficit(${afterMaterial})`);
    } else {
      predicates.push("material_not_behind");
      facts.push(`material_not_behind(${afterMaterial})`);
      if (afterMaterial > 0) {
        predicates.push("material_advantage");
        facts.push(`material_advantage(+${afterMaterial})`);
      } else {
        predicates.push("material_equal");
        facts.push("material_equal(0)");
      }
    }
    if (objectiveGainReached && afterMaterial >= 0) {
      predicates.push("up_material");
      facts.push(`up_material(objective=+${materialSwing},balance=${afterMaterial >= 0 ? "+" : ""}${afterMaterial})`);
    }
    if (attackTargets.length) {
      attackTargets.slice(0, 6).forEach((target) => {
        facts.push(`${target.discovered ? "discovered_" : ""}attack(${pieceLongLabel(target.piece, target.target)})`);
      });
    }

    let createdMateThreat = null;
    if (moverSide === this.rootSide && !mate) {
      const exactMateMoves = legalMateThreatMoves(this.createGame, afterFen, moverSide);
      if (exactMateMoves.length) {
        const exactMoveSet = new Set(exactMateMoves.map((candidate) => candidate.uci));
        const visibleThreats = findVisibleMateInOneThreats(boardOf(after), moverSide)
          .filter((threat) => exactMoveSet.has(threat.mateMoveUci))
          .map((threat) => ({ ...clone(threat), sourceMove: move.uci, phase: "threat" }));
        createdMateThreat = {
          kind: "mate_threat",
          sourceMove: move.uci,
          phase: "threat",
          threats: visibleThreats,
          exactMateMoves: exactMateMoves.map(clone),
          mateMoves: unique(exactMateMoves.map((candidate) => candidate.uci)),
          mateSquares: unique(exactMateMoves.map((candidate) => squareName(candidate.mateSquare)))
        };
        predicates.push("threaten_mate_in_1");
        exactMateMoves.forEach((candidate) => facts.push(
          `mate_in_1_threat_move(${factToken(candidate.san)},uci=${candidate.uci},square=${squareName(candidate.mateSquare)})`
        ));
        visibleThreats.forEach((threat) => facts.push(mateThreatFact(threat)));
        facts.push(`mate_threat_set(moves=${createdMateThreat.mateMoves.join("+")},squares=${createdMateThreat.mateSquares.join("+")})`);
      }
    }

    let backRankEntryRepairs = [];
    if (moverSide === this.rootSide && check) {
      backRankEntryRepairs = findChecksAddingDefenderToBackRankEntrySquare(
        boardBefore,
        boardOf(after),
        moverSide,
        move
      );
      if (backRankEntryRepairs.length) {
        predicates.push("check_adds_defender_to_back_rank_entry_square");
        for (const relation of backRankEntryRepairs) {
          facts.push(
            `check_adds_defender_to_back_rank_entry_square(${san},entry=${squareName(relation.entrySquare)},defender=${coloredPieceLabel(relation.defenderPiece, relation.defenderSquare)},capturer=${coloredPieceLabel(relation.capturerPiece, relation.capturerSquare)},loose_target=${coloredPieceLabel(relation.targetPiece, relation.targetSquare)},enemy_entry_piece=${coloredPieceLabel(relation.invaderPiece, relation.invaderSquare)},king=${coloredPieceLabel(boardBefore[relation.kingSquare], relation.kingSquare)})`
          );
        }
      }
    }

    let looseAlignmentCaptures = [];
    let createdDefenderChases = [];
    if (moverSide === this.rootSide) {
      looseAlignmentCaptures = capturedSoleDefendedTargetOfLooseAlignment(
        boardBefore,
        boardOf(after),
        moverSide,
        move
      );
      if (looseAlignmentCaptures.length) {
        predicates.push("attack_sole_defended_piece_of_loose_alignment");
        for (const relation of looseAlignmentCaptures) {
          facts.push(looseAlignmentSoleDefenderFact(relation));
          facts.push(
            `attack_sole_defended_piece_of_loose_alignment(${san},target=${coloredPieceLabel(relation.targetPiece, relation.target)},sole_defender=${coloredPieceLabel(relation.defenderPiece, relation.defender)},loose_back=${coloredPieceLabel(relation.backPiece, relation.back)},slider=${coloredPieceLabel(relation.sliderPiece, relation.slider)})`
          );
        }
      }

      createdDefenderChases = findSafeAttacksOnSoleDefenders(boardBefore, boardOf(after), moverSide, move.to)
        .map((chase) => ({ ...clone(chase), sourceMove: move.uci }));
      if (createdDefenderChases.length) {
        predicates.push("safely_add_attacker_to_defender_of_loose_piece");
        predicates.push("defender_of_loose_piece_is_attacked");
        for (const chase of createdDefenderChases) {
          facts.push(defenderChaseFact(chase));
          facts.push(
            `safely_add_attacker_to_defender_of_loose_piece(${san},defender=${coloredPieceLabel(chase.defenderPiece, chase.defenderSquare)},target=${coloredPieceLabel(chase.targetPiece, chase.targetSquare)})`
          );
        }
      }

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

    const boardAfter = boardOf(after);
    const availableAlignmentChains = moverSide === this.rootSide
      ? (parentCard.meta?.alignmentDefenderChains?.length
          ? parentCard.meta.alignmentDefenderChains.map(clone)
          : findAlignmentDefenderChains(game, moverSide, Number(this.options.objective_gain)))
      : [];
    const inheritedAlignmentChains = Array.isArray(parentCard.meta?.activeAlignmentChains)
      ? parentCard.meta.activeAlignmentChains.map(clone)
      : [];
    const activeAlignmentChains = [];
    const openedBindings = [];

    if (moverSide === this.rootSide && looseAlignmentCaptures.length) {
      for (const relation of looseAlignmentCaptures) {
        activeAlignmentChains.push({
          side: relation.side,
          front: relation.slider,
          middle: relation.defender,
          back: relation.back,
          target: relation.target,
          direction: clone(relation.direction),
          frontPiece: clone(relation.sliderPiece),
          middlePiece: clone(relation.defenderPiece),
          backPiece: clone(relation.backPiece),
          targetPiece: clone(relation.targetPiece),
          backValue: relation.backValue,
          targetValue: relation.targetValue,
          otherDefenders: [],
          attackers: [{ square: move.to, piece: clone(boardAfter[move.to]) }],
          phase: "target_captured",
          sourceMove: move.uci,
          capturingPiece: clone(boardAfter[move.to])
        });
      }
    }

    if (moverSide === this.rootSide && capture) {
      for (const chain of availableAlignmentChains) {
        const defender = (chain.otherDefenders || []).find((item) => item.square === move.to);
        if (!defender || !alignmentDefenderChainSurvives(boardAfter, chain)) continue;
        predicates.push("capture_defender_of_alignment_target");
        facts.push(alignmentDefenderChainFact(chain));
        facts.push(`capture_defender_of_alignment_target(${san},defender=${coloredPieceLabel(defender.piece, defender.square)},target=${coloredPieceLabel(chain.targetPiece, chain.target)})`);
        activeAlignmentChains.push({
          ...refreshAlignmentDefenderChain(boardAfter, chain),
          phase: "defender_captured",
          removedDefenderSquare: defender.square,
          removedDefenderPiece: clone(defender.piece),
          sourceMove: move.uci
        });
      }
    }

    for (const chain of inheritedAlignmentChains) {
      if (chain.phase === "defender_captured") {
        if (moverSide === this.rootSide && capture && move.to === chain.target
          && alignmentDefenderChainSurvives(boardBefore, chain)) {
          predicates.push("capture_alignment_target");
          facts.push(alignmentDefenderChainFact(chain));
          facts.push(`capture_alignment_target(${san},target=${coloredPieceLabel(chain.targetPiece, chain.target)})`);
          activeAlignmentChains.push({
            ...clone(chain),
            phase: "target_captured",
            targetCaptureMove: move.uci,
            capturingPiece: clone(boardAfter[move.to])
          });
        } else if (alignmentDefenderChainSurvives(boardAfter, chain)) {
          activeAlignmentChains.push(refreshAlignmentDefenderChain(boardAfter, chain));
        }
      } else if (chain.phase === "target_captured") {
        if (moverSide !== this.rootSide && move.from === chain.middle) {
          const binding = openedAlignmentBinding(boardAfter, chain);
          if (binding) {
            openedBindings.push(binding);
            facts.push(alignmentDefenderChainFact(chain));
            facts.push(`alignment_square_cleared(${squareName(chain.middle)})`);
            facts.push(`back_piece_exposed(${coloredPieceLabel(chain.backPiece, chain.back)})`);
          }
        }
      }
    }

    const survivingBindings = [
      ...candidateBindings.filter((binding) => {
        if (alignmentCapture && binding.back === alignmentCapture.target) return false;
        return bindingSurvives(boardAfter, binding);
      }),
      ...openedBindings
    ];

    const exposedBindings = survivingBindings.filter((binding) => binding.phase === "middle_cleared");
    if (exposedBindings.length) {
      predicates.push("alignment_back_piece_exposed");
      exposedBindings.slice(0, 6).forEach((binding) => {
        facts.push(`alignment_back_piece_exposed(front=${coloredPieceLabel(binding.frontPiece, binding.front)},back=${coloredPieceLabel(binding.backPiece, binding.back)})`);
      });
    }

    let activeRelations = Array.isArray(parentCard.meta?.activeRelations)
      ? parentCard.meta.activeRelations.map(clone)
      : [];
    if (moverSide === this.rootSide) {
      const tacticalRelations = this._relationsAfterOurMove(
        parentCard,
        game,
        after,
        move,
        capturedBefore,
        materialSwing,
        check
      );
      activeRelations = [...createdDefenderChases, ...tacticalRelations];

      const attackedRelations = activeRelations.filter((relation) => relation.kind === "attacked_piece");
      const skewerRelations = activeRelations.filter((relation) => relation.kind === "skewer");
      if (attackedRelations.length) {
        predicates.push("attacked_piece");
        const createdNow = attackedRelations.filter((relation) => relation.sourceMove === move.uci);
        if (createdNow.length) {
          predicates.push("check_and_attack_piece");
          for (const relation of createdNow) {
            facts.push(
              `check_and_attack_piece(${san},target=${coloredPieceLabel(relation.targetPiece, relation.targetSquare)})`
            );
          }
        }
      }
      if (skewerRelations.length) {
        predicates.push("skewer");
        for (const relation of skewerRelations.filter((item) => item.sourceMove === move.uci)) {
          facts.push(
            `skewer(attacker=${coloredPieceLabel(relation.attackerPiece, relation.attackerSquare)},middle=${coloredPieceLabel(relation.blockerPiece, relation.blockerSquare)},target=${coloredPieceLabel(relation.targetPiece, relation.targetSquare)})`
          );
        }
      }
    } else {
      const updated = [];
      for (const relation of activeRelations) {
        if (relation?.kind === "defender_chase") {
          const next = updateDefenderChaseOnBoard(boardAfter, relation, move);
          if (next) {
            updated.push(next);
            facts.push(defenderChaseFact(next));
          }
        } else if (relation) {
          updated.push(clone(relation));
        }
      }
      activeRelations = updated;
    }

    facts.push(`material_balance(${afterMaterial >= 0 ? "+" : ""}${afterMaterial})`);
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
        alignmentDefenderChains: [],
        activeAlignmentBindings: survivingBindings.map(clone),
        activeAlignmentChains: activeAlignmentChains.map(clone),
        alignmentCapture,
        activeRelations: activeRelations.map(clone),
        mateThreat: clone(createdMateThreat),
        materialBefore: beforeMaterial,
        materialAfter: afterMaterial,
        materialSwing,
        objectiveGainReached,
        captureValue: VALUES[capturedBefore?.type] || 0,
        legalReplyCount,
        oracleHorizon: 1,
        oracleTerminalProbe: SCRATCHCHESS_ORACLE_TERMINAL_PROBE
      }
    };
  }


  _tagMateThreatReply(card, child, threatSet) {
    const threats = Array.isArray(threatSet?.threats) && threatSet.threats.length
      ? threatSet.threats.map(clone)
      : [clone(threatSet)].filter(Boolean);
    const beforeBoard = boardOf(this._game(card.fen, `${card.display} mate-threat position`));
    const replyGame = this._game(child.fen, `${child.display} mate-threat reply`);
    const board = boardOf(replyGame);
    const mateMoves = legalMateInOneMoves(this.createGame, replyGame, this.rootSide);
    const mateMoveFacts = mateMoves.map((move) =>
      `mate_in_1_move(${factToken(move.san)},uci=${move.uci},square=${squareName(move.mateSquare)})`
    );
    const sourceMoves = unique(threats.map((threat) => threat.sourceMove || threat.mateMoveUci).filter(Boolean));

    child.meta.mateThreat = null;

    if (mateMoves.length) {
      child.predicates = unique([...child.predicates, "mate_in_1_available"]);
      child.facts = unique([
        ...child.facts,
        `mate_in_1_available(count=${mateMoves.length},moves=${mateMoves.map((move) => factToken(move.san)).join("+")})`,
        ...mateMoveFacts,
        `mate_threat_not_answered(sources=${sourceMoves.join("+") || "unknown"})`
      ]);
      const closureFact = `closed_mate_threat_reply(${child.move?.san || child.display},reason=mate_in_1_available,witness=${mateMoves.map((move) => factToken(move.san)).join("+")})`;
      child.facts = unique([...child.facts, closureFact]);
      card.facts = unique([...card.facts, closureFact]);
      return ["mate_in_1_available"];
    }

    const predicates = ["no_mate_in_1_available"];
    const facts = [
      "no_mate_in_1_available",
      `mate_threat_answered(sources=${sourceMoves.join("+") || "unknown"})`
    ];
    const add = (predicate, fact) => {
      predicates.push(predicate);
      if (fact) facts.push(fact);
    };

    const checkPredicates = ["check_with_one_reply", "check_with_two_replies", "check"]
      .filter((predicate) => child.predicates.includes(predicate));
    if (checkPredicates.length) add("countercheck", `countercheck(${child.move?.san || child.display})`);

    const capturedSquare = Number(child.move?.toIndex);
    const captured = child.move?.captured || null;
    const movedTo = Number(child.move?.toIndex);

    for (const threat of threats) {
      const capturedThreatPiece = capturedSquare === threat.attackerSquare
        && captured?.color === this.rootSide
        && captured?.type === threat.attackerPiece?.type;
      if (capturedThreatPiece) {
        add(
          "capture_mate_threat_piece",
          `capture_mate_threat_piece(${child.move?.san || child.display},${coloredPieceLabel(threat.attackerPiece, threat.attackerSquare)},mate=${threat.mateMoveUci})`
        );
      }

      const capturedSupporter = Number.isInteger(threat.supportSquare)
        && capturedSquare === threat.supportSquare
        && captured?.color === this.rootSide
        && captured?.type === threat.supportPiece?.type;
      if (capturedSupporter) {
        add(
          "capture_mate_threat_supporter",
          `capture_mate_threat_supporter(${child.move?.san || child.display},${coloredPieceLabel(threat.supportPiece, threat.supportSquare)},mate=${threat.mateMoveUci})`
        );
      }

      const batteryLine = Array.isArray(threat.lineSquares) ? threat.lineSquares : [];
      const interposed = batteryLine.includes(movedTo)
        && board[movedTo]?.color === other(this.rootSide)
        && Number.isInteger(threat.supportSquare)
        && !attacksSquare(board, threat.supportSquare, threat.mateSquare);
      if (interposed) {
        add(
          "interpose_mate_threat_battery",
          `interpose_mate_threat_battery(${child.move?.san || child.display},square=${squareName(movedTo)},mate=${threat.mateMoveUci})`
        );
      }

      const newMateSquareDefenders = newEffectiveAttackers(
        beforeBoard,
        board,
        threat.mateSquare,
        other(this.rootSide),
        { excludeKing: true }
      );
      if (newMateSquareDefenders.length) {
        add(
          "add_defender_to_mating_square",
          `add_defender_to_mating_square(${child.move?.san || child.display},square=${squareName(threat.mateSquare)},defenders=${newMateSquareDefenders.map(squareName).join("+")},mate=${threat.mateMoveUci})`
        );
      }

      const movedMatingTarget = child.move?.fromIndex === threat.mateSquare
        && child.move?.mover?.color === other(this.rootSide)
        && child.move?.mover?.type === threat.targetPiece?.type;
      if (movedMatingTarget) {
        add(
          "move_mating_target",
          `move_mating_target(${child.move?.san || child.display},from=${squareName(threat.mateSquare)},mate=${threat.mateMoveUci})`
        );
      }

      const movedThreatenedKing = child.move?.mover?.color === other(this.rootSide)
        && child.move?.mover?.type === "k"
        && child.move?.fromIndex === threat.kingSquare;
      if (movedThreatenedKing) {
        add(
          "king_escape_from_mate_threat",
          `king_escape_from_mate_threat(${child.move?.san || child.display},from=${squareName(threat.kingSquare)},to=${squareName(movedTo)},mate=${threat.mateMoveUci})`
        );
      }
    }

    child.predicates = unique([...child.predicates, ...predicates]);
    child.facts = unique([...child.facts, ...facts]);
    return unique(predicates);
  }

  _tagLooseAlignmentReply(card, child) {
    if (!card.predicates.includes("attack_sole_defended_piece_of_loose_alignment")) return [];

    const witnesses = materialObjectiveCaptureMoves(
      this.createGame,
      child.fen,
      this.rootSide,
      this.rootMaterial,
      Number(this.options.objective_gain)
    );

    if (witnesses.length) {
      child.predicates = unique([...child.predicates, "material_objective_capture_in_1_available"]);
      const witnessFacts = witnesses.map((witness) =>
        `material_objective_capture_in_1_move(${factToken(witness.san)},uci=${witness.uci},target=${coloredPieceLabel(witness.captured, witness.to)},swing=+${witness.materialSwing})`
      );
      child.facts = unique([
        ...child.facts,
        `material_objective_capture_in_1_available(count=${witnesses.length})`,
        ...witnessFacts
      ]);
      if (!child.predicates.includes("recapture")) {
        const closureFact = `closed_loose_alignment_reply(${child.move?.san || child.display},reason=material_objective_capture_in_1_available,witness=${witnesses.map((witness) => factToken(witness.san)).join("+")})`;
        child.facts = unique([...child.facts, closureFact]);
        card.facts = unique([...card.facts, closureFact]);
      }
      return ["material_objective_capture_in_1_available"];
    }

    child.predicates = unique([...child.predicates, "no_material_objective_capture_in_1_available"]);
    child.facts = unique([
      ...child.facts,
      "no_material_objective_capture_in_1_available"
    ]);
    return ["no_material_objective_capture_in_1_available"];
  }

  _tagDefenderChaseReply(child, chase) {
    if (!chase || chase.kind !== "defender_chase") return [];
    const capturedChaser = Number.isInteger(chase.chaserSquare)
      && child.move?.toIndex === chase.chaserSquare
      && child.move?.captured?.color === this.rootSide;
    const capturedTargetAttacker = (chase.targetAttackers || []).some((attacker) =>
      Number.isInteger(attacker?.square)
      && child.move?.toIndex === attacker.square
      && child.move?.captured?.color === this.rootSide
    );

    const board = boardOf(this._game(child.fen, `${child.display} defender chase reply`));
    const updated = updateDefenderChaseOnBoard(board, chase, {
      from: child.move?.fromIndex,
      to: child.move?.toIndex
    });

    // Capturing either attacker destroys the relation and is still a classified
    // reply. Otherwise the relation must survive on the resulting board.
    if (!updated && !capturedChaser && !capturedTargetAttacker) return [];

    const defenderSquare = updated?.defenderSquare;
    const defenderSafe = Number.isInteger(defenderSquare)
      && effectiveAttackersOnBoard(board, defenderSquare, this.rootSide).length === 0;
    const movedDefender = child.move?.fromIndex === chase.defenderSquare
      && child.move?.mover?.color === chase.defenderPiece?.color
      && child.move?.mover?.type === chase.defenderPiece?.type;
    const predicates = [];
    const facts = [];

    if (capturedChaser || capturedTargetAttacker) {
      predicates.push("capture_attacker");
      facts.push(`capture_attacker(${child.move?.san || child.display})`);
    } else if (movedDefender && defenderSafe) {
      const predicate = child.predicates.includes("capture")
        ? "capture_and_keep_defending_loose_piece"
        : "move_defender_while_still_defending_loose_piece";
      predicates.push(predicate);
      facts.push(`${predicate}(${child.move?.san || child.display},target=${squareName(chase.targetSquare)})`);
    }

    if (child.predicates.includes("check_with_one_reply")) predicates.push("check_with_one_reply");
    if (child.predicates.includes("check_with_two_replies")) predicates.push("check_with_two_replies");

    if (predicates.length) {
      child.predicates = unique([...child.predicates, ...predicates]);
      child.facts = unique([...child.facts, defenderChaseFact(updated || chase), ...facts]);
    }
    return unique(predicates);
  }

  _classifyHumanReplies(card, analyses) {
    if (card.side !== "their") return false;

    const replyPredicates = new Set();
    const activeRelations = Array.isArray(card.meta?.activeRelations)
      ? card.meta.activeRelations
      : [];
    const hasMateThreat = card.predicates.includes("threaten_mate_in_1");
    const hasLooseAlignmentAttack = card.predicates.includes("attack_sole_defended_piece_of_loose_alignment");

    if (card.predicates.includes("up_material")) {
      ["mated", "recapture", "check"].forEach((predicate) => replyPredicates.add(predicate));
    }

    if (hasMateThreat) {
      const threatSet = card.meta?.mateThreat;
      if (!threatSet) throw new Error(`Position ${card.id} has threaten_mate_in_1 without mateThreat board data`);
      analyses.forEach((child) => this._tagMateThreatReply(card, child, threatSet));
      replyPredicates.add("no_mate_in_1_available");
    }

    if (hasLooseAlignmentAttack) {
      analyses.forEach((child) => this._tagLooseAlignmentReply(card, child));
      // Recaptures are deliberately shown. Every other reply is either closed
      // by an exact material-objective capture witness or retained because no
      // such one-ply certificate exists.
      replyPredicates.add("recapture");
      replyPredicates.add("no_material_objective_capture_in_1_available");
    }

    const defenderChases = activeRelations.filter((relation) => relation?.kind === "defender_chase");
    if (defenderChases.length) {
      for (const chase of defenderChases) analyses.forEach((child) => this._tagDefenderChaseReply(child, chase));
      [
        "mated",
        "capture_attacker",
        "check_with_one_reply",
        "check_with_two_replies",
        "move_defender_while_still_defending_loose_piece",
        "capture_and_keep_defending_loose_piece"
      ].forEach((predicate) => replyPredicates.add(predicate));
    }

    const skewers = activeRelations.filter((relation) => relation?.kind === "skewer");
    if (skewers.length) {
      for (const relation of skewers) analyses.forEach((child) => this._tagHumanReply(child, relation));
      [
        "mated", "capture_attacker", "move_skewered_piece", "defend_skewered_piece",
        "block_skewer", "check", "capture"
      ].forEach((predicate) => replyPredicates.add(predicate));
    }

    const attackedPieces = activeRelations.filter((relation) => relation?.kind === "attacked_piece");
    if (attackedPieces.length) {
      for (const relation of attackedPieces) analyses.forEach((child) => this._tagHumanReply(child, relation));
      [
        "mated", "capture_attacker", "move_attacked_piece", "defend_attacked_piece",
        "block_attack", "check", "capture"
      ].forEach((predicate) => replyPredicates.add(predicate));
    }

    if (!replyPredicates.size) return false;

    const orderedPredicates = [...replyPredicates];
    const relevant = analyses.filter((child) => orderedPredicates.some((predicate) => child.predicates.includes(predicate)));
    const limit = Number(this.options.reply_class_limit);
    if (!Number.isInteger(limit) || limit < 1) {
      throw new Error("oracle reply_class_limit must be an integer >= 1");
    }

    const mateDefenses = hasMateThreat
      ? analyses.filter((child) => child.predicates.includes("no_mate_in_1_available"))
      : [];
    const mateAllowingReplies = hasMateThreat
      ? analyses.filter((child) => child.predicates.includes("mate_in_1_available"))
      : [];
    const facts = [...card.facts];
    if (hasMateThreat) {
      facts.push(`mate_threat_reply_partition(legal=${analyses.length},defenses=${mateDefenses.length},mate_available=${mateAllowingReplies.length},complete=${mateDefenses.length + mateAllowingReplies.length === analyses.length})`);
    }
    if (hasLooseAlignmentAttack) {
      const retained = analyses.filter((child) =>
        child.predicates.includes("recapture")
        || child.predicates.includes("no_material_objective_capture_in_1_available")
      );
      const certifiedClosed = analyses.filter((child) =>
        !child.predicates.includes("recapture")
        && child.predicates.includes("material_objective_capture_in_1_available")
      );
      facts.push(`loose_alignment_reply_partition(legal=${analyses.length},retained=${retained.length},objective_capture_closed=${certifiedClosed.length},complete=${retained.length + certifiedClosed.length === analyses.length})`);
    }
    const nonMatePredicates = orderedPredicates.filter((predicate) => !["no_mate_in_1_available"].includes(predicate));
    if (nonMatePredicates.length) {
      facts.push(`relevant_replies(count=${relevant.length},limit=${limit},predicates=${nonMatePredicates.join("+")})`);
    }
    card.facts = unique(facts);

    if (!hasMateThreat && !hasLooseAlignmentAttack && relevant.length > limit) {
      card.predicates = unique([...card.predicates, "more_than_two_relevant_replies"]);
      card.help = `${relevant.length} immediate replies match the visible human reply cards; the policy limit is ${limit}.`;
    } else if (hasMateThreat) {
      card.help = `${mateDefenses.length} genuine defenses remove every legal mate in one; ${mateAllowingReplies.length} other legal replies close with explicit mating witnesses.`;
    } else if (hasLooseAlignmentAttack) {
      const retained = analyses.filter((child) =>
        child.predicates.includes("recapture")
        || child.predicates.includes("no_material_objective_capture_in_1_available")
      );
      const certifiedClosed = analyses.length - retained.length;
      card.help = `${retained.length} critical replies remain live; ${certifiedClosed} other legal replies close with explicit one-ply material-objective capture witnesses.`;
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

    const alignmentDefenderChains = sideToMove === this.rootSide
      ? findAlignmentDefenderChains(game, sideToMove, Number(this.options.objective_gain))
      : [];
    card.meta.alignmentDefenderChains = alignmentDefenderChains.map(clone);
    if (alignmentDefenderChains.length) {
      card.predicates = unique([...card.predicates, "alignment_middle_defends_piece"]);
      card.facts = unique([
        ...card.facts,
        ...alignmentDefenderChains.slice(0, 8).map(alignmentDefenderChainFact)
      ]);
    }

    const activeAlignmentChains = Array.isArray(card.meta?.activeAlignmentChains)
      ? card.meta.activeAlignmentChains.filter((chain) => chain.phase === "defender_captured")
      : [];
    if (sideToMove === this.rootSide && activeAlignmentChains.length) {
      card.predicates = unique([...card.predicates, "alignment_capture_chain"]);
      card.facts = unique([
        ...card.facts,
        ...activeAlignmentChains.slice(0, 8).map(alignmentDefenderChainFact)
      ]);
    }



    // Exactly one applied move per legal response. Lexical UCI ordering is only
    // deterministic presentation; predicate order in the DFA supplies interest.
    const analyses = legal
      .map((move) => this._analyzeMove(card, game, move))
      .filter(Boolean)
      .sort((a, b) => String(a.move?.uci || "").localeCompare(String(b.move?.uci || "")));

    const availableMovePredicates = [
      ["mate", "mate_available"],
      ["mated", "mate_available"],
      ["recapture", "recapture_available"],
      ["skewer", "skewer_available"],
      ["capture_back_of_alignment", "capture_back_of_alignment_available"]
    ];
    for (const [movePredicate, positionPredicate] of availableMovePredicates) {
      const matches = analyses.filter((child) => child.predicates.includes(movePredicate));
      if (!matches.length) continue;
      card.predicates = unique([...card.predicates, positionPredicate]);
      card.facts = unique([
        ...card.facts,
        `${positionPredicate}(${matches.slice(0, 6).map((child) => child.move?.san || child.display).join(",")})`
      ]);
    }
    if (inCheck) {
      const counterchecks = analyses.filter((child) => child.predicates.includes("check"));
      if (counterchecks.length) {
        card.predicates = unique([...card.predicates, "countercheck_available"]);
        card.facts = unique([
          ...card.facts,
          `countercheck_available(${counterchecks.slice(0, 6).map((child) => child.move?.san || child.display).join(",")})`
        ]);
      }
    }
    const winningRecaptures = analyses.filter((child) =>
      child.predicates.includes("recapture") && child.predicates.includes("up_material")
    );
    if (winningRecaptures.length) {
      card.predicates = unique([...card.predicates, "winning_recapture_available"]);
      card.facts = unique([
        ...card.facts,
        `winning_recapture_available(${winningRecaptures.slice(0, 6).map((child) => child.move?.san || child.display).join(",")})`
      ]);
    }

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
    const hasActiveRelations = Array.isArray(card.meta?.activeRelations) && card.meta.activeRelations.length > 0;
    if (card.side === "their" && (
      card.predicates.includes("up_material")
      || card.predicates.includes("threaten_mate_in_1")
      || card.predicates.includes("attack_sole_defended_piece_of_loose_alignment")
      || hasActiveRelations
    )) {
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
      terminalProbe: SCRATCHCHESS_ORACLE_TERMINAL_PROBE,
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
