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
//   - loadPGN(pgn)              (mainline SAN + [%csl]/[%cal] marks)
//   - exportPGN()               (with variations + marks)
//   - makeMoveUCI(uci)          ("e2e4" or "e7e8q")
//   - resolvePendingPromotion(letter)  ("Q","R","B","N")
//   - prevMove()
//   - nextMove()
//   - jumpToPly()
//   - deleteMoveFromHere()
//   - promoteVariationFromHere()
//   - clearMarks()
//   - setMode("moves"|"arrows"|"squares")
//   - setPigment("R"|"B"|"Y"|"G")
//   - toggleFlip([bool])
//   - toggleSetup([bool])
//   - toggleMini([bool])
//   - openingFromPGN()
//   - onChange(fn)->unsubscribe
//
// class BoardView
//   - constructor(boardDiv, game, opts?)
//       opts.spareDiv (optional) : a div to render "spare pieces" when in setup mode
//       opts.minSizePx (optional) : default 115
//   - setGame(game)
//   - destroy()
//
// Notes:
// - This library owns *board styling* (board grid, pieces, overlays, spare pieces).
// - Your HTML should only provide containers and wire buttons to exported methods.
// =======================================================

const PIECE_BASE = "https://commons.wikimedia.org/wiki/Special:FilePath/Chess_";
// Wikimedia pattern: Chess_[piece][l|d]t45.svg  (piece in {k,q,r,b,n,p}; l=white/light, d=black/dark)
const pieceSrc = (code) => {
  const color = code[0] === "w" ? "l" : "d";     // w->l, b->d
  const piece = String(code[1] || "p").toLowerCase(); // P->p, K->k, etc.
  return PIECE_BASE + piece + color + "t45.svg"; // e.g. Chess_kdt45.svg, Chess_plt45.svg
};

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
    fenAfter: null, // cached FEN after this node's move (root is initial position)
    ply: 0,
    marks: { sqMarks: new Map(), arrows: [] },
    comments: [],
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

function cqlPieceLinesFromFen(fen) {
  const parts = String(fen || "").trim().split(/\s+/);
  const placement = parts[0] || "8/8/8/8/8/8/8/8";
  const board = Array(64).fill(null);
  const map = { p: "p", n: "n", b: "b", r: "r", q: "q", k: "k" };
  let i = 0;

  for (const ch of placement) {
    if (ch === "/") continue;
    if (ch >= "1" && ch <= "8") i += ch.charCodeAt(0) - 48;
    else board[i++] = makePieceFromLetter(ch);
  }

  const whiteByRank = new Map();
  const blackNonKings = [];
  const kings = [];

  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const bi = idx(f, r);
      const p = board[bi];
      if (!p) continue;
      let L = map[p.type] || "?";
      if (p.color === "w") L = L.toUpperCase();
      const tok = L + sqName(bi);

      if (p.type === "k") {
        kings.push(tok);
      } else if (p.color === "w") {
        if (!whiteByRank.has(r)) whiteByRank.set(r, []);
        whiteByRank.get(r).push(tok);
      } else {
        blackNonKings.push(tok);
      }
    }
  }

  const out = [];

  const whiteRanks = Array.from(whiteByRank.keys()).sort((a, b) => a - b);
  if (whiteRanks.length && blackNonKings.length) {
    for (const r of whiteRanks) out.push(whiteByRank.get(r).join(" "));
  } else if (whiteRanks.length) {
    const merged = [];
    for (const r of whiteRanks) merged.push(...whiteByRank.get(r));
    out.push(merged.join(" "));
  }

  if (blackNonKings.length) out.push(blackNonKings.join(" "));

  kings.sort((a, b) => {
    const ak = a[0] === "k" ? 0 : 1;
    const bk = b[0] === "k" ? 0 : 1;
    return ak - bk;
  });
  for (const k of kings) out.push(k);

  return out;
}

function pgnHeaderValue(pgnObj, key) {
  for (const kv of (pgnObj && pgnObj.headers) || []) {
    if (!kv || kv.length < 2) continue;
    if (String(kv[0] || "") === key) return String(kv[1] || "");
  }
  return "";
}

