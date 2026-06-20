import { readdir } from "node:fs/promises";
import path from "node:path";
import { pathExists, readText } from "./fs.js";
import { loadTemplateFiles } from "./templates.js";

export const SKILL_CATEGORIES = [
  "Planning & Routing",
  "Backend & Platform",
  "Frontend & UI",
  "Debugging & Review",
  "Testing & Validation",
  "Docs, Delivery & Operations",
  "Security, Performance & Discoverability",
  "Shell & Environment"
];

export const CANONICAL_CATALOG = [
  // CORE SKILLS
  { name: "planning", tier: "core", profiles: [], category: "Planning & Routing", summary: "Execution-ready planning with scope, risks, and acceptance criteria." },
  { name: "brainstorming", tier: "core", profiles: [], category: "Planning & Routing", summary: "Clarify scope and generate options before implementation." },
  { name: "repo-onboarding", tier: "core", profiles: [], category: "Planning & Routing", summary: "Fast map of an unfamiliar repository before making changes." },
  { name: "architecture", tier: "core", profiles: [], category: "Planning & Routing", summary: "Requirements, tradeoffs, ADRs, and system design decisions." },
  { name: "debugging", tier: "core", profiles: [], category: "Debugging & Review", summary: "Evidence-based debugging before changing code." },
  { name: "code-review", tier: "core", profiles: [], category: "Debugging & Review", summary: "Patch and branch review for correctness and regressions." },
  { name: "testing", tier: "core", profiles: [], category: "Testing & Validation", summary: "Unit, integration, and mocking strategies." },
  { name: "test-hardening", tier: "core", profiles: [], category: "Testing & Validation", summary: "Strengthen weak or flaky tests around critical behavior." },
  { name: "lint-and-validate", tier: "core", profiles: [], category: "Testing & Validation", summary: "Linting, type checks, formatting, and static validation." },
  { name: "documentation", tier: "core", profiles: [], category: "Docs, Delivery & Operations", summary: "Ship docs that match real product behavior and commands." },
  { name: "security-review", tier: "core", profiles: [], category: "Security, Performance & Discoverability", summary: "OWASP-aware vulnerability analysis and attack-surface review." },
  { name: "release-deployment", tier: "core", profiles: [], category: "Docs, Delivery & Operations", summary: "Safe deployment principles, verification, and rollback thinking." },
  { name: "api-patterns", tier: "core", profiles: [], category: "Backend & Platform", summary: "API design, response shapes, versioning, and protocol choices." },
  { name: "database-design", tier: "core", profiles: [], category: "Backend & Platform", summary: "Schema design, migrations, indexes, and query strategy." },
  { name: "frontend-design", tier: "core", profiles: [], category: "Frontend & UI", summary: "Web UI design systems, hierarchy, typography, and aesthetics." },
  { name: "tailwind-patterns", tier: "core", profiles: [], category: "Frontend & UI", summary: "Tailwind CSS v4 patterns, tokens, and utility architecture." },
  { name: "web-design-guidelines", tier: "core", profiles: [], category: "Frontend & UI", summary: "UI audits against structured web interface guidelines." },

  // OPTIONAL SKILLS
  { name: "app-builder", tier: "optional", profiles: ["scaffolding"], category: "Planning & Routing", summary: "New app scaffolding, stack selection, and project setup." },
  { name: "parallel-agents", tier: "optional", profiles: [], category: "Planning & Routing", summary: "Bounded delegation and parallel subagent coordination." },
  { name: "nodejs-best-practices", tier: "optional", profiles: ["backend-node"], category: "Backend & Platform", summary: "Node.js architecture, async patterns, and backend decision-making." },
  { name: "python-patterns", tier: "optional", profiles: ["backend-python"], category: "Backend & Platform", summary: "Python project structure, async choices, and framework direction." },
  { name: "rust-pro", tier: "optional", profiles: ["rust"], category: "Backend & Platform", summary: "Modern Rust systems work, async design, and performance." },
  { name: "mcp-builder", tier: "optional", profiles: ["mcp"], category: "Backend & Platform", summary: "Design principles for building MCP servers, tools, and resources." },
  { name: "mcp-onboarding", tier: "optional", profiles: ["mcp"], category: "Docs, Delivery & Operations", summary: "Evaluate, adopt, and roll out MCP servers safely." },
  { name: "mobile-design", tier: "optional", profiles: ["mobile"], category: "Frontend & UI", summary: "Touch-first UX, mobile patterns, and platform conventions." },
  { name: "nextjs-react-expert", tier: "optional", profiles: ["frontend-framework"], category: "Frontend & UI", summary: "React or Next.js architecture, rendering, and performance." },
  { name: "i18n-localization", tier: "optional", profiles: ["frontend-framework"], category: "Frontend & UI", summary: "Translations, locale files, RTL support, and hardcoded string checks." },
  { name: "game-development", tier: "optional", profiles: ["game"], category: "Frontend & UI", summary: "Game-project routing and platform-specific game skill selection." },
  { name: "red-team-tactics", tier: "optional", profiles: ["security-advanced"], category: "Security, Performance & Discoverability", summary: "Authorized adversary-emulation and defensive reporting patterns." },
  { name: "performance-profiling", tier: "optional", profiles: ["performance"], category: "Security, Performance & Discoverability", summary: "Measure-first profiling and performance optimization guidance." },
  { name: "seo-fundamentals", tier: "optional", profiles: ["discoverability"], category: "Security, Performance & Discoverability", summary: "Search visibility, E-E-A-T, and Core Web Vitals basics." },
  { name: "geo-fundamentals", tier: "optional", profiles: ["discoverability"], category: "Security, Performance & Discoverability", summary: "Optimization for AI search and citation engines." },
  { name: "server-management", tier: "optional", profiles: ["operations"], category: "Docs, Delivery & Operations", summary: "Operational process management, monitoring, and scaling decisions." },
  { name: "doc", tier: "optional", profiles: ["documents"], category: "Docs, Delivery & Operations", summary: "Work with .docx documents where formatting fidelity matters." },
  { name: "bash-linux", tier: "optional", profiles: ["operations"], category: "Shell & Environment", summary: "Bash and Linux command patterns for macOS or Linux." },
  { name: "powershell-windows", tier: "optional", profiles: ["operations"], category: "Shell & Environment", summary: "PowerShell patterns, pitfalls, and Windows shell syntax." },
  { name: "tdd-workflow", tier: "optional", profiles: ["tdd"], category: "Testing & Validation", summary: "RED-GREEN-REFACTOR test-driven development cycle." },
  { name: "webapp-testing", tier: "optional", profiles: ["frontend-framework"], category: "Testing & Validation", summary: "Browser testing, deep audits, and Playwright-style checks." }
];

