import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { runCli } from "../src/cli.js";
import { runDoctor } from "../src/lib/doctor.js";
import { initProject } from "../src/lib/kit.js";
import { readManifest } from "../src/lib/manifest.js";
import { getShippedSkills } from "../src/lib/skills.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const templateRoot = path.join(repoRoot, "templates/project");
const skillsRoot = path.join(templateRoot, ".agents/skills");
const workflowRoot = path.join(templateRoot, ".agents/workflows");
const hookRoot = path.join(repoRoot, "templates/hooks");
const pluginRoot = path.join(repoRoot, "plugins/codex-kit");
const packageJson = JSON.parse(await readFile(path.join(repoRoot, "package.json"), "utf8"));
const version = packageJson.version;

const CORE_SKILLS = [
  "planning",
  "brainstorming",
  "repo-onboarding",
  "architecture",
  "debugging",
  "code-review",
  "testing",
  "test-hardening",
  "lint-and-validate",
  "documentation",
  "security-review",
  "release-deployment",
  "api-patterns",
  "database-design",
  "frontend-design",
  "tailwind-patterns",
  "web-design-guidelines"
].sort();

const OPTIONAL_SKILLS = [
  "app-builder",
  "parallel-agents",
  "nodejs-best-practices",
  "python-patterns",
  "rust-pro",
  "mcp-builder",
  "mcp-onboarding",
  "mobile-design",
  "nextjs-react-expert",
  "i18n-localization",
  "game-development",
  "red-team-tactics",
  "performance-profiling",
  "seo-fundamentals",
  "geo-fundamentals",
  "server-management",
  "doc",
  "bash-linux",
  "powershell-windows",
  "tdd-workflow",
  "webapp-testing"
].sort();

const OBSOLETE_SKILLS = [
  "plan-writing",
  "systematic-debugging",
  "bug-hunt",
  "code-review-checklist",
  "high-signal-review",
  "documentation-templates",
  "release-readiness",
  "behavioral-modes",
  "intelligent-routing",
  "clean-code"
];

const RENAMED_SKILLS = {
  "testing-patterns": "testing",
  "docs-shipper": "documentation",
  "vulnerability-scanner": "security-review",
  "deployment-procedures": "release-deployment"
};

const LEGACY_SKILL_NAMES = [...OBSOLETE_SKILLS, ...Object.keys(RENAMED_SKILLS)];

const STATIC_PROFILES = {
  "backend-node": ["nodejs-best-practices"],
  "backend-python": ["python-patterns"],
  rust: ["rust-pro"],
  "frontend-framework": ["nextjs-react-expert", "i18n-localization", "webapp-testing"],
  mobile: ["mobile-design"],
  game: ["game-development"],
  mcp: ["mcp-builder", "mcp-onboarding"],
  "security-advanced": ["red-team-tactics"],
  performance: ["performance-profiling"],
  operations: ["server-management", "bash-linux", "powershell-windows"],
  discoverability: ["seo-fundamentals", "geo-fundamentals"],
  documents: ["doc"],
  tdd: ["tdd-workflow"],
  scaffolding: ["app-builder"]
};

const EXPECTED_WORKFLOWS = [
  "brainstorm.md",
  "check.md",
  "create.md",
  "deploy.md",
  "enhance.md",
  "figma-to-code.md",
  "orchestrate.md",
  "plan.md",
  "preview.md",
  "ship.md",
  "status.md",
  "test.md",
  "ui-ux-pro-max.md",
  "verify.md"
].sort();

async function withTempProject(fn) {
  const targetDir = await mkdtemp(path.join(os.tmpdir(), "codex-kit-catalog-test-"));
  try {
    await fn(targetDir);
  } finally {
    await rm(targetDir, { recursive: true, force: true });
  }
}

async function listTopLevelSkills(root) {
  const entries = await readdir(root, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory() || entry.name === "doc.md")
    .map((entry) => entry.name === "doc.md" ? "doc" : entry.name)
    .sort();
}

function topLevelManifestSkills(manifest) {
  return [...new Set(
    manifest.files
      .filter((file) => file.target === "skills" && file.path.startsWith(".agents/skills/"))
      .map((file) => file.path.split("/")[2])
      .map((name) => name === "doc.md" ? "doc" : name)
  )].sort();
}

