// tactical_features.js

function pieceTag(ctx, piece, sq) {
  return `${ctx.pieceLetter(piece)}${ctx.sqName(sq)}`;
}

function hasPiece(board, sq) {
  return Number.isInteger(sq) && sq >= 0 && sq < 64 && !!board[sq];
}

function observationRefs(ob) {
  const refs = ob?.data?.refs || [];
  if (ob?.type === 'alignment') return ob?.data?.squares || refs;
  return refs;
}

function stableSide(piece) {
  // Tactical features should be invariant under "side to move."
  // So do not use ours/theirs here.
  if (!piece) return 'neutral';
  if (piece.color === 'w') return 'white';
  if (piece.color === 'b') return 'black';
  return piece.color || 'neutral';
}

function refSquare(ref) {
  if (Number.isInteger(ref)) return ref;
  if (Number.isInteger(ref?.square)) return ref.square;
  if (Number.isInteger(ref?.sq)) return ref.sq;
  if (Number.isInteger(ref?.from)) return ref.from;
  return null;
}

function refPiece(ctx, ref) {
  if (ref?.piece) return ref.piece;

  const sq = refSquare(ref);
  if (sq != null) return ctx.game.state.board[sq] || null;

  if (ref?.type && ref?.color) return ref;
  return null;
}

function hasPawnDefender(ctx, defenders, ownerColor) {
  return (defenders || []).some(ref => {
    const p = refPiece(ctx, ref);
    return p && p.type === 'p' && p.color === ownerColor;
  });
}

function moveColor(ctx, move) {
  const p = ctx?.game?.state?.board?.[move?.from];
  return p?.color || ctx?.side;
}

function moveAttacksSquareByMover(ctx, after, move, sq) {
  const color = moveColor(ctx, move);
  return !!color && ctx.moveAttacksSquare(after, move, sq, color);
}

function attacksAlongRay(piece, df, dr) {
  if (!piece) return false;

  const orthogonal = df === 0 || dr === 0;
  const diagonal = df !== 0 && dr !== 0;

  if (piece.type === 'q') return orthogonal || diagonal;
  if (piece.type === 'r') return orthogonal;
  if (piece.type === 'b') return diagonal;

  return false;
}

function firstOccupiedFrom(ctx, start, df, dr) {
  let [f, r] = ctx.FR(start);
  f += df;
  r += dr;

  while (ctx.inB(f, r)) {
    const sq = ctx.idx(f, r);
    if (ctx.game.state.board[sq]) return sq;
    f += df;
    r += dr;
  }

  return null;
}

function collectThreePieceAlignments(ctx) {
  const board = ctx.game.state.board;
  const out = [];
  const seen = new Set();

  // Four undirected line families. Scanning only these prevents
  // duplicate reverse alignments.
  const dirs = [
    [1, 0],
    [0, 1],
    [1, 1],
    [1, -1],
  ];

  for (let front = 0; front < 64; front++) {
    const frontPiece = board[front];
    if (!frontPiece) continue;

    for (const [df, dr] of dirs) {
      const middle = firstOccupiedFrom(ctx, front, df, dr);
      if (middle == null) continue;

      const middlePiece = board[middle];
      if (!middlePiece) continue;

      const back = firstOccupiedFrom(ctx, middle, df, dr);
      if (back == null) continue;

      const backPiece = board[back];
      if (!backPiece) continue;

      // Three-piece alignments only count when the front and back
      // pieces are opposing pieces. The middle piece may be either color.
      if (frontPiece.color === backPiece.color) continue;

      // This is an alignment only if removing the middle piece creates
      // an attack between front and back in at least one direction.
      const frontAttacksBack = attacksAlongRay(frontPiece, df, dr);
      const backAttacksFront = attacksAlongRay(backPiece, -df, -dr);

      if (!frontAttacksBack && !backAttacksFront) continue;

      const id = `alignment|${front}|${middle}|${back}`;
      if (seen.has(id)) continue;
      seen.add(id);

      out.push({
        id,
        front,
        middle,
        back,
        frontPiece,
        middlePiece,
        backPiece,
        frontAttacksBack,
        backAttacksFront,
        attackPairs: [
          ...(frontAttacksBack
            ? [{ from: front, to: back, through: middle }]
            : []),
          ...(backAttacksFront
            ? [{ from: back, to: front, through: middle }]
            : []),
        ],
      });
    }
  }

  return out;
}

