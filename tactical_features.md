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

## Capture
kind: capture
order: 20
color: capture

### observe
```js
const bySquare = new Map();

for (const move of ctx.legalMoves) {
  if (!move.isCapture || !move.capturedPiece || move.captureSquare == null) continue;
  const sq = move.captureSquare;
  if (bySquare.has(sq)) continue;
  const target = move.capturedPiece;
  bySquare.set(sq, {
    id: `capture|${sq}`,
    label: `Capture ${ctx.pieceLetter(target)}${ctx.sqName(sq)}`,
    side: target.color === ctx.side ? 'ours' : 'theirs',
    implicatedValue: ctx.pieceValue(target),
    data: { square: sq }
  });
}

return [...bySquare.values()];
```

### related
```js
return move.isCapture && move.captureSquare === observation.data.square;
```

## Attack
kind: attack
order: 30
color: attack

### observe
```js
const out = [];

for (let sq = 0; sq < 64; sq++) {
  const target = ctx.game.state.board[sq];
  if (!target || target.type === 'k') continue;

  const hasRelated = ctx.legalMoves.some(move => {
    const after = ctx.afterFor(move);
    return !!after && (
      move.to === sq ||
      ctx.moveAttacksSquare(after, move, sq, ctx.side)
    );
  });

  if (!hasRelated) continue;

  out.push({
    id: `attack|${sq}`,
    label: `Attack ${ctx.pieceLetter(target)}${ctx.sqName(sq)}`,
    side: target.color === ctx.side ? 'ours' : 'theirs',
    implicatedValue: ctx.pieceValue(target),
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

for (const owner of [ctx.side, ctx.enemy]) {
  for (const pair of ctx.findAlignedPairs(owner)) {
    out.push({
      id: `alignment|${owner}|${pair.front}-${pair.rear}`,
      label: `${owner === ctx.side ? 'Our' : 'Enemy'} alignment ${ctx.pieceLetter(pair.frontPiece)}${ctx.sqName(pair.front)} in front of ${ctx.pieceLetter(pair.rearPiece)}${ctx.sqName(pair.rear)}`,
      side: owner === ctx.side ? 'ours' : 'theirs',
      implicatedValue: Math.max(ctx.pieceValue(pair.frontPiece), ctx.pieceValue(pair.rearPiece)),
      data: {
        owner,
        front: pair.front,
        rear: pair.rear
      }
    });
  }
}

return out;
```
### related
```js
const front = observation.data.front;
const rear = observation.data.rear;
const owner = observation.data.owner;

const movedPiece = after.state.board[move.to];
const coaligns =
  movedPiece &&
  movedPiece.color === ctx.side &&
  ['q','r','b'].includes(movedPiece.type) &&
  ctx.sameLineNoBlock(after, move.to, front, rear);

if (owner === ctx.enemy) {
  return coaligns ||
    move.to === front ||
    move.to === rear ||
    ctx.moveAttacksSquare(after, move, front, ctx.side) ||
    ctx.moveAttacksSquare(after, move, rear, ctx.side);
}

return move.from === front || move.from === rear;
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
