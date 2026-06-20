import path from "node:path";
import { pathExists, readText, removePath, writeText } from "./fs.js";
import { sha256 } from "./hash.js";
import {
  MANIFEST_PATH,
  readManifest,
  replaceManifestFilePath,
  writeManifest
} from "./manifest.js";
import {
  getCoreSkills,
  getInstalledShippedSkills,
  getSelectedShippedSkills,
  getSkillsForProfile,
  inferInstalledProjectSkills,
  loadSkillTemplates
} from "./skills.js";
import { loadTemplateFiles } from "./templates.js";

const PLUGIN_NAME = "codex-kit";
const PLUGIN_TARGET_ROOT = ".agents/plugins/codex-kit";
const MARKETPLACE_PATH = ".agents/plugins/marketplace.json";
const LOCAL_SKILLS_TARGET_ROOT = "skills";
const PROJECT_SKILLS_TARGET_ROOT = ".agents/skills";
const PROJECT_SHARED_TARGET_ROOT = ".agents/.shared";
const LEGACY_RULES_PATH = "codex/rules/default.rules";
const RULES_PATH = ".codex/rules/default.rules";

function inferManifestTarget(filePath, fallback = "project") {
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
  if (normalized.startsWith(`${PROJECT_SKILLS_TARGET_ROOT}/`)) {
    return "skills";
  }
  return fallback;
}

function normalizeManifestFiles(manifest) {
  const files = Array.isArray(manifest?.files) ? manifest.files : [];
  const normalized = files.map((file) => ({
    ...file,
    path: normalizePath(file.path),
    target:
      normalizePath(file.path) === ".codex/config.toml"
        ? "mcp"
        : file.target || inferManifestTarget(file.path)
  }));
  const byKey = new Map();
  for (const file of normalized) {
    byKey.set(`${file.target}:${file.path}`, file);
  }
  return [...byKey.values()].sort(
    (a, b) => a.target.localeCompare(b.target) || a.path.localeCompare(b.path)
  );
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
  const normalizedFiles = normalizeManifestFiles({ files });
  return {
    version,
    managedAt: new Date().toISOString(),
    features,
    targets: buildTargets(normalizedFiles),
    files: normalizedFiles
  };
}

function normalizePath(filePath) {
  return filePath.split(path.sep).join("/");
}

function manifestKey(file) {
  return `${file.target}:${file.path}`;
}

async function getCurrentHash(filePath) {
  if (!(await pathExists(filePath))) {
    return null;
  }
  return sha256(await readText(filePath));
}

function hasPluginFeature(manifest) {
  const files = normalizeManifestFiles(manifest);
  return (
    manifest?.features?.installPlugin === true ||
    files.some((file) => file.path.startsWith(`${PLUGIN_TARGET_ROOT}/`)) === true
  );
}

function syncPluginManifestVersion(template, version) {
  if (normalizePath(template.relativePath) !== ".codex-plugin/plugin.json") {
    return template;
  }

  const manifest = JSON.parse(template.content);
  manifest.version = version;
  const content = JSON.stringify(manifest, null, 2) + "\n";
  return { ...template, content, templateHash: sha256(content) };
}

function filterSkillTemplates(templates, selectedSkills) {
  if (!selectedSkills) {
    return templates;
  }

  const selectedPaths = new Set();
  for (const skill of selectedSkills) {
    selectedPaths.add(normalizePath(skill.installRelativePath));
  }

  return templates.filter((template) => {
    const rel = normalizePath(template.relativePath);
    if (rel.startsWith(`${PROJECT_SHARED_TARGET_ROOT}/`)) {
      return true;
    }
    if (rel.startsWith(`${PROJECT_SKILLS_TARGET_ROOT}/`)) {
      return [...selectedPaths].some((p) => {
        const fullP = `${PROJECT_SKILLS_TARGET_ROOT}/${p}`;
        return rel === fullP || rel.startsWith(`${fullP}/`);
      });
    }
    return true;
  });
}

