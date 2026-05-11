import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { pathExists, writeText } from "./fs.js";
import {
  getSelectedShippedSkills,
  loadSkillTemplates
} from "./skills.js";

const SCAN_SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  "vendor",
  ".next",
  "dist",
  "build",
  ".output",
  ".nuxt",
  ".svelte-kit",
  "__pycache__",
  ".cache",
  "coverage",
  ".turbo",
  ".terraform",
  "var",
  "bin",
  "obj",
  ".vs",
  ".agents",
  ".codex",
  ".codex-kit",
  ".idea",
  ".vscode"
]);

const FRONTEND_PACKAGES = new Set([
  "react",
  "vue",
  "svelte",
  "astro",
  "next",
  "nuxt",
  "@angular/core",
  "@sveltejs/kit",
  "solid-js",
  "lit",
  "preact",
  "qwik"
]);

const WEB_FRONTEND_EXTENSIONS = new Set([
  ".html",
  ".htm",
  ".css",
  ".scss",
  ".sass",
  ".less",
  ".vue",
  ".svelte",
  ".jsx",
  ".tsx",
  ".astro"
]);

const FRONTEND_BONUS_SKILLS = [
  "frontend-design",
  "web-design-guidelines",
  "seo-fundamentals"
];

export const SKILLS_MAP = [
  {
    id: "react",
    name: "React",
    detect: { packages: ["react", "react-dom"] },
    skills: ["nextjs-react-expert", "frontend-design"]
  },
  {
    id: "nextjs",
    name: "Next.js",
    detect: {
      packages: ["next"],
      configFiles: ["next.config.js", "next.config.mjs", "next.config.ts", "next.config.cjs"]
    },
    skills: ["nextjs-react-expert", "seo-fundamentals"]
  },
  {
    id: "vue",
    name: "Vue",
    detect: { packages: ["vue"] },
    skills: ["frontend-design"]
  },
  {
    id: "nuxt",
    name: "Nuxt",
    detect: {
      packages: ["nuxt"],
      configFiles: ["nuxt.config.js", "nuxt.config.ts"]
    },
    skills: ["frontend-design", "seo-fundamentals"]
  },
  {
    id: "svelte",
    name: "Svelte",
    detect: {
      packages: ["svelte", "@sveltejs/kit"],
      configFiles: ["svelte.config.js"]
    },
    skills: ["frontend-design"]
  },
  {
    id: "angular",
    name: "Angular",
    detect: {
      packages: ["@angular/core"],
      configFiles: ["angular.json"]
    },
    skills: ["frontend-design", "architecture"]
  },
  {
    id: "astro",
    name: "Astro",
    detect: {
      packages: ["astro"],
      configFiles: ["astro.config.mjs", "astro.config.js", "astro.config.ts"]
    },
    skills: ["frontend-design", "seo-fundamentals"]
  },
  {
    id: "tailwind",
    name: "Tailwind CSS",
    detect: {
      packages: ["tailwindcss", "@tailwindcss/vite", "@tailwindcss/postcss"],
      configFiles: [
        "tailwind.config.js",
        "tailwind.config.ts",
        "tailwind.config.cjs",
        "tailwind.config.mjs"
      ]
    },
    skills: ["tailwind-patterns", "frontend-design"]
  },
  {
    id: "typescript",
    name: "TypeScript",
    detect: {
      packages: ["typescript"],
      configFiles: ["tsconfig.json"]
    },
    skills: ["lint-and-validate", "clean-code"]
  },
  {
    id: "react-native",
    name: "React Native",
    detect: { packages: ["react-native"] },
    skills: ["mobile-design", "frontend-design"]
  },
  {
    id: "expo",
    name: "Expo",
    detect: { packages: ["expo"] },
    skills: ["mobile-design"]
  },
  {
    id: "flutter",
    name: "Flutter",
    detect: {
      configFileContent: { files: ["pubspec.yaml"], patterns: ["flutter:"] }
    },
    skills: ["mobile-design"]
  },
  {
    id: "node",
    name: "Node.js",
    detect: {
      configFiles: [
        "package-lock.json",
        "yarn.lock",
        "pnpm-lock.yaml",
        ".nvmrc",
        ".node-version"
      ]
    },
    skills: ["nodejs-best-practices", "clean-code"]
  },
  {
    id: "express",
    name: "Express",
    detect: { packages: ["express"] },
    skills: ["api-patterns", "nodejs-best-practices"]
  },
  {
    id: "fastify",
    name: "Fastify",
    detect: { packages: ["fastify"] },
    skills: ["api-patterns", "nodejs-best-practices"]
  },
  {
    id: "hono",
    name: "Hono",
    detect: { packages: ["hono"] },
    skills: ["api-patterns", "nodejs-best-practices"]
  },
  {
    id: "nestjs",
    name: "NestJS",
    detect: { packages: ["@nestjs/core"] },
    skills: ["api-patterns", "nodejs-best-practices", "architecture"]
  },
  {
    id: "python",
    name: "Python",
    detect: {
      configFiles: ["pyproject.toml", "requirements.txt", "setup.py", "setup.cfg", "Pipfile"]
    },
    skills: ["python-patterns", "clean-code"]
  },
  {
    id: "fastapi",
    name: "FastAPI",
    detect: {
      configFileContent: {
        files: ["pyproject.toml", "requirements.txt", "Pipfile", "setup.py", "setup.cfg"],
        patterns: ["fastapi", "FastAPI"]
      }
    },
    skills: ["python-patterns", "api-patterns"]
  },
  {
    id: "django",
    name: "Django",
    detect: {
      configFiles: ["manage.py"],
      configFileContent: {
        files: ["pyproject.toml", "requirements.txt", "Pipfile", "setup.py", "setup.cfg"],
        patterns: ["django", "Django"]
      }
    },
    skills: ["python-patterns", "api-patterns", "architecture"]
  },
  {
    id: "flask",
    name: "Flask",
    detect: {
      configFileContent: {
        files: ["pyproject.toml", "requirements.txt", "Pipfile", "setup.py", "setup.cfg"],
        patterns: ["flask", "Flask"]
      }
    },
    skills: ["python-patterns", "api-patterns"]
  },
  {
    id: "rust",
    name: "Rust",
    detect: { configFiles: ["Cargo.toml", "Cargo.lock"] },
    skills: ["rust-pro", "clean-code"]
  },
  {
    id: "go",
    name: "Go",
    detect: { configFiles: ["go.mod", "go.work"] },
    skills: ["api-patterns", "clean-code"]
  },
  {
    id: "prisma",
    name: "Prisma",
    detect: {
      packages: ["prisma", "@prisma/client"],
      configFiles: ["prisma/schema.prisma"]
    },
    skills: ["database-design"]
  },
  {
    id: "drizzle",
    name: "Drizzle ORM",
    detect: { packages: ["drizzle-orm", "drizzle-kit"] },
    skills: ["database-design"]
  },
  {
    id: "typeorm",
    name: "TypeORM",
    detect: { packages: ["typeorm"] },
    skills: ["database-design"]
  },
  {
    id: "sequelize",
    name: "Sequelize",
    detect: { packages: ["sequelize"] },
    skills: ["database-design"]
  },
  {
    id: "mongoose",
    name: "Mongoose",
    detect: { packages: ["mongoose"] },
    skills: ["database-design"]
  },
  {
    id: "supabase",
    name: "Supabase",
    detect: { packages: ["@supabase/supabase-js", "@supabase/ssr"] },
    skills: ["database-design", "api-patterns"]
  },
  {
    id: "sqlalchemy",
    name: "SQLAlchemy",
    detect: {
      configFileContent: {
        files: ["pyproject.toml", "requirements.txt", "Pipfile", "setup.py", "setup.cfg"],
        patterns: ["sqlalchemy", "SQLAlchemy"]
      }
    },
    skills: ["database-design", "python-patterns"]
  },
  {
    id: "playwright",
    name: "Playwright",
    detect: {
      packages: ["@playwright/test", "playwright"],
      configFiles: [
        "playwright.config.ts",
        "playwright.config.js",
        "playwright.config.mjs"
      ]
    },
    skills: ["webapp-testing", "testing-patterns"]
  },
  {
    id: "cypress",
    name: "Cypress",
    detect: {
      packages: ["cypress"],
      configFiles: ["cypress.config.ts", "cypress.config.js"]
    },
    skills: ["webapp-testing", "testing-patterns"]
  },
  {
    id: "vitest",
    name: "Vitest",
    detect: {
      packages: ["vitest"],
      configFiles: ["vitest.config.ts", "vitest.config.js", "vitest.config.mts"]
    },
    skills: ["testing-patterns", "tdd-workflow"]
  },
  {
    id: "jest",
    name: "Jest",
    detect: {
      packages: ["jest", "@jest/core"],
      configFiles: ["jest.config.js", "jest.config.ts", "jest.config.mjs"]
    },
    skills: ["testing-patterns", "tdd-workflow"]
  },
  {
    id: "mocha",
    name: "Mocha",
    detect: { packages: ["mocha"] },
    skills: ["testing-patterns", "tdd-workflow"]
  },
  {
    id: "pytest",
    name: "pytest",
    detect: {
      configFileContent: {
        files: ["pyproject.toml", "requirements.txt", "Pipfile", "setup.py", "setup.cfg"],
        patterns: ["pytest"]
      }
    },
    skills: ["testing-patterns", "tdd-workflow"]
  },
  {
    id: "eslint",
    name: "ESLint",
    detect: {
      packages: ["eslint"],
      configFiles: [
        ".eslintrc",
        ".eslintrc.js",
        ".eslintrc.cjs",
        ".eslintrc.json",
        ".eslintrc.yaml",
        ".eslintrc.yml",
        "eslint.config.js",
        "eslint.config.mjs",
        "eslint.config.ts"
      ]
    },
    skills: ["lint-and-validate"]
  },
  {
    id: "prettier",
    name: "Prettier",
    detect: {
      packages: ["prettier"],
      configFiles: [
        ".prettierrc",
        ".prettierrc.json",
        ".prettierrc.js",
        ".prettierrc.cjs",
        "prettier.config.js",
        "prettier.config.mjs"
      ]
    },
    skills: ["lint-and-validate"]
  },
  {
    id: "biome",
    name: "Biome",
    detect: {
      packages: ["@biomejs/biome"],
      configFiles: ["biome.json", "biome.jsonc"]
    },
    skills: ["lint-and-validate"]
  },
  {
    id: "vercel",
    name: "Vercel",
    detect: {
      packages: ["vercel", "@astrojs/vercel"],
      configFiles: ["vercel.json", ".vercel"]
    },
    skills: ["deployment-procedures"]
  },
  {
    id: "cloudflare",
    name: "Cloudflare",
    detect: {
      packages: ["wrangler", "@cloudflare/workers-types", "@astrojs/cloudflare"],
      configFiles: ["wrangler.toml", "wrangler.json", "wrangler.jsonc"]
    },
    skills: ["deployment-procedures"]
  },
  {
    id: "docker",
    name: "Docker",
    detect: {
      configFiles: [
        "Dockerfile",
        "docker-compose.yml",
        "docker-compose.yaml",
        "compose.yml",
        "compose.yaml"
      ]
    },
    skills: ["deployment-procedures", "server-management"]
  },
  {
    id: "terraform",
    name: "Terraform",
    detect: {
      configFiles: [
        ".terraform.lock.hcl",
        "terraform.tfvars",
        "main.tf",
        "variables.tf",
        "outputs.tf"
      ]
    },
    skills: ["deployment-procedures", "server-management"]
  },
  {
    id: "kubernetes",
    name: "Kubernetes",
    detect: {
      configFiles: [
        "kustomization.yaml",
        "kustomization.yml",
        "skaffold.yaml",
        "helmfile.yaml",
        "Chart.yaml"
      ]
    },
    skills: ["server-management", "deployment-procedures"]
  },
  {
    id: "mcp",
    name: "MCP",
    detect: {
      packages: [
        "@modelcontextprotocol/sdk",
        "@modelcontextprotocol/server"
      ],
      packagePatterns: [/^@modelcontextprotocol\//]
    },
    skills: ["mcp-builder", "mcp-onboarding"]
  },
  {
    id: "i18n",
    name: "i18n",
    detect: {
      packages: [
        "i18next",
        "next-intl",
        "react-i18next",
        "vue-i18n",
        "@nuxtjs/i18n",
        "@formatjs/intl",
        "react-intl"
      ]
    },
    skills: ["i18n-localization"]
  },
  {
    id: "threejs",
    name: "Three.js",
    detect: { packages: ["three", "@react-three/fiber", "@react-three/drei"] },
    skills: ["game-development", "frontend-design", "performance-profiling"]
  },
  {
    id: "phaser",
    name: "Phaser",
    detect: { packages: ["phaser"] },
    skills: ["game-development"]
  },
  {
    id: "bash",
    name: "Bash",
    detect: { fileExtensions: [".sh", ".bash"] },
    skills: ["bash-linux"]
  },
  {
    id: "powershell",
    name: "PowerShell",
    detect: { fileExtensions: [".ps1"] },
    skills: ["powershell-windows"]
  }
];

export const COMBO_SKILLS_MAP = [
  {
    id: "react-tailwind",
    name: "React + Tailwind CSS",
    requires: ["react", "tailwind"],
    skills: ["tailwind-patterns", "nextjs-react-expert"]
  },
  {
    id: "nextjs-tailwind",
    name: "Next.js + Tailwind CSS",
    requires: ["nextjs", "tailwind"],
    skills: ["tailwind-patterns"]
  },
  {
    id: "nextjs-vercel",
    name: "Next.js + Vercel",
    requires: ["nextjs", "vercel"],
    skills: ["deployment-procedures"]
  },
  {
    id: "nextjs-playwright",
    name: "Next.js + Playwright",
    requires: ["nextjs", "playwright"],
    skills: ["webapp-testing"]
  },
  {
    id: "react-native-expo",
    name: "React Native + Expo",
    requires: ["react-native", "expo"],
    skills: ["mobile-design"]
  },
  {
    id: "fastapi-sqlalchemy",
    name: "FastAPI + SQLAlchemy",
    requires: ["fastapi", "sqlalchemy"],
    skills: ["database-design", "api-patterns"]
  },
  {
    id: "django-postgres",
    name: "Django stack",
    requires: ["django", "python"],
    skills: ["database-design"]
  },
  {
    id: "node-mcp",
    name: "Node.js MCP server",
    requires: ["node", "mcp"],
    skills: ["mcp-builder", "api-patterns"]
  }
];

function readPackageJson(dir) {
  try {
    return JSON.parse(readFileSync(path.join(dir, "package.json"), "utf8"));
  } catch {
    return null;
  }
}

function getAllPackageNames(pkg) {
  if (!pkg) return [];
  return [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
    ...Object.keys(pkg.peerDependencies || {}),
    ...Object.keys(pkg.optionalDependencies || {})
  ];
}

function hasFileWithExtension(projectDir, extensions, maxDepth = 4) {
  const normalized = new Set(
    extensions.map((ext) => (ext.startsWith(".") ? ext : `.${ext}`).toLowerCase())
  );

  function scan(dir, depth) {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return false;
    }

    for (const entry of entries) {
      if (entry.isFile()) {
        const lower = entry.name.toLowerCase();
        const idx = lower.lastIndexOf(".");
        if (idx !== -1 && normalized.has(lower.slice(idx))) {
          return true;
        }
      } else if (entry.isDirectory() && depth < maxDepth) {
        if (SCAN_SKIP_DIRS.has(entry.name) || entry.name.startsWith(".")) continue;
        if (scan(path.join(dir, entry.name), depth + 1)) return true;
      }
    }

    return false;
  }

  return scan(projectDir, 0);
}