function buildXrayAttackMap(alignments) {
  const byTarget = new Map();

  function add(target, entry) {
    if (!byTarget.has(target)) byTarget.set(target, []);
    byTarget.get(target).push(entry);
  }

  for (const al of alignments) {
    if (al.frontAttacksBack) {
      add(al.back, {
        attacker: al.front,
        middle: al.middle,
        target: al.back,
        squares: [al.front, al.middle, al.back],
      });
    }

    if (al.backAttacksFront) {
      add(al.front, {
        attacker: al.back,
        middle: al.middle,
        target: al.front,
        squares: [al.front, al.middle, al.back],
      });
    }
  }

  return byTarget;
}

function tacticalGeometry(ctx) {
  const alignments = collectThreePieceAlignments(ctx);

  return {
    alignments,
    xrayAttacks: buildXrayAttackMap(alignments),
  };
}

function stableSideFromColor(color) {
  if (color === 'w') return 'white';
  if (color === 'b') return 'black';
  return color || 'neutral';
}

function otherColor(ctx, color) {
  if (ctx?.other) return ctx.other(color);
  if (color === 'w') return 'b';
  if (color === 'b') return 'w';
  return null;
}

function uniqueSquares(squares) {
  return [
    ...new Set(
      (squares || []).filter(sq => Number.isInteger(sq) && sq >= 0 && sq < 64)
    ),
  ];
}

function normalizeMove(raw, from) {
  if (Number.isInteger(raw)) return { from, to: raw };
  if (!raw || typeof raw !== 'object') return null;

  const move = { ...raw };
  if (!Number.isInteger(move.from)) move.from = from;
  if (!Number.isInteger(move.to)) return null;
  return move;
}

function allLegalMoves(ctx, color) {
  const board = ctx?.game?.state?.board;
  const legalFrom = ctx?.game?._legalMovesFrom;
  if (!board || typeof legalFrom !== 'function' || !color) return [];

  const out = [];

  for (let sq = 0; sq < 64; sq++) {
    const p = board[sq];
    if (!p || p.color !== color) continue;

    const rawMoves = legalFrom.call(ctx.game, sq, color) || [];
    for (const raw of rawMoves) {
      const move = normalizeMove(raw, sq);
      if (move) out.push(move);
    }
  }

  return out;
}

function movePieceAfterPromotion(piece, move) {
  const promotion = move?.promotion || move?.promoteTo || move?.promo;
  if (!piece || !promotion) return piece;

  const type =
    typeof promotion === 'string'
      ? promotion.toLowerCase()
      : promotion?.type || piece.type;

  return { ...piece, type };
}

function enPassantCapturedSquare(ctx, move, piece) {
  if (!move?.enPassant && !move?.ep) return null;
  if (!piece || piece.type !== 'p' || !ctx?.FR || !ctx?.idx) return null;

  const [toFile] = ctx.FR(move.to);
  const [, fromRank] = ctx.FR(move.from);
  return ctx.idx(toFile, fromRank);
}

function castleRookPatch(ctx, move, piece) {
  if (!piece || piece.type !== 'k' || !ctx?.FR || !ctx?.idx) return null;

  const [fromFile, fromRank] = ctx.FR(move.from);
  const [toFile, toRank] = ctx.FR(move.to);
  if (fromRank !== toRank || Math.abs(toFile - fromFile) !== 2) return null;

  if (toFile > fromFile) {
    return {
      rookFrom: ctx.idx(7, fromRank),
      rookTo: ctx.idx(5, fromRank),
    };
  }

  return {
    rookFrom: ctx.idx(0, fromRank),
    rookTo: ctx.idx(3, fromRank),
  };
}