async function loadManagedTemplates({ templateRoot, pluginRoot, version, includePlugin = false, selectedSkills = null }) {
  let templates = await loadTemplateFiles(templateRoot);
  templates = filterSkillTemplates(templates, selectedSkills);

  if (!includePlugin) {
    return templates;
  }

  const pluginTemplates = (await loadTemplateFiles(pluginRoot)).map((template) =>
    syncPluginManifestVersion(template, version)
  );
  return templates
    .concat(
      pluginTemplates.map((template) => ({
        ...template,
        relativePath: normalizePath(path.join(PLUGIN_TARGET_ROOT, template.relativePath))
      }))
    )
    .sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}

async function loadPluginTemplates(pluginRoot, version) {
  const pluginTemplates = (await loadTemplateFiles(pluginRoot)).map((template) =>
    syncPluginManifestVersion(template, version)
  );
  return pluginTemplates
    .map((template) => ({
      ...template,
      relativePath: normalizePath(path.join(PLUGIN_TARGET_ROOT, template.relativePath))
    }))
    .sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}

async function loadProjectSkillsTemplates(templateRoot, selectedSkills = null) {
  let templates = await loadTemplateFiles(templateRoot);
  templates = filterSkillTemplates(templates, selectedSkills);
  return templates
    .filter(
      (template) =>
        normalizePath(template.relativePath).startsWith(`${PROJECT_SKILLS_TARGET_ROOT}/`) ||
        normalizePath(template.relativePath).startsWith(`${PROJECT_SHARED_TARGET_ROOT}/`)
    )
    .sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}

function mergeManifestFeatures(existingManifest, featurePatch = {}) {
  return {
    ...(existingManifest?.features || {}),
    ...featurePatch
  };
}

async function writeProjectSubset({
  targetDir,
  templates,
  version,
  existingManifest,
  featurePatch = {},
  replacePaths = [],
  target = "project",
  force = false,
  dryRun = false,
  syncMode = false
}) {
  const existingFiles = normalizeManifestFiles(existingManifest);
  const targetForPath =
    typeof target === "function" ? target : () => target;
  const manifestByKey = new Map(existingFiles.map((file) => [manifestKey(file), file]));
  const replaceSet = new Set(replacePaths);
  const replaceKeys = new Set(
    [...replaceSet].map((filePath) =>
      manifestKey({ target: targetForPath(filePath), path: filePath })
    )
  );
  const nextManifestFiles = existingFiles.filter(
    (file) => !replaceKeys.has(manifestKey(file))
  );
  const written = [];
  const skipped = [];

  for (const template of templates) {
    const relativePath = normalizePath(template.relativePath);
    const entryTarget = targetForPath(relativePath);
    const destination = path.join(targetDir, template.relativePath);
    const currentHash = await getCurrentHash(destination);
    const previous = manifestByKey.get(manifestKey({ target: entryTarget, path: relativePath }));
    const exists = currentHash !== null;
    const isUnmanaged = previous?.status === "unmanaged" || (previous && !previous.installedHash);
    const isLocallyModified =
      syncMode &&
      currentHash !== null &&
      previous?.installedHash &&
      currentHash !== previous.installedHash;
    const isUntrackedExisting = syncMode && exists && !previous;
    const isProtected = !force && (isUnmanaged || isLocallyModified || isUntrackedExisting);

    if ((exists && !syncMode && !force) || isProtected) {
      skipped.push(relativePath);
      if (previous?.installedHash && previous.status !== "unmanaged") {
        nextManifestFiles.push(previous);
      } else {
        const observedHash = currentHash || previous?.observedHash;
        nextManifestFiles.push({
          path: relativePath,
          target: entryTarget,
          status: "unmanaged",
          templateHash: template.templateHash,
          ...(observedHash ? { observedHash } : {})
        });
      }
      continue;
    }

    if (!dryRun) {
      await writeText(destination, template.content);
    }

    written.push(relativePath);
    nextManifestFiles.push({
      path: relativePath,
      target: entryTarget,
      status: "managed",
      templateHash: template.templateHash,
      installedHash: template.templateHash
    });
  }

  if (!dryRun) {
    await writeManifest(
      targetDir,
      buildManifest(version, nextManifestFiles, mergeManifestFeatures(existingManifest, featurePatch))
    );
  }

  return { written, skipped };
}