const SUPPORTED_PROFILES = new Set([
  "backend-node", "backend-python", "rust", "frontend-framework",
  "mobile", "game", "mcp", "security-advanced", "performance",
  "operations", "discoverability", "documents", "tdd", "scaffolding"
]);

function validateCatalog(catalog) {
  const seenNames = new Set();
  
  for (const skill of catalog) {
    if (seenNames.has(skill.name)) {
      throw new Error(`Duplicate canonical name: ${skill.name}`);
    }
    seenNames.add(skill.name);

    if (skill.tier !== "core" && skill.tier !== "optional") {
      throw new Error(`Invalid tier for ${skill.name}: ${skill.tier}`);
    }

    if (skill.tier === "core" && skill.profiles.length > 0) {
      throw new Error(`Core skill ${skill.name} cannot be assigned to profiles`);
    }

    for (const profile of skill.profiles) {
      if (!SUPPORTED_PROFILES.has(profile)) {
        throw new Error(`Unsupported profile name '${profile}' in skill ${skill.name}`);
      }
    }
  }

  return catalog;
}

function sourceEntryForSkill(skillsRoot, name) {
  return name === "doc" ? path.join(skillsRoot, "doc.md") : path.join(skillsRoot, name);
}

function installRelativePathForSkill(name) {
  return name === "doc" ? "doc.md" : name;
}

function normalizeSkillName(value) {
  return value.trim().replace(/\\/g, "/").replace(/^\/+|\/+$/g, "").split("/")[0];
}

function buildSkillKeywords(skill) {
  return [
    skill.name,
    skill.summary,
    skill.category,
    ...skill.name.split("-"),
    ...skill.category.toLowerCase().split(/[^a-z0-9]+/i).filter(Boolean)
  ].join(" ").toLowerCase();
}

async function readFrontmatterDescription(filePath) {
  if (!(await pathExists(filePath))) {
    return null;
  }

  const content = await readText(filePath);
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) {
    return null;
  }

  const lines = match[1].split("\n");
  let collectingDescription = false;
  const collected = [];

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    if (/^[A-Za-z0-9_-]+:/.test(line) && !line.startsWith("description:")) {
      collectingDescription = false;
    }

    if (line.startsWith("description:")) {
      collectingDescription = true;
      collected.push(line.slice("description:".length).trim());
      continue;
    }

    if (collectingDescription && /^\s+/.test(rawLine)) {
      collected.push(line.trim());
    }
  }

  const description = collected.join(" ").replace(/\s+/g, " ").trim();
  return description || null;
}

