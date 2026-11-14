// Runs `ng <args>` with the build-time contact key injected as the `__CONTACT_KEY__` define.
// The key comes from the CONTACT_KEY environment variable, or from a gitignored `.env` file.
import { spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";

function fromDotEnv() {
  if (!existsSync(".env")) return "";
  const line = readFileSync(".env", "utf8")
    .split(/\r?\n/)
    .find((l) => /^\s*CONTACT_KEY\s*=/.test(l));
  return line
    ? line
        .replace(/^[^=]*=/, "")
        .trim()
        .replace(/^(['"])(.*)\1$/, "$2")
    : "";
}

// `||`: an empty variable on the host must not mask the `.env` value.
const key = process.env.CONTACT_KEY || fromDotEnv();
if (!key) {
  console.warn(
    "[ng-with-env] CONTACT_KEY is empty: the contact form will be unavailable.",
  );
}

// `serve` also runs the user documentation's dev server (Astro, port 4321) and tells the app where it is
// (`__DOCS_DEV_PORT__`, see core/constants/docs-origin.ts), so the Help links work in development.
// SKIP_DOCS=1 leaves it out.
const DOCS_PORT = "4321";
const serveDocs = process.argv[2] === "serve" && !process.env.SKIP_DOCS;
let docs = null;
if (serveDocs) {
  const npm = process.platform === "win32" ? "npm.cmd" : "npm";
  spawnSync(npm, ["--prefix", "user-docs", "install", "--no-audit", "--no-fund", "--silent"], {
    stdio: "inherit",
  });
  // Reachable from other devices when the app is (`ng serve --host ...`).
  const host = process.argv.includes("--host") ? ["--host"] : [];
  docs = spawn(npm, ["--prefix", "user-docs", "run", "dev", "--", "--port", DOCS_PORT, ...host], {
    stdio: ["ignore", "ignore", "inherit"],
  });
  console.log(`[ng-with-env] User documentation: http://localhost:${DOCS_PORT}/docs/`);
}
const stopDocs = () => docs?.kill();
process.on("exit", stopDocs);
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => process.exit(130));

const ngBin = createRequire(import.meta.url).resolve("@angular/cli/bin/ng.js");
const result = spawnSync(
  process.execPath,
  [
    ngBin,
    ...process.argv.slice(2),
    `--define=__CONTACT_KEY__=${JSON.stringify(key)}`,
    ...(serveDocs ? [`--define=__DOCS_DEV_PORT__=${JSON.stringify(DOCS_PORT)}`] : []),
  ],
  { stdio: "inherit" },
);
process.exit(result.status ?? 1);