async function loadHookTemplates(hookRoot) {
  return loadTemplateFiles(hookRoot);
}

async function migrateLegacyRulesPath({ targetDir, force = false, dryRun = false }) {
  const legacyPath = path.join(targetDir, LEGACY_RULES_PATH);
  const rulesPath = path.join(targetDir, RULES_PATH);
  const hasLegacyRules = await pathExists(legacyPath);
  if (!hasLegacyRules) {
    return { migrated: false, warning: null };
  }

  const hasNewRules = await pathExists(rulesPath);
  if (hasNewRules && !force) {
    return {
      migrated: false,
      warning: `Found legacy rules at ${LEGACY_RULES_PATH}; keeping existing ${RULES_PATH}. Remove the legacy file after reviewing it.`
    };
  }

  if (!dryRun) {
    await writeText(rulesPath, await readText(legacyPath));
    await removePath(legacyPath);
  }

  return { migrated: true, warning: null };
}

/**
 * Default codex-kit marketplace entry fields that are always generated.
 * The `category` is preserved from existing user content unless --force is used.
 * Policy is AVAILABLE: the documented flow requires explicit `codex plugin add`.
 */
const DEFAULT_PLUGIN_ENTRY = {
  name: PLUGIN_NAME,
  source: {
    source: "local",
    path: `./${PLUGIN_TARGET_ROOT}`
  },
  policy: {
    installation: "AVAILABLE",
    authentication: "ON_INSTALL"
  },
  category: "Developer Tools"
};

/**
 * Build the canonical marketplace JSON that should be written to disk.
 * Existing user content (marketplace name, interface, other plugins, and the
 * codex-kit entry's `category`) is preserved unless `force` is true.
 */
function buildMarketplaceContent(existingContent, force = false) {
  const base = existingContent || {
    name: "local-plugins",
    interface: { displayName: "Local Plugins" },
    plugins: []
  };
  const plugins = Array.isArray(base.plugins) ? [...base.plugins] : [];
  const existingIndex = plugins.findIndex((p) => p?.name === PLUGIN_NAME);

  let newEntry;
  if (force || existingIndex === -1) {
    // On force or fresh install: write full canonical entry
    newEntry = { ...DEFAULT_PLUGIN_ENTRY };
  } else {
    // Preserve user-customized fields (e.g. category) but enforce source and policy
    newEntry = {
      ...plugins[existingIndex],
      ...DEFAULT_PLUGIN_ENTRY,
      // Keep user-customized category unless it was absent
      category: plugins[existingIndex].category || DEFAULT_PLUGIN_ENTRY.category
    };
  }

  if (existingIndex === -1) {
    plugins.push(newEntry);
  } else {
    plugins[existingIndex] = newEntry;
  }

  return { ...base, plugins };
}

/**
 * Ensure the marketplace file exists and tracks the codex-kit entry.
 * Applies hash-aware ownership semantics identical to other generated files:
 *   - Missing file: generate it and record a managed baseline.
 *   - Managed unchanged file: safe to refresh.
 *   - Managed modified file (syncMode): preserve without --force.
 *   - Existing untracked file: treat as unmanaged; do not adopt without --force.
 *   - --force: reset the codex-kit entry and establish a clean managed baseline.
 *   - Invalid JSON: only replace when --force is explicit.
 */
