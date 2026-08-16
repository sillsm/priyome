/*
 * Priyomes Predicate Policy Engine
 * predicate.js v1.0.0
 *
 * A DOM-free, deterministic engine for coordinate-free predicate policies over
 * finite game trees. The browser UI, storage, animation, examples, and editors
 * belong outside this file. This file owns only:
 *   - policy/project validation
 *   - DFA + bounded LIFO search execution
 *   - ordered predicate filtering and closure
 *   - routine CALL / RETURN semantics
 *   - test-case interpretation
 *   - an inspectable event stream and explored-tree snapshot
 *
 * Public global: window.PredicatePolicy
 * CommonJS:      const PredicatePolicy = require('./predicate.js')
 */
(function predicatePolicyUMD(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.PredicatePolicy = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function predicatePolicyFactory() {
  "use strict";

  const VERSION = "1.0.0";
  const POLICY_SCHEMA = "predicate-policy/v2";
  const PROJECT_SCHEMA = "predicate-policy-dfa-lab/project-v3";
  const STATE_KINDS = Object.freeze([
    "push_initial", "pop", "inspect", "search", "call", "return", "accept", "reject"
  ]);

  const clone = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  const unique = values => [...new Set(values)];
  const isObject = value => Boolean(value) && typeof value === "object" && !Array.isArray(value);
  const isStringArray = (value, allowEmpty = false) => Array.isArray(value)
    && (allowEmpty || value.length > 0)
    && value.every(item => typeof item === "string" && item.trim());
  const normalizeInitial = value => {
    if (Array.isArray(value)) return value.map(String).map(item => item.trim()).filter(Boolean);
    return String(value || "").split(/[\s,]+/).map(item => item.trim()).filter(Boolean);
  };

  function stateDefFromPolicy(policy, id) {
    return policy?.states?.find(state => state.id === id);
  }

  function closureLabel(stateOrClosure) {
    const closure = stateOrClosure?.closure || stateOrClosure;
    if (!closure) return "—";
    if (closure.mode === "all") return "all matching children";
    if (closure.mode === "one_each") {
      return `first match for each predicate${closure.count ? `, at most ${closure.count}` : ""}`;
    }
    const count = Number(closure.count || 1);
    return `first ${count} match${count === 1 ? "" : "es"}`;
  }

  function conditionLabel(when = {}) {
    const parts = [];
    if (when.side) parts.push(`side = ${when.side}`);
    if (Array.isArray(when.any) && when.any.length) parts.push(`any(${when.any.join(" · ")})`);
    if (Array.isArray(when.all) && when.all.length) parts.push(`all(${when.all.join(" · ")})`);
    if (Array.isArray(when.none) && when.none.length) parts.push(`none(${when.none.join(" · ")})`);
    return parts.join(" + ") || "always";
  }

  function conditionMatches(position, item, when = {}) {
    const predicates = position?.predicates || [];
    if (when.side && position?.side !== when.side) return false;
    if (Array.isArray(when.any) && when.any.length && !when.any.some(predicate => predicates.includes(predicate))) return false;
    if (Array.isArray(when.all) && when.all.length && !when.all.every(predicate => predicates.includes(predicate))) return false;
    if (Array.isArray(when.none) && when.none.some(predicate => predicates.includes(predicate))) return false;
    return true;
  }

  function policyGraphTargets(state, policy) {
    const targets = [];
    if (!state) return targets;
    if (state.kind === "inspect") {
      (state.rules || []).forEach(rule => rule?.to && targets.push(rule.to));
      if (state.default) targets.push(state.default);
      Object.values(state.on || {}).forEach(value => value && targets.push(value));
      if (state.terminal_checks !== false) {
        targets.push(policy.outcomes?.accept_state, policy.outcomes?.reject_state);
      }
    } else if (state.kind === "call") {
      const routine = policy.routines?.find(item => item.id === state.call?.routine);
      if (routine?.entry) targets.push(routine.entry);
      if (state.call?.return_to) targets.push(state.call.return_to);
    } else {
      Object.values(state.on || {}).forEach(value => value && targets.push(value));
    }
    return targets.filter(Boolean);
  }

  function validatePolicy(candidate) {
    const issues = [];
    const error = (title, detail) => issues.push({ level: "error", scope: "policy", title, detail });
    const warn = (title, detail) => issues.push({ level: "warn", scope: "policy", title, detail });

    if (!isObject(candidate)) {
      error("Policy must be an object", "The JSON root must be a policy object.");
      return issues;
    }
    if (candidate.schema !== POLICY_SCHEMA) error("Unknown policy schema", `Expected \"${POLICY_SCHEMA}\".`);
    if (!Array.isArray(candidate.states) || !candidate.states.length) error("No DFA states", "policy.states must be a non-empty array.");
    if (!Array.isArray(candidate.routines) || !candidate.routines.length) error("No routines", "policy.routines must be a non-empty array.");

    const states = Array.isArray(candidate.states) ? candidate.states : [];
    const routines = Array.isArray(candidate.routines) ? candidate.routines : [];
    const stateIds = states.map(state => state?.id).filter(Boolean);
    const routineIds = routines.map(routine => routine?.id).filter(Boolean);
    const stateSet = new Set(stateIds);
    const routineSet = new Set(routineIds);

    unique(stateIds.filter((id, index) => stateIds.indexOf(id) !== index)).forEach(id => error("Duplicate state ID", id));
    unique(routineIds.filter((id, index) => routineIds.indexOf(id) !== index)).forEach(id => error("Duplicate routine ID", id));

    if (!candidate.entry || !stateSet.has(candidate.entry)) {
      error("Invalid policy entry", `entry must name an existing state; received ${candidate.entry || "nothing"}.`);
    }

    const outcomes = candidate.outcomes;
    if (!isObject(outcomes)) {
      error("Missing outcomes", "Define accept_state, reject_state, winning_predicates, and failure_predicates.");
    } else {
      if (!stateSet.has(outcomes.accept_state)) error("Invalid accept state", outcomes.accept_state || "missing");
      if (!stateSet.has(outcomes.reject_state)) error("Invalid reject state", outcomes.reject_state || "missing");
      if (!isStringArray(outcomes.winning_predicates)) error("Winning predicates are invalid", "Use a non-empty array of strings.");
      if (!isStringArray(outcomes.failure_predicates, true)) error("Failure predicates are invalid", "Use an array of strings.");
    }

    const budgets = candidate.budgets;
    if (!budgets || !Number.isInteger(Number(budgets.thoughts)) || Number(budgets.thoughts) < 1) {
      error("Invalid thought budget", "budgets.thoughts must be a positive integer.");
    }
    if (!budgets || !Number.isInteger(Number(budgets.depth)) || Number(budgets.depth) < 0) {
      error("Invalid depth budget", "budgets.depth must be zero or a positive integer.");
    }
    if (!budgets || !Number.isInteger(Number(budgets.call_depth)) || Number(budgets.call_depth) < 0) {
      error("Invalid call-depth budget", "budgets.call_depth must be zero or a positive integer.");
    }

    routines.forEach((routine, index) => {
      const name = routine?.id || `routine ${index + 1}`;
      if (!routine?.id || typeof routine.id !== "string") error("Routine has no ID", name);
      if (!routine?.entry || !stateSet.has(routine.entry)) {
        error(`Routine ${name} has invalid entry`, routine?.entry || "missing");
      } else if (stateDefFromPolicy(candidate, routine.entry)?.routine !== routine.id) {
        error(`Routine ${name} entry belongs elsewhere`, `${routine.entry} is assigned to ${stateDefFromPolicy(candidate, routine.entry)?.routine || "no routine"}.`);
      }
    });

    const allowedClosure = new Set(["first", "all", "one_each"]);
    states.forEach((state, index) => {
      const name = state?.id || `state ${index + 1}`;
      if (!state?.id || typeof state.id !== "string") error("State has no ID", name);
      if (!STATE_KINDS.includes(state?.kind)) error(`${name} has invalid kind`, String(state?.kind));
      if (!routineSet.has(state?.routine)) error(`${name} has invalid routine`, state?.routine || "missing");

      const requireTarget = (target, label) => {
        if (!target || !stateSet.has(target)) error(`${name} has invalid ${label} target`, target || "missing");
      };

      if (state?.kind === "push_initial") {
        requireTarget(state.on?.pushed, "pushed");
        requireTarget(state.on?.invalid, "invalid");
      } else if (state?.kind === "pop") {
        requireTarget(state.on?.thought, "thought");
        requireTarget(state.on?.empty, "empty");
      } else if (state?.kind === "search") {
        if (!isStringArray(state.predicates)) error(`${name} has no predicate order`, "search.predicates must be a non-empty array of strings.");
        if (!allowedClosure.has(state.closure?.mode)) error(`${name} has invalid closure mode`, state.closure?.mode || "missing");
        if (state.closure?.mode === "first" && (!Number.isInteger(Number(state.closure?.count)) || Number(state.closure.count) < 1)) {
          error(`${name} has invalid closure count`, "first mode requires count >= 1.");
        }
        if (state.closure?.mode === "one_each" && state.closure?.count !== undefined
          && (!Number.isInteger(Number(state.closure.count)) || Number(state.closure.count) < 1)) {
          error(`${name} has invalid closure count`, "one_each count, when supplied, must be >= 1.");
        }
        if (state.side && !["my", "their"].includes(state.side)) error(`${name} has invalid side`, state.side);
        requireTarget(state.on?.pushed, "pushed");
        requireTarget(state.on?.none, "none");
        const duplicates = state.predicates?.filter((item, itemIndex) => state.predicates.indexOf(item) !== itemIndex) || [];
        if (duplicates.length) warn(`${name} repeats search predicates`, unique(duplicates).join(", "));
      } else if (state?.kind === "inspect") {
        if (!Array.isArray(state.rules)) error(`${name} rules are invalid`, "inspect.rules must be an ordered array.");
        (state.rules || []).forEach((rule, ruleIndex) => {
          requireTarget(rule?.to, `rule ${ruleIndex + 1}`);
          const when = rule?.when || {};
          if (when.side && !["my", "their"].includes(when.side)) error(`${name} rule ${ruleIndex + 1} has invalid side`, when.side);
          ["any", "all", "none"].forEach(key => {
            if (when[key] !== undefined && !isStringArray(when[key], true)) {
              error(`${name} rule ${ruleIndex + 1} has invalid ${key}`, "Use an array of predicate strings.");
            }
          });
          if (!Object.keys(when).length && ruleIndex !== state.rules.length - 1) {
            warn(`${name} has an early always-rule`, `Rule ${ruleIndex + 1} shadows every rule below it.`);
          }
        });
        if (state.default) requireTarget(state.default, "default");
        if (state.on?.depth) requireTarget(state.on.depth, "depth");
        if (state.on?.missing) requireTarget(state.on.missing, "missing");
      } else if (state?.kind === "call") {
        if (!routineSet.has(state.call?.routine)) error(`${name} calls an unknown routine`, state.call?.routine || "missing");
        requireTarget(state.call?.return_to, "return_to");
      } else if (state?.kind === "return") {
        if (state.on?.no_frame) requireTarget(state.on.no_frame, "no_frame");
      }
    });

    if (outcomes && stateSet.has(outcomes.accept_state) && stateDefFromPolicy(candidate, outcomes.accept_state)?.kind !== "accept") {
      error("accept_state is not an accept state", outcomes.accept_state);
    }
    if (outcomes && stateSet.has(outcomes.reject_state) && stateDefFromPolicy(candidate, outcomes.reject_state)?.kind !== "reject") {
      error("reject_state is not a reject state", outcomes.reject_state);
    }

    if (stateSet.has(candidate.entry)) {
      const visited = new Set();
      const queue = [candidate.entry];
      while (queue.length) {
        const id = queue.shift();
        if (visited.has(id)) continue;
        visited.add(id);
        const state = stateDefFromPolicy(candidate, id);
        if (!state) continue;
        policyGraphTargets(state, candidate).forEach(target => {
          if (stateSet.has(target) && !visited.has(target)) queue.push(target);
        });
      }
      const unreachable = stateIds.filter(id => !visited.has(id));
      if (unreachable.length) warn("Unreachable states", unreachable.join(", "));
    }

    return issues;
  }

  function validateProject(candidate) {
    const issues = [...validatePolicy(candidate?.policy)];
    const error = (title, detail) => issues.push({ level: "error", scope: "project", title, detail });
    const warn = (title, detail) => issues.push({ level: "warn", scope: "project", title, detail });

    if (!candidate || candidate.schema !== PROJECT_SCHEMA) error("Unknown project schema", `Expected \"${PROJECT_SCHEMA}\".`);
    if (!candidate?.name?.trim()) error("Project name is empty", "Give the workbench a readable name.");
    const positions = Array.isArray(candidate?.positions) ? candidate.positions : [];
    const ids = positions.map(position => position?.id).filter(Boolean);
    const idSet = new Set(ids);
    unique(ids.filter((id, index) => ids.indexOf(id) !== index)).forEach(id => error("Duplicate position ID", id));
    if (!positions.length) error("No oracle position cards", "At least one position card is required.");

    positions.forEach((position, index) => {
      const name = position?.id || `position ${index + 1}`;
      if (!position?.id || typeof position.id !== "string") error("Position has no ID", name);
      if (!["my", "their"].includes(position?.side)) error(`${name} has invalid side`, "Use \"my\" or \"their\".");
      if (!isStringArray(position?.predicates, true)) error(`${name} predicates are invalid`, "Use an array of strings.");
      if (position.children !== undefined && !Array.isArray(position.children)) error(`${name} children are invalid`, "Use an array of position IDs.");
      (position.children || []).forEach(child => {
        if (!idSet.has(child)) error(`${name} points to a missing child`, child);
      });
    });

    if (!Array.isArray(candidate?.initial) || !candidate.initial.length) {
      warn("No saved initial thoughts", "The runner may still supply them explicitly.");
    }
    (candidate?.initial || []).forEach(id => {
      if (!idSet.has(id)) error("Missing initial position", id);
    });

    (candidate?.tests || []).forEach((test, index) => {
      if (!isObject(test)) {
        error(`Test ${index + 1} is invalid`, "Each test must be an object.");
        return;
      }
      if (!Array.isArray(test.initial)) error(`Test ${index + 1} has invalid initial list`, test.name || "unnamed");
      else test.initial.forEach(id => { if (!idSet.has(id)) error(`Test ${index + 1} names a missing position`, id); });
      if (!["accept", "reject"].includes(test.expected)) error(`Test ${index + 1} has invalid expected result`, String(test.expected));
    });

    if (!issues.some(issue => issue.level === "error") && !issues.some(issue => issue.level === "warn")) {
      issues.push({
        level: "ok", scope: "project", title: "Project is structurally valid",
        detail: "Policy grammar, routines, transitions, oracle references, budgets, and outcomes are coherent."
      });
    }
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
      this.positions = new Map((this.project?.positions || []).map(position => [position.id, position]));
      this.validation = validateProject(this.project);
      this.reset(options.initial ?? this.project?.initial ?? []);
      return this;
    }

    subscribe(listener) {
      if (typeof listener !== "function") throw new TypeError("listener must be a function");
      this._listeners.add(listener);
      return () => this._listeners.delete(listener);
    }

    stateDef(id = this.runtime?.state) {
      return stateDefFromPolicy(this.policy, id);
    }

    routineDef(id) {
      return this.policy?.routines?.find(routine => routine.id === id);
    }

    getPosition(id) {
      return this.positions.get(id);
    }

    _newOccurrence(id, depth, parentOccurrence, matchedBy, status = "queued") {
      const occurrence = `n${++this._occurrenceCounter}`;
      const node = {
        occurrence,
        id,
        parent: parentOccurrence || null,
        depth: Number(depth || 0),
        matchedBy: matchedBy || null,
        status,
        note: "",
        order: this.runtime.nodeOrder.length
      };
      this.runtime.nodes[occurrence] = node;
      this.runtime.nodeOrder.push(occurrence);
      if (!node.parent) this.runtime.roots.push(occurrence);
      return { id, depth: node.depth, parent: node.parent, matchedBy: node.matchedBy, occurrence };
    }

    _node(itemOrOccurrence) {
      const occurrence = typeof itemOrOccurrence === "string" ? itemOrOccurrence : itemOrOccurrence?.occurrence;
      return occurrence ? this.runtime.nodes[occurrence] : null;
    }

    _setNode(itemOrOccurrence, patch) {
      const node = this._node(itemOrOccurrence);
      if (node) Object.assign(node, patch);
    }

    reset(initial = this.project?.initial || []) {
      this._occurrenceCounter = 0;
      const entry = this.policy?.entry;
      const entryState = stateDefFromPolicy(this.policy, entry);
      const initialIds = normalizeInitial(initial);
      this.runtime = {
        state: entry,
        routine: entryState?.routine || this.policy?.routines?.[0]?.id || "main",
        pending: [],
        current: null,
        callStack: [],
        frontier: [],
        selectedFrontier: [],
        search: null,
        initialIds,
        initialItems: [],
        thoughtCount: 0,
        microStepCount: 0,
        result: null,
        reason: "",
        lastMatch: null,
        action: "ready",
        timeline: entry ? [{ state: entry, routine: entryState?.routine || "main", label: "entry" }] : [],
        trace: [],
        roots: [],
        nodes: {},
        nodeOrder: [],
        stateVisit: 0,
        countedVisit: -1,
        bootstrapError: ""
      };
      this._stepEvents = [];

      const missing = initialIds.filter(id => !this.positions.has(id));
      if (!initialIds.length) this.runtime.bootstrapError = "no initial position supplied";
      else if (missing.length) this.runtime.bootstrapError = `unknown initial position: ${missing.join(", ")}`;

      this.runtime.initialItems = initialIds.map(id => this._newOccurrence(id, 0, null, "initial", "queued"));

      if (!this.runtime.bootstrapError && entryState && entryState.kind !== "push_initial") {
        if (entryState.kind === "pop") {
          [...this.runtime.initialItems].reverse().forEach(item => this.runtime.pending.push(item));
        } else {
          const [first, ...rest] = this.runtime.initialItems;
          if (first) {
            this.runtime.current = first;
            this._setNode(first, { status: "active" });
          }
          [...rest].reverse().forEach(item => this.runtime.pending.push(item));
        }
      }

      if (entryState?.kind === "accept") {
        this.runtime.result = "accept";
        this.runtime.reason = `entered ${entryState.id}`;
      } else if (entryState?.kind === "reject") {
        this.runtime.result = "reject";
        this.runtime.reason = `entered ${entryState.id}`;
      }

      this._emit("reset", { initial: initialIds });
      return this.snapshot();
    }

    _emit(type, data = {}) {
      const event = {
        index: this.runtime.trace.length,
        type,
        state: this.runtime.state,
        routine: this.runtime.routine,
        thoughtCount: this.runtime.thoughtCount,
        microStepCount: this.runtime.microStepCount,
        ...clone(data)
      };
      this.runtime.trace.push(event);
      this._stepEvents.push(event);
      this._listeners.forEach(listener => {
        try { listener(clone(event), this.snapshot()); } catch (_) { /* listeners do not control the engine */ }
      });
      return event;
    }

    _transition(to, label, reason = "") {
      const from = this.runtime.state;
      const target = stateDefFromPolicy(this.policy, to);
      if (!target) {
        const reject = this.policy?.outcomes?.reject_state;
        const rejectState = stateDefFromPolicy(this.policy, reject);
        this.runtime.state = reject;
        this.runtime.routine = rejectState?.routine || "main";
        this.runtime.stateVisit += 1;
        this.runtime.search = null;
        this.runtime.result = "reject";
        this.runtime.reason = `transition target ${to} does not exist`;
        this.runtime.timeline.push({ state: reject, routine: this.runtime.routine, label: "invalid transition" });
        this._emit("transition", { from, to: reject, label: "invalid transition" });
        this._emit("terminal", { result: "reject", reason: this.runtime.reason });
        return;
      }

      this.runtime.state = to;
      this.runtime.routine = target.routine;
      this.runtime.stateVisit += 1;
      this.runtime.search = null;
      this.runtime.timeline.push({ state: to, routine: target.routine, label });
      this._emit("transition", { from, to, label, reason });

      if (target.kind === "accept" || target.kind === "reject") {
        this.runtime.result = target.kind === "accept" ? "accept" : "reject";
        this.runtime.reason = reason || this.runtime.reason || `entered ${target.id}`;
        if (this.runtime.current) {
          this._setNode(this.runtime.current, {
            status: target.kind === "accept" ? "accepted" : "rejected",
            note: this.runtime.reason
          });
        }
        this._emit("terminal", { result: this.runtime.result, reason: this.runtime.reason, state: target.id });
      }
    }

    _countStateVisit() {
      if (this.runtime.countedVisit === this.runtime.stateVisit) return true;
      const budget = Number(this.policy?.budgets?.thoughts || 0);
      if (this.runtime.thoughtCount >= budget) {
        this.runtime.action = "thought budget exhausted";
        this._emit("budget-exhausted", { budget });
        this._transition(this.policy.outcomes.reject_state, "budget exhausted", `thought budget ${budget} exhausted`);
        return false;
      }
      this.runtime.thoughtCount += 1;
      this.runtime.countedVisit = this.runtime.stateVisit;
      const state = this.stateDef();
      this.runtime.action = state?.description || state?.kind || "state";
      this._emit("state-enter", { state: state?.id, kind: state?.kind, description: state?.description || "" });
      return true;
    }

    _frameBase() {
      return this.runtime.callStack.length ? this.runtime.callStack.at(-1).pendingBase : 0;
    }

    _initializeSearch(state) {
      const position = this.runtime.current && this.positions.get(this.runtime.current.id);
      if (!position) return null;
      const frontier = (position.children || []).map(id => ({
        id,
        depth: Number(this.runtime.current.depth || 0) + 1,
        parent: this.runtime.current.occurrence
      }));
      const predicates = [...(state.predicates || [])];
      this.runtime.frontier = clone(frontier);
      this.runtime.selectedFrontier = [];
      this.runtime.search = {
        stateVisit: this.runtime.stateVisit,
        parent: clone(this.runtime.current),
        frontier,
        predicates,
        predicateIndex: 0,
        selected: [],
        used: [],
        checks: predicates.map(predicate => ({ predicate, status: "waiting", selected: [] })),
        complete: false
      };
      this._emit("search-start", {
        position: position.id,
        occurrence: this.runtime.current.occurrence,
        predicates,
        closure: clone(state.closure),
        closureLabel: closureLabel(state),
        childCount: frontier.length
      });
      return this.runtime.search;
    }

    _completeSearch(state, session) {
      session.complete = true;
      const selected = session.selected;
      [...selected].reverse().forEach(item => this.runtime.pending.push(item));
      this.runtime.selectedFrontier = clone(selected);
      if (selected.length) {
        this._setNode(session.parent, {
          status: "expanded",
          note: `${selected.length} child${selected.length === 1 ? "" : "ren"} retained by ${state.id}`
        });
      } else {
        this._setNode(session.parent, {
          status: "closed",
          note: `no child matched ${state.predicates.join(" → ")}`
        });
      }
      this.runtime.lastMatch = selected.at(-1)?.matchedBy || null;
      this.runtime.reason = selected.length
        ? `${selected.length} child${selected.length === 1 ? "" : "ren"} retained`
        : "no child matched";
      this._emit("search-complete", {
        position: session.parent.id,
        occurrence: session.parent.occurrence,
        selected: clone(selected),
        selectedCount: selected.length,
        closure: clone(state.closure),
        closureLabel: closureLabel(state)
      });
      this.runtime.current = null;
      this._transition(selected.length ? state.on.pushed : state.on.none, selected.length ? "matches retained" : "no matches");
    }

    _stepSearch(state) {
      const position = this.runtime.current && this.positions.get(this.runtime.current.id);
      if (!position) {
        this._emit("search-error", { reason: "search state has no current position" });
        this._transition(this.policy.outcomes.reject_state, "search without position", "search state has no current position");
        return;
      }

      const session = this.runtime.search?.stateVisit === this.runtime.stateVisit
        ? this.runtime.search
        : this._initializeSearch(state);
      if (!session) {
        this._transition(this.policy.outcomes.reject_state, "missing oracle position", "current position is not in the oracle");
        return;
      }

      const index = session.predicateIndex;
      const predicate = session.predicates[index];
      if (predicate === undefined) {
        this._completeSearch(state, session);
        return;
      }

      session.checks[index].status = "checking";
      const closure = state.closure || { mode: "first", count: 1 };
      const maximum = closure.mode === "first"
        ? Number(closure.count || 1)
        : closure.mode === "one_each" && closure.count
          ? Number(closure.count)
          : Infinity;
      const used = new Set(session.used);
      const selectedNow = [];
      const matchingIds = [];

      for (const child of session.frontier) {
        if (used.has(child.id)) continue;
        const childPosition = this.positions.get(child.id);
        if (!childPosition?.predicates?.includes(predicate)) continue;
        matchingIds.push(child.id);
        if (session.selected.length >= maximum) break;
        const item = this._newOccurrence(child.id, child.depth, child.parent, predicate, "queued");
        session.selected.push(item);
        session.used.push(child.id);
        used.add(child.id);
        selectedNow.push(item);
        if (session.selected.length >= maximum) break;
        if (closure.mode === "one_each") break;
      }

      session.checks[index].selected = selectedNow.map(item => item.id);
      session.checks[index].status = selectedNow.length ? "matched" : "missed";
      this.runtime.lastMatch = selectedNow.length ? predicate : this.runtime.lastMatch;
      this._emit("predicate-checked", {
        position: position.id,
        occurrence: session.parent.occurrence,
        predicate,
        predicateIndex: index,
        predicateCount: session.predicates.length,
        matchingIds,
        selected: clone(selectedNow),
        selectedTotal: session.selected.length,
        closure: clone(closure),
        closureReached: session.selected.length >= maximum
      });

      const closureReached = session.selected.length >= maximum;
      const lastPredicate = index >= session.predicates.length - 1;
      if (closureReached || lastPredicate) {
        if (closureReached) {
          session.checks.slice(index + 1).forEach(check => { check.status = "skipped"; });
        }
        this._completeSearch(state, session);
      } else {
        session.predicateIndex += 1;
        session.checks[session.predicateIndex].status = "next";
      }
    }

    step() {
      this._stepEvents = [];
      if (this.runtime.result) return { events: [], snapshot: this.snapshot() };
      const errors = this.validation.filter(issue => issue.level === "error");
      if (errors.length) {
        this.runtime.result = "reject";
        this.runtime.reason = `invalid project: ${errors[0].title}`;
        this._emit("invalid-project", { issues: errors });
        return { events: clone(this._stepEvents), snapshot: this.snapshot() };
      }

      this.runtime.microStepCount += 1;
      if (!this._countStateVisit() || this.runtime.result) {
        return { events: clone(this._stepEvents), snapshot: this.snapshot() };
      }

      const state = this.stateDef();
      if (!state) {
        this._transition(this.policy.outcomes.reject_state, "missing state", `state ${this.runtime.state} is missing`);
        return { events: clone(this._stepEvents), snapshot: this.snapshot() };
      }

      if (state.kind === "push_initial") {
        if (this.runtime.bootstrapError) {
          this._emit("initial-invalid", { reason: this.runtime.bootstrapError });
          this._transition(state.on.invalid, "invalid initial input", this.runtime.bootstrapError);
        } else {
          [...this.runtime.initialItems].reverse().forEach(item => this.runtime.pending.push(item));
          this._emit("initial-retained", { items: clone(this.runtime.initialItems) });
          this._transition(state.on.pushed, "initial positions retained");
        }
      } else if (state.kind === "pop") {
        const base = this._frameBase();
        if (this.runtime.pending.length <= base) {
          this.runtime.current = null;
          this.runtime.frontier = [];
          this.runtime.selectedFrontier = [];
          this._emit("frontier-empty", {
            local: Boolean(this.runtime.callStack.length),
            routine: this.runtime.routine,
            reason: this.runtime.callStack.length ? "subroutine has no local line left" : "no retained line remains"
          });
          this._transition(state.on.empty, "no retained line", this.runtime.callStack.length ? this.runtime.reason : "every retained line closed");
        } else {
          const item = this.runtime.pending.pop();
          this.runtime.current = item;
          this.runtime.frontier = [];
          this.runtime.selectedFrontier = [];
          this.runtime.lastMatch = item.matchedBy || "initial";
          this.runtime.reason = `examining ${item.id}`;
          this._setNode(item, { status: "active" });
          this._emit("line-selected", { item: clone(item) });
          this._transition(state.on.thought, "line selected");
        }
      } else if (state.kind === "inspect") {
        const item = this.runtime.current;
        const position = item && this.positions.get(item.id);
        if (!position) {
          const target = state.on?.missing || this.policy.outcomes.reject_state;
          this._emit("inspect-error", { reason: "current position has no oracle card" });
          this._transition(target, "missing oracle card", "current position has no oracle card");
        } else {
          const win = state.terminal_checks === false
            ? null
            : this.policy.outcomes.winning_predicates.find(predicate => position.predicates.includes(predicate));
          const failure = state.terminal_checks === false
            ? null
            : this.policy.outcomes.failure_predicates.find(predicate => position.predicates.includes(predicate));

          if (win) {
            this.runtime.lastMatch = win;
            this._setNode(item, { status: "accepted", note: `winning predicate ${win}` });
            this._emit("winning-predicate", { item: clone(item), predicate: win });
            this._transition(this.policy.outcomes.accept_state, "winning predicate", `${position.id} carries winning predicate ${win}`);
          } else if (failure) {
            this.runtime.lastMatch = failure;
            this._setNode(item, { status: "rejected", note: `failure predicate ${failure}` });
            this._emit("failure-predicate", { item: clone(item), predicate: failure });
            this._transition(this.policy.outcomes.reject_state, "failure predicate", `${position.id} carries failure predicate ${failure}`);
          } else if ((item.depth || 0) >= this.policy.budgets.depth) {
            const target = state.on?.depth || state.default || this.policy.outcomes.reject_state;
            this._setNode(item, { status: "closed", note: `depth ${this.policy.budgets.depth} closure` });
            this.runtime.current = null;
            this.runtime.frontier = [];
            this.runtime.selectedFrontier = [];
            this._emit("depth-closed", { item: clone(item), depth: this.policy.budgets.depth });
            this._transition(target, "depth closure");
          } else {
            const rule = (state.rules || []).find(candidate => conditionMatches(position, item, candidate.when));
            const target = rule?.to || state.default || this.policy.outcomes.reject_state;
            const label = rule?.label || (rule ? conditionLabel(rule.when) : "default");
            this.runtime.lastMatch = label;
            this.runtime.reason = `${position.id}: ${label}`;
            this._emit("inspect-routed", {
              item: clone(item),
              predicates: clone(position.predicates),
              rule: clone(rule || null),
              label,
              to: target
            });
            this._transition(target, label);
          }
        }
      } else if (state.kind === "search") {
        this._stepSearch(state);
      } else if (state.kind === "call") {
        const callee = this.routineDef(state.call?.routine);
        if (!callee) {
          this._transition(this.policy.outcomes.reject_state, "invalid call", `routine ${state.call?.routine} does not exist`);
        } else if (this.runtime.callStack.length >= this.policy.budgets.call_depth) {
          this._emit("call-depth-exhausted", { budget: this.policy.budgets.call_depth });
          this._transition(this.policy.outcomes.reject_state, "call depth exhausted", "subroutine call-depth budget exhausted");
        } else {
          this.runtime.callStack.push({
            callerRoutine: state.routine,
            calleeRoutine: callee.id,
            returnTo: state.call.return_to,
            pendingBase: this.runtime.pending.length,
            callerCurrent: this.runtime.current ? clone(this.runtime.current) : null,
            resumeCurrent: Boolean(state.call.resume_current),
            callState: state.id
          });
          this.runtime.reason = `entered ${callee.id}`;
          this._emit("routine-called", {
            from: state.routine,
            routine: callee.id,
            entry: callee.entry,
            returnTo: state.call.return_to
          });
          this._transition(callee.entry, `call ${callee.id}`);
        }
      } else if (state.kind === "return") {
        if (!this.runtime.callStack.length) {
          const target = state.on?.no_frame || this.policy.outcomes.reject_state;
          this._emit("return-error", { reason: "no caller frame" });
          this._transition(target, "return without frame", "RETURN had no caller frame");
        } else {
          const frame = this.runtime.callStack.pop();
          const discardedItems = this.runtime.pending.slice(frame.pendingBase);
          discardedItems.forEach(item => this._setNode(item, { status: "discarded", note: `discarded on return from ${frame.calleeRoutine}` }));
          this.runtime.pending.length = frame.pendingBase;
          this.runtime.current = frame.resumeCurrent ? frame.callerCurrent : null;
          this.runtime.frontier = [];
          this.runtime.selectedFrontier = [];
          this.runtime.reason = `returned from ${frame.calleeRoutine} to ${frame.returnTo}`;
          this._emit("routine-returned", {
            from: frame.calleeRoutine,
            to: frame.callerRoutine,
            returnTo: frame.returnTo,
            discarded: discardedItems.map(item => item.id)
          });
          this._transition(frame.returnTo, `return from ${frame.calleeRoutine}`);
        }
      } else if (state.kind === "accept") {
        this.runtime.result = "accept";
        this.runtime.reason ||= `entered ${state.id}`;
        this._emit("terminal", { result: "accept", reason: this.runtime.reason, state: state.id });
      } else if (state.kind === "reject") {
        this.runtime.result = "reject";
        this.runtime.reason ||= `entered ${state.id}`;
        this._emit("terminal", { result: "reject", reason: this.runtime.reason, state: state.id });
      }

      return { events: clone(this._stepEvents), snapshot: this.snapshot() };
    }

    run(options = {}) {
      const maxMicroSteps = Math.max(1, Number(options.maxMicroSteps || 10000));
      const eventLog = [];
      let count = 0;
      while (!this.runtime.result && count < maxMicroSteps) {
        const result = this.step();
        eventLog.push(...result.events);
        count += 1;
      }
      if (!this.runtime.result && count >= maxMicroSteps) {
        this.runtime.result = "reject";
        this.runtime.reason = `engine safety limit ${maxMicroSteps} reached`;
        this._emit("safety-limit", { maxMicroSteps });
      }
      return { events: clone(eventLog), snapshot: this.snapshot() };
    }

    snapshot() {
      const currentState = this.stateDef();
      const nodes = this.runtime.nodeOrder.map(occurrence => clone(this.runtime.nodes[occurrence]));
      return clone({
        engineVersion: VERSION,
        state: this.runtime.state,
        stateKind: currentState?.kind || null,
        stateDescription: currentState?.description || "",
        routine: this.runtime.routine,
        pendingCount: this.runtime.pending.length,
        current: this.runtime.current,
        callStack: this.runtime.callStack,
        frontier: this.runtime.frontier,
        selectedFrontier: this.runtime.selectedFrontier,
        search: this.runtime.search,
        thoughtCount: this.runtime.thoughtCount,
        microStepCount: this.runtime.microStepCount,
        result: this.runtime.result,
        reason: this.runtime.reason,
        lastMatch: this.runtime.lastMatch,
        action: this.runtime.action,
        timeline: this.runtime.timeline,
        trace: this.runtime.trace,
        roots: this.runtime.roots,
        nodes
      });
    }
  }

  function createRunner(project, options = {}) {
    return new Runner(project, options);
  }

  function runTest(project, test, options = {}) {
    const issues = validateProject(project);
    const errors = issues.filter(issue => issue.level === "error");
    if (errors.length) {
      return {
        name: test?.name || "Unnamed test",
        expected: test?.expected,
        actual: "invalid",
        pass: false,
        reason: errors.map(issue => `${issue.title}: ${issue.detail}`).join("; "),
        issues
      };
    }
    const runner = new Runner(project, { initial: test?.initial || project.initial });
    const result = runner.run({ maxMicroSteps: options.maxMicroSteps || test?.max_micro_steps || 10000 });
    const actual = result.snapshot.result || "reject";
    return {
      name: test?.name || "Unnamed test",
      expected: test?.expected,
      actual,
      pass: actual === test?.expected,
      reason: result.snapshot.reason,
      thoughts: result.snapshot.thoughtCount,
      microSteps: result.snapshot.microStepCount,
      finalState: result.snapshot.state,
      snapshot: options.includeSnapshot ? result.snapshot : undefined
    };
  }

  function runTests(project, tests = project?.tests || [], options = {}) {
    const results = (tests || []).map(test => runTest(project, test, options));
    return {
      pass: results.every(result => result.pass),
      passed: results.filter(result => result.pass).length,
      total: results.length,
      results
    };
  }

  const GRAMMAR = Object.freeze({
    policy: {
      schema: POLICY_SCHEMA,
      entry: "state-id",
      outcomes: {
        accept_state: "state-id(kind=accept)",
        reject_state: "state-id(kind=reject)",
        winning_predicates: ["predicate"],
        failure_predicates: ["predicate"]
      },
      budgets: { thoughts: "integer>=1", depth: "integer>=0", call_depth: "integer>=0" },
      routines: [{ id: "routine-id", label: "optional text", entry: "state-id in this routine" }],
      states: "ordered array of state objects"
    },
    stateKinds: {
      push_initial: { on: { pushed: "state-id", invalid: "state-id" } },
      pop: { on: { thought: "state-id", empty: "state-id" } },
      inspect: {
        terminal_checks: "boolean (default true)",
        rules: [{ label: "text", when: { side: "my|their", any: ["p"], all: ["p"], none: ["p"] }, to: "state-id" }],
        default: "optional state-id",
        on: { depth: "optional state-id", missing: "optional state-id" }
      },
      search: {
        side: "optional my|their documentation label",
        predicates: ["checked in exact order"],
        closure: { mode: "first|all|one_each", count: "required for first; optional for one_each" },
        on: { pushed: "state-id", none: "state-id" }
      },
      call: { call: { routine: "routine-id", return_to: "state-id", resume_current: "boolean" } },
      return: { on: { no_frame: "optional state-id" } },
      accept: {},
      reject: {}
    },
    project: {
      schema: PROJECT_SCHEMA,
      name: "text",
      initial: ["position-id"],
      policy: "policy object",
      positions: [{
        id: "unique position-id",
        side: "my|their",
        predicates: ["predicate"],
        help: "optional UI text",
        children: ["position-id"],
        label: "optional UI label; ignored by engine"
      }],
      tests: [{ name: "text", initial: ["position-id"], expected: "accept|reject" }]
    }
  });

  const api = {
    VERSION,
    POLICY_SCHEMA,
    PROJECT_SCHEMA,
    STATE_KINDS,
    GRAMMAR,
    Runner,
    createRunner,
    validatePolicy,
    validateProject,
    runTest,
    runTests,
    closureLabel,
    conditionLabel,
    conditionMatches,
    stateDefFromPolicy,
    policyGraphTargets
  };

  return Object.freeze(api);
});