function buildMultipleConditionCQLFromPGNs(pgnTexts) {
  const out = ["cql(quiet)", "{", "  initial"];

  for (const pgnText of pgnTexts) {
    const pgnObj = (typeof pgnText === "string") ? parsePgnFastInto(pgnText) : (pgnText || null);
    if (!pgnObj) continue;

    const label = pgnHeaderValue(pgnObj, "Event");
    const fen = pgnHeaderValue(pgnObj, "FEN") || pgnHeaderValue(pgnObj, "Fen") || pgnHeaderValue(pgnObj, "fen");
    const lines = cqlPieceLinesFromFen(fen);

    out.push("");
    out.push("  // " + label);
    out.push("  find quiet {");
    for (const line of lines) out.push("    " + line);
    out.push("    comment(" + JSON.stringify(label) + ")");
    out.push("  }");
  }

  out.push("}");
  return out.join("\n");
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
    this.mainlineFens = [];
    this._pendingPromotion = null;

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

  _rebuildMainlineFenCache() {
    // mainlineFens[ply] = FEN after that ply's move (ply 0 = root position)
    const out = [];
    let n = this.root;
    if (n && n.fenAfter) out[0] = n.fenAfter;
    while (n && n.children && n.children.length) {
      const c = n.children[n.mainChildIndex] || n.children[0];
      if (!c) break;
      if (c.fenAfter) out[c.ply] = c.fenAfter;
      n = c;
    }
    this.mainlineFens = out;
  }

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
    this.root.fenAfter = this.exportFEN();
    this._rebuildMainlineFenCache();

    this.sel.fromSq = null;
    this.sel.legalTo = [];
    this._pendingPromotion = null;
    this.state.pendingPromotion = null;
    this._emit();
  }

  initializePosition() {
    this.loadFEN("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
    // Standard start position: do NOT emit Setup/FEN tags.
    delete this.tags.Setup;
    delete this.tags.FEN;
  }

  clearMarks() {
    const m = this.curNode.marks;
    m.sqMarks.clear();
    m.arrows.length = 0;
    this._emit();
  }

  // Apply a FEN directly to internal state (no tags/tree reset, no emit).
  _applyFENToState(fen) {
    const parts = String(fen || "").trim().split(/\s+/);
    if (!parts.length) return;

    const placement = parts[0];
    this.state.board = Array(64).fill(null);
    let i = 0;
    for (const ch of placement) {
      if (ch === "/") continue;
      if (ch >= "1" && ch <= "8") i += ch.charCodeAt(0) - 48;
      else this.state.board[i++] = makePieceFromLetter(ch);
    }

    this.state.side = parts[1] === "b" ? "b" : "w";

    const cs = parts[2] || "-";
    this.state.castling = {
      K: cs.includes("K"),
      Q: cs.includes("Q"),
      k: cs.includes("k"),
      q: cs.includes("q"),
    };

    const ep = parts[3] || "-";
    this.state.ep = ep !== "-" && ep.length === 2 ? parseSq(ep) : null;

    this.state.halfmove = +(parts[4] || 0);
    this.state.fullmove = +(parts[5] || 1);
  }

  loadFEN(fen) {
    this._applyFENToState(fen);


    // If we loaded an arbitrary FEN (not necessarily the standard start), exportPGN should
    // emit [Setup "1"] and [FEN "..."] and movetext should end with "*".
    this.tags.Result = "*";
    this.tags.Setup = "1";
    // Canonicalize via exportFEN so whitespace/castling/ep normalization matches our engine.
    // (exportFEN reads from state, so do it after we've parsed the FEN into state.)
    this.tags.FEN = this.exportFEN();

    this.root = makeNode(null);
    this.root.ply = 0;
    this.curNode = this.root;
    this.initialSnap = snapshotFrom(this.state);
    this.root.fenAfter = this.exportFEN();
    this._rebuildMainlineFenCache();

    this.sel.fromSq = null;
    this.sel.legalTo = [];
    this._pendingPromotion = null;
    this.state.pendingPromotion = null;
    this._emit();
  }

  exportFEN() {
    const S = this.state;
    let out = "";
    for (let r = 7; r >= 0; r--) {
      let empty = 0;
      for (let f = 0; f < 8; f++) {
        const p = S.board[idx(f, r)];
        if (!p) empty++;
        else {
          if (empty) { out += empty; empty = 0; }
          const letterMap = { p: "p", n: "n", b: "b", r: "r", q: "q", k: "k" };
          let L = letterMap[p.type];
          if (p.color === "w") L = L.toUpperCase();
          out += L;
        }
      }
      if (empty) out += empty;
      if (r) out += "/";
    }
    const cs =
      (S.castling.K ? "K" : "") +
        (S.castling.Q ? "Q" : "") +
        (S.castling.k ? "k" : "") +
        (S.castling.q ? "q" : "") || "-";
    const ep = S.ep == null ? "-" : sqName(S.ep);
    return `${out} ${S.side} ${cs} ${ep} ${S.halfmove} ${S.fullmove}`;
  }

  _kingIndex(color) {
    return this.state.board.findIndex((p) => p && p.type === "k" && p.color === color);
  }

  _attacked(squareIndex, byColor) {
    const S = this.state;
    const [sf, sr] = FR(squareIndex);

    // pawn attacks
    if (byColor === "w") {
      for (const df of [-1, 1]) {
        const f = sf + df, r = sr - 1;
        if (inB(f, r)) {
          const p = S.board[idx(f, r)];
          if (p && p.color === "w" && p.type === "p") return true;
        }
      }
    } else {
      for (const df of [-1, 1]) {
        const f = sf + df, r = sr + 1;
        if (inB(f, r)) {
          const p = S.board[idx(f, r)];
          if (p && p.color === "b" && p.type === "p") return true;
        }
      }
    }

    // knights
    const knightD = [[1,2],[2,1],[-1,2],[-2,1],[1,-2],[2,-1],[-1,-2],[-2,-1]];
    for (const [df, dr] of knightD) {
      const f = sf + df, r = sr + dr;
      if (inB(f, r)) {
        const p = S.board[idx(f, r)];
        if (p && p.color === byColor && p.type === "n") return true;
      }
    }

    // kings
    for (let df=-1; df<=1; df++) for (let dr=-1; dr<=1; dr++) {
      if (!df && !dr) continue;
      const f = sf + df, r = sr + dr;
      if (inB(f, r)) {
        const p = S.board[idx(f, r)];
        if (p && p.color === byColor && p.type === "k") return true;
      }
    }

    // rooks/queens
    const ortho = [[1,0],[-1,0],[0,1],[0,-1]];
    for (const [df, dr] of ortho) {
      let f = sf + df, r = sr + dr;
      while (inB(f, r)) {
        const p = S.board[idx(f, r)];
        if (p) {
          if (p.color === byColor && (p.type === "r" || p.type === "q")) return true;
          break;
        }
        f += df; r += dr;
      }
    }

    // bishops/queens
    const diag = [[1,1],[1,-1],[-1,1],[-1,-1]];
    for (const [df, dr] of diag) {
      let f = sf + df, r = sr + dr;
      while (inB(f, r)) {
        const p = S.board[idx(f, r)];
        if (p) {
          if (p.color === byColor && (p.type === "b" || p.type === "q")) return true;
          break;
        }
        f += df; r += dr;
      }
    }
    return false;
  }

  _genPseudo(fromIdx, forAttack = false) {
    const S = this.state;
    const p = S.board[fromIdx];
    if (!p) return [];
    const t = p.type, color = p.color;
    const [f, r] = FR(fromIdx);
    const out = [];
    const dir = color === "w" ? 1 : -1;

    const push = (nf, nr) => {
      if (!inB(nf, nr)) return;
      const to = idx(nf, nr);
      const occ = S.board[to];
      if (!occ || occ.color !== color) out.push(to);
    };

    if (t === "p") {
      if (forAttack) {
        for (const df of [-1, 1]) {
          const nf = f + df, nr = r + dir;
          if (inB(nf, nr)) out.push(idx(nf, nr));
        }
        return out;
      }

      const r1 = r + dir;
      if (inB(f, r1)) {
        const to1 = idx(f, r1);
        if (!S.board[to1]) {
          out.push(to1);
          const startRank = color === "w" ? 1 : 6;
          if (r === startRank) {
            const r2 = r + 2 * dir;
            const to2 = idx(f, r2);
            if (inB(f, r2) && !S.board[to2]) out.push(to2);
          }
        }
      }

      for (const df of [-1, 1]) {
        const nf = f + df, nr = r + dir;
        if (!inB(nf, nr)) continue;
        const to = idx(nf, nr);
        const occ = S.board[to];
        if (occ && occ.color !== color) out.push(to);
        else if (S.ep != null && to === S.ep) out.push(to);
      }
      return out;
    }

    if (t === "n") {
      const D = [[1,2],[2,1],[-1,2],[-2,1],[1,-2],[2,-1],[-1,-2],[-2,-1]];
      for (const [df, dr] of D) push(f + df, r + dr);
      return out;
    }

    if (t === "k") {
      for (let df=-1; df<=1; df++) for (let dr=-1; dr<=1; dr++) {
        if (!df && !dr) continue;
        push(f + df, r + dr);
      }
      if (!forAttack) {
        const homeRank = color === "w" ? 0 : 7;
        const kingHome = idx(4, homeRank);
        if (fromIdx === kingHome && !this._attacked(kingHome, other(color))) {
          if (color === "w" ? S.castling.K : S.castling.k) {
            const f1 = idx(5, homeRank), g1 = idx(6, homeRank);
            if (!S.board[f1] && !S.board[g1] && !this._attacked(f1, other(color)) && !this._attacked(g1, other(color))) out.push(g1);
          }
          if (color === "w" ? S.castling.Q : S.castling.q) {
            const d1 = idx(3, homeRank), c1 = idx(2, homeRank), b1 = idx(1, homeRank);
            if (!S.board[d1] && !S.board[c1] && !S.board[b1] && !this._attacked(d1, other(color)) && !this._attacked(c1, other(color))) out.push(c1);
          }
        }
      }
      return out;
    }

    const sliders =
      ({ b:[[1,1],[1,-1],[-1,1],[-1,-1]], r:[[1,0],[-1,0],[0,1],[0,-1]], q:[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]] })[t] || [];

    for (const [df, dr] of sliders) {
      let nf = f + df, nr = r + dr;
      while (inB(nf, nr)) {
        const to = idx(nf, nr);
        const occ = S.board[to];
        if (occ) {
          if (occ.color !== color) out.push(to);
          break;
        }
        out.push(to);
        nf += df; nr += dr;
      }
    }
    return out;
  }

  _applyMoveRaw(fromIdx, toIdx, promoLetter /* "Q" etc */) {
    const S = this.state;
    const p = S.board[fromIdx];
    const t = p.type, color = p.color;
    const their = other(color);

    let capturedPiece = S.board[toIdx];
    let epCapture = false;
    let castle = false;
    let rookMove = null;

    // en passant
    if (t === "p" && S.ep != null && toIdx === S.ep && !S.board[toIdx]) {
      const [tf, tr] = FR(toIdx);
      const capSq = idx(tf, tr + (color === "w" ? -1 : 1));
      capturedPiece = S.board[capSq];
      S.board[capSq] = null;
      epCapture = true;
    }

    // castling rook hop
    if (t === "k") {
      const [ff, fr] = FR(fromIdx);
      const [tf, tr] = FR(toIdx);
      if (fr === tr && Math.abs(tf - ff) === 2) {
        castle = true;
        if (tf === 6) {
          const rookFrom = idx(7, fr), rookTo = idx(5, fr);
          S.board[rookTo] = S.board[rookFrom];
          S.board[rookFrom] = null;
          rookMove = { from: rookFrom, to: rookTo };
        } else if (tf === 2) {
          const rookFrom = idx(0, fr), rookTo = idx(3, fr);
          S.board[rookTo] = S.board[rookFrom];
          S.board[rookFrom] = null;
          rookMove = { from: rookFrom, to: rookTo };
        }
      }
    }

    S.board[toIdx] = S.board[fromIdx];
    S.board[fromIdx] = null;

    // promotion
    let promoApplied = null;
    if (t === "p") {
      const [, tr] = FR(toIdx);
      const last = color === "w" ? 7 : 0;
      if (tr === last) {
        const want = (promoLetter || "Q").toUpperCase();
        promoApplied = want;
        const map = { Q:"q", R:"r", B:"b", N:"n" };
        S.board[toIdx].type = map[want] || "q";
      }
    }

    // castling rights updates
    if (t === "k") {
      if (color === "w") { S.castling.K = false; S.castling.Q = false; }
      else { S.castling.k = false; S.castling.q = false; }
    }
    if (t === "r") {
      if (color === "w") {
        if (fromIdx === idx(0, 0)) S.castling.Q = false;
        if (fromIdx === idx(7, 0)) S.castling.K = false;
      } else {
        if (fromIdx === idx(0, 7)) S.castling.q = false;
        if (fromIdx === idx(7, 7)) S.castling.k = false;
      }
    }
    if (capturedPiece) {
      if (toIdx === idx(0, 0)) S.castling.Q = false;
      if (toIdx === idx(7, 0)) S.castling.K = false;
      if (toIdx === idx(0, 7)) S.castling.q = false;
      if (toIdx === idx(7, 7)) S.castling.k = false;
    }

    // ep square
    let newEp = null;
    if (t === "p") {
      const [ff, fr] = FR(fromIdx);
      const [tf, tr] = FR(toIdx);
      if (ff === tf && Math.abs(tr - fr) === 2) newEp = idx(tf, (fr + tr) / 2);
    }
    S.ep = newEp;

    S.halfmove = (t === "p" || capturedPiece) ? 0 : (S.halfmove + 1);
    S.side = their;
    if (S.side === "w") S.fullmove++;

    return {
      pieceId: p.id,
      pieceType: t,
      pieceColor: color,
      capturedId: capturedPiece?.id || null,
      promo: promoApplied,
      epCapture,
      castle,
      rookMove,
    };
  }

  _legalMovesFrom(fromIdx, sideOverride = null) {
    const S = this.state;
    const p = S.board[fromIdx];
    if (!p) return [];

    // If sideOverride is provided, treat that as "side to move" for legality generation.
    const side = sideOverride || S.side;
    if (p.color !== side) return [];

    const pseudo = this._genPseudo(fromIdx, false);
    const res = [];
    for (const toIdx of pseudo) {
      const snap = snapshotFrom(S);
      this._applyMoveRaw(fromIdx, toIdx, null);
      const k = this._kingIndex(p.color);
      const ok = k >= 0 && !this._attacked(k, other(p.color));
      restoreInto(S, snap);
      if (ok) res.push(toIdx);
    }
    return res;
  }

  _isInCheck(color) {
    const k = this._kingIndex(color);
    if (k < 0) return false;
    return this._attacked(k, other(color));
  }

  _allLegalMoves(color) {
    const out = [];
    for (let i = 0; i < 64; i++) {
      const p = this.state.board[i];
      if (!p || p.color !== color) continue;
      const tos = this._legalMovesFrom(i);
      for (const to of tos) out.push({ from: i, to });
    }
    return out;
  }

  _pieceSANLetter(type) {
    if (type === "p") return "";
    return type.toUpperCase();
  }

  _pieceById(id) {
    for (const p of this.state.board) if (p && p.id === id) return p;
    return null;
  }

  _disambiguation(fromIdx, toIdx, piece) {
    const t = piece.type;
    if (t === "p" || t === "k") return "";

    const color = piece.color;
    const others = [];
    for (let i = 0; i < 64; i++) {
      if (i === fromIdx) continue;
      const q = this.state.board[i];
      if (!q) continue;
      if (q.color !== color || q.type !== t) continue;
      const tos = this._legalMovesFrom(i, color);
      if (tos.includes(toIdx)) others.push(i);
    }
    if (!others.length) return "";

    const [ff, fr] = FR(fromIdx);
    const shareFile = others.some((i) => FR(i)[0] === ff);
    const shareRank = others.some((i) => FR(i)[1] === fr);

    let needFile = false, needRank = false;
    if (!shareFile) needFile = true;
    else if (!shareRank) needRank = true;
    else { needFile = true; needRank = true; }

    let s = "";
    if (needFile) s += files[ff];
    if (needRank) s += (fr + 1);
    return s;
  }

  _moveToSAN(fromIdx, toIdx, moveInfo, snapBeforeForDisambig) {
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
      san += this._disambiguationUsingSnapBefore(fromIdx, toIdx, snapBeforeForDisambig);
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
        // Always pause on promotion so UI / caller can choose piece.
        // We *preview* the pawn move to the last rank (as a pawn) without toggling side
        // or committing a PGN node, then wait for resolvePendingPromotion().
        const snapBefore = snapshotFrom(this.state);

        // preview move (no promotion applied, no turn/counters change)
        // handle capture (promotion can't be en-passant)
        this.state.board[toIdx] = this.state.board[fromIdx];
        this.state.board[fromIdx] = null;
        this.state.ep = null; // promotion move clears en-passant target
        this.state.halfmove = 0;

        this._pendingPromotion = { fromIdx, toIdx, snapBefore };
        this.state.pendingPromotion = { fromIdx, toIdx };
        this._emit();
        return true;
      }
    }

    this._finalizeMove(fromIdx, toIdx, promoLetter);
    return true;
  }

  resolvePendingPromotion(letter) {
    if (!this._pendingPromotion) throw new Error("pending promotion");
    const { fromIdx, toIdx, snapBefore } = this._pendingPromotion;
    const L = String(letter || "").toUpperCase();
    if (!"QRBN".includes(L)) throw new Error("invalid promotion piece");

    // We may be sitting in a preview state (pawn already on last rank).
    // Restore to the pre-move snapshot so _finalizeMove can apply the full move cleanly.
    if (snapBefore) restoreInto(this.state, snapBefore);

    this._finalizeMove(fromIdx, toIdx, L);
    return true;
  }

  promoteToQueen() { return this.resolvePendingPromotion("Q"); }
  promoteToRook() { return this.resolvePendingPromotion("R"); }
  promoteToBishop() { return this.resolvePendingPromotion("B"); }
  promoteToKnight() { return this.resolvePendingPromotion("N"); }

  _disambiguationUsingSnapBefore(fromIdx, toIdx, snapBefore) {
    // Disambiguation must be computed in the *pre-move* position, otherwise
   // the moved piece can block the destination square and hide ambiguity.
   if (!snapBefore) {
     const p = this.state.board[fromIdx];
     if (!p) return "";
      return this._disambiguation(fromIdx, toIdx, p);
   }

   const post = snapshotFrom(this.state);
   try {
    restoreInto(this.state, snapBefore);
      const p = this.state.board[fromIdx];
      if (!p) return "";
      return this._disambiguation(fromIdx, toIdx, p);
    } finally {
      restoreInto(this.state, post);
    }
  }

  _finalizeMove(fromIdx, toIdx, promoLetterOrNull) {
    const S = this.state;
    const snapBefore = snapshotFrom(S);
    const uci = sqName(fromIdx) + sqName(toIdx) + (promoLetterOrNull ? promoLetterOrNull.toLowerCase() : "");

    const moveInfo = this._applyMoveRaw(fromIdx, toIdx, promoLetterOrNull);
    const san = this._moveToSAN(fromIdx, toIdx, moveInfo, snapBefore);

    const parent = this.curNode;
    const node = makeNode(parent);
    node.san = san;
    node.uci = uci;
    node.moveInfo = moveInfo;
    node.snapBefore = snapBefore;
    node.ply = parent.ply + 1;
    node.fenAfter = this.exportFEN();

    parent.children.push(node);
    if (parent.children.length === 1) parent.mainChildIndex = 0;

    this.curNode = node;
    this.sel.fromSq = null;
    this.sel.legalTo = [];
    this._pendingPromotion = null;
    this.state.pendingPromotion = null;
    this._emit();
  }

  prevMove() {
    if (this.curNode === this.root) return false;
    const parent = this.curNode.parent;
    if (parent && parent.fenAfter) this._applyFENToState(parent.fenAfter);
    else if (this.initialSnap) restoreInto(this.state, this.initialSnap);
    this.curNode = parent;
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

    if (child.fenAfter) {
      this._applyFENToState(child.fenAfter);
    } else {
      // Fallback: replay move (should be rare; ensures we don't break older nodes)
      restoreInto(this.state, child.snapBefore);
      const fromIdx = parseSq(child.uci.slice(0, 2));
      const toIdx = parseSq(child.uci.slice(2, 4));
      const promo = child.uci.length >= 5 ? child.uci[4].toUpperCase() : null;
      this._applyMoveRaw(fromIdx, toIdx, promo || null);
      child.fenAfter = this.exportFEN();
      this._rebuildMainlineFenCache();
    }

    this.curNode = child;
    this.sel.fromSq = null;
    this.sel.legalTo = [];
    this._pendingPromotion = null;
    this.state.pendingPromotion = null;
    this._emit();
    return true;
  }

  // Jump to a mainline ply number (0 = root).
  // Uses cached mainlineFens when available.
  jumpToPly(n) {
    const target = Math.max(0, Math.floor(+n || 0));

    // Walk nodes along mainline to keep curNode consistent with the tree.
    let node = this.root;
    while (node && node.ply < target) {
      if (!node.children.length) break;
      node = node.children[node.mainChildIndex] || node.children[0];
    }
    if (!node) node = this.root;

    // Fast apply via cache (fallback to node.fenAfter)
    const fen = (this.mainlineFens && this.mainlineFens[target]) || node.fenAfter || this.root.fenAfter;
    if (fen) this._applyFENToState(fen);

    this.curNode = node;
    this.sel.fromSq = null;
    this.sel.legalTo = [];
    this._pendingPromotion = null;
    this.state.pendingPromotion = null;
    this._emit();
    return true;
  }

  deleteMoveFromHere() {
    if (this.curNode === this.root) return false;
    const parent = this.curNode.parent;
    const i = parent.children.indexOf(this.curNode);
    if (i >= 0) parent.children.splice(i, 1);
    if (parent.mainChildIndex >= parent.children.length)
      parent.mainChildIndex = Math.max(0, parent.children.length - 1);

    if (parent && parent.fenAfter) this._applyFENToState(parent.fenAfter);
    else if (this.initialSnap) restoreInto(this.state, this.initialSnap);
    this.curNode = parent;
    this._rebuildMainlineFenCache();
    this.sel.fromSq = null;
    this.sel.legalTo = [];
    this._pendingPromotion = null;
    this.state.pendingPromotion = null;
    this._rebuildMainlineFenCache();
    this._emit();
    return true;
  }

  promoteVariationFromHere() {
    if (this.curNode === this.root) return false;
    const parent = this.curNode.parent;
    const i = parent.children.indexOf(this.curNode);
    if (i < 0) return false;
    parent.mainChildIndex = i;
    this._rebuildMainlineFenCache();
    this._emit();
    return true;
  }