function withTemporaryMove(ctx, move, fn) {
  const board = ctx?.game?.state?.board;
  if (!board || !Number.isInteger(move?.from) || !Number.isInteger(move?.to)) return null;

  const from = move.from;
  const to = move.to;
  const fromPiece = board[from];
  if (!fromPiece) return null;

  const toPiece = board[to];
  const epCapturedSq = enPassantCapturedSquare(ctx, move, fromPiece);
  const epCapturedPiece =
    epCapturedSq != null && epCapturedSq !== to ? board[epCapturedSq] : null;

  const rookPatch = castleRookPatch(ctx, move, fromPiece);
  const rookFromPiece = rookPatch ? board[rookPatch.rookFrom] : null;
  const rookToPiece = rookPatch ? board[rookPatch.rookTo] : null;

  try {
    board[from] = null;
    if (epCapturedSq != null && epCapturedSq !== to) board[epCapturedSq] = null;
    board[to] = movePieceAfterPromotion(fromPiece, move);

    if (rookPatch && rookFromPiece) {
      board[rookPatch.rookFrom] = null;
      board[rookPatch.rookTo] = rookFromPiece;
    }

    return fn();
  } catch (_err) {
    // Feature extraction should never break the whole board if a host
    // game implementation lacks one of the expected helpers.
    return null;
  } finally {
    if (rookPatch) {
      board[rookPatch.rookFrom] = rookFromPiece;
      board[rookPatch.rookTo] = rookToPiece;
    }

    board[from] = fromPiece;
    board[to] = toPiece;
    if (epCapturedSq != null && epCapturedSq !== to) {
      board[epCapturedSq] = epCapturedPiece;
    }
  }
}

function kingSquare(ctx, color) {
  const board = ctx?.game?.state?.board;
  if (!board || !color) return null;

  for (let sq = 0; sq < 64; sq++) {
    const p = board[sq];
    if (p && p.color === color && p.type === 'k') return sq;
  }

  return null;
}

function attackersOfSquare(ctx, sq, color) {
  if (!Number.isInteger(sq) || !color || typeof ctx?.attackersOf !== 'function') return [];
  return ctx.attackersOf(sq, color) || [];
}

function isInCheck(ctx, defenderColor) {
  const ksq = kingSquare(ctx, defenderColor);
  if (ksq == null) return false;

  const attackerColor = otherColor(ctx, defenderColor);
  return attackersOfSquare(ctx, ksq, attackerColor).length > 0;
}

function isCheckmatePosition(ctx, defenderColor) {
  return isInCheck(ctx, defenderColor) && allLegalMoves(ctx, defenderColor).length === 0;
}

function checkingPiecesAgainst(ctx, defenderColor) {
  const board = ctx?.game?.state?.board;
  const ksq = kingSquare(ctx, defenderColor);
  const attackerColor = otherColor(ctx, defenderColor);
  if (!board || ksq == null || !attackerColor) return [];

  return attackersOfSquare(ctx, ksq, attackerColor)
    .map(ref => {
      const square = refSquare(ref);
      const piece = refPiece(ctx, ref);
      if (!Number.isInteger(square) || !piece) return null;
      return { square, piece };
    })
    .filter(entry => entry && entry.piece.color === attackerColor);
}

function lineStep(ctx, from, to) {
  if (!ctx?.FR || !Number.isInteger(from) || !Number.isInteger(to) || from === to) {
    return null;
  }

  const [ff, fr] = ctx.FR(from);
  const [tf, tr] = ctx.FR(to);
  const df = tf - ff;
  const dr = tr - fr;

  const sameFile = df === 0;
  const sameRank = dr === 0;
  const diagonal = Math.abs(df) === Math.abs(dr);

  if (!sameFile && !sameRank && !diagonal) return null;

  return {
    df: Math.sign(df),
    dr: Math.sign(dr),
    fromFile: ff,
    fromRank: fr,
    toFile: tf,
    toRank: tr,
  };
}

