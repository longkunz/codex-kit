import { mkdir, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  initProject,
  installProjectHooks,
  installLocalSkills,
  installProjectSkills,
  installWorkspacePlugin,
  listInstalledLocalSkills,
  removeLocalSkills,
  statusProject,
  statusWorkspacePlugin,
  syncProjectHooks,
  syncLocalSkills,
  syncProjectSkills,
  syncWorkspacePlugin,
  updateProject
} from "./lib/kit.js";
import {
  getSelectedShippedSkills,
  groupSkillsByCategory,
  searchShippedSkills
} from "./lib/skills.js";
import {
  installManagedMcp,
  statusManagedMcp,
  syncManagedMcp
} from "./lib/mcp.js";
import {
  installLocalMemories,
  statusLocalMemories
} from "./lib/memories.js";
import { runAutoskills } from "./lib/autoskills.js";
import { runDoctor } from "./lib/doctor.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageJsonPath = path.resolve(__dirname, "../package.json");

function printHelp() {
  console.log(`Usage: codex-kit <command> [options]

Primary commands:
  init
            Install the Codex Kit scaffold into the target project
  install
            Same as \`init\`; installs the Codex Kit scaffold into the target project
  install --target plugin
            Install only the Codex Kit workspace plugin into the target project
  install --target mcp
            Install the shipped MCP bundle into the project \`.codex/config.toml\`
  install --target skills
            Install only the shipped Codex Kit project skills into the target project
  install --target skills --scope local
            Install shipped Codex Kit skills into local Codex
  install --target mcp --scope local
            Install the shipped MCP bundle into \`\${CODEX_HOME}/config.toml\`
  install --target memories --scope local
            Enable Codex memories in local Codex config only
  update
            Refresh scaffold-managed files in the target project
  sync --target plugin
            Sync the Codex Kit workspace plugin in the target project
  sync --target mcp
            Sync the shipped MCP bundle in the project \`.codex/config.toml\`
  sync --target skills
            Sync the shipped Codex Kit project skills in the target project
  sync --target skills --scope local
            Overwrite local Codex skills with the shipped Codex Kit version
  sync --target mcp --scope local
            Sync the shipped MCP bundle in \`\${CODEX_HOME}/config.toml\`
  list --target skills
            List shipped Codex Kit skills grouped by category
  list --target skills --scope local
            List shipped Codex Kit skills currently installed in local Codex
  list --target plugin
            Show workspace plugin status for the target project
  list --target mcp
            Show shipped MCP bundle status for project or local Codex config
  remove --target skills --scope local --skills <list>
            Remove specific Codex Kit skills from local Codex

Dedicated mixed-scope commands:
  setup-codex
            Scaffold the workspace plugin and install shipped skills locally
  setup-codex --enable-memories
            Also enable local Codex memories after showing opt-in intent
  sync-codex
            Sync the workspace plugin and local shipped skills after upgrading Codex Kit
  autoskills
            Auto-detect the project stack and install matching shipped skills
  autoskills --scope local
            Install matching shipped skills into local Codex (\`\${CODEX_HOME}/skills\`)
  autoskills --dry-run
            Preview the detected stack and matching skills without writing files
  status
            Show scaffold-managed file status for the target project
  doctor
            Validate Codex Kit project health
  doctor --json
            Print machine-readable validation results
  doctor --fix
            Safely repair rules-path and manifest tracking issues
  doctor --hooks
            Show hook-related doctor checks

Legacy aliases:
  sync --target project
  update
  list-skills
  search-skills <query>
  list-installed-skills
  install-skills
  sync-skills
  remove-skills

Options:
  --target <name>   Command target: project, plugin, mcp, skills, hooks, or memories
  --scope <name>    Scope: project (default) or local
  --query <text>    Search query for \`list --target skills\`
  --path <dir>      Target directory (default: current working directory)
  --codex-home <dir>
                    Codex home directory for local skill installation
  --skills <list>   Comma-separated skill names for install/sync/remove
  --install-plugin  Legacy option for \`init\` or \`update\`
  --include-hooks   Install project hooks during \`init\` or \`install --target project\`
  --enable-memories Enable local Codex memories for \`setup-codex\`
  --force           Overwrite existing or locally modified managed files
  --dry-run         Preview file operations without writing
  --json            Print JSON output where supported
  --strict          Treat warnings as failures for \`doctor\`
  --fix             Apply safe repairs for \`doctor\`
  --quiet           Suppress non-essential output
  -h, --help        Show this help
`);
}

