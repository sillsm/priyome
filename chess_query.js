function matchesAttacks(chess, attackerRef, targetRef) {
  if (typeof attackerRef !== "string" || typeof targetRef !== "string") return false;
  if (attackerRef.length !== 3 || targetRef.length !== 3) return false;

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

  // --- KEY FIX: evaluate moves as if it's the attacker's turn ---
  const fenParts = chess.fen().split(" ");
  fenParts[1] = attacker.color; // "w" or "b"
  const chessTurned = new Chess(fenParts.join(" "));

  const moves = chessTurned.moves({
    square: attackerSquare,
    verbose: true,
  });

  return moves.some((m) => m.to === targetSquare && !!m.captured);
}
