import assert from "node:assert/strict";
import { cp, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { runCli } from "../src/cli.js";
import {
  installWorkspacePlugin,
  statusWorkspacePlugin,
  syncWorkspacePlugin
} from "../src/lib/kit.js";
import { runDoctor } from "../src/lib/doctor.js";
import { readManifest } from "../src/lib/manifest.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const pluginRoot = path.join(repoRoot, "plugins/codex-kit");
const packageJson = JSON.parse(await readFile(path.join(repoRoot, "package.json"), "utf8"));
const version = packageJson.version;
const templateRoot = path.join(repoRoot, "templates/project");
const hookRoot = path.join(repoRoot, "templates/hooks");

async function withTempProject(fn) {
  const targetDir = await mkdtemp(path.join(os.tmpdir(), "codex-kit-p1-test-"));
  try {
    await fn(targetDir);
  } finally {
    await rm(targetDir, { recursive: true, force: true });
  }
}

/** Returns { runnable, reason } for the codex CLI probe. */
async function probeCodexCli() {
  return new Promise((resolve) => {
    const child = spawn("codex", ["--version"], {
      shell: true,
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 8000
    });
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (d) => { stdout += d; });
    child.stderr?.on("data", (d) => { stderr += d; });
    child.on("error", (err) => {
      const code = err.code || "";
      const msg = err.message || "";
      if (code === "ENOENT" || msg.toLowerCase().includes("not found")) {
        resolve({ runnable: false, reason: "codex CLI not found in PATH" });
      } else if (code === "EACCES" || msg.toLowerCase().includes("permission")) {
        resolve({ runnable: false, reason: `codex CLI access denied: ${msg}` });
      } else {
        resolve({ runnable: false, reason: `codex CLI spawn error: ${msg}` });
      }
    });
    child.on("close", (code) => {
      const combined = (stdout + stderr).toLowerCase();
      if (
        combined.includes("not logged in") ||
        combined.includes("unauthenticated") ||
        combined.includes("login required")
      ) {
        resolve({ runnable: false, reason: "codex CLI requires authentication" });
        return;
      }
      if (code === 0 || stdout.trim().length > 0) {
        resolve({ runnable: true, reason: null });
      } else {
        resolve({ runnable: false, reason: `codex --version exited with code ${code}: ${stderr.trim() || stdout.trim()}` });
      }
    });
  });
}

// ---------------------------------------------------------------------------
// Existing tests (unchanged)
// ---------------------------------------------------------------------------

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
      templateRoot,
      pluginRoot,
      hookRoot,
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
      templateRoot,
      pluginRoot,
      hookRoot,
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
      templateRoot,
      pluginRoot,
      hookRoot,
      codexHome: path.join(targetDir, "codex-home"),
      version
    });
    assert.equal(doctor.summary.fail, 0);
  });
});

// ---------------------------------------------------------------------------
// New tests for Issues 2 and 6 (P1)
// ---------------------------------------------------------------------------

// Test 1: Generated policy is AVAILABLE
test("generated marketplace entry uses AVAILABLE installation policy", async () => {
  await withTempProject(async (targetDir) => {
    await runCli(["init", "--path", targetDir, "--include-plugin", "--quiet"]);
    const marketplace = JSON.parse(
      await readFile(path.join(targetDir, ".agents/plugins/marketplace.json"), "utf8")
    );
    const entry = marketplace.plugins.find((p) => p.name === "codex-kit");
    assert.ok(entry, "codex-kit entry must exist");
    assert.equal(
      entry.policy.installation,
      "AVAILABLE",
      "installation policy must be AVAILABLE (not INSTALLED_BY_DEFAULT)"
    );
  });
});

// Test 2: Customized marketplace category survives repeated init --include-plugin
test("customized marketplace category survives repeated init --include-plugin", async () => {
  await withTempProject(async (targetDir) => {
    await runCli(["init", "--path", targetDir, "--include-plugin", "--quiet"]);
    const marketplacePath = path.join(targetDir, ".agents/plugins/marketplace.json");
    const marketplace = JSON.parse(await readFile(marketplacePath, "utf8"));
    marketplace.plugins[0].category = "My Custom Category";
    await writeFile(marketplacePath, JSON.stringify(marketplace, null, 2) + "\n");

    // Second init should NOT overwrite the user-customized category
    await runCli(["init", "--path", targetDir, "--include-plugin", "--quiet"]);
    const updated = JSON.parse(await readFile(marketplacePath, "utf8"));
    const entry = updated.plugins.find((p) => p.name === "codex-kit");
    assert.equal(
      entry.category,
      "My Custom Category",
      "user-customized category must be preserved after repeated init"
    );
  });
});

