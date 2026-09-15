/* ============================================================================
 * css-parser.js — strict parsing of the rule body the player types
 * ----------------------------------------------------------------------------
 * Pure functions: no DOM, no engine, no globals. That keeps the syntax rules
 * unit-testable on their own (see the parser tests run against this module).
 * ==========================================================================*/

/**
 * Parse the editable body of the rule, strictly.
 *
 * Errors come back as { key, vars } rather than finished sentences, so one
 * parser serves both languages and this module holds no display text.
 *
 * This is a CSS teaching tool, so the syntax is enforced rather than guessed
 * at: every declaration must be `property: value;`, terminating semicolon
 * included. Malformed code is reported with the line number the player sees
 * in the gutter — it is never quietly "fixed" and applied.
 */
export const DECL_RE = /^([a-zA-Z-]+)\s*:\s*([^:;]+?)\s*$/;

/* The textarea's first row is line 3 in the gutter: line 1 is the selector
   and line 2 is the fixed `display: flex;`. */
export const FIRST_EDITABLE_LINE = 3;

export function parseDeclarations(text) {
  const decls = {};
  const errors = [];
  const body = String(text || '').replace(/\/\*[\s\S]*?\*\//g, ' ');

  body.split('\n').forEach((raw, index) => {
    const line = raw.trim();
    if (!line) return;
    const n = index + FIRST_EDITABLE_LINE;

    if (!line.endsWith(';')) {
      errors.push(line.indexOf(':') === -1
        ? { key: 'err.form', vars: { line: n } }
        : { key: 'err.semicolon', vars: { line: n } });
      return;
    }

    /* A line may legitimately hold more than one declaration. */
    const parts = line.slice(0, -1).split(';');
    parts.forEach((part) => {
      const piece = part.trim();
      if (!piece) {
        errors.push({ key: 'err.straySemicolon', vars: { line: n } });
        return;
      }
      if (piece.indexOf(':') === -1) {
        errors.push({ key: 'err.colon', vars: { line: n } });
        return;
      }
      const match = piece.match(DECL_RE);
      if (!match) {
        errors.push({ key: 'err.malformed', vars: { line: n, text: piece } });
        return;
      }
      const property = match[1].toLowerCase();
      const value = match[2].toLowerCase();
      if (value.indexOf(' ') !== -1) {
        errors.push({ key: 'err.multiWord', vars: { line: n, text: value } });
        return;
      }
      decls[property] = value;
    });
  });

  return { decls, errors };
}