function profileMapFromCatalog(catalog) {
  const result = {};
  for (const skill of catalog) {
    for (const profile of skill.profiles || []) {
      result[profile] ||= [];
      result[profile].push(skill.name);
    }
  }
  return Object.fromEntries(
    Object.entries(result)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([profile, names]) => [profile, names.sort()])
  );
}

function runCliCommand(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(repoRoot, "bin/codex-kit.js"), ...args], {
      cwd: repoRoot,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", (code) => resolve({ code, stdout, stderr }));
  });
}

function replaceFrontmatterName(content, replacement) {
  const namePattern = /^(\s*name\s*:\s*)(["']?)[^\r\n"']+\2\s*$/m;
  const updated = content.replace(
    namePattern,
    (_match, prefix, quote) => `${prefix}${quote}${replacement}${quote}`
  );
  assert.notEqual(updated, content, "fixture frontmatter name must be replaced");
  assert.match(updated, new RegExp(`^\\s*name\\s*:\\s*["']?${replacement}["']?\\s*$`, "m"));
  return updated;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function assertSkillReferences(skillName, references) {
  const skillDir = path.join(skillsRoot, skillName);
  const skillContent = await readFile(path.join(skillDir, "SKILL.md"), "utf8");
  for (const reference of references) {
    const relativeReference = `references/${reference.file}`;
    assert.match(
      skillContent,
      new RegExp(escapeRegExp(relativeReference)),
      `${skillName} must link ${relativeReference}`
    );
    const referenceContent = await readFile(path.join(skillDir, "references", reference.file), "utf8");
    assert.match(referenceContent, reference.marker, `${relativeReference} is missing its semantic marker`);
  }
}

async function collectTextFiles(root, { skipDirectories = new Set() } = {}) {
  const files = [];
  const textExtensions = new Set([".js", ".json", ".md", ".py", ".rules", ".toml", ".ts", ".yaml", ".yml"]);

  async function visit(current) {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const absolutePath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (!skipDirectories.has(entry.name)) await visit(absolutePath);
      } else if (textExtensions.has(path.extname(entry.name))) {
        files.push(absolutePath);
      }
    }
  }

  await visit(root);
  return files;
}

test("catalog contains exactly 38 canonical skills split into 17 core and 21 optional", async () => {
  const catalog = await getShippedSkills(skillsRoot);
  const core = catalog.filter((skill) => skill.tier === "core").map((skill) => skill.name).sort();
  const optional = catalog.filter((skill) => skill.tier === "optional").map((skill) => skill.name).sort();

  assert.equal(catalog.length, 38);
  assert.deepEqual(core, CORE_SKILLS);
  assert.deepEqual(optional, OPTIONAL_SKILLS);
});

test("catalog tier, uniqueness, overlap, and profile reference invariants hold", async () => {
  const catalog = await getShippedSkills(skillsRoot);
  const names = catalog.map((skill) => skill.name);
  const optionalNames = new Set(catalog.filter((skill) => skill.tier === "optional").map((skill) => skill.name));
  const coreNames = new Set(catalog.filter((skill) => skill.tier === "core").map((skill) => skill.name));

  assert.equal(new Set(names).size, names.length, "catalog names must be unique");
  assert.equal([...coreNames].some((name) => optionalNames.has(name)), false, "tiers must not overlap");
  for (const skill of catalog) {
    assert.ok(["core", "optional"].includes(skill.tier), `${skill.name} has an invalid tier`);
    assert.ok(Array.isArray(skill.profiles), `${skill.name} profiles must be an array`);
    for (const profile of skill.profiles) {
      assert.equal(skill.tier, "optional", `${profile} must only reference optional skills`);
      assert.ok(Object.hasOwn(STATIC_PROFILES, profile), `${profile} is not a supported profile`);
      assert.ok(optionalNames.has(skill.name), `${profile} references a missing optional skill`);
    }
  }
});

test("static profiles resolve to the exact optional skill sets", async () => {
  const catalog = await getShippedSkills(skillsRoot);
  const expected = Object.fromEntries(
    Object.entries(STATIC_PROFILES)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([profile, names]) => [profile, [...names].sort()])
  );

  assert.deepEqual(profileMapFromCatalog(catalog), expected);
  assert.equal(Object.values(expected).flat().includes("parallel-agents"), false);
});