function parseArgs(argv) {
  const [command, ...rest] = argv;
  const options = {
    command: command === "-h" || command === "--help" ? undefined : command,
    force: false,
    dryRun: false,
    quiet: false,
    installPlugin: false,
    includeHooks: false,
    enableMemories: false,
    json: false,
    strict: false,
    fix: false,
    doctorSections: [],
    codexHome: process.env.CODEX_HOME || path.join(os.homedir(), ".codex"),
    skills: [],
    positionals: [],
    path: process.cwd(),
    target: undefined,
    scope: undefined,
    query: undefined
  };

  for (let index = 0; index < rest.length; index += 1) {
    const arg = rest[index];
    if (arg === "--force") {
      options.force = true;
    } else if (arg === "--install-plugin") {
      options.installPlugin = true;
    } else if (arg === "--include-hooks") {
      options.includeHooks = true;
    } else if (arg === "--enable-memories") {
      options.enableMemories = true;
    } else if (arg === "--dry-run") {
      options.dryRun = true;
    } else if (arg === "--json") {
      options.json = true;
    } else if (arg === "--strict") {
      options.strict = true;
    } else if (arg === "--fix") {
      options.fix = true;
    } else if (["--hooks", "--plugin", "--memories"].includes(arg)) {
      options.doctorSections.push(arg.slice(2));
    } else if (arg === "--quiet") {
      options.quiet = true;
    } else if (arg === "--skills") {
      const value = rest[index + 1];
      if (!value) {
        throw new Error("Missing value for --skills");
      }
      options.skills = value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      index += 1;
    } else if (arg === "--codex-home") {
      const value = rest[index + 1];
      if (!value) {
        throw new Error("Missing value for --codex-home");
      }
      options.codexHome = path.resolve(value);
      index += 1;
    } else if (arg === "--path") {
      const value = rest[index + 1];
      if (!value) {
        throw new Error("Missing value for --path");
      }
      options.path = path.resolve(value);
      index += 1;
    } else if (arg === "--target") {
      const value = rest[index + 1];
      if (!value) {
        throw new Error("Missing value for --target");
      }
      options.target = value.trim();
      index += 1;
    } else if (arg === "--scope") {
      const value = rest[index + 1];
      if (!value) {
        throw new Error("Missing value for --scope");
      }
      options.scope = value.trim();
      index += 1;
    } else if (arg === "--query") {
      const value = rest[index + 1];
      if (!value) {
        throw new Error("Missing value for --query");
      }
      options.query = value;
      index += 1;
    } else if (arg === "-h" || arg === "--help") {
      options.help = true;
    } else {
      if (arg.startsWith("-")) {
        throw new Error(`Unknown option: ${arg}`);
      }
      options.positionals.push(arg);
    }
  }

  return options;
}

function buildOperation(action, options, overrides = {}) {
  return {
    action,
    target: overrides.target,
    scope: overrides.scope ?? options.scope ?? "project",
    query: overrides.query ?? options.query,
    skills: options.skills,
    path: options.path,
    codexHome: options.codexHome,
    force: options.force,
    dryRun: options.dryRun,
    quiet: options.quiet,
    installPlugin: overrides.installPlugin ?? false,
    includeHooks: overrides.includeHooks ?? options.includeHooks ?? false,
    enableMemories: overrides.enableMemories ?? options.enableMemories ?? false,
    json: options.json,
    strict: options.strict,
    fix: options.fix,
    doctorSections: options.doctorSections,
    positionals: options.positionals
  };
}

function normalizeOperation(options) {
  switch (options.command) {
    case "install":
      return buildOperation("install", options, { target: options.target || "project" });
    case "sync":
    case "list":
    case "remove":
      return buildOperation(options.command, options, { target: options.target });
    case "init":
      return buildOperation("install", options, {
        target: "project",
        scope: "project",
        installPlugin: options.installPlugin,
        includeHooks: options.includeHooks
      });
    case "update":
      return buildOperation("sync", options, {
        target: "project",
        scope: "project",
        installPlugin: options.installPlugin
      });
    case "install-skills":
      return buildOperation("install", options, { target: "skills", scope: "local" });
    case "sync-skills":
      return buildOperation("sync", options, { target: "skills", scope: "local" });
    case "remove-skills":
      return buildOperation("remove", options, { target: "skills", scope: "local" });
    case "list-skills":
      return buildOperation("list", options, { target: "skills", scope: "project" });
    case "search-skills": {
      const query = options.positionals.join(" ").trim();
      if (!query) {
        throw new Error("`search-skills` requires a search query.");
      }
      return buildOperation("list", options, {
        target: "skills",
        scope: "project",
        query
      });
    }
    case "list-installed-skills":
      return buildOperation("list", options, { target: "skills", scope: "local" });
    case "setup-codex":
      return buildOperation("setup-codex", options);
    case "sync-codex":
      return buildOperation("sync-codex", options);
    case "autoskills":
      return buildOperation("autoskills", options, {
        scope: options.scope || "project"
      });
    case "status":
      return buildOperation("status", options);
    case "doctor":
      return buildOperation("doctor", options);
    default:
      throw new Error(`Unknown command: ${options.command}`);
  }
}

