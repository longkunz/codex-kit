import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  initProject,
  installProjectHooks,
  installWorkspacePlugin,
  statusWorkspacePlugin,
  updateProject
} from "../src/lib/kit.js";
import { readManifest } from "../src/lib/manifest.js";
import {
  installLocalMemories,
  statusLocalMemories
} from "../src/lib/memories.js";
import { runDoctor } from "../src/lib/doctor.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const templateRoot = path.join(repoRoot, "templates/project");
const hookRoot = path.join(repoRoot, "templates/hooks");
const pluginRoot = path.join(repoRoot, "plugins/codex-kit");
const version = "0.2.0";

async function withTempProject(fn) {
  const targetDir = await mkdtemp(path.join(os.tmpdir(), "codex-kit-test-"));
  try {
    await fn(targetDir);
  } finally {
    await rm(targetDir, { recursive: true, force: true });
  }
}

test("init creates rules in .codex/rules and tracks targets", async () => {
  await withTempProject(async (targetDir) => {
    await initProject({ targetDir, templateRoot, pluginRoot, version });

    const rules = await readFile(path.join(targetDir, ".codex/rules/default.rules"), "utf8");
    assert.match(rules, /Prompt before dependency installs/);

    const manifest = await readManifest(targetDir);
    assert.ok(manifest.targets.project);
    assert.ok(manifest.targets.rules);
    assert.ok(manifest.targets.skills);
    assert.equal(
      manifest.files.some((file) => file.path === "codex/rules/default.rules"),
      false
    );
    assert.ok(
      manifest.files.some(
        (file) => file.path === ".codex/rules/default.rules" && file.target === "rules"
      )
    );
  });
});

test("plugin manifest tracking survives a later init", async () => {
  await withTempProject(async (targetDir) => {
    await initProject({ targetDir, templateRoot, pluginRoot, version });
    await installWorkspacePlugin({ targetDir, pluginRoot, version });

    let pluginStatus = await statusWorkspacePlugin({ targetDir, pluginRoot, version });
    assert.equal(pluginStatus.pluginInstalled, true);
    assert.equal(pluginStatus.missing.length, 0);

    await initProject({ targetDir, templateRoot, pluginRoot, version });

    pluginStatus = await statusWorkspacePlugin({ targetDir, pluginRoot, version });
    assert.equal(pluginStatus.pluginInstalled, true);
    assert.equal(pluginStatus.missing.length, 0);

    const manifest = await readManifest(targetDir);
    assert.ok(manifest.files.some((file) => file.target === "plugin"));
  });
});

test("init migrates legacy codex/rules/default.rules when safe", async () => {
  await withTempProject(async (targetDir) => {
    const legacyRulesPath = path.join(targetDir, "codex/rules/default.rules");
    await mkdir(path.dirname(legacyRulesPath), { recursive: true });
    await writeFile(legacyRulesPath, "# local legacy rules\n", "utf8");

    const result = await initProject({ targetDir, templateRoot, pluginRoot, version });

    assert.deepEqual(result.migrated, ["codex/rules/default.rules"]);
    assert.equal(
      await readFile(path.join(targetDir, ".codex/rules/default.rules"), "utf8"),
      "# local legacy rules\n"
    );

    const manifest = await readManifest(targetDir);
    assert.ok(
      manifest.files.some(
        (file) => file.path === ".codex/rules/default.rules" && file.target === "rules"
      )
    );
  });
});