// --- CQL export (Query Mode) ---
// Current scope (for tests):
// - Only supported when ui.mode === "query"
// - Only supported for "FEN-only" trees (no moves): root has no children and curNode === root
// - Base query: one constraint per piece, like "pc7" or "Kh8"
// - Extra semantics: a blue square ("B") with a green arrow ("G") from that square to another means:
//     "<Piece><fromSq>" and "attacks <toSq>"
//   (single such pair supported for now)

exportCQL() {
  if (this.ui.mode !== "query") throw new Error("not implemented");
  const hasMoves = this.root.children && this.root.children.length > 0;
  if (hasMoves || this.curNode !== this.root) throw new Error("not implemented");

  const m = this.curNode.marks;

  // For now we only support:
  //   - no marks (encode the whole FEN position as constraints)
  //   - OR exactly one blue square + exactly one green arrow from that square
  // Anything else is "not implemented".
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

  const lines = [];

  if (m.sqMarks.size || m.arrows.length) {
    if (m.sqMarks.size !== 1 || m.arrows.length !== 1) throw new Error("not implemented");
    const [[fromSq, c]] = Array.from(m.sqMarks.entries());
    if (c !== "B") throw new Error("not implemented");
    const ar = m.arrows[0];
    if (ar.color !== "G") throw new Error("not implemented");
    if (String(ar.from) !== String(fromSq)) throw new Error("not implemented");

    const pl = pieceLineForSquare(String(fromSq));
    if (!pl) throw new Error("not implemented");

    // In "attacks" mode we only emit the selected piece + the attacks constraint,
    // NOT the full position.
    lines.push(pl);
    lines.push("attacks " + String(ar.to));
  } else {
    // Deterministic ordering: rank 1 -> 8, file a -> h.
    // This matches the tests and keeps diffs stable.
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const bi = idx(f, r);
        const p = this.state.board[bi];
        if (!p) continue;
        // In query exports, we omit the non-side-to-move king to match our test contract.
        if (p.type === "k" && p.color !== this.state.side) continue;
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


  // --- PGN I/O (same pragmatic import strategy as before) ---
  _buildMarksComment(node) {
    const m = node.marks;
    const csl = [];
    for (const [sq, c] of m.sqMarks.entries()) csl.push(c + sq);
    const cal = [];
    for (const a of m.arrows) cal.push(a.color + a.from + a.to);
    const out = [];
    if (csl.length) out.push(`[%csl ${csl.join(",")}]`);
    if (cal.length) out.push(`[%cal ${cal.join(",")}]`);

    const texts = (node.comments || []).map((t) => String(t || "").trim()).filter(Boolean);
    for (const t of texts) out.push(t);

    if (!out.length) return "";
    return "{ " + out.join(" ") + " }";
  }

  _applyCommentToNode(node, rawText) {
    if (!node) return;
    const text = String(rawText || "");
    if (!text.trim()) return;

    let rest = text;

    // Lichess-style square highlights: [%csl Ra1,Gb2]
    rest = rest.replace(/\[%csl\s+([^\]]+)\]/g, (_m, inner) => {
      const parts = String(inner || "").split(/\s*,\s*/).map((x) => x.trim()).filter(Boolean);
      for (const p of parts) {
        if (p.length < 3) continue;
        const c = p[0];
        const sq = p.slice(1, 3);
        if (!/^[RGBY]$/.test(c)) continue;
        if (!/^[a-h][1-8]$/.test(sq)) continue;
        node.marks.sqMarks.set(sq, c);
      }
      return "";
    });

    // Lichess-style arrows: [%cal Ge2e4,Rb1b8]
    rest = rest.replace(/\[%cal\s+([^\]]+)\]/g, (_m, inner) => {
      const parts = String(inner || "").split(/\s*,\s*/).map((x) => x.trim()).filter(Boolean);
      for (const p of parts) {
        if (p.length < 5) continue;
        const c = p[0];
        const from = p.slice(1, 3);
        const to = p.slice(3, 5);
        if (!/^[RGBY]$/.test(c)) continue;
        if (!/^[a-h][1-8]$/.test(from) || !/^[a-h][1-8]$/.test(to)) continue;
        node.marks.arrows.push({ color: c, from, to });
      }
      return "";
    });

    const cleaned = rest.replace(/\s+/g, " ").trim();
    if (cleaned) {
      if (!node.comments) node.comments = [];
      node.comments.push(cleaned);
    }
  }


  exportPGN() {
    const tags = [
      ["Event", this.tags.Event || ""],
      ["Site", this.tags.Site || ""],
      ["Date", this.tags.Date || ""],
      ["Round", this.tags.Round || "1"],
      ["White", this.tags.White || ""],
      ["Black", this.tags.Black || ""],
      ["Result", this.tags.Result || "*"],
    ];
    // PGN "Setup"/"FEN" headers are only emitted when we loaded a custom position.
    if (this.tags.Setup != null) tags.splice(6, 0, ["Setup", this.tags.Setup]);
    if (this.tags.FEN != null) tags.splice(7, 0, ["FEN", this.tags.FEN]);

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
        const cm = this._buildMarksComment(main);
        if (cm) s += cm + " ";

        cur.children.forEach((ch) => {
          if (ch === main) return;
          s += "(";
          const varSide = side;
          const varMoveNumber = moveNumber;
          s += (varSide === "w") ? (varMoveNumber + ". ") : (varMoveNumber + "... ");
          s += ch.san + " ";
          const cm2 = this._buildMarksComment(ch);
          if (cm2) s += cm2 + " ";
          s += walk(ch, varSide === "w" ? varMoveNumber : varMoveNumber + 1, other(varSide));
          s += ") ";
        });

        cur = main;
        side = other(side);
        if (side === "w") moveNumber++;
      }
      return s;
    };

    pgn += walk(this.root, 1, "w");
    pgn += this.tags.Result || "*";
    return pgn.trim();
  }

  loadPGN(pgnOrObj) {
    // Prefer PGNObject. If a raw string is provided, parse it via parsePgnFastInto().
    const pgnObj = (typeof pgnOrObj === "string") ? parsePgnFastInto(pgnOrObj) : (pgnOrObj || null);
    if (!pgnObj) return;

    // Build a simple tag map (last write wins) from ordered headers.
    const parsedTags = {};
    for (const kv of (pgnObj.headers || [])) {
      if (!kv || kv.length < 2) continue;
      const k = String(kv[0] || "");
      const v = String(kv[1] || "");
      if (k) parsedTags[k] = v;
    }

    const fen = parsedTags.FEN || parsedTags.Fen || parsedTags.fen || "";
    if (fen) this.loadFEN(fen);
    else this.initializePosition();

    // Re-apply PGN headers *after* loadFEN/initializePosition so we don't clobber tags like Result.
    for (const [k, v] of Object.entries(parsedTags)) {
      if (this.tags[k] != null) this.tags[k] = v;
    }

    const tokens = Array.isArray(pgnObj.moves) ? pgnObj.moves : [];
    let i = 0;

    // Comments are stored separately in PGNObject as {ply,text}. ply counts SAN tokens in token-stream order.
    const commentByPly = new Map();
    for (const c of (pgnObj.comments || [])) {
      if (!c) continue;
      const plyN = (c.ply == null) ? 0 : +c.ply;
      const t = String(c.text || "").trim();
      if (!t) continue;
      if (!commentByPly.has(plyN)) commentByPly.set(plyN, []);
      commentByPly.get(plyN).push(t);
    }

    let tokenPly = 0;
    const rootComments = commentByPly.get(0);
    if (rootComments && rootComments.length) {
      for (const t of rootComments) this._applyCommentToNode(this.root, t);
    }

    const parseSeq = () => {
      while (i < tokens.length) {
        const tok = tokens[i++];

        if (!tok) continue;
        if (tok.type === "rparen") return;

        if (tok.type === "lparen") {
          // Variation branches from the position before the last move.
          const savedNode = this.curNode;
          const savedSnap = snapshotFrom(this.state);

          const baseNode = this.curNode.parent || this.root;
          this.curNode = baseNode;
          if (baseNode && baseNode.fenAfter) this._applyFENToState(baseNode.fenAfter);
          else if (this.initialSnap) restoreInto(this.state, this.initialSnap);

          parseSeq();

          restoreInto(this.state, savedSnap);
          this.curNode = savedNode;
          continue;
        }

        if (tok.type === "moveNumber" || tok.type === "nag") continue;

        if (tok.type === "result") {
          const r = String(tok.value || "");
          if (r) this.tags.Result = r;
          continue;
        }

        if (tok.type !== "san") continue;
        const sanTok = String(tok.value || "").trim();
        if (!sanTok) continue;

        const mv = this._sanToMove(sanTok);
        if (!mv) break;
        const uci = sqName(mv.from) + sqName(mv.to) + (mv.promo ? mv.promo.toLowerCase() : "");
        const ok = this.makeMoveUCI(uci);
        if (!ok) break;
        if (this.state.pendingPromotion) this.resolvePendingPromotion(mv.promo || "Q");

        if (this.curNode && !this.curNode.fenAfter) this.curNode.fenAfter = this.exportFEN();

        tokenPly++;
        const cs = commentByPly.get(tokenPly);
        if (cs && cs.length) {
          for (const t of cs) this._applyCommentToNode(this.curNode, t);
        }
      }
    };

    parseSeq();
    this._rebuildMainlineFenCache();
    this._emit();
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

Game.prototype.MultipleConditionCQL = function (...games) {
  return buildMultipleConditionCQLFromPGNs(games);
};

export function createGame(opts) {
  //Kick off opening-table loading in the background (once per module).
  // This keeps game creation snappy while letting openingFromPGN() be ready ASAP.
  try { ensureOpeningLoadStarted(); } catch {}
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
  width:var(--sc-ghostSize,48px); height:var(--sc-ghostSize,48px);
  display:none;
}
#sc-ghost img{ width:100%; height:100%; display:block; }

.sc-promoOverlay{
  position:absolute;
  inset:0;
  display:flex;
  align-items:center;
  justify-content:center;
  background:rgba(0,0,0,.20);
  z-index:50;
}
.sc-promoBox{
  display:flex;
  flex-direction:column;
  gap:10px;
  padding:14px;
  border-radius:14px;
  background:rgba(255,255,255,.92);
  box-shadow:0 10px 30px rgba(0,0,0,.25);
}
.sc-promoBox button{
  font:600 14px/1.1 system-ui, -apple-system, Segoe UI, Roboto, Arial;
  padding:10px 14px;
  border-radius:12px;
  border:1px solid rgba(0,0,0,.18);
  background:rgba(255,255,255,.95);
  cursor:pointer;
}
.sc-promoBox button:active{ transform:translateY(1px); }
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

    // promotion chooser overlay (created once, shown when Game signals pendingPromotion)
    this.promoOverlay = document.createElement("div");
    this.promoOverlay.className = "sc-promoOverlay";
    this.promoOverlay.innerHTML = `
      <div class="sc-promoBox">
        <button data-piece="Q" title="Queen"><img alt="Q"></button>
        <button data-piece="R" title="Rook"><img alt="R"></button>
        <button data-piece="B" title="Bishop"><img alt="B"></button>
        <button data-piece="N" title="Knight"><img alt="N"></button>
      </div>`;
    this.promoOverlay.style.display = "none";
    this.promoOverlay.addEventListener("click", (ev) => {
      const btn = ev.target && ev.target.closest && ev.target.closest("button[data-piece]");
      if (!btn) return;
      const L = btn.getAttribute("data-piece");
      const pp = this.game.state.pendingPromotion;
      const pid = pp ? (this.game.state.board[pp.fromIdx]?.id || this._promoVisual?.pieceId) : null;
      try { this.game.resolvePendingPromotion(L); } catch {}
      // After resolving, keep it snapped (no slide) on the destination.
      if (pid) this._suppressAnimPieceId = pid;
      this._promoVisual = null;
      this._hidePromotionChooser();
    });
    this.container.appendChild(this.promoOverlay);
    this.pieceEls = new Map();
    this._suppressAnimPieceId = null;
    this._promoVisual = null;
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
  _showPromotionChooser() {
    if (!this.game?.state?.pendingPromotion) return;
    // Update icons to match side-to-move (the promoting pawn's color).
    const color = this.game.state.side === "w" ? "w" : "b";
    const map = { Q: "Q", R: "R", B: "B", N: "N" };
    for (const btn of this.promoOverlay.querySelectorAll('button[data-piece]')) {
      const L = btn.getAttribute("data-piece");
      const img = btn.querySelector("img");
      if (img) img.src = pieceSrc(color + map[L]);
    }
    this.promoOverlay.style.display = "flex";
  }

  _hidePromotionChooser() {
    this.promoOverlay.style.display = "none";
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
      {
      const wantSq = (this._promoVisual && this._promoVisual.pieceId === p.id) ? this._promoVisual.toSq : sqName(i);
      const animate = !(this._suppressAnimPieceId && this._suppressAnimPieceId === p.id);
      this._setPieceElPos(el, wantSq, animate);
    }
      // allow marking squares even under pieces in squares/arrows mode
      el.style.pointerEvents = this.game.ui.mode === "moves" ? "auto" : "none";
      el.style.display = "block";
    }
    for (const [id] of this.pieceEls.entries()) if (!liveIds.has(id)) this._removePieceEl(id);

    if (this.game.state.pendingPromotion) this._showPromotionChooser();
    else this._hidePromotionChooser();

    this._redrawOverlay();

    // one-shot animation suppression
    this._suppressAnimPieceId = null;
    if (!this.game.state.pendingPromotion) this._promoVisual = null;
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

    // Setup mode: tapping/clicking a piece deletes it (mobile-friendly).
    if (this.game.ui.setup) {
      this.game.state.board[fromIdx] = null;
      this.game._emit();
      return;
    }

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
    const br = this.shell.getBoundingClientRect();
    const sqPx = Math.min(br.width, br.height) / 8;
    this.ghost.style.setProperty("--sc-ghostSize", sqPx + "px");
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
        const fromIdx = parseSq(from);
        const pid2 = this.game.state.board[fromIdx]?.id;
        this.game.makeMoveUCI(from + sq);
        if (this.game.state.pendingPromotion && pid2) {
          this._promoVisual = { pieceId: pid2, toSq: sq };
          this._showPromotionChooser();
          this.game._emit();
        }
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
      // Keep the original piece hidden until we know whether we need to restore it.
      // This avoids a distracting "return to origin then slide" effect on drop.
      this.ghost.style.display = "none";
      this.drag = null;

      if (!dropSq) {
        if (pel) pel.style.display = "block";
        this.game._emit();
        return;
      }

      if (this.game.ui.setup) {
        // setup drag just moves piece (already handled in Game.makeMoveUCI setup path, but we can do direct)
        const fromIdx = parseSq(fromSq), toIdx = parseSq(dropSq);
        this.game.state.board[toIdx] = this.game.state.board[fromIdx];
        this.game.state.board[fromIdx] = null;
        this.game._emit();
        return;
      }

      // Suppress origin->destination slide for manual drops: snap instantly.
      this._suppressAnimPieceId = pid;

      const okMove = this.game.makeMoveUCI(fromSq + dropSq);
      if (!okMove) {
        if (pel) pel.style.display = "block";
        this.game._emit();
        return;
      }

      if (this.game.state.pendingPromotion) {
        // Visually place the pawn on the promotion square while waiting for user choice.
        this._promoVisual = { pieceId: pid, toSq: dropSq };
        this._showPromotionChooser();
        this.game._emit(); // re-render with promoVisual
      }

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
// opening_bag.js
// Bag-of-moves opening assignment from lichess TSV opening tables.
//
// Key format (stable + collision-safe):
//   whiteMovesSorted.join(UNIT_SEP) + "|" + blackMovesSorted.join(UNIT_SEP)
//
// Example: 1. e4 e6 2. d4 d5 3. Be3
//   => white=["e4","d4","Be3"] black=["e6","d5"]
//   => "Be3␟d4␟e4|d5␟e6"  (␟ is UNIT_SEP = \u001F)

const UNIT_SEP = "\u001F";

let OPENING_INDEX = new Map(); // key -> name (string)

// Canonicalize SAN-ish tokens so TSV + PGN produce byte-identical keys.
function canonSanToken(t) {
  return String(t)
    .replace(/\uFEFF/g, "")     // UTF-8 BOM / zero-width oddities
    .replace(/\u00A0/g, " ")    // NBSP -> space
    .trim()
    .normalize("NFC");
}

/** Binary-insert into sorted array of strings (keeps array sorted lexicographically). */
function binInsertSorted(arr, s) {
  let lo = 0, hi = arr.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (arr[mid] < s) lo = mid + 1;
    else hi = mid;
  }
  arr.splice(lo, 0, s);
}