function hasWebFrontendFiles(projectDir, maxDepth = 3) {
  function scan(dir, depth) {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return false;
    }

    for (const entry of entries) {
      if (entry.isFile()) {
        const dot = entry.name.lastIndexOf(".");
        if (dot !== -1 && WEB_FRONTEND_EXTENSIONS.has(entry.name.slice(dot))) {
          return true;
        }
      } else if (entry.isDirectory() && depth < maxDepth) {
        if (SCAN_SKIP_DIRS.has(entry.name) || entry.name.startsWith(".")) continue;
        if (scan(path.join(dir, entry.name), depth + 1)) return true;
      }
    }

    return false;
  }

  return scan(projectDir, 0);
}

export function detectTechnologies(projectDir) {
  const pkg = readPackageJson(projectDir);
  const deps = getAllPackageNames(pkg);
  const depsSet = new Set(deps);

  const fileContentCache = new Map();
  const existsCache = new Map();
  const fileExtCache = new Map();

  function cachedExists(filePath) {
    if (existsCache.has(filePath)) return existsCache.get(filePath);
    const result = existsSync(filePath);
    existsCache.set(filePath, result);
    return result;
  }

  function cachedRead(filePath) {
    if (fileContentCache.has(filePath)) return fileContentCache.get(filePath);
    let content = null;
    try {
      content = readFileSync(filePath, "utf8");
    } catch {
      content = null;
    }
    fileContentCache.set(filePath, content);
    return content;
  }

  const detected = [];

  for (const tech of SKILLS_MAP) {
    let found = false;

    if (tech.detect.packages) {
      found = tech.detect.packages.some((name) => depsSet.has(name));
    }

    if (!found && tech.detect.packagePatterns) {
      found = tech.detect.packagePatterns.some((pattern) =>
        deps.some((dep) => pattern.test(dep))
      );
    }

    if (!found && tech.detect.configFiles) {
      found = tech.detect.configFiles.some((rel) =>
        cachedExists(path.join(projectDir, rel))
      );
    }

    if (!found && tech.detect.fileExtensions) {
      const key = tech.detect.fileExtensions.join("\0");
      if (!fileExtCache.has(key)) {
        fileExtCache.set(key, hasFileWithExtension(projectDir, tech.detect.fileExtensions));
      }
      found = fileExtCache.get(key);
    }

    if (!found && tech.detect.configFileContent) {
      const blocks = Array.isArray(tech.detect.configFileContent)
        ? tech.detect.configFileContent
        : [tech.detect.configFileContent];

      for (const block of blocks) {
        const files = block.files || [];
        for (const rel of files) {
          const content = cachedRead(path.join(projectDir, rel));
          if (content === null) continue;
          if (block.patterns.some((needle) => content.includes(needle))) {
            found = true;
            break;
          }
        }
        if (found) break;
      }
    }

    if (found) {
      detected.push(tech);
    }
  }

  const detectedIds = new Set(detected.map((tech) => tech.id));
  const isFrontendByPackages = deps.some((dep) => FRONTEND_PACKAGES.has(dep));
  const isFrontendByFiles = isFrontendByPackages ? false : hasWebFrontendFiles(projectDir);
  const isFrontend = isFrontendByPackages || isFrontendByFiles;

  const combos = COMBO_SKILLS_MAP.filter((combo) =>
    combo.requires.every((id) => detectedIds.has(id))
  );

  return { detected, combos, isFrontend };
}