async function ensurePluginMarketplace({
  targetDir,
  existingManifest,
  version,
  force = false,
  dryRun = false,
  syncMode = false
}) {
  const marketplacePath = path.join(targetDir, MARKETPLACE_PATH);
  const mKey = `plugin:${MARKETPLACE_PATH}`;
  const existingFiles = normalizeManifestFiles(existingManifest);
  const previous = existingFiles.find((f) => `${f.target}:${f.path}` === mKey);
  const currentHash = await getCurrentHash(marketplacePath);
  const exists = currentHash !== null;

  // Determine ownership state
  const isUnmanaged = previous?.status === "unmanaged" || (previous && !previous.installedHash);
  const isLocallyModified =
    syncMode &&
    exists &&
    previous?.installedHash &&
    currentHash !== previous.installedHash;
  const isUntrackedExisting = syncMode && exists && !previous;
  const isProtected = !force && (isUnmanaged || isLocallyModified || isUntrackedExisting);

  // Protect on non-sync install when file exists and has no managed record
  const isUntrackedExistingInit = !syncMode && exists && !previous;
  const isProtectedInit = !force && isUntrackedExistingInit;

  if (isProtected || isProtectedInit) {
    // Do not write or adopt; return previous manifest record as-is
    return { marketplaceWritten: false, nextManifestEntry: previous || null };
  }

  // Read existing content to preserve user customizations in other plugins/fields
  let existingContent = null;
  if (exists) {
    try {
      existingContent = JSON.parse(await readText(marketplacePath));
    } catch {
      // Invalid JSON: only replace if --force
      if (!force) {
        return { marketplaceWritten: false, nextManifestEntry: previous || null };
      }
    }
  }

  const marketplace = buildMarketplaceContent(existingContent, force);
  const content = JSON.stringify(marketplace, null, 2) + "\n";
  const contentHash = sha256(content);

  if (!dryRun) {
    await writeText(marketplacePath, content);
  }

  const nextEntry = {
    path: MARKETPLACE_PATH,
    target: "plugin",
    status: "managed",
    templateHash: contentHash,
    installedHash: contentHash
  };

  return { marketplaceWritten: true, nextManifestEntry: nextEntry };
}

/**
 * Merge a marketplace manifest entry into a list of manifest files.
 * Replaces any existing entry for MARKETPLACE_PATH under target "plugin".
 */
function mergeMarketplaceEntry(manifestFiles, entry) {
  if (!entry) {
    return manifestFiles;
  }
  const filtered = manifestFiles.filter(
    (f) => !(f.target === "plugin" && f.path === MARKETPLACE_PATH)
  );
  filtered.push(entry);
  return filtered;
}

/**
 * Write the marketplace manifest entry back into the on-disk manifest after
 * writeProjectSubset has already written and updated it.
 */
async function persistMarketplaceEntry(targetDir, version, manifestEntry, featurePatch) {
  if (!manifestEntry) {
    return;
  }
  const manifest = await readManifest(targetDir);
  const merged = mergeMarketplaceEntry(normalizeManifestFiles(manifest), manifestEntry);
  await writeManifest(
    targetDir,
    buildManifest(version, merged, mergeManifestFeatures(manifest, featurePatch))
  );
}

export async function installLocalSkills({
  skillsRoot,
  codexHome,
  skills,
  force = false,
  dryRun = false
}) {
  const targetDir = path.join(codexHome, LOCAL_SKILLS_TARGET_ROOT);
  const written = [];
  const skipped = [];

  const selectedSkills = await getSelectedShippedSkills({ skillsRoot, skills });

  for (const skill of selectedSkills) {
    const templates = await loadSkillTemplates(skill);

    for (const template of templates) {
      const destination = path.join(targetDir, template.relativePath);
      const exists = await pathExists(destination);

      if (exists && !force) {
        skipped.push(normalizePath(path.join(LOCAL_SKILLS_TARGET_ROOT, template.relativePath)));
        continue;
      }

      if (!dryRun) {
        await writeText(destination, template.content);
      }

      written.push(normalizePath(path.join(LOCAL_SKILLS_TARGET_ROOT, template.relativePath)));
    }
  }

  return {
    targetDir,
    written,
    skipped
  };
}

export async function syncLocalSkills({
  skillsRoot,
  codexHome,
  skills,
  dryRun = false
}) {
  return installLocalSkills({
    skillsRoot,
    codexHome,
    skills,
    force: true,
    dryRun
  });
}