export function normalizeSkillSelection(skills) {
  if (!skills || skills.length === 0) {
    return null;
  }

  return new Set(skills.map(normalizeSkillName).filter(Boolean));
}

export async function getShippedSkills(skillsRoot) {
  const catalog = validateCatalog(CANONICAL_CATALOG);
  const skills = [];

  for (const category of SKILL_CATEGORIES) {
    for (const metadata of catalog.filter((item) => item.category === category)) {
      const sourcePath = sourceEntryForSkill(skillsRoot, metadata.name);
      
      if (!(await pathExists(sourcePath))) {
        throw new Error(`Catalog entry missing source: ${metadata.name}`);
      }

      const descriptionSource = metadata.name === "doc" ? sourcePath : path.join(sourcePath, "SKILL.md");
      const description = (await readFrontmatterDescription(descriptionSource)) || metadata.summary;

      skills.push({
        ...metadata,
        description,
        keywords: buildSkillKeywords(metadata),
        sourcePath,
        installRelativePath: installRelativePathForSkill(metadata.name),
        kind: metadata.name === "doc" ? "file" : "directory"
      });
    }
  }

  return skills;
}

export function groupSkillsByCategory(skills) {
  return SKILL_CATEGORIES.map((category) => ({
    category,
    skills: skills.filter((skill) => skill.category === category)
  })).filter((group) => group.skills.length > 0);
}

export async function getSelectedShippedSkills({ skillsRoot, skills }) {
  const catalog = await getShippedSkills(skillsRoot);
  const selected = normalizeSkillSelection(skills);
  if (!selected) {
    return catalog;
  }

  return catalog.filter((skill) => selected.has(skill.name));
}

export async function getCoreSkills(skillsRoot) {
  const catalog = await getShippedSkills(skillsRoot);
  return catalog.filter((skill) => skill.tier === "core");
}

export async function getSkillsForProfile(skillsRoot, profileName) {
  const catalog = await getShippedSkills(skillsRoot);
  const profileSkills = catalog.filter((skill) => skill.profiles && skill.profiles.includes(profileName));
  if (profileSkills.length === 0) {
    throw new Error(`Unknown profile or no skills mapped: ${profileName}`);
  }
  const coreSkills = catalog.filter((skill) => skill.tier === "core");
  
  // Return unique combination of core and profile skills
  const combined = [...coreSkills, ...profileSkills];
  const uniqueNames = new Set();
  return combined.filter((skill) => {
    if (uniqueNames.has(skill.name)) return false;
    uniqueNames.add(skill.name);
    return true;
  });
}

export async function getSkillByName(skillsRoot, skillName) {
  const catalog = await getShippedSkills(skillsRoot);
  const match = catalog.find((skill) => skill.name === skillName);
  if (!match) {
    throw new Error(`Unknown skill: ${skillName}`);
  }
  return match;
}

export async function loadSkillTemplates(skill) {
  if (skill.kind === "file") {
    return [
      {
        relativePath: path.basename(skill.installRelativePath),
        content: await readText(skill.sourcePath)
      }
    ];
  }

  const templates = await loadTemplateFiles(skill.sourcePath);
  return templates.map((template) => ({
    relativePath: path.join(skill.installRelativePath, template.relativePath),
    content: template.content
  }));
}

export async function searchShippedSkills({ skillsRoot, query }) {
  if (!query) {
    return getShippedSkills(skillsRoot);
  }

  const catalog = await getShippedSkills(skillsRoot);
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);

  return catalog.filter((skill) => {
    return terms.every((term) => skill.keywords.includes(term));
  });
}

export async function getInstalledShippedSkills({ skillsRoot, codexHome }) {
  const targetRoot = path.join(codexHome, "skills");
  const catalog = await getShippedSkills(skillsRoot);
  const installed = [];
  const missing = [];

  for (const skill of catalog) {
    const installPath = path.join(targetRoot, skill.installRelativePath);
    const exists =
      skill.kind === "file"
        ? await pathExists(installPath)
        : await pathExists(path.join(installPath, "SKILL.md"));

    if (exists) {
      installed.push(skill);
    } else {
      missing.push(skill);
    }
  }

  return { targetRoot, installed, missing };
}

export async function inferInstalledProjectSkills(targetDir, skillsRoot) {
  const catalog = await getShippedSkills(skillsRoot);
  const installedRoot = path.join(targetDir, ".agents/skills");
  if (!(await pathExists(installedRoot))) {
    return [];
  }
  
  const entries = await readdir(installedRoot, { withFileTypes: true });
  const names = entries
    .filter((entry) => entry.isDirectory() || entry.name === "doc.md")
    .map((entry) => entry.name === "doc.md" ? "doc" : entry.name);
    
  return catalog.filter((skill) => names.includes(skill.name));
}
