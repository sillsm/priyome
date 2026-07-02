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
  // Observations should describe the board, not the side to move.
  // Use absolute color labels instead of ours/theirs, because ours/theirs
  // changes when ctx.side changes.
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

  // Four undirected line families. Scanning only these prevents duplicate
  // reverse alignments.
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
        squares: [al.front, al.middle, al.back],
      });
    }

    if (al.backAttacksFront) {
      add(al.front, {
        attacker: al.back,
        middle: al.middle,
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

        // Loose means attackers >= defenders, except:
        //
        // 1. A pawn-defended piece is never loose.
        // 2. A 0-attacker / 0-defender piece is only loose if it is the
        //    front or back target of a qualifying three-piece alignment and
        //    would be attacked if the middle piece moved.
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

        // Hanging is the stricter version: more attackers than defenders.
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
];