export async function removeLocalSkills({
  skillsRoot,
  codexHome,
  skills,
  dryRun = false
}) {
  const targetDir = path.join(codexHome, LOCAL_SKILLS_TARGET_ROOT);
  const removed = [];
  const skipped = [];

  const removableSkills = await getSelectedShippedSkills({ skillsRoot, skills });

  for (const skill of removableSkills) {
    const destination = path.join(targetDir, skill.installRelativePath);
    if (!(await pathExists(destination))) {
      skipped.push(normalizePath(path.join(LOCAL_SKILLS_TARGET_ROOT, skill.installRelativePath)));
      continue;
    }

    if (!dryRun) {
      await removePath(destination);
    }

    removed.push(normalizePath(path.join(LOCAL_SKILLS_TARGET_ROOT, skill.installRelativePath)));
  }

  return {
    targetDir,
    removed,
    skipped
  };
}

export async function listInstalledLocalSkills({ skillsRoot, codexHome }) {
  return getInstalledShippedSkills({ skillsRoot, codexHome });
}

export async function initProject({
  targetDir,
  templateRoot,
  pluginRoot,
  version,
  installPlugin = false,
  force = false,
  dryRun = false,
  selectedSkills = null
}) {
  if (!selectedSkills) {
    selectedSkills = await getCoreSkills(path.join(templateRoot, ".agents/skills"));
  }
  let existingManifest = await readManifest(targetDir);
  const rulesMigration = await migrateLegacyRulesPath({ targetDir, force, dryRun });
  if (rulesMigration.migrated) {
    existingManifest = replaceManifestFilePath(
      existingManifest,
      LEGACY_RULES_PATH,
      RULES_PATH,
      "rules"
    );
  }
  const templates = await loadManagedTemplates({
    templateRoot,
    pluginRoot,
    version,
    includePlugin: installPlugin,
    selectedSkills
  });
  const replacePaths = templates.map((template) => normalizePath(template.relativePath));
  const result = await writeProjectSubset({
    targetDir,
    templates,
    version,
    existingManifest,
    featurePatch: { installPlugin },
    replacePaths,
    target: (filePath) => inferManifestTarget(filePath, "project"),
    force,
    dryRun,
    syncMode: false
  });

  if (installPlugin) {
    const { nextManifestEntry } = await ensurePluginMarketplace({
      targetDir,
      existingManifest,
      version,
      force,
      dryRun,
      syncMode: false
    });
    if (nextManifestEntry && !dryRun) {
      await persistMarketplaceEntry(targetDir, version, nextManifestEntry, { installPlugin });
    }
  }

  return {
    ...result,
    pluginInstalled: installPlugin,
    warnings: [rulesMigration.warning].filter(Boolean),
    migrated: rulesMigration.migrated ? [LEGACY_RULES_PATH] : []
  };
}

export async function installWorkspacePlugin({
  targetDir,
  pluginRoot,
  version,
  force = false,
  dryRun = false
}) {
  const existingManifest = await readManifest(targetDir);
  const templates = await loadPluginTemplates(pluginRoot, version);
  const replacePaths = templates.map((template) => normalizePath(template.relativePath));
  const result = await writeProjectSubset({
    targetDir,
    templates,
    version,
    existingManifest,
    featurePatch: { installPlugin: true },
    replacePaths,
    target: "plugin",
    force,
    dryRun,
    syncMode: false
  });

  const { nextManifestEntry } = await ensurePluginMarketplace({
    targetDir,
    existingManifest,
    version,
    force,
    dryRun,
    syncMode: false
  });
  if (nextManifestEntry && !dryRun) {
    await persistMarketplaceEntry(targetDir, version, nextManifestEntry, { installPlugin: true });
  }

  return { ...result, pluginInstalled: true };
}

