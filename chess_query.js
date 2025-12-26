// chess_query.js
import { Chess } from "chess.js";

/**
 * Count how many predicates in queryJson are satisfied by the given FEN.
 *
 * @param {string} fen
 * @param {object} queryJson
 * @param {object} [options]
 * @param {boolean} [options.verbose=false]
 *
 * @returns {number|object}
 *   - number if verbose=false
 *   - { count, results[] } if verbose=true
 */
export function countMatchedPreconditions(fen, queryJson, options = {}) {
  const chess = new Chess(fen);
  const predicates = queryJson?.predicates ?? [];
  const verbose = options.verbose === true;

  let matched = 0;
  const results = [];

  for (let i = 0; i < predicates.length; i++) {
    const pred = predicates[i];
    const { ok, reason } = predicateMatches(chess, pred);

    if (ok) matched++;

    if (verbose) {
      results.push({
        index: i,
        predicate: pred,
        matched: ok,
        reason,
      });
    }
  }

  return verbose ? { count: matched, results } : matched;
}

/* ---------------- helpers ---------------- */

function predicateMatches(chess, pred) {
  const assertValue = pred?.assert !== false; // default true

  let raw = false;
  let reason = "";

  switch (pred?.op) {
    case "at":
      raw = matchesAt(chess, pred?.piece?.ref);
      reason = raw
        ? `piece ${pred.piece.ref} is on target square`
        : `piece ${pred.piece?.ref} not on target square`;
      break;

    case "attacks":
      raw = matchesAttacks(
        chess,
        pred?.attacker?.ref,
        pred?.target?.ref
      );
      reason = raw
        ? `${pred.attacker.ref} attacks ${pred.target.ref}`
        : `${pred.attacker?.ref} does not attack ${pred.target?.ref}`;
      break;

    default:
      raw = false;
      reason = `unknown op: ${pred?.op}`;
  }

  const ok = assertValue ? raw : !raw;

  if (!assertValue) {
    reason = `NOT (${reason})`;
  }

  return { ok, reason };
}

/**
 * pieceRef like "Bd3" or "ph7"
 */
function matchesAt(chess, pieceRef) {
  if (typeof pieceRef !== "string" || pieceRef.length !== 3) return false;

  const pieceChar = pieceRef[0];
  const square = pieceRef.slice(1);

  const piece = chess.get(square);
  if (!piece) return false;

  return (
    piece.type === pieceChar.toLowerCase() &&
    piece.color === (isUpper(pieceChar) ? "w" : "b")
  );
}

/**
 * attackerRef like "Ng5"
 * targetRef like "ph7"
 *
 * Uses pseudo-legal moves (legal:false) to ignore side-to-move.
 */
function matchesAttacks(chess, attackerRef, targetRef) {
  if (typeof attackerRef !== "string" || attackerRef.length !== 3) return false;
  if (typeof targetRef !== "string" || targetRef.length !== 3) return false;

  const attackerChar = attackerRef[0];
  const attackerSquare = attackerRef.slice(1);

  const targetChar = targetRef[0];
  const targetSquare = targetRef.slice(1);

  const attacker = chess.get(attackerSquare);
  const target = chess.get(targetSquare);

  if (!attacker || !target) return false;

  // Validate ref matches board
  if (
    attacker.type !== attackerChar.toLowerCase() ||
    attacker.color !== (isUpper(attackerChar) ? "w" : "b")
  ) return false;

  if (
    target.type !== targetChar.toLowerCase() ||
    target.color !== (isUpper(targetChar) ? "w" : "b")
  ) return false;

  const moves = chess.moves({
    square: attackerSquare,
    verbose: true,
    legal: false, // critical
  });

  return moves.some(
    (m) => m.to === targetSquare && !!m.captured
  );
}

function isUpper(ch) {
  return ch >= "A" && ch <= "Z";
}
