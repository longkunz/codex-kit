import path from "node:path";
import { pathExists, readText, removePath, walkFiles, writeText } from "./fs.js";
import { sha256 } from "./hash.js";
import { readManifest, writeManifest } from "./manifest.js";
import { loadTemplateFiles } from "./templates.js";
import { statusLocalMemories } from "./memories.js";

const PLUGIN_TARGET_ROOT = ".agents/plugins/codex-kit";
const MARKETPLACE_PATH = ".agents/plugins/marketplace.json";
const LEGACY_RULES_PATH = "codex/rules/default.rules";
const RULES_PATH = ".codex/rules/default.rules";

function normalizePath(filePath) {
  return filePath.split(path.sep).join("/");
}

function inferTarget(filePath, fallback = "project") {
  const normalized = normalizePath(filePath);
  if (normalized.startsWith(`${PLUGIN_TARGET_ROOT}/`) || normalized === MARKETPLACE_PATH) {
    return "plugin";
  }
  if (normalized.startsWith(".codex/hooks/") || normalized === ".codex/hooks.json") {
    return "hooks";
  }
  if (normalized.startsWith(".codex/rules/") || normalized.startsWith("codex/rules/")) {
    return "rules";
  }
  if (normalized.startsWith(".agents/skills/")) {
    return "skills";
  }
  return fallback;
}

function normalizeManifestFiles(manifest) {
  const files = Array.isArray(manifest?.files) ? manifest.files : [];
  return files.map((file) => ({
    ...file,
    path: normalizePath(file.path),
    target: file.target || inferTarget(file.path)
  }));
}

function buildTargets(files) {
  const targets = {};
  for (const file of files) {
    if (!targets[file.target]) {
      targets[file.target] = { files: [] };
    }
    targets[file.target].files.push(file.path);
  }
  return targets;
}

function buildManifest(version, files, features = {}) {
  const deduped = new Map();
  for (const file of files) {
    const normalized = {
      ...file,
      path: normalizePath(file.path),
      target: file.target || inferTarget(file.path)
    };
    deduped.set(`${normalized.target}:${normalized.path}`, normalized);
  }
  const nextFiles = [...deduped.values()].sort(
    (a, b) => a.target.localeCompare(b.target) || a.path.localeCompare(b.path)
  );
  return {
    version,
    managedAt: new Date().toISOString(),
    features,
    targets: buildTargets(nextFiles),
    files: nextFiles
  };
}

function createReporter() {
  const checks = [];
  return {
    ok(name, message, target = null) {
      checks.push({ status: "ok", name, message, target });
    },
    warn(name, message, target = null) {
      checks.push({ status: "warn", name, message, target });
    },
    fail(name, message, target = null) {
      checks.push({ status: "fail", name, message, target });
    },
    checks
  };
}

function hasFrontmatter(content) {
  return /^---\n[\s\S]*?\n---/.test(content);
}

function tomlLooksParseable(content) {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  let inMultiline = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    if (trimmed.includes('"""')) {
      inMultiline = !inMultiline;
      continue;
    }
    if (inMultiline) {
      continue;
    }
    if (trimmed.startsWith("[") && !/^\[[^\]]+\]$/.test(trimmed)) {
      return false;
    }
    if (!trimmed.startsWith("[") && !trimmed.includes("=") && !["]", "},"].includes(trimmed)) {
      return false;
    }
  }
  return !inMultiline;
}

async function safeReadJson(filePath) {
  try {
    return { value: JSON.parse(await readText(filePath)), error: null };
  } catch (error) {
    return { value: null, error };
  }
}

async function migrateRulesIfSafe(targetDir) {
  const legacyPath = path.join(targetDir, LEGACY_RULES_PATH);
  const nextPath = path.join(targetDir, RULES_PATH);
  if (!(await pathExists(legacyPath)) || (await pathExists(nextPath))) {
    return false;
  }
  await writeText(nextPath, await readText(legacyPath));
  await removePath(legacyPath);
  return true;
}

