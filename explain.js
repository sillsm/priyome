/*
 * explain.js
 * Predicate Chess deterministic trace-to-English projection.
 *
 * The explainer deliberately does not evaluate a chess position. It receives a
 * puzzle record and a bounded CTT/1 trace, preserves the trace's state changes,
 * and renders the same small training vocabulary every time:
 * OBSERVE, THREAT, REPLIES, COMPARE, CASH, PROVED, HORIZON, or GIVEUP.
 */

export const EXPLAIN_VERSION = "predicate-chess-explain/v1";
export const DEFAULT_EXPLAIN_TEST_URL = "https://priyomes.com/explain_test.txt";

const PIECE_NAMES = Object.freeze({
  p: "pawn", n: "knight", b: "bishop", r: "rook", q: "queen", k: "king"
});

const SECTION_ORDER = Object.freeze([
  "OBSERVE", "THREAT", "REPLIES", "COMPARE", "CASH", "PROVED", "HORIZON", "GIVEUP"
]);

function cleanSpace(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function stripTrailingPeriod(value) {
  return cleanSpace(value).replace(/[.]+$/, "");
}

function lowerFirst(value) {
  const text = cleanSpace(value);
  return text ? text[0].toLowerCase() + text.slice(1) : text;
}

function upperFirst(value) {
  const text = cleanSpace(value);
  return text ? text[0].toUpperCase() + text.slice(1) : text;
}

function splitTopLevel(value, separator = ",") {
  const text = String(value ?? "");
  const output = [];
  let start = 0;
  let round = 0;
  let square = 0;
  let curly = 0;
  let quote = "";
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quote) {
      if (char === quote && text[index - 1] !== "\\") quote = "";
      continue;
    }
    if (char === '"' || char === "'") { quote = char; continue; }
    if (char === "(") round += 1;
    else if (char === ")") round = Math.max(0, round - 1);
    else if (char === "[") square += 1;
    else if (char === "]") square = Math.max(0, square - 1);
    else if (char === "{") curly += 1;
    else if (char === "}") curly = Math.max(0, curly - 1);
    else if (char === separator && round === 0 && square === 0 && curly === 0) {
      output.push(text.slice(start, index).trim());
      start = index + 1;
    }
  }
  output.push(text.slice(start).trim());
  return output.filter(Boolean);
}

function parsePieceRef(raw) {
  const value = cleanSpace(raw);
  const match = value.match(/^([wb]?)([KQRBNPkqrbnp])@([a-h][1-8])$/);
  if (!match) return null;
  const explicitColor = match[1] || "";
  const letter = match[2];
  const type = letter.toLowerCase();
  return {
    raw: value,
    color: explicitColor || (letter === letter.toUpperCase() ? "" : "b"),
    type,
    name: PIECE_NAMES[type] || "piece",
    square: match[3]
  };
}

function piecePhrase(raw, { article = true } = {}) {
  const ref = parsePieceRef(raw);
  if (!ref) return cleanSpace(raw);
  return `${article ? "the " : ""}${ref.name} on ${ref.square}`;
}

function listEnglish(items) {
  const values = (items || []).map(cleanSpace).filter(Boolean);
  if (!values.length) return "";
  if (values.length === 1) return values[0];
  if (values.length === 2) return `${values[0]} and ${values[1]}`;
  return `${values.slice(0, -1).join(", ")}, and ${values.at(-1)}`;
}

function replacePieceRefs(value) {
  return String(value ?? "").replace(/\b[wb]?[KQRBNPkqrbnp]@[a-h][1-8]\b/g, (match) => piecePhrase(match));
}

function pieceNameFromLetter(letter) {
  return PIECE_NAMES[String(letter || "").toLowerCase()] || "piece";
}