function squaresBetween(ctx, from, to) {
  const step = lineStep(ctx, from, to);
  if (!step || !ctx?.idx) return [];

  const out = [];
  let f = step.fromFile + step.df;
  let r = step.fromRank + step.dr;

  while (f !== step.toFile || r !== step.toRank) {
    out.push(ctx.idx(f, r));
    f += step.df;
    r += step.dr;
  }

  return out;
}

function pieceCanSlideBetween(ctx, piece, from, to) {
  const step = lineStep(ctx, from, to);
  if (!step || !piece) return false;
  return attacksAlongRay(piece, step.df, step.dr);
}

function moveTag(ctx, move) {
  const board = ctx?.game?.state?.board;
  const piece = board?.[move?.from];
  const target = board?.[move?.to];
  const from = Number.isInteger(move?.from) ? ctx.sqName(move.from) : '?';
  const to = Number.isInteger(move?.to) ? ctx.sqName(move.to) : '?';
  const sep = target ? 'x' : '-';

  if (!piece) return `${from}${sep}${to}`;

  const promotion = move?.promotion || move?.promoteTo || move?.promo;
  const suffix = promotion
    ? `=${typeof promotion === 'string' ? promotion.toUpperCase() : promotion?.type || ''}`
    : '';

  return `${pieceTag(ctx, piece, move.from)}${sep}${to}${suffix}`;
}

function replyBlocksCurrentCheck(ctx, defenderColor, reply) {
  const ksq = kingSquare(ctx, defenderColor);
  if (ksq == null || !Number.isInteger(reply?.to)) return null;

  const checkers = checkingPiecesAgainst(ctx, defenderColor);
  for (const checker of checkers) {
    if (!pieceCanSlideBetween(ctx, checker.piece, checker.square, ksq)) continue;

    const between = squaresBetween(ctx, checker.square, ksq);
    if (!between.includes(reply.to)) continue;

    return {
      mode: 'blocks_check_line',
      checker: checker.square,
      king: ksq,
      square: reply.to,
      line: [checker.square, ...between, ksq],
    };
  }

  return null;
}

function replyBlocksMateThreat(ctx, defenderColor, mateMoves, reply) {
  const board = ctx?.game?.state?.board;
  const ksq = kingSquare(ctx, defenderColor);
  if (!board || ksq == null || !Number.isInteger(reply?.to)) return null;

  for (const mateMove of mateMoves || []) {
    const matingPiece = board[mateMove.from];
    if (!matingPiece) continue;

    if (reply.to === mateMove.to) {
      return {
        mode: 'occupies_mate_square',
        square: reply.to,
        mateMove: { from: mateMove.from, to: mateMove.to },
      };
    }

    if (
      pieceCanSlideBetween(ctx, matingPiece, mateMove.from, mateMove.to) &&
      squaresBetween(ctx, mateMove.from, mateMove.to).includes(reply.to)
    ) {
      return {
        mode: 'blocks_path_to_mate_square',
        square: reply.to,
        mateMove: { from: mateMove.from, to: mateMove.to },
      };
    }

    const finalMatingPiece = movePieceAfterPromotion(matingPiece, mateMove);
    if (
      pieceCanSlideBetween(ctx, finalMatingPiece, mateMove.to, ksq) &&
      squaresBetween(ctx, mateMove.to, ksq).includes(reply.to)
    ) {
      return {
        mode: 'blocks_mating_line',
        square: reply.to,
        mateMove: { from: mateMove.from, to: mateMove.to },
      };
    }
  }

  return null;
}

