import path from "node:path";
import { pathExists, readText, writeText } from "./fs.js";

export const MANIFEST_PATH = ".codex-kit/manifest.json";
export const MCP_CONFIG_PATH = ".codex/config.toml";

function normalizePath(filePath) {
  return filePath.split(path.sep).join("/");
}

function canonicalizeFile(file) {
  const normalizedPath = normalizePath(file.path);
  return {
    ...file,
    path: normalizedPath,
    target: normalizedPath === MCP_CONFIG_PATH ? "mcp" : file.target
  };
}

function preferSaferEntry(current, candidate) {
  const currentUnmanaged = current.status === "unmanaged" || !current.installedHash;
  const candidateUnmanaged = candidate.status === "unmanaged" || !candidate.installedHash;
  if (currentUnmanaged !== candidateUnmanaged) {
    return candidateUnmanaged ? candidate : current;
  }
  return candidate;
}

export function normalizeManifest(manifest) {
  const files = [];
  const byKey = new Map();
  for (const rawFile of Array.isArray(manifest?.files) ? manifest.files : []) {
    const file = canonicalizeFile(rawFile);
    const key = file.path === MCP_CONFIG_PATH ? file.path : `${file.target}:${file.path}`;
    if (byKey.has(key)) {
      const previousIndex = byKey.get(key);
      files[previousIndex] = preferSaferEntry(files[previousIndex], file);
    } else {
      byKey.set(key, files.length);
      files.push(file);
    }
  }
  files.sort((a, b) => a.target.localeCompare(b.target) || a.path.localeCompare(b.path));

  const targets = {};
  for (const file of files) {
    if (!targets[file.target]) {
      targets[file.target] = { files: [] };
    }
    targets[file.target].files.push(file.path);
  }

  return { ...manifest, targets, files };
}

export function replaceManifestFilePath(manifest, fromPath, toPath, target) {
  if (!manifest) {
    return manifest;
  }
  const normalizedFrom = normalizePath(fromPath);
  const normalizedTo = normalizePath(toPath);
  const source = (manifest.files || []).find(
    (file) => normalizePath(file.path) === normalizedFrom
  );
  if (!source) {
    return normalizeManifest(manifest);
  }
  const files = (manifest.files || []).filter((file) => {
    const filePath = normalizePath(file.path);
    return filePath !== normalizedFrom && filePath !== normalizedTo;
  });
  files.push({ ...source, path: normalizedTo, target });
  return normalizeManifest({ ...manifest, files });
}

export function upsertManifestFile(manifest, entry, version) {
  const normalizedEntry = canonicalizeFile(entry);
  const files = (manifest?.files || []).filter(
    (file) => normalizePath(file.path) !== normalizedEntry.path
  );
  files.push(normalizedEntry);
  return normalizeManifest({
    ...(manifest || {}),
    version: manifest?.version || version,
    managedAt: new Date().toISOString(),
    features: manifest?.features || {},
    files
  });
}

export async function readManifest(targetDir) {
  const manifestPath = path.join(targetDir, MANIFEST_PATH);
  if (!(await pathExists(manifestPath))) {
    return null;
  }
  return JSON.parse(await readText(manifestPath));
}

export async function writeManifest(targetDir, manifest) {
  const manifestPath = path.join(targetDir, MANIFEST_PATH);
  await writeText(manifestPath, JSON.stringify(normalizeManifest(manifest), null, 2) + "\n");
}