async function currentFileEntry(targetDir, relativePath, templateHash = null) {
  const destination = path.join(targetDir, relativePath);
  if (!(await pathExists(destination))) {
    return null;
  }
  const installedHash = sha256(await readText(destination));
  return {
    path: normalizePath(relativePath),
    target: inferTarget(relativePath),
    templateHash: templateHash || installedHash,
    installedHash
  };
}

async function collectExistingTemplateEntries({ targetDir, templateRoot, pluginRoot, hookRoot }) {
  const entries = [];
  const projectTemplates = await loadTemplateFiles(templateRoot);
  const pluginTemplates = (await loadTemplateFiles(pluginRoot)).map((template) => ({
    ...template,
    relativePath: normalizePath(path.join(PLUGIN_TARGET_ROOT, template.relativePath))
  }));
  const hookTemplates = await loadTemplateFiles(hookRoot);

  for (const template of projectTemplates.concat(pluginTemplates, hookTemplates)) {
    const entry = await currentFileEntry(targetDir, template.relativePath, template.templateHash);
    if (entry) {
      entries.push(entry);
    }
  }

  const marketplace = await currentFileEntry(targetDir, MARKETPLACE_PATH);
  if (marketplace) {
    marketplace.target = "plugin";
    entries.push(marketplace);
  }

  return entries;
}

async function resyncManifest({ targetDir, templateRoot, pluginRoot, hookRoot, version }) {
  const existing = await readManifest(targetDir);
  const existingFiles = normalizeManifestFiles(existing);
  const knownEntries = await collectExistingTemplateEntries({
    targetDir,
    templateRoot,
    pluginRoot,
    hookRoot
  });
  const byKey = new Map(existingFiles.map((file) => [`${file.target}:${file.path}`, file]));
  for (const entry of knownEntries) {
    byKey.set(`${entry.target}:${entry.path}`, entry);
  }
  await writeManifest(
    targetDir,
    buildManifest(version, [...byKey.values()], existing?.features || {})
  );
}

async function validateAgentsMd(targetDir, reporter) {
  if (await pathExists(path.join(targetDir, "AGENTS.md"))) {
    reporter.ok("AGENTS.md", "AGENTS.md found", "project");
  } else {
    reporter.fail("AGENTS.md", "AGENTS.md is missing", "project");
  }
}

async function validateSkills(targetDir, reporter) {
  const skillsDir = path.join(targetDir, ".agents/skills");
  if (!(await pathExists(skillsDir))) {
    reporter.fail("skills", ".agents/skills is missing", "skills");
    return;
  }
  const skillFiles = (await walkFiles(skillsDir)).filter(
    (file) => path.basename(file) === "SKILL.md"
  );
  if (skillFiles.length === 0) {
    reporter.fail("skills", "No SKILL.md files found under .agents/skills", "skills");
    return;
  }
  const missingFrontmatter = [];
  for (const file of skillFiles) {
    if (!hasFrontmatter(await readText(file))) {
      missingFrontmatter.push(normalizePath(path.relative(targetDir, file)));
    }
  }
  if (missingFrontmatter.length > 0) {
    reporter.warn("skills", `${missingFrontmatter.length} skill file(s) missing frontmatter`, "skills");
  } else {
    reporter.ok("skills", `${skillFiles.length} skill file(s) found`, "skills");
  }
}

async function validateSubagents(targetDir, reporter) {
  const agentsDir = path.join(targetDir, ".codex/agents");
  if (!(await pathExists(agentsDir))) {
    reporter.fail("subagents", ".codex/agents is missing", "project");
    return;
  }
  const agentFiles = (await walkFiles(agentsDir)).filter((file) => file.endsWith(".toml"));
  if (agentFiles.length === 0) {
    reporter.fail("subagents", "No .toml subagent files found", "project");
    return;
  }
  const invalid = [];
  for (const file of agentFiles) {
    const content = await readText(file);
    if (!tomlLooksParseable(content) || !/^\s*name\s*=/m.test(content)) {
      invalid.push(normalizePath(path.relative(targetDir, file)));
    }
  }
  if (invalid.length > 0) {
    reporter.fail("subagents", `${invalid.length} subagent TOML file(s) look invalid`, "project");
  } else {
    reporter.ok("subagents", `${agentFiles.length} subagent TOML file(s) found`, "project");
  }
}

