#!/usr/bin/env node
import { readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(join(root, "index.html"), "utf8");
const app = readFileSync(join(root, "App.jsx"), "utf8");
const out = html.replace(
  /<script type="text\/babel"[^>]*>[\s\S]*<\/script>/,
  `<script type="text/babel" data-presets="react,env">\n${app}\n</script>`
);
writeFileSync(join(root, "index.html"), out);
console.log("Synced App.jsx → index.html");