function validateOperation(operation) {
  const normalizedTarget = operation.target?.trim();
  const normalizedScope = operation.scope?.trim() || "project";
  const validTargets = new Set(["project", "plugin", "mcp", "skills", "hooks", "memories"]);
  const validScopes = new Set(["project", "local"]);

  operation.target = normalizedTarget;
  operation.scope = normalizedScope;

  if (["install", "sync", "list", "remove"].includes(operation.action)) {
    if (!operation.target || !validTargets.has(operation.target)) {
      throw new Error("`--target` must be one of: project, plugin, mcp, skills, hooks, memories.");
    }
    if (!validScopes.has(operation.scope)) {
      throw new Error("`--scope` must be either `project` or `local`.");
    }
  }

  if (operation.positionals.length > 0 && operation.action !== "list") {
    throw new Error(`Unexpected positional arguments: ${operation.positionals.join(" ")}`);
  }

  if (
    operation.action === "list" &&
    operation.positionals.length > 0 &&
    !operation.query
  ) {
    throw new Error("Use `--query <text>` with `list --target skills` instead of positional text.");
  }

  if (operation.target === "skills") {
    if (operation.action === "remove" && operation.scope !== "local") {
      throw new Error("`remove --target skills` currently supports only `--scope local`.");
    }
    if (operation.action === "list" && operation.scope === "local" && operation.query) {
      throw new Error("`list --target skills --scope local` does not support `--query`.");
    }
    if (
      ["install", "sync"].includes(operation.action) &&
      operation.scope === "project" &&
      operation.skills.length > 0
    ) {
      throw new Error(
        `\`${operation.action} --target skills\` installs the full project skill bundle. Use \`--scope local --skills ...\` for targeted local skill installs.`
      );
    }
  }

  if ((operation.target === "plugin" || operation.target === "project") && operation.scope !== "project") {
    throw new Error(`\`${operation.target}\` only supports \`--scope project\`.`);
  }

  if (operation.target === "hooks" && operation.scope !== "project") {
    throw new Error("`hooks` only supports `--scope project`.");
  }

  if (operation.target === "hooks" && !["install", "sync"].includes(operation.action)) {
    throw new Error("`hooks` currently supports only `install` and `sync`.");
  }

  if (operation.target === "memories" && operation.scope !== "local") {
    throw new Error("`memories` only supports `--scope local`.");
  }

  if (operation.target === "memories" && !["install", "list"].includes(operation.action)) {
    throw new Error("`memories` currently supports only `install --scope local` and `list --scope local`.");
  }

  if (operation.target === "project" && operation.query) {
    throw new Error("`--query` is only supported with `list --target skills`.");
  }

  if (operation.target === "plugin" && operation.query) {
    throw new Error("`--query` is only supported with `list --target skills`.");
  }

  if (operation.target === "mcp" && operation.query) {
    throw new Error("`--query` is only supported with `list --target skills`.");
  }

  if (operation.action === "remove" && operation.target !== "skills") {
    throw new Error("`remove` currently supports only `--target skills --scope local`.");
  }

  if (operation.action === "remove" && operation.target === "skills" && operation.skills.length === 0) {
    throw new Error("`remove --target skills --scope local` requires `--skills <name[,name...]>`.");
  }
}

async function getPackageVersion() {
  const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8"));
  return packageJson.version;
}

function printCatalog(skills, installCommandPrefix) {
  const grouped = groupSkillsByCategory(skills);

  console.log(`Project scope: shipped Codex Kit skills: ${skills.length}`);
  for (const group of grouped) {
    console.log(`\n${group.category}`);
    for (const skill of group.skills) {
      console.log(`  - ${skill.name}: ${skill.summary}`);
      console.log(`    install: ${installCommandPrefix} ${skill.name}`);
    }
  }
}