function classifyObstructionReply(ctx, attackingColor, defenderColor, reply, options = {}) {
  const board = ctx?.game?.state?.board;
  if (!board || !Number.isInteger(reply?.from) || !Number.isInteger(reply?.to)) return null;

  const replyPiece = board[reply.from];
  if (!replyPiece || replyPiece.color !== defenderColor || replyPiece.type === 'k') {
    return null;
  }

  const captured = board[reply.to];
  if (captured && captured.color === attackingColor) {
    return {
      type: 'capture_back',
      square: reply.to,
      captured: { square: reply.to, piece: captured },
    };
  }

  const checkBlock = replyBlocksCurrentCheck(ctx, defenderColor, reply);
  if (checkBlock) {
    return {
      type: 'block_access',
      square: reply.to,
      block: checkBlock,
    };
  }

  const mateBlock = replyBlocksMateThreat(ctx, defenderColor, options.mateMoves || [], reply);
  if (mateBlock) {
    return {
      type: 'block_access',
      square: reply.to,
      block: mateBlock,
    };
  }

  return null;
}

function mateInOneMoves(ctx, attackingColor, limit = Infinity) {
  const defenderColor = otherColor(ctx, attackingColor);
  if (!attackingColor || !defenderColor) return [];

  const out = [];
  for (const move of allLegalMoves(ctx, attackingColor)) {
    const mates = withTemporaryMove(ctx, move, () => isCheckmatePosition(ctx, defenderColor));
    if (!mates) continue;

    out.push(move);
    if (out.length >= limit) break;
  }

  return out;
}

function obstructedMateInOneCandidate(ctx, attackingColor, move) {
  const defenderColor = otherColor(ctx, attackingColor);
  if (!defenderColor) return null;

  return withTemporaryMove(ctx, move, () => {
    if (!isInCheck(ctx, defenderColor)) return null;

    const replies = allLegalMoves(ctx, defenderColor);
    if (replies.length !== 1) return null;

    const reply = replies[0];
    const obstruction = classifyObstructionReply(ctx, attackingColor, defenderColor, reply);
    if (!obstruction) return null;

    const replyPiece = ctx.game.state.board[reply.from];
    const checkers = checkingPiecesAgainst(ctx, defenderColor);

    return {
      defenderColor,
      king: kingSquare(ctx, defenderColor),
      reply,
      replyPiece,
      replyLabel: moveTag(ctx, reply),
      obstruction,
      checkingSquares: checkers.map(checker => checker.square),
    };
  });
}

function obstructedMateInTwoCandidate(ctx, attackingColor, firstMove) {
  const defenderColor = otherColor(ctx, attackingColor);
  if (!defenderColor) return null;

  return withTemporaryMove(ctx, firstMove, () => {
    if (isCheckmatePosition(ctx, defenderColor)) return null;

    const replies = allLegalMoves(ctx, defenderColor);
    if (!replies.length) return null;

    const threatMates = mateInOneMoves(ctx, attackingColor);
    if (!threatMates.length) return null;

    const escapingReplies = [];
    let matingReplyCount = 0;

    for (const reply of replies) {
      const stillAllowsMateInOne = withTemporaryMove(ctx, reply, () => {
        return mateInOneMoves(ctx, attackingColor, 1).length > 0;
      });

      if (stillAllowsMateInOne) {
        matingReplyCount++;
      } else {
        escapingReplies.push(reply);
        if (escapingReplies.length > 1) return null;
      }
    }

    if (escapingReplies.length !== 1 || matingReplyCount < 1) return null;

    const reply = escapingReplies[0];
    const obstruction = classifyObstructionReply(ctx, attackingColor, defenderColor, reply, {
      mateMoves: threatMates,
    });
    if (!obstruction) return null;

    const replyPiece = ctx.game.state.board[reply.from];

    return {
      defenderColor,
      king: kingSquare(ctx, defenderColor),
      reply,
      replyPiece,
      replyLabel: moveTag(ctx, reply),
      obstruction,
      threatMates,
      threatMateLabels: threatMates.slice(0, 6).map(mateMove => moveTag(ctx, mateMove)),
      repliesChecked: replies.length,
      matingReplyCount,
    };
  });
}

