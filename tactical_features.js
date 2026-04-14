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
  const board = ctx.game.state.board;
  const involved = new Set();

  // 1) Initial pieces of interest: attacked / capturable pieces (both colors).
  for (const ob of observations) {
    if (ob.type !== 'attack') continue;
    const attackerSq = ob.data?.attacker;
    const targetSq = ob.data?.square;
    if (!hasPiece(board, attackerSq) || !hasPiece(board, targetSq)) continue;
    const attacker = board[attackerSq];
    const target = board[targetSq];
    if (!attacker || !target || attacker.color === target.color) continue;
    involved.add(targetSq);
  }

  // 2) Add defenders of those attacked/capturable pieces, then stop.
  for (const ob of observations) {
    if (ob.type !== 'defend') continue;
    const defendedSq = ob.data?.square;
    const defenderSq = ob.data?.defender;
    if (!involved.has(defendedSq) || !hasPiece(board, defenderSq)) continue;
    involved.add(defenderSq);
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
    name: "Attack",
    kind: "attack",
    order: 10,
    color: "attack",

    observe(ctx) {
      const out = [];
      const seen = new Set();
      for (let from = 0; from < 64; from++) {
        const p = ctx.game.state.board[from];
        if (!p) continue;
        const attacks = ctx.pieceAttackSquares(ctx.game, from, p);
        for (const to of attacks) {
          const target = ctx.game.state.board[to];
          if (!target || target.color === p.color) continue;
          const isCheck = target.type === 'k';
          const id = `attack|static|${from}|${to}|${isCheck ? 'check' : 'plain'}`;
          if (seen.has(id)) continue;
          seen.add(id);
          out.push({
            id,
            label: `attack(${pieceTag(ctx, p, from)}, ${ctx.sqName(to)}${isCheck ? '+' : ''})`,
            side: p.color === ctx.side ? "ours" : "theirs",
            implicatedValue: ctx.pieceValue(target) + (isCheck ? 1000 : 0),
            data: { refs: [from, to], owner: p.color, attacker: from, square: to, isCheck, forcePrimary: isCheck }
          });
        }
      }
      for (const move of ctx.legalMoves) {
        const after = ctx.afterFor(move);
        if (!after || !after._isInCheck(ctx.enemy)) continue;
        const moved = ctx.game.state.board[move.from];
        if (!moved) continue;
        const id = `attack|movecheck|${move.uci}`;
        if (seen.has(id)) continue;
        seen.add(id);
        out.push({
          id,
          label: `attack(${pieceTag(ctx, moved, move.from)}, ${ctx.sqName(move.to)}+)`,
          side: "ours",
          implicatedValue: 2000,
          data: { refs: [move.from, move.to], owner: ctx.side, attacker: move.from, square: move.to, isCheck: true, moveUci: move.uci, forcePrimary: true }
        });
      }
      return out;
    },

    related(ctx, observation, move, after) {
      if (observation.data.moveUci) return move.uci === observation.data.moveUci;
      const refs = observation.data.refs || [];
      return refs.includes(move.from) || refs.includes(move.to) || refs.some(sq => ctx.moveAttacksSquare(after, move, sq, ctx.side));
    }
  },

  {
    name: "Defend",
    kind: "defend",
    order: 20,
    color: "overworked",

    observe(ctx) {
      const out = [];
      const seen = new Set();
      for (let from = 0; from < 64; from++) {
        const p = ctx.game.state.board[from];
        if (!p) continue;
        const attacks = ctx.pieceAttackSquares(ctx.game, from, p);
        for (const to of attacks) {
          const target = ctx.game.state.board[to];
          if (!target || target.color !== p.color) continue;
          const id = `defend|${from}|${to}`;
          if (seen.has(id)) continue;
          seen.add(id);
          out.push({
            id,
            label: `defend(${pieceTag(ctx, p, from)}, ${ctx.sqName(to)})`,
            side: p.color === ctx.side ? "ours" : "theirs",
            implicatedValue: ctx.pieceValue(target),
            data: { refs: [from, to], owner: p.color, defender: from, square: to }
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
    name: "Loose",
    kind: "loose",
    order: 30,
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
    order: 40,
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
    order: 50,
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
    order: 60,
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

  {
    name: "Forkable By X",
    kind: "forkable_by_x",
    order: 70,
    color: "combo",

    observe(ctx) {
      const out = [];
      const seen = new Set();
      for (const move of ctx.legalMoves) {
        const after = ctx.afterFor(move);
        if (!after) continue;
        const moved = after.state.board[move.to];
        if (!moved || moved.color !== ctx.side) continue;
        const attacked = ctx.pieceAttackSquares(after, move.to, moved).filter(sq => {
          const target = after.state.board[sq];
          return target && target.color === ctx.enemy;
        });
        for (let i = 0; i < attacked.length; i++) {
          for (let j = i + 1; j < attacked.length; j++) {
            const a = attacked[i], b = attacked[j];
            const pieceName = ({ p:'pawn', n:'knight', b:'bishop', r:'rook', q:'queen', k:'king' })[moved.type] || moved.type;
            const id = `forkable_by_${pieceName}|${move.uci}|${Math.min(a,b)}|${Math.max(a,b)}`;
            if (seen.has(id)) continue;
            seen.add(id);
            out.push({
              id,
              label: `forkable_by_${pieceName}(${ctx.sqName(a)}, ${ctx.sqName(b)})`,
              side: 'ours',
              implicatedValue: 100,
              data: { refs: [move.to, a, b], moveUci: move.uci, landing: move.to, squares: [a, b] }

            });
          }
        }
      }
      return out;
    },

    related(ctx, observation, move, after) {
      return move.uci === observation.data.moveUci;
    }
  }
];
