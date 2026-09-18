/*
 * Declarative predicate input for the sigil DFA. No cards, routing, or search.
 *
 * Hydrate after the unchanged Oracle synchronizes its position map. Boolean
 * combinations, own-data field equality/existence, and counts of already
 * generated child predicates become named inputs. Child observation does not
 * apply moves or pop/reach child positions; observedChildren reports that work.
 * A child count is valid only when every declared child is present in the map.
 * Repetition compares FEN identities only along the Oracle's root/move ID path.
 * It never reads solver occurrences, frames, continuations, or visited siblings.
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
  const pathParts = path => typeof path === "string" && /^[A-Za-z_]\w*(\.[A-Za-z_]\w*)*$/.test(path)
    && !path.split(".").some(part => ["__proto__", "prototype", "constructor"].includes(part));
  const field = (position, path) => path.split(".").reduce((value, part) =>
    object(value) && has(value, part) ? value[part] : undefined, position);

  function validate(declarations) {
    const errors = [];
    if (!object(declarations)) return ["predicate_inputs must be an object"];
    const visit = (expression, label, dependencies) => {
      if (!object(expression)) { errors.push(`${label}: expected an expression`); return; }
      for (const key of Object.keys(expression)) {
        if (!["any", "all", "none", "fields", "children", "repetition", "path_depth"].includes(key)) errors.push(`${label}: unknown input ${key}`);
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
          if (!pathParts(path)) errors.push(`${label}.fields: invalid own-data path ${path}`);
          if (!object(comparison) || !Object.keys(comparison).length
            || Object.keys(comparison).some(key => !["eq", "exists"].includes(key))
            || (has(comparison, "eq") && typeof comparison.eq !== "string")
            || (has(comparison, "exists") && comparison.exists !== true)) errors.push(`${label}.fields.${path}: use string eq and/or exists:true`);
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
      if (has(expression, "repetition")) {
        const spec = expression.repetition;
        if (!object(spec) || Object.keys(spec).some(key => !["field", "pattern", "count"].includes(key))
          || spec.field !== "fen" || spec.count !== 2 || (spec.pattern !== undefined && typeof spec.pattern !== "string")) errors.push(`${label}.repetition: use fen, count:2, and optional pattern`);
        else if (spec.pattern !== undefined) {
          try { new RegExp(spec.pattern); } catch (cause) { errors.push(`${label}.repetition: ${cause.message}`); }
        }
      }
      if (has(expression, "path_depth")) {
        const bounds = expression.path_depth;
        if (!object(bounds) || !Object.keys(bounds).length || Object.keys(bounds).some(key => !["min", "max"].includes(key))
          || Object.values(bounds).some(value => !Number.isInteger(value) || value < 0)
          || (bounds.min !== undefined && bounds.max !== undefined && bounds.min > bounds.max)) errors.push(`${label}.path_depth: use nonnegative min/max`);
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

  function hydrate(runner) {
    const declarations = runner?.policy?.predicate_inputs || {};
    const errors = validate(declarations);
    if (errors.length) throw new Error(errors.join("; "));
    const positions = runner?.positions;
    if (!(positions instanceof Map)) throw new Error("predicate input requires a position Map");
    const names = Object.keys(declarations), raw = new Map(), memo = new Map();
    for (const [id, position] of positions) {
      const predicates = rawForCopy.has(position) ? rawForCopy.get(position) : [...(position.predicates || [])];
      raw.set(id, { position, predicates, set: new Set(predicates) });
    }
    let observedChildren = 0;
    const matchesAlias = (id, name) => {
      let cache = memo.get(id);
      if (!cache) { cache = new Map(); memo.set(id, cache); }
      if (!cache.has(name)) cache.set(name, matches(id, declarations[name]));
      return cache.get(name);
    };
    const matchesName = (id, name) => has(declarations, name)
      ? matchesAlias(id, name) : Boolean(raw.get(id)?.set.has(name));
    const matches = (id, expression) => {
      const entry = raw.get(id);
      if (!entry) return false;
      if (expression.any?.length && !expression.any.some(name => matchesName(id, name))) return false;
      if (expression.all?.some(name => !matchesName(id, name))) return false;
      if (expression.none?.some(name => matchesName(id, name))) return false;
      for (const [path, comparison] of Object.entries(expression.fields || {})) {
        const value = field(entry.position, path);
        if (comparison.exists && (value === undefined || value === null)) return false;
        if (has(comparison, "eq") && value !== comparison.eq) return false;
      }
      if (expression.children) {
        const ids = entry.position.children;
        if (!Array.isArray(ids) || ids.some(child => !raw.has(child))) return false;
        observedChildren += ids.length;
        const count = ids.filter(child => matches(child, expression.children.where)).length;
        const bounds = expression.children.count;
        if ((bounds.min !== undefined && count < bounds.min) || (bounds.max !== undefined && count > bounds.max)) return false;
      }
      if (expression.repetition) {
        const spec = expression.repetition;
        const pattern = spec.pattern === undefined ? null : new RegExp(spec.pattern);
        const identity = position => {
          const value = position?.fen;
          return typeof value === "string" && value.length ? (pattern ? value.match(pattern)?.[0] || null : value) : null;
        };
        const key = identity(entry.position);
        if (key === null || typeof id !== "string") return false;
        let count = 0;
        for (let ancestor = id; ancestor; ancestor = ancestor.includes("/") ? ancestor.slice(0, ancestor.lastIndexOf("/")) : "") {
          if (!raw.has(ancestor)) return false;
          if (identity(raw.get(ancestor).position) === key) count++;
        }
        if (count < spec.count) return false;
      }
      if (expression.path_depth) {
        if (typeof id !== "string") return false;
        const depth = id.split("/").length - 1;
        const bounds = expression.path_depth;
        if ((bounds.min !== undefined && depth < bounds.min) || (bounds.max !== undefined && depth > bounds.max)) return false;
      }
      return true;
    };
    const emitted = [];
    let changed = false;
    // Read from the frozen raw view, then publish copies. No source card changes.
    for (const [id, entry] of raw) {
      const extra = names.filter(name => matchesAlias(id, name));
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
    return { changed, emitted, observedChildren };
  }

  return Object.freeze({ VERSION: "1.0.0", hydrate, validate });
});
