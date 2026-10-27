import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const skillRoot = join(here, "..");
const repoRoot = join(skillRoot, "..", "..");

const skillMd = readFileSync(join(skillRoot, "SKILL.md"), "utf8");
const clawhubJson = JSON.parse(readFileSync(join(skillRoot, "clawhub.json"), "utf8"));
const mcpPkg = JSON.parse(readFileSync(join(repoRoot, "packages", "mcp", "package.json"), "utf8"));
const demoMd = readFileSync(join(skillRoot, "demo", "conversational-session.md"), "utf8");

function registeredToolNames() {
  const sources = [
    readFileSync(join(repoRoot, "packages", "mcp", "src", "tools.ts"), "utf8"),
    readFileSync(join(repoRoot, "packages", "mcp", "src", "spendTools.ts"), "utf8"),
  ];
  const names = [];
  const re = /server\.registerTool\(\s*"([a-z0-9_]+)"/g;
  for (const src of sources) {
    let m;
    while ((m = re.exec(src)) !== null) {
      names.push(m[1]);
    }
  }
  return names;
}

test("SKILL.md carries valid OpenClaw / ClawHub frontmatter and MCP wiring", () => {
  const fmMatch = skillMd.match(/^---\n([\s\S]*?)\n---\n/);
  assert.ok(fmMatch, "SKILL.md must start with YAML frontmatter");
  const fm = fmMatch[1];
  assert.match(fm, /^name:\s*eunomia-treasury$/m);
  assert.match(fm, /^homepage:\s*https:\/\/eunomia\.finance$/m);
  assert.match(fm, /openclaw:/);
  assert.match(fm, /primaryEnv:\s*EUNOMIA_TREASURY/);
  assert.match(fm, /command:\s*npx/);
  assert.match(fm, /-\s*eunomia-mcp/);
});

test("clawhub.json manifest matches eunomia-mcp package metadata", () => {
  assert.equal(clawhubJson.name, "eunomia-treasury");
  assert.equal(clawhubJson.slug, "eunomia-treasury");
  assert.equal(clawhubJson.version, mcpPkg.version);
  assert.equal(clawhubJson.skillFile, "SKILL.md");
  assert.equal(clawhubJson.mcpServer.package, mcpPkg.name);
  const envNames = clawhubJson.env.map((e) => e.name);
  assert.ok(envNames.includes("EUNOMIA_TREASURY"));
  assert.ok(envNames.includes("EUNOMIA_RPC_URL"));
});

test("every tool registered in eunomia-mcp is documented in packages/clawhub-skill/SKILL.md", () => {
  const tools = registeredToolNames();
  assert.equal(tools.length, 12, "expected all 12 eunomia-mcp tools");
  for (const tool of tools) {
    assert.ok(
      skillMd.includes(`\`${tool}\``),
      `SKILL.md is missing documentation for eunomia-mcp tool "${tool}"`,
    );
  }
});

test("recorded conversational demo covers init, budget pre-flight, refusal handling, and float sweep", () => {
  for (const marker of [
    "eunomia-mcp init",
    "request_budget",
    "check_budget",
    "ExceedsTaskLimit",
    "request_exception",
    "find_services",
    "fund_float",
    "call_service",
    "sweep_float",
  ]) {
    assert.ok(demoMd.includes(marker), `demo/conversational-session.md is missing "${marker}"`);
  }
  assert.ok(!skillMd.includes("EUNOMIA_AGENT_SECRET="), "SKILL.md must never embed an agent secret");
  assert.ok(!demoMd.includes("EUNOMIA_AGENT_SECRET="), "demo must never embed an agent secret");
});
