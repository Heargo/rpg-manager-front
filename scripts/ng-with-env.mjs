// Runs `ng <args>` with the build-time contact key injected as the `__CONTACT_KEY__` define.
// The key comes from the CONTACT_KEY environment variable, or from a gitignored `.env` file.
import { spawnSync } from "node:child_process";
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

const ngBin = createRequire(import.meta.url).resolve("@angular/cli/bin/ng.js");
const result = spawnSync(
  process.execPath,
  [
    ngBin,
    ...process.argv.slice(2),
    `--define=__CONTACT_KEY__=${JSON.stringify(key)}`,
  ],
  { stdio: "inherit" },
);
process.exit(result.status ?? 1);