async function validateConfig(targetDir, reporter) {
  const configPath = path.join(targetDir, ".codex/config.toml");
  if (!(await pathExists(configPath))) {
    reporter.fail("config", ".codex/config.toml is missing", "project");
    return;
  }
  if (tomlLooksParseable(await readText(configPath))) {
    reporter.ok("config", ".codex/config.toml looks parseable", "project");
  } else {
    reporter.fail("config", ".codex/config.toml looks invalid", "project");
  }
}

async function validateRules(targetDir, reporter, fix) {
  const legacyPath = path.join(targetDir, LEGACY_RULES_PATH);
  const rulesDir = path.join(targetDir, ".codex/rules");
  const hasLegacy = await pathExists(legacyPath);
  const migrated = fix ? await migrateRulesIfSafe(targetDir) : false;

  if (migrated) {
    reporter.ok("rules", `Migrated ${LEGACY_RULES_PATH} to ${RULES_PATH}`, "rules");
  } else if (hasLegacy) {
    reporter.fail("rules", `Rules found at ${LEGACY_RULES_PATH}; expected ${RULES_PATH}`, "rules");
  }

  if (!(await pathExists(rulesDir))) {
    reporter.fail("rules", ".codex/rules is missing", "rules");
    return;
  }
  const ruleFiles = (await walkFiles(rulesDir)).filter((file) => file.endsWith(".rules"));
  if (ruleFiles.length === 0) {
    reporter.fail("rules", "No .rules files found under .codex/rules", "rules");
  } else {
    reporter.ok("rules", `${ruleFiles.length} rules file(s) found`, "rules");
  }
}