/**
 * Minimal PGN preload object + fast one-pass forward parser.
 * PGNObject shape:
 *   {
 *     headers: Array<[string,string]>,          // ordered, duplicates preserved
 *     moves: Array<{type:string, value?:string, ply?:number}>,
 *     comments: Array<{ply:number, text:string}>
 *   }
 *
 * NOTE: This is intentionally shallow (no legality, no SAN validation, no tree).
 */
export function makePGNObject() {
  return { headers: [], moves: [], comments: [] };
}

// Split "1.e4" / "14...Nf6" tokens into [moveNumber, san] cheaply.
// Returns null if not a glued move-number token.
function splitGluedMoveNumber(tok) {
  if (!tok) return null;
  let j = 0;
  const n = tok.length;
  while (j < n) {
    const c = tok.charCodeAt(j);
    if (c < 48 || c > 57) break;
    j++;
  }
  if (j === 0 || j >= n || tok[j] !== ".") return null;

  // count dots
  let k = j;
  while (k < n && tok[k] === ".") k++;
  const dots = k - j;
  if (dots !== 1 && dots !== 3) return null;

  const moveNum = tok.slice(0, k); // "12." or "12..."
  const rest = tok.slice(k);
  if (!rest) return { moveNum, rest: "" };
  return { moveNum, rest };
}

