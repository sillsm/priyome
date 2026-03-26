# Tactical Features

## Check
kind: check
order: 10
color: check

### observe
```js
return ctx.legalMoves
  .filter(move => move.givesCheck)
  .map(move => ({
    id: `check|${move.uci}`,
    label: `Check on ${move.san}`,
    side: 'ours',
    implicatedValue: 100,
    data: { uci: move.uci }
  }));
```

### related
```js
return move.uci === observation.data.uci;
```

## Loose Piece
kind: loose
order: 50
color: loose

### observe
```js
const out = [];

for (let sq = 0; sq < 64; sq++) {
  const p = ctx.game.state.board[sq];
  if (!p || p.type === 'k') continue;
  if (ctx.defendersOf(ctx.game, sq, p.color).length !== 0) continue;

  out.push({
    id: `loose|${sq}`,
    label: `Loose ${ctx.pieceLetter(p)}${ctx.sqName(sq)}`,
    side: p.color === ctx.side ? 'ours' : 'theirs',
    implicatedValue: ctx.pieceValue(p),
    data: { square: sq }
  });
}

return out;
```

### related
```js
return move.to === observation.data.square ||
  ctx.moveAttacksSquare(after, move, observation.data.square, ctx.side);
```

## Alignment
kind: alignment
order: 40
color: alignment

### observe
```js
const out = [];

const fileOf = sq => sq & 7;
const rankOf = sq => sq >> 3;
const onBoard = (f, r) => f >= 0 && f < 8 && r >= 0 && r < 8;
const sqOf = (f, r) => r * 8 + f;
const allPiecesOf = color => {
  const xs = [];
  for (let sq = 0; sq < 64; sq++) {
    const p = ctx.game.state.board[sq];
    if (p && p.color === color && p.type !== 'k') xs.push({ sq, p });
  }
  return xs;
};
const legalTos = (game, sq, color) =>
  (game._legalMovesFrom(sq, color) || []).map(m => typeof m === 'number' ? m : m.to);

const lineSquaresBetweenInclusive = (a, b) => {
  const af = fileOf(a), ar = rankOf(a);
  const bf = fileOf(b), br = rankOf(b);
  const df = Math.sign(bf - af), dr = Math.sign(br - ar);
  const outSq = [];
  let f = af, r = ar;
  outSq.push(a);
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
  const opp = owner === 'w' ? 'b' : 'w';
  const dir = opp === 'w' ? 1 : -1;
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
    const exploitSquares = lineSquaresBetweenInclusive(front, rear);

    let subtype = null;
    let relevant = false;

    if (diagonal) {
      subtype = 'diagonal';
      relevant = allPiecesOf(enemy).some(({ sq, p }) =>
        ['b', 'q'].includes(p.type) &&
        legalTos(ctx.game, sq, enemy).some(to => exploitSquares.includes(to))
      );
    } else if (orthogonal) {
      subtype = 'line';
      relevant = allPiecesOf(enemy).some(({ sq, p }) =>
        ['r', 'q'].includes(p.type) &&
        legalTos(ctx.game, sq, enemy).some(to => exploitSquares.includes(to))
      );
    }

    if (!subtype || !relevant) continue;

    out.push({
      id: `alignment|${subtype}|${owner}|${front}-${rear}`,
      label: `${owner === ctx.side ? 'Our' : 'Enemy'} ${subtype} alignment ${ctx.pieceLetter(pair.frontPiece)}${ctx.sqName(front)} / ${ctx.pieceLetter(pair.rearPiece)}${ctx.sqName(rear)}`,
      side: owner === ctx.side ? 'ours' : 'theirs',
      implicatedValue: Math.max(ctx.pieceValue(pair.frontPiece), ctx.pieceValue(pair.rearPiece)),
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
          p.type === 'n' && knightSquares.some(target => knightDistanceLE2(sq, target))
        );
        if (enemyKnightCanReach) {
          out.push({
            id: `alignment|knight|${owner}|${a}-${b}`,
            label: `${owner === ctx.side ? 'Our' : 'Enemy'} knight alignment ${ctx.pieceLetter(pieces[i].p)}${ctx.sqName(a)} / ${ctx.pieceLetter(pieces[j].p)}${ctx.sqName(b)}`,
            side: owner === ctx.side ? 'ours' : 'theirs',
            implicatedValue: Math.max(ctx.pieceValue(pieces[i].p), ctx.pieceValue(pieces[j].p)),
            data: { owner, subtype: 'knight', front: a, rear: b, exploitSquares: knightSquares }
          });
        }
      }

      const pawnSquares = pawnForkSquaresForPair(owner, a, b);
      if (pawnSquares.length) {
        out.push({
          id: `alignment|pawn|${owner}|${a}-${b}`,
          label: `${owner === ctx.side ? 'Our' : 'Enemy'} pawn alignment ${ctx.pieceLetter(pieces[i].p)}${ctx.sqName(a)} / ${ctx.pieceLetter(pieces[j].p)}${ctx.sqName(b)}`,
          side: owner === ctx.side ? 'ours' : 'theirs',
          implicatedValue: Math.max(ctx.pieceValue(pieces[i].p), ctx.pieceValue(pieces[j].p)),
          data: {
            owner,
            subtype: 'pawn',
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
```
### related
```js
const subtype = observation.data.subtype;
const exploitSquares = observation.data.exploitSquares || [];

if (subtype === 'diagonal' || subtype === 'line' || subtype === 'knight') {
  return exploitSquares.includes(move.to);
}

if (subtype === 'pawn') {
  const fileOf = sq => sq & 7;
  const exploitFiles = observation.data.exploitFiles || [];
  return movedPiece &&
    movedPiece.color === ctx.side &&
    movedPiece.type === 'p' &&
    (exploitSquares.includes(move.to) || exploitFiles.includes(fileOf(move.to)));
}

return false;
```