export async function updateProject({
  targetDir,
  templateRoot,
  pluginRoot,
  version,
  installPlugin = false,
  force = false,
  dryRun = false,
  selectedSkills = null
}) {
  if (!selectedSkills) {
    selectedSkills = await inferInstalledProjectSkills(targetDir, path.join(templateRoot, ".agents/skills"));
    if (selectedSkills.length === 0) {
      selectedSkills = await getCoreSkills(path.join(templateRoot, ".agents/skills"));
    }
  }
  let existingManifest = await readManifest(targetDir);
  if (!existingManifest) {
    throw new Error("No Codex Kit manifest found. Run `codex-kit init` first.");
  }

  const rulesMigration = await migrateLegacyRulesPath({ targetDir, force, dryRun });
  if (rulesMigration.migrated) {
    existingManifest = replaceManifestFilePath(
      existingManifest,
      LEGACY_RULES_PATH,
      RULES_PATH,
      "rules"
    );
  }
  const includePlugin = installPlugin || hasPluginFeature(existingManifest);
  const templates = await loadManagedTemplates({
    templateRoot,
    pluginRoot,
    version,
    includePlugin,
    selectedSkills
  });
  const replacePaths = templates.map((template) => normalizePath(template.relativePath));
  const result = await writeProjectSubset({
    targetDir,
    templates,
    version,
    existingManifest,
    featurePatch: { installPlugin: includePlugin },
    replacePaths,
    target: (filePath) => inferManifestTarget(filePath, "project"),
    force,
    dryRun,
    syncMode: true
  });

  if (includePlugin) {
    const { nextManifestEntry } = await ensurePluginMarketplace({
      targetDir,
      existingManifest,
      version,
      force,
      dryRun,
      syncMode: true
    });
    if (nextManifestEntry && !dryRun) {
      await persistMarketplaceEntry(targetDir, version, nextManifestEntry, { installPlugin: includePlugin });
    }
  }

  return {
    ...result,
    pluginInstalled: includePlugin,
    warnings: [rulesMigration.warning].filter(Boolean),
    migrated: rulesMigration.migrated ? [LEGACY_RULES_PATH] : []
  };
}

export async function syncWorkspacePlugin({
  targetDir,
  pluginRoot,
  version,
  force = false,
  dryRun = false
}) {
  const existingManifest = await readManifest(targetDir);
  const templates = await loadPluginTemplates(pluginRoot, version);
  const replacePaths = templates.map((template) => normalizePath(template.relativePath));
  const result = await writeProjectSubset({
    targetDir,
    templates,
    version,
    existingManifest,
    featurePatch: { installPlugin: true },
    replacePaths,
    target: "plugin",
    force,
    dryRun,
    syncMode: true
  });

  const { nextManifestEntry } = await ensurePluginMarketplace({
    targetDir,
    existingManifest,
    version,
    force,
    dryRun,
    syncMode: true
  });
  if (nextManifestEntry && !dryRun) {
    await persistMarketplaceEntry(targetDir, version, nextManifestEntry, { installPlugin: true });
  }

  return { ...result, pluginInstalled: true };
}

export async function installProjectSkills({
  targetDir,
  templateRoot,
  version,
  force = false,
  dryRun = false,
  selectedSkills = null
}) {
  if (!selectedSkills) {
    selectedSkills = await getCoreSkills(path.join(templateRoot, ".agents/skills"));
  }
  const existingManifest = await readManifest(targetDir);
  const templates = await loadProjectSkillsTemplates(templateRoot, selectedSkills);
  const replacePaths = templates.map((template) => normalizePath(template.relativePath));

  return writeProjectSubset({
    targetDir,
    templates,
    version,
    existingManifest,
    replacePaths,
    target: "skills",
    force,
    dryRun,
    syncMode: false
  });
}

export async function syncProjectSkills({
  targetDir,
  templateRoot,
  version,
  force = false,
  dryRun = false,
  selectedSkills = null
}) {
  if (!selectedSkills) {
    selectedSkills = await inferInstalledProjectSkills(targetDir, path.join(templateRoot, ".agents/skills"));
    if (selectedSkills.length === 0) {
      selectedSkills = await getCoreSkills(path.join(templateRoot, ".agents/skills"));
    }
  }
  const existingManifest = await readManifest(targetDir);
  const templates = await loadProjectSkillsTemplates(templateRoot, selectedSkills);
  const replacePaths = templates.map((template) => normalizePath(template.relativePath));

  return writeProjectSubset({
    targetDir,
    templates,
    version,
    existingManifest,
    replacePaths,
    target: "skills",
    force,
    dryRun,
    syncMode: true
  });
}