// Test 3: Sync preserves customized marketplace without --force
test("plugin sync preserves customized marketplace without --force", async () => {
  await withTempProject(async (targetDir) => {
    await runCli(["init", "--path", targetDir, "--include-plugin", "--quiet"]);
    const marketplacePath = path.join(targetDir, ".agents/plugins/marketplace.json");
    const marketplace = JSON.parse(await readFile(marketplacePath, "utf8"));
    marketplace.plugins[0].category = "Preserved Category";
    await writeFile(marketplacePath, JSON.stringify(marketplace, null, 2) + "\n");

    // sync without --force should not reset the customized category
    await syncWorkspacePlugin({ targetDir, pluginRoot, version, force: false });
    const updated = JSON.parse(await readFile(marketplacePath, "utf8"));
    const entry = updated.plugins.find((p) => p.name === "codex-kit");
    assert.equal(
      entry.category,
      "Preserved Category",
      "plugin sync without --force must preserve user-customized category"
    );
  });
});

// Test 4: Plugin sync with --force restores default codex-kit entry and updates baseline
test("plugin sync with --force restores default codex-kit marketplace entry", async () => {
  await withTempProject(async (targetDir) => {
    await runCli(["init", "--path", targetDir, "--include-plugin", "--quiet"]);
    const marketplacePath = path.join(targetDir, ".agents/plugins/marketplace.json");
    const marketplace = JSON.parse(await readFile(marketplacePath, "utf8"));
    marketplace.plugins[0].category = "Temporary Override";
    await writeFile(marketplacePath, JSON.stringify(marketplace, null, 2) + "\n");

    // sync with --force should reset the codex-kit entry to defaults
    await syncWorkspacePlugin({ targetDir, pluginRoot, version, force: true });
    const updated = JSON.parse(await readFile(marketplacePath, "utf8"));
    const entry = updated.plugins.find((p) => p.name === "codex-kit");
    assert.equal(
      entry.category,
      "Developer Tools",
      "plugin sync with --force should restore the default category"
    );
    assert.equal(
      entry.policy.installation,
      "AVAILABLE",
      "plugin sync with --force should use AVAILABLE policy"
    );

    // The manifest should now track the marketplace file as managed
    const manifest = await readManifest(targetDir);
    const files = manifest?.files || [];
    const marketplaceEntries = files.filter(
      (f) => f.target === "plugin" && f.path === ".agents/plugins/marketplace.json"
    );
    assert.equal(marketplaceEntries.length, 1, "manifest must track marketplace exactly once");
    assert.equal(marketplaceEntries[0].status, "managed", "marketplace must be managed after --force");
  });
});

// Test 5: Marketplace has exactly one manifest entry under target plugin
test("marketplace is tracked exactly once in manifest under target plugin", async () => {
  await withTempProject(async (targetDir) => {
    await runCli(["init", "--path", targetDir, "--include-plugin", "--quiet"]);
    const manifest = await readManifest(targetDir);
    assert.ok(manifest, "manifest must exist after init");
    const marketplaceEntries = (manifest.files || []).filter(
      (f) => f.path === ".agents/plugins/marketplace.json"
    );
    assert.equal(
      marketplaceEntries.length,
      1,
      "marketplace.json must appear exactly once in manifest"
    );
    assert.equal(
      marketplaceEntries[0].target,
      "plugin",
      "marketplace.json must be tracked under target 'plugin'"
    );
  });
});

// Test 6: Existing untracked marketplace file remains unmanaged without --force
test("existing untracked marketplace file is not adopted without --force", async () => {
  await withTempProject(async (targetDir) => {
    // Write a marketplace file before any init
    const marketplacePath = path.join(targetDir, ".agents/plugins/marketplace.json");
    const preExisting = {
      name: "pre-existing",
      interface: { displayName: "Pre-existing" },
      plugins: [{ name: "other-plugin", source: { source: "local", path: "./other" } }]
    };
    // Ensure directory exists
    const { mkdir } = await import("node:fs/promises");
    await mkdir(path.join(targetDir, ".agents/plugins"), { recursive: true });
    await writeFile(marketplacePath, JSON.stringify(preExisting, null, 2) + "\n");

    // Run init with plugin (without --force)
    await runCli(["init", "--path", targetDir, "--include-plugin", "--quiet"]);

    // The marketplace must not be overwritten
    const content = JSON.parse(await readFile(marketplacePath, "utf8"));
    assert.equal(content.name, "pre-existing", "untracked marketplace file must not be overwritten without --force");

    // The manifest must not track it as managed (untracked remains absent or unmanaged)
    const manifest = await readManifest(targetDir);
    const marketplaceEntries = (manifest?.files || []).filter(
      (f) => f.path === ".agents/plugins/marketplace.json"
    );
    // Should be absent from manifest or have no installedHash
    const isManagedWithHash = marketplaceEntries.some((e) => e.installedHash);
    assert.equal(
      isManagedWithHash,
      false,
      "untracked marketplace file must not be adopted into manifest without --force"
    );
  });
});

