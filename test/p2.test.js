import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { access } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { runCli } from "../src/cli.js";
import { runDoctor } from "../src/lib/doctor.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const packageJson = JSON.parse(await readFile(path.join(repoRoot, "package.json"), "utf8"));
const version = packageJson.version;
const templateRoot = path.join(repoRoot, "templates/project");
const hookRoot = path.join(repoRoot, "templates/hooks");
const pluginRoot = path.join(repoRoot, "plugins/codex-kit");

async function withTempProject(fn) {
  const targetDir = await mkdtemp(path.join(os.tmpdir(), "codex-kit-p2-test-"));
  try {
    await fn(targetDir);
  } finally {
    await rm(targetDir, { recursive: true, force: true });
  }
}

async function pathExists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Phase 1: Reject local/user scope for skills
// ---------------------------------------------------------------------------

test("install --target skills --scope local returns an error", async () => {
  await assert.rejects(
    () => runCli(["install", "--target", "skills", "--scope", "local", "--quiet"]),
    (err) => {
      assert.ok(
        err.message.includes("User-level skill installation is not supported"),
        `Expected project-only error but got: ${err.message}`
      );
      assert.ok(
        err.message.includes("repository skills only"),
        `Expected 'repository skills only' in: ${err.message}`
      );
      return true;
    }
  );
});

test("sync --target skills --scope local returns an error", async () => {
  await assert.rejects(
    () => runCli(["sync", "--target", "skills", "--scope", "local", "--quiet"]),
    (err) => {
      assert.ok(
        err.message.includes("User-level skill installation is not supported"),
        `Expected project-only error but got: ${err.message}`
      );
      return true;
    }
  );
});

test("install-skills legacy command returns an error mentioning the replacement", async () => {
  await assert.rejects(
    () => runCli(["install-skills", "--quiet"]),
    (err) => {
      assert.ok(err.message.includes("has been removed"), `Expected 'has been removed' in: ${err.message}`);
      assert.ok(
        err.message.includes("User-level skill installation is not supported"),
        `Expected project-only error in: ${err.message}`
      );
      assert.ok(
        err.message.includes("install --target skills"),
        `Expected replacement command hint in: ${err.message}`
      );
      return true;
    }
  );
});

test("sync-skills legacy command returns an error", async () => {
  await assert.rejects(
    () => runCli(["sync-skills", "--quiet"]),
    (err) => {
      assert.ok(err.message.includes("has been removed"), `Expected 'has been removed' in: ${err.message}`);
      return true;
    }
  );
});

test("remove-skills legacy command returns an error", async () => {
  await assert.rejects(
    () => runCli(["remove-skills", "--quiet"]),
    (err) => {
      assert.ok(err.message.includes("has been removed"), `Expected 'has been removed' in: ${err.message}`);
      return true;
    }
  );
});

test("list-installed-skills legacy command returns an error", async () => {
  await assert.rejects(
    () => runCli(["list-installed-skills", "--quiet"]),
    (err) => {
      assert.ok(err.message.includes("has been removed"), `Expected 'has been removed' in: ${err.message}`);
      return true;
    }
  );
});

// ---------------------------------------------------------------------------
// Phase 1: autoskills always uses project scope
// ---------------------------------------------------------------------------

test("autoskills always uses project scope and does not write to local codexHome", async () => {
  await withTempProject(async (targetDir) => {
    const codexHome = path.join(targetDir, "codex-home");
    await runCli([
      "autoskills",
      "--path", targetDir,
      "--codex-home", codexHome,
      "--dry-run",
      "--quiet"
    ]);
    // The local codexHome skills directory must never be created
    const localSkillsDir = path.join(codexHome, "skills");
    assert.equal(
      await pathExists(localSkillsDir),
      false,
      "autoskills must not write to local codexHome/skills"
    );
  });
});


// ---------------------------------------------------------------------------
// Phase 5: Help text assertions
// ---------------------------------------------------------------------------

test("help text does not advertise --scope local for skills", async () => {
  let helpText = "";
  const originalLog = console.log;
  console.log = (msg) => { helpText += String(msg) + "\n"; };
  try {
    await runCli(["--help"]);
  } finally {
    console.log = originalLog;
  }

  assert.ok(
    !helpText.includes("--scope local --skills"),
    "help must not advertise '--scope local --skills'"
  );
  assert.ok(
    !helpText.includes("install shipped Codex Kit skills into local Codex"),
    "help must not mention installing skills into local Codex"
  );
  assert.ok(
    helpText.includes("User-level skill installation is not supported"),
    "help must include a project-only notice"
  );
});

// ---------------------------------------------------------------------------
// setup-codex / sync-codex now use project scope only
// ---------------------------------------------------------------------------

test("setup-codex installs project skills into .agents/skills (not local codexHome)", async () => {
  await withTempProject(async (targetDir) => {
    const codexHome = path.join(targetDir, "codex-home");
    await runCli([
      "setup-codex",
      "--path", targetDir,
      "--codex-home", codexHome,
      "--quiet"
    ]);

    // Project skills must be installed
    const projectSkillsDir = path.join(targetDir, ".agents", "skills");
    assert.equal(
      await pathExists(projectSkillsDir),
      true,
      "setup-codex must install project skills into .agents/skills"
    );

    // Local codexHome skills must NOT be created
    const localSkillsDir = path.join(codexHome, "skills");
    assert.equal(
      await pathExists(localSkillsDir),
      false,
      "setup-codex must NOT install skills into local codexHome/skills"
    );
  });
});

test("sync-codex syncs project skills (not local codexHome)", async () => {
  await withTempProject(async (targetDir) => {
    const codexHome = path.join(targetDir, "codex-home");
    // First setup
    await runCli(["setup-codex", "--path", targetDir, "--codex-home", codexHome, "--quiet"]);
    // Then sync
    await runCli(["sync-codex", "--path", targetDir, "--codex-home", codexHome, "--quiet"]);

    // Local codexHome skills must NOT be created
    const localSkillsDir = path.join(codexHome, "skills");
    assert.equal(
      await pathExists(localSkillsDir),
      false,
      "sync-codex must NOT install skills into local codexHome/skills"
    );
  });
});
