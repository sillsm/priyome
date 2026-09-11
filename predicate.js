/*
 * Priyomes Predicate Policy Engine
 * A card is a chess strategy. Its rules read only this board's predicates.
 * Ordinary depth-first search remembers boards, their cards, and untried moves.
 * Our alternatives are OR; the opponent's selected replies are AND.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.PredicatePolicy = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const VERSION = "2.1.0-card-replies";
  const POLICY_SCHEMA = "predicate-policy/v2";
  const PROJECT_SCHEMA = "predicate-policy-dfa-lab/project-v3";
  const STATE_KINDS = Object.freeze(["card"]);
  const clone = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  const object = value => Boolean(value) && typeof value === "object" && !Array.isArray(value);
  const strings = value => Array.isArray(value) && value.every(item => typeof item === "string" && item.trim());
  const unique = values => [...new Set(values)];
  const normalizeInitial = value => Array.isArray(value) ? value.map(String) : String(value || "").split(/[\s,]+/).filter(Boolean);
  const stateDefFromPolicy = (policy, id) => policy?.states?.find(card => card.id === id);

  function conditionMatches(position, when = {}) {
    const facts = position?.predicates || [];
    return (!when.any?.length || when.any.some(fact => facts.includes(fact)))
      && (!when.all?.length || when.all.every(fact => facts.includes(fact)))
      && (!when.none?.length || !when.none.some(fact => facts.includes(fact)));
  }

  function conditionLabel(when = {}) {
    return [when.all?.length && when.all.join(" and "),
      when.any?.length && `one of: ${when.any.join(", ")}`,
      when.none?.length && `without: ${when.none.join(", ")}`].filter(Boolean).join("; ") || "no board condition";
  }

  function closureLabel(choice) {
    if (choice?.mode === "all" || choice?.side === "their") return "every matching reply";
    const limit = choice?.limit ?? choice?.my?.limit ?? choice?.count;
    return limit ? `first ${limit} matching moves` : "moves in predicate order";
  }

  function policyGraphTargets(card) {
    return unique((card?.rules || []).map(rule => rule.to).filter(Boolean));
  }

  function validatePolicy(policy) {
    const issues = [];
    const error = (title, detail) => issues.push({ level: "error", scope: "policy", title, detail });
    if (!object(policy)) return [{ level: "error", scope: "policy", title: "Policy must be an object", detail: "Supply a chess-card policy." }];
    if (policy.schema !== POLICY_SCHEMA) error("Unknown policy schema", `Expected ${POLICY_SCHEMA}.`);
    if (!Array.isArray(policy.states) || !policy.states.length) error("No chess cards", "states must contain the actual named chess cards.");
    const cards = Array.isArray(policy.states) ? policy.states : [];
    const ids = cards.map(card => card?.id);
    const idSet = new Set(ids);
    for (const id of unique(ids.filter((id, index) => ids.indexOf(id) !== index))) error("Duplicate card", String(id));
    if (!idSet.has(policy.entry)) error("Invalid entry card", String(policy.entry));
    for (const key of ["control_model", "sigils", "plans", "transitions", "routines", "outcomes", "plan_entries", "plan_outcomes", "plan_start_card", "proof_preference"]) {
      if (policy[key] !== undefined) error("Unsupported policy machinery", key);
    }
    for (const key of ["thoughts", "depth"]) {
      if (!Number.isInteger(policy.budgets?.[key]) || policy.budgets[key] < (key === "depth" ? 0 : 1)) error("Invalid execution safety limit", `budgets.${key}`);
    }
    if (policy.budgets && Object.keys(policy.budgets).some(key => !["thoughts", "depth"].includes(key))) error("Unsupported execution budget", "Only thoughts and depth are execution safety limits.");
    if (policy.our_move_candidate_limit !== undefined && (!Number.isInteger(policy.our_move_candidate_limit) || policy.our_move_candidate_limit < 1 || policy.our_move_candidate_limit > 5)) error("Invalid own-move limit", "Choose an integer from 1 through 5.");
    if (policy.check_evasions !== undefined) error("Replies belong on each card", "Use each card's their.predicates, with board conditions for check.");
    for (const card of cards) {
      const name = card?.id || "unnamed card";
      if (!card?.id || typeof card.id !== "string") error("Missing card name", name);
      if (!card?.label || typeof card.label !== "string") error("Missing readable card label", name);
      if (card?.kind !== "card") error("Only chess cards are states", name);
      for (const key of ["on", "default", "action", "prepare", "routine", "frame", "routes", "selectors", "closure", "plan", "return_to", "max_visits_per_puzzle", "side", "predicates"]) {
        if (card?.[key] !== undefined) error("Unsupported card machinery", `${name}.${key}`);
      }
      if (!Array.isArray(card?.rules)) error("Invalid board rules", `${name}.rules must be an ordered array.`);
      for (const [index, rule] of (Array.isArray(card?.rules) ? card.rules : []).entries()) {
        const ref = `${name}, rule ${index + 1}`;
        if (!object(rule)) { error("Invalid card rule", ref); continue; }
        for (const key of Object.keys(rule)) if (!["label", "when", "to", "result"].includes(key)) error("Unsupported rule input", `${ref}: ${key}`);
        if (!object(rule.when)) error("Missing board condition", ref);
        else {
          for (const key of Object.keys(rule.when)) if (!["any", "all", "none"].includes(key)) error("Only board predicates may select a rule", `${ref}: ${key}`);
          for (const key of ["any", "all", "none"]) if (rule.when[key] !== undefined && !strings(rule.when[key])) error("Invalid board predicate list", `${ref}: ${key}`);
          if (!["any", "all", "none"].some(key => rule.when[key]?.length)) error("Unconditional card transition", ref);
        }
        if (Number(rule.to !== undefined) + Number(rule.result !== undefined) !== 1) error("Rule needs one continuation", `${ref}: name another card or prove/fail.`);
        if (rule.to !== undefined && !idSet.has(rule.to)) error("Invalid next card", `${ref}: ${rule.to}`);
        if (rule.result !== undefined && !["prove", "fail"].includes(rule.result)) error("Invalid board conclusion", ref);
      }
      for (const side of ["my", "their"]) {
        const choices = card?.[side];
        if (!object(choices) || !Array.isArray(choices.predicates)) { error("Invalid move predicates", `${name}.${side}.predicates must be an ordered list.`); continue; }
        for (const choice of choices.predicates) {
          if (typeof choice === "string" && choice.trim()) continue;
          const ref = `${name}.${side}: ${choice?.predicate || "unnamed move predicate"}`;
          if (!object(choice) || typeof choice.predicate !== "string" || !choice.predicate.trim()) { error("Invalid move predicate", ref); continue; }
          for (const key of Object.keys(choice)) if (!["predicate", "when"].includes(key)) error("Unsupported move predicate input", `${ref}: ${key}`);
          if (!object(choice.when)) error("Missing move eligibility condition", ref);
          else {
            for (const key of Object.keys(choice.when)) if (!["any", "all", "none"].includes(key)) error("Move eligibility may read only board predicates", `${ref}: ${key}`);
            for (const key of ["any", "all", "none"]) if (choice.when[key] !== undefined && !strings(choice.when[key])) error("Invalid move eligibility predicates", `${ref}: ${key}`);
            if (!["any", "all", "none"].some(key => choice.when[key]?.length)) error("Empty move eligibility condition", ref);
          }
        }
        for (const key of Object.keys(choices)) if (!["predicates", ...(side === "my" ? ["limit"] : [])].includes(key)) error("Unsupported move selection", `${name}.${side}.${key}`);
        if (side === "my" && choices.limit !== undefined && (!Number.isInteger(choices.limit) || choices.limit < 1 || choices.limit > 5)) error("Invalid card move limit", `${name}.my.limit must be from 1 through 5.`);
      }
    }
    return issues;
  }

  function validateProject(project) {
    const issues = validatePolicy(project?.policy);
    const error = (title, detail) => issues.push({ level: "error", scope: "project", title, detail });
    if (project?.schema !== PROJECT_SCHEMA) error("Unknown project schema", `Expected ${PROJECT_SCHEMA}.`);
    if (typeof project?.name !== "string" || !project.name.trim()) error("Missing project name", "Give this chess study a name.");
    const positions = Array.isArray(project?.positions) ? project.positions : [];
    const ids = positions.map(position => position?.id);
    if (!positions.length) error("No board positions", "Supply at least one position.");
    if (unique(ids).length !== ids.length) error("Duplicate position ID", "Board IDs must be unique.");
    for (const position of positions) {
      if (!object(position)) { error("Invalid board position", "Each board must be an object."); continue; }
      if (!position?.id || typeof position.id !== "string") error("Missing position ID", "Each board needs an ID.");
      if (!["my", "their"].includes(position?.side)) error("Invalid side to move", String(position?.id));
      if (!strings(position?.predicates)) error("Invalid board predicates", String(position?.id));
      if (position.children !== undefined && !strings(position.children)) error("Invalid child positions", String(position?.id));
      for (const id of Array.isArray(position.children) ? position.children : []) if (!ids.includes(id)) error("Missing child board", id);
    }
    if (project?.initial !== undefined && !strings(project.initial)) error("Invalid initial boards", "Use an array of board IDs.");
    for (const id of Array.isArray(project?.initial) ? project.initial : []) if (!ids.includes(id)) error("Missing initial board", id);
    if (!issues.length) issues.push({ level: "ok", scope: "project", title: "Chess cards are structurally valid", detail: "Every card route reads board predicates only." });
    return issues;
  }

  class Runner {
    constructor(project, options = {}) {
      this._listeners = new Set();
      if (typeof options.onEvent === "function") this._listeners.add(options.onEvent);
      this.load(project, options);
    }

    load(project, options = {}) {
      this.project = clone(project);
      this.policy = this.project?.policy || {};
      this.positions = new Map((Array.isArray(this.project?.positions) ? this.project.positions : []).filter(object).map(position => [position.id, position]));
      this.validation = validateProject(this.project);
      this.reset(options.initial ?? this.project?.initial ?? []);
      return this;
    }

    stateDef(id = this.runtime?.state) { return stateDefFromPolicy(this.policy, id); }
    getPosition(id) { return this.positions.get(id); }
    subscribe(listener) {
      if (typeof listener !== "function") throw new TypeError("listener must be a function");
      this._listeners.add(listener);
      return () => this._listeners.delete(listener);
    }
    upsertPositions(positions) {
      for (const position of positions || []) {
        const copy = clone(position);
        this.positions.set(copy.id, copy);
        const index = this.project.positions.findIndex(item => item.id === copy.id);
        if (index === -1) this.project.positions.push(copy);
        else this.project.positions[index] = copy;
      }
      return this;
    }

    reset(initial = this.project?.initial || []) {
      this._occurrenceCounter = 0;
      this._stack = [];
      this._routesAtBoard = new Set();
      this._started = false;
      this._stepEvents = [];
      this.runtime = {
        state: this.policy.entry, current: null, initialIds: normalizeInitial(initial),
        thoughtCount: 0, microStepCount: 0, result: null, reason: "Ready", action: "ready",
        frontier: [], selectedFrontier: [], search: null, lastMatch: null,
        timeline: [], trace: [], roots: [], nodes: {}, nodeOrder: []
      };
      this._initialItems = this.runtime.initialIds.map(id => this._newOccurrence(id, 0, null, "initial", this.policy.entry));
      this.runtime.current = this._initialItems[0] || null;
      this._remainingInitial = this._initialItems.slice(1);
      this._emit("reset", { initial: this.runtime.initialIds });
      return this.snapshot();
    }

    _newOccurrence(id, depth, parent, matchedBy, cardId) {
      const occurrence = `n${++this._occurrenceCounter}`;
      const item = { id, depth, parent, matchedBy, cardId, occurrence };
      this.runtime.nodes[occurrence] = { ...item, status: "queued", note: "", order: this.runtime.nodeOrder.length };
      this.runtime.nodeOrder.push(occurrence);
      if (!parent) this.runtime.roots.push(occurrence);
      return item;
    }

    _setNode(item, changes) {
      const node = this.runtime.nodes[item?.occurrence];
      if (node) Object.assign(node, changes);
    }

    _emit(type, data = {}) {
      const event = { index: this.runtime.trace.length, type,
        state: this.runtime.state, card: this.runtime.state,
        side: this.positions.get(this.runtime.current?.id)?.side || null,
        thoughtCount: this.runtime.thoughtCount, microStepCount: this.runtime.microStepCount,
        ...clone(data) };
      this.runtime.trace.push(event);
      this._stepEvents.push(event);
      for (const listener of this._listeners) {
        try { listener(clone(event), this.snapshot()); } catch (_) { /* Observers cannot affect the search. */ }
      }
      return event;
    }

    _select(item) {
      if (this.runtime.thoughtCount >= this.policy.budgets.thoughts) {
        this.runtime.result = "reject";
        this.runtime.reason = `Execution safety limit: ${this.policy.budgets.thoughts} explored positions`;
        this._emit("budget-exhausted", { budget: this.policy.budgets.thoughts, reason: this.runtime.reason });
        this._emit("terminal", { result: "reject", reason: this.runtime.reason });
        return;
      }
      this.runtime.current = item;
      this.runtime.state = item.cardId;
      this.runtime.search = null;
      this.runtime.frontier = [];
      this.runtime.selectedFrontier = [];
      this.runtime.thoughtCount += 1;
      this.runtime.action = "inspect board";
      this.runtime.reason = `Examine ${this.stateDef()?.label || item.cardId}`;
      this._routesAtBoard = new Set([item.cardId]);
      this._setNode(item, { status: "active" });
      this.runtime.timeline.push({ state: item.cardId, label: this.stateDef()?.label || item.cardId, occurrence: item.occurrence });
      this._emit("line-selected", { item });
    }

    _transition(rule) {
      const from = this.runtime.state;
      this._emit("inspect-routed", { item: this.runtime.current, from, to: rule.to, label: rule.label || conditionLabel(rule.when), when: rule.when });
      if (this._routesAtBoard.has(rule.to)) {
        this._emit("safety-limit", { reason: "Card routing cycles on an unchanged board", from, to: rule.to });
        this._finish(false, "Card routing cycles on an unchanged board");
        return;
      }
      this._routesAtBoard.add(rule.to);
      this.runtime.state = rule.to;
      this.runtime.current.cardId = rule.to;
      this._setNode(this.runtime.current, { cardId: rule.to });
      this.runtime.action = "change chess card";
      this.runtime.reason = rule.label || conditionLabel(rule.when);
      this.runtime.timeline.push({ state: rule.to, label: this.stateDef()?.label || rule.to, occurrence: this.runtime.current.occurrence });
      this._emit("state-enter", { from, state: rule.to, kind: "card", label: this.stateDef()?.label || rule.to });
    }

    _finish(proved, reason) {
      this.runtime.search = null;
      this.runtime.frontier = [];
      this.runtime.selectedFrontier = [];
      let item = this.runtime.current;
      while (item) {
        this._setNode(item, { status: proved ? "accepted" : "rejected", note: reason });
        this._emit("branch-complete", { item, result: proved ? "prove" : "fail", reason });
        const parent = this._stack.at(-1);
        if (!parent) {
          if (!proved && this._remainingInitial.length) { this._select(this._remainingInitial.shift()); return; }
          this.runtime.current = item;
          this.runtime.state = item.cardId;
          this.runtime.result = proved ? "accept" : "reject";
          this.runtime.reason = reason;
          this.runtime.action = proved ? "proof complete" : "line failed";
          for (const other of this._remainingInitial) this._setNode(other, { status: "discarded", note: "A preceding initial board proved the objective" });
          this._remainingInitial = [];
          this._emit("terminal", { result: this.runtime.result, reason });
          return;
        }
        this._emit("child-finished", { item, parent: parent.item, result: proved ? "prove" : "fail", side: parent.side });
        if (parent.side === "my" && proved) {
          this._emit("choice-proved", { item, parent: parent.item, label: "This move withstands the examined replies", side: "my" });
          for (const other of parent.remaining) this._setNode(other, { status: "discarded", note: "A preceding move proved the objective" });
        } else if (parent.side === "their" && !proved) {
          for (const other of parent.remaining) this._setNode(other, { status: "discarded", note: "An opponent reply refuted the line" });
        } else if (parent.remaining.length) {
          this._select(parent.remaining.shift());
          return;
        } else if (parent.side === "their") {
          this._emit("replies-proved", { item: parent.item, label: "Every selected opponent reply is answered", side: "their" });
        }
        this._stack.pop();
        item = parent.item;
        this.runtime.current = item;
        this.runtime.state = parent.cardId;
        reason = parent.side === "my"
          ? proved ? "A candidate move proves the objective" : "Every selected move failed"
          : proved ? "Every selected opponent reply is answered" : "An opponent reply refutes the line";
      }
    }

    _beginSearch(card, position) {
      const side = position.side;
      // All moves, including replies to check, come from the current card.
      const mandatoryEvasions = false;
      const choices = card[side].predicates;
      const predicates = choices.map(choice => typeof choice === "string" ? choice : choice.predicate);
      const conditions = choices.map(choice => typeof choice === "string" ? null : choice.when);
      const limit = side === "my" ? Math.min(card.my.limit || 5, this.policy.our_move_candidate_limit || 5) : Infinity;
      const frontier = (position.children || []).map(id => ({ id, parent: this.runtime.current.occurrence, depth: this.runtime.current.depth + 1 }));
      this.runtime.search = { side, parent: clone(this.runtime.current), cardId: card.id, predicates, conditions,
        predicateIndex: 0, limit: Number.isFinite(limit) ? limit : null, selected: [], used: [],
        checks: predicates.map((predicate, index) => ({ predicate, when: conditions[index], status: "waiting", selected: [] })), complete: false,
        mandatoryEvasions, frontier };
      this.runtime.frontier = clone(frontier);
      this.runtime.selectedFrontier = [];
      this.runtime.action = "choose chess moves";
      this._emit("search-start", { position: position.id, occurrence: this.runtime.current.occurrence,
        side, predicates, conditions, childCount: frontier.length, mandatoryEvasions,
        closure: side === "my" ? { mode: "first", count: limit } : { mode: "all" } });
    }

    _searchNext() {
      const search = this.runtime.search;
      const predicate = search.predicates[search.predicateIndex];
      if (predicate !== undefined) {
        const selected = [], matchingIds = [];
        const used = new Set(search.used);
        const limit = search.limit ?? Infinity;
        const when = search.conditions[search.predicateIndex];
        const conditionMatched = !when || conditionMatches(this.positions.get(search.parent.id), when);
        for (const child of search.frontier) {
          if (!conditionMatched) break;
          if (used.has(child.id) || !this.positions.get(child.id)?.predicates?.includes(predicate)) continue;
          matchingIds.push(child.id);
          if (search.selected.length >= limit) continue;
          const item = this._newOccurrence(child.id, child.depth, child.parent, predicate, search.cardId);
          search.selected.push(item); selected.push(item); search.used.push(child.id); used.add(child.id);
        }
        const check = search.checks[search.predicateIndex];
        check.status = !conditionMatched ? "ineligible" : selected.length ? "matched" : "missed";
        check.selected = selected.map(item => item.id);
        this.runtime.lastMatch = selected.length ? predicate : this.runtime.lastMatch;
        this.runtime.selectedFrontier = clone(search.selected);
        this._emit("predicate-checked", { position: search.parent.id, occurrence: search.parent.occurrence,
          side: search.side, predicate, predicateIndex: search.predicateIndex, predicateCount: search.predicates.length,
          when, conditionMatched, matchingIds, selected, selectedTotal: search.selected.length, closureReached: search.selected.length >= limit });
        search.predicateIndex++;
        if (search.predicateIndex < search.predicates.length && search.selected.length < limit) return;
      }
      search.complete = true;
      for (const check of search.checks) if (check.status === "waiting") check.status = "skipped";
      this._emit("search-complete", { position: search.parent.id, occurrence: search.parent.occurrence,
        side: search.side, selected: search.selected, selectedCount: search.selected.length,
        mandatoryEvasions: search.mandatoryEvasions,
        closure: search.side === "my" ? { mode: "first", count: search.limit } : { mode: "all" } });
      if (!search.selected.length) {
        this._emit("inspect-routed", { item: search.parent, result: "fail", to: "fail", label: "No move matches this card" });
        this._finish(false, "No move matches this card");
        return;
      }
      this._setNode(search.parent, { status: "expanded", note: `${search.selected.length} moves selected by ${this.stateDef().label}` });
      this._stack.push({ item: search.parent, cardId: search.cardId, side: search.side, remaining: search.selected.slice(1) });
      this._emit("positions-pushed", { items: search.selected, parent: search.parent, side: search.side });
      this._select(search.selected[0]);
    }

    _searchCard(card, position) {
      if (this.runtime.current.depth >= this.policy.budgets.depth) {
        this._emit("depth-closed", { item: this.runtime.current, depth: this.runtime.current.depth });
        this._finish(false, `Execution safety depth ${this.policy.budgets.depth} reached`);
      } else {
        this._beginSearch(card, position);
        this._searchNext();
      }
    }

    step() {
      if (this.runtime.result) return { events: [], snapshot: this.snapshot() };
      this._stepEvents = [];
      this.runtime.microStepCount++;
      if (!this._started) {
        this._started = true;
        const errors = this.validation.filter(issue => issue.level === "error");
        if (errors.length || !this.runtime.current || !this.positions.has(this.runtime.current.id)) {
          this.runtime.result = "reject";
          this.runtime.reason = errors.length ? errors.map(issue => `${issue.title}: ${issue.detail}`).join("; ") : "No initial board is available";
          this._emit("terminal", { result: "reject", reason: this.runtime.reason });
        } else this._select(this.runtime.current);
        return { events: clone(this._stepEvents), snapshot: this.snapshot() };
      }
      if (this.runtime.thoughtCount > this.policy.budgets.thoughts) {
        this.runtime.result = "reject";
        this.runtime.reason = `Execution safety limit: ${this.policy.budgets.thoughts} explored positions`;
        this._emit("budget-exhausted", { budget: this.policy.budgets.thoughts, reason: this.runtime.reason });
        this._emit("terminal", { result: "reject", reason: this.runtime.reason });
      } else if (this.runtime.search) this._searchNext();
      else {
        const card = this.stateDef();
        const position = this.positions.get(this.runtime.current?.id);
        if (!card || !position) this._finish(false, "The current chess card or board is missing");
        else if (position.predicates.some(fact => ["oracle_limit", "unexplorable"].includes(fact))) {
          this._emit("oracle-incomplete", { item: this.runtime.current, reason: "The Oracle could not supply a complete board" });
          this._finish(false, "Unresolved: incomplete Oracle board");
        } else if (position.fen && this._stack.some(frame => frame.cardId === card.id
          && this.positions.get(frame.item.id)?.fen?.split(/\s+/).slice(0, 4).join(" ") === position.fen.split(/\s+/).slice(0, 4).join(" "))) {
          this._emit("search-cycle", { item: this.runtime.current, reason: "This card revisited the same board on this line" });
          this._finish(false, "Unresolved: repeating board and card");
        } else {
          const rule = card.rules.find(rule => conditionMatches(position, rule.when));
          if (rule?.to === card.id) {
            this._emit("inspect-routed", { item: this.runtime.current, from: card.id, to: card.id,
              label: rule.label || conditionLabel(rule.when), when: rule.when });
            this._searchCard(card, position);
          } else if (rule?.to) this._transition(rule);
          else if (rule?.result) {
            const label = rule.label || conditionLabel(rule.when);
            this._emit("inspect-routed", { item: this.runtime.current, result: rule.result, to: rule.result, label, when: rule.when });
            this._finish(rule.result === "prove", label);
          } else this._searchCard(card, position);
        }
      }
      return { events: clone(this._stepEvents), snapshot: this.snapshot() };
    }

    run({ maxMicroSteps = 10000 } = {}) {
      const events = [];
      for (let count = 0; !this.runtime.result && count < maxMicroSteps; count++) events.push(...this.step().events);
      if (!this.runtime.result) {
        this._stepEvents = [];
        this.runtime.result = "reject";
        this.runtime.reason = `Execution safety limit: ${maxMicroSteps} steps`;
        this._emit("safety-limit", { maxMicroSteps, reason: this.runtime.reason });
        this._emit("terminal", { result: "reject", reason: this.runtime.reason });
        events.push(...this._stepEvents);
      }
      return { events, snapshot: this.snapshot() };
    }

    snapshot() {
      const pending = [...this._remainingInitial, ...this._stack.flatMap(frame => frame.remaining)];
      return clone({ engineVersion: VERSION, state: this.runtime.state,
        // The unchanged Oracle uses this capability to emit the current board's
        // legal one-ply child facts before any card rule is evaluated.
        stateKind: "search", stateAction: "card", stateDescription: this.stateDef()?.description || "",
        current: this.runtime.current, pendingCount: pending.length, pendingStackCount: pending.length,
        stack: this._stack.map(frame => ({ position: frame.item, card: frame.cardId, side: frame.side, remaining: frame.remaining })),
        frontier: this.runtime.frontier, selectedFrontier: this.runtime.selectedFrontier, search: this.runtime.search,
        thoughtCount: this.runtime.thoughtCount, microStepCount: this.runtime.microStepCount,
        result: this.runtime.result, reason: this.runtime.reason, action: this.runtime.action,
        lastMatch: this.runtime.lastMatch, timeline: this.runtime.timeline, trace: this.runtime.trace,
        roots: this.runtime.roots, nodes: this.runtime.nodeOrder.map(id => this.runtime.nodes[id]) });
    }
  }

  const createRunner = (project, options = {}) => new Runner(project, options);
  function runTest(project, test, options = {}) {
    const issues = validateProject(project);
    const errors = issues.filter(issue => issue.level === "error");
    if (errors.length) return { name: test?.name || "Unnamed test", expected: test?.expected, actual: "invalid", pass: false, issues, reason: errors.map(issue => issue.title).join("; ") };
    const runner = new Runner(project, { initial: test?.initial || project.initial });
    const { snapshot } = runner.run({ maxMicroSteps: options.maxMicroSteps || test?.max_micro_steps || 10000 });
    return { name: test?.name || "Unnamed test", expected: test?.expected, actual: snapshot.result,
      pass: snapshot.result === test?.expected, reason: snapshot.reason, thoughts: snapshot.thoughtCount,
      microSteps: snapshot.microStepCount, finalState: snapshot.state, snapshot: options.includeSnapshot ? snapshot : undefined };
  }
  function runTests(project, tests = project?.tests || [], options = {}) {
    const results = tests.map(test => runTest(project, test, options));
    return { pass: results.every(result => result.pass), passed: results.filter(result => result.pass).length, total: results.length, results };
  }

  const GRAMMAR = Object.freeze({
    policy: { schema: POLICY_SCHEMA, entry: "named chess card", budgets: { thoughts: "execution safety limit", depth: "execution safety limit" },
      states: [{ id: "card name", label: "human chess idea", kind: "card",
        rules: [{ label: "chess reason", when: { any: ["board predicate"], all: ["board predicate"], none: ["board predicate"] }, to: "next named chess card OR use result: prove/fail" }],
        my: { predicates: ["ordered move predicate OR {predicate, when: current board condition}"], limit: 5 }, their: { predicates: ["ordered reply predicate OR {predicate, when: current board condition}"] } }] },
    search: "Try our selected moves until one proves the objective; answer every opponent reply selected by this card. A self transition selects this card's moves immediately.",
    memory: "The search stack remembers only boards, the chess card chosen at each board, and untried sibling moves.",
    project: { schema: PROJECT_SCHEMA, name: "study name", initial: ["board ID"], policy: "chess-card policy", positions: [{ id: "board ID", side: "my or their", predicates: ["chess fact"], children: ["child board ID"] }] }
  });

  return Object.freeze({ VERSION, POLICY_SCHEMA, PROJECT_SCHEMA, STATE_KINDS, GRAMMAR, Runner,
    createRunner, validatePolicy, validateProject, runTest, runTests,
    closureLabel, conditionLabel, conditionMatches, stateDefFromPolicy, policyGraphTargets });
});