test("installProjectHooks installs safe hooks idempotently", async () => {
  await withTempProject(async (targetDir) => {
    await initProject({ targetDir, templateRoot, pluginRoot, version });
    await installProjectHooks({ targetDir, hookRoot, version });

    const hooksJson = JSON.parse(
      await readFile(path.join(targetDir, ".codex/hooks.json"), "utf8")
    );
    assert.ok(hooksJson.hooks.UserPromptSubmit);
    assert.ok(hooksJson.hooks.PreToolUse);
    assert.ok(hooksJson.hooks.PostToolUse);
    assert.ok(hooksJson.hooks.Stop);

    const policyPath = path.join(targetDir, ".codex/hooks/pre_tool_use_policy.py");
    await writeFile(policyPath, "# local edit\n", "utf8");
    const secondInstall = await installProjectHooks({ targetDir, hookRoot, version });

    assert.ok(secondInstall.skipped.includes(".codex/hooks/pre_tool_use_policy.py"));
    assert.equal(await readFile(policyPath, "utf8"), "# local edit\n");

    const manifest = await readManifest(targetDir);
    assert.ok(manifest.targets.hooks);
    assert.ok(
      manifest.files.some(
        (file) => file.path === ".codex/hooks.json" && file.target === "hooks"
      )
    );
  });
});

test("installLocalMemories enables memories only in local Codex config", async () => {
  await withTempProject(async (targetDir) => {
    const codexHome = path.join(targetDir, "codex-home");
    await installLocalMemories({ codexHome });

    const config = await readFile(path.join(codexHome, "config.toml"), "utf8");
    assert.match(config, /\[features\]/);
    assert.match(config, /^memories = true$/m);
    assert.match(config, /\[memories\]/);
    assert.match(config, /^use_memories = true$/m);
    assert.match(config, /^generate_memories = true$/m);
    assert.match(config, /^disable_on_external_context = true$/m);

    const status = await statusLocalMemories({ codexHome });
    assert.equal(status.enabled, true);

    await initProject({ targetDir, templateRoot, pluginRoot, version });
    const projectConfig = await readFile(path.join(targetDir, ".codex/config.toml"), "utf8");
    assert.equal(projectConfig.includes("[memories]"), false);
  });
});

test("doctor reports no failures for a healthy generated project", async () => {
  await withTempProject(async (targetDir) => {
    await initProject({ targetDir, templateRoot, pluginRoot, version });
    await installProjectHooks({ targetDir, hookRoot, version });
    await installWorkspacePlugin({ targetDir, pluginRoot, version });

    const result = await runDoctor({
      targetDir,
      templateRoot,
      pluginRoot,
      hookRoot,
      codexHome: path.join(targetDir, "codex-home"),
      version
    });

    assert.equal(result.summary.fail, 0);
    assert.ok(result.summary.warn >= 1);
    assert.ok(result.checks.some((check) => check.name === "hooks" && check.status === "ok"));
    assert.ok(result.checks.some((check) => check.name === "plugin" && check.status === "ok"));
  });
});

test("doctor --fix resyncs manifest tracking for existing plugin files", async () => {
  await withTempProject(async (targetDir) => {
    await initProject({ targetDir, templateRoot, pluginRoot, version });
    await installWorkspacePlugin({ targetDir, pluginRoot, version });

    const manifest = await readManifest(targetDir);
    manifest.files = manifest.files.filter((file) => file.target !== "plugin");
    manifest.targets.plugin = undefined;
    await writeFile(
      path.join(targetDir, ".codex-kit/manifest.json"),
      `${JSON.stringify(manifest, null, 2)}\n`,
      "utf8"
    );

    const broken = await runDoctor({
      targetDir,
      templateRoot,
      pluginRoot,
      hookRoot,
      codexHome: path.join(targetDir, "codex-home"),
      version
    });
    assert.ok(
      broken.checks.some(
        (check) => check.status === "fail" && check.message.includes("manifest does not track plugin")
      )
    );

    const fixed = await runDoctor({
      targetDir,
      templateRoot,
      pluginRoot,
      hookRoot,
      codexHome: path.join(targetDir, "codex-home"),
      version,
      fix: true
    });
    assert.equal(fixed.summary.fail, 0);

    const fixedManifest = await readManifest(targetDir);
    assert.ok(fixedManifest.files.some((file) => file.target === "plugin"));
  });
});

