import { readdir, readFile, writeFile, stat } from "node:fs/promises";
import path from "node:path";

const distDir = path.resolve(process.cwd(), "dist");

async function listFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const out = [];
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await listFiles(p)));
    else out.push(p);
  }
  return out;
}

function hasKnownNodeExtension(spec) {
  // ignore query/hash (unlikely in node output but safe)
  const clean = spec.split(/[?#]/)[0];
  return (
    clean.endsWith(".js") ||
    clean.endsWith(".mjs") ||
    clean.endsWith(".cjs") ||
    clean.endsWith(".json") ||
    clean.endsWith(".node")
  );
}

function rewriteRelativeSpecifiers(code) {
  // Rewrites:
  //  import x from "./foo"        -> "./foo.js"
  //  export * from "../bar"       -> "../bar.js"
  //  import("./baz")              -> "./baz.js"
  // Only for relative specifiers without an extension.

  const rewrite = (spec) => {
    if (!(spec.startsWith("./") || spec.startsWith("../"))) return spec;
    if (hasKnownNodeExtension(spec)) return spec;
    return `${spec}.js`;
  };

  // static imports/exports
  code = code.replace(
    /\b(from\s+)(["'])(\.\.?\/[^"']+)\2/g,
    (_m, fromKw, quote, spec) => `${fromKw}${quote}${rewrite(spec)}${quote}`
  );

  // dynamic import()
  code = code.replace(
    /\bimport\s*\(\s*(["'])(\.\.?\/[^"']+)\1\s*\)/g,
    (_m, quote, spec) => `import(${quote}${rewrite(spec)}${quote})`
  );

  return code;
}

async function main() {
  let s;
  try {
    s = await stat(distDir);
  } catch {
    console.warn(`[fix-esm-imports] dist/ not found at ${distDir}; skipping.`);
    return;
  }
  if (!s.isDirectory()) {
    console.warn(`[fix-esm-imports] dist is not a directory; skipping.`);
    return;
  }

  const files = (await listFiles(distDir)).filter((f) => f.endsWith(".js"));
  let changed = 0;

  for (const f of files) {
    const original = await readFile(f, "utf8");
    const updated = rewriteRelativeSpecifiers(original);
    if (updated !== original) {
      await writeFile(f, updated, "utf8");
      changed++;
    }
  }

  console.log(`[fix-esm-imports] processed ${files.length} files, updated ${changed}.`);
}

await main();

