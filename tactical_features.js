// tactical_features.js

function pieceTag(ctx, piece, sq) {
  return `${ctx.pieceLetter(piece)}${ctx.sqName(sq)}`;
}

function pieceName(type) {
  return ({ p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' })[type] || type;
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
          const note = target.type === 'k' ? ' check' : '';
          const id = `attack|${from}|${to}|${note ? 'check' : 'plain'}`;
          if (seen.has(id)) continue;
          seen.add(id);
          out.push({
            id,
            label: `attack(${pieceTag(ctx, p, from)}, ${ctx.sqName(to)}${note})`,
            side: p.color === ctx.side ? "ours" : "theirs",
            implicatedValue: ctx.pieceValue(target),
            data: { refs: [from, to], owner: p.color, attacker: from, square: to, isCheck: target.type === 'k' }
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
          const pb = ctx.game.state.board[b];
          const nonPawns2 = [pa, pb].filter(p => p && p.type !== 'p').length;
          if (pb && nonPawns2 === 2) {
            const id2 = `alignment2|${a}|${b}`;
            if (!seen.has(id2)) {
              seen.add(id2);
              out.push({
                id: id2,
                label: `alignment(${pieceTag(ctx, pa, a)}, ${pieceTag(ctx, pb, b)})`,
                side: 'theirs',
                implicatedValue: ctx.pieceValue(pa) + ctx.pieceValue(pb),
                data: { refs: [a, b], squares: [a, b] }
              });
            }
          }
          const c = firstOccupiedFrom(b, df, dr);
          if (c == null) continue;
          const pc = ctx.game.state.board[c];
          const nonPawns3 = [pa, pb, pc].filter(p => p && p.type !== 'p').length;
          if (nonPawns3 < 2) continue;
          const id3 = `alignment3|${a}|${b}|${c}`;
          if (seen.has(id3)) continue;
          seen.add(id3);
          out.push({
            id: id3,
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
      const board = ctx.game.state.board;
      const presentTypesByColor = { w: new Set(), b: new Set() };
      for (let sq = 0; sq < 64; sq++) {
        const p = board[sq];
        if (p) presentTypesByColor[p.color].add(p.type);
      }

      const knightSources = (a, b) => {
        const deltas = [[1,2],[2,1],[-1,2],[-2,1],[1,-2],[2,-1],[-1,-2],[-2,-1]];
        const hitsA = new Set();
        const [af, ar] = ctx.FR(a);
        for (const [df, dr] of deltas) {
          const f = af - df, r = ar - dr;
          if (ctx.inB(f, r)) hitsA.add(ctx.idx(f, r));
        }
        const outSq = [];
        const [bf, br] = ctx.FR(b);
        for (const [df, dr] of deltas) {
          const f = bf - df, r = br - dr;
          if (!ctx.inB(f, r)) continue;
          const sq = ctx.idx(f, r);
          if (hitsA.has(sq)) outSq.push(sq);
        }
        return outSq;
      };

      const clearLine = (from, to) => {
        const dir = ctx.lineDirection(from, to);
        if (!dir) return false;
        let [f, r] = ctx.FR(from);
        f += dir[0];
        r += dir[1];
        while (ctx.inB(f, r)) {
          const sq = ctx.idx(f, r);
          if (sq === to) return true;
          if (ctx.game.state.board[sq]) return false;
          f += dir[0];
          r += dir[1];
        }
        return false;
      };

      const bishopishSources = (a, b, allowOrthogonal) => {
        const outSq = [];
        for (let s = 0; s < 64; s++) {
          if (s === a || s === b) continue;
          const da = ctx.lineDirection(s, a);
          const db = ctx.lineDirection(s, b);
          const okA = da && (Math.abs(da[0]) === Math.abs(da[1]) || (allowOrthogonal && (da[0] === 0 || da[1] === 0)));
          const okB = db && (Math.abs(db[0]) === Math.abs(db[1]) || (allowOrthogonal && (db[0] === 0 || db[1] === 0)));
          if (!okA || !okB) continue;
          if (!clearLine(s, a)) continue;
          if (!clearLine(s, b)) continue;
          outSq.push(s);
        }
        return outSq;
      };

      for (const owner of ['w', 'b']) {
        const enemy = ctx.other(owner);
        const enemySquares = [];
        for (let sq = 0; sq < 64; sq++) {
          const p = board[sq];
          if (p && p.color === enemy) enemySquares.push(sq);
        }
        for (let i = 0; i < enemySquares.length; i++) {
          for (let j = i + 1; j < enemySquares.length; j++) {
            const a = enemySquares[i], b = enemySquares[j];
            const enemyA = board[a], enemyB = board[b];
            if (!enemyA || !enemyB) continue;
            const candidates = [];
            if (presentTypesByColor[owner].has('n') && knightSources(a, b).length) candidates.push('n');
            if (presentTypesByColor[owner].has('b') && bishopishSources(a, b, false).length) candidates.push('b');
            if (presentTypesByColor[owner].has('r') && bishopishSources(a, b, true).filter(s => {
              const da = ctx.lineDirection(s, a), db = ctx.lineDirection(s, b);
              return da && db && (da[0] === 0 || da[1] === 0) && (db[0] === 0 || db[1] === 0);
            }).length) candidates.push('r');
            if (presentTypesByColor[owner].has('q') && bishopishSources(a, b, true).length) candidates.push('q');
            if (presentTypesByColor[owner].has('p')) {
              for (let s = 0; s < 64; s++) {
                const [sf, sr] = ctx.FR(s);
                const dir = owner === 'w' ? 1 : -1;
                const hits = [];
                for (const df of [-1, 1]) {
                  const nf = sf + df, nr = sr + dir;
                  if (ctx.inB(nf, nr)) hits.push(ctx.idx(nf, nr));
                }
                if (hits.includes(a) && hits.includes(b)) {
                  candidates.push('p');
                  break;
                }
              }
            }
            for (const type of candidates) {
              const id = `forkable_by_${type}|${owner}|${Math.min(a,b)}|${Math.max(a,b)}`;
              if (seen.has(id)) continue;
              seen.add(id);
              out.push({
                id,
                label: `forkable_by_${pieceName(type)}(${ctx.sqName(a)}, ${ctx.sqName(b)})`,
                side: owner === ctx.side ? 'ours' : 'theirs',
                implicatedValue: ctx.pieceValue(enemyA) + ctx.pieceValue(enemyB),
                data: { refs: [a, b], owner, pieceType: type, squares: [a, b] }
              });
            }
          }
        }
      }
      return out;
    },

    related(ctx, observation, move, after) {
      const refs = observation.data.refs || [];
      return refs.includes(move.to) || refs.some(sq => ctx.moveAttacksSquare(after, move, sq, ctx.side));
    }
  }
];
