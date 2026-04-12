// tactical_features.js

function pieceTag(ctx, piece, sq) {
  return `${ctx.pieceLetter(piece)}${ctx.sqName(sq)}`;
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
          const id = `attack|${from}|${to}`;
          if (seen.has(id)) continue;
          seen.add(id);
          out.push({
            id,
            label: `attack(${pieceTag(ctx, p, from)}, ${ctx.sqName(to)})`,
            side: p.color === ctx.side ? "ours" : "theirs",
            implicatedValue: ctx.pieceValue(target),
            data: { refs: [from, to], owner: p.color, attacker: from, square: to }
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
        if (!attackers.length) continue;
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
        if (!attackers.length) continue;
        if (!(attackers.length > defenders.length || defenders.length === 0)) continue;
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

      for (let a = 0; a < 64; a++) {
        const pa = ctx.game.state.board[a];
        if (!pa) continue;
        for (const [df, dr] of dirs) {
          const b = firstOccupiedFrom(a, df, dr);
          if (b == null) continue;
          const c = firstOccupiedFrom(b, df, dr);
          if (c == null) continue;
          const pb = ctx.game.state.board[b];
          const pc = ctx.game.state.board[c];
          const id = `alignment|${a}|${b}|${c}`;
          if (seen.has(id)) continue;
          seen.add(id);
          out.push({
            id,
            label: `alignment(${pieceTag(ctx, pa, a)}, ${pieceTag(ctx, pb, b)}, ${pieceTag(ctx, pc, c)})`,
            side: 'theirs',
            implicatedValue: ctx.pieceValue(pa) + ctx.pieceValue(pb) + ctx.pieceValue(pc),
            data: { refs: [a, b, c], squares: [a, b, c] }
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
        if (!p || p.type === 'k') continue;
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
    name: "Forkable By Piece",
    kind: "forkable_by_piece",
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
            const id = `forkable_by_piece|${move.uci}|${Math.min(a,b)}|${Math.max(a,b)}`;
            if (seen.has(id)) continue;
            seen.add(id);
            out.push({
              id,
              label: `forkable_by_piece(${ctx.sqName(a)}, ${ctx.sqName(b)})`,
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