export function parsePgnFastInto(pgnText, out = makePGNObject()) {
  // reset out in-place (caller can reuse objects to reduce GC)
  out.headers.length = 0;
  out.moves.length = 0;
  out.comments.length = 0;

  const s = String(pgnText ?? "");
  const n = s.length;

  let i = 0;
  let ply = 0;

  const ws = (c) => c === " " || c === "\t" || c === "\n" || c === "\r" || c === "\f";
  const skip = () => { while (i < n && ws(s[i])) i++; };

  const readUntil = (ch) => { const a = i; while (i < n && s[i] !== ch) i++; return s.slice(a, i); };
  const readToken = () => {
    const a = i;
    while (i < n) {
      const c = s[i];
      if (ws(c) || c === "{" || c === "}" || c === "(" || c === ")" || c === ";" || c === "[" || c === "]") break;
      i++;
    }
    return s.slice(a, i);
};

Game.prototype.__parsePgnFastIntoAndStore = function (pgnText) {
  const o = parsePgnFastInto(pgnText);
  this._lastPGNObject = o;

  // Compute a tiny "report" for table-driven tests (so tests don't depend on object equality).
  const map = {};
  for (const kv of (o.headers || [])) {
    if (kv && kv.length >= 2) map[String(kv[0] || "")] = String(kv[1] || "");
  }

  // Mainline SAN tokens (variations ignored) using the same extractor the opening index uses.
  const mainline = extractSanTokensFromPGN(o);

  const firstComment = (o.comments && o.comments.length) ? `${o.comments[0].ply}:${o.comments[0].text}` : "";

  this._lastParse = {
    headerEvent: map.Event || "",
    headerSite: map.Site || "",
    sanCount: mainline.length,
    firstSans: mainline.slice(0, 8).join(" "),
    firstComment,
  };
  return true;
};

  // ---- Headers at top: [Key "Value"] ----
  for (;;) {
    skip();
    if (s[i] !== "[") break;
    i++; skip();

    const k0 = i;
    while (i < n) {
      const c = s[i];
      if (ws(c) || c === "]" || c === '"') break;
      i++;
    }
    const key = s.slice(k0, i);
    skip();

    let val = "";
    if (s[i] === '"') {
      i++;
      let buf = "";
      while (i < n) {
        const c = s[i++];
        if (c === '"') break;
        if (c === "\\" && i < n) buf += s[i++]; // simple \" and \\
        else buf += c;
      }
      val = buf;
    }

    while (i < n && s[i] !== "]") i++;
    if (s[i] === "]") i++;

    out.headers.push([key, val]);
  }

  // ---- Movetext tokenization + comments ----
  while (i < n) {
    skip();
    if (i >= n) break;

    const c = s[i];

    if (c === "{") {
      i++;
      const text = readUntil("}");
      if (s[i] === "}") i++;
      out.comments.push({ ply, text: text.trim() });
      continue;
    }

    if (c === ";") {
      i++;
      const a = i;
      while (i < n && s[i] !== "\n" && s[i] !== "\r") i++;
      out.comments.push({ ply, text: s.slice(a, i).trim() });
      continue;
    }

    if (c === "(") { i++; out.moves.push({ type: "lparen", ply }); continue; }
    if (c === ")") { i++; out.moves.push({ type: "rparen", ply }); continue; }

    const tok = readToken();
    if (!tok) { i++; continue; }

    // Glued move numbers like "1.e4" or "14...Nf6"
    const glued = splitGluedMoveNumber(tok);
    if (glued && glued.moveNum) {
      out.moves.push({ type: "moveNumber", value: glued.moveNum });
      if (glued.rest) {
        const rest = glued.rest;
        if (rest === "1-0" || rest === "0-1" || rest === "1/2-1/2" || rest === "*") {
          out.moves.push({ type: "result", value: rest, ply });
        } else if (rest[0] === "$") {
          out.moves.push({ type: "nag", value: rest, ply });
        } else {
          out.moves.push({ type: "san", value: rest, ply });
          ply++;
        }
      }
      continue;
    }

    if (tok === "1-0" || tok === "0-1" || tok === "1/2-1/2" || tok === "*") {
      out.moves.push({ type: "result", value: tok, ply });
      continue;
    }

    if (tok.endsWith(".")) {
      let j = 0;
      while (j < tok.length) {
        const cc = tok.charCodeAt(j);
        if (cc < 48 || cc > 57) break;
        j++;
      }
      if (j > 0) { out.moves.push({ type: "moveNumber", value: tok }); continue; }
    }

    if (tok[0] === "$") { out.moves.push({ type: "nag", value: tok, ply }); continue; }

    out.moves.push({ type: "san", value: tok, ply });
    ply++;
  }

  return out;
}

