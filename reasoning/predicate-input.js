/*
 * Named chess facts from Oracle boards and their generated legal moves.
 *
 * Hydrate after the unchanged Oracle synchronizes its position map. Boolean
 * combinations, permitted chess field comparisons, and counts of already
 * generated child predicates become named inputs. Child observation does not
 * apply moves or pop/reach child positions; observedChildren reports that work.
 * Child counts require the Oracle's complete legal move set. Missing analysis
 * is unknown, including when an alias is negated; it never certifies safety.
 * Expressions cannot inspect solver state, search history, board coordinates,
 * budgets, or arbitrary metadata. This module chooses no move or continuation.
 * Hydration normally updates the displayed board and its legal candidates.
 * Its identity chooses which boards to observe, never which facts are true.
 */
(function predicateInputsUMD(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.PredicateInputs = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function predicateInputsFactory() {
  "use strict";

  const rawForCopy = new WeakMap();
  const has = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
  const object = value => value !== null && typeof value === "object" && !Array.isArray(value);
  const fieldValues = Object.freeze({
    side: ["my", "their"],
    to_play: ["my", "their", "w", "b"],
    "move.mover.type": ["p", "n", "b", "r", "q", "k"],
    "move.captured.type": ["p", "n", "b", "r", "q", "k"]
  });
  const field = (position, path) => path.split(".").reduce((value, part) =>
    object(value) && has(value, part) ? value[part] : undefined, position);

  function validate(declarations) {
    const errors = [];
    if (!object(declarations)) return ["predicate_inputs must be an object"];
    const visit = (expression, label, dependencies) => {
      if (!object(expression)) { errors.push(`${label}: expected an expression`); return; }
      for (const key of Object.keys(expression)) {
        if (!["any", "all", "none", "fields", "children"].includes(key)) errors.push(`${label}: unknown input ${key}`);
      }
      for (const key of ["any", "all", "none"]) {
        if (!has(expression, key)) continue;
        const names = expression[key];
        if (!Array.isArray(names) || names.some(name => typeof name !== "string" || !name)) {
          errors.push(`${label}.${key}: expected predicate names`);
        } else names.filter(name => has(declarations, name)).forEach(name => dependencies.add(name));
      }
      if (has(expression, "fields")) {
        if (!object(expression.fields) || !Object.keys(expression.fields).length) errors.push(`${label}.fields: expected field comparisons`);
        else for (const [path, comparison] of Object.entries(expression.fields)) {
          if (!has(fieldValues, path)) errors.push(`${label}.fields: unsupported chess field ${path}`);
          if (!object(comparison) || !Object.keys(comparison).length
            || Object.keys(comparison).some(key => !["eq", "exists"].includes(key))
            || (has(comparison, "eq") && typeof comparison.eq !== "string")
            || (has(comparison, "exists") && comparison.exists !== true)) errors.push(`${label}.fields.${path}: use string eq and/or exists:true`);
          else if (has(comparison, "eq") && has(fieldValues, path) && !fieldValues[path].includes(comparison.eq)) {
            errors.push(`${label}.fields.${path}: unknown chess value ${comparison.eq}`);
          }
        }
      }
      if (has(expression, "children")) {
        const spec = expression.children;
        if (!object(spec) || Object.keys(spec).some(key => !["where", "count"].includes(key))) errors.push(`${label}.children: expected where/count`);
        else {
          visit(spec.where, `${label}.children.where`, dependencies);
          const count = spec.count;
          if (!object(count) || !Object.keys(count).length || Object.keys(count).some(key => !["min", "max"].includes(key))
            || Object.values(count).some(value => !Number.isInteger(value) || value < 0)
            || (count.min !== undefined && count.max !== undefined && count.min > count.max)) errors.push(`${label}.children.count: use nonnegative min/max`);
        }
      }
    };
    const dependencies = new Map();
    for (const [name, expression] of Object.entries(declarations)) {
      if (!name) errors.push("predicate_inputs: empty predicate name");
      const refs = new Set();
      visit(expression, name, refs);
      dependencies.set(name, refs);
    }
    const active = new Set(), done = new Set();
    const acyclic = name => {
      if (active.has(name)) { errors.push(`predicate_inputs: cyclic alias ${name}`); return; }
      if (done.has(name)) return;
      active.add(name);
      for (const ref of dependencies.get(name) || []) acyclic(ref);
      active.delete(name); done.add(name);
    };
    dependencies.forEach((_, name) => acyclic(name));
    return errors;
  }

  function hydrate(runner, options = {}) {
    const declarations = runner?.policy?.predicate_inputs || {};
    const errors = validate(declarations);
    if (errors.length) throw new Error(errors.join("; "));
    const positions = runner?.positions;
    if (!(positions instanceof Map)) throw new Error("predicate input requires a position Map");
    const names = Object.keys(declarations), raw = new Map(), memo = new Map();
    const read = id => {
      if (raw.has(id)) return raw.get(id);
      const position = positions.get(id);
      if (!position) return null;
      const predicates = rawForCopy.has(position) ? rawForCopy.get(position) : [...(position.predicates || [])];
      const entry = { position, predicates, set: new Set(predicates) };
      raw.set(id, entry);
      return entry;
    };
    let targetIds;
    if (has(options, "ids")) {
      if (!Array.isArray(options.ids)) throw new Error("predicate input ids must be an array");
      targetIds = [...new Set(options.ids)];
    } else {
      // This is only an observation focus. No expression receives runner data.
      const currentId = runner?.runtime?.current?.id;
      const current = positions.get(currentId);
      targetIds = current
        ? [...new Set([currentId, ...(current.children || [])])]
        : [...positions.keys()];
    }
    let observedChildren = 0;
    const matchesAlias = (id, name) => {
      let cache = memo.get(id);
      if (!cache) { cache = new Map(); memo.set(id, cache); }
      if (!cache.has(name)) cache.set(name, matches(id, declarations[name]));
      return cache.get(name);
    };
    const matchesName = (id, name) => has(declarations, name)
      ? matchesAlias(id, name) : Boolean(read(id)?.set.has(name));
    const matches = (id, expression) => {
      const entry = read(id);
      if (!entry) return null;
      let unknown = false;
      if (expression.any?.length) {
        const results = expression.any.map(name => matchesName(id, name));
        if (!results.includes(true)) {
          if (!results.includes(null)) return false;
          unknown = true;
        }
      }
      for (const name of expression.all || []) {
        const result = matchesName(id, name);
        if (result === false) return false;
        if (result === null) unknown = true;
      }
      for (const name of expression.none || []) {
        const result = matchesName(id, name);
        if (result === true) return false;
        if (result === null) unknown = true;
      }
      for (const [path, comparison] of Object.entries(expression.fields || {})) {
        const value = field(entry.position, path);
        if (comparison.exists && (value === undefined || value === null)) return false;
        if (has(comparison, "eq") && value !== comparison.eq) return false;
      }
      if (expression.children) {
        const ids = entry.position.children;
        const complete = entry.position.expanded === true && entry.position.prepared === true
          && Array.isArray(ids) && new Set(ids).size === ids.length
          && Number.isInteger(entry.position.meta?.legalReplyCount)
          && entry.position.meta.legalReplyCount === ids.length
          && !entry.set.has("unexplorable") && !entry.set.has("oracle_limit")
          && ids.every(child => read(child)?.set.has("legal_move"));
        if (!complete) return null;
        observedChildren += ids.length;
        const results = ids.map(child => matches(child, expression.children.where));
        const count = results.filter(result => result === true).length;
        const uncertain = results.filter(result => result === null).length;
        const bounds = expression.children.count;
        if ((bounds.min !== undefined && count + uncertain < bounds.min)
          || (bounds.max !== undefined && count > bounds.max)) return false;
        if ((bounds.min !== undefined && count < bounds.min)
          || (bounds.max !== undefined && count + uncertain > bounds.max)) unknown = true;
      }
      return unknown ? null : true;
    };
    const emitted = [];
    let changed = false;
    // Publish only observed boards. Deeper quantified evidence is read lazily.
    for (const id of targetIds) {
      const entry = read(id);
      if (!entry) continue;
      const extra = names.filter(name => matchesAlias(id, name) === true);
      const predicates = [...new Set([...entry.predicates, ...extra])];
      emitted.push({ id, predicates: extra });
      if (predicates.length !== entry.position.predicates?.length
        || predicates.some((value, index) => value !== entry.position.predicates[index])) {
        const copy = { ...entry.position, predicates };
        rawForCopy.set(copy, entry.predicates);
        positions.set(id, copy);
        changed = true;
      }
    }
    return { changed, emitted, observedChildren, observedPositions: raw.size };
  }

  return Object.freeze({ VERSION: "2.0.1-board-facts", hydrate, validate });
});