## Mobility
kind: mobility
order: 60
color: mobility

### observe
```js
const out = [];

for (let sq = 0; sq < 64; sq++) {
  const p = ctx.game.state.board[sq];
  if (!p || p.type === 'k') continue;

  const before = ctx.game._legalMovesFrom(sq, p.color)?.length || 0;
  if (before > ctx.mobilityThreshold) continue;

  out.push({
    id: `mobility|${sq}`,
    label: `Restricted ${ctx.pieceLetter(p)}${ctx.sqName(sq)} has ${before} legal moves`,
    side: p.color === ctx.side ? 'ours' : 'theirs',
    implicatedValue: ctx.pieceValue(p),
    data: { square: sq, before, color: p.color }
  });
}

return out;
```
### related
```js
const sq = observation.data.square;
const afterPiece = after.state.board[sq];
const afterMob = afterPiece ? (after._legalMovesFrom(sq, observation.data.color)?.length || 0) : -1;

return move.to === sq ||
  ctx.moveAttacksSquare(after, move, sq, ctx.side) ||
  (afterPiece && afterMob < observation.data.before);
```

## Overworked Guard
kind: overworked
order: 70
color: overworked

### observe
```js
const out = [];

for (let sq = 0; sq < 64; sq++) {
  const p = ctx.game.state.board[sq];
  if (!p) continue;

  const guarded = [...new Set(
    ctx.pieceAttackSquares(ctx.game, sq, p).filter(target => {
      const occ = ctx.game.state.board[target];
      return occ && occ.color === p.color && occ.type !== 'k';
    })
  )];

  if (guarded.length < 2) continue;

  out.push({
    id: `overworked|${sq}|${guarded.join(',')}`,
    label: `${ctx.pieceLetter(p)}${ctx.sqName(sq)} guards ${guarded.slice(0,3).map(ctx.sqName).join(', ')}`,
    side: p.color === ctx.side ? 'ours' : 'theirs',
    implicatedValue: Math.max(
      ctx.pieceValue(p),
      ...guarded.map(target => ctx.pieceValue(ctx.game.state.board[target]))
    ),
    data: { guard: sq, guarded }
  });
}

return out;
```

### related
```js
return move.to === observation.data.guard ||
  observation.data.guarded.includes(move.to) ||
  ctx.moveAttacksSquare(after, move, observation.data.guard, ctx.side) ||
  observation.data.guarded.some(sq => ctx.moveAttacksSquare(after, move, sq, ctx.side));
```
