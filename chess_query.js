import { Chess } from "chess.js";

/**
 * Count how many predicates in queryJson are satisfied by the given FEN.
 *
 * @param {string} fen
 * @param {object} queryJson
 * @returns {number} integer in [0, predicates.length]
 */
export function countMatchedPreconditions(fen, queryJson) {
  const chess = new Chess(fen);
  const predicates = queryJson.predicates ?? [];

  let matched = 0;

  for (const pred of predicates) {
    if (predicateMatches(chess, pred)) {
      matched++;
    }
  }

  return matched;
}

/* ---------------- helpers ---------------- */

function predicateMatches(chess, pred) {
  const assertValue = pred.assert !== false; // default true

  let result = false;

  switch (pred.op) {
    case "at":
      result = matchesAt(chess, pred.piece?.ref);
      break;

    case "attacks":
      result = matchesAttacks(
        chess,
        pred.attacker?.ref,
        pred.target?.ref
      );
      break;

    default:
      result = false;
  }

  return assertValue ? result : !result;
}

/**
 * pieceRef like "Bd3" or "ph7"
 */
function matchesAt(chess, pieceRef) {
  if (!pieceRef || pieceRef.length !== 3) return false;

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
 */
function matchesAttacks(chess, attackerRef, targetRef) {
  if (!attackerRef || !targetRef) return false;

  const attackerSquare = attackerRef.slice(1);
  const targetSquare = targetRef.slice(1);

  const attacker = chess.get(attackerSquare);
  const target = chess.get(targetSquare);

  if (!attacker || !target) return false;

  // color sanity
  if (
    attacker.color !== (isUpper(attackerRef[0]) ? "w" : "b") ||
    target.color !== (isUpper(targetRef[0]) ? "w" : "b")
  ) {
    return false;
  }

  // chess.js: legal moves from square
  const moves = chess.moves({
    square: attackerSquare,
    verbose: true,
  });

  return moves.some(
    m => m.to === targetSquare && m.captured
  );
}

function isUpper(ch) {
  return ch === ch.toUpperCase();
}