function mateRelated(ctx, observation, move, after) {
  const refs = observation?.data?.refs || [];

  return (
    refs.includes(move.from) ||
    refs.includes(move.to) ||
    refs.some(sq => moveAttacksSquareByMover(ctx, after, move, sq))
  );
}

export function interestSquares(observations, ctx) {
  if (!Array.isArray(observations) || !ctx?.game?.state?.board) return new Set();

  const involved = new Set();

  // Core tactical pieces we want to keep in focus on the board.
  for (const ob of observations) {
    if (ob.type === 'hang' || ob.type === 'loose' || ob.type === 'mobility') {
      if (hasPiece(ctx.game.state.board, ob.data?.square)) {
        involved.add(ob.data.square);
      }
      continue;
    }

    if (ob.type === 'obstructed_mate_in_1' || ob.type === 'obstructed_mate_in_2') {
      for (const sq of ob.data?.refs || []) {
        if (hasPiece(ctx.game.state.board, sq)) involved.add(sq);
      }
      continue;
    }

    if (ob.type === 'alignment') {
      for (const sq of ob.data?.squares || []) {
        if (hasPiece(ctx.game.state.board, sq)) involved.add(sq);
      }
    }
  }

  return involved;
}

export function filtration(observations, ctx) {
  const involvedSquares = interestSquares(observations, ctx);
  if (!involvedSquares.size) return [];

  return observations.filter(ob => {
    const refs = observationRefs(ob);
    if (!refs.length) return false;
    return refs.some(sq => involvedSquares.has(sq));
  });
}

