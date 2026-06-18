import path from "node:path";
import { pathExists, readText, writeText } from "./fs.js";

const MEMORY_SETTINGS = {
  features: {
    memories: "true"
  },
  memories: {
    use_memories: "true",
    generate_memories: "true",
    disable_on_external_context: "true"
  }
};

function normalizeNewlines(value) {
  return value.replace(/\r\n/g, "\n");
}

function findTable(lines, tableName) {
  const header = `[${tableName}]`;
  const start = lines.findIndex((line) => line.trim() === header);
  if (start === -1) {
    return null;
  }

  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    if (/^\[[^\]]+\]$/.test(lines[index].trim())) {
      end = index;
      break;
    }
  }

  return { start, end };
}

function upsertTableValues(content, tableName, values) {
  const normalized = normalizeNewlines(content).trimEnd();
  const lines = normalized ? normalized.split("\n") : [];
  let range = findTable(lines, tableName);

  if (!range) {
    if (lines.length > 0) {
      lines.push("");
    }
    lines.push(`[${tableName}]`);
    range = { start: lines.length - 1, end: lines.length };
  }

  for (const [key, value] of Object.entries(values)) {
    const keyPattern = new RegExp(`^\\s*${key}\\s*=`);
    const existingIndex = lines
      .slice(range.start + 1, range.end)
      .findIndex((line) => keyPattern.test(line));

    if (existingIndex === -1) {
      lines.splice(range.end, 0, `${key} = ${value}`);
      range.end += 1;
    } else {
      lines[range.start + 1 + existingIndex] = `${key} = ${value}`;
    }
  }

  return `${lines.join("\n").trimEnd()}\n`;
}

function applyMemoryConfig(content) {
  let next = content;
  for (const [tableName, values] of Object.entries(MEMORY_SETTINGS)) {
    next = upsertTableValues(next, tableName, values);
  }
  return next;
}

function hasEnabledMemories(content) {
  const normalized = normalizeNewlines(content);
  return (
    /^\s*memories\s*=\s*true\s*$/m.test(normalized) &&
    /^\s*use_memories\s*=\s*true\s*$/m.test(normalized) &&
    /^\s*generate_memories\s*=\s*true\s*$/m.test(normalized) &&
    /^\s*disable_on_external_context\s*=\s*true\s*$/m.test(normalized)
  );
}

export async function installLocalMemories({ codexHome, dryRun = false }) {
  const configPath = path.join(codexHome, "config.toml");
  const current = (await pathExists(configPath)) ? await readText(configPath) : "";
  const next = applyMemoryConfig(current);

  if (!dryRun) {
    await writeText(configPath, next);
  }

  return {
    configPath,
    changed: normalizeNewlines(current) !== next,
    enabled: true
  };
}

export async function statusLocalMemories({ codexHome }) {
  const configPath = path.join(codexHome, "config.toml");
  if (!(await pathExists(configPath))) {
    return {
      configPath,
      enabled: false
    };
  }

  return {
    configPath,
    enabled: hasEnabledMemories(await readText(configPath))
  };
}
