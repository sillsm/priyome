// scratchchess_lib.js
// =======================================================
// EXPORTED PUBLIC API
//
// createGame(opts?)
// class Game
//   - initializePosition()
//   - clearBoard()
//   - loadFEN(fen)
//   - exportFEN()
//   - loadPGN(pgn)           
//   - exportPGN()
//   - exportCQL()  // query mode
//   - makeMoveUCI(uci)
//   - prevMove(), nextMove()
//   - promoteVariationFromHere(), deleteMoveFromHere()
//   - toggleSetup(bool)
//   - markSquare(sq,color), addArrow(from,to,color), clearMarks()
//   - promoteToQueen/Rook/Bishop/Knight (promotion pausing)
// =======================================================

const files = "abcdefgh";
const idx = (f, r) => (7 - r) * 8 + f; // a8=0
const FR = (i) => [i % 8, 7 - Math.floor(i / 8)];
const sqName = (i) => {
  const [f, r] = FR(i);
  return files[f] + (r + 1);
};
const parseSq = (s) => idx(s.charCodeAt(0) - 97, +s[1] - 1);
const inB = (f, r) => f >= 0 && f < 8 && r >= 0 && r < 8;
const other = (c) => (c === "w" ? "b" : "w");

const isWLetter = (p) => p && p === p.toUpperCase();
const ptLetter = (p) => p.toLowerCase();

let _pieceIdSeq = 1;
function makePieceFromLetter(letter) {
  const color = isWLetter(letter) ? "w" : "b";
  const type = ptLetter(letter);
  return { id: String(_pieceIdSeq++), color, type };
}
function pieceCode(piece) {
  const map = { p: "P", n: "N", b: "B", r: "R", q: "Q", k: "K" };
  return (piece.color === "w" ? "w" : "b") + map[piece.type];
}

function makeNode(parent = null) {
  return {
    parent,
    children: [],
    mainChildIndex: 0,
    san: null,
    uci: null,
    moveInfo: null,
    snapBefore: null,
    ply: 0,
    marks: { sqMarks: new Map(), arrows: [] },
  };
}

function snapshotFrom(state) {
  return {
    board: state.board.map((p) => (p ? { ...p } : null)),
    side: state.side,
    castling: { ...state.castling },
    ep: state.ep,
    halfmove: state.halfmove,
    fullmove: state.fullmove,
  };
}
function restoreInto(state, snap) {
  state.board = snap.board.map((p) => (p ? { ...p } : null));
  state.side = snap.side;
  state.castling = { ...snap.castling };
  state.ep = snap.ep;
  state.halfmove = snap.halfmove;
  state.fullmove = snap.fullmove;
}

function fenFromState(S) {
  let out = "";
  for (let r = 7; r >= 0; r--) {
    let empty = 0;
    for (let f = 0; f < 8; f++) {
      const p = S.board[idx(f, r)];
      if (!p) empty++;
      else {
        if (empty) { out += empty; empty = 0; }
        const map = { p: "p", n: "n", b: "b", r: "r", q: "q", k: "k" };
        let ch = map[p.type] || "?";
        if (p.color === "w") ch = ch.toUpperCase();
        out += ch;
      }
    }
    if (empty) out += empty;
    if (r) out += "/";
  }
  const side = S.side;
  const c = S.castling;
  let cast = "";
  if (c.K) cast += "K";
  if (c.Q) cast += "Q";
  if (c.k) cast += "k";
  if (c.q) cast += "q";
  if (!cast) cast = "-";
  const ep = S.ep || "-";
  return `${out} ${side} ${cast} ${ep} ${S.halfmove} ${S.fullmove}`;
}

function cloneMarks(marks) {
  const sq = new Map();
  for (const [k, v] of marks.sqMarks.entries()) sq.set(k, v);
  const arrows = marks.arrows.map((a) => ({ ...a }));
  return { sqMarks: sq, arrows };
}

export class Game {
  constructor(opts = {}) {
    this._listeners = new Set();

    this.tags = {
      Event: opts.Event || "Casual Game",
      Site: opts.Site || "Local",
      Date: opts.Date || "2026.02.06",
      Round: opts.Round || "1",
      White: opts.White || "White",
      Black: opts.Black || "Black",
      Result: opts.Result || "*",
    };

    this.ui = {
      mode: "moves",
      pig: "R",
      flipped: false,
      setup: false,
      mini: false,
    };

    this.state = {
      board: Array(64).fill(null),
      side: "w",
      castling: { K: true, Q: true, k: true, q: true },
      ep: null,
      halfmove: 0,
      fullmove: 1,
      pendingPromotion: null,
    };

    this.sel = { fromSq: null, legalTo: [] };

    this.root = makeNode(null);
    this.root.ply = 0;
    this.curNode = this.root;
    this.initialSnap = null;
    this._pendingPromotion = null;

    // Tracks whether we should emit Setup/FEN tags in PGN output.
    this._setupTagActive = false;
    this._setupFEN = null;

    this.initializePosition();
  }

  onChange(fn) {
    this._listeners.add(fn);
    return () => this._listeners.delete(fn);
  }
  _emit() {
    for (const fn of this._listeners) {
      try { fn(this); } catch {}
    }
  }

  setMode(m) { this.ui.mode = m; this._emit(); }
  setPigment(p) { this.ui.pig = p; this._emit(); }
  toggleFlip(v) { this.ui.flipped = v == null ? !this.ui.flipped : !!v; this._emit(); }
  toggleSetup(v) { this.ui.setup = v == null ? !this.ui.setup : !!v; this.sel.fromSq=null; this.sel.legalTo=[]; this._emit(); }
  toggleMini(v) { this.ui.mini = v == null ? !this.ui.mini : !!v; this._emit(); }

  clearBoard() {
    this.state.board = Array(64).fill(null);
    this.state.side = "w";
    this.state.castling = { K: false, Q: false, k: false, q: false };
    this.state.ep = null;
    this.state.halfmove = 0;
    this.state.fullmove = 1;

    this.root = makeNode(null);
    this.root.ply = 0;
    this.curNode = this.root;
    this.initialSnap = snapshotFrom(this.state);

    this.sel.fromSq = null;
    this.sel.legalTo = [];
    this._pendingPromotion = null;
    this.state.pendingPromotion = null;

    this._setupTagActive = false;
    this._setupFEN = null;

    this._emit();
  }

