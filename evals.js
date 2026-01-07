// evals.js
// Manual registry of eval functions.
// Designed to be loaded via: import('./evals.js')
// Exports:
//   - EVALS (named)
//   - default (same array)
//
// IMPORTANT: This file is intentionally dependency-free (no chess.js import).
// It provides VERY VERBOSE logging via an optional ctx argument.
//
// Each eval entry: { id, name, description, run(pgn, ctx?) -> string | {pgn, meta?} }
//
// In your HTML, call eval like:
//   const ctx = { log: (s)=>logLine('OK', s), warn:(s)=>..., err:(s)=>... };
//   const out = await entry.run(inputPgn, ctx);
import { Chess } from "./third_party/chess.js";


function nowStamp(){
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const da = String(d.getDate()).padStart(2,'0');
  return `${y}.${m}.${da}`;
}

function safeString(v){
  if (v === undefined) return 'undefined';
  if (v === null) return 'null';
  if (typeof v === 'string') return v;
  try { return JSON.stringify(v, null, 2); } catch { return String(v); }
}

function clip(s, max){
  const t = String(s ?? '');
  if (t.length <= max) return t;
  return t.slice(0, max) + `\n… (${t.length-max} more chars)`;
}

function logBlock(ctx, level, title, value, max=2000){
  const s = safeString(value);
  const prefix = `EVAL/${title} (${s.length} chars)`;
  const body = clip(s, max);
  const msg = `${prefix}\n${body}`;
  if (!ctx) return;
  if (level === 'warn') ctx.warn ? ctx.warn(msg) : ctx.log?.(msg);
  else if (level === 'err') ctx.err ? ctx.err(msg) : ctx.log?.(msg);
  else ctx.log?.(msg);
}

function hasHeader(pgn, key){
  const re = new RegExp(`^\\[${key}\\s+"[^"]*"\\]\\s*$`, 'm');
  return re.test(pgn);
}

function ensureHeaders(pgn, extraHeaders = {}){
  let txt = String(pgn ?? '').replace(/\r/g, '');

  // Detect any existing header line
  const hasAnyHeader = /^\s*\[[A-Za-z0-9_]+\s+"[^"]*"\]\s*$/m.test(txt);

  if (!hasAnyHeader){
    const block =
      `[Event "Priyome"]\n` +
      `[Site "Local"]\n` +
      `[Date "${nowStamp()}"]\n` +
      `[Round "?"]\n` +
      `[White "?"]\n` +
      `[Black "?"]\n` +
      `[Result "*"]\n\n`;
    txt = block + txt.trim();
  }

  if (!hasHeader(txt, 'Result')){
    // Insert Result before first header break, or prepend if can't find.
    const idx = txt.indexOf('\n\n');
    if (idx >= 0) txt = txt.slice(0, idx) + `\n[Result "*"]` + txt.slice(idx);
    else txt = `[Result "*"]\n` + txt;
  }

  // Apply/override extra headers
  for (const [k, v0] of Object.entries(extraHeaders)){
    const v = String(v0).replaceAll('"', '\\"');
    const line = `[${k} "${v}"]`;
    const re = new RegExp(`^\\[${k}\\s+"[^"]*"\\]\\s*$`, 'm');
    if (re.test(txt)) txt = txt.replace(re, line);
    else {
      const idx = txt.indexOf('\n\n');
      if (idx >= 0) txt = txt.slice(0, idx) + `\n${line}` + txt.slice(idx);
      else txt = line + '\n' + txt;
    }
  }

  // Normalize header/move separator
  txt = txt.replace(/\n{3,}/g, '\n\n');
  if (!/\n\n/.test(txt)) txt += '\n\n';

  return txt.trimEnd() + '\n';
}

function ensureTrailingResult(pgn){
  let txt = String(pgn ?? '').trim();

  // already ends with a result?
  if (/(1-0|0-1|1\/2-1\/2|\*)\s*$/.test(txt)) return txt + '\n';

  // use Result header if present
  const m = txt.match(/^\[Result\s+"([^"]+)"\]\s*$/m);
  const res = m ? m[1] : '*';
  return (txt + ' ' + res).trim() + '\n';
}