export function collectSkillSelections({ detected, combos, isFrontend }) {
  const sourcesBySkill = new Map();

  function addSkill(name, source) {
    if (!sourcesBySkill.has(name)) {
      sourcesBySkill.set(name, []);
    }
    const list = sourcesBySkill.get(name);
    if (!list.includes(source)) {
      list.push(source);
    }
  }

  for (const tech of detected) {
    for (const skillName of tech.skills) {
      addSkill(skillName, tech.name);
    }
  }

  for (const combo of combos) {
    for (const skillName of combo.skills) {
      addSkill(skillName, combo.name);
    }
  }

  if (isFrontend) {
    for (const skillName of FRONTEND_BONUS_SKILLS) {
      addSkill(skillName, "Frontend");
    }
  }

  return [...sourcesBySkill.entries()].map(([name, sources]) => ({
    name,
    sources
  }));
}

async function writeProjectAutoSkillFiles({
  targetDir,
  skill,
  templates,
  force,
  dryRun
}) {
  const written = [];
  const skipped = [];

  for (const template of templates) {
    const projectRelative = path.join(".agents", "skills", template.relativePath);
    const destination = path.join(targetDir, projectRelative);
    const exists = await pathExists(destination);

    if (exists && !force) {
      skipped.push(projectRelative);
      continue;
    }

    if (!dryRun) {
      await writeText(destination, template.content);
    }

    written.push(projectRelative);
  }

  return { written, skipped, skillName: skill.name };
}