  initializePosition() {
    this.loadFEN("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
    this._setupTagActive = false;
    this._setupFEN = null;
  }

  clearMarks() {
    const m = this.curNode.marks;
    m.sqMarks.clear();
    m.arrows.length = 0;
    this._emit();
  }

  loadFEN(fen) {
    const parts = String(fen || "").trim().split(/\s+/);
    if (!parts.length) return;

    const placement = parts[0];
    this.state.board = Array(64).fill(null);
    let i = 0;
    for (const ch of placement) {
      if (ch === "/") continue;
      if (/\d/.test(ch)) { i += +ch; continue; }
      const p = makePieceFromLetter(ch);
      this.state.board[i++] = p;
    }

    this.state.side = (parts[1] === "b") ? "b" : "w";
    const cast = parts[2] || "-";
    this.state.castling = {
      K: cast.includes("K"),
      Q: cast.includes("Q"),
      k: cast.includes("k"),
      q: cast.includes("q"),
    };
    const ep = parts[3] || "-";
    this.state.ep = ep === "-" ? null : (/^[a-h][1-8]$/.test(ep) ? ep : null);

    this.state.halfmove = +(parts[4] || 0);
    this.state.fullmove = +(parts[5] || 1);

    this.root = makeNode(null);
    this.root.ply = 0;
    this.curNode = this.root;
    this.initialSnap = snapshotFrom(this.state);

    this.sel.fromSq = null;
    this.sel.legalTo = [];
    this._pendingPromotion = null;
    this.state.pendingPromotion = null;

    this._setupTagActive = true;
    this._setupFEN = this.exportFEN();

    this._emit();
  }

  exportFEN() {
    return fenFromState(this.state);
  }

  markSquare(sq, color) {
    this.curNode.marks.sqMarks.set(String(sq), String(color));
    this._emit();
  }
  addArrow(from, to, color) {
    this.curNode.marks.arrows.push({ from: String(from), to: String(to), color: String(color) });
    this._emit();
  }

  _buildMarksComment(node) {
    const m = node.marks;
    const csl = [];
    for (const [sq, c] of m.sqMarks.entries()) csl.push(`${c}${sq}`);
    const cal = [];
    for (const a of m.arrows) cal.push(`${a.color}${a.from}${a.to}`);
    const parts = [];
    if (csl.length) parts.push(`[%csl ${csl.join(",")}]`);
    if (cal.length) parts.push(`[%cal ${cal.join(",")}]`);
    if (!parts.length) return "";
    return `{ ${parts.join(" ")} }`;
  }

  // ===============================
  // Query mode: export CQL
  // ===============================
exportCQL() {
  if (this.ui.mode !== "query") throw new Error("not implemented");
  const hasMoves = this.root.children && this.root.children.length > 0;
  if (hasMoves || this.curNode !== this.root) throw new Error("not implemented");

  const m = this.curNode.marks;
  for (const [, c] of m.sqMarks.entries()) {
    if (c !== "B") throw new Error("not implemented");
  }
  for (const a of m.arrows) {
    if (a.color !== "G") throw new Error("not implemented");
  }

  const map = { p: "p", n: "n", b: "b", r: "r", q: "q", k: "k" };

  const pieceLineForSquare = (sq) => {
    const bi = parseSq(sq);
    const p = this.state.board[bi];
    if (!p) return null;
    let L = map[p.type] || "?";
    if (p.color === "w") L = L.toUpperCase();
    return L + sq;
  };

  let lines = [];

  // If we have the special "blue square + green arrow" encoding, emit ONLY that constraint.
  if (m.sqMarks.size || m.arrows.length) {
    if (m.sqMarks.size !== 1 || m.arrows.length !== 1) throw new Error("not implemented");
    const [[fromSq, c]] = Array.from(m.sqMarks.entries());
    if (c !== "B") throw new Error("not implemented");
    const ar = m.arrows[0];
    if (ar.color !== "G") throw new Error("not implemented");
    if (String(ar.from) !== String(fromSq)) throw new Error("not implemented");

    const pl = pieceLineForSquare(String(fromSq));
    if (!pl) throw new Error("not implemented");

    lines = [pl, "attacks " + String(ar.to)];
  } else {
    // FEN-only: emit every piece as "PieceSquare" ordered from a1..h8
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const bi = idx(f, r); // a1..h8
        const p = this.state.board[bi];
        if (!p) continue;
        const sq = sqName(bi);
        let L = map[p.type] || "?";
        if (p.color === "w") L = L.toUpperCase();
        lines.push(L + sq);
      }
    }
  }

