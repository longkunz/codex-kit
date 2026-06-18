import path from "node:path";
import { pathExists, readText, writeText } from "./fs.js";
import { sha256 } from "./hash.js";
import {
  MCP_CONFIG_PATH,
  normalizeManifest,
  readManifest,
  upsertManifestFile,
  writeManifest
} from "./manifest.js";

const CONTEXT7_TABLE = "[mcp_servers.context7]";
const CONTEXT7_BLOCK = `[mcp_servers.context7]
url = "https://mcp.context7.com/mcp"
# For higher rate limits and private repositories, add your API key:
# http_headers = { "CONTEXT7_API_KEY" = "YOUR_API_KEY" }
# startup_timeout_sec = 10.0
# tool_timeout_sec = 60.0`;
const MYSQL_MARKER = "@benborla29/mcp-server-mysql";
const MYSQL_COMMENT_BLOCK = `# Example: MySQL MCP server (disabled until you uncomment and configure it)
# [mcp_servers.mysql]
# command = "npx"
# args = ["-y", "@benborla29/mcp-server-mysql"]
# env_vars = [
#   "MYSQL_HOST",
#   "MYSQL_PORT",
#   "MYSQL_USER",
#   "MYSQL_PASS",
#   "MYSQL_DB",
#   "MYSQL_SOCKET_PATH",
#   "MYSQL_CONNECTION_STRING",
#   "ALLOW_INSERT_OPERATION",
#   "ALLOW_UPDATE_OPERATION",
#   "ALLOW_DELETE_OPERATION",
#   "ALLOW_DDL_OPERATION",
#   "MYSQL_DISABLE_READ_ONLY_TRANSACTIONS",
#   "MYSQL_SSL",
#   "MYSQL_SSL_CA",
#   "MYSQL_SSL_CERT",
#   "MYSQL_SSL_KEY"
# ]
# startup_timeout_sec = 20.0
# tool_timeout_sec = 60.0
#
# Minimal read-only example:
# export MYSQL_HOST=127.0.0.1
# export MYSQL_PORT=3306
# export MYSQL_USER=root
# export MYSQL_PASS=your_password
# export MYSQL_DB=your_database`;

function normalizeNewlines(value) {
  return value.replace(/\r\n/g, "\n");
}

function upsertTomlTable(content, tableHeader, block) {
  const normalized = normalizeNewlines(content).trimEnd();
  const lines = normalized.length > 0 ? normalized.split("\n") : [];
  const startIndex = lines.findIndex((line) => line.trim() === tableHeader);

  if (startIndex === -1) {
    const prefix = normalized.length > 0 ? `${normalized}\n\n` : "";
    return `${prefix}${block}\n`;
  }

  let endIndex = lines.length;
  for (let index = startIndex + 1; index < lines.length; index += 1) {
    if (/^\[.+\]$/.test(lines[index].trim())) {
      endIndex = index;
      break;
    }
  }

  const nextLines = lines.slice(0, startIndex).concat(block.split("\n"), lines.slice(endIndex));
  return `${nextLines.join("\n").trimEnd()}\n`;
}

async function writeManagedMcpConfig({ configPath, dryRun = false }) {
  const current = (await pathExists(configPath)) ? await readText(configPath) : "";
  const withContext7 = upsertTomlTable(current, CONTEXT7_TABLE, CONTEXT7_BLOCK);
  const next = withContext7.includes(MYSQL_MARKER)
    ? withContext7.endsWith("\n")
      ? withContext7
      : `${withContext7}\n`
    : `${withContext7.trimEnd()}\n\n${MYSQL_COMMENT_BLOCK}\n`;

  if (!dryRun) {
    await writeText(configPath, next);
  }

  return {
    configPath,
    changed: normalizeNewlines(current) !== next,
    installedServers: ["context7"],
    commentedServers: ["mysql"]
  };
}

async function writeProjectMcpConfig({ targetDir, dryRun, version }) {
  const configPath = path.join(targetDir, MCP_CONFIG_PATH);
  const manifest = normalizeManifest((await readManifest(targetDir)) || { files: [] });
  const previous = manifest.files.find((file) => file.path === MCP_CONFIG_PATH);
  const existed = await pathExists(configPath);
  const beforeHash = existed ? sha256(await readText(configPath)) : null;
  const result = await writeManagedMcpConfig({ configPath, dryRun });

  if (!dryRun) {
    const currentHash = sha256(await readText(configPath));
    let entry;
    if (!existed || (previous?.installedHash && beforeHash === previous.installedHash)) {
      entry = {
        path: MCP_CONFIG_PATH,
        target: "mcp",
        status: "managed",
        templateHash: previous?.templateHash || currentHash,
        installedHash: currentHash
      };
    } else if (previous) {
      entry = { ...previous, path: MCP_CONFIG_PATH, target: "mcp" };
    } else {
      entry = {
        path: MCP_CONFIG_PATH,
        target: "mcp",
        status: "unmanaged",
        observedHash: beforeHash
      };
    }
    await writeManifest(targetDir, upsertManifestFile(manifest, entry, version));
  }

  return result;
}

export async function installManagedMcp({
  targetDir,
  scope = "project",
  codexHome,
  dryRun = false,
  version
}) {
  const configPath =
    scope === "local"
      ? path.join(codexHome, "config.toml")
      : path.join(targetDir, ".codex/config.toml");

  return scope === "local"
    ? writeManagedMcpConfig({ configPath, dryRun })
    : writeProjectMcpConfig({ targetDir, dryRun, version });
}

export async function syncManagedMcp({
  targetDir,
  scope = "project",
  codexHome,
  dryRun = false,
  version
}) {
  const configPath =
    scope === "local"
      ? path.join(codexHome, "config.toml")
      : path.join(targetDir, ".codex/config.toml");

  return scope === "local"
    ? writeManagedMcpConfig({ configPath, dryRun })
    : writeProjectMcpConfig({ targetDir, dryRun, version });
}

export async function statusManagedMcp({ targetDir, scope = "project", codexHome }) {
  const configPath =
    scope === "local"
      ? path.join(codexHome, "config.toml")
      : path.join(targetDir, ".codex/config.toml");

  if (!(await pathExists(configPath))) {
    return {
      configPath,
      installed: false,
      servers: [],
      expectedServers: ["context7"],
      commentedServers: []
    };
  }

  const content = normalizeNewlines(await readText(configPath));
  const hasContext7 = content.includes(CONTEXT7_TABLE);
  const hasMysqlComment = content.includes(MYSQL_MARKER);

  return {
    configPath,
    installed: hasContext7,
    servers: hasContext7 ? ["context7"] : [],
    expectedServers: ["context7"],
    commentedServers: hasMysqlComment ? ["mysql"] : []
  };
}