async function writeLocalAutoSkillFiles({
  targetDir,
  skill,
  templates,
  force,
  dryRun
}) {
  const written = [];
  const skipped = [];

  for (const template of templates) {
    const localRelative = path.join("skills", template.relativePath);
    const destination = path.join(targetDir, localRelative);
    const exists = await pathExists(destination);

    if (exists && !force) {
      skipped.push(localRelative);
      continue;
    }

    if (!dryRun) {
      await writeText(destination, template.content);
    }

    written.push(localRelative);
  }

  return { written, skipped, skillName: skill.name };
}

async function writeAutoskillsLock({ targetDir, payload, dryRun }) {
  if (dryRun) return;
  const lockPath = path.join(targetDir, ".codex-kit", "autoskills-lock.json");
  await writeText(lockPath, JSON.stringify(payload, null, 2) + "\n");
}

export async function runAutoskills({
  projectDir,
  skillsRoot,
  codexHome,
  scope = "project",
  dryRun = false,
  force = false
}) {
  const detection = detectTechnologies(projectDir);
  const selections = collectSkillSelections(detection);

  const catalog = await getSelectedShippedSkills({
    skillsRoot,
    skills: selections.map((entry) => entry.name)
  });
  const catalogByName = new Map(catalog.map((skill) => [skill.name, skill]));

  const recognized = [];
  const unknown = [];

  for (const entry of selections) {
    if (catalogByName.has(entry.name)) {
      const skill = catalogByName.get(entry.name);
      recognized.push({
        name: skill.name,
        category: skill.category,
        summary: skill.summary,
        sources: entry.sources
      });
    } else {
      unknown.push(entry.name);
    }
  }

  recognized.sort((a, b) => a.name.localeCompare(b.name));

  const installResults = [];
  const installTargetDir = scope === "local" ? codexHome : projectDir;

  for (const item of recognized) {
    const skill = catalogByName.get(item.name);
    const templates = await loadSkillTemplates(skill);

    if (scope === "local") {
      installResults.push(
        await writeLocalAutoSkillFiles({
          targetDir: codexHome,
          skill,
          templates,
          force,
          dryRun
        })
      );
    } else {
      installResults.push(
        await writeProjectAutoSkillFiles({
          targetDir: projectDir,
          skill,
          templates,
          force,
          dryRun
        })
      );
    }
  }

  const totalWritten = installResults.reduce(
    (count, result) => count + result.written.length,
    0
  );
  const totalSkipped = installResults.reduce(
    (count, result) => count + result.skipped.length,
    0
  );

  if (recognized.length > 0) {
    await writeAutoskillsLock({
      targetDir: projectDir,
      payload: {
        generatedAt: new Date().toISOString(),
        scope,
        installRoot:
          scope === "local"
            ? path.join(codexHome, "skills")
            : path.join(projectDir, ".agents", "skills"),
        detectedTechnologies: detection.detected.map((tech) => ({
          id: tech.id,
          name: tech.name
        })),
        combos: detection.combos.map((combo) => ({
          id: combo.id,
          name: combo.name
        })),
        isFrontend: detection.isFrontend,
        skills: recognized.map((entry) => ({
          name: entry.name,
          category: entry.category,
          sources: entry.sources
        }))
      },
      dryRun
    });
  }

  return {
    detected: detection.detected,
    combos: detection.combos,
    isFrontend: detection.isFrontend,
    skills: recognized,
    unknown,
    installResults,
    totalWritten,
    totalSkipped,
    installTargetDir:
      scope === "local"
        ? path.join(codexHome, "skills")
        : path.join(installTargetDir, ".agents", "skills")
  };
}