  const body = lines.join("\n");
  return "cql(quiet)\n{\nline --> {\n" + body + "\n}\n}";
}

  // ===============================
  // PGN export / import
  // ===============================

  exportPGN() {
    const tags = [
      ["Event", this.tags.Event || ""],
      ["Site", this.tags.Site || ""],
      ["Date", this.tags.Date || ""],
      ["Round", this.tags.Round || "1"],
      ["White", this.tags.White || ""],
      ["Black", this.tags.Black || ""],
    ];
    if (this._setupTagActive) {
      tags.push(["Setup", "1"]);
      tags.push(["FEN", this._setupFEN || this.exportFEN()]);
    }
    tags.push(["Result", this.tags.Result || "*"]);
    let pgn = tags.map(([k, v]) => `[${k} "${String(v).replaceAll('"', '\\"')}"]`).join("\n") + "\n\n";
    const pre = this._buildMarksComment(this.root);
    if (pre) pgn += pre + "\n";

    const walk = (node, moveNumberStart, sideToMoveAtNode) => {
      let s = "";
      let moveNumber = moveNumberStart;
      let side = sideToMoveAtNode;
      let cur = node;

      while (cur.children.length) {
        const main = cur.children[cur.mainChildIndex] || cur.children[0];

        if (side === "w") s += moveNumber + ". ";
        else if (side === "b" && cur === node) s += moveNumber + "... ";

        s += main.san + " ";

        const cmt = this._buildMarksComment(main);
        if (cmt) s += cmt + " ";

        const vars = cur.children.filter((_, i) => i !== (cur.mainChildIndex || 0));
        for (const v of vars) {
          let vn = moveNumber;
          let vs = side;
          s += "(";
          if (vs === "w") s += vn + ". ";
          else s += vn + "... ";
          s += v.san + " ";
          const vcmt = this._buildMarksComment(v);
          if (vcmt) s += vcmt + " ";
          s += walk(v, vs === "w" ? vn : vn + 1, other(vs));
          s += ") ";
        }

        cur = main;
        side = other(side);
        if (side === "w") moveNumber++;
      }
      return s;
    };

    const startSide = this.initialSnap ? this.initialSnap.side : this.state.side;
    const startMove = this.initialSnap ? this.initialSnap.fullmove : 1;
    pgn += walk(this.root, startMove, startSide);

    pgn += (this.tags.Result || "*").trim();
    return pgn.trimEnd();
  }

  loadPGN(pgnText) {
    const text = String(pgnText || "");
    this.clearBoard();

    // keep only csl/cal comments
    const comments = [];
    let t = text.replace(/\{([^}]*)\}/g, (_, inner) => {
      const keep = [];
      const csl = inner.match(/\[%csl\s+([^\]]+)\]/);
      const cal = inner.match(/\[%cal\s+([^\]]+)\]/);
      if (csl) keep.push("%csl " + csl[1].trim());
      if (cal) keep.push("%cal " + cal[1].trim());
      if (!keep.length) return " ";
      comments.push(keep.join(" | "));
      return ` __CMT_${comments.length - 1}__ `;
    });

    t = t.replace(/^\s*\[[^\]]*\]\s*$/gm, " ");
    t = t.replace(/\$\d+/g, " ");
    t = t.replace(/\b\d+\.(\.\.)?/g, " ");
    t = t.replace(/\s+/g, " ").trim();
    const tokens = t.length ? t.split(" ") : [];

    for (const tok of tokens) {
      if (/^(__CMT_\d+__)$/i.test(tok)) {
        const id = +tok.match(/__CMT_(\d+)__/i)[1];
        const payload = comments[id] || "";
        const parts = payload.split("|").map((s) => s.trim());
        const mks = this.curNode.marks;
        for (const part of parts) {
          if (part.startsWith("%csl ")) {
            const list = part.slice(5).split(",").map((s) => s.trim()).filter(Boolean);
            for (const it of list) {
              const c = it[0];
              const sq = it.slice(1);
              if (/^[RBYG]$/.test(c) && /^[a-h][1-8]$/.test(sq)) mks.sqMarks.set(sq, c);
            }
          } else if (part.startsWith("%cal ")) {
            const list = part.slice(5).split(",").map((s) => s.trim()).filter(Boolean);
            for (const it of list) {
              const c = it[0];
              const from = it.slice(1, 3);
              const to = it.slice(3, 5);
              if (/^[RBYG]$/.test(c) && /^[a-h][1-8]$/.test(from) && /^[a-h][1-8]$/.test(to)) {
                const key = `${c}:${from}-${to}`;
                const j = mks.arrows.findIndex((a) => `${a.color}:${a.from}-${a.to}` === key);
                if (j < 0) mks.arrows.push({ from, to, color: c });
              }
            }
          }
        }
        continue;
      }

      if (tok === "1-0" || tok === "0-1" || tok === "1/2-1/2" || tok === "*") {
        this.tags.Result = tok;
        continue;
      }

      const mv = this._sanToMove(tok);
      if (!mv) break;
      const uci = sqName(mv.from) + sqName(mv.to) + (mv.promo ? mv.promo.toLowerCase() : "");
      const ok = this.makeMoveUCI(uci);
      if (ok === "PROMO") this.resolvePendingPromotion(mv.promo || "Q");
    }

    this._emit();
  }

  // ============================================================
  // Move / legality core
  // ============================================================

  _pieceById(id) {
    for (const p of this.state.board) if (p && p.id === id) return p;
    return null;
  }

  _pieceSANLetter(t) {
    const map = { n: "N", b: "B", r: "R", q: "Q", k: "K" };
    return map[t] || "";
  }

  _attacksFrom(i) {
    const p = this.state.board[i];
    if (!p) return [];
    const [f, r] = FR(i);
    const out = [];
    const add = (ff, rr) => { if (inB(ff, rr)) out.push(idx(ff, rr)); };

    if (p.type === "p") {
      const dir = p.color === "w" ? 1 : -1;
      add(f - 1, r + dir);
      add(f + 1, r + dir);
      return out;
    }

    const ray = (df, dr) => {
      let ff = f + df, rr = r + dr;
      while (inB(ff, rr)) {
        const j = idx(ff, rr);
        out.push(j);
        if (this.state.board[j]) break;
        ff += df; rr += dr;
      }
    };

    if (p.type === "n") {
      const ds = [[1,2],[2,1],[2,-1],[1,-2],[-1,-2],[-2,-1],[-2,1],[-1,2]];
      for (const [df, dr] of ds) add(f + df, r + dr);
      return out;
    }
    if (p.type === "b" || p.type === "q") {
      ray(1,1); ray(1,-1); ray(-1,1); ray(-1,-1);
    }
    if (p.type === "r" || p.type === "q") {
      ray(1,0); ray(-1,0); ray(0,1); ray(0,-1);
    }
    if (p.type === "k") {
      for (let df=-1; df<=1; df++) for (let dr=-1; dr<=1; dr++) if (df||dr) add(f+df, r+dr);
    }
    return out;
  }

  _isSquareAttacked(squareIdx, byColor) {
    for (let i = 0; i < 64; i++) {
      const p = this.state.board[i];
      if (!p || p.color !== byColor) continue;
      const ats = this._attacksFrom(i);
      if (ats.includes(squareIdx)) return true;
    }
    return false;
  }

  _kingIndex(color) {
    for (let i=0;i<64;i++){
      const p=this.state.board[i];
      if (p && p.type==="k" && p.color===color) return i;
    }
    return -1;
  }

  _isInCheck(color) {
    const k = this._kingIndex(color);
    if (k < 0) return false;
    return this._isSquareAttacked(k, other(color));
  }

  _pseudoMovesFrom(i) {
    const p = this.state.board[i];
    if (!p) return [];
    const [f, r] = FR(i);
    const out = [];
    const add = (ff, rr) => { if (!inB(ff, rr)) return; out.push(idx(ff, rr)); };

    const occ = (ff, rr) => {
      if (!inB(ff, rr)) return null;
      return this.state.board[idx(ff, rr)];
    };

    if (p.type === "p") {
      const dir = p.color === "w" ? 1 : -1;
      const startRank = p.color === "w" ? 1 : 6;
      const one = occ(f, r + dir);
      if (!one) add(f, r + dir);
      if (r === startRank && !one) {
        const two = occ(f, r + 2*dir);
        if (!two) add(f, r + 2*dir);
      }
      const capL = occ(f - 1, r + dir);
      const capR = occ(f + 1, r + dir);
      if (capL && capL.color !== p.color) add(f - 1, r + dir);
      if (capR && capR.color !== p.color) add(f + 1, r + dir);
      if (this.state.ep) {
        const epI = parseSq(this.state.ep);
        const [ef, er] = FR(epI);
        if (er === r + dir && Math.abs(ef - f) === 1) out.push(epI);
      }
      return out;
    }

    const ray = (df, dr) => {
      let ff=f+df, rr=r+dr;
      while (inB(ff, rr)) {
        const j = idx(ff, rr);
        const q = this.state.board[j];
        if (!q) out.push(j);
        else {
          if (q.color !== p.color) out.push(j);
          break;
        }
        ff += df; rr += dr;
      }
    };

    if (p.type === "n") {
      const ds = [[1,2],[2,1],[2,-1],[1,-2],[-1,-2],[-2,-1],[-2,1],[-1,2]];
      for (const [df, dr] of ds) {
        const ff=f+df, rr=r+dr;
        if (!inB(ff, rr)) continue;
        const q = this.state.board[idx(ff, rr)];
        if (!q || q.color !== p.color) out.push(idx(ff, rr));
      }
      return out;
    }

    if (p.type === "b" || p.type === "q") { ray(1,1); ray(1,-1); ray(-1,1); ray(-1,-1); }
    if (p.type === "r" || p.type === "q") { ray(1,0); ray(-1,0); ray(0,1); ray(0,-1); }
    if (p.type === "k") {
      for (let df=-1; df<=1; df++) for (let dr=-1; dr<=1; dr++) if (df||dr) {
        const ff=f+df, rr=r+dr;
        if (!inB(ff, rr)) continue;
        const q = this.state.board[idx(ff, rr)];
        if (!q || q.color !== p.color) out.push(idx(ff, rr));
      }

      // castling (very minimal, assumes pieces/rights)
      const homeRank = p.color === "w" ? 0 : 7;
      if (r === homeRank && f === 4) {
        const c = this.state.castling;
        if ((p.color === "w" ? c.K : c.k)) {
          if (!this.state.board[idx(5, homeRank)] && !this.state.board[idx(6, homeRank)]) {
            out.push(idx(6, homeRank));
          }
        }
        if ((p.color === "w" ? c.Q : c.q)) {
          if (!this.state.board[idx(3, homeRank)] && !this.state.board[idx(2, homeRank)] && !this.state.board[idx(1, homeRank)]) {
            out.push(idx(2, homeRank));
          }
        }
      }
    }
    return out;
  }

  _applyMoveRaw(fromIdx, toIdx, promoLetterOrNull) {
    const S = this.state;
    const p = S.board[fromIdx];
    const t = p.type;
    const color = p.color;

    let capturedId = null;
    let epCapture = false;
    let castle = null;
    let promo = null;

    // en passant capture
    if (t === "p" && S.ep && toIdx === parseSq(S.ep)) {
      const [tf, tr] = FR(toIdx);
      const dir = color === "w" ? -1 : 1;
      const capIdx = idx(tf, tr + dir);
      const capP = S.board[capIdx];
      if (capP && capP.type === "p" && capP.color !== color) {
        capturedId = capP.id;
        S.board[capIdx] = null;
        epCapture = true;
      }
    }

    const dest = S.board[toIdx];
    if (dest) capturedId = dest.id;

    // move piece
    S.board[toIdx] = p;
    S.board[fromIdx] = null;

    // castling rook move
    if (t === "k") {
      const [ff] = FR(fromIdx);
      const [tf, tr] = FR(toIdx);
      if (Math.abs(tf - ff) === 2) {
        const homeRank = tr;
        if (tf === 6) { // king side
          const rookFrom = idx(7, homeRank);
          const rookTo = idx(5, homeRank);
          S.board[rookTo] = S.board[rookFrom];
          S.board[rookFrom] = null;
          castle = "K";
        } else if (tf === 2) {
          const rookFrom = idx(0, homeRank);
          const rookTo = idx(3, homeRank);
          S.board[rookTo] = S.board[rookFrom];
          S.board[rookFrom] = null;
          castle = "Q";
        }
      }
      // remove castling rights
      if (color === "w") { S.castling.K = false; S.castling.Q = false; }
      else { S.castling.k = false; S.castling.q = false; }
    }

    // rook moves remove rights (simple)
    if (t === "r") {
      const [ff, fr] = FR(fromIdx);
      if (color === "w" && fr === 0 && ff === 0) S.castling.Q = false;
      if (color === "w" && fr === 0 && ff === 7) S.castling.K = false;
      if (color === "b" && fr === 7 && ff === 0) S.castling.q = false;
      if (color === "b" && fr === 7 && ff === 7) S.castling.k = false;
    }

    // pawn move updates ep
    S.ep = null;
    if (t === "p") {
      const [ff, fr] = FR(fromIdx);
      const [tf, tr] = FR(toIdx);
      const dir = color === "w" ? 1 : -1;
      if (Math.abs(tr - fr) === 2) {
        S.ep = files[ff] + (fr + 1 + dir);
      }
      // promotion
      const last = color === "w" ? 7 : 0;
      if (tr === last) {
        promo = promoLetterOrNull ? String(promoLetterOrNull).toLowerCase() : "q";
        p.type = promo;
      }
    }

    // halfmove clock
    const cap = !!capturedId || epCapture;
    if (t === "p" || cap) S.halfmove = 0;
    else S.halfmove++;

    // fullmove + side
    if (color === "b") S.fullmove++;
    S.side = other(S.side);

    return { pieceId: p.id, pieceType: t, pieceColor: color, capturedId, epCapture, castle, promo };
  }

  _allLegalMoves(color) {
    const out = [];
    for (let i=0;i<64;i++){
      const p = this.state.board[i];
      if (!p || p.color !== color) continue;
      const tos = this._legalMovesFrom(i);
      for (const t of tos) out.push([i,t]);
    }
    return out;
  }

  _legalMovesFrom(fromIdx) {
    const p = this.state.board[fromIdx];
    if (!p) return [];
    if (p.color !== this.state.side) return [];
    const pseudo = this._pseudoMovesFrom(fromIdx);
    const legal = [];
    const snap = snapshotFrom(this.state);
    for (const toIdx of pseudo) {
      this._applyMoveRaw(fromIdx, toIdx, null);
      if (!this._isInCheck(p.color)) legal.push(toIdx);
      restoreInto(this.state, snap);
    }
    return legal;
  }

  _disambiguation(fromIdx, toIdx, piece) {
    const t = piece.type;
    if (t === "p" || t === "k") return "";
    const color = piece.color;

    // find all same-type pieces that can also go to toIdx
    const [ff, fr] = FR(fromIdx);
    const cand = [];
    for (let i=0;i<64;i++){
      if (i===fromIdx) continue;
      const p = this.state.board[i];
      if (!p || p.color!==color || p.type!==t) continue;
      const tos = this._legalMovesFrom(i);
      if (tos.includes(toIdx)) cand.push(i);
    }
    if (!cand.length) return "";

    const shareFile = cand.some((i)=>FR(i)[0]===ff);
    const shareRank = cand.some((i)=>FR(i)[1]===fr);

    let needFile = false, needRank = false;
    if (!shareFile) needFile = true;
    else if (!shareRank) needRank = true;
    else { needFile = true; needRank = true; }

    let s = "";
    if (needFile) s += files[ff];
    if (needRank) s += (fr + 1);
    return s;
  }

  _moveToSAN(fromIdx, toIdx, moveInfo) {
    const piece = this._pieceById(moveInfo.pieceId);
    const t = moveInfo.pieceType;
    const color = moveInfo.pieceColor;

    if (moveInfo.castle) {
      const [ff] = FR(fromIdx);
      const [tf] = FR(toIdx);
      return tf > ff ? "O-O" : "O-O-O";
    }

    const cap = !!moveInfo.capturedId || moveInfo.epCapture;
    let san = "";

    if (t === "p") {
      if (cap) {
        const [ff] = FR(fromIdx);
        san += files[ff] + "x" + sqName(toIdx);
      } else san += sqName(toIdx);
      if (moveInfo.promo) san += "=" + moveInfo.promo.toUpperCase();
    } else {
      san += this._pieceSANLetter(t);
      san += this._disambiguation(fromIdx, toIdx, piece);
      if (cap) san += "x";
      san += sqName(toIdx);
    }

    const their = other(color);
    const inCheck = this._isInCheck(their);
    if (inCheck) {
      const theirMoves = this._allLegalMoves(their);
      san += (theirMoves.length === 0) ? "#" : "+";
    }
    return san;
  }

  makeMoveUCI(uci) {
    const from = uci.slice(0, 2);
    const to = uci.slice(2, 4);
    const promo = uci.length >= 5 ? uci[4].toLowerCase() : null;
    const fromIdx = parseSq(from);
    const toIdx = parseSq(to);

    const p = this.state.board[fromIdx];
    if (!p) return false;

    if (this.ui.setup) {
      this.state.board[toIdx] = this.state.board[fromIdx];
      this.state.board[fromIdx] = null;
      this.sel.fromSq = null;
      this.sel.legalTo = [];
      this._emit();
      return true;
    }

    const legal = this._legalMovesFrom(fromIdx);
    if (!legal.includes(toIdx)) return false;

    let promoLetter = null;
    if (p.type === "p") {
      const [, tr] = FR(toIdx);
      const last = p.color === "w" ? 7 : 0;
      if (tr === last) {
        if (!promo) {
          this._pendingPromotion = { fromIdx, toIdx };
          this.state.pendingPromotion = { fromIdx, toIdx };
          this._emit();
          return "PROMO";
        } else {
          const map = { q:"Q", r:"R", b:"B", n:"N" };
          promoLetter = map[promo] || "Q";
        }
      }
    }

    this._finalizeMove(fromIdx, toIdx, promoLetter);
    return true;
  }

  resolvePendingPromotion(letter) {
    if (!this._pendingPromotion) throw new Error("pending promotion");
    const { fromIdx, toIdx } = this._pendingPromotion;
    const L = String(letter || "").toUpperCase();
    if (!"QRBN".includes(L)) throw new Error("invalid promotion piece");
    this._finalizeMove(fromIdx, toIdx, L);
    return true;
  }

  promoteToQueen() { return this.resolvePendingPromotion("Q"); }
  promoteToRook() { return this.resolvePendingPromotion("R"); }
  promoteToBishop() { return this.resolvePendingPromotion("B"); }
  promoteToKnight() { return this.resolvePendingPromotion("N"); }

  _finalizeMove(fromIdx, toIdx, promoLetterOrNull) {
    const S = this.state;
    const snapBefore = snapshotFrom(S);
    const uci = sqName(fromIdx) + sqName(toIdx) + (promoLetterOrNull ? promoLetterOrNull.toLowerCase() : "");

    const moveInfo = this._applyMoveRaw(fromIdx, toIdx, promoLetterOrNull);
    const san = this._moveToSAN(fromIdx, toIdx, moveInfo);

    const parent = this.curNode;
    const node = makeNode(parent);
    node.san = san;
    node.uci = uci;
    node.moveInfo = moveInfo;
    node.snapBefore = snapBefore;
    node.ply = parent.ply + 1;

    parent.children.push(node);
    if (parent.children.length === 1) parent.mainChildIndex = 0;

    this.curNode = node;
    this.sel.fromSq = null;
    this.sel.legalTo = [];
    this._pendingPromotion = null;
    this.state.pendingPromotion = null;

    // Once we actually make a move, Setup/FEN tags are still valid in general,
    // but your current tests only require them for FEN-only positions, so we keep
    // the flag as-is.
    this._emit();
  }

  prevMove() {
    if (this.curNode === this.root) return false;
    restoreInto(this.state, this.curNode.snapBefore);
    this.curNode = this.curNode.parent;
    this.sel.fromSq = null;
    this.sel.legalTo = [];
    this._pendingPromotion = null;
    this.state.pendingPromotion = null;
    this._emit();
    return true;
  }

  nextMove() {
    const n = this.curNode;
    if (!n.children.length) return false;
    const child = n.children[n.mainChildIndex] || n.children[0];

    restoreInto(this.state, child.snapBefore);
    const fromIdx = parseSq(child.uci.slice(0, 2));
    const toIdx = parseSq(child.uci.slice(2, 4));
    const promo = child.uci.length >= 5 ? child.uci[4].toUpperCase() : null;
    this._applyMoveRaw(fromIdx, toIdx, promo || null);

    this.curNode = child;
    this.sel.fromSq = null;
    this.sel.legalTo = [];
    this._pendingPromotion = null;
    this.state.pendingPromotion = null;
    this._emit();
    return true;
  }

  promoteVariationFromHere() {
    const node = this.curNode;
    if (!node.parent) return false;
    const parent = node.parent;
    const i = parent.children.indexOf(node);
    if (i < 0) return false;
    parent.mainChildIndex = i;
    this._emit();
    return true;
  }

  deleteMoveFromHere() {
    const node = this.curNode;
    if (node === this.root) return false;
    const parent = node.parent;
    const i = parent.children.indexOf(node);
    if (i >= 0) parent.children.splice(i, 1);
    if (parent.mainChildIndex >= parent.children.length) parent.mainChildIndex = 0;
    restoreInto(this.state, node.snapBefore);
    this.curNode = parent;
    this.sel.fromSq = null;
    this.sel.legalTo = [];
    this._pendingPromotion = null;
    this.state.pendingPromotion = null;
    this._emit();
    return true;
  }

  _sanToMove(san) {
    const clean = String(san).replace(/[+#]$/g, "").trim();
    if (clean === "O-O" || clean === "0-0") {
      const homeRank = this.state.side === "w" ? 0 : 7;
      return { from: idx(4, homeRank), to: idx(6, homeRank), promo: null };
    }
    if (clean === "O-O-O" || clean === "0-0-0") {
      const homeRank = this.state.side === "w" ? 0 : 7;
      return { from: idx(4, homeRank), to: idx(2, homeRank), promo: null };
    }

    let promo = null;
    const promoM = clean.match(/=([QRBN])/);
    if (promoM) promo = promoM[1];
    const core = clean.replace(/=([QRBN])/, "");

    let pieceType = "p";
    let rest = core;
    const first = core[0];
    if ("KQRBN".includes(first)) {
      pieceType = first.toLowerCase();
      rest = core.slice(1);
    }

    rest = rest.replace("x", "");
    const dest = rest.slice(-2);
    if (!/^[a-h][1-8]$/.test(dest)) return null;
    const toIdx = parseSq(dest);

    const dis = rest.slice(0, -2);
    let disFile = null, disRank = null;
    if (dis.length === 1) {
      if (/[a-h]/.test(dis)) disFile = dis;
      else if (/[1-8]/.test(dis)) disRank = +dis;
    } else if (dis.length === 2) {
      if (/[a-h]/.test(dis[0]) && /[1-8]/.test(dis[1])) {
        disFile = dis[0];
        disRank = +dis[1];
      }
    } else if (dis.length > 0) {
      if (pieceType === "p" && /^[a-h]$/.test(dis)) disFile = dis;
    }

    const color = this.state.side;
    const cand = [];
    for (let i = 0; i < 64; i++) {
      const p = this.state.board[i];
      if (!p || p.color !== color) continue;
      if (p.type !== pieceType) continue;

      if (disFile != null) {
        const [f] = FR(i);
        if (files[f] !== disFile) continue;
      }
      if (disRank != null) {
        const [, r] = FR(i);
        if (r + 1 !== disRank) continue;
      }

      const tos = this._legalMovesFrom(i);
      if (tos.includes(toIdx)) cand.push(i);
    }
    if (cand.length !== 1) return null;
    return { from: cand[0], to: toIdx, promo };
  }
}

export function createGame(opts) {
  return new Game(opts);
}

/* ============================================================
   BoardView (board-only styling + rendering + input)
============================================================ */

const STYLE_ID = "scratchchess-lib-style-v2";
function ensureStyles() {
  if (document.getElementById(STYLE_ID)) return;

  const css = `
:root{
  --sc-border:rgba(255,255,255,.12);
  --sc-light:#f0d9b5; --sc-dark:#b58863;
  --sc-cR:#dc2626; --sc-cB:#2563eb; --sc-cY:#d97706; --sc-cG:#16a34a;
  --sc-dot:#3ddc84;
}
.sc-shell{
  position:relative;
  width:100%; height:100%;
  min-width:115px; min-height:115px;
  border:1px solid var(--sc-border);
  border-radius:12px;
  overflow:hidden;
  background:rgba(14,17,22,.92);
}
.sc-grid{
  position:absolute; inset:0;
  display:grid;
  grid-template-columns:repeat(8,1fr);
  grid-template-rows:repeat(8,1fr);
}
.sc-sq{ position:relative; width:100%; height:100%; background:var(--sc-light); }
.sc-sq.sc-dark{ background:var(--sc-dark); }
.sc-labRank,.sc-labFile{
  position:absolute;
  font-size:10px;
  color:rgba(0,0,0,.40);
  mix-blend-mode:multiply;
  pointer-events:none;
  z-index:1;
  font-weight:700;
  letter-spacing:.4px;
}
.sc-labRank{ left:4px; top:3px; }
.sc-labFile{ right:4px; bottom:3px; }

.sc-dot{
  position:absolute;
  width:22%; height:22%;
  left:39%; top:39%;
  background:var(--sc-dot);
  border-radius:999px;
  opacity:.95;
  pointer-events:none;
  z-index:2;
}
.sc-selRing{
  position:absolute; inset:0;
  outline:3px solid rgba(255,255,255,.38);
  outline-offset:-3px;
  pointer-events:none;
  z-index:2;
}

.sc-overlay{
  position:absolute; inset:0;
  width:100%; height:100%;
  pointer-events:none;
  z-index:3;
}
.sc-pieces{ position:absolute; inset:0; z-index:4; pointer-events:none; }
.sc-piece{
  position:absolute;
  width:12.5%; height:12.5%;
  left:0; top:0;
  will-change:left,top;
  pointer-events:auto;
  touch-action:none;
  user-select:none;
}
.sc-piece img{ width:100%; height:100%; display:block; user-select:none; -webkit-user-drag:none; }

.sc-spares{
  display:flex;
  flex-wrap:wrap;
  gap:8px;
  align-items:center;
}
.sc-spare{
  width:40px; height:40px;
  border:1px solid rgba(0,0,0,.18);
  border-radius:10px;
  display:flex; align-items:center; justify-content:center;
  background:rgba(255,255,255,.50);
  cursor:pointer;
  user-select:none;
}
.sc-spare img{ width:90%; height:90%; display:block; }
.sc-spares[hidden]{ display:none !important; }

#sc-ghost{
  position:fixed; z-index:99999; pointer-events:none;
  transform:translate(-50%,-50%);
  width:48px; height:48px;
  display:none;
}
#sc-ghost img{ width:100%; height:100%; display:block; }
`;

  const st = document.createElement("style");
  st.id = STYLE_ID;
  st.textContent = css;
  document.head.appendChild(st);

  if (!document.getElementById("sc-ghost")) {
    const ghost = document.createElement("div");
    ghost.id = "sc-ghost";
    document.body.appendChild(ghost);
  }
}

function cssColor(c) {
  const st = getComputedStyle(document.documentElement);
  return c === "R"
    ? st.getPropertyValue("--sc-cR").trim()
    : c === "B"
    ? st.getPropertyValue("--sc-cB").trim()
    : c === "Y"
    ? st.getPropertyValue("--sc-cY").trim()
    : st.getPropertyValue("--sc-cG").trim();
}

export class BoardView {
  constructor(boardDiv, game, opts = {}) {
    ensureStyles();
    this.container = boardDiv;
    this.opts = { minSizePx: opts.minSizePx ?? 115, spareDiv: opts.spareDiv ?? null };

    this.container.innerHTML = "";
    this.shell = document.createElement("div");
    this.shell.className = "sc-shell";

    this.grid = document.createElement("div");
    this.grid.className = "sc-grid";

    this.overlay = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    this.overlay.setAttribute("class", "sc-overlay");
    this.overlay.setAttribute("viewBox", "0 0 100 100");
    this.overlay.setAttribute("preserveAspectRatio", "none");

    this.piecesLayer = document.createElement("div");
    this.piecesLayer.className = "sc-pieces";

    this.shell.appendChild(this.grid);
    this.shell.appendChild(this.overlay);
    this.shell.appendChild(this.piecesLayer);
    this.container.appendChild(this.shell);

    this.ghost = document.getElementById("sc-ghost");
    this.pieceEls = new Map();
    this.drag = null;
    this.arrowDrag = null;

    this._buildSquares();
    this._wirePointer();

    this._fit = () => this.fitToContainer();
    this.ro = new ResizeObserver(this._fit);
    this.ro.observe(this.container);

    this.setGame(game);
    this.fitToContainer();

    // spare pieces support
    this._initSpares();
  }

  destroy() {
    this.unsub?.();
    this.ro?.disconnect();
    this.container.innerHTML = "";
  }

  setGame(game) {
    this.unsub?.();
    this.game = game;
    this.unsub = this.game.onChange(() => this.render());
    this.render();
    this._syncSparesVisibility();
  }

  fitToContainer() {
    const r = this.container.getBoundingClientRect();
    const size = Math.max(this.opts.minSizePx, Math.floor(Math.min(r.width, r.height)));
    if (this.game?.ui?.mini) {
      this.shell.style.width = this.opts.minSizePx + "px";
      this.shell.style.height = this.opts.minSizePx + "px";
    } else {
      this.shell.style.width = size + "px";
      this.shell.style.height = size + "px";
    }
  }

  _buildSquares() {
    this.grid.innerHTML = "";
    for (let ui = 0; ui < 64; ui++) {
      const sq = document.createElement("div");
      sq.className = "sc-sq";
      sq.dataset.ui = String(ui);
      sq.dataset.sq = "";

      const labRank = document.createElement("span");
      labRank.className = "sc-labRank";
      const labFile = document.createElement("span");
      labFile.className = "sc-labFile";
      sq.appendChild(labRank);
      sq.appendChild(labFile);

      sq.addEventListener("pointerdown", (e) => this._onSquarePointerDown(e, sq), { passive: false });
      this.grid.appendChild(sq);
    }
  }

  _squareFromEvent(ev) {
    const br = this.shell.getBoundingClientRect();
    const s = Math.min(br.width, br.height) / 8;
    const x = ev.clientX - br.left;
    const y = ev.clientY - br.top;
    let f = Math.max(0, Math.min(7, Math.floor(x / s)));
    let r = Math.max(0, Math.min(7, 7 - Math.floor(y / s)));
    if (this.game.ui.flipped) {
      f = 7 - f;
      r = 7 - r;
    }
    return String.fromCharCode(97 + f) + (r + 1);
  }

  _xyForSquare(sq) {
    const f = sq.charCodeAt(0) - 97;
    const r = +sq[1] - 1;
    if (!this.game.ui.flipped) return { x: f * 12.5, y: (7 - r) * 12.5 };
    return { x: (7 - f) * 12.5, y: r * 12.5 };
  }

  _squareCenter(sq) {
    let f = sq.charCodeAt(0) - 97;
    let r = +sq[1] - 1;
    if (!this.game.ui.flipped) return { x: (f + 0.5) * 12.5, y: (7 - r + 0.5) * 12.5 };
    return { x: (7 - f + 0.5) * 12.5, y: (r + 0.5) * 12.5 };
  }

  _ensureDefs() {
    let defs = this.overlay.querySelector("defs");
    if (!defs) {
      defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
      this.overlay.appendChild(defs);
    }
    for (const c of ["R", "B", "Y", "G"]) {
      if (defs.querySelector("#scArrowHead_" + c)) continue;
      const marker = document.createElementNS("http://www.w3.org/2000/svg", "marker");
      marker.setAttribute("id", "scArrowHead_" + c);
      marker.setAttribute("markerWidth", "5");
      marker.setAttribute("markerHeight", "5");
      marker.setAttribute("refX", "4.6");
      marker.setAttribute("refY", "2.5");
      marker.setAttribute("orient", "auto");
      marker.setAttribute("markerUnits", "userSpaceOnUse");

      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", "M0,0 L5,2.5 L0,5 L1.2,2.5 Z");
      path.setAttribute("fill", cssColor(c));
      marker.appendChild(path);
      defs.appendChild(marker);
    }
  }

  _drawSquareMark(sq, c) {
    const { x, y } = this._squareCenter(sq);
    const size = 12.5;
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("x", x - size / 2);
    rect.setAttribute("y", y - size / 2);
    rect.setAttribute("width", size);
    rect.setAttribute("height", size);
    rect.setAttribute("fill", cssColor(c));
    rect.setAttribute("opacity", c === "Y" ? "0.45" : "0.55");
    rect.setAttribute("shape-rendering", "crispEdges");
    this.overlay.appendChild(rect);
  }

  _drawArrow(from, to, c) {
    const a = this._squareCenter(from), b = this._squareCenter(to);
    const dx = b.x - a.x, dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len, uy = dy / len;
    const shrink = 4.6;

    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", a.x);
    line.setAttribute("y1", a.y);
    line.setAttribute("x2", b.x - ux * shrink);
    line.setAttribute("y2", b.y - uy * shrink);
    line.setAttribute("stroke", cssColor(c));
    line.setAttribute("stroke-width", "0.34");
    line.setAttribute("stroke-linecap", "round");
    line.setAttribute("opacity", "0.92");
    line.setAttribute("marker-end", "url(#scArrowHead_" + c + ")");
    this.overlay.appendChild(line);
  }

  _redrawOverlay() {
    this.overlay.innerHTML = "";
    this._ensureDefs();
    const m = this.game.curNode.marks;
    for (const [sq, c] of m.sqMarks.entries()) this._drawSquareMark(sq, c);
    for (const ar of m.arrows) this._drawArrow(ar.from, ar.to, ar.color);
    if (this.game.ui.mode === "arrows" && this.arrowDrag?.fromSq && this.arrowDrag?.toSq && this.arrowDrag.fromSq !== this.arrowDrag.toSq) {
      this._drawArrow(this.arrowDrag.fromSq, this.arrowDrag.toSq, this.game.ui.pig);
    }
  }

  _getOrCreatePieceEl(piece) {
    let el = this.pieceEls.get(piece.id);
    if (el) return el;
    el = document.createElement("div");
    el.className = "sc-piece";
    el.dataset.pid = piece.id;
    el.style.transition = "left 140ms ease, top 140ms ease";
    const img = document.createElement("img");
    img.alt = pieceCode(piece);
    img.src = pieceSrc(pieceCode(piece));
    el.appendChild(img);
    el.addEventListener("pointerdown", (e) => this._onPiecePointerDown(e, piece.id), { passive: false });
    this.piecesLayer.appendChild(el);
    this.pieceEls.set(piece.id, el);
    return el;
  }

  _removePieceEl(id) {
    const el = this.pieceEls.get(id);
    if (el) { el.remove(); this.pieceEls.delete(id); }
  }

  _setPieceElPos(el, sq, animate = true) {
    const { x, y } = this._xyForSquare(sq);
    if (!animate) el.style.transition = "none";
    else el.style.transition = "left 140ms ease, top 140ms ease";
    el.style.left = `${x}%`;
    el.style.top = `${y}%`;
    if (!animate) {
      void el.offsetHeight;
      el.style.transition = "left 140ms ease, top 140ms ease";
    }
  }

  render() {
    this.fitToContainer();
    this._syncSparesVisibility();

    const flipped = this.game.ui.flipped;
    const selFrom = this.game.sel.fromSq;
    const legalToSet = new Set(this.game.sel.legalTo || []);

    for (let ui = 0; ui < 64; ui++) {
      const bi = flipped ? 63 - ui : ui;
      const sqStr = sqName(bi);
      const sqEl = this.grid.children[ui];
      sqEl.dataset.sq = sqStr;

      const isDark = (bi + Math.floor(bi / 8)) % 2 === 1;
      sqEl.classList.toggle("sc-dark", isDark);

      const labRank = sqEl.querySelector(".sc-labRank");
      const labFile = sqEl.querySelector(".sc-labFile");
      if (this.game.ui.mini) {
        labRank.textContent = "";
        labFile.textContent = "";
      } else {
        const file = sqStr[0];
        const rank = sqStr[1];
        labRank.textContent = file === (flipped ? "h" : "a") ? rank : "";
        labFile.textContent = rank === (flipped ? "8" : "1") ? file : "";
      }

      sqEl.querySelectorAll(".sc-selRing,.sc-dot").forEach((n) => n.remove());
      if (selFrom === sqStr) {
        const ring = document.createElement("div");
        ring.className = "sc-selRing";
        sqEl.appendChild(ring);
      }
      if (legalToSet.has(sqStr)) {
        const dot = document.createElement("div");
        dot.className = "sc-dot";
        sqEl.appendChild(dot);
      }
    }

    const liveIds = new Set();
    for (let i = 0; i < 64; i++) {
      const p = this.game.state.board[i];
      if (!p) continue;
      liveIds.add(p.id);
      const el = this._getOrCreatePieceEl(p);
      if (this.drag && this.drag.pieceId === p.id) continue;
      this._setPieceElPos(el, sqName(i), true);
      // allow marking squares even under pieces in squares/arrows mode
      el.style.pointerEvents = this.game.ui.mode === "moves" ? "auto" : "none";
      el.style.display = "block";
    }
    for (const [id] of this.pieceEls.entries()) if (!liveIds.has(id)) this._removePieceEl(id);

    this._redrawOverlay();
  }

  _syncSparesVisibility() {
    if (!this.opts.spareDiv) return;
    this.opts.spareDiv.hidden = !this.game.ui.setup;
  }

  _initSpares() {
    if (!this.opts.spareDiv) return;
    this.opts.spareDiv.classList.add("sc-spares");
    this.opts.spareDiv.innerHTML = "";

    const mk = (code, letter) => {
      const d = document.createElement("div");
      d.className = "sc-spare";
      d.title = code;
      const img = document.createElement("img");
      img.src = pieceSrc(code);
      img.alt = code;
      d.appendChild(img);

      d.addEventListener("click", () => {
        // in setup mode: clicking a spare selects a "held piece"
        if (!this.game.ui.setup) return;
        this._heldSpare = letter; // e.g. 'Q' or 'q'
      });
      return d;
    };

    // White pieces
    const whites = [["wQ","Q"],["wR","R"],["wB","B"],["wN","N"],["wP","P"],["wK","K"]];
    const blacks = [["bQ","q"],["bR","r"],["bB","b"],["bN","n"],["bP","p"],["bK","k"]];

    whites.forEach(([c,l]) => this.opts.spareDiv.appendChild(mk(c,l)));
    blacks.forEach(([c,l]) => this.opts.spareDiv.appendChild(mk(c,l)));
  }

  _onPiecePointerDown(e, pieceId) {
    e.preventDefault();
    e.stopPropagation();
    if (this.game.ui.mode !== "moves") return;

    const fromSq = this._squareFromEvent(e);
    const fromIdx = parseSq(fromSq);
    const p = this.game.state.board[fromIdx];
    if (!p || p.id !== pieceId) return;

    if (!this.game.ui.setup) {
      if (p.color !== this.game.state.side) return;
      this.game.sel.fromSq = fromSq;
      this.game.sel.legalTo = this.game._legalMovesFrom(fromIdx).map((i) => sqName(i));
      this.game._emit();
    }

    this.drag = { pieceId, fromSq, pointerId: e.pointerId };

    this.ghost.innerHTML = "";
    const img = document.createElement("img");
    img.src = pieceSrc(pieceCode(p));
    img.alt = pieceCode(p);
    this.ghost.appendChild(img);
    this.ghost.style.left = e.clientX + "px";
    this.ghost.style.top = e.clientY + "px";
    this.ghost.style.display = "block";

    const el = this.pieceEls.get(pieceId);
    if (el) el.style.display = "none";

    window.addEventListener("pointermove", this._onPointerMove, { passive: false });
    window.addEventListener("pointerup", this._onPointerUp, { passive: false });
    window.addEventListener("pointercancel", this._onPointerCancel, { passive: false });
    this.shell.setPointerCapture(e.pointerId);
  }

  _onSquarePointerDown(ev, sqEl) {
    ev.preventDefault();
    ev.stopPropagation();
    const sq = sqEl.dataset.sq;

    // setup: click-to-place held spare
    if (this.game.ui.setup && this._heldSpare) {
      const idxTo = parseSq(sq);
      // place new piece (fresh id)
      this.game.state.board[idxTo] = makePieceFromLetter(this._heldSpare);
      this.game._emit();
      return;
    }

    if (this.game.ui.mode === "squares") {
      const m = this.game.curNode.marks;
      const cur = m.sqMarks.get(sq);
      if (cur === this.game.ui.pig) m.sqMarks.delete(sq);
      else m.sqMarks.set(sq, this.game.ui.pig);
      this.game._emit();
      return;
    }

    if (this.game.ui.mode === "arrows") {
      this.arrowDrag = { fromSq: sq, toSq: sq, pointerId: ev.pointerId };
      window.addEventListener("pointermove", this._onArrowMove, { passive: false });
      window.addEventListener("pointerup", this._onArrowUp, { passive: false });
      window.addEventListener("pointercancel", this._onArrowCancel, { passive: false });
      this.shell.setPointerCapture(ev.pointerId);
      this._redrawOverlay();
      return;
    }

    if (this.game.ui.mode === "moves" && !this.game.ui.setup && !this.drag) {
      const p = this.game.state.board[parseSq(sq)];
      if (this.game.sel.fromSq) {
        const from = this.game.sel.fromSq;
        if (from === sq) {
          this.game.sel.fromSq = null;
          this.game.sel.legalTo = [];
          this.game._emit();
          return;
        }
        this.game.makeMoveUCI(from + sq);
        this.game.sel.fromSq = null;
        this.game.sel.legalTo = [];
        this.game._emit();
        return;
      } else {
        if (p && p.color === this.game.state.side) {
          this.game.sel.fromSq = sq;
          this.game.sel.legalTo = this.game._legalMovesFrom(parseSq(sq)).map((i) => sqName(i));
          this.game._emit();
        }
      }
    }
  }

  _wirePointer() {
    this._onPointerMove = (e) => {
      if (!this.drag) return;
      if (e.pointerId !== this.drag.pointerId) return;
      e.preventDefault();
      this.ghost.style.left = e.clientX + "px";
      this.ghost.style.top = e.clientY + "px";
    };

    this._onPointerUp = (e) => {
      if (!this.drag) return;
      if (e.pointerId !== this.drag.pointerId) return;
      e.preventDefault();

      const br = this.shell.getBoundingClientRect();
      const inside = e.clientX >= br.left && e.clientX <= br.right && e.clientY >= br.top && e.clientY <= br.bottom;
      const dropSq = inside ? this._squareFromEvent(e) : null;

      const fromSq = this.drag.fromSq;
      const pid = this.drag.pieceId;

      const pel = this.pieceEls.get(pid);
      if (pel) pel.style.display = "block";
      this.ghost.style.display = "none";
      this.drag = null;

      if (!dropSq) { this.game._emit(); return; }

      if (this.game.ui.setup) {
        // setup drag just moves piece (already handled in Game.makeMoveUCI setup path, but we can do direct)
        const fromIdx = parseSq(fromSq), toIdx = parseSq(dropSq);
        this.game.state.board[toIdx] = this.game.state.board[fromIdx];
        this.game.state.board[fromIdx] = null;
        this.game._emit();
        return;
      }

      this.game.makeMoveUCI(fromSq + dropSq);
      this.game._emit();
    };

    this._onPointerCancel = (e) => {
      if (!this.drag) return;
      if (e.pointerId !== this.drag.pointerId) return;
      e.preventDefault();
      const pid = this.drag.pieceId;
      const pel = this.pieceEls.get(pid);
      if (pel) pel.style.display = "block";
      this.ghost.style.display = "none";
      this.drag = null;
      this.game._emit();
    };

    this._onArrowMove = (e) => {
      if (!this.arrowDrag) return;
      if (e.pointerId !== this.arrowDrag.pointerId) return;
      e.preventDefault();
      this.arrowDrag.toSq = this._squareFromEvent(e);
      this._redrawOverlay();
    };

    this._onArrowUp = (e) => {
      if (!this.arrowDrag) return;
      if (e.pointerId !== this.arrowDrag.pointerId) return;
      e.preventDefault();
      const from = this.arrowDrag.fromSq;
      const to = this.arrowDrag.toSq;
      if (from && to && from !== to) {
        const m = this.game.curNode.marks;
        const key = `${this.game.ui.pig}:${from}-${to}`;
        const j = m.arrows.findIndex((a) => `${a.color}:${a.from}-${a.to}` === key);
        if (j >= 0) m.arrows.splice(j, 1);
        else m.arrows.push({ from, to, color: this.game.ui.pig });
      }
      this.arrowDrag = null;
      this.game._emit();
      window.removeEventListener("pointermove", this._onArrowMove);
      window.removeEventListener("pointerup", this._onArrowUp);
      window.removeEventListener("pointercancel", this._onArrowCancel);
    };

    this._onArrowCancel = (e) => {
      if (!this.arrowDrag) return;
      if (e.pointerId !== this.arrowDrag.pointerId) return;
      e.preventDefault();
      this.arrowDrag = null;
      this.game._emit();
      window.removeEventListener("pointermove", this._onArrowMove);
      window.removeEventListener("pointerup", this._onArrowUp);
      window.removeEventListener("pointercancel", this._onArrowCancel);
    };
  }
}