function stripEndResultToken(pgn){
  return String(pgn ?? '').replace(/\s+(1-0|0-1|1\/2-1\/2|\*)\s*$/,'').trim();
}

function insertDrawTagsNearStart(pgn, tags){
  // Inserts a draw-tag comment at ply 0 area (between headers and moves).
  const txt = String(pgn ?? '').replace(/\r/g, '');
  const insert = `{ ${tags} }\n\n`;

  const idx = txt.indexOf('\n\n');
  if (idx >= 0) return txt.slice(0, idx + 2) + insert + txt.slice(idx + 2);
  return insert + txt;
}

function insertCommentAfterPly1(pgn, comment){
  // Inserts comment after the first SAN token (usually "1. e4").
  const txt = String(pgn ?? '').replace(/\r/g, '');
  const re = /(1\.\s*\S+)(\s+)/;
  if (!re.test(txt)) return txt;
  return txt.replace(re, `$1 { ${comment} }$2`);
}

function insertCommentAfterMoveNumber(pgn, moveNo, comment){
  // Best-effort: after "N. <whiteMove> <blackMove>" group
  const txt = String(pgn ?? '').replace(/\r/g, '');
  const re = new RegExp(`(${moveNo}\\.\\s*\\S+(?:\\s+\\S+)?)`);
  if (!re.test(txt)) return txt;
  return txt.replace(re, `$1 { ${comment} }`);
}

async function mockMinorPieceEval(inputPgn, ctx){
  ctx?.log?.(`EVAL/mock: start`);
  logBlock(ctx, 'ok', 'mock/input', inputPgn, 3000);

  // 1) Normalize headers + set evaluator identification
  ctx?.log?.(`EVAL/mock: ensure headers`);
  let out = ensureHeaders(inputPgn, {
    Event: 'Evaluated (mock)',
    Annotator: 'Priyome eval: mockMinorPiece',
  });

  // 2) Avoid duplicate trailing results while we inject comments
  ctx?.log?.(`EVAL/mock: strip trailing result token (if any)`);
  out = stripEndResultToken(out);

  // 3) Guarantee at least one draw-tag comment (your UI expects this)
  ctx?.log?.(`EVAL/mock: add start-position draw tags`);
  out = insertDrawTagsNearStart(out, `[%csl Re4,Yd4] [%cal Ge2e4]`);

  // 4) Add a couple of human-ish comments
  ctx?.log?.(`EVAL/mock: add simple comments`);
  out = insertCommentAfterPly1(out, `mock: minor piece note — develop knights/bishops; avoid "knight on rim"`);
  out = insertCommentAfterMoveNumber(out, 2, `mock: watch minor-piece exchange — ask "who benefits from simplification?"`);

  // 5) Ensure it ends with a Result token
  ctx?.log?.(`EVAL/mock: ensure trailing Result`);
  out = ensureTrailingResult(out);

  // 6) Very basic sanity checks (helpful for your error log)
  ctx?.log?.(`EVAL/mock: sanity checks`);
  const hasCsl = /\[%csl\s+[^\]]+\]/.test(out);
  const hasCal = /\[%cal\s+[^\]]+\]/.test(out);
  ctx?.log?.(`EVAL/mock: has [%csl]=${hasCsl}  has [%cal]=${hasCal}`);
  if (!hasCsl && !hasCal){
    // This should never happen, but if it does you'll see it.
    ctx?.warn?.(`EVAL/mock: WARNING no draw tags found in output`);
  }

  logBlock(ctx, 'ok', 'mock/output', out, 6000);
  ctx?.log?.(`EVAL/mock: done (output ${out.length} chars)`);

  return out;
}

export const EVALS = [
  {
    id: 'mock',
    name: 'Mock minor-piece heuristic (verbose)',
    description: 'Returns a loadable PGN with [%csl]/[%cal] tags + a couple comments. Logs input/output via ctx.',
    run: mockMinorPieceEval,
  },
];

export default EVALS;
