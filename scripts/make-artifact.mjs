/**
 * Turns the Vite single-file build into a file the Artifact tool can publish.
 *
 * Artifacts wrap the uploaded file in their own `<!doctype html><head>…</head>
 * <body>` skeleton, so the published file must contain page CONTENT only — no
 * document shell. This strips the shell and keeps, in order:
 *   <title>  (the Artifact tool scans the first 8KB for it)
 *   <link rel="stylesheet">  (Google Fonts — the one host the Artifact CSP allows)
 *   <style>  (the whole inlined stylesheet)
 *   <div id="root"> + the inlined module script
 *
 * Run: npm run artifact   ->   dist/artifact.html
 */
import { readFile, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = resolve(root, "dist/index.html");
const target = resolve(root, "dist/artifact.html");

const html = await readFile(source, "utf8");

const section = (tag) => {
  const m = html.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  if (!m) throw new Error(`No <${tag}> found in ${source}`);
  return m[1];
};

const head = section("head");
const body = section("body");

const keepFromHead = [
  ...(head.match(/<title[\s\S]*?<\/title>/i) ?? []),
  ...(head.match(/<link\b[^>]*rel=["']stylesheet["'][^>]*>/gi) ?? []),
  ...(head.match(/<style[\s\S]*?<\/style>/gi) ?? []),
];

if (!keepFromHead.some((s) => s.startsWith("<title"))) {
  throw new Error("Build is missing a <title> — the artifact would be named after the file.");
}

// vite-plugin-singlefile inlines the bundle into <head>. Collect every script
// from both sections and re-emit them AFTER the markup, so #root exists by the
// time the module runs.
const SCRIPT = /<script[\s\S]*?<\/script>/gi;
const scripts = [...(head.match(SCRIPT) ?? []), ...(body.match(SCRIPT) ?? [])];
if (scripts.length === 0) throw new Error("Build produced no <script> — nothing would run.");

const markup = body.replace(SCRIPT, "").trim();

const out = `${keepFromHead.join("\n")}\n${markup}\n${scripts.join("\n")}\n`;

await writeFile(target, out, "utf8");

const kb = (Buffer.byteLength(out) / 1024).toFixed(1);
console.log(`dist/artifact.html  ${kb} kB  — publish this file`);