export const TACTICAL_FEATURES = [
  {
    name: "Loose",
    kind: "loose",
    order: 10,
    color: "loose",

    observe(ctx) {
      const out = [];
      const geometry = tacticalGeometry(ctx);

      for (let sq = 0; sq < 64; sq++) {
        const p = ctx.game.state.board[sq];
        if (!p || p.type === 'k') continue;

        const attackers = ctx.attackersOf(sq, ctx.other(p.color)) || [];
        const defenders = ctx.attackersOf(sq, p.color) || [];

        const attackerCount = attackers.length;
        const defenderCount = defenders.length;
        const pawnDefended = hasPawnDefender(ctx, defenders, p.color);
        const xrayAttacks = geometry.xrayAttacks.get(sq) || [];
        const zeroZero = attackerCount === 0 && defenderCount === 0;

        // Loose:
        // - attackers >= defenders
        // - BUT a pawn-defended piece is never loose
        // - AND 0/0 pieces are only loose if they are front/back targets
        //   in a qualifying three-piece alignment and would be attacked
        //   if the middle piece moved.
        if (pawnDefended) continue;
        if (attackerCount < defenderCount) continue;
        if (zeroZero && !xrayAttacks.length) continue;

        out.push({
          id: `loose|${p.color}|${sq}`,
          type: 'loose',
          label: `loose(${pieceTag(ctx, p, sq)})`,
          side: stableSide(p),
          implicatedValue: ctx.pieceValue(p),
          data: {
            refs: [sq],
            owner: p.color,
            square: sq,
            attackers: attackerCount,
            defenders: defenderCount,
            pawnDefended,
            xrayAttacks,
          },
        });
      }

      return out;
    },

    related(ctx, observation, move, after) {
      const sq = observation.data.square;
      return move.to === sq || moveAttacksSquareByMover(ctx, after, move, sq);
    },
  },

  {
    name: "Hang",
    kind: "hang",
    order: 20,
    color: "bad",

    observe(ctx) {
      const out = [];

      for (let sq = 0; sq < 64; sq++) {
        const p = ctx.game.state.board[sq];
        if (!p || p.type === 'k') continue;

        const attackers = ctx.attackersOf(sq, ctx.other(p.color)) || [];
        const defenders = ctx.attackersOf(sq, p.color) || [];

        // Hanging is stricter than loose:
        // more attackers than defenders.
        if (!(attackers.length > defenders.length)) continue;

        out.push({
          id: `hang|${p.color}|${sq}`,
          type: 'hang',
          label: `hang(${pieceTag(ctx, p, sq)})`,
          side: stableSide(p),
          implicatedValue: ctx.pieceValue(p),
          data: {
            refs: [sq],
            owner: p.color,
            square: sq,
            attackers: attackers.length,
            defenders: defenders.length,
            pawnDefended: hasPawnDefender(ctx, defenders, p.color),
          },
        });
      }

      return out;
    },

    related(ctx, observation, move, after) {
      const sq = observation.data.square;
      return move.to === sq || moveAttacksSquareByMover(ctx, after, move, sq);
    },
  },

  {
    name: "Alignment",
    kind: "alignment",
    order: 30,
    color: "alignment",

    observe(ctx) {
      return tacticalGeometry(ctx).alignments.map(al => ({
        id: al.id,
        type: 'alignment',
        label: `alignment(${pieceTag(ctx, al.frontPiece, al.front)}, ${pieceTag(ctx, al.middlePiece, al.middle)}, ${pieceTag(ctx, al.backPiece, al.back)})`,
        side: 'neutral',
        implicatedValue:
          ctx.pieceValue(al.frontPiece) +
          ctx.pieceValue(al.middlePiece) +
          ctx.pieceValue(al.backPiece),
        data: {
          refs: [al.front, al.middle, al.back],
          squares: [al.front, al.middle, al.back],
          front: al.front,
          middle: al.middle,
          back: al.back,
          frontAttacksBack: al.frontAttacksBack,
          backAttacksFront: al.backAttacksFront,
          attackPairs: al.attackPairs,
          forcePrimary: true,
        },
      }));
    },

    related(ctx, observation, move, after) {
      const refs = observation.data.refs || [];

      return (
        refs.includes(move.from) ||
        refs.includes(move.to) ||
        refs.some(sq => moveAttacksSquareByMover(ctx, after, move, sq))
      );
    },
  },

  {
    name: "Mobility",
    kind: "mobility",
    order: 40,
    color: "mobility",

    observe(ctx) {
      const out = [];

      for (let sq = 0; sq < 64; sq++) {
        const p = ctx.game.state.board[sq];
        if (!p || p.type === 'k' || p.type === 'p') continue;

        const moves = ctx.game._legalMovesFrom(sq, p.color) || [];
        if (moves.length > ctx.mobilityThreshold) continue;

        out.push({
          id: `mobility|${p.color}|${sq}|${moves.length}`,
          type: 'mobility',
          label: `mobility(${pieceTag(ctx, p, sq)})`,
          side: stableSide(p),
          implicatedValue: ctx.pieceValue(p),
          data: {
            refs: [sq],
            owner: p.color,
            square: sq,
            moveCount: moves.length,
          },
        });
      }

      return out;
    },

    related(ctx, observation, move, after) {
      const refs = observation.data.refs || [];

      return (
        refs.includes(move.from) ||
        refs.includes(move.to) ||
        refs.some(sq => moveAttacksSquareByMover(ctx, after, move, sq))
      );
    },
  },

  {
    name: "Obstructed Mate in 1",
    kind: "obstructed_mate_in_1",
    order: 50,
    color: "mate",

    observe(ctx) {
      const out = [];
      const seen = new Set();

      for (const attackingColor of ['w', 'b']) {
        for (const move of allLegalMoves(ctx, attackingColor)) {
          const forcingLabel = moveTag(ctx, move);
          const result = obstructedMateInOneCandidate(ctx, attackingColor, move);
          if (!result) continue;

          const id = `obstructed_mate_in_1|${attackingColor}|${move.from}|${move.to}|${result.reply.from}|${result.reply.to}`;
          if (seen.has(id)) continue;
          seen.add(id);

          const refs = uniqueSquares([
            move.from,
            move.to,
            result.reply.from,
            result.reply.to,
            result.king,
            ...(result.checkingSquares || []),
          ]);

          out.push({
            id,
            type: 'obstructed_mate_in_1',
            label: `obstructed_mate_in_1(${stableSideFromColor(attackingColor)}, ${forcingLabel}; only ${result.replyLabel})`,
            side: stableSideFromColor(attackingColor),
            implicatedValue: 1000 + (ctx.pieceValue(result.replyPiece) || 0),
            data: {
              refs,
              attacker: attackingColor,
              defender: result.defenderColor,
              move: { from: move.from, to: move.to },
              moveLabel: forcingLabel,
              singleReply: { from: result.reply.from, to: result.reply.to },
              singleReplyLabel: result.replyLabel,
              replyPiece: result.replyPiece,
              obstruction: result.obstruction,
              king: result.king,
              checkingSquares: result.checkingSquares || [],
              semantics:
                'The attacking move gives check and would be mate except for exactly one legal enemy reply by a non-king piece that captures an attacking piece or blocks the checking/access line.',
              forcePrimary: true,
            },
          });
        }
      }

      return out;
    },

    related(ctx, observation, move, after) {
      return mateRelated(ctx, observation, move, after);
    },
  },

  {
    name: "Obstructed Mate in 2",
    kind: "obstructed_mate_in_2",
    order: 60,
    color: "mate",

    observe(ctx) {
      const out = [];
      const seen = new Set();

      for (const attackingColor of ['w', 'b']) {
        for (const move of allLegalMoves(ctx, attackingColor)) {
          const firstMoveLabel = moveTag(ctx, move);
          const result = obstructedMateInTwoCandidate(ctx, attackingColor, move);
          if (!result) continue;

          const id = `obstructed_mate_in_2|${attackingColor}|${move.from}|${move.to}|${result.reply.from}|${result.reply.to}`;
          if (seen.has(id)) continue;
          seen.add(id);

          const threatRefs = (result.threatMates || [])
            .slice(0, 4)
            .flatMap(threat => [threat.from, threat.to]);
          const refs = uniqueSquares([
            move.from,
            move.to,
            result.reply.from,
            result.reply.to,
            result.king,
            ...threatRefs,
          ]);

          out.push({
            id,
            type: 'obstructed_mate_in_2',
            label: `obstructed_mate_in_2(${stableSideFromColor(attackingColor)}, ${firstMoveLabel}; only ${result.replyLabel})`,
            side: stableSideFromColor(attackingColor),
            implicatedValue: 900 + (ctx.pieceValue(result.replyPiece) || 0),
            data: {
              refs,
              attacker: attackingColor,
              defender: result.defenderColor,
              move: { from: move.from, to: move.to },
              moveLabel: firstMoveLabel,
              singleReply: { from: result.reply.from, to: result.reply.to },
              singleReplyLabel: result.replyLabel,
              replyPiece: result.replyPiece,
              obstruction: result.obstruction,
              king: result.king,
              threatMates: (result.threatMates || []).map(threat => ({
                from: threat.from,
                to: threat.to,
              })),
              threatMateLabels: result.threatMateLabels || [],
              repliesChecked: result.repliesChecked,
              matingReplyCount: result.matingReplyCount,
              semantics:
                'The attacking move creates mate-in-1 threats after every enemy reply except exactly one legal enemy reply by a non-king piece that captures an attacking piece or blocks access to a mating square/line.',
              forcePrimary: true,
            },
          });
        }
      }

      return out;
    },

    related(ctx, observation, move, after) {
      return mateRelated(ctx, observation, move, after);
    },
  },
];
