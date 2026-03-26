// tactical_features.js

export const TACTICAL_FEATURES = [
  {
    name: "Check",
    kind: "check",
    order: 10,
    color: "check",

    observe(ctx) {
      const out = [];
      for (const move of ctx.legalMoves) {
        const after = ctx.afterFor(move);
        if (!after) continue;
        if (ctx.isCheck(after, ctx.enemy)) {
          out.push({
            id: `check|${move.uci}`,
            label: `Check with ${move.san || move.uci}`,
            side: "ours",
            implicatedValue: 100,
            data: { moveUci: move.uci }
          });
        }
      }
      return out;
    },

    related(ctx, observation, move, after) {
      return move.uci === observation.data.moveUci;
    }
  },

  {
    name: "Loose Piece",
    kind: "loose",
    order: 20,
    color: "loose",

    observe(ctx) {
      const out = [];
      for (let sq = 0; sq < 64; sq++) {
        const p = ctx.game.state.board[sq];
        if (!p || p.color !== ctx.enemy) continue;

        const attackers = ctx.attackersOf(sq, ctx.side);
        const defenders = ctx.attackersOf(sq, ctx.enemy);

        const atkVal = attackers.reduce((n, x) => n + ctx.pieceValue(x.piece), 0);
        const defVal = defenders.reduce((n, x) => n + ctx.pieceValue(x.piece), 0);

        if (atkVal === defVal || defVal === 0) {
          out.push({
            id: `loose|${sq}`,
            label: `Loose ${ctx.pieceLetter(p)} on ${ctx.sqName(sq)}`,
            side: "theirs",
            implicatedValue: ctx.pieceValue(p),
            data: { square: sq }
          });
        }
      }
      return out;
    },

    related(ctx, observation, move, after) {
      return (
        move.to === observation.data.square ||
        ctx.moveAttacksSquare(after, move, observation.data.square, ctx.side)
      );
    }
  },

  {
    name: "Alignment",
    kind: "alignment",
    order: 40,
    color: "alignment",

    observe(ctx) {
      const out = [];

      const fileOf = sq => sq & 7;
      const rankOf = sq => sq >> 3;
      const onBoard = (f, r) => f >= 0 && f < 8 && r >= 0 && r < 8;
      const sqOf = (f, r) => r * 8 + f;

      const allPiecesOf = color => {
        const xs = [];
        for (let sq = 0; sq < 64; sq++) {
          const p = ctx.game.state.board[sq];
          if (p && p.color === color && p.type !== "k") xs.push({ sq, p });
        }
        return xs;
      };

      const legalTos = (sq, color) =>
        (ctx.game._legalMovesFrom(sq, color) || []).map(m =>
          typeof m === "number" ? m : m.to
        );

      const sumValue = (aPiece, bPiece) =>
        ctx.pieceValue(aPiece) + ctx.pieceValue(bPiece);

      const uniq = xs => [...new Set(xs)];

      const fullRaySquares = (startF, startR, df, dr) => {
        const xs = [];
        let f = startF + df, r = startR + dr;
        while (onBoard(f, r)) {
          xs.push(sqOf(f, r));
          f += df;
          r += dr;
        }
        return xs;
      };

      const fullLineThrough = (a, b) => {
        const af = fileOf(a), ar = rankOf(a);
        const bf = fileOf(b), br = rankOf(b);
        const df = Math.sign(bf - af), dr = Math.sign(br - ar);
        return uniq([
          a,
          ...fullRaySquares(af, ar, df, dr),
          ...fullRaySquares(af, ar, -df, -dr)
        ]);
      };

      const diagonalsThrough = sq => {
        const f = fileOf(sq), r = rankOf(sq);
        return uniq([
          sq,
          ...fullRaySquares(f, r, 1, 1),
          ...fullRaySquares(f, r, 1, -1),
          ...fullRaySquares(f, r, -1, 1),
          ...fullRaySquares(f, r, -1, -1)
        ]);
      };

      const bishopAttackersOf = target => uniq(diagonalsThrough(target).filter(sq => sq !== target));
      const rookAttackersOf = target => {
        const f = fileOf(target), r = rankOf(target);
        return uniq([
          ...fullRaySquares(f, r, 1, 0), ...fullRaySquares(f, r, -1, 0),
          ...fullRaySquares(f, r, 0, 1), ...fullRaySquares(f, r, 0, -1)
        ]);
      };
      const queenAttackersOf = target => uniq([...rookAttackersOf(target), ...bishopAttackersOf(target)]);

      const lineSquaresBetweenInclusive = (a, b) => {
        const af = fileOf(a), ar = rankOf(a);
        const bf = fileOf(b), br = rankOf(b);
        const df = Math.sign(bf - af), dr = Math.sign(br - ar);
        const outSq = [a];
        let f = af, r = ar;
        while (f !== bf || r !== br) {
          f += df;
          r += dr;
          outSq.push(sqOf(f, r));
        }
        return outSq;
      };

      const knightAttackersOf = target => {
        const tf = fileOf(target), tr = rankOf(target);
        const deltas = [[1,2],[2,1],[-1,2],[-2,1],[1,-2],[2,-1],[-1,-2],[-2,-1]];
        const xs = [];
        for (const [df, dr] of deltas) {
          const f = tf + df, r = tr + dr;
          if (onBoard(f, r)) xs.push(sqOf(f, r));
        }
        return xs;
      };

      const mutualKnightForkSquares = (a, b) => {
        const as = new Set(knightAttackersOf(a));
        return knightAttackersOf(b).filter(sq => as.has(sq));
      };

      const knightDistanceLE2 = (from, to) => {
        if (from === to) return true;
        const first = new Set(knightAttackersOf(from));
        if (first.has(to)) return true;
        for (const mid of first) {
          if (knightAttackersOf(mid).includes(to)) return true;
        }
        return false;
      };

      const pawnForkSquaresForPair = (owner, a, b) => {
        const opp = owner === "w" ? "b" : "w";
        const dir = opp === "w" ? 1 : -1;
        const af = fileOf(a), ar = rankOf(a);
        const bf = fileOf(b), br = rankOf(b);
        const xs = [];

        const trySquare = sq => {
          const sf = fileOf(sq), sr = rankOf(sq);
          const attacks = [
            onBoard(sf - 1, sr + dir) ? sqOf(sf - 1, sr + dir) : -1,
            onBoard(sf + 1, sr + dir) ? sqOf(sf + 1, sr + dir) : -1
          ];
          if (attacks.includes(a) && attacks.includes(b)) xs.push(sq);
        };

        const candidates = [
          [af - 1, ar - dir], [af + 1, ar - dir],
          [bf - 1, br - dir], [bf + 1, br - dir]
        ];

        for (const [f, r] of candidates) {
          if (onBoard(f, r)) trySquare(sqOf(f, r));
        }
        return [...new Set(xs)];
      };

      for (const owner of [ctx.side, ctx.enemy]) {
        const enemy = owner === ctx.side ? ctx.enemy : ctx.side;

        for (const pair of ctx.findAlignedPairs(owner)) {
          const front = pair.front;
          const rear = pair.rear;
          const ff = fileOf(front), fr = rankOf(front);
          const rf = fileOf(rear), rr = rankOf(rear);
          const diagonal = Math.abs(ff - rf) === Math.abs(fr - rr);
          const orthogonal = ff === rf || fr === rr;

          let subtype = null;
          let exploitSquares = [];

          if (diagonal) {
            subtype = "diagonal";
            exploitSquares = fullLineThrough(front, rear);
            if (!allPiecesOf(enemy).some(({ sq, p }) =>
              ["b", "q"].includes(p.type) &&
              legalTos(sq, enemy).some(to => exploitSquares.includes(to))
            )) continue;
          } else if (orthogonal) {
            subtype = "line";
            exploitSquares = uniq([
              ...fullLineThrough(front, rear),
              ...diagonalsThrough(front),
              ...diagonalsThrough(rear)
            ]);
            if (!allPiecesOf(enemy).some(({ sq, p }) =>
              ["r", "b", "q"].includes(p.type) &&
              legalTos(sq, enemy).some(to => exploitSquares.includes(to))
            )) continue;
          }

          if (!subtype) continue;

          out.push({
            id: `alignment|${subtype}|${owner}|${front}-${rear}`,
            label: `${owner === ctx.side ? "Our" : "Enemy"} ${subtype} alignment ${ctx.pieceLetter(pair.frontPiece)}${ctx.sqName(front)} / ${ctx.pieceLetter(pair.rearPiece)}${ctx.sqName(rear)}`,
            side: owner === ctx.side ? "ours" : "theirs",
            implicatedValue: sumValue(pair.frontPiece, pair.rearPiece),
            data: { owner, subtype, front, rear, exploitSquares }
          });
        }

        const pieces = allPiecesOf(owner);
        for (let i = 0; i < pieces.length; i++) {
          for (let j = i + 1; j < pieces.length; j++) {
            const a = pieces[i].sq;
            const b = pieces[j].sq;

            const knightSquares = mutualKnightForkSquares(a, b);
            if (knightSquares.length) {
              const enemyKnightCanReach = allPiecesOf(enemy).some(({ sq, p }) =>
                p.type === "n" && knightSquares.some(target => knightDistanceLE2(sq, target))
              );
              if (enemyKnightCanReach) {
                out.push({
                  id: `alignment|knight|${owner}|${a}-${b}`,
                  label: `${owner === ctx.side ? "Our" : "Enemy"} knight alignment ${ctx.pieceLetter(pieces[i].p)}${ctx.sqName(a)} / ${ctx.pieceLetter(pieces[j].p)}${ctx.sqName(b)}`,
                  side: owner === ctx.side ? "ours" : "theirs",
                  implicatedValue: sumValue(pieces[i].p, pieces[j].p),
                  data: { owner, subtype: "knight", front: a, rear: b, exploitSquares: knightSquares }
                });
              }
            }

            const bishopSquares = bishopAttackersOf(a).filter(sq =>
              bishopAttackersOf(b).includes(sq)
            );
            if (bishopSquares.length) {
              const enemyBishopishCanReach = allPiecesOf(enemy).some(({ sq, p }) =>
                ["b", "q"].includes(p.type) &&
                legalTos(sq, enemy).some(to => bishopSquares.includes(to))
              );
              if (enemyBishopishCanReach) {
                out.push({
                  id: `alignment|bishopFork|${owner}|${a}-${b}`,
                  label: `${owner === ctx.side ? "Our" : "Enemy"} bishop-forkable ${ctx.pieceLetter(pieces[i].p)}${ctx.sqName(a)} / ${ctx.pieceLetter(pieces[j].p)}${ctx.sqName(b)}`,
                  side: owner === ctx.side ? "ours" : "theirs",
                  implicatedValue: sumValue(pieces[i].p, pieces[j].p),
                  data: { owner, subtype: "bishopFork", front: a, rear: b, exploitSquares: bishopSquares }
                });
              }
            }

            const queenSquares = queenAttackersOf(a).filter(sq =>
              queenAttackersOf(b).includes(sq)
            );
            if (queenSquares.length) {
              const enemyQueenCanReach = allPiecesOf(enemy).some(({ sq, p }) =>
                p.type === "q" && legalTos(sq, enemy).some(to => queenSquares.includes(to))
              );
              if (enemyQueenCanReach) {
                out.push({
                  id: `alignment|queenFork|${owner}|${a}-${b}`,
                  label: `${owner === ctx.side ? "Our" : "Enemy"} queen-forkable ${ctx.pieceLetter(pieces[i].p)}${ctx.sqName(a)} / ${ctx.pieceLetter(pieces[j].p)}${ctx.sqName(b)}`,
                  side: owner === ctx.side ? "ours" : "theirs",
                  implicatedValue: sumValue(pieces[i].p, pieces[j].p),
                  data: { owner, subtype: "queenFork", front: a, rear: b, exploitSquares: queenSquares }
                });
              }
            }

            const pawnSquares = pawnForkSquaresForPair(owner, a, b);
            if (pawnSquares.length) {
              out.push({
                id: `alignment|pawn|${owner}|${a}-${b}`,
                label: `${owner === ctx.side ? "Our" : "Enemy"} pawn alignment ${ctx.pieceLetter(pieces[i].p)}${ctx.sqName(a)} / ${ctx.pieceLetter(pieces[j].p)}${ctx.sqName(b)}`,
                side: owner === ctx.side ? "ours" : "theirs",
                implicatedValue: sumValue(pieces[i].p, pieces[j].p),
                data: {
                  owner,
                  subtype: "pawn",
                  front: a,
                  rear: b,
                  exploitSquares: pawnSquares,
                  exploitFiles: [...new Set(pawnSquares.map(fileOf))]
                }
              });
            }
          }
        }
      }

      return out;
    },

    related(ctx, observation, move, after) {
      const movedPiece = after.state.board[move.to];
      const subtype = observation.data.subtype;
      const exploitSquares = observation.data.exploitSquares || [];

      if (subtype === "diagonal" || subtype === "line" || subtype === "knight" || subtype === "bishopFork" || subtype === "queenFork") {
        return exploitSquares.includes(move.to);
      }

      if (subtype === "pawn") {
        const fileOf = sq => sq & 7;
        const exploitFiles = observation.data.exploitFiles || [];
        return (
          movedPiece &&
          movedPiece.color === ctx.side &&
          movedPiece.type === "p" &&
          (exploitSquares.includes(move.to) || exploitFiles.includes(fileOf(move.to)))
        );
      }

      return false;
    }
  },

  {
    name: "Mobility",
    kind: "mobility",
    order: 50,
    color: "mobility",

    observe(ctx) {
      return [];
    },

    related(ctx, observation, move, after) {
      return false;
    }
  }
];
