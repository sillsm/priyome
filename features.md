# Tactical theorem prover feature snippets

These snippets match the style of the attached tactical prover website: they treat a chess position as the current axiom, derive **observations**, and then relate legal moves to those observations.

Assumptions:

- `game.state.board` is the 64-square board array
- `game.state.side` is the side to move
- `game._legalMovesFrom(idx, side)` returns legal destinations for the piece on `idx`
- `game._attacked(square, byColor)` reports whether `square` is attacked by `byColor`
- board indices use `idx(f, r)` with `r = 0` for rank 1

---

## Helpers

```js
const files = 'abcdefgh';
const values = { p:1, n:3, b:3, r:5, q:9, k:0 };

function FR(i){ return [i % 8, 7 - Math.floor(i / 8)]; }
function idx(f,r){ return (7-r) * 8 + f; }
function inB(f,r){ return f >= 0 && f < 8 && r >= 0 && r < 8; }
function sqName(i){ const [f,r] = FR(i); return files[f] + (r+1); }
function other(c){ return c === 'w' ? 'b' : 'w'; }

function pieceAttackSquares(game, fromIdx, piece){
  const [f,r] = FR(fromIdx);
  if (piece.type === 'p') {
    const dir = piece.color === 'w' ? 1 : -1;
    const out = [];
    for (const df of [-1, 1]) {
      const nf = f + df, nr = r + dir;
      if (inB(nf, nr)) out.push(idx(nf, nr));
    }
    return out;
  }
  return game._genPseudo(fromIdx, true);
}

function defendersOf(game, squareIndex, color){
  const out = [];
  for (let i = 0; i < 64; i++) {
    const p = game.state.board[i];
    if (!p || p.color !== color) continue;
    if (pieceAttackSquares(game, i, p).includes(squareIndex)) out.push(i);
  }
  return out;
}
```

---

## Checks

A move is a check witness if, after the move, the opposing king is attacked.

```js
function findCheckingMoves(game){
  const side = game.state.side;
  const out = [];

  for (let i = 0; i < 64; i++) {
    const p = game.state.board[i];
    if (!p || p.color !== side) continue;

    for (const to of game._legalMovesFrom(i, side)) {
      const temp = createGame();
      temp.loadFEN(game.exportFEN());
      const uci = sqName(i) + sqName(to);
      if (!temp.makeMoveUCI(uci)) continue;
      if (temp.state.pendingPromotion) temp.resolvePendingPromotion('Q');

      if (temp._isInCheck(other(side))) {
        out.push({ from:i, to, uci, san: temp.curNode.san });
      }
    }
  }
  return out;
}
```

---

## Alignments

Here an alignment means two enemy pieces lie on the same file, rank, or diagonal with no blocker between them.

```js
function lineDirection(a, b){
  const [af,ar] = FR(a), [bf,br] = FR(b);
  const df = Math.sign(bf - af), dr = Math.sign(br - ar);
  if (af === bf) return [0, dr];
  if (ar === br) return [df, 0];
  if (Math.abs(bf - af) === Math.abs(br - ar)) return [df, dr];
  return null;
}

function findAlignedEnemyPairs(game){
  const enemy = other(game.state.side);
  const out = [];

  for (let a = 0; a < 64; a++) {
    const pa = game.state.board[a];
    if (!pa || pa.color !== enemy) continue;

    for (let b = a + 1; b < 64; b++) {
      const pb = game.state.board[b];
      if (!pb || pb.color !== enemy) continue;

      const dir = lineDirection(a, b);
      if (!dir) continue;

      let [f,r] = FR(a);
      f += dir[0];
      r += dir[1];
      let blocked = false;

      while (inB(f, r)) {
        const s = idx(f, r);
        if (s === b) break;
        if (game.state.board[s]) {
          blocked = true;
          break;
        }
        f += dir[0];
        r += dir[1];
      }

      if (!blocked) out.push({ front:a, rear:b });
    }
  }

  return out;
}
```

---

## Loose pieces

A loose piece is an enemy non-king piece with zero defenders.

```js
function findLoosePieces(game){
  const enemy = other(game.state.side);
  const out = [];

  for (let i = 0; i < 64; i++) {
    const p = game.state.board[i];
    if (!p || p.color !== enemy || p.type === 'k') continue;

    const defenders = defendersOf(game, i, enemy);
    if (defenders.length === 0) {
      out.push({ square:i, piece:p, note:`Loose ${p.type} on ${sqName(i)}` });
    }
  }

  return out;
}
```

---

## Mobility-restricted pieces

A restricted piece is one whose legal move count is at or below a chosen threshold.

```js
function findRestrictedPieces(game, threshold = 2){
  const enemy = other(game.state.side);
  const out = [];

  for (let i = 0; i < 64; i++) {
    const p = game.state.board[i];
    if (!p || p.color !== enemy || p.type === 'k') continue;

    const mobility = game._legalMovesFrom(i, enemy).length;
    if (mobility <= threshold) {
      out.push({ square:i, piece:p, mobility });
    }
  }

  return out;
}
```

---

## Overworked guards

An overworked guard is an enemy piece that directly guards at least two friendly targets.

```js
function findOverworkedGuards(game){
  const enemy = other(game.state.side);
  const out = [];

  for (let i = 0; i < 64; i++) {
    const p = game.state.board[i];
    if (!p || p.color !== enemy) continue;

    const attacks = pieceAttackSquares(game, i, p);
    const guarded = [];

    for (const sq of attacks) {
      const occ = game.state.board[sq];
      if (occ && occ.color === enemy && occ.type !== 'k') guarded.push(sq);
    }

    const uniqueGuarded = [...new Set(guarded)];
    if (uniqueGuarded.length >= 2) {
      out.push({ guard:i, guarded:uniqueGuarded });
    }
  }

  return out;
}
```

---

## Relating moves to observations

The production rule is: a move is allowed if it is related to at least one selected observation.

```js
function relatedMoves(game, selectedObservationIds, observations){
  const related = new Map();

  for (const ob of observations) {
    if (!selectedObservationIds.has(ob.id)) continue;

    for (const move of ob.moves) {
      const prev = related.get(move.uci) || { ...move, reasons:[] };
      prev.reasons.push(ob.label);
      related.set(move.uci, prev);
    }
  }

  return [...related.values()];
}
```

---

## The bounded theorem shape

```js
// P0 is the loaded position axiom.
// We seek a line of at most N plies where the original side to move ends ahead in material.

function theoremHolds(game, rootSide){
  let score = 0;
  for (const p of game.state.board) {
    if (!p) continue;
    score += p.color === rootSide ? values[p.type] : -values[p.type];
  }
  return score > 0;
}
```

That is enough to make the prover feel like:

- **observe** a tactical fact
- **select** one or more facts
- **restrict** legal moves to related witnesses
- **derive** a short line
- **check** whether the theorem goal now holds
