// Tiny syntax highlighter for the docs' code blocks (no dependency).
// Not a full parser: a line-by-line tokenizer that's right for the short snippets we show.
// Colors come from JetBrains' Darcula theme (see --syntax-* in styles/tokens.css).

export type Lang = "python" | "ts" | "json" | "shell" | "text";

export type Token = { text: string; kind?: TokenKind };
export type TokenKind =
  | "keyword"
  | "string"
  | "number"
  | "comment"
  | "fn" // function / class name being defined or called
  | "builtin"
  | "self" // Python self/cls, JS this
  | "decorator"
  | "key" // JSON object keys
  | "prompt"; // "$" in terminal blocks

// Guess the language from a code block label like "main.py" or "terminal".
export function langFromLabel(label: string): Lang {
  const l = label.toLowerCase();
  if (l.endsWith(".py") || l === "python") return "python";
  if (/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(l) || l === "typescript" || l === "javascript") return "ts";
  if (l.endsWith(".json") || l === "json") return "json";
  if (l === "terminal" || l === "shell" || l === "bash" || l.endsWith(".sh")) return "shell";
  return "text";
}

const words = (s: string) => new Set(s.split(" "));

const KEYWORDS: Record<Lang, Set<string>> = {
  python: words(
    "False None True and as assert async await break class continue def del elif else except finally for from global if import in is lambda nonlocal not or pass raise return try while with yield match case",
  ),
  ts: words(
    "abstract as async await break case catch class const continue debugger default delete do else enum export extends false finally for from function if implements import in instanceof interface let new null of private protected public readonly return static super switch throw true try type typeof undefined var void while yield",
  ),
  json: words("true false null"),
  shell: words("cd export if then fi for do done echo"),
  text: new Set(),
};

const BUILTINS: Record<Lang, Set<string>> = {
  python: words(
    "print len range dict list set tuple str int float bool open isinstance type super enumerate zip map filter sorted min max sum any all getattr setattr hasattr Exception ValueError KeyError",
  ),
  ts: words("console process JSON Math Promise Object Array String Number Boolean Date Error Map Set fetch window document"),
  json: new Set(),
  shell: words("bun bunx pip python npm git docker curl"),
  text: new Set(),
};

const SELF: Record<Lang, Set<string>> = {
  python: words("self cls"),
  ts: words("this"),
  json: new Set(),
  shell: new Set(),
  text: new Set(),
};

// One regex per language; the first matching alternative wins at each position.
const PATTERNS: Record<Lang, RegExp | null> = {
  python:
    /(#.*)|([rbfuRBFU]{0,2}"""[\s\S]*?"""|[rbfuRBFU]{0,2}'''[\s\S]*?'''|[rbfuRBFU]{0,2}"(?:\\.|[^"\\])*"|[rbfuRBFU]{0,2}'(?:\\.|[^'\\])*')|(@[\w.]+)|(\b\d[\d_]*(?:\.\d+)?(?:e[+-]?\d+)?\b)|([A-Za-z_]\w*)/g,
  ts: /(\/\/.*|\/\*[\s\S]*?\*\/)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)|(@[\w.]+)|(\b\d[\d_]*(?:\.\d+)?(?:e[+-]?\d+)?\b)|([A-Za-z_$][\w$]*)/g,
  json: /()("(?:\\.|[^"\\])*")()|(-?\b\d+(?:\.\d+)?(?:e[+-]?\d+)?\b)|([A-Za-z_]\w*)/g,
  shell: /(#.*)|("(?:\\.|[^"\\])*"|'[^']*')|((?!))|(\b\d+\b)|([A-Za-z_][\w-]*)/g,
  text: null,
};

// Split code into colored tokens. Multi-line strings/comments are handled because we
// tokenize the whole snippet, not line by line.
export function highlight(code: string, lang: Lang): Token[] {
  const re = PATTERNS[lang];
  if (!re) return [{ text: code }];
  const out: Token[] = [];
  let last = 0;
  let prevWord = ""; // previous identifier, to spot `def name` / `function name`
  re.lastIndex = 0;

  for (let m = re.exec(code); m; m = re.exec(code)) {
    if (m[0] === "") {
      re.lastIndex++; // empty alternative matched: step forward
      continue;
    }
    if (m.index > last) out.push({ text: code.slice(last, m.index) });
    const [text, comment, str, deco, num, ident] = m;
    const after = code.slice(re.lastIndex);

    let kind: TokenKind | undefined;
    if (comment) kind = "comment";
    else if (str) kind = lang === "json" && /^\s*:/.test(after) ? "key" : "string";
    else if (deco) kind = "decorator";
    else if (num) kind = "number";
    else if (ident) {
      // TS/JS object property `name: value` (even `type:`): purple, like JSON keys.
      if (lang === "ts" && /^\s*:(?!:)/.test(after) && !/\?\s*$/.test(code.slice(0, m.index))) kind = "key";
      else if (KEYWORDS[lang].has(ident)) kind = "keyword";
      else if (SELF[lang].has(ident)) kind = "self";
      else if (["def", "class", "function", "interface", "type"].includes(prevWord)) kind = "fn";
      else if (BUILTINS[lang].has(ident)) kind = "builtin";
      else if (lang !== "shell" && /^\s*\(/.test(after)) kind = "fn"; // a call: name(
      prevWord = ident;
    }
    out.push({ text, kind });
    last = re.lastIndex;
  }
  if (last < code.length) out.push({ text: code.slice(last) });

  if (lang === "shell") {
    return out.flatMap((t) =>
      t.kind === undefined && /(^|\n)\$ /.test(t.text)
        ? t.text.split(/(\$ )/).map((p) => (p === "$ " ? { text: p, kind: "prompt" as const } : { text: p }))
        : [t],
    );
  }
  return out;
}