// Contract: the set of top-level source entries must exactly match the set of
// names the catalog exposes.  We do NOT assert the catalog must already equal
// the target 38-skill list — that check belongs to the catalog-count test and
// requires Phase 4 production changes (skills.js rewrite).
test("catalog sources exist and use their canonical top-level names", async () => {
  const catalog = await getShippedSkills(skillsRoot);
  const sourceNames = await listTopLevelSkills(skillsRoot);
  const catalogNames = catalog.map((skill) => skill.name).sort();

  assert.deepEqual(sourceNames, catalogNames);
});

test("obsolete and pre-rename skill names are absent from the canonical catalog", async () => {
  const names = new Set((await getShippedSkills(skillsRoot)).map((skill) => skill.name));

  for (const name of OBSOLETE_SKILLS) assert.equal(names.has(name), false, `${name} is obsolete`);
  for (const [oldName, canonicalName] of Object.entries(RENAMED_SKILLS)) {
    assert.equal(names.has(oldName), false, `${oldName} must not remain in the catalog`);
    assert.equal(names.has(canonicalName), true, `${canonicalName} must be canonical`);
  }
});

test("fresh init installs only core skills, tracks only installed skills, and is idempotent", async () => {
  await withTempProject(async (targetDir) => {
    await initProject({ targetDir, templateRoot, pluginRoot, version });
    const firstSkills = await listTopLevelSkills(path.join(targetDir, ".agents/skills"));
    const firstManifest = await readManifest(targetDir);

    assert.deepEqual(firstSkills, CORE_SKILLS);
    assert.deepEqual(topLevelManifestSkills(firstManifest), CORE_SKILLS);
    assert.equal(firstSkills.includes("parallel-agents"), false);
    assert.equal(firstSkills.includes("app-builder"), false);

    await initProject({ targetDir, templateRoot, pluginRoot, version });
    const secondSkills = await listTopLevelSkills(path.join(targetDir, ".agents/skills"));
    const secondManifest = await readManifest(targetDir);
    const manifestKeys = secondManifest.files.map((file) => `${file.target}:${file.path}`);

    assert.deepEqual(secondSkills, firstSkills);
    assert.deepEqual(topLevelManifestSkills(secondManifest), CORE_SKILLS);
    assert.equal(new Set(manifestKeys).size, manifestKeys.length, "manifest entries must not duplicate");
  });
});

test("backend-node profile installs one optional skill and remains idempotent", async () => {
  await withTempProject(async (targetDir) => {
    const args = ["init", "--profile", "backend-node", "--path", targetDir, "--quiet"];
    await runCli(args);
    await runCli(args);

    assert.deepEqual(
      await listTopLevelSkills(path.join(targetDir, ".agents/skills")),
      [...CORE_SKILLS, "nodejs-best-practices"].sort()
    );
  });
});

test("frontend-framework profile installs only its three optional skills", async () => {
  await withTempProject(async (targetDir) => {
    await runCli(["init", "--profile", "frontend-framework", "--path", targetDir, "--quiet"]);
    const installed = await listTopLevelSkills(path.join(targetDir, ".agents/skills"));

    assert.deepEqual(installed, [...CORE_SKILLS, ...STATIC_PROFILES["frontend-framework"]].sort());
    assert.equal(installed.includes("nodejs-best-practices"), false);
    assert.equal(installed.includes("parallel-agents"), false);
  });
});

test("direct optional install installs only the requested skill and is idempotent", async () => {
  await withTempProject(async (targetDir) => {
    const args = ["install", "skill", "webapp-testing", "--path", targetDir, "--quiet"];
    await runCli(args);
    await runCli(args);

    assert.deepEqual(await listTopLevelSkills(path.join(targetDir, ".agents/skills")), ["webapp-testing"]);
    const manifest = await readManifest(targetDir);
    assert.deepEqual(topLevelManifestSkills(manifest), ["webapp-testing"]);
  });
});

