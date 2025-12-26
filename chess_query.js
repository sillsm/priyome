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
 * @returns {number}
 */
export function countMatchedPreconditions(fen, queryJson, options = {}) {
  const chess = new Chess(fen);
  const predicates = queryJson?.predicates ?? [];
  const verbose = options.verbose === true;

  let matched = 0;

  if (verbose) {
    console.log("=== countMatchedPreconditions ===");
    console.log("FEN:", fen);
    console.log("Predicates:", predicates.length);
    console.log("--------------------------------");
  }

  predicates.forEach((pred, i) => {
    const assertValue = pred?.assert !== false;
    let raw = false;
    let detail = "";

    switch (pred?.op) {
      case "at":
        raw = matchesAt(chess, pred?.piece?.ref);
        detail = `at ${pred?.piece?.ref}`;
        break;

      case "attacks":
        raw = matchesAttacks(
          chess,
          pred?.attacker?.ref,
          pred?.target?.ref
        );
        detail = `attacks ${pred?.attacker?.ref} -> ${pred?.target?.ref}`;
        break;

      default:
        raw = false;
        detail = `unknown op ${pred?.op}`;
    }

    const ok = assertValue ? raw : !raw;
    if (ok) matched++;

    if (verbose) {
      console.log(
        `[${i}]`,
        detail,
        "| raw:",
        raw,
        "| assert:",
        assertValue,
        "| final:",
        ok ? "✔ MATCH" : "✘ FAIL"
      );
    }
  });

  if (verbose) {
    console.log("--------------------------------");
    console.log(`Matched ${matched} / ${predicates.length}`);
    console.log("================================\n");
  }

  return matched;
}

/* ---------------- helpers ---------------- */

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

function matchesAttacks(chess, attackerRef, targetRef) {
  if (typeof attackerRef !== "string" || typeof targetRef !== "string")
    return false;

  if (attackerRef.length !== 3 || targetRef.length !== 3)
    return false;

  const attackerChar = attackerRef[0];
  const attackerSquare = attackerRef.slice(1);

  const targetChar = targetRef[0];
  const targetSquare = targetRef.slice(1);

  const attacker = chess.get(attackerSquare);
  const target = chess.get(targetSquare);

  if (!attacker || !target) return false;

  if (
    attacker.type !== attackerChar.toLowerCase() ||
    attacker.color !== (isUpper(attackerChar) ? "w" : "b")
  ) return false;

  if (
    target.type !== targetChar.toLowerCase() ||
    target.color !== (isUpper(targetChar) ? "w" : "b")
  ) return false;

  // Pseudo-legal moves: ignore side-to-move
  const moves = chess.moves({
    square: attackerSquare,
    verbose: true,
    legal: false
  });

  return moves.some(
    m => m.to === targetSquare && !!m.captured
  );
}

function isUpper(ch) {
  return ch >= "A" && ch <= "Z";
}