async function validateHooks(targetDir, reporter) {
  const hooksJsonPath = path.join(targetDir, ".codex/hooks.json");
  if (!(await pathExists(hooksJsonPath))) {
    reporter.warn("hooks", "No hooks installed", "hooks");
    return;
  }
  const parsed = await safeReadJson(hooksJsonPath);
  if (parsed.error) {
    reporter.fail("hooks", ".codex/hooks.json is invalid JSON", "hooks");
    return;
  }

  const missing = [];
  for (const entries of Object.values(parsed.value.hooks || {})) {
    for (const entry of entries || []) {
      for (const hook of entry.hooks || []) {
        const script = String(hook.command || "")
          .split(/\s+/)
          .find((part) => part.startsWith(".codex/") || part.startsWith("./.codex/"));
        if (script) {
          const relativeScript = script.replace(/^\.\//, "");
          if (!(await pathExists(path.join(targetDir, relativeScript)))) {
            missing.push(relativeScript);
          }
        }
      }
    }
  }

  if (missing.length > 0) {
    reporter.fail("hooks", `${missing.length} hook command path(s) are missing`, "hooks");
  } else {
    reporter.ok("hooks", ".codex/hooks.json and hook commands are valid", "hooks");
  }
}

async function validatePlugin(targetDir, pluginRoot, version, reporter) {
  const marketplacePath = path.join(targetDir, MARKETPLACE_PATH);
  if (!(await pathExists(marketplacePath))) {
    reporter.warn("plugin", "Workspace plugin marketplace is not installed", "plugin");
    return;
  }
  const marketplace = await safeReadJson(marketplacePath);
  if (marketplace.error) {
    reporter.fail("plugin", `${MARKETPLACE_PATH} is invalid JSON`, "plugin");
    return;
  }
  const pluginEntry = (marketplace.value.plugins || []).find((plugin) => plugin?.name === "codex-kit");
  if (!pluginEntry) {
    reporter.fail("plugin", "Marketplace does not include codex-kit plugin", "plugin");
    return;
  }
  const pluginSourcePath = path.resolve(targetDir, pluginEntry.source?.path || "");
  const pluginJsonPath = path.join(pluginSourcePath, ".codex-plugin/plugin.json");
  if (!(await pathExists(pluginJsonPath))) {
    reporter.fail("plugin", "Plugin source path does not contain .codex-plugin/plugin.json", "plugin");
    return;
  }
  const pluginJson = await safeReadJson(pluginJsonPath);
  if (pluginJson.error) {
    reporter.fail("plugin", "Plugin metadata is invalid JSON", "plugin");
    return;
  }
  if (pluginJson.value.version !== version) {
    reporter.fail("plugin", `Plugin version ${pluginJson.value.version} does not match package ${version}`, "plugin");
  } else if (!(await pathExists(pluginRoot))) {
    reporter.fail("plugin", "Packaged plugin source is missing", "plugin");
  } else {
    reporter.ok("plugin", "Workspace plugin metadata is valid", "plugin");
  }
}

async function validateManifest({ targetDir, templateRoot, pluginRoot, hookRoot, version, reporter, fix }) {
  if (fix) {
    await resyncManifest({ targetDir, templateRoot, pluginRoot, hookRoot, version });
  }

  const manifest = await readManifest(targetDir);
  if (!manifest) {
    reporter.fail("manifest", ".codex-kit/manifest.json is missing", "project");
    return;
  }

  const files = normalizeManifestFiles(manifest);
  const missing = [];
  for (const file of files) {
    if (!(await pathExists(path.join(targetDir, file.path)))) {
      missing.push(file.path);
    }
  }
  if (missing.length > 0) {
    reporter.fail("manifest", `${missing.length} manifest-tracked file(s) are missing`, "project");
  } else {
    reporter.ok("manifest", `${files.length} manifest-tracked file(s) exist`, "project");
  }

  const targets = new Set(files.map((file) => file.target));
  const pluginExists = await pathExists(path.join(targetDir, PLUGIN_TARGET_ROOT));
  if (pluginExists && !targets.has("plugin")) {
    reporter.fail("manifest", "Plugin files exist but manifest does not track plugin target", "plugin");
  }
  const hooksExist = await pathExists(path.join(targetDir, ".codex/hooks.json"));
  if (hooksExist && !targets.has("hooks")) {
    reporter.fail("manifest", "Hooks exist but manifest does not track hooks target", "hooks");
  }
  const rulesExist = await pathExists(path.join(targetDir, RULES_PATH));
  if (rulesExist && !targets.has("rules")) {
    reporter.fail("manifest", "Rules exist but manifest does not track rules target", "rules");
  }
}

export async function runDoctor({
  targetDir,
  templateRoot,
  pluginRoot,
  hookRoot,
  codexHome,
  version,
  fix = false
}) {
  const reporter = createReporter();

  await validateAgentsMd(targetDir, reporter);
  await validateSkills(targetDir, reporter);
  await validateSubagents(targetDir, reporter);
  await validateConfig(targetDir, reporter);
  await validateRules(targetDir, reporter, fix);
  await validateHooks(targetDir, reporter);
  await validatePlugin(targetDir, pluginRoot, version, reporter);
  await validateManifest({ targetDir, templateRoot, pluginRoot, hookRoot, version, reporter, fix });

  const memories = await statusLocalMemories({ codexHome });
  if (memories.enabled) {
    reporter.ok("memories", `Memories are enabled in ${memories.configPath}`, "memories");
  } else {
    reporter.warn("memories", `Memories are not enabled in ${memories.configPath}`, "memories");
  }

  const summary = {
    ok: reporter.checks.filter((check) => check.status === "ok").length,
    warn: reporter.checks.filter((check) => check.status === "warn").length,
    fail: reporter.checks.filter((check) => check.status === "fail").length
  };

  return {
    targetDir,
    codexHome,
    fixed: fix,
    summary,
    checks: reporter.checks
  };
}