test("pre-existing AGENTS.md remains unmanaged and survives sync", async () => {
  await withTempProject(async (targetDir) => {
    const agentsPath = path.join(targetDir, "AGENTS.md");
    await writeFile(agentsPath, "user-owned content\n", "utf8");

    await initProject({ targetDir, templateRoot, pluginRoot, version });
    await updateProject({ targetDir, templateRoot, pluginRoot, version });
    await runDoctor({
      targetDir,
      templateRoot,
      pluginRoot,
      hookRoot,
      codexHome: path.join(targetDir, "codex-home"),
      version,
      fix: true
    });

    assert.equal(await readFile(agentsPath, "utf8"), "user-owned content\n");
    const manifest = await readManifest(targetDir);
    const entry = manifest.files.find((file) => file.path === "AGENTS.md");
    assert.equal(entry.status, "unmanaged");
    assert.equal(Object.hasOwn(entry, "installedHash"), false);
    assert.equal(typeof entry.observedHash, "string");
  });
});

test("doctor reports a user edit to a managed AGENTS.md", async () => {
  await withTempProject(async (targetDir) => {
    await initProject({ targetDir, templateRoot, pluginRoot, version });
    await writeFile(path.join(targetDir, "AGENTS.md"), "user edit\n", "utf8");

    const result = await runDoctor({
      targetDir,
      templateRoot,
      pluginRoot,
      hookRoot,
      codexHome: path.join(targetDir, "codex-home"),
      version
    });

    assert.ok(
      result.checks.some(
        (check) => check.status === "fail" && check.message.includes("managed file(s) are locally modified")
      )
    );
  });
});

test("doctor --fix preserves a user edit and its managed baseline", async () => {
  await withTempProject(async (targetDir) => {
    await initProject({ targetDir, templateRoot, pluginRoot, version });
    const before = await readManifest(targetDir);
    const beforeEntry = before.files.find((file) => file.path === "AGENTS.md");
    const agentsPath = path.join(targetDir, "AGENTS.md");
    await writeFile(agentsPath, "user edit\n", "utf8");

    const result = await runDoctor({
      targetDir,
      templateRoot,
      pluginRoot,
      hookRoot,
      codexHome: path.join(targetDir, "codex-home"),
      version,
      fix: true
    });

    const after = await readManifest(targetDir);
    const afterEntry = after.files.find((file) => file.path === "AGENTS.md");
    assert.equal(await readFile(agentsPath, "utf8"), "user edit\n");
    assert.equal(afterEntry.installedHash, beforeEntry.installedHash);
    assert.equal(afterEntry.status, "managed");
    assert.ok(result.checks.some((check) => check.status === "fail" && check.message.includes("locally modified")));
  });
});

test("repeated init preserves unchanged managed ownership", async () => {
  await withTempProject(async (targetDir) => {
    await initProject({ targetDir, templateRoot, pluginRoot, version });
    const before = await readManifest(targetDir);
    const beforeEntry = before.files.find((file) => file.path === "AGENTS.md");

    await initProject({ targetDir, templateRoot, pluginRoot, version });

    const after = await readManifest(targetDir);
    const afterEntry = after.files.find((file) => file.path === "AGENTS.md");
    assert.deepEqual(afterEntry, beforeEntry);
  });
});

test("sync --force overwrites edits and establishes a clean managed baseline", async () => {
  await withTempProject(async (targetDir) => {
    const agentsPath = path.join(targetDir, "AGENTS.md");
    await writeFile(agentsPath, "user-owned content\n", "utf8");
    await initProject({ targetDir, templateRoot, pluginRoot, version });

    await updateProject({ targetDir, templateRoot, pluginRoot, version, force: true });

    assert.equal(
      await readFile(agentsPath, "utf8"),
      await readFile(path.join(templateRoot, "AGENTS.md"), "utf8")
    );
    const manifest = await readManifest(targetDir);
    const entry = manifest.files.find((file) => file.path === "AGENTS.md");
    assert.equal(entry.status, "managed");
    assert.equal(entry.installedHash, entry.templateHash);
  });
});
