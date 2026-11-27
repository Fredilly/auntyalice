/**
 * Dependency-free maths renderer.
 *
 * Emits MathML, which every current browser renders natively: no KaTeX payload, no
 * web font, no layout shift, and screen readers announce it as mathematics rather
 * than as a string of letters. On a 3G Nigerian connection that difference is the
 * whole feature.
 *
 * Supports the subset the Academy actually authors: superscripts, subscripts,
 * fractions, and the comparison/operation symbols we use.
 */

const SYMBOLS: Record<string, string> = {
  times: "\u00d7", div: "\u00f7", cdot: "\u00b7", pm: "\u00b1",
  neq: "\u2260", leq: "\u2264", geq: "\u2265", to: "\u2192",
  approx: "\u2248", infty: "\u221e", pi: "\u03c0",
};

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

type Node = string;

/** Read a braced group or a single token at position i. */
function readArg(src: string, i: number): { out: string; i: number } {
  while (src[i] === " ") i++;
  if (src[i] === "{") {
    const end = matchBrace(src, i);
    return { out: parse(src.slice(i + 1, end)), i: end + 1 };
  }
  if (src[i] === "\\") {
    const cmd = /^\\([a-zA-Z]+)/.exec(src.slice(i))!;
    return { out: `<mo>${esc(SYMBOLS[cmd[1]] ?? cmd[1])}</mo>`, i: i + cmd[0].length };
  }
  const ch = src[i] ?? "";
  return { out: /[0-9]/.test(ch) ? `<mn>${esc(ch)}</mn>` : `<mi>${esc(ch)}</mi>`, i: i + 1 };
}

function matchBrace(src: string, start: number): number {
  let depth = 0;
  for (let i = start; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}") { depth--; if (depth === 0) return i; }
  }
  return src.length;
}

function parse(src: string): string {
  const parts: string[] = [];
  let i = 0;

  while (i < src.length) {
    const ch = src[i];

    if (ch === " ") { i++; continue; }

    if (ch === "\\") {
      const m = /^\\([a-zA-Z]+)/.exec(src.slice(i));
      if (m) {
        const name = m[1];
        i += m[0].length;
        if (name === "frac") {
          const a = readArg(src, i); i = a.i;
          const b = readArg(src, i); i = b.i;
          parts.push(`<mfrac><mrow>${a.out}</mrow><mrow>${b.out}</mrow></mfrac>`);
          continue;
        }
        parts.push(`<mo>${esc(SYMBOLS[name] ?? name)}</mo>`);
        continue;
      }
      i++;
      continue;
    }

    // superscript / subscript attaches to what came before
    if (ch === "^" || ch === "_") {
      i++;
      const arg = readArg(src, i); i = arg.i;
      const base = parts.pop() ?? "<mrow></mrow>";
      parts.push(
        ch === "^"
          ? `<msup>${base}<mrow>${arg.out}</mrow></msup>`
          : `<msub>${base}<mrow>${arg.out}</mrow></msub>`,
      );
      continue;
    }

    if (ch === "{") {
      const end = matchBrace(src, i);
      parts.push(`<mrow>${parse(src.slice(i + 1, end))}</mrow>`);
      i = end + 1;
      continue;
    }

    if (/[0-9.]/.test(ch)) {
      const num = /^[0-9.]+/.exec(src.slice(i))![0];
      parts.push(`<mn>${esc(num)}</mn>`);
      i += num.length;
      continue;
    }

    if (/[a-zA-Z]/.test(ch)) {
      parts.push(`<mi>${esc(ch)}</mi>`);
      i++;
      continue;
    }

    if ("+-=<>()|,/:".includes(ch)) {
      parts.push(`<mo>${esc(ch === "-" ? "\u2212" : ch)}</mo>`);
      i++;
      continue;
    }

    parts.push(`<mo>${esc(ch)}</mo>`);
    i++;
  }

  return parts.join("");
}

export function toMathML(tex: string): string {
  return parse(tex);
}

/**
 * Inline maths inside prose: $a^m \times a^n$. Everything else is escaped text.
 */
function renderInline(text: string): string {
  return esc(text).replace(/\$([^$]+)\$/g, (_, tex: string) => {
    return `<math display="inline"><mrow>${toMathML(tex)}</mrow></math>`;
  });
}

export function Prose({ text, className }: { text: string; className?: string }) {
  return <p className={className} dangerouslySetInnerHTML={{ __html: renderInline(text) }} />;
}

export function MathBlock({ tex, label }: { tex: string; label?: string }) {
  return (
    <div className="math-block">
      <span className="math-render" role="math" aria-label={label ?? tex}
        dangerouslySetInnerHTML={{ __html: `<math display="block"><mrow>${toMathML(tex)}</mrow></math>` }} />
      {label ? <span className="math-label">{label}</span> : null}
    </div>
  );
}

export function MathInline({ tex }: { tex: string }) {
  return <span className="math-inline" role="math" aria-label={tex}
    dangerouslySetInnerHTML={{ __html: `<math display="inline"><mrow>${toMathML(tex)}</mrow></math>` }} />;
}