function printSearchResults(query, skills, installCommandPrefix) {
  if (skills.length === 0) {
    console.log(`No shipped skills matched "${query}".`);
    return;
  }

  console.log(`Project scope: matches for "${query}": ${skills.length}`);
  for (const skill of skills) {
    console.log(`\n- ${skill.name} [${skill.category}]`);
    console.log(`  ${skill.summary}`);
    console.log(`  install: ${installCommandPrefix} ${skill.name}`);
  }
}

export async function runCli(argv) {
  const options = parseArgs(argv);
  if (!options.command || options.help) {
    printHelp();
    return;
  }

  const operation = normalizeOperation(options);
  validateOperation(operation);

  const version = await getPackageVersion();
  const templateRoot = path.resolve(__dirname, "../templates/project");
  const skillsRoot = path.resolve(templateRoot, ".agents/skills");
  const hookRoot = path.resolve(__dirname, "../templates/hooks");
  const pluginRoot = path.resolve(__dirname, "../plugins/codex-kit");
  const localInstallCommand = "codex-kit install --target skills --scope local --skills";

  await mkdir(operation.path, { recursive: true });

  if (operation.action === "doctor") {
    const result = await runDoctor({
      targetDir: operation.path,
      templateRoot,
      pluginRoot,
      hookRoot,
      codexHome: operation.codexHome,
      version,
      fix: operation.fix
    });
    if (operation.doctorSections.length > 0) {
      const sections = new Set(operation.doctorSections);
      result.checks = result.checks.filter(
        (check) => sections.has(check.target) || sections.has(check.name)
      );
      result.summary = {
        ok: result.checks.filter((check) => check.status === "ok").length,
        warn: result.checks.filter((check) => check.status === "warn").length,
        fail: result.checks.filter((check) => check.status === "fail").length
      };
    }

    const hasFailure = result.summary.fail > 0 || (operation.strict && result.summary.warn > 0);
    process.exitCode = hasFailure ? 1 : 0;

    if (operation.json) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    console.log("Codex Kit Doctor");
    console.log("");
    for (const check of result.checks) {
      const label = check.status === "ok" ? "OK" : check.status === "warn" ? "WARN" : "FAIL";
      console.log(`[${label}] ${check.message}`);
    }
    console.log("");
    console.log(`Summary: ${result.summary.ok} ok, ${result.summary.warn} warn, ${result.summary.fail} fail`);
    if (result.summary.fail > 0) {
      console.log("Run `codex-kit doctor --fix` to apply safe repairs where possible.");
    }
    return;
  }

  if (operation.action === "install" && operation.target === "project") {
    const result = await initProject({
      targetDir: operation.path,
      templateRoot,
      pluginRoot,
      version,
      installPlugin: operation.installPlugin,
      force: operation.force,
      dryRun: operation.dryRun
    });
    let hooksResult = null;
    if (operation.includeHooks) {
      hooksResult = await installProjectHooks({
        targetDir: operation.path,
        hookRoot,
        version,
        force: operation.force,
        dryRun: operation.dryRun
      });
    }
    if (!operation.quiet) {
      console.log(
        operation.dryRun
          ? `Project scope: planned ${result.written.length + (hooksResult?.written.length || 0)} file writes in ${operation.path}`
          : `Project scope: installed Codex Kit scaffold into ${operation.path}`
      );
      if (result.skipped.length > 0) {
        console.log(`Project scope: skipped ${result.skipped.length} existing files`);
      }
      if (hooksResult?.skipped.length > 0) {
        console.log(`Project scope: skipped ${hooksResult.skipped.length} existing hook files`);
      }
      for (const warning of result.warnings || []) {
        console.log(`Project scope: warning: ${warning}`);
      }
      if (hooksResult) {
        console.log(
          operation.dryRun
            ? "Project scope: planned Codex hooks install"
            : "Project scope: installed Codex hooks"
        );
      }
      if (result.pluginInstalled) {
        console.log(
          operation.dryRun
            ? "Project scope: planned Codex Kit workspace plugin install"
            : "Project scope: installed Codex Kit workspace plugin"
        );
      }
    }
    return;
  }

  if (operation.action === "sync" && operation.target === "project") {
    const result = await updateProject({
      targetDir: operation.path,
      templateRoot,
      pluginRoot,
      version,
      installPlugin: operation.installPlugin,
      force: operation.force,
      dryRun: operation.dryRun
    });
    if (!operation.quiet) {
      console.log(
        operation.dryRun
          ? `Project scope: planned ${result.written.length} file updates in ${operation.path}`
          : `Project scope: synced Codex Kit scaffold in ${operation.path}`
      );
      if (result.skipped.length > 0) {
        console.log(`Project scope: skipped ${result.skipped.length} locally modified files`);
      }
      for (const warning of result.warnings || []) {
        console.log(`Project scope: warning: ${warning}`);
      }
      if (result.pluginInstalled) {
        console.log(
          operation.dryRun
            ? "Project scope: planned Codex Kit workspace plugin sync"
            : "Project scope: synced Codex Kit workspace plugin"
        );
      }
    }
    return;
  }

  if (operation.action === "install" && operation.target === "plugin") {
    const result = await installWorkspacePlugin({
      targetDir: operation.path,
      pluginRoot,
      version,
      force: operation.force,
      dryRun: operation.dryRun
    });
    if (!operation.quiet) {
      console.log(
        operation.dryRun
          ? `Project scope: planned ${result.written.length} workspace plugin file writes in ${operation.path}`
          : `Project scope: installed Codex Kit workspace plugin into ${operation.path}`
      );
      if (result.skipped.length > 0) {
        console.log(`Project scope: skipped ${result.skipped.length} existing plugin files`);
      }
    }
    return;
  }

  if (operation.action === "install" && operation.target === "mcp") {
    const result = await installManagedMcp({
      targetDir: operation.path,
      scope: operation.scope,
      codexHome: operation.codexHome,
      dryRun: operation.dryRun
    });
    if (!operation.quiet) {
      console.log(
        operation.dryRun
          ? `${operation.scope === "local" ? "Local" : "Project"} scope: planned MCP config update in ${result.configPath}`
          : `${operation.scope === "local" ? "Local" : "Project"} scope: installed Codex Kit MCP bundle into ${result.configPath}`
      );
    }
    return;
  }

  if (operation.action === "install" && operation.target === "memories") {
    const result = await installLocalMemories({
      codexHome: operation.codexHome,
      dryRun: operation.dryRun
    });
    if (!operation.quiet) {
      console.log(
        operation.dryRun
          ? `Local scope: planned memories config update in ${result.configPath}`
          : `Local scope: enabled Codex memories in ${result.configPath}`
      );
      console.log("Local scope: memories are opt-in, user-local, and no project memory content was written.");
    }
    return;
  }

  if (operation.action === "install" && operation.target === "hooks") {
    const result = await installProjectHooks({
      targetDir: operation.path,
      hookRoot,
      version,
      force: operation.force,
      dryRun: operation.dryRun
    });
    if (!operation.quiet) {
      console.log(
        operation.dryRun
          ? `Project scope: planned ${result.written.length} hook file writes in ${operation.path}`
          : `Project scope: installed Codex hooks into ${operation.path}`
      );
      if (result.skipped.length > 0) {
        console.log(`Project scope: skipped ${result.skipped.length} existing hook files`);
      }
    }
    return;
  }

  if (operation.action === "sync" && operation.target === "plugin") {
    const result = await syncWorkspacePlugin({
      targetDir: operation.path,
      pluginRoot,
      version,
      force: operation.force,
      dryRun: operation.dryRun
    });
    if (!operation.quiet) {
      console.log(
        operation.dryRun
          ? `Project scope: planned ${result.written.length} workspace plugin file syncs in ${operation.path}`
          : `Project scope: synced Codex Kit workspace plugin in ${operation.path}`
      );
      if (result.skipped.length > 0) {
        console.log(`Project scope: skipped ${result.skipped.length} locally modified plugin files`);
      }
    }
    return;
  }

  if (operation.action === "sync" && operation.target === "mcp") {
    const result = await syncManagedMcp({
      targetDir: operation.path,
      scope: operation.scope,
      codexHome: operation.codexHome,
      dryRun: operation.dryRun
    });
    if (!operation.quiet) {
      console.log(
        operation.dryRun
          ? `${operation.scope === "local" ? "Local" : "Project"} scope: planned MCP config sync in ${result.configPath}`
          : `${operation.scope === "local" ? "Local" : "Project"} scope: synced Codex Kit MCP bundle in ${result.configPath}`
      );
    }
    return;
  }

  if (operation.action === "sync" && operation.target === "hooks") {
    const result = await syncProjectHooks({
      targetDir: operation.path,
      hookRoot,
      version,
      force: operation.force,
      dryRun: operation.dryRun
    });
    if (!operation.quiet) {
      console.log(
        operation.dryRun
          ? `Project scope: planned ${result.written.length} hook file syncs in ${operation.path}`
          : `Project scope: synced Codex hooks in ${operation.path}`
      );
      if (result.skipped.length > 0) {
        console.log(`Project scope: skipped ${result.skipped.length} locally modified hook files`);
      }
    }
    return;
  }

  if (operation.action === "list" && operation.target === "plugin") {
    const result = await statusWorkspacePlugin({
      targetDir: operation.path,
      pluginRoot,
      version
    });
    console.log(`Project scope: workspace plugin installed: ${result.pluginInstalled ? "yes" : "no"}`);
    console.log(`Project scope: tracked plugin files: ${result.managedCount}`);
    console.log(`Project scope: missing plugin files: ${result.missing.length}`);
    console.log(`Project scope: modified plugin files: ${result.modified.length}`);
    console.log(`Project scope: outdated plugin files: ${result.outdated.length}`);
    if (result.missing.length > 0) {
      console.log("\nMissing:");
      for (const file of result.missing) {
        console.log(`  - ${file}`);
      }
    }
    if (result.modified.length > 0) {
      console.log("\nModified:");
      for (const file of result.modified) {
        console.log(`  - ${file}`);
      }
    }
    if (result.outdated.length > 0) {
      console.log("\nOutdated:");
      for (const file of result.outdated) {
        console.log(`  - ${file}`);
      }
    }
    return;
  }

  if (operation.action === "list" && operation.target === "mcp") {
    const result = await statusManagedMcp({
      targetDir: operation.path,
      scope: operation.scope,
      codexHome: operation.codexHome
    });
    console.log(`${operation.scope === "local" ? "Local" : "Project"} scope: MCP config path ${result.configPath}`);
    console.log(`${operation.scope === "local" ? "Local" : "Project"} scope: shipped MCP bundle installed: ${result.installed ? "yes" : "no"}`);
    console.log(`${operation.scope === "local" ? "Local" : "Project"} scope: shipped servers present: ${result.servers.length}/${result.expectedServers.length}`);
    if (result.expectedServers.length > 0) {
      console.log(`Expected servers: ${result.expectedServers.join(", ")}`);
    }
    if (result.servers.length > 0) {
      console.log(`Installed servers: ${result.servers.join(", ")}`);
    }
    if (result.commentedServers?.length > 0) {
      console.log(`Commented examples: ${result.commentedServers.join(", ")}`);
    }
    return;
  }

  if (operation.action === "list" && operation.target === "memories") {
    const result = await statusLocalMemories({
      codexHome: operation.codexHome
    });
    console.log(`Local scope: memories config path ${result.configPath}`);
    console.log(`Local scope: memories enabled: ${result.enabled ? "yes" : "no"}`);
    return;
  }

  if (operation.action === "list" && operation.target === "skills" && operation.scope === "project") {
    if (operation.query) {
      const results = await searchShippedSkills({ skillsRoot, query: operation.query });
      printSearchResults(operation.query, results, localInstallCommand);
      return;
    }

    const skills = await getSelectedShippedSkills({ skillsRoot, skills: operation.skills });
    printCatalog(skills, localInstallCommand);
    return;
  }

  if (operation.action === "install" && operation.target === "skills" && operation.scope === "project") {
    const result = await installProjectSkills({
      targetDir: operation.path,
      templateRoot,
      version,
      force: operation.force,
      dryRun: operation.dryRun
    });
    if (!operation.quiet) {
      console.log(
        operation.dryRun
          ? `Project scope: planned ${result.written.length} project skill file writes in ${operation.path}`
          : `Project scope: installed Codex Kit project skills into ${operation.path}`
      );
      if (result.skipped.length > 0) {
        console.log(`Project scope: skipped ${result.skipped.length} existing project skill files`);
      }
    }
    return;
  }

  if (operation.action === "list" && operation.target === "skills" && operation.scope === "local") {
    const result = await listInstalledLocalSkills({
      skillsRoot,
      codexHome: operation.codexHome
    });
    const grouped = groupSkillsByCategory(result.installed);

    console.log(`Local scope: installed Codex Kit skills in ${result.targetRoot}: ${result.installed.length}`);
    if (result.installed.length === 0) {
      console.log("Local scope: no shipped Codex Kit skills are currently installed.");
      return;
    }

    for (const group of grouped) {
      console.log(`\n${group.category}`);
      for (const skill of group.skills) {
        console.log(`  - ${skill.name}: ${skill.summary}`);
      }
    }

    if (result.missing.length > 0) {
      console.log(`\nLocal scope: missing shipped skills: ${result.missing.length}`);
      console.log("  Run `codex-kit install --target skills --scope local` to install the full shipped catalog.");
    }
    return;
  }

  if (operation.action === "sync" && operation.target === "skills" && operation.scope === "project") {
    const result = await syncProjectSkills({
      targetDir: operation.path,
      templateRoot,
      version,
      force: operation.force,
      dryRun: operation.dryRun
    });
    if (!operation.quiet) {
      console.log(
        operation.dryRun
          ? `Project scope: planned ${result.written.length} project skill file syncs in ${operation.path}`
          : `Project scope: synced Codex Kit project skills in ${operation.path}`
      );
      if (result.skipped.length > 0) {
        console.log(`Project scope: skipped ${result.skipped.length} locally modified project skill files`);
      }
    }
    return;
  }

  if (operation.action === "install" && operation.target === "skills") {
    const result = await installLocalSkills({
      skillsRoot,
      codexHome: operation.codexHome,
      skills: operation.skills,
      force: operation.force,
      dryRun: operation.dryRun
    });
    if (!operation.quiet) {
      console.log(
        operation.dryRun
          ? `Local scope: planned ${result.written.length} skill file writes in ${result.targetDir}`
          : `Local scope: installed Codex Kit skills into ${result.targetDir}`
      );
      if (result.skipped.length > 0) {
        console.log(`Local scope: skipped ${result.skipped.length} existing skill files`);
      }
    }
    return;
  }

  if (operation.action === "sync" && operation.target === "skills") {
    const result = await syncLocalSkills({
      skillsRoot,
      codexHome: operation.codexHome,
      skills: operation.skills,
      dryRun: operation.dryRun
    });
    if (!operation.quiet) {
      console.log(
        operation.dryRun
          ? `Local scope: planned ${result.written.length} skill file syncs in ${result.targetDir}`
          : `Local scope: synced Codex Kit skills into ${result.targetDir}`
      );
    }
    return;
  }

  if (operation.action === "remove" && operation.target === "skills") {
    const result = await removeLocalSkills({
      skillsRoot,
      codexHome: operation.codexHome,
      skills: operation.skills,
      dryRun: operation.dryRun
    });
    if (!operation.quiet) {
      console.log(
        operation.dryRun
          ? `Local scope: planned removal of ${result.removed.length} skills from ${result.targetDir}`
          : `Local scope: removed ${result.removed.length} skills from ${result.targetDir}`
      );
      if (result.skipped.length > 0) {
        console.log(`Local scope: skipped ${result.skipped.length} missing skills`);
      }
    }
    return;
  }

  if (operation.action === "setup-codex") {
    const initResult = await initProject({
      targetDir: operation.path,
      templateRoot,
      pluginRoot,
      version,
      installPlugin: true,
      force: operation.force,
      dryRun: operation.dryRun
    });
    const skillsResult = await installLocalSkills({
      skillsRoot,
      codexHome: operation.codexHome,
      skills: operation.skills,
      force: operation.force,
      dryRun: operation.dryRun
    });
    const memoriesResult = operation.enableMemories
      ? await installLocalMemories({
          codexHome: operation.codexHome,
          dryRun: operation.dryRun
        })
      : null;

    if (!operation.quiet) {
      console.log(
        operation.dryRun
          ? `Planned Codex setup for ${operation.path}`
          : `Completed Codex setup for ${operation.path}`
      );
      console.log(
        operation.dryRun
          ? `Project scope: planned ${initResult.written.length} workspace file writes`
          : `Project scope: scaffold ready with workspace plugin support`
      );
      console.log(
        operation.dryRun
          ? `Local scope: planned ${skillsResult.written.length} skill file writes in ${skillsResult.targetDir}`
          : `Local scope: installed shipped skills into ${skillsResult.targetDir}`
      );
      if (memoriesResult) {
        console.log(
          operation.dryRun
            ? `Local scope: planned memories config update in ${memoriesResult.configPath}`
            : `Local scope: enabled Codex memories in ${memoriesResult.configPath}`
        );
        console.log("Local scope: memories are opt-in, user-local, and no project memory content was written.");
      }
      console.log("\nNext steps:");
      console.log(`  1. Open Codex in ${operation.path}`);
      console.log("  2. Open Plugins and choose `Codex Kit Local`.");
      console.log("  3. Click `+` on `Codex Kit` to install the workspace plugin.");
      console.log("  4. Start a new thread and use `@Codex Kit` or any installed local skills.");
    }
    return;
  }

  if (operation.action === "sync-codex") {
    const updateResult = await updateProject({
      targetDir: operation.path,
      templateRoot,
      pluginRoot,
      version,
      installPlugin: true,
      force: operation.force,
      dryRun: operation.dryRun
    });
    const skillsResult = await syncLocalSkills({
      skillsRoot,
      codexHome: operation.codexHome,
      skills: operation.skills,
      dryRun: operation.dryRun
    });

    if (!operation.quiet) {
      console.log(
        operation.dryRun
          ? `Planned Codex sync for ${operation.path}`
          : `Synced Codex setup for ${operation.path}`
      );
      console.log(
        operation.dryRun
          ? `Project scope: planned ${updateResult.written.length} workspace file updates`
          : "Project scope: scaffold and workspace plugin synced"
      );
      console.log(
        operation.dryRun
          ? `Local scope: planned ${skillsResult.written.length} skill file syncs in ${skillsResult.targetDir}`
          : `Local scope: shipped skills synced into ${skillsResult.targetDir}`
      );
      if (updateResult.skipped.length > 0) {
        console.log(`Project scope: skipped ${updateResult.skipped.length} locally modified workspace files`);
      }
    }
    return;
  }

  if (operation.action === "autoskills") {
    if (!["project", "local"].includes(operation.scope)) {
      throw new Error("`autoskills --scope` must be either `project` or `local`.");
    }

    const result = await runAutoskills({
      projectDir: operation.path,
      skillsRoot,
      codexHome: operation.codexHome,
      scope: operation.scope,
      dryRun: operation.dryRun,
      force: operation.force
    });

    if (operation.quiet) {
      return;
    }

    const scopeLabel = operation.scope === "local" ? "Local" : "Project";

    if (result.detected.length === 0 && !result.isFrontend) {
      console.log(`${scopeLabel} scope: no supported technologies detected in ${operation.path}.`);
      console.log("Run inside a project root with a recognizable stack (package.json, pyproject.toml, Cargo.toml, etc.).");
      return;
    }

    if (result.detected.length > 0) {
      console.log(`${scopeLabel} scope: detected technologies (${result.detected.length}):`);
      for (const tech of result.detected) {
        console.log(`  - ${tech.name}`);
      }
    } else if (result.isFrontend) {
      console.log(`${scopeLabel} scope: detected a generic web frontend project (from file extensions).`);
    }

    if (result.combos.length > 0) {
      console.log(`\n${scopeLabel} scope: detected combos (${result.combos.length}):`);
      for (const combo of result.combos) {
        console.log(`  - ${combo.name}`);
      }
    }

    if (result.skills.length === 0) {
      console.log(`\n${scopeLabel} scope: no matching shipped skills found for the detected stack.`);
      return;
    }

    console.log(`\n${scopeLabel} scope: matching shipped Codex Kit skills (${result.skills.length}):`);
    for (const skill of result.skills) {
      console.log(`  - ${skill.name} [${skill.category}]`);
      console.log(`      ← ${skill.sources.join(", ")}`);
    }

    if (result.unknown.length > 0) {
      console.log(`\n${scopeLabel} scope: skill names without a shipped match: ${result.unknown.join(", ")}`);
    }

    if (operation.dryRun) {
      console.log(`\n${scopeLabel} scope: --dry-run, nothing installed.`);
      console.log(`Would install into ${result.installTargetDir}`);
      return;
    }

    console.log(
      `\n${scopeLabel} scope: wrote ${result.totalWritten} skill files into ${result.installTargetDir}`
    );
    if (result.totalSkipped > 0) {
      console.log(`${scopeLabel} scope: skipped ${result.totalSkipped} existing skill files (use --force to overwrite)`);
    }
    return;
  }

  if (operation.action === "status") {
    const result = await statusProject({
      targetDir: operation.path,
      templateRoot,
      pluginRoot,
      version
    });
    console.log(`Project scope: version ${result.version}`);
    console.log(`Project scope: managed files ${result.managedCount}`);
    console.log(`Project scope: workspace plugin installed ${result.pluginInstalled ? "yes" : "no"}`);
    console.log(`Project scope: missing files ${result.missing.length}`);
    console.log(`Project scope: modified files ${result.modified.length}`);
    console.log(`Project scope: outdated files ${result.outdated.length}`);
    if (result.missing.length > 0) {
      console.log("\nMissing:");
      for (const file of result.missing) {
        console.log(`  - ${file}`);
      }
    }
    if (result.modified.length > 0) {
      console.log("\nModified:");
      for (const file of result.modified) {
        console.log(`  - ${file}`);
      }
    }
    if (result.outdated.length > 0) {
      console.log("\nOutdated:");
      for (const file of result.outdated) {
        console.log(`  - ${file}`);
      }
    }
    return;
  }

  throw new Error(`Unknown command: ${operation.action}`);
}
