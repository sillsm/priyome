// chess_query.js
import { Chess } from "chess.js";

/**
 * Count how many predicates in queryJson are satisfied by the given FEN.
 *
 * Verbose mode is debug-only: it console.logs evaluation details but ALWAYS
 * returns a number (no structured return).
 *
 * @param {string} fen
 * @param {object} queryJson
 * @param {object} [options]
 * @param {boolean} [options.verbose=false]
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

  for (let i = 0; i < predicates.length; i++) {
    const pred = predicates[i];
    const assertValue = pred?.assert !== false; // default true

    let raw = false;
    let detail = "";

    switch (pred?.op) {
      case "at": {
        const ref = pred?.piece?.ref;
        raw = matchesAt(chess, ref);
        detail = `at ${ref}`;
        break;
      }

      case "attacks": {
        const a = pred?.attacker?.ref;
        const t = pred?.target?.ref;
        raw = matchesAttacks(chess, a, t, verbose);
        detail = `attacks ${a} -> ${t}`;
        break;
      }

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
  }

  if (verbose) {
    console.log("--------------------------------");
    console.log(`Matched ${matched} / ${predicates.length}`);
    console.log("================================\n");
  }

  return matched;
}

/* ---------------- helpers ---------------- */

/**
 * pieceRef like "Bd3" (white bishop on d3) or "ph7" (black pawn on h7)
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
 * IMPORTANT: Query semantics should ignore side-to-move.
 * Many chess.js versions only generate moves for the side to move, so we
 * create a temporary Chess instance where the active color is set to the
 * attacker's color, then generate legal moves from the attacker square.
 */
function matchesAttacks(chess, attackerRef, targetRef, verbose) {
  if (typeof attackerRef !== "string" || typeof targetRef !== "string")
    return false;
  if (attackerRef.length !== 3 || targetRef.length !== 3) return false;

  const attackerChar = attackerRef[0];
  const attackerSquare = attackerRef.slice(1);

  const targetChar = targetRef[0];
  const targetSquare = targetRef.slice(1);

  const attacker = chess.get(attackerSquare);
  const target = chess.get(targetSquare);

  if (!attacker || !target) return false;

  // Validate that the refs match the board
  const attackerColor = isUpper(attackerChar) ? "w" : "b";
  const targetColor = isUpper(targetChar) ? "w" : "b";

  if (attacker.type !== attackerChar.toLowerCase() || attacker.color !== attackerColor)
    return false;

  if (target.type !== targetChar.toLowerCase() || target.color !== targetColor)
    return false;

  // Flip "side to move" to the attacker, so chess.js will generate moves
  // for that color regardless of whose turn it is in the original FEN.
  const fenParts = chess.fen().split(" ");
  fenParts[1] = attackerColor;
  const chessTurned = new Chess(fenParts.join(" "));

  const moves = chessTurned.moves({
    square: attackerSquare,
    verbose: true,
  });

  const ok = moves.some((m) => m.to === targetSquare && !!m.captured);

  // Optional deeper debug when verbose:
  if (verbose && !ok) {
    const tos = moves.map((m) => (m.captured ? `${m.to}x${m.captured}` : m.to));
    console.log(
      `    (debug) from ${attackerRef} legal targets:`,
      tos.length ? tos.join(" ") : "(none)"
    );
  }

  return ok;
}

function isUpper(ch) {
  return ch >= "A" && ch <= "Z";
}