export function extractSanTokensFromPGN(pgnObj) {
  if (!pgnObj || !pgnObj.moves) return [];
  const toks = [];
  let depth = 0;
  for (const t of pgnObj.moves) {
    if (!t) continue;
    if (t.type === "lparen") { depth++; continue; }
    if (t.type === "rparen") { if (depth > 0) depth--; continue; }
    if (depth !== 0) continue;
    if (t.type !== "san") continue;
    let v = canonSanToken(t.value);
    if (!v) continue;
    toks.push(v);
  }
  return toks;
}



/** Compute bag key from already-sorted arrays */
function makeKey(whiteSorted, blackSorted) {
  return `${whiteSorted.join(UNIT_SEP)}|${blackSorted.join(UNIT_SEP)}`;
}

/**
 * Parse a "pgn" cell from the TSV, e.g. "1. e4 e6 2. d4 d5 3. Be3"
 * into SAN tokens. This uses the same extractor as full PGN text.
 */
function extractSanTokensFromTsvPgnCell(pgnCell) {
  return extractSanTokensFromPGN(parsePgnFastInto(pgnCell));
}

/**
 * Load ./third_party/liopenings/{a,b,c,d,e}.tsv and build OPENING_INDEX.
 *
 */
async function loadOpeningTables({
  baseDir = "./third_party/liopenings",
  letters = ["a", "b", "c", "d", "e"],
  fetchFn = (typeof fetch !== "undefined" ? fetch.bind(globalThis) : null),
} = {}) {
  if (!fetchFn) {
    throw new Error("loadOpeningTables: no fetch() available; pass fetchFn for Node.");
  }

  const index = new Map();

  for (const L of letters) {
    const url = `${baseDir}/${L}.tsv`;
    const resp = await fetchFn(url);
    const text = await resp.text();

    const lines = text.split(/\r?\n/).filter(Boolean);
    if (!lines.length) continue;

    // Expect header: eco\tname\tpgn
    // We'll tolerate extra cols but only use first 3.
    const start = lines[0].toLowerCase().includes("eco") ? 1 : 0;

    for (let i = start; i < lines.length; i++) {
      const line = lines[i];
      const parts = line.split("\t");
      if (parts.length < 3) continue;

      const eco = parts[0].trim();
      const name = parts[1].trim();
      const pgnCell = parts.slice(2).join("\t").trim(); // just in case name contains tabs (rare)

      if (!name || !pgnCell) continue;

      const moves = extractSanTokensFromTsvPgnCell(pgnCell);
      if (!moves.length) continue;

      // Build bag by side and sort within side
      const w = [];
      const b = [];
      for (let ply = 0; ply < moves.length; ply++) {
        const m = moves[ply];
        if (ply % 2 === 0) w.push(m);
        else b.push(m);
      }
      w.sort();
      b.sort();

      const key = makeKey(w, b);

      // If duplicate keys occur, prefer the "more specific" label:
      // Heuristic: longer name wins; otherwise keep existing.
      if (!index.has(key)) {
        index.set(key, name);
      } else {
        const prev = index.get(key);
        if ((name.length || 0) > (prev.length || 0)) index.set(key, name);
      }

      // (eco currently unused; keep if you want to store ECO too)
      void eco;
    }
  }

  OPENING_INDEX = index;
  return { size: OPENING_INDEX.size };
}

