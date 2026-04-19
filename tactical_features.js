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

export function interestSquares(observations, ctx) {
  if (!Array.isArray(observations) || !ctx?.game?.state?.board) return new Set();
  const involved = new Set();

  // Core tactical pieces we want to keep in focus on the board.
  for (const ob of observations) {
    if (ob.type === 'hang' || ob.type === 'loose' || ob.type === 'mobility') {
      if (hasPiece(ctx.game.state.board, ob.data?.square)) involved.add(ob.data.square);
      continue;
    }
    if (ob.type === 'alignment') {
      for (const sq of (ob.data?.squares || [])) {
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
      for (let sq = 0; sq < 64; sq++) {
        const p = ctx.game.state.board[sq];
        if (!p || p.type === 'k') continue;
        const attackers = ctx.attackersOf(sq, ctx.other(p.color));
        const defenders = ctx.attackersOf(sq, p.color);
        if (attackers.length !== defenders.length) continue;
        out.push({
          id: `loose|${p.color}|${sq}`,
          label: `loose(${pieceTag(ctx, p, sq)})`,
          side: p.color === ctx.side ? 'ours' : 'theirs',
          implicatedValue: ctx.pieceValue(p),
          data: { refs: [sq], owner: p.color, square: sq }
        });
      }
      return out;
    },

    related(ctx, observation, move, after) {
      const sq = observation.data.square;
      return move.to === sq || ctx.moveAttacksSquare(after, move, sq, ctx.side);
    }
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
        const attackers = ctx.attackersOf(sq, ctx.other(p.color));
        const defenders = ctx.attackersOf(sq, p.color);
        if (!(defenders.length < attackers.length)) continue;
        out.push({
          id: `hang|${p.color}|${sq}`,
          label: `hang(${pieceTag(ctx, p, sq)})`,
          side: p.color === ctx.side ? 'ours' : 'theirs',
          implicatedValue: ctx.pieceValue(p),
          data: { refs: [sq], owner: p.color, square: sq }
        });
      }
      return out;
    },

    related(ctx, observation, move, after) {
      const sq = observation.data.square;
      return move.to === sq || ctx.moveAttacksSquare(after, move, sq, ctx.side);
    }
  },

  {
    name: "Alignment",
    kind: "alignment",
    order: 30,
    color: "alignment",

    observe(ctx) {
      const out = [];
      const seen = new Set();
      const dirs = [[1,0],[0,1],[1,1],[1,-1]];

      function firstOccupiedFrom(start, df, dr) {
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

      function nonPawnCount(pieces) {
        return pieces.filter(p => p && p.type !== 'p').length;
      }

      for (let a = 0; a < 64; a++) {
        const pa = ctx.game.state.board[a];
        if (!pa) continue;
        for (const [df, dr] of dirs) {
          const b = firstOccupiedFrom(a, df, dr);
          if (b == null) continue;
          const pb = ctx.game.state.board[b];
          if (!pb) continue;

          if (nonPawnCount([pa, pb]) >= 2 && pa.color === pb.color) {
            const id2 = `alignment|${a}|${b}`;
            if (!seen.has(id2)) {
              const legalA = ctx.game._legalMovesFrom(a, pa.color) || [];
              const legalB = ctx.game._legalMovesFrom(b, pb.color) || [];
              const leavesWithCheck = (pa.color === ctx.side && legalA.some(to => {
                const mv = { from:a, to, uci: ctx.sqName(a) + ctx.sqName(to) };
                const after = ctx.afterFor(mv);
                return after && after._isInCheck(ctx.enemy);
              })) || (pb.color === ctx.side && legalB.some(to => {
                const mv = { from:b, to, uci: ctx.sqName(b) + ctx.sqName(to) };
                const after = ctx.afterFor(mv);
                return after && after._isInCheck(ctx.enemy);
              }));
              seen.add(id2);
              out.push({
                id: id2,
                label: `alignment(${pieceTag(ctx, pa, a)}, ${pieceTag(ctx, pb, b)})`,
                side: 'theirs',
                implicatedValue: ctx.pieceValue(pa) + ctx.pieceValue(pb) + (leavesWithCheck ? 1000 : 0),
                data: { refs: [a, b], squares: [a, b], leavesWithCheck, forcePrimary: leavesWithCheck }
              });
            }
          }

          const c = firstOccupiedFrom(b, df, dr);
          if (c == null) continue;
          const pc = ctx.game.state.board[c];
          if (!pc) continue;
          if (nonPawnCount([pa, pb, pc]) < 2) continue;
          const id3 = `alignment|${a}|${b}|${c}`;
          if (seen.has(id3)) continue;
          seen.add(id3);
          const leaveSquares = [a, b, c];
          const leavePieces = [pa, pb, pc];
          const leavesWithCheck = leaveSquares.some((sq, i) => {
            const piece = leavePieces[i];
            if (!piece || piece.color !== ctx.side) return false;
            const legal = ctx.game._legalMovesFrom(sq, piece.color) || [];
            return legal.some(to => {
              const mv = { from:sq, to, uci: ctx.sqName(sq) + ctx.sqName(to) };
              const after = ctx.afterFor(mv);
              return after && after._isInCheck(ctx.enemy);
            });
          });
          out.push({
            id: id3,
            label: `alignment(${pieceTag(ctx, pa, a)}, ${pieceTag(ctx, pb, b)}, ${pieceTag(ctx, pc, c)})`,
            side: 'theirs',
            implicatedValue: ctx.pieceValue(pa) + ctx.pieceValue(pb) + ctx.pieceValue(pc) + (leavesWithCheck ? 1000 : 0),
            data: { refs: [a, b, c], squares: [a, b, c], leavesWithCheck, forcePrimary: leavesWithCheck }
          });
        }
      }
      return out;
    },

    related(ctx, observation, move, after) {
      const refs = observation.data.refs || [];
      return refs.includes(move.from) || refs.includes(move.to) || refs.some(sq => ctx.moveAttacksSquare(after, move, sq, ctx.side));
    }
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
          label: `mobility(${pieceTag(ctx, p, sq)})`,
          side: p.color === ctx.side ? 'ours' : 'theirs',
          implicatedValue: ctx.pieceValue(p),
          data: { refs: [sq], owner: p.color, square: sq, moveCount: moves.length }
        });
      }
      return out;
    },

    related(ctx, observation, move, after) {
      const refs = observation.data.refs || [];
      return refs.includes(move.from) || refs.includes(move.to) || refs.some(sq => ctx.moveAttacksSquare(after, move, sq, ctx.side));
    }
  },

];