function replaceExtendedPieceSyntax(value) {
  return String(value ?? "")
    .replace(/\b[wb]?([KQRBNPkqrbnp])@([a-h][1-8])x([a-h][1-8])\b/g,
      (_, piece, from, to) => `the ${pieceNameFromLetter(piece)} from ${from} can capture on ${to}`)
    .replace(/\b[wb]?([KQRBNPkqrbnp])@([a-h][1-8])-([a-h][1-8])([+#])?/g,
      (_, piece, from, to, suffix) => `${String(piece).toUpperCase()}${to}${suffix || ""}`)
    .replace(/\b[wb]?([KQRBNPkqrbnp])@([a-h])\?(?!\w)/g,
      (_, piece, file) => `a ${pieceNameFromLetter(piece)} on the ${file}-file`)
    .replace(/_candidate\b/g, "");
}

function replaceMoveNumbers(value) {
  return String(value ?? "")
    .replace(/\b\d+\.{1,3}(?=[KQRBNOa-h])/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function naturalizeFreeText(value) {
  let text = replaceMoveNumbers(replacePieceRefs(replaceExtendedPieceSyntax(value))).replace(/_/g, " ");
  const unary = [
    "captures", "capture", "attacks", "attack", "controls", "invites", "invite",
    "permits", "permit", "prepares", "prepare", "preserves", "preserve",
    "drives", "drive", "opens", "open", "blocks", "block", "removes",
    "remove", "threatens", "threaten", "allows", "allow", "wins", "win",
    "defends", "defend", "checks", "check", "forks", "fork", "pins", "pin"
  ];
  for (const verb of unary) {
    const re = new RegExp(`\\b${verb}\\(([^()]+)\\)`, "gi");
    text = text.replace(re, (_, arg) => `${verb} ${arg}`);
  }
  text = text
    .replace(/\bdecoys?\(([^,()]+),([^()]+)\)/gi, (_, a, b) => `decoys ${a} to ${b}`)
    .replace(/\b(?:legal reply classes|legal replies)\s*=\s*(\d+)/gi, "has $1 legal reply class$1")
    .replace(/\bhas 1 legal reply class1\b/gi, "has one legal reply")
    .replace(/\bhas (\d+) legal reply class\1\b/gi, "has $1 legal reply classes")
    .replace(/\bthe (pawn|knight|bishop|rook|queen|king) on ([a-h][1-8]) candidate\b/gi, "the $1 on $2")
    .replace(/\bBECAUSE\b/g, "because")
    .replace(/,(?=\S)/g, ", ")
    .replace(/\s+/g, " ")
    .trim();
  return text;
}

function parsePredicateCall(raw) {
  const text = cleanSpace(raw);
  const match = text.match(/^([a-zA-Z_][\w-]*)\((.*)\)$/);
  if (!match) return null;
  return { name: match[1], args: splitTopLevel(match[2]) };
}

function normalizePredicateName(value) {
  return String(value || "").trim().toLowerCase().replace(/-/g, "_");
}

function naturalizePredicate(raw) {
  const text = stripTrailingPeriod(raw);
  const call = parsePredicateCall(text);
  if (!call) {
    const free = naturalizeFreeText(text)
      .replace(/\bhas\s+diagonal\b/g, "has the diagonal")
      .replace(/\bcan\s+give\b/g, "can give");
    return /^(?:O-O(?:-O)?|[KQRBN][a-h1-8x=+#-])/i.test(free) ? free : lowerFirst(free);
  }

  const name = normalizePredicateName(call.name);
  const a = call.args;
  const one = (index = 0) => piecePhrase(a[index]);
  const bare = (index = 0) => piecePhrase(a[index], { article: false });
  const square = (index = 0) => cleanSpace(a[index]);
  const parseList = (index) => {
    const source = cleanSpace(a[index] || "").replace(/^\[/, "").replace(/\]$/, "");
    return splitTopLevel(source).map((item) => parsePieceRef(item) ? piecePhrase(item) : replacePieceRefs(item));
  };

  switch (name) {
    case "loose": return `${one()} is loose`;
    case "hanging": return `${one()} is hanging`;
    case "attacked":
    case "attacks": return `${one(0)} is attacked by ${one(1)}`;
    case "defenders": return `${one(0)} is defended by ${listEnglish(parseList(1)) || "no pieces"}`;
    case "defends": return `${one(0)} defends ${one(1)}`;
    case "sole_defender": return `${one(0)} is the sole defender of ${one(1)}`;
    case "shared_defender": return `${one(0)} is the shared defender of ${listEnglish(parseList(1))}`;
    case "overloaded": return `${one(0)} is overloaded by ${listEnglish(parseList(1))}`;
    case "alignment":
    case "align": return `${listEnglish(a.map((item) => {
      if (parsePieceRef(item)) return piecePhrase(item);
      if (/^[a-h][1-8]$/i.test(cleanSpace(item))) return `the ${cleanSpace(item)} square`;
      return naturalizeFreeText(item);
    }))} are aligned`;
    case "pin": return `${one(1)} is pinned by ${one(0)}${a[2] ? ` to ${one(2)}` : ""}`;
    case "skewer": return `${one(0)} skewers ${one(1)} to ${one(2)}`;
    case "fork":
    case "fork_available": {
      const targets = parseList(1);
      const mover = naturalizeFreeText(a[0]);
      return `${mover} forks ${listEnglish(targets)}`;
    }
    case "xray": return `${one(0)} x-rays ${one(2)} through ${one(1)}`;
    case "discovered_attack": return `${one(0)} has a discovered attack on ${one(2)} through ${one(1)}`;
    case "clearance": {
      const trajectory = cleanSpace(a[0] || "").match(/^[wb]?([KQRBNPkqrbnp])@([a-h][1-8])-([a-h][1-8])$/);
      if (trajectory) {
        return `moving the ${pieceNameFromLetter(trajectory[1])} from ${trajectory[2]} to ${trajectory[3]} clears ${naturalizeFreeText(a[1] || "the line")}`;
      }
      return `${naturalizeFreeText(a[0] || "the moving piece")} clears ${naturalizeFreeText(a[1] || "the line")}`;
    }
    case "interference": return `${replaceMoveNumbers(a[0])} interferes with ${replacePieceRefs(a[1] || "the defensive line")}`;
    case "deflection": return `${replaceMoveNumbers(a[0])} deflects ${one(1)} from ${one(2)}`;
    case "line_blocker": return `${one(0)} blocks ${replacePieceRefs(a[1] || "the line")}`;
    case "open_file": {
      const ref = parsePieceRef(a[0]);
      const file = ref?.square?.[0] || cleanSpace(a[0] || "").match(/[a-h]/i)?.[0]?.toLowerCase() || "named";
      return `the ${file}-file is open`;
    }
    case "restricted_mobility": return `${one()} has restricted mobility`;
    case "flight_squares": return `${one()} has flight squares ${parseList(1).join(", ")}`;
    case "back_rank_clamp": return `${one()} is clamped on the back rank`;
    case "mating_net": return `${listEnglish(parseList(0))} form a mating net around ${one(1)}`;
    case "passed_pawn": return `${one()} is a passed pawn`;
    case "promotion_threat": return `${one()} has an immediate promotion threat`;
    case "promotion_square": return `${square()} is the promotion square`;
    case "blockader": return `${one(0)} blocks ${one(1)}`;
    case "in_check": return `${replacePieceRefs(a[0] || "the side to move")} is in check`;
    case "check": return `${replaceMoveNumbers(a[0] || "a move")} gives check`;
    case "mate_in_1":
    case "mate_in_1_available": return `there is mate in one with ${replaceMoveNumbers(a.at(-1) || a[0] || "the move")}`;
    case "mate_threat": return `${replaceMoveNumbers(a[0] || "the move")} creates a mate threat`;
    case "legal_reply_classes": return `there are ${a[0]} legal reply classes`;
    case "material_gain": return `the line gains ${replacePieceRefs(a[0] || "material")}`;
    case "safe_retreat": {
      const trajectory = cleanSpace(a[0] || "").match(/^[wb]?([KQRBNPkqrbnp])@([a-h][1-8])-([a-h][1-8])$/);
      if (trajectory) return `the ${pieceNameFromLetter(trajectory[1])} can retreat safely from ${trajectory[2]} to ${trajectory[3]}`;
      const destination = cleanSpace(a[1] || "").match(/([a-h][1-8])$/i)?.[1] || replaceMoveNumbers(a[1] || "");
      return `${one(0)} can retreat safely${destination ? ` to ${destination}` : ""}`;
    }
    case "capture_order": return `the capture order is ${listEnglish(parseList(0))}`;
    default:
      return lowerFirst(naturalizeFreeText(text));
  }
}

function splitClauses(value) {
  return splitTopLevel(String(value ?? ""), ";").map(stripTrailingPeriod).filter(Boolean);
}

function naturalizeSaw(value) {
  return splitClauses(value).map(naturalizePredicate).filter(Boolean);
}

function stripSelectionPrefix(reason) {
  return stripTrailingPeriod(reason)
    .replace(/^(?:PICK-OUR-MOVE|TRY-REPLIES|ALL-REPLIES|CASH-SAFETY|CAPTURE-ORDER|REPLY-CLASS)\s*:\s*/i, "")
    .replace(/^the\s+move\s+/i, "")
    .trim();
}

function moveAction(move, reason, { cash = false, candidate = "" } = {}) {
  const san = cleanSpace(move).replace(/^\d+\.{1,3}\s*/, "");
  let why = stripSelectionPrefix(reason);
  why = lowerFirst(naturalizeFreeText(why));
  const candidateText = lowerFirst(cleanSpace(candidate));
  const candidateFirst = candidateText.split(/;\s*/)[0] || "";

  if (!why) return cash ? `${san} converts the visible gain` : `${san} is the forcing move`;
  if (/^mate$/i.test(why)) return `${san} mates`;

  const looseBecause = why.match(/^the\s+(.+?)\s+is\s+tactically loose because\s+(.+)$/i);
  if (looseBecause) return `${san} takes the tactically loose ${looseBecause[1]} because ${looseBecause[2]}`;
  const forked = why.match(/^the\s+(queen|rook|bishop|knight|pawn)\s+is\s+forked$/i);
  if (forked) return `${san} captures the forked ${forked[1]}`;
  const abandoned = why.match(/^the\s+king\s+has\s+abandoned\s+the\s+(.+)$/i);
  if (abandoned) return `${san} captures the abandoned ${abandoned[1]}`;
  if (/^the sole defender has been displaced$/i.test(why)) return `${san} cashes in after the sole defender is displaced`;
  if (/^the defender has been deflected$/i.test(why)) return `${san} captures the target after the defender is deflected`;
  if (/^the blocker has been deflected from\s+(.+)$/i.test(why)) return `${san} captures through the line opened from ${why.match(/from\s+(.+)$/i)[1]}`;
  if (/^the discovered attack has left the\s+(.+?)\s+loose$/i.test(why)) return `${san} captures the loose ${why.match(/^the discovered attack has left the\s+(.+?)\s+loose$/i)[1]}`;
  if (/^the checking rook attack has won the\s+(.+)$/i.test(why)) return `${san} captures the ${why.match(/^the checking rook attack has won the\s+(.+)$/i)[1]}`;
  if (/^the knight defender has been displaced to\s+(.+)$/i.test(why)) return `${san} captures the piece left behind after the knight is displaced to ${why.match(/to\s+(.+)$/i)[1]}`;
  if (/^the queen is loose and the check has ended$/i.test(why) || /^the rook is loose and the check has ended$/i.test(why)) {
    const target = why.startsWith("the queen") ? "queen" : "rook";
    return `${san} captures the loose ${target} once the check has ended`;
  }
  if (/^the passed pawn captures the rook and promotes$/i.test(why)) return `${san} captures the rook and promotes`;
  const discoveredConversion = why.match(/^the discovered check forced the king move and the (.+?) remains attacked$/i);
  if (discoveredConversion) return `${san} captures the ${discoveredConversion[1]} after the discovered check forces the king move`;

  const moveSubject = why.match(/^the (?:(?:queen|rook|bishop|knight|pawn|king|exchange) (?:sacrifice|capture|move|check|entry)|forcing rook entry|checking capture|move|capture|check) (.+)$/i);
  if (moveSubject && /^(?:keeps|asks|lures|denies|makes|uses|draws|places|puts|starts|begins|continues|completes|finishes|restores|removes|pulls|captures|forces|wins|leaves|attacks|opens|clears|preserves|sacrifices|offers|invites|creates|advances|answers|retreats|converts|checks|forks|pins|skewers|blocks|interferes|deflects)\b/i.test(moveSubject[1])) {
    why = moveSubject[1];
  }

  const directThirdPerson = /^(?:keeps|asks|lures|denies|makes|uses|draws|places|puts|starts|begins|continues|completes|finishes|restores|removes|pulls|captures|forces|wins|leaves|attacks|opens|clears|preserves|sacrifices|offers|invites|creates|advances|answers|retreats|converts|checks|forks|pins|skewers|blocks|interferes|deflects)\b/i;
  if (directThirdPerson.test(why)) return `${san} ${why}`;

  if (/^forcing queen exchange$/i.test(why)) return `${san} forces the queen exchange`;
  if (/^direct attack on a trapped queen$/i.test(why)) return `${san} directly attacks the trapped queen`;
  if (/^bishop fork of queen and knight$/i.test(why)) return `${san} forks the queen and knight`;
  if (/^rook invasion with check$/i.test(why)) return `${san} invades with check`;
  if (/^immediate recapture completes\s+(.+)$/i.test(why)) return `${san} immediately recaptures and completes ${why.match(/completes\s+(.+)$/i)[1]}`;
  if (/^checking\s+/i.test(why)) return `${san} is a ${why}`;

  const capturable = why.match(/^the\s+(.+?)\s+is\s+(?:now\s+)?capturable(?:\s+with\s+check)?$/i);
  if (capturable) return `${san} captures the ${capturable[1]}`;

  if (/^(?:capture|take|win|check|force|attack|pin|fork|skewer|remove|open|clear|retreat|save|continue|create|advance|sacrifice|block|interfere|move|activate|convert|answer|finish|complete|place|restore|offer|pull|draw)/i.test(why)) {
    const words = why.split(/\s+/);
    const first = words.shift();
    const conjugate = (verb) => {
      if (/s$/i.test(verb)) return verb;
      if (/[^aeiou]y$/i.test(verb)) return `${verb.slice(0, -1)}ies`;
      if (/(?:s|x|z|ch|sh)$/i.test(verb)) return `${verb}es`;
      return `${verb}s`;
    };
    let tail = words.length ? ` ${words.join(" ")}` : "";
    tail = tail.replace(/\band (complete|preserve|save|capture|attack|open|clear|remove|force|win|convert|restore|finish|continue|create|place|pull|draw|offer|invite|advance|answer|retreat)\b/gi,
      (_, verb) => `and ${conjugate(verb)}`);
    return `${san} ${conjugate(first)}${tail}`;
  }

  if (candidateFirst && /^(?:captures|attacks|gives check|threatens|forks|pins|skewers|advances)/i.test(candidateFirst)) {
    return `${san} ${candidateFirst}`;
  }
  if (/^(?:it|this)\s+/i.test(why)) return `${san} ${why.replace(/^(?:it|this)\s+/i, "")}`;
  return `${san}: ${why}`;
}

function parseReplyLine(line) {
  const body = cleanSpace(line).replace(/^REPLY\s+/, "");
  const dispositionSplit = body.split(/\s+::\s+/);
  const left = dispositionSplit[0] || "";
  const disposition = dispositionSplit.slice(1).join(" :: ");
  const colon = left.indexOf(":");
  const label = colon >= 0 ? left.slice(0, colon).trim() : left.trim();
  const detail = colon >= 0 ? left.slice(colon + 1).trim() : "";
  return { label, detail, disposition };
}

function naturalizeReply(line) {
  const { label, detail } = parseReplyLine(line);
  const rawLabel = label
    .replace(/^CLASS\s+/i, "")
    .replace(/^\[|\]$/g, "")
    .trim();
  let cleanLabel = replaceMoveNumbers(rawLabel);
  if (cleanLabel.includes(",")) cleanLabel = listEnglish(cleanLabel.split(",").map((item) => item.trim()));
  let cleanDetail = lowerFirst(naturalizeFreeText(detail));

  const allReplyClass = /^(?:all|all other) legal(?: queen moves| check answers| king moves| replies)?$/i.test(cleanLabel);
  if (allReplyClass) {
    const plural = /^all other/i.test(cleanLabel);
    const scope = plural
      ? "all other legal replies"
      : /queen moves$/i.test(cleanLabel)
        ? "every legal queen move"
        : /check answers$/i.test(cleanLabel)
          ? "every legal check answer"
          : /king moves$/i.test(cleanLabel)
            ? "every legal king move"
            : "every legal reply";
    if (!cleanDetail) return `${scope} is closed by the policy`;
    if (!plural) {
      cleanDetail = cleanDetail
        .replace(/^also leave\b/i, "also leaves")
        .replace(/^leave\b/i, "leaves")
        .replace(/^do not\b/i, "does not")
        .replace(/^fail\b/i, "fails")
        .replace(/^permit\b/i, "permits")
        .replace(/^allow\b/i, "allows")
        .replace(/^either allow\b/i, "either allows")
        .replace(/^remain\b/i, "remains")
        .replace(/^keep\b/i, "keeps")
        .replace(/^lose\b/i, "loses")
        .replace(/^restore\b/i, "restores")
        .replace(/^capture\b/i, "captures")
        .replace(/^give\b/i, "gives")
        .replace(/^threaten\b/i, "threatens")
        .replace(/\bor leave\b/gi, "or leaves")
        .replace(/\bor fail\b/gi, "or fails")
        .replace(/\bor allow\b/gi, "or allows")
        .replace(/\bor permit\b/gi, "or permits")
        .replace(/\bor force\b/gi, "or forces")
        .replace(/\bor lose\b/gi, "or loses");
      cleanDetail = cleanDetail
        .replace(/^the (.+?) remains (.+)$/i, "leaves the $1 $2")
        .replace(/^the (.+?) has no (.+)$/i, "leaves the $1 with no $2")
        .replace(/^at least one (.+?) is lost(.*)$/i, "loses at least one $1$2");
    }
    if (/^no\b/i.test(cleanDetail)) return `${scope}: ${cleanDetail}`;
    const directReplyVerb = plural
      ? /^(?:leave|do not|fail|permit|allow|either allow|can|cannot|must|remain|keep|lose|restore|capture|give|threaten|also leave)\b/i
      : /^(?:leaves|does not|fails|permits|allows|either allows|can|cannot|must|remains|keeps|loses|restores|captures|gives|threatens|also leaves)\b/i;
    if (directReplyVerb.test(cleanDetail)) return `${scope} ${cleanDetail}`;
    return `${scope}: ${cleanDetail}`;
  }
  if (/^nonchecking replies/i.test(cleanLabel)) {
    return cleanDetail ? `${lowerFirst(cleanLabel)} ${cleanDetail}` : `${lowerFirst(cleanLabel)} are closed`;
  }
  if (cleanLabel.includes(",") && /^every legal (?:king move|block|check answer|queen move)\s+(.+)$/i.test(cleanDetail)) {
    let rest = cleanDetail.match(/^every legal (?:king move|block|check answer|queen move)\s+(.+)$/i)[1];
    rest = rest
      .replace(/^also leaves\b/i, "all leave")
      .replace(/^leaves\b/i, "all leave")
      .replace(/^places\b/i, "all place")
      .replace(/^permits\b/i, "all permit")
      .replace(/^allows\b/i, "all allow");
    if (!/^all\b/i.test(rest)) rest = `all ${rest}`;
    return `${cleanLabel} ${rest}`;
  }
  if (/^only legal reply$/i.test(cleanDetail)) return `${cleanLabel} is the only legal reply`;
  if (/^only legal reply[;,]/i.test(cleanDetail)) return `${cleanLabel} is the only legal reply${cleanDetail.replace(/^only legal reply/i, "")}`;

  if (/^(?:\[)?\d/.test(rawLabel) || /^[KQRBNOa-h]/.test(cleanLabel)) {
    return stripTrailingPeriod(cleanDetail ? `${cleanLabel} ${cleanDetail}` : cleanLabel);
  }
  return stripTrailingPeriod(cleanDetail ? `${lowerFirst(cleanLabel)} ${cleanDetail}` : lowerFirst(cleanLabel));
}

function parseTryLine(line) {
  const body = cleanSpace(line).replace(/^TRY\s+/, "");
  const match = body.match(/^(.+?)\s+BECAUSE\s+(.+)$/i);
  return match
    ? { move: match[1].trim(), reason: match[2].trim() }
    : { move: body.trim(), reason: "" };
}

function parseThinkState(line) {
  const match = cleanSpace(line).match(/^THINK\s+([A-Z]+)(?:\((.*)\))?\.?$/);
  return match ? { state: match[1], args: match[2] || "" } : null;
}

export function parseTrace(traceText) {
  const lines = String(traceText ?? "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  return lines.map((line, index) => {
    const verb = line.match(/^([A-Z-]+)/)?.[1] || "TEXT";
    const event = { index, raw: line, verb };
    if (verb === "THINK") Object.assign(event, parseThinkState(line) || {});
    if (verb === "SAW") event.body = line.replace(/^SAW\s+/, "").replace(/\.$/, "");
    if (verb === "CANDIDATES") event.body = line.replace(/^CANDIDATES\s+/, "").replace(/\.$/, "");
    if (verb === "TRY") Object.assign(event, parseTryLine(line));
    if (verb === "REPLY") Object.assign(event, parseReplyLine(line));
    if (verb === "FROM") {
      const match = line.match(/^FROM\s+(.+?)(?:\s+::\s+(.+))?\.?$/);
      event.move = match?.[1] || "";
      event.reason = match?.[2] || "";
    }
    if (["PROVED", "HORIZON", "GIVEUP"].includes(verb)) event.body = line.replace(new RegExp(`^${verb}\\.?\\s*`), "");
    return event;
  });
}

function createSection(label) {
  return { label, lines: [] };
}

function pushUnique(section, value) {
  const text = stripTrailingPeriod(value);
  if (!text) return;
  if (!section.lines.some((existing) => existing.toLowerCase() === text.toLowerCase())) section.lines.push(text);
}

function sectionFor(output, label, { forceNew = false } = {}) {
  const last = output.at(-1);
  if (!forceNew && last?.label === label) return last;
  const section = createSection(label);
  output.push(section);
  return section;
}

function candidateForMove(candidateBody, move) {
  if (!candidateBody || !move) return "";
  const candidates = splitTopLevel(candidateBody, ";");
  const normalizedMove = cleanSpace(move).replace(/^\d+\.{1,3}\s*/, "");
  return candidates.find((candidate) => {
    const head = candidate.split(":", 1)[0].trim().replace(/^\d+\.{1,3}\s*/, "");
    return head === normalizedMove;
  }) || "";
}

function candidateSummary(candidate) {
  if (!candidate) return "";
  const colon = candidate.indexOf(":");
  if (colon < 0) return "";
  let detail = candidate.slice(colon + 1).trim();
  detail = detail.replace(/,?\s*USES=\[[^\]]*\]/i, "");
  return splitClauses(detail).map(naturalizePredicate).join("; ");
}

export function explainTrace({ puzzle = {}, trace = "", policy = null } = {}) {
  const events = Array.isArray(trace) ? trace : parseTrace(trace);
  const sections = [];
  let thought = "OBSERVE";
  let candidateBody = "";
  let lastReplyLabel = "";
  let lastOwnTry = "";
  let comparePending = false;

  for (let index = 0; index < events.length; index += 1) {
    const event = events[index];
    if (event.verb === "THINK") {
      thought = event.state || thought;
      if (["OBSERVE", "REPLIES", "COMPARE", "CASH"].includes(thought)) sectionFor(sections, thought, { forceNew: thought === "OBSERVE" && sections.at(-1)?.label !== "OBSERVE" });
      continue;
    }

    if (event.verb === "SAW") {
      const label = thought === "CASH" ? "CASH" : "OBSERVE";
      const section = sectionFor(sections, label);
      for (const sentence of naturalizeSaw(event.body)) {
        if (label === "CASH" && /^there is mate in one/i.test(sentence)) continue;
        pushUnique(section, sentence);
      }
      continue;
    }

    if (event.verb === "CANDIDATES") {
      candidateBody = event.body;
      continue;
    }

    if (event.verb === "REPLY") {
      thought = "REPLIES";
      const section = sectionFor(sections, "REPLIES");
      const sentence = naturalizeReply(event.raw);
      pushUnique(section, sentence);
      lastReplyLabel = replaceMoveNumbers(event.label || "");
      continue;
    }

    if (event.verb === "TRY") {
      const next = events[index + 1];
      const explicitReplyTry = /^(?:TRY-REPLIES|ALL-REPLIES)\s*:/i.test(cleanSpace(event.reason));
      const isOpponentTry = explicitReplyTry || thought === "REPLIES" || (lastReplyLabel && replaceMoveNumbers(event.move) === lastReplyLabel);
      if (isOpponentTry) {
        // The REPLY line already states the chess reason. Add only a concise
        // "best defense" sentence when the trace explicitly distinguishes it.
        thought = next?.verb === "THINK" ? thought : "OBSERVE";
        lastReplyLabel = "";
        continue;
      }

      let label = thought === "CASH" ? "CASH" : thought === "COMPARE" || comparePending ? "COMPARE" : "THREAT";
      const section = sectionFor(sections, label);
      const candidate = candidateSummary(candidateForMove(candidateBody, event.move));
      const action = moveAction(event.move, event.reason, { cash: label === "CASH", candidate });
      pushUnique(section, action);
      lastOwnTry = event.move;
      candidateBody = "";
      comparePending = false;
      continue;
    }

    if (event.verb === "FROM") {
      const section = sectionFor(sections, "COMPARE", { forceNew: sections.at(-1)?.label !== "COMPARE" });
      const reason = lowerFirst(naturalizeFreeText(event.reason || "the line is refuted"));
      pushUnique(section, `${replaceMoveNumbers(event.move || lastOwnTry)} fails because ${reason}`);
      thought = "COMPARE";
      comparePending = true;
      continue;
    }

    if (["PROVED", "HORIZON", "GIVEUP"].includes(event.verb)) {
      const section = sectionFor(sections, event.verb, { forceNew: true });
      if (event.body) pushUnique(section, replacePieceRefs(event.body).replace(/_/g, " "));
    }
  }

  if (!sections.some((section) => ["PROVED", "HORIZON", "GIVEUP"].includes(section.label))) {
    sectionFor(sections, puzzle?.status === "solved" ? "PROVED" : "HORIZON", { forceNew: true });
  }

  // Remove empty non-terminal sections and adjacent duplicate headings.
  const cleaned = [];
  for (const section of sections) {
    if (!section.lines.length && !["PROVED", "HORIZON", "GIVEUP"].includes(section.label)) continue;
    const previous = cleaned.at(-1);
    if (previous?.label === section.label) {
      section.lines.forEach((line) => pushUnique(previous, line));
    } else {
      cleaned.push(section);
    }
  }

  return {
    version: EXPLAIN_VERSION,
    puzzleId: puzzle?.id || "",
    sections: cleaned,
    text: formatPlainEnglish(cleaned),
    policy: policy?.name || puzzle?.policy || ""
  };
}

export function formatPlainEnglish(sections) {
  return (sections || []).map((section) => {
    const label = String(section.label || "").toUpperCase();
    if (!section.lines?.length) return label;
    return `${label}\n${section.lines.map((line) => `  ${stripTrailingPeriod(line)}`).join("\n")}`;
  }).join("\n\n").trim();
}

export function parseCttRecord(text) {
  const source = String(text ?? "").replace(/\r\n/g, "\n");
  const cttIndex = source.search(/^CTT\/1\s*$/m);
  if (cttIndex < 0) throw new Error("CTT/1 header not found");
  const body = source.slice(cttIndex);
  const traceMatch = body.match(/^\[trace\]\s*$/m);
  const pgnMatch = body.match(/^\[final pgn\]\s*$/mi);
  const plainMatch = body.match(/^\[(?:plain english|expected plain english)\]\s*$/mi);
  if (!traceMatch || !pgnMatch) throw new Error("CTT record requires [trace] and [final pgn]");

  const headerText = body.slice("CTT/1".length, traceMatch.index).trim();
  const traceStart = traceMatch.index + traceMatch[0].length;
  const traceText = body.slice(traceStart, pgnMatch.index).trim();
  const pgnStart = pgnMatch.index + pgnMatch[0].length;
  const pgnEnd = plainMatch ? plainMatch.index : body.length;
  const finalPgn = body.slice(pgnStart, pgnEnd).trim();
  const plainText = plainMatch ? body.slice(plainMatch.index + plainMatch[0].length).trim() : "";
  const meta = {};
  for (const line of headerText.split(/\n/)) {
    const match = line.match(/^([a-zA-Z_][\w-]*):\s*(.*)$/);
    if (match) meta[match[1]] = match[2].trim();
  }
  return {
    format: "CTT/1",
    ...meta,
    positions_entered: Number(meta.positions_entered || 0),
    trace: traceText,
    traceEvents: parseTrace(traceText),
    finalPgn,
    expectedPlainEnglish: plainText
  };
}

export function parseExplainTestFile(text) {
  const source = String(text ?? "").replace(/\r\n/g, "\n");
  const blocks = [];
  const heading = /^={8,}\s*\nTEST\s+(\d+)(?:\s*:\s*([^\n]+))?\s*\n={8,}\s*\n/gm;
  const matches = [];
  let match;
  while ((match = heading.exec(source))) {
    matches.push({ number: Number(match[1]), title: cleanSpace(match[2] || ""), start: match.index, bodyStart: heading.lastIndex });
  }
  for (let index = 0; index < matches.length; index += 1) {
    const current = matches[index];
    const end = matches[index + 1]?.start ?? source.length;
    const record = parseCttRecord(source.slice(current.bodyStart, end));
    blocks.push({ number: current.number, title: current.title, ...record });
  }
  if (!blocks.length && /^CTT\/1\s*$/m.test(source)) {
    blocks.push({ number: 1, title: "", ...parseCttRecord(source) });
  }
  return blocks;
}

export function serializeExplainTest(record, { number = record.number || 1, title = record.title || record.id || "Predicate Chess case" } = {}) {
  const metaOrder = ["id", "policy", "source", "fen", "objective", "status", "main", "result", "positions_entered"];
  const header = metaOrder
    .filter((key) => record[key] !== undefined && record[key] !== "")
    .map((key) => `${key}: ${record[key]}`)
    .join("\n");
  const generated = record.expectedPlainEnglish || explainTrace({ puzzle: record, trace: record.trace }).text;
  return [
    "======================================================================",
    `TEST ${number}: ${title}`,
    "======================================================================",
    "",
    "CTT/1",
    header,
    "",
    "[trace]",
    "",
    String(record.trace || "").trim(),
    "",
    "[final pgn]",
    "",
    String(record.finalPgn || "").trim(),
    "",
    "[expected plain english]",
    "",
    generated.trim(),
    ""
  ].join("\n");
}

export function runExplainTests(text, { strict = true } = {}) {
  const cases = parseExplainTestFile(text);
  const results = cases.map((test) => {
    const actual = explainTrace({ puzzle: test, trace: test.trace }).text.trim();
    const expected = String(test.expectedPlainEnglish || "").trim();
    const passed = strict ? actual === expected : cleanSpace(actual) === cleanSpace(expected);
    return { number: test.number, id: test.id, passed, expected, actual };
  });
  return {
    total: results.length,
    passed: results.filter((item) => item.passed).length,
    failed: results.filter((item) => !item.passed).length,
    results
  };
}

/* -------------------------------------------------------------------------- */
/* Minimal PGN parser for displaying the canonical [final pgn] move list.      */
/* -------------------------------------------------------------------------- */

export function splitPgn(pgnText) {
  const source = String(pgnText ?? "").replace(/\r\n/g, "\n").trim();
  const tags = {};
  const tagLines = [];
  let index = 0;
  const lines = source.split("\n");
  while (index < lines.length && /^\s*\[/.test(lines[index])) {
    const line = lines[index].trim();
    tagLines.push(line);
    const match = line.match(/^\[([^\s]+)\s+"((?:\\.|[^"])*)"\]$/);
    if (match) tags[match[1]] = match[2].replace(/\\"/g, '"');
    index += 1;
  }
  const movetext = lines.slice(index).join(" ").replace(/\{[^}]*\}/g, " ").replace(/;[^\n]*/g, " ").replace(/\s+/g, " ").trim();
  return { tags, tagLines, movetext };
}

function tokenizePgnMovetext(movetext) {
  const tokens = [];
  const source = String(movetext || "");
  let current = "";
  const flush = () => { if (current.trim()) tokens.push(current.trim()); current = ""; };
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (char === "(" || char === ")") {
      flush();
      tokens.push(char);
    } else if (/\s/.test(char)) {
      flush();
    } else {
      current += char;
    }
  }
  flush();
  return tokens.filter((token) => !/^\$\d+$/.test(token));
}

export function parseFinalPgn(pgnText) {
  const { tags, tagLines, movetext } = splitPgn(pgnText);
  const tokens = tokenizePgnMovetext(movetext);
  const root = { type: "line", items: [] };
  const stack = [root];
  for (const token of tokens) {
    const line = stack.at(-1);
    if (token === "(") {
      const variation = { type: "variation", items: [] };
      line.items.push(variation);
      stack.push(variation);
    } else if (token === ")") {
      if (stack.length > 1) stack.pop();
    } else if (/^(?:1-0|0-1|1\/2-1\/2|\*)$/.test(token)) {
      line.items.push({ type: "result", text: token });
    } else if (/^\d+\.(?:\.\.)?$/.test(token) || /^\d+\.\.\.$/.test(token)) {
      line.items.push({ type: "moveNumber", text: token });
    } else {
      line.items.push({ type: "move", san: token });
    }
  }
  return { tags, tagLines, movetext, tree: root };
}

export function flattenMainLine(pgnText) {
  const parsed = parseFinalPgn(pgnText);
  return parsed.tree.items.filter((item) => item.type === "move").map((item) => item.san);
}

export function describeExplainer() {
  return [
    `${EXPLAIN_VERSION}`,
    "The explainer is a deterministic projection of CTT/1, not a chess engine.",
    "THINK and event verbs choose headings; SAW, TRY, REPLY, and FROM provide the bullets.",
    "Identical puzzle metadata and trace text always produce identical plain English."
  ].join("\n");
}