// ---------------------------------------------------------------------------
// Openings: async load + readiness
// ---------------------------------------------------------------------------

let OPENING_LOAD_PROMISE = null;

function ensureOpeningLoadStarted({ basePath = "./third_party/liopenings/", files = ["a.tsv","b.tsv","c.tsv","d.tsv","e.tsv"] } = {}) {
  if (OPENING_LOAD_PROMISE) return OPENING_LOAD_PROMISE;
  OPENING_LOAD_PROMISE = loadOpeningTables({ basePath, files }).catch(() => ({ size: 0 }));
  return OPENING_LOAD_PROMISE;
}

async function waitForOpeningsReady(timeoutMs = 2000) {
  if (OPENING_INDEX && OPENING_INDEX.size > 0) return true;
  const p = ensureOpeningLoadStarted();
  const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error("openingFromPGN: opening tables not ready (timeout)")), timeoutMs));
  await Promise.race([p, timeout]);
  if (!OPENING_INDEX || OPENING_INDEX.size === 0) throw new Error("openingFromPGN: opening index is empty (load failed?)");
  return true;
}

/**
 * openingFromPGN(pgnText, { maxPlies=32, index=OPENING_INDEX })
 * - Tokenize moves
 * - Incrementally build sorted bags for White/Black
 * - After each ply, lookup key; keep the deepest hit; return best name (or "")
 */