export async function installProjectHooks({
  targetDir,
  hookRoot,
  version,
  force = false,
  dryRun = false
}) {
  const existingManifest = await readManifest(targetDir);
  const templates = await loadHookTemplates(hookRoot);
  const replacePaths = templates.map((template) => normalizePath(template.relativePath));

  return writeProjectSubset({
    targetDir,
    templates,
    version,
    existingManifest,
    replacePaths,
    target: "hooks",
    force,
    dryRun,
    syncMode: false
  });
}

export async function syncProjectHooks({
  targetDir,
  hookRoot,
  version,
  force = false,
  dryRun = false
}) {
  const existingManifest = await readManifest(targetDir);
  const templates = await loadHookTemplates(hookRoot);
  const replacePaths = templates.map((template) => normalizePath(template.relativePath));

  return writeProjectSubset({
    targetDir,
    templates,
    version,
    existingManifest,
    replacePaths,
    target: "hooks",
    force,
    dryRun,
    syncMode: true
  });
}

export async function statusProject({ targetDir, templateRoot, pluginRoot, version }) {
  const manifest = await readManifest(targetDir);
  const templates = await loadManagedTemplates({
    templateRoot,
    pluginRoot,
    version,
    includePlugin: hasPluginFeature(manifest)
  });
  const templateByPath = new Map(
    templates.map((template) => [normalizePath(template.relativePath), template])
  );

  if (!manifest) {
    return {
      version,
      managedCount: templates.length,
      pluginInstalled: false,
      missing: templates.map((template) => normalizePath(template.relativePath)),
      modified: [],
      outdated: []
    };
  }

  const missing = [];
  const modified = [];
  const outdated = [];

  for (const file of normalizeManifestFiles(manifest)) {
    const destination = path.join(targetDir, file.path);
    const currentHash = await getCurrentHash(destination);
    const template = templateByPath.get(file.path);
    if (currentHash === null) {
      missing.push(file.path);
      continue;
    }
    if (
      file.status === "unmanaged" ||
      !file.installedHash ||
      currentHash !== file.installedHash
    ) {
      modified.push(file.path);
    }
    if (template && file.templateHash !== template.templateHash) {
      outdated.push(file.path);
    }
  }

  return {
    version: manifest.version || version,
    managedCount: normalizeManifestFiles(manifest).length,
    pluginInstalled: hasPluginFeature(manifest),
    missing,
    modified,
    outdated
  };
}

export async function statusWorkspacePlugin({ targetDir, pluginRoot, version }) {
  const manifest = await readManifest(targetDir);
  const templates = await loadPluginTemplates(pluginRoot, version);
  const templateByPath = new Map(
    templates.map((template) => [normalizePath(template.relativePath), template])
  );

  if (!manifest || !hasPluginFeature(manifest)) {
    return {
      version: manifest?.version || version,
      managedCount: templates.length,
      pluginInstalled: false,
      missing: templates.map((template) => normalizePath(template.relativePath)),
      modified: [],
      outdated: []
    };
  }

  const pluginFiles = normalizeManifestFiles(manifest).filter((file) =>
    file.path.startsWith(`${PLUGIN_TARGET_ROOT}/`)
  );
  const missing = [];
  const modified = [];
  const outdated = [];

  for (const template of templates) {
    const relativePath = normalizePath(template.relativePath);
    const tracked = pluginFiles.find((file) => file.path === relativePath);
    const destination = path.join(targetDir, relativePath);
    const currentHash = await getCurrentHash(destination);

    if (!tracked || currentHash === null) {
      missing.push(relativePath);
      continue;
    }
    if (
      tracked.status === "unmanaged" ||
      !tracked.installedHash ||
      currentHash !== tracked.installedHash
    ) {
      modified.push(relativePath);
    }
    if (templateByPath.has(relativePath) && tracked.templateHash !== template.templateHash) {
      outdated.push(relativePath);
    }
  }

  return {
    version: manifest.version || version,
    managedCount: pluginFiles.length,
    pluginInstalled: true,
    missing,
    modified,
    outdated
  };
}

export { MANIFEST_PATH };
