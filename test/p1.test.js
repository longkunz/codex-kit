import assert from "node:assert/strict";
import { cp, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { runCli } from "../src/cli.js";
import { installWorkspacePlugin, statusWorkspacePlugin } from "../src/lib/kit.js";
import { runDoctor } from "../src/lib/doctor.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const pluginRoot = path.join(repoRoot, "plugins/codex-kit");
const packageJson = JSON.parse(await readFile(path.join(repoRoot, "package.json"), "utf8"));
const version = packageJson.version;

async function withTempProject(fn) {
  const targetDir = await mkdtemp(path.join(os.tmpdir(), "codex-kit-p1-test-"));
  try {
    await fn(targetDir);
  } finally {
    await rm(targetDir, { recursive: true, force: true });
  }
}

test("init --include-plugin installs workspace plugin", async () => {
  await withTempProject(async (targetDir) => {
    await runCli(["init", "--path", targetDir, "--include-plugin", "--quiet"]);

    const pluginStatus = await statusWorkspacePlugin({ targetDir, pluginRoot, version });
    assert.equal(pluginStatus.pluginInstalled, true);
    assert.equal(pluginStatus.missing.length, 0);

    const marketplace = JSON.parse(
      await readFile(path.join(targetDir, ".agents/plugins/marketplace.json"), "utf8")
    );
    assert.ok(marketplace.plugins.some((plugin) => plugin.name === "codex-kit"));
  });
});

test("init --all installs workspace plugin and project hooks", async () => {
  await withTempProject(async (targetDir) => {
    await runCli(["init", "--path", targetDir, "--all", "--quiet"]);

    const pluginStatus = await statusWorkspacePlugin({ targetDir, pluginRoot, version });
    assert.equal(pluginStatus.pluginInstalled, true);
    assert.equal(pluginStatus.missing.length, 0);

    const hooks = JSON.parse(await readFile(path.join(targetDir, ".codex/hooks.json"), "utf8"));
    assert.ok(hooks.hooks.UserPromptSubmit);
    assert.ok(hooks.hooks.PreToolUse);
  });
});

test("workspace plugin bundles hooks and MCP metadata", async () => {
  await withTempProject(async (targetDir) => {
    await runCli(["init", "--path", targetDir, "--include-plugin", "--quiet"]);

    const pluginDir = path.join(targetDir, ".agents/plugins/codex-kit");
    const pluginJson = JSON.parse(
      await readFile(path.join(pluginDir, ".codex-plugin/plugin.json"), "utf8")
    );
    assert.equal(pluginJson.hooks, undefined);
    assert.equal(pluginJson.mcpServers, "./.mcp.json");

    const hooks = JSON.parse(await readFile(path.join(pluginDir, "hooks/hooks.json"), "utf8"));
    assert.ok(hooks.hooks.UserPromptSubmit);
    assert.ok(hooks.hooks.PreToolUse);

    const mcp = JSON.parse(await readFile(path.join(pluginDir, ".mcp.json"), "utf8"));
    assert.ok(mcp.mcpServers.context7);

    const doctor = await runDoctor({
      targetDir,
      templateRoot: path.join(repoRoot, "templates/project"),
      pluginRoot,
      hookRoot: path.join(repoRoot, "templates/hooks"),
      codexHome: path.join(targetDir, "codex-home"),
      version
    });
    assert.equal(doctor.summary.fail, 0);
    assert.ok(
      doctor.checks.some(
        (check) =>
          check.name === "plugin" &&
          check.status === "ok" &&
          check.message.includes("hooks, MCP")
      )
    );
  });
});

test("default project templates do not pin models", async () => {
  const configRoot = path.join(repoRoot, "templates/project/.codex");
  const files = [path.join(configRoot, "config.toml")];
  const agentNames = await readdir(path.join(configRoot, "agents"));
  files.push(...agentNames.map((name) => path.join(configRoot, "agents", name)));

  for (const file of files) {
    const content = await readFile(file, "utf8");
    assert.doesNotMatch(content, /^\s*model\s*=/m, path.relative(repoRoot, file));
  }
});

test("plugin manifest version matches package and is synced during installation", async () => {
  const sourceManifest = JSON.parse(
    await readFile(path.join(pluginRoot, ".codex-plugin/plugin.json"), "utf8")
  );
  assert.equal(sourceManifest.version, version);

  await withTempProject(async (targetDir) => {
    const stalePluginRoot = path.join(targetDir, "stale-plugin-source");
    await cp(pluginRoot, stalePluginRoot, { recursive: true });
    const staleManifestPath = path.join(stalePluginRoot, ".codex-plugin/plugin.json");
    const staleManifest = JSON.parse(await readFile(staleManifestPath, "utf8"));
    staleManifest.version = "0.0.0";
    await writeFile(staleManifestPath, JSON.stringify(staleManifest, null, 2) + "\n");

    await installWorkspacePlugin({ targetDir, pluginRoot: stalePluginRoot, version });
    const installedManifest = JSON.parse(
      await readFile(
        path.join(targetDir, ".agents/plugins/codex-kit/.codex-plugin/plugin.json"),
        "utf8"
      )
    );
    assert.equal(installedManifest.version, version);
  });
});

test("doctor rejects an invalid marketplace source path", async () => {
  await withTempProject(async (targetDir) => {
    await runCli(["init", "--path", targetDir, "--include-plugin", "--quiet"]);
    const marketplacePath = path.join(targetDir, ".agents/plugins/marketplace.json");
    const marketplace = JSON.parse(await readFile(marketplacePath, "utf8"));
    marketplace.plugins[0].source.path = "./missing-plugin";
    await writeFile(marketplacePath, JSON.stringify(marketplace, null, 2) + "\n");

    const doctor = await runDoctor({
      targetDir,
      templateRoot: path.join(repoRoot, "templates/project"),
      pluginRoot,
      hookRoot: path.join(repoRoot, "templates/hooks"),
      codexHome: path.join(targetDir, "codex-home"),
      version
    });
    assert.ok(
      doctor.checks.some(
        (check) => check.name === "plugin" && check.status === "fail" && check.message.includes("path")
      )
    );
  });
});

test("doctor accepts a valid custom marketplace name", async () => {
  await withTempProject(async (targetDir) => {
    await runCli(["init", "--path", targetDir, "--include-plugin", "--quiet"]);
    const marketplacePath = path.join(targetDir, ".agents/plugins/marketplace.json");
    const marketplace = JSON.parse(await readFile(marketplacePath, "utf8"));
    marketplace.name = "team-local";
    await writeFile(marketplacePath, JSON.stringify(marketplace, null, 2) + "\n");

    const doctor = await runDoctor({
      targetDir,
      templateRoot: path.join(repoRoot, "templates/project"),
      pluginRoot,
      hookRoot: path.join(repoRoot, "templates/hooks"),
      codexHome: path.join(targetDir, "codex-home"),
      version
    });
    assert.equal(doctor.summary.fail, 0);
  });
});
