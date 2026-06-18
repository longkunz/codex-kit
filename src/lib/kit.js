import path from "node:path";
import { pathExists, readText, removePath, writeText } from "./fs.js";
import { sha256 } from "./hash.js";
import { MANIFEST_PATH, readManifest, writeManifest } from "./manifest.js";
import {
  getInstalledShippedSkills,
  getSelectedShippedSkills,
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
    return fallback;
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
    target: file.target || inferManifestTarget(file.path)
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

async function loadManagedTemplates({ templateRoot, pluginRoot, includePlugin = false }) {
  const templates = await loadTemplateFiles(templateRoot);
  if (!includePlugin) {
    return templates;
  }

  const pluginTemplates = await loadTemplateFiles(pluginRoot);
  return templates
    .concat(
      pluginTemplates.map((template) => ({
        ...template,
        relativePath: normalizePath(path.join(PLUGIN_TARGET_ROOT, template.relativePath))
      }))
    )
    .sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}

async function loadPluginTemplates(pluginRoot) {
  const pluginTemplates = await loadTemplateFiles(pluginRoot);
  return pluginTemplates
    .map((template) => ({
      ...template,
      relativePath: normalizePath(path.join(PLUGIN_TARGET_ROOT, template.relativePath))
    }))
    .sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}

async function loadProjectSkillsTemplates(templateRoot) {
  const templates = await loadTemplateFiles(templateRoot);
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
    const isLocallyModified =
      syncMode &&
      currentHash !== null &&
      previous &&
      previous.installedHash &&
      currentHash !== previous.installedHash;

    if ((exists && !syncMode && !force) || (isLocallyModified && !force)) {
      skipped.push(relativePath);
      nextManifestFiles.push({
        path: relativePath,
        target: entryTarget,
        templateHash: template.templateHash,
        installedHash: currentHash || previous?.installedHash || template.templateHash
      });
      continue;
    }

    if (!dryRun) {
      await writeText(destination, template.content);
    }

    written.push(relativePath);
    nextManifestFiles.push({
      path: relativePath,
      target: entryTarget,
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

async function ensurePluginMarketplace({ targetDir, dryRun = false }) {
  const marketplacePath = path.join(targetDir, MARKETPLACE_PATH);
  const pluginEntry = {
    name: PLUGIN_NAME,
    source: {
      source: "local",
      path: `./${PLUGIN_TARGET_ROOT}`
    },
    policy: {
      installation: "INSTALLED_BY_DEFAULT",
      authentication: "ON_INSTALL"
    },
    category: "Developer Tools"
  };

  let marketplace = {
    name: "local-plugins",
    interface: {
      displayName: "Local Plugins"
    },
    plugins: []
  };

  if (await pathExists(marketplacePath)) {
    marketplace = JSON.parse(await readText(marketplacePath));
  }

  const plugins = Array.isArray(marketplace.plugins) ? marketplace.plugins : [];
  const existingIndex = plugins.findIndex((plugin) => plugin?.name === PLUGIN_NAME);

  if (existingIndex === -1) {
    plugins.push(pluginEntry);
  } else {
    plugins[existingIndex] = {
      ...plugins[existingIndex],
      ...pluginEntry
    };
  }

  marketplace = {
    name: marketplace.name || "local-plugins",
    interface: {
      displayName: marketplace.interface?.displayName || "Local Plugins"
    },
    ...marketplace,
    plugins
  };

  if (!dryRun) {
    await writeText(marketplacePath, JSON.stringify(marketplace, null, 2) + "\n");
  }
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
  dryRun = false
}) {
  const existingManifest = await readManifest(targetDir);
  const rulesMigration = await migrateLegacyRulesPath({ targetDir, force, dryRun });
  const templates = await loadManagedTemplates({
    templateRoot,
    pluginRoot,
    includePlugin: installPlugin
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
    await ensurePluginMarketplace({ targetDir, dryRun });
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
  const templates = await loadPluginTemplates(pluginRoot);
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

  await ensurePluginMarketplace({ targetDir, dryRun });

  return { ...result, pluginInstalled: true };
}

export async function updateProject({
  targetDir,
  templateRoot,
  pluginRoot,
  version,
  installPlugin = false,
  force = false,
  dryRun = false
}) {
  const existingManifest = await readManifest(targetDir);
  if (!existingManifest) {
    throw new Error("No Codex Kit manifest found. Run `codex-kit init` first.");
  }

  const rulesMigration = await migrateLegacyRulesPath({ targetDir, force, dryRun });
  const includePlugin = installPlugin || hasPluginFeature(existingManifest);
  const templates = await loadManagedTemplates({
    templateRoot,
    pluginRoot,
    includePlugin
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
    await ensurePluginMarketplace({ targetDir, dryRun });
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
  const templates = await loadPluginTemplates(pluginRoot);
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

  await ensurePluginMarketplace({ targetDir, dryRun });

  return { ...result, pluginInstalled: true };
}

export async function installProjectSkills({
  targetDir,
  templateRoot,
  version,
  force = false,
  dryRun = false
}) {
  const existingManifest = await readManifest(targetDir);
  const templates = await loadProjectSkillsTemplates(templateRoot);
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
  dryRun = false
}) {
  const existingManifest = await readManifest(targetDir);
  const templates = await loadProjectSkillsTemplates(templateRoot);
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
    if (file.installedHash && currentHash !== file.installedHash) {
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
  const templates = await loadPluginTemplates(pluginRoot);
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
    if (tracked.installedHash && currentHash !== tracked.installedHash) {
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