// Test 7: README documents explicit marketplace registration and plugin add flow
test("README documents explicit marketplace registration and plugin add flow", async () => {
  const readme = await readFile(path.join(repoRoot, "README.md"), "utf8");
  assert.ok(
    readme.includes("codex plugin marketplace add"),
    "README must document `codex plugin marketplace add`"
  );
  assert.ok(
    readme.includes("codex plugin add"),
    "README must document `codex plugin add`"
  );
});

// Test 8: Doctor rejects inconsistent marketplace installation policy
test("doctor rejects marketplace entry with INSTALLED_BY_DEFAULT policy", async () => {
  await withTempProject(async (targetDir) => {
    await runCli(["init", "--path", targetDir, "--include-plugin", "--quiet"]);
    const marketplacePath = path.join(targetDir, ".agents/plugins/marketplace.json");
    const marketplace = JSON.parse(await readFile(marketplacePath, "utf8"));
    // Manually corrupt the policy to the old wrong value
    marketplace.plugins[0].policy.installation = "INSTALLED_BY_DEFAULT";
    await writeFile(marketplacePath, JSON.stringify(marketplace, null, 2) + "\n");

    const doctor = await runDoctor({
      targetDir,
      templateRoot,
      pluginRoot,
      hookRoot,
      codexHome: path.join(targetDir, "codex-home"),
      version
    });
    const pluginCheck = doctor.checks.find((c) => c.name === "plugin");
    assert.ok(pluginCheck, "doctor must emit a plugin check");
    assert.equal(
      pluginCheck.status,
      "fail",
      "doctor must fail when installation policy is INSTALLED_BY_DEFAULT"
    );
    assert.ok(
      pluginCheck.message.toLowerCase().includes("available"),
      "failure message must mention AVAILABLE"
    );
  });
});

// Test 9: Conditional Codex CLI integration test
test("conditional codex CLI integration test skips when codex is unavailable", async (t) => {
  const { runnable, reason } = await probeCodexCli();
  if (!runnable) {
    t.skip(`Skipping Codex CLI integration: ${reason}`);
    return;
  }

  await withTempProject(async (targetDir) => {
    // Generate a temporary project with plugin
    await runCli(["init", "--path", targetDir, "--include-plugin", "--quiet"]);

    const codexHome = path.join(targetDir, "codex-home-integration");

    // Run: codex plugin marketplace add <project>
    const marketplaceResult = await new Promise((resolve) => {
      const child = spawn("codex", ["plugin", "marketplace", "add", targetDir], {
        shell: true,
        stdio: ["ignore", "pipe", "pipe"],
        env: { ...process.env, CODEX_HOME: codexHome },
        timeout: 30000
      });
      let stdout = "";
      let stderr = "";
      child.stdout?.on("data", (d) => { stdout += d; });
      child.stderr?.on("data", (d) => { stderr += d; });
      child.on("error", (err) => resolve({ code: -1, stdout, stderr: stderr + err.message }));
      child.on("close", (code) => resolve({ code, stdout, stderr }));
    });

    assert.equal(
      marketplaceResult.code,
      0,
      `codex plugin marketplace add failed (exit ${marketplaceResult.code}):\n${marketplaceResult.stderr || marketplaceResult.stdout}`
    );

    // Run: codex plugin add codex-kit@local-plugins
    const pluginAddResult = await new Promise((resolve) => {
      const child = spawn("codex", ["plugin", "add", "codex-kit@local-plugins"], {
        shell: true,
        stdio: ["ignore", "pipe", "pipe"],
        env: { ...process.env, CODEX_HOME: codexHome },
        timeout: 30000
      });
      let stdout = "";
      let stderr = "";
      child.stdout?.on("data", (d) => { stdout += d; });
      child.stderr?.on("data", (d) => { stderr += d; });
      child.on("error", (err) => resolve({ code: -1, stdout, stderr: stderr + err.message }));
      child.on("close", (code) => resolve({ code, stdout, stderr }));
    });

    assert.equal(
      pluginAddResult.code,
      0,
      `codex plugin add failed (exit ${pluginAddResult.code}):\n${pluginAddResult.stderr || pluginAddResult.stdout}`
    );
  });
});
