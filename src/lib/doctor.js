import path from "node:path";
import { pathExists, readText, removePath, walkFiles, writeText } from "./fs.js";
import { sha256 } from "./hash.js";
import {
  normalizeManifest,
  readManifest,
  replaceManifestFilePath,
  writeManifest
} from "./manifest.js";
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
  if (normalized === ".codex/config.toml") {
    return "mcp";
  }
  if (normalized.startsWith(".agents/skills/")) {
    return "skills";
  }
  return fallback;
}

function normalizeManifestFiles(manifest) {
  const files = Array.isArray(manifest?.files) ? manifest.files : [];
  return normalizeManifest({
    ...(manifest || {}),
    files: files.map((file) => ({
      ...file,
      path: normalizePath(file.path),
      target:
        normalizePath(file.path) === ".codex/config.toml"
          ? "mcp"
          : file.target || inferTarget(file.path)
    }))
  }).files;
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
  return normalizeManifest({
    version,
    managedAt: new Date().toISOString(),
    features,
    targets: buildTargets(files),
    files
  });
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

async function currentFileEntry(targetDir, relativePath, templateHash = null, previous = null) {
  const destination = path.join(targetDir, relativePath);
  if (!(await pathExists(destination))) {
    return null;
  }
  const currentHash = sha256(await readText(destination));
  if (previous?.status === "unmanaged" || (previous && !previous.installedHash)) {
    const { installedHash: _ignored, ...unmanaged } = previous;
    return {
      ...unmanaged,
      status: "unmanaged",
      observedHash: previous.observedHash || currentHash
    };
  }
  if (previous?.installedHash) {
    return previous;
  }
  if (templateHash && currentHash === templateHash) {
    return {
      path: normalizePath(relativePath),
      target: inferTarget(relativePath),
      status: "managed",
      templateHash,
      installedHash: currentHash
    };
  }
  return {
    path: normalizePath(relativePath),
    target: inferTarget(relativePath),
    status: "unmanaged",
    templateHash,
    observedHash: currentHash
  };
}

async function collectExistingTemplateEntries({
  targetDir,
  templateRoot,
  pluginRoot,
  hookRoot,
  existingManifest
}) {
  const entries = [];
  const existingByKey = new Map(
    normalizeManifestFiles(existingManifest).map((file) => [`${file.target}:${file.path}`, file])
  );
  const projectTemplates = await loadTemplateFiles(templateRoot);
  const pluginTemplates = (await loadTemplateFiles(pluginRoot)).map((template) => ({
    ...template,
    relativePath: normalizePath(path.join(PLUGIN_TARGET_ROOT, template.relativePath))
  }));
  const hookTemplates = await loadTemplateFiles(hookRoot);

  for (const template of projectTemplates.concat(pluginTemplates, hookTemplates)) {
    const relativePath = normalizePath(template.relativePath);
    const target = inferTarget(relativePath);
    const entry = await currentFileEntry(
      targetDir,
      relativePath,
      template.templateHash,
      existingByKey.get(`${target}:${relativePath}`)
    );
    if (entry) {
      entries.push(entry);
    }
  }

  const marketplace = await currentFileEntry(
    targetDir,
    MARKETPLACE_PATH,
    null,
    existingByKey.get(`plugin:${MARKETPLACE_PATH}`)
  );
  if (marketplace) {
    marketplace.target = "plugin";
    entries.push(marketplace);
  }

  return entries;
}

async function resyncManifest({ targetDir, templateRoot, pluginRoot, hookRoot, version }) {
  let existing = await readManifest(targetDir);
  if (
    existing &&
    !(await pathExists(path.join(targetDir, LEGACY_RULES_PATH))) &&
    (await pathExists(path.join(targetDir, RULES_PATH)))
  ) {
    existing = replaceManifestFilePath(
      existing,
      LEGACY_RULES_PATH,
      RULES_PATH,
      "rules"
    );
  }
  const existingFiles = normalizeManifestFiles(existing);
  const knownEntries = await collectExistingTemplateEntries({
    targetDir,
    templateRoot,
    pluginRoot,
    hookRoot,
    existingManifest: existing
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

async function validatePluginHooks(pluginSourcePath) {
  const hooksRelativePath = "hooks/hooks.json";
  const hooksPath = path.resolve(pluginSourcePath, hooksRelativePath);
  if (!(await pathExists(hooksPath))) {
    return `Plugin hooks path is missing: ${hooksRelativePath}`;
  }
  const parsed = await safeReadJson(hooksPath);
  if (parsed.error) {
    return `Plugin hooks file is invalid JSON: ${hooksRelativePath}`;
  }

  for (const entries of Object.values(parsed.value.hooks || {})) {
    for (const entry of entries || []) {
      for (const hook of entry.hooks || []) {
        const script = String(hook.command || "")
          .split(/\s+/)
          .find((part) => part.startsWith("hooks/") || part.startsWith("./hooks/"));
        if (script) {
          const relativeScript = script.replace(/^\.\//, "");
          if (!(await pathExists(path.join(pluginSourcePath, relativeScript)))) {
            return `Plugin hook command path is missing: ${relativeScript}`;
          }
        }
      }
    }
  }
  return null;
}

async function validatePluginMcp(pluginSourcePath, mcpRelativePath) {
  if (!mcpRelativePath) {
    return "Plugin metadata does not declare mcpServers";
  }
  const mcpPath = path.resolve(pluginSourcePath, mcpRelativePath);
  if (!(await pathExists(mcpPath))) {
    return `Plugin MCP path is missing: ${mcpRelativePath}`;
  }
  const parsed = await safeReadJson(mcpPath);
  if (parsed.error) {
    return `Plugin MCP file is invalid JSON: ${mcpRelativePath}`;
  }
  if (!parsed.value.mcpServers || typeof parsed.value.mcpServers !== "object") {
    return `Plugin MCP file does not contain mcpServers: ${mcpRelativePath}`;
  }
  return null;
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
  if (typeof marketplace.value.name !== "string" || marketplace.value.name.length === 0) {
    reporter.fail("plugin", "Marketplace name is missing", "plugin");
    return;
  }
  if (pluginEntry.source?.source !== "local") {
    reporter.fail("plugin", "Marketplace codex-kit plugin source should be local", "plugin");
    return;
  }
  if (pluginEntry.source?.path !== `./${PLUGIN_TARGET_ROOT}`) {
    reporter.fail("plugin", `Marketplace codex-kit plugin path should be ./${PLUGIN_TARGET_ROOT}`, "plugin");
    return;
  }
  // Policy must be AVAILABLE: the documented flow requires explicit `codex plugin add`
  if (pluginEntry.policy?.installation !== "AVAILABLE") {
    reporter.fail(
      "plugin",
      `Marketplace codex-kit plugin installation policy should be AVAILABLE (got: ${pluginEntry.policy?.installation ?? "missing"})`,
      "plugin"
    );
    return;
  }
  if (!pluginEntry.policy || !["ON_INSTALL", "ON_USE"].includes(pluginEntry.policy.authentication)) {
    reporter.fail("plugin", "Marketplace plugin authentication policy is invalid", "plugin");
    return;
  }
  if (typeof pluginEntry.category !== "string" || pluginEntry.category.length === 0) {
    reporter.fail("plugin", "Marketplace plugin category is missing", "plugin");
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
  const hooksError = await validatePluginHooks(pluginSourcePath);
  const mcpError = await validatePluginMcp(pluginSourcePath, pluginJson.value.mcpServers);
  const packagedPluginJson = await safeReadJson(
    path.join(pluginRoot, ".codex-plugin/plugin.json")
  );

  if (pluginJson.value.name !== "codex-kit") {
    reporter.fail("plugin", "Plugin metadata name should be codex-kit", "plugin");
  } else if (pluginJson.value.version !== version) {
    reporter.fail("plugin", `Plugin version ${pluginJson.value.version} does not match package ${version}`, "plugin");
  } else if (!pluginJson.value.skills || !(await pathExists(path.resolve(pluginSourcePath, pluginJson.value.skills)))) {
    reporter.fail("plugin", "Plugin metadata skills path is missing", "plugin");
  } else if (hooksError) {
    reporter.fail("plugin", hooksError, "plugin");
  } else if (mcpError) {
    reporter.fail("plugin", mcpError, "plugin");
  } else if (packagedPluginJson.error) {
    reporter.fail("plugin", "Packaged plugin metadata is missing or invalid", "plugin");
  } else if (packagedPluginJson.value.version !== version) {
    reporter.fail("plugin", `Packaged plugin version ${packagedPluginJson.value.version} does not match package ${version}`, "plugin");
  } else {
    reporter.ok("plugin", "Workspace plugin marketplace, hooks, MCP, and metadata are valid", "plugin");
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
  const modified = [];
  const marketplaceModified = [];
  const unmanaged = [];
  for (const file of files) {
    const destination = path.join(targetDir, file.path);
    if (!(await pathExists(destination))) {
      missing.push(file.path);
      continue;
    }
    if (file.status === "unmanaged" || !file.installedHash) {
      unmanaged.push(file.path);
      continue;
    }
    if (sha256(await readText(destination)) !== file.installedHash) {
      // Marketplace modifications are expected user customizations; surface as warn
      if (normalizePath(file.path) === MARKETPLACE_PATH) {
        marketplaceModified.push(file.path);
      } else {
        modified.push(file.path);
      }
    }
  }
  if (missing.length > 0) {
    reporter.fail("manifest", `${missing.length} manifest-tracked file(s) are missing`, "project");
  } else {
    reporter.ok("manifest", `${files.length} manifest-tracked file(s) exist`, "project");
  }
  if (modified.length > 0) {
    reporter.fail("manifest", `${modified.length} managed file(s) are locally modified`, "project");
  }
  if (marketplaceModified.length > 0) {
    reporter.warn("manifest", `Marketplace file has been locally modified; sync with --force to reset`, "plugin");
  }
  if (unmanaged.length > 0) {
    reporter.warn("manifest", `${unmanaged.length} existing file(s) remain unmanaged`, "project");
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