async function openingFromPGN(pgnObj, { maxPlies = 32, index = null, timeoutMs = 2000 } = {}) {
  // Default to the module index. If it isn't ready yet, wait briefly (and/or kick off load).
  if (!index) {
    await waitForOpeningsReady(timeoutMs);
    index = OPENING_INDEX;
  }
  if (!index || index.size === 0) return "";
  const moves = extractSanTokensFromPGN(pgnObj);
  if (!moves.length) return "";

  const wSorted = [];
  const bSorted = [];

  let bestName = "";
  let plies = Math.min(moves.length, maxPlies);

  for (let ply = 0; ply < plies; ply++) {
    const m = moves[ply];
    if (ply % 2 === 0) binInsertSorted(wSorted, m);
    else binInsertSorted(bSorted, m);

    const key = makeKey(wSorted, bSorted);
    const hit = index.get(key);
    if (hit) bestName = hit;
  }

  return bestName;
}

// Game-method wrappers so table-driven harnesses can call these via ctx.g[fn].
Game.prototype.loadOpeningTables = async function (opts) {
  // If caller provides opts, use them; otherwise default path/files.
  const res = await loadOpeningTables(opts || {});
  // Keep background promise consistent.
  OPENING_LOAD_PROMISE = Promise.resolve(res);
  return res;
};

Game.prototype.openingFromPGN = async function (pgnText, opts) {
   const pgnObj = (typeof pgnText === "string") ? parsePgnFastInto(pgnText) : (pgnText || null);
   return await openingFromPGN(pgnObj, opts || {});
};