test("profile preservation via update/sync", async () => {
  await withTempProject(async (targetDir) => {
    await runCli(["init", "--profile", "backend-node", "--path", targetDir, "--quiet"]);
    await runCli(["update", "--path", targetDir, "--quiet"]);
    await runCli(["sync", "--target", "skills", "--path", targetDir, "--quiet"]);

    const installed = await listTopLevelSkills(path.join(targetDir, ".agents/skills"));
    assert.deepEqual(installed, [...CORE_SKILLS, "nodejs-best-practices"].sort());
  });
});

async function checkExists(p) {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

test("documents profile installs only doc.md as optional", async () => {
  await withTempProject(async (targetDir) => {
    await runCli(["init", "--profile", "documents", "--path", targetDir, "--quiet"]);
    const installed = await listTopLevelSkills(path.join(targetDir, ".agents/skills"));
    
    assert.deepEqual(installed, [...CORE_SKILLS, "doc"].sort());
    assert.equal(await checkExists(path.join(targetDir, ".agents/skills/doc.md")), true);
    assert.equal(await checkExists(path.join(targetDir, ".agents/skills/doc/SKILL.md")), false);
  });
});

test("unknown profile exits without partial install", async () => {
  await withTempProject(async (targetDir) => {
    await assert.rejects(
      runCli(["init", "--profile", "unknown-profile-name", "--path", targetDir, "--quiet"]),
      /Unknown profile/
    );
    assert.equal(await checkExists(path.join(targetDir, ".agents/skills")), false);
    assert.equal(await checkExists(path.join(targetDir, ".codex/codex-kit.manifest.json")), false);
  });
});

test("unknown skill exits without partial install", async () => {
  await withTempProject(async (targetDir) => {
    await assert.rejects(
      runCli(["install", "skill", "unknown-skill-name", "--path", targetDir, "--quiet"]),
      /Unknown skill/
    );
    assert.equal(await checkExists(path.join(targetDir, ".agents/skills")), false);
    assert.equal(await checkExists(path.join(targetDir, ".codex/codex-kit.manifest.json")), false);
  });
});

test("workflow bundle remains 14 independent workflows with parallel-agents intact", async () => {
  assert.deepEqual((await readdir(workflowRoot)).sort(), EXPECTED_WORKFLOWS);
  assert.equal((await readdir(workflowRoot)).length, 14);
  assert.ok((await readdir(skillsRoot)).includes("parallel-agents"));
  assert.ok((await readdir(workflowRoot)).includes("orchestrate.md"));
  assert.equal((await readdir(skillsRoot)).includes("orchestrate.md"), false);
});

test("planning links an implementation plan reference", async () => {
  await assertSkillReferences("planning", [
    { file: "implementation-plan.md", marker: /acceptance criteria|validation plan/i }
  ]);
});

test("debugging links systematic process and bug hunt references", async () => {
  await assertSkillReferences("debugging", [
    { file: "systematic-process.md", marker: /hypothesis|root cause/i },
    { file: "debugging-checklist.md", marker: /reproduce|evidence/i }
  ]);
});

test("code-review links checklist and high-signal output references", async () => {
  await assertSkillReferences("code-review", [
    { file: "checklist.md", marker: /correctness|regression/i },
    { file: "high-signal-output.md", marker: /severity|finding/i }
  ]);
});

test("documentation links README, API, and release documentation templates", async () => {
  await assertSkillReferences("documentation", [
    { file: "readme-template.md", marker: /readme/i },
    { file: "api-documentation-template.md", marker: /api/i },
    { file: "release-documentation-template.md", marker: /release/i }
  ]);
});

test("release-deployment links readiness, deployment, and rollback references", async () => {
  await assertSkillReferences("release-deployment", [
    { file: "readiness-checklist.md", marker: /readiness|risk/i },
    { file: "deployment-process.md", marker: /deploy/i },
    { file: "rollback.md", marker: /rollback/i }
  ]);
});

test("common guidelines retain the stable clean-code principles", async () => {
  const content = [
    await readFile(path.join(templateRoot, "AGENTS.md"), "utf8"),
    await readFile(path.join(templateRoot, ".codex/rules/common-guidelines.rules"), "utf8")
  ].join("\n");

  // Minimal change principle
  assert.match(content, /smallest|minimal|only what is necessary/i);
  // Anti-over-engineering principle
  assert.match(content, /over-engineer|premature abstractions|unnecessary abstraction/i);
  // Naming discipline principle
  assert.match(content, /clear names|descriptive naming|meaningful names/i);
  // Stay in scope principle
  assert.match(content, /outside (?:the )?scope|unrelated code|stated task/i);
  // Verify before done principle
  assert.match(content, /relevant (?:tests|validation)|verify before handing off/i);
});

// Phase 7 gate: scans all active source files for legacy skill name references.
// Fails until Phase 7 (mechanical reference update) is complete across:
// src/, workflow files, subagent TOML files, surviving skill SKILL.md files,
// AGENTS.md, AGENT_FLOW.md, and ARCHITECTURE.md.
// Excluded: this test file itself, CHANGELOG.md, plan/roadmap docs
// (release documentation may intentionally mention old names).
test("active source contains no obsolete or pre-rename skill references", async () => {
  const selfFile = fileURLToPath(import.meta.url);
  const activeFiles = new Set([
    ...await collectTextFiles(path.join(repoRoot, "src")),
    ...await collectTextFiles(workflowRoot),
    ...await collectTextFiles(path.join(templateRoot, ".codex/agents")),
    ...await collectTextFiles(skillsRoot, { skipDirectories: new Set(LEGACY_SKILL_NAMES) }),
    path.join(templateRoot, "AGENTS.md"),
    path.join(templateRoot, "AGENT_FLOW.md"),
    path.join(templateRoot, "ARCHITECTURE.md"),
    path.join(repoRoot, "README.md"),
    path.join(repoRoot, "README-vi.md"),
    path.join(repoRoot, "web/src/content.ts"),
    path.join(repoRoot, "plugins/codex-kit/skills/codex-kit/SKILL.md")
  ]);
  activeFiles.delete(selfFile);

  const legacyPattern = new RegExp(
    `(?<![A-Za-z0-9-])(${LEGACY_SKILL_NAMES.map(escapeRegExp).join("|")})(?![A-Za-z0-9-])`,
    "g"
  );
  const references = [];

  for (const file of activeFiles) {
    const content = await readFile(file, "utf8");
    for (const match of content.matchAll(legacyPattern)) {
      references.push(`${path.relative(repoRoot, file).split(path.sep).join("/")}: ${match[1]}`);
    }
  }

  assert.deepEqual(references, [], `legacy skill references remain:\n${references.join("\n")}`);
});

test("doctor reports top-level core coverage and optional skills informationally", async () => {
  await withTempProject(async (targetDir) => {
    await initProject({ targetDir, templateRoot, pluginRoot, version });
    const result = await runDoctor({
      targetDir,
      templateRoot,
      pluginRoot,
      hookRoot,
      codexHome: path.join(targetDir, "codex-home"),
      version
    });

    assert.ok(result.checks.some(
      (check) => check.name === "skills" && check.status === "ok" && check.message.includes("Core skills: 17/17")
    ));
    assert.ok(result.checks.some(
      (check) => check.name === "skills" && check.status === "ok" && check.message.includes("Optional skills installed: 0")
    ));
  });
});

test("doctor ignores non-doc flat .md files without throwing duplicate", async () => {
  await withTempProject(async (targetDir) => {
    await initProject({ targetDir, templateRoot, pluginRoot, version });
    const installedSkillsRoot = path.join(targetDir, ".agents/skills");
    await writeFile(path.join(installedSkillsRoot, "planning.md"), "This should be ignored", "utf8");

    const result = await runDoctor({
      targetDir,
      templateRoot,
      pluginRoot,
      hookRoot,
      codexHome: path.join(targetDir, "codex-home"),
      version
    });
    
    const duplicateFailures = result.checks.filter((check) => check.name === "skills" && check.status === "fail" && /duplicate/i.test(check.message));
    assert.equal(duplicateFailures.length, 0);

    const unknownWarnings = result.checks.filter((check) => check.name === "skills" && check.status === "warn" && /Unknown top-level file: planning.md/.test(check.message));
    assert.equal(unknownWarnings.length, 1);
  });
});

// Fixture: init from the clean template, then inject the collision into the
// *installed* .agents/skills directory.  Doctor reads the installed project, so
// this correctly targets the layer doctor actually validates.
test("doctor rejects duplicate canonical skill names", async () => {
  await withTempProject(async (targetDir) => {
    await initProject({ targetDir, templateRoot, pluginRoot, version });
    const installedSkillsRoot = path.join(targetDir, ".agents/skills");
    const docContent = await readFile(path.join(skillsRoot, "doc.md"), "utf8");
    await writeFile(path.join(installedSkillsRoot, "doc.md"), docContent, "utf8");
    await mkdir(path.join(installedSkillsRoot, "doc"), { recursive: true });
    await writeFile(path.join(installedSkillsRoot, "doc/SKILL.md"), docContent, "utf8");

    const result = await runDoctor({
      targetDir,
      templateRoot,
      pluginRoot,
      hookRoot,
      codexHome: path.join(targetDir, "codex-home"),
      version
    });
    const skillFailures = result.checks.filter((check) => check.name === "skills" && check.status === "fail");

    assert.ok(skillFailures.some((check) => /duplicate/i.test(check.message)));
  });
});

// Fixture: init from the clean template, then corrupt the frontmatter of an
// *installed* skill so its name no longer matches the directory.
test("doctor rejects directory and frontmatter name mismatches", async () => {
  await withTempProject(async (targetDir) => {
    await initProject({ targetDir, templateRoot, pluginRoot, version });
    // Overwrite the installed debugging/SKILL.md with a mismatched name field.
    const installedSkillFile = path.join(targetDir, ".agents/skills/debugging/SKILL.md");
    const original = await readFile(installedSkillFile, "utf8");
    const mismatched = replaceFrontmatterName(original, "wrong-debugging");
    await writeFile(installedSkillFile, mismatched, "utf8");

    const result = await runDoctor({
      targetDir,
      templateRoot,
      pluginRoot,
      hookRoot,
      codexHome: path.join(targetDir, "codex-home"),
      version
    });
    const skillFailures = result.checks.filter((check) => check.name === "skills" && check.status === "fail");

    assert.ok(skillFailures.some((check) => /frontmatter|mismatch/i.test(check.message)));
  });
});

test("doctor rejects a catalog entry whose bundled source is missing", async () => {
  await withTempProject(async (targetDir) => {
    const copiedTemplateRoot = path.join(targetDir, "template-copy");
    const projectDir = path.join(targetDir, "project");
    await cp(templateRoot, copiedTemplateRoot, { recursive: true });
    await rm(path.join(copiedTemplateRoot, ".agents/skills/planning"), { recursive: true, force: true });
    
    await initProject({ targetDir: projectDir, templateRoot, pluginRoot, version });

    const result = await runDoctor({
      targetDir: projectDir,
      templateRoot: copiedTemplateRoot,
      pluginRoot,
      hookRoot,
      codexHome: path.join(targetDir, "codex-home"),
      version
    });

    assert.ok(result.checks.some(
      (check) => check.name === "skills" && check.status === "fail" && /source|planning/i.test(check.message)
    ));
  });
});

test("skill list exposes stable NAME, TIER, and PROFILE semantics", async () => {
  const captured = await runCliCommand(["list", "--target", "skills"]);
  assert.equal(captured.code, 0, captured.stderr);
  const output = `${captured.stdout}\n${captured.stderr}`;

  assert.match(output, /\bNAME\b/);
  assert.match(output, /\bTIER\b/);
  assert.match(output, /\bPROFILE\b/);
  assert.match(output, /planning\s+core\s+core/);
  assert.match(output, /nodejs-best-practices\s+optional\s+backend-node/);
  assert.match(output, /webapp-testing\s+optional\s+frontend-framework/);
  assert.match(output, /parallel-agents\s+optional\s+-/);
});
