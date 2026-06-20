export type DocBlock =
  | {
    id: string;
    title: string;
    body?: string[];
    bullets?: string[];
    code?: string;
  }
  | {
    id: string;
    title: string;
    body?: string[];
    bullets?: string[];
    code?: string;
    image: {
      src: string;
      alt: string;
      caption?: string;
    };
  }
  | {
    id: string;
    title: string;
    cards: Array<{
      title: string;
      description: string;
      value?: string;
    }>;
  };

export type DocPage = {
  slug: string;
  section: string;
  title: string;
  summary: string;
  intro: string[];
  blocks: DocBlock[];
};

export type DocSection = {
  title: string;
  pages: DocPage[];
};

export const repoUrl = "https://github.com/daominhhiep/codex-kit";

export const docSections: DocSection[] = [
  {
    title: "Getting Started",
    pages: [
      {
        slug: "introduction",
        section: "Getting Started",
        title: "Introduction",
        summary: "What Codex Kit is, what it installs, and how to read the docs.",
        intro: [
          "Codex Kit is a starter scaffold for repositories that want to work well with Codex from day one.",
          "It installs routing docs, a shipped skill catalog, workflow playbooks, focused subagents, project-scoped MCP config, and managed file tracking so teams do not have to rebuild the same operating layer in every repo."
        ],
        blocks: [
          {
            id: "what-is-codex-kit",
            title: "What Is Codex Kit?",
            body: [
              "At its core, Codex Kit is a repo structure that helps Codex decide what kind of task it is looking at, which workflow fits, which skills matter, and how much validation is appropriate before handoff.",
              "The scaffold itself is the product. The shipped skill catalog lives in `templates/project/.agents/skills`, and that directory should be treated as the source of truth."
            ]
          },
          {
            id: "what-is-included",
            title: "What's Included",
            cards: [
              {
                title: "16 Agents",
                value: "16",
                description:
                  "Focused subagent profiles in `.codex/agents` for planning, implementation, debugging, review, docs, performance, security, SEO, deploy, and testing."
              },
              {
                title: "42 Skills",
                value: "42",
                description:
                  "Reusable skill entries under `.agents/skills` covering frontend, backend, database, mobile, testing, security, SEO, GEO, MCP, and more."
              },
              {
                title: "15 Workflows",
                value: "15",
                description:
                  "Production-ready workflow playbooks for brainstorm, plan, create, debug, review, check, verify, deploy, ship, preview, status, test, orchestrate, and UI/UX work."
              }
            ]
          },
          {
            id: "how-to-use-docs",
            title: "How To Use The Docs",
            bullets: [
              "Start with Installation if you are setting up a new repository, then read Local Codex Setup if you want the plugin or skill catalog available in Codex itself.",
              "Read Agents, Skills, and Workflows to understand how the scaffold thinks about execution.",
              "Use the Guide section when you want examples for planning, implementation, debugging, testing, preview, and deployment.",
              "Use CLI Reference when you need exact commands and flags."
            ]
          }
        ]
      },
      {
        slug: "installation",
        section: "Getting Started",
        title: "Installation",
        summary: "Install the CLI and scaffold a repository that is ready for Codex.",
        intro: [
          "Codex Kit is published as `@longkunz/codex-kit`.",
          "You can run it with `npx`, install it globally, or point it at a target directory when you want to scaffold into a new folder."
        ],
        blocks: [
          {
            id: "quick-install",
            title: "Quick Install",
            code: `npx @longkunz/codex-kit init

npm install -g @longkunz/codex-kit
codex-kit init`
          },
          {
            id: "target-directory",
            title: "Initialize Into A Target Directory",
            code: `npx @longkunz/codex-kit init --path ./my-project`
          },
          {
            id: "written-layout",
            title: "Scaffold Layout",
            code: `AGENTS.md
ARCHITECTURE.md
AGENT_FLOW.md
.agents/
  skills/
  .shared/
  workflows/
.codex/
  config.toml
  agents/
codex/
  rules/
    default.rules
.codex-kit/
  manifest.json`
          },
          {
            id: "codex-rules",
            title: "Codex Rules",
            body: [
              "The scaffold also includes `codex/rules/default.rules`, a minimal execution-policy template based on the official Codex rules format.",
              "It prompts before dependency installs, `git push`, and Codex Kit commands that write into local Codex with `--scope local`.",
              "Keep behavioral guidance in `AGENTS.md`, skills, and workflows. Use `codex/rules/default.rules` only for command approval policy."
            ],
            code: `codex execpolicy check --pretty \\
  --rules ./codex/rules/default.rules \\
  -- git push origin main`
          },
          {
            id: "installation-notes",
            title: "Notes",
            bullets: [
              "Use `--force` only when you intentionally want to overwrite managed files.",
              "Use `--dry-run` to inspect changes before writing scaffold files.",
              "Use `status` and `update` after installation to keep managed files aligned with the current template version.",
              "Edit `codex/rules/default.rules` if your team wants a different approval posture.",
              "Read `Local Codex Setup` next if you want the plugin or skill catalog installed into Codex."
            ]
          }
        ]
      },
      {
        slug: "local-codex-setup",
        section: "Getting Started",
        title: "Local Codex Setup",
        summary: "Install the Codex Kit plugin or skill catalog into local Codex.",
        intro: [
          "Use this page after the base project scaffold is in place.",
          "It covers the two Codex-local integrations: the workspace plugin and the local skill catalog.",
          "These are different scopes: the plugin is project-local, while the skill catalog is user-local."
        ],
        blocks: [
          {
            id: "installation-scopes",
            title: "Installation Scopes",
            bullets: [
              "Project-local: `init` scaffolds the repository, while `install --target plugin` and `install --target skills` add only those parts into the current project.",
              "Project-local MCP: `install --target mcp` writes the shipped MCP bundle into `.codex/config.toml`.",
              "User-local: `install --target skills --scope local` copies the shipped skill catalog into `${CODEX_HOME:-~/.codex}/skills` for local Codex on the current machine.",
              "User-local MCP: `install --target mcp --scope local` writes the shipped MCP bundle into `${CODEX_HOME:-~/.codex}/config.toml`.",
              "Run both when you want a repository-specific plugin plus the full Codex Kit skill catalog available in local Codex.",
              "After upgrading Codex Kit, use `sync-codex` to sync both scopes with one command."
            ]
          },
          {
            id: "install-plugin",
            title: "Install The Plugin In Codex",
            body: [
              "Run `init` or plain `install` when you want the full project scaffold.",
              "Run `install --target plugin` when you only want the workspace plugin files in the current project. Codex Kit copies the plugin into `.agents/plugins/codex-kit` and creates `.agents/plugins/marketplace.json` with `installation: \"INSTALLED_BY_DEFAULT\"`.",
              "After that, open the `Plugins` view in Codex, choose the `Codex Kit Local` marketplace, and click the `+` button on `Codex Kit`.",
              "If you also want the full shipped skill catalog in local Codex, run the full setup command below."
            ],
            code: `npx @longkunz/codex-kit init
npx @longkunz/codex-kit install
npx @longkunz/codex-kit install --target plugin

npx @longkunz/codex-kit setup-codex
npx @longkunz/codex-kit sync-codex`,
            image: {
              src: "/codex-kit-plugin-install.png",
              alt: "Codex Plugin Directory showing the Codex Kit Local marketplace and the Codex Kit install card.",
              caption:
                "The local marketplace appears in the Plugin Directory after the project scaffold and workspace plugin are installed."
            }
          },
          {
            id: "plugin-install-steps",
            title: "Plugin Install Steps",
            bullets: [
              "Run `npx @longkunz/codex-kit init` or `npx @longkunz/codex-kit install` if the repository does not have the Codex Kit scaffold yet.",
              "Run `npx @longkunz/codex-kit install --target plugin` to add the workspace plugin files and marketplace entry.",
              "Restart Codex or reopen the workspace if the local marketplace is not visible yet.",
              "Open `Plugins` in the left sidebar.",
              "Switch the marketplace selector to `Codex Kit Local`.",
              "Find `Codex Kit` under `Developer Tools` and click `+` to install it.",
              "Start a new thread and invoke it with `@Codex Kit`."
            ]
          },
          {
            id: "project-skill-install",
            title: "Install Only The Project Skill Bundle",
            body: [
              "Run `install --target skills` when you only want the shipped project skills and shared skill assets copied into the current repository.",
              "This installs the project-local skill bundle under `.agents/skills` and `.agents/.shared` without touching local Codex."
            ],
            code: `npx @longkunz/codex-kit install --target skills

npx @longkunz/codex-kit sync --target skills`
          },
          {
            id: "mcp-install",
            title: "Install The MCP Bundle",
            body: [
              "Codex stores MCP configuration in `config.toml`, either in project scope at `.codex/config.toml` or in local scope at `${CODEX_HOME:-~/.codex}/config.toml`.",
              "Codex Kit ships a default MCP bundle based on the current project scaffold, including `context7` and a commented `mysql` example using `@benborla29/mcp-server-mysql`."
            ],
            code: `npx @longkunz/codex-kit install --target mcp

npx @longkunz/codex-kit install --target mcp --scope local
npx @longkunz/codex-kit sync --target mcp
npx @longkunz/codex-kit list --target mcp`
          },
          {
            id: "local-skill-install",
            title: "Install The Kit Skills Into Local Codex",
            body: [
              "Use `install --target skills --scope local` when you want the shipped Codex Kit skill catalog available in local Codex outside a single project workspace.",
              "By default, Codex Kit installs the skills into `${CODEX_HOME:-~/.codex}/skills`. Use `--codex-home` to override that location."
            ],
            code: `npx @longkunz/codex-kit install --target skills --scope local

npx @longkunz/codex-kit install --target skills --scope local --codex-home ~/.codex`,
            image: {
              src: "/codex-kit-skill-install.png",
              alt: "Codex interface showing the installed Codex Kit skills in local Codex.",
              caption:
                "Use `install --target skills --scope local` when you want the Codex Kit skill catalog available in local Codex outside a single workspace."
            }
          },
          {
            id: "local-skill-install-permissions",
            title: "Local Skill Install Permission Prompt",
            body: [
              "Installing into local Codex may require approval because the CLI writes into `${CODEX_HOME:-~/.codex}/skills`, which is typically outside the current workspace.",
              "This is especially relevant when you install a specific skill with `--skills` from inside a Codex thread."
            ],
            image: {
              src: "/codex-install-skill.png",
              alt: "Codex thread showing local skill install commands and the permission prompt for writing a skill into ~/.codex/skills.",
              caption:
                "A targeted install such as `install --target skills --scope local --skills frontend-design` can trigger a local permission prompt before Codex writes into the local skills directory."
            }
          },
          {
            id: "local-skill-maintenance",
            title: "Sync Or Remove Local Skills",
            body: [
              "Use `sync --target skills --scope local` to overwrite the local Codex copy with the current shipped version from Codex Kit.",
              "Use `--skills` when you want to install, sync, or remove only specific skill folders instead of the full catalog.",
              "`remove --target skills --scope local` requires `--skills` so the CLI does not remove the full local skill catalog by accident."
            ],
            code: `npx @longkunz/codex-kit sync --target skills --scope local

npx @longkunz/codex-kit install --target skills --scope local --skills ,planning
npx @longkunz/codex-kit sync --target skills --scope local --skills ,planning
npx @longkunz/codex-kit remove --target skills --scope local --skills ,planning`
          },
          {
            id: "skill-discovery",
            title: "Discover Available Skills",
            body: [
              "Use `list --target skills` to browse the full shipped catalog grouped by category.",
              "Use `list --target skills --query <text>` to find the right skill by domain, behavior, or keyword.",
              "Use `list --target skills --scope local` to compare what is already installed in local Codex.",
              "The bundled plugin can also map natural requests such as `cài skill frontend` or `liệt kê skills debug` to the right Codex Kit commands."
            ],
            code: `npx @longkunz/codex-kit list --target skills

npx @longkunz/codex-kit list --target skills --query frontend
npx @longkunz/codex-kit list --target skills --scope local`
          }
        ]
      }
    ]
  },
  {
    title: "Core Concepts",
    pages: [
      {
        slug: "agents",
        section: "Core Concepts",
        title: "Agents",
        summary: "Focused subagents with narrow responsibilities.",
        intro: [
          "Subagents live in `.codex/agents/*.toml` and are intentionally narrow so routing stays predictable.",
          "Codex Kit keeps responsibilities separate: agents own execution roles, skills own knowledge, and workflows own process."
        ],
        blocks: [
          {
            id: "agent-principles",
            title: "Agent Design Principles",
            bullets: [
              "Use focused subagents for bounded work instead of one broad parallel swarm.",
              "Prefer the narrowest agent that still matches the task.",
              "Pass skills explicitly when they matter instead of assuming the agent name is enough.",
              "Avoid parallelism when the result is needed immediately on the critical path."
            ]
          },
          {
            id: "agent-registry",
            title: "Shipped Agent Roles",
            cards: [
              {
                title: "planner",
                description: "Planning, sequencing, risks, and acceptance criteria."
              },
              {
                title: "explorer",
                description: "Read-only repository mapping and dependency tracing."
              },
              {
                title: "implementer",
                description: "Small, targeted code changes once the task is clear."
              },
              {
                title: "frontend-specialist",
                description: "UI, component architecture, accessibility, and frontend behavior."
              },
              {
                title: "backend-specialist",
                description: "APIs, validation, data access, and server-side logic."
              },
              {
                title: "database-architect",
                description: "Schemas, migrations, indexes, queries, and data integrity."
              },
              {
                title: "mobile-developer",
                description: "Mobile UX, platform conventions, and runtime performance."
              },
              {
                title: "debugger",
                description: "Reproduction, evidence gathering, and root-cause isolation."
              },
              {
                title: "reviewer",
                description: "Correctness, security, regressions, and missing tests."
              },
              {
                title: "test-writer",
                description: "Focused tests that prove intended behavior."
              },
              {
                title: "devops-engineer",
                description: "CI, environments, deployments, pipelines, and operations."
              },
              {
                title: "docs-researcher",
                description: "Read-only verification of framework and API behavior."
              },
              {
                title: "documentation-writer",
                description: "READMEs, setup guides, handoff notes, and technical docs."
              },
              {
                title: "performance-optimizer",
                description: "Profiling, bottleneck analysis, bundle size, and runtime speed."
              },
              {
                title: "security-auditor",
                description: "Threat review, auth flows, validation, and attack surface."
              },
              {
                title: "seo-specialist",
                description: "SEO, GEO, metadata, content structure, and citation readiness."
              }
            ]
          },
          {
            id: "agent-pairings",
            title: "Common Pairings",
            bullets: [
              "`planner` pairs well with `planning`, and `architecture`.",
              "`debugger` pairs well with `debugging`, and `testing`.",
              "`reviewer` pairs well with `code-review`, and `release-deployment`.",
              "`test-writer` pairs well with `testing`, `tdd-workflow`, and `webapp-testing`."
            ]
          }
        ]
      },
      {
        slug: "skills",
        section: "Core Concepts",
        title: "Skills",
        summary: "Reusable knowledge modules written in Codex `SKILL.md` format, grouped by category.",
        intro: [
          "Skills live in `.agents/skills/<name>/SKILL.md` and should stay narrow, explicit, and reusable across repositories.",
          "A skill can include `references/`, `scripts/`, and `assets/`, but it should never behave like hidden automation.",
          "The shipped catalog is grouped below by Skill Categories so you can find the right skill quickly."
        ],
        blocks: [
          {
            id: "skill-contract",
            title: "Skill Contract",
            bullets: [
              "Keep each skill narrow enough to be composable with other skills.",
              "Use `SKILL.md` for the instruction contract.",
              "Use `references/` for deeper examples or templates.",
              "Use `scripts/` only for optional helpers that should be suggested, not silently executed."
            ]
          },
          {
            id: "skill-categories-intro",
            title: "Skill Categories",
            body: [
              "48 shipped skills organized by domain."
            ]
          },
          {
            id: "skill-category-routing",
            title: "Planning & Routing",
            cards: [
              {
                title: "app-builder",
                description: "New app scaffolding, stack selection, and high-level project setup."
              },
              {
                title: "architecture",
                description: "Requirements, tradeoffs, ADRs, and system design decisions."
              },
              {
                title: "",
                description: "Explicit working modes such as brainstorm, implement, debug, or review."
              },
              {
                title: "brainstorming",
                description: "Clarify scope and generate options before implementation."
              },
              {
                title: "",
                description: "Choose the best specialist skills or subagents for a task."
              },
              {
                title: "parallel-agents",
                description: "Bounded delegation and parallel subagent coordination."
              },
              {
                title: "planning",
                description: "Written implementation plans, breakdowns, and checklists."
              },
              {
                title: "planning",
                description: "Execution-ready planning with scope, risks, and acceptance criteria."
              },
              {
                title: "repo-onboarding",
                description: "Fast map of an unfamiliar repository before making changes."
              }
            ]
          },
          {
            id: "skill-category-implementation",
            title: "Backend & Platform",
            cards: [
              {
                title: "",
                description: "Pragmatic coding standards and scoped implementation quality."
              },
              {
                title: "api-patterns",
                description: "API design, response shapes, versioning, and protocol choices."
              },
              {
                title: "database-design",
                description: "Schema design, migrations, indexes, and query strategy."
              },
              {
                title: "nodejs-best-practices",
                description: "Node.js architecture, async patterns, and backend decision-making."
              },
              {
                title: "python-patterns",
                description: "Python project structure, async choices, and framework direction."
              },
              {
                title: "rust-pro",
                description: "Modern Rust systems work, async design, and performance."
              },
              {
                title: "mcp-builder",
                description: "Design principles for building MCP servers, tools, and resources."
              }
            ]
          },
          {
            id: "skill-category-frontend",
            title: "Frontend & UI",
            cards: [
              {
                title: "frontend-design",
                description: "Web UI design systems, hierarchy, typography, and aesthetics."
              },
              {
                title: "mobile-design",
                description: "Touch-first UX, mobile patterns, and platform conventions."
              },
              {
                title: "nextjs-react-expert",
                description: "React or Next.js architecture, rendering, and performance."
              },
              {
                title: "tailwind-patterns",
                description: "Tailwind CSS v4 patterns, tokens, and utility architecture."
              },
              {
                title: "web-design-guidelines",
                description: "UI audits against structured web interface guidelines."
              },
              {
                title: "i18n-localization",
                description: "Translations, locale files, RTL support, and hardcoded string checks."
              },
              {
                title: "game-development",
                description: "Game-project routing and platform-specific game skill selection."
              }
            ]
          },
          {
            id: "skill-category-debug-review",
            title: "Debugging & Review",
            cards: [
              {
                title: "debugging",
                description: "Disciplined reproduction, scoping, and root-cause isolation."
              },
              {
                title: "debugging",
                description: "Evidence-based debugging before changing code."
              },
              {
                title: "debugging",
                description: "Structured 4-phase debugging with explicit hypotheses."
              },
              {
                title: "code-review",
                description: "Patch and branch review for correctness and regressions."
              },
              {
                title: "code-review",
                description: "Supplemental prompts and checks during code review."
              },
              {
                title: "code-review",
                description: "Findings-first review output focused on real risk."
              }
            ]
          },
          {
            id: "skill-category-testing",
            title: "Testing & Validation",
            cards: [
              {
                title: "lint-and-validate",
                description: "Linting, type checks, formatting, and static validation."
              },
              {
                title: "tdd-workflow",
                description: "RED-GREEN-REFACTOR test-driven development cycle."
              },
              {
                title: "test-hardening",
                description: "Strengthen weak or flaky tests around critical behavior."
              },
              {
                title: "testing",
                description: "Unit, integration, and mocking strategies."
              },
              {
                title: "webapp-testing",
                description: "Browser testing, deep audits, and Playwright-style checks."
              },
              {
                title: "release-deployment",
                description: "Higher-confidence validation for rollout and operational risk."
              }
            ]
          },
          {
            id: "skill-category-docs-ops",
            title: "Docs, Delivery & Operations",
            cards: [
              {
                title: "doc",
                description: "Work with `.docx` documents where formatting fidelity matters."
              },
              {
                title: "documentation",
                description: "Ship docs that match real product behavior and commands."
              },
              {
                title: "documentation",
                description: "README, API, and technical documentation structure guidance."
              },
              {
                title: "release-deployment",
                description: "Safe deployment principles, verification, and rollback thinking."
              },
              {
                title: "server-management",
                description: "Operational process management, monitoring, and scaling decisions."
              },
              {
                title: "mcp-onboarding",
                description: "Evaluate, adopt, and roll out MCP servers safely."
              }
            ]
          },
          {
            id: "skill-category-security-performance",
            title: "Security, Performance & Discoverability",
            cards: [
              {
                title: "security-review",
                description: "OWASP-aware vulnerability analysis and attack-surface review."
              },
              {
                title: "red-team-tactics",
                description: "Authorized adversary-emulation and defensive reporting patterns."
              },
              {
                title: "performance-profiling",
                description: "Measure-first profiling and performance optimization guidance."
              },
              {
                title: "seo-fundamentals",
                description: "Search visibility, E-E-A-T, and Core Web Vitals basics."
              },
              {
                title: "geo-fundamentals",
                description: "Optimization for AI search and citation engines."
              }
            ]
          },
          {
            id: "skill-category-shell",
            title: "Shell & Environment",
            cards: [
              {
                title: "bash-linux",
                description: "Bash and Linux command patterns for macOS or Linux."
              },
              {
                title: "powershell-windows",
                description: "PowerShell patterns, pitfalls, and Windows shell syntax."
              }
            ]
          },
          {
            id: "minimal-loading",
            title: "Minimal Loading Rule",
            body: [
              "The default rule is simple: load as little as you can while still doing good work.",
              "Choose the workflow first, then add only the skills that meaningfully improve the current task."
            ]
          },
          {
            id: "skill-structure",
            title: "Skill Structure",
            bullets: [
              "`SKILL.md`: the instruction contract and main entrypoint for the skill.",
              "`references/`: deeper examples, templates, or supporting guidance.",
              "`scripts/`: optional helpers that should be invoked deliberately, not silently.",
              "`assets/`: supporting files such as prompts, data, or media.",
              "`agents/openai.yaml`: optional invocation policy for skills that bundle deeper routing behavior.",
              "Some skills also include task-specific files such as `verify.md`, `handoff.md`, or checklists."
            ]
          }
        ]
      },
      {
        slug: "workflows",
        section: "Core Concepts",
        title: "Workflows",
        summary: "Process playbooks for common task types.",
        intro: [
          "Workflows live in `.agents/workflows/*.md` and describe repeatable ways to approach common tasks such as planning, implementation, debugging, review, testing, preview, and deployment.",
          "They encode process, not domain knowledge.",
          "A workflow is not a CLI command. In practice, you either let Codex route to it through `AGENTS.md` or you ask for it explicitly in your prompt."
        ],
        blocks: [
          {
            id: "workflow-selection",
            title: "Workflow Selection",
            body: [
              "Classify the request before loading extra skills or spawning subagents.",
              "Once the task shape is clear, choose the narrowest workflow that matches it."
            ]
          },
          {
            id: "workflow-invocation",
            title: "How To Invoke A Workflow",
            bullets: [
              "Let Codex route automatically from the request and the rules in `AGENTS.md`.",
              "Or name the workflow explicitly in your prompt, for example: `Use the plan workflow before making changes.`",
              "Use workflows as execution modes or playbooks, not as shell commands."
            ]
          },
          {
            id: "workflow-catalog",
            title: "Shipped Workflows",
            code: `brainstorm
check
create
debug
deploy
enhance
orchestrate
plan
preview
review
ship
status
test
ui-ux-pro-max
verify`
          },
          {
            id: "validation-tiers",
            title: "Validation Tiers",
            bullets: [
              "Use `check` for normal development and narrow changes.",
              "Use `verify` for release-sensitive, deployment-affecting, or cross-cutting work.",
              "Use `test` when test execution or test authoring is the main objective.",
              "Promote from `check` to `verify` when release risk is non-trivial or validation signal is weak."
            ]
          }
        ]
      }
    ]
  },
  {
    title: "Guide",
    pages: [
      {
        slug: "how-to-use-workflows",
        section: "Guide",
        title: "How To Use Workflows",
        summary: "Use workflows by naming the execution mode you want in your prompt.",
        intro: [
          "The easiest way to use a workflow is to state the workflow name in plain language.",
          "You do not run workflows from the CLI. You ask Codex to use them while working on the repository."
        ],
        blocks: [
          {
            id: "basic-pattern",
            title: "Basic Prompt Pattern",
            body: [
              "A simple pattern works well: describe the task, then name the workflow you want.",
              "Use direct prompts such as `Use the plan workflow before editing`, `Handle this as debug`, or `Do a review of the current branch`."
            ],
            code: `Use the plan workflow before making changes.
Use the debug workflow to isolate the root cause.
Use the review workflow on the current branch.`
          },
          {
            id: "workflow-cheatsheet",
            title: "When To Use Which Workflow",
            bullets: [
              "`brainstorm`: the request is still vague and you need options or tradeoffs.",
              "`plan`: you want a task breakdown before implementation.",
              "`create`: the request is concrete and ready to implement.",
              "`enhance`: you are extending or refining existing behavior.",
              "`debug`: there is a bug, regression, or unclear runtime behavior.",
              "`review`: you want findings on a patch, branch, or design.",
              "`check`: you want fast validation after a normal code change.",
              "`test`: the main task is writing or running tests.",
              "`verify`: the change is release-sensitive or cross-cutting.",
              "`preview`: you want to start, fix, or verify a local preview.",
              "`deploy`: you are preparing or executing a deployment.",
              "`status`: you want a concise snapshot of current repository state.",
              "`orchestrate`: multiple bounded subagents are justified.",
              "`ui-ux-pro-max`: the task is primarily UI direction or UX shaping."
            ]
          },
          {
            id: "copy-paste-examples",
            title: "Copy-Paste Examples",
            code: `Brainstorm 3 realistic approaches for adding auth to this app.

Use the plan workflow and break this change into concrete implementation steps.

Use create to implement this feature in the current repo.

Use debug to find the root cause of this failing login flow before changing code.

Use review on the current branch and focus on correctness, regressions, and missing tests.

Use verify before we ship this release candidate.`
          }
        ]
      },
      {
        slug: "structured-brainstorming",
        section: "Guide",
        title: "Structured Brainstorming",
        summary: "Use `brainstorm` when the request is still open-ended.",
        intro: [
          "The `brainstorm` workflow is for vague feature requests, strategy questions, and architecture exploration.",
          "Its job is to reduce ambiguity before implementation, not to start writing code too early."
        ],
        blocks: [
          {
            id: "when-to-use",
            title: "When To Use",
            bullets: [
              "The request is exploratory or under-specified.",
              "The user asks for options, recommendations, or tradeoffs.",
              "Architecture or product direction is still open."
            ]
          },
          {
            id: "recommended-process",
            title: "Recommended Process",
            bullets: [
              "Restate the goal, audience, and success criteria.",
              "Surface missing assumptions such as user type, constraints, non-goals, and timeline.",
              "Present 2 to 4 realistic options with advantages, drawbacks, and rough effort.",
              "Recommend one direction and end with the next decision required to move into `plan` or `create`."
            ]
          }
        ]
      },
      {
        slug: "project-planning",
        section: "Guide",
        title: "Project Planning",
        summary: "Use `plan` when you want an execution-ready plan before code changes.",
        intro: [
          "The `plan` workflow is for tasks where the user wants the shape of the work decided before implementation begins.",
          "A good plan is grounded in the real repository, ordered by dependency, and explicit about risks and validation."
        ],
        blocks: [
          {
            id: "planning-process",
            title: "Planning Process",
            bullets: [
              "Inspect the current code or repository layout first.",
              "Define target behavior, explicit non-goals, dependencies, and constraints.",
              "Break the work into sequenced implementation steps.",
              "Capture API, data, migration, and config changes.",
              "Define validation and acceptance criteria."
            ]
          }
        ]
      },
      {
        slug: "create-new-application",
        section: "Guide",
        title: "Create New Application",
        summary: "Use `create` for new features, scaffolding, and other structured implementation work.",
        intro: [
          "The `create` workflow turns a concrete request into the smallest defensible implementation that solves the problem.",
          "If the request is still fuzzy, step back to `brainstorm` or `plan` first."
        ],
        blocks: [
          {
            id: "entry-criteria",
            title: "Entry Criteria",
            bullets: [
              "The requested behavior is specific enough to implement.",
              "Obvious product ambiguities are resolved.",
              "Affected scope is understood from repository context."
            ]
          },
          {
            id: "create-process",
            title: "Implementation Process",
            bullets: [
              "Inspect the current code, interfaces, and affected paths.",
              "Identify the narrowest subagent and skills for the job.",
              "Implement in small defensible increments.",
              "Run `check` before presenting the result.",
              "Summarize changed behavior, validation, and remaining risks."
            ]
          }
        ]
      },
      {
        slug: "add-a-new-feature",
        section: "Guide",
        title: "Add A New Feature",
        summary: "A practical pattern for extending an existing codebase without drifting scope.",
        intro: [
          "For iterative work inside an existing repository, use `enhance` or `create` depending on how new the behavior really is.",
          "The key rule is to keep the change scoped to the confirmed problem and avoid silently inventing new product policy."
        ],
        blocks: [
          {
            id: "feature-pattern",
            title: "Suggested Pattern",
            bullets: [
              "Start with repository inspection and affected surface mapping.",
              "Choose one workflow and one primary subagent role.",
              "Load only the stack-relevant skills.",
              "Keep unrelated files untouched unless they are required dependencies.",
              "Run `check`, and escalate to `verify` if the feature crosses subsystem boundaries."
            ]
          }
        ]
      },
      {
        slug: "iterative-enhancement",
        section: "Guide",
        title: "Iterative Enhancement",
        summary: "Use `enhance` when the repository already has working patterns and you want to evolve existing behavior.",
        intro: [
          "The `enhance` workflow is for iterative work inside an existing application.",
          "Its job is to preserve the current system shape while making the requested change in the smallest sensible scope."
        ],
        blocks: [
          {
            id: "when-to-enhance",
            title: "When To Use",
            bullets: [
              "The codebase already has established architecture and conventions.",
              "You are extending or refining existing behavior rather than building from zero.",
              "You want to preserve current patterns unless there is a strong reason to change them."
            ]
          },
          {
            id: "enhance-process",
            title: "Suggested Process",
            bullets: [
              "Inspect the current implementation and feature boundary first.",
              "Confirm the affected files, contracts, and dependencies.",
              "Escalate to `plan` if the change is broader than it first appears.",
              "Implement incrementally and preserve existing conventions where reasonable.",
              "Run `check`, or `verify` if the change crosses multiple subsystems."
            ]
          }
        ]
      },
      {
        slug: "advanced-ui-design",
        section: "Guide",
        title: "Advanced UI Design",
        summary: "Use `ui-ux-pro-max` for design direction and implementation-aware UI work.",
        intro: [
          "The `ui-ux-pro-max` workflow is for UI planning, redesign work, and implementation-aware UX decisions.",
          "It is backed by the shared package in `.agents/.shared/ui-ux-pro-max/`."
        ],
        blocks: [
          {
            id: "design-sequence",
            title: "Suggested Sequence",
            bullets: [
              "Extract product type, audience, brand tone, platform, and content readiness.",
              "Run `--design-system` first when the request is broad enough to need a visual direction.",
              "Use one or two domain searches for deeper follow-up.",
              "Use `--stack` for implementation-specific guidance.",
              "Validate the result against usability and accessibility expectations."
            ]
          },
          {
            id: "ui-ux-commands",
            title: "Useful Commands",
            code: `python3 .agents/.shared/ui-ux-pro-max/scripts/search.py "saas dashboard" --design-system -p "Project Name"
python3 .agents/.shared/ui-ux-pro-max/scripts/search.py "dashboard layout" --stack react
python3 .agents/.shared/ui-ux-pro-max/scripts/search.py "fintech landing" --domain typography`
          }
        ]
      },
      {
        slug: "debugging",
        section: "Guide",
        title: "Systematic Debugging",
        summary: "Move from symptom to confirmed failure mode before changing code.",
        intro: [
          "The `debug` workflow exists for failures, regressions, and unclear runtime behavior.",
          "Its key rule is simple: do not jump straight to code changes."
        ],
        blocks: [
          {
            id: "debug-process",
            title: "Debug Process",
            bullets: [
              "Reproduce the issue or state why reproduction is blocked.",
              "Capture evidence such as logs, exact errors, failing tests, inputs, and expected vs actual behavior.",
              "Identify the failure boundary and rank hypotheses.",
              "Test hypotheses until the root cause is confirmed.",
              "Fix only after the failure mode is understood, then add or update tests."
            ]
          }
        ]
      },
      {
        slug: "test-generation",
        section: "Guide",
        title: "Test Generation",
        summary: "Add or run the smallest useful test scope with clear reporting.",
        intro: [
          "The `test` workflow is for targeted test creation, test execution, and coverage-driven validation.",
          "It should prove behavior with the smallest useful set of tests instead of broad rewrites."
        ],
        blocks: [
          {
            id: "test-priorities",
            title: "Testing Priorities",
            bullets: [
              "Happy path",
              "Error handling",
              "Edge cases",
              "Integration boundaries when they are part of the changed behavior"
            ]
          },
          {
            id: "test-rules",
            title: "Rules",
            bullets: [
              "Do not encode ambiguous product behavior into tests.",
              "Prefer targeted tests over sweeping test rewrites.",
              "If a failure is unexpected, pair the test workflow with `debug`."
            ]
          }
        ]
      },
      {
        slug: "review-workflow",
        section: "Guide",
        title: "Review Workflow",
        summary: "Use `review` to find correctness, regression, and rollout risks before code is relied on.",
        intro: [
          "The `review` workflow is for branch review, patch review, and design review.",
          "Its output should lead with findings, not style commentary."
        ],
        blocks: [
          {
            id: "review-focus",
            title: "What To Look For",
            bullets: [
              "Correctness issues",
              "Security problems",
              "Regression risk",
              "Missing tests",
              "Rollout or migration risk when relevant"
            ]
          },
          {
            id: "review-rules",
            title: "Rules",
            bullets: [
              "Map the affected code paths before judging the patch.",
              "Prioritize concrete findings over style feedback.",
              "Cite files, symbols, and reproduction hints where possible.",
              "If there are no findings, say so and mention residual risk or testing gaps."
            ]
          }
        ]
      },
      {
        slug: "check-and-verify",
        section: "Guide",
        title: "Check And Verify",
        summary: "Use `check` for fast validation and `verify` for higher-confidence release checks.",
        intro: [
          "These two workflows are validation tiers.",
          "Use `check` during normal development and promote to `verify` when the cost of failure is meaningfully higher."
        ],
        blocks: [
          {
            id: "check-vs-verify",
            title: "When To Use Each",
            bullets: [
              "`check`: normal code changes, small bug fixes, narrow refactors.",
              "`verify`: deployment-affecting changes, migrations, auth or billing work, and cross-cutting refactors.",
              "Promote from `check` to `verify` when validation signal is weak or release risk is non-trivial."
            ]
          },
          {
            id: "validation-output",
            title: "Expected Output",
            bullets: [
              "Commands run",
              "Result summary",
              "Anything skipped",
              "Release blockers or warnings for `verify`",
              "Residual risk if validation is partial"
            ]
          }
        ]
      },
      {
        slug: "preview-management",
        section: "Guide",
        title: "Preview Management",
        summary: "Start, restart, or verify a local preview server with minimal confusion.",
        intro: [
          "The `preview` workflow focuses on local preview startup, health checks, and developer-facing verification.",
          "It should make it easy to go from source changes to a working local URL."
        ],
        blocks: [
          {
            id: "preview-steps",
            title: "Preview Steps",
            bullets: [
              "Detect the preview command from repository context.",
              "Check whether a preview server is already running.",
              "Start, stop, restart, or verify the server as requested.",
              "Resolve port conflicts explicitly instead of guessing.",
              "Report the local URL and basic health status."
            ]
          }
        ]
      },
      {
        slug: "ship-handoffs",
        section: "Guide",
        title: "Ship Handoffs",
        summary: "Use `ship` to prepare a merge, release, or deployment handoff that is easy to act on.",
        intro: [
          "The `ship` workflow is for high-signal handoff notes after implementation and validation are done.",
          "It should make follow-through easy for whoever merges, releases, or operates the change."
        ],
        blocks: [
          {
            id: "ship-contents",
            title: "What To Include",
            bullets: [
              "What changed and why",
              "Validation performed",
              "Anything still unverified",
              "Rollout, migration, or config notes",
              "Rollback assumptions or follow-up items"
            ]
          }
        ]
      },
      {
        slug: "project-status",
        section: "Guide",
        title: "Project Status",
        summary: "Summarize repository state, active work, and validation status.",
        intro: [
          "The `status` workflow answers where the repository stands right now without making someone reread the whole project.",
          "It should summarize changed areas, validation state, blockers, and the next practical action."
        ],
        blocks: [
          {
            id: "status-checklist",
            title: "What To Include",
            bullets: [
              "Current task or feature area",
              "Changed files or major touched areas",
              "Validation that has and has not been run",
              "Preview or deployment state if relevant",
              "Pending work or known blockers"
            ]
          }
        ]
      },
      {
        slug: "multi-agent-orchestration",
        section: "Guide",
        title: "Multi-Agent Orchestration",
        summary: "Coordinate bounded subagent work without losing the main-thread plan.",
        intro: [
          "Use the `orchestrate` workflow only when the task genuinely benefits from multiple focused subagents.",
          "Parallelism should exist to unblock independent workstreams, not just because the task feels big."
        ],
        blocks: [
          {
            id: "orchestration-rules",
            title: "Rules",
            bullets: [
              "Define the immediate critical-path task that the main agent should own.",
              "Assign sidecar tasks only when they can proceed in parallel without stepping on the same write set.",
              "Pass enough context: request, relevant files, known decisions, and expected output.",
              "Continue non-overlapping local work while subagents run.",
              "Integrate returned results and run final validation."
            ]
          }
        ]
      },
      {
        slug: "production-deployment",
        section: "Guide",
        title: "Production Deployment",
        summary: "Move from ready code to a safe deployment with pre-flight checks and rollback awareness.",
        intro: [
          "The `deploy` workflow is for staging or production deployment preparation and execution.",
          "It should confirm environment targets, validation depth, secrets, packaging, smoke checks, and rollback paths."
        ],
        blocks: [
          {
            id: "deploy-modes",
            title: "Deployment Modes",
            bullets: [
              "`deploy check` for pre-flight only",
              "`deploy preview` for stage or preview deployment",
              "`deploy production` for production deployment",
              "`deploy rollback` for rollback planning or execution"
            ]
          },
          {
            id: "preflight-checklist",
            title: "Pre-Flight Checklist",
            bullets: [
              "Build succeeds",
              "Tests and validation match release risk",
              "Secrets are not hardcoded",
              "Environment configuration is accounted for",
              "Migrations are ordered and reversible where possible",
              "Monitoring or smoke checks are defined"
            ]
          }
        ]
      }
    ]
  },
  {
    title: "CLI Reference",
    pages: [
      {
        slug: "commands-and-options",
        section: "CLI Reference",
        title: "Commands & Options",
        summary: "The commands and flags exposed by the Codex Kit CLI.",
        intro: [
          "Codex Kit keeps the CLI surface focused: scaffold a repo, update managed files, inspect status, and manage local Codex skills.",
          "The CLI entrypoint is exposed through the `codex-kit` binary."
        ],
        blocks: [
          {
            id: "commands",
            title: "Primary Commands",
            code: `codex-kit init
codex-kit install
codex-kit install --target plugin
codex-kit install --target mcp
codex-kit install --target skills
codex-kit install --target skills --scope local
codex-kit update
codex-kit sync --target mcp
codex-kit sync --target plugin
codex-kit sync --target skills
codex-kit sync --target skills --scope local
codex-kit list --target skills
codex-kit list --target skills --query frontend
codex-kit list --target skills --scope local
codex-kit list --target plugin
codex-kit list --target mcp
codex-kit remove --target skills --scope local --skills ,planning
codex-kit setup-codex
codex-kit sync-codex
codex-kit status`
          },
          {
            id: "command-introductions",
            title: "What Each Command Does",
            bullets: [
              "`init` installs the full Codex Kit scaffold into the current project.",
              "`install` without `--target` behaves the same as `init`.",
              "`install --target plugin` installs only the workspace plugin into the current project.",
              "`install --target mcp` installs the shipped MCP bundle into the current project's `.codex/config.toml`.",
              "`install --target skills` installs only the shipped project skill bundle into `.agents/skills` and `.agents/.shared`.",
              "`install --target skills --scope local` installs shipped skills into `${CODEX_HOME:-~/.codex}/skills` for local Codex.",
              "`update` refreshes scaffold-managed project files and keeps local modifications safe unless you pass `--force`.",
              "`sync --target mcp` refreshes the shipped MCP bundle in the current project's `.codex/config.toml`.",
              "`sync --target plugin` refreshes only the workspace plugin files in the current project.",
              "`sync --target skills` refreshes only the project-local skill bundle in the current repository.",
              "`sync --target skills --scope local` overwrites the local Codex copy with the current shipped skill version.",
              "`list --target skills` shows the shipped skill catalog grouped by category.",
              "`list --target skills --query <text>` searches the shipped skill catalog by keyword or domain.",
              "`list --target skills --scope local` shows which shipped skills are already installed in local Codex.",
              "`list --target plugin` reports workspace plugin status for the current project.",
              "`list --target mcp` reports whether the shipped MCP bundle is installed in the current project or local Codex config.",
              "`remove --target skills --scope local --skills ...` removes only the named local Codex skills.",
              "`setup-codex` combines workspace plugin setup with local skill installation and prints next steps.",
              "`sync-codex` combines workspace plugin sync with local skill sync after upgrading Codex Kit.",
              "`status` reports missing, modified, and outdated scaffold-managed files in the current project."
            ]
          },
          {
            id: "legacy-aliases",
            title: "Legacy Aliases",
            code: `codex-kit sync --target project
codex-kit install --target project
codex-kit list-skills
codex-kit search-skills frontend
codex-kit list-installed-skills
codex-kit install-skills
codex-kit sync-skills
codex-kit remove-skills --skills ,planning`
          },
          {
            id: "options",
            title: "Options",
            code: `codex-kit init --path ./my-project
codex-kit install --path ./my-project
codex-kit init --force
codex-kit install --force
codex-kit init --dry-run
codex-kit install --dry-run
codex-kit init --install-plugin
codex-kit init --quiet
codex-kit install --target plugin
codex-kit install --target mcp
codex-kit install --target skills
codex-kit install --target mcp --scope local
codex-kit sync --target mcp
codex-kit sync --target skills --force
codex-kit sync --target plugin --force
codex-kit list --target plugin
codex-kit list --target mcp

codex-kit setup-codex --path ./my-project
codex-kit setup-codex --codex-home ~/.codex
codex-kit setup-codex --skills ,planning
codex-kit sync-codex
codex-kit sync-codex --skills ,planning

codex-kit list --target skills
codex-kit list --target skills --skills ,planning
codex-kit list --target skills --query frontend
codex-kit list --target skills --scope local
codex-kit list --target skills --scope local --codex-home ~/.codex

codex-kit update --path ./my-project
codex-kit update --force
codex-kit update --dry-run
codex-kit update --install-plugin

codex-kit install --target skills --scope local --codex-home ~/.codex
codex-kit install --target skills --scope local --skills ,planning
codex-kit install --target skills --scope local --force
codex-kit sync --target skills --scope local --skills ,planning
codex-kit remove --target skills --scope local --skills ,planning

codex-kit status --path ./my-project`
          },
          {
            id: "scope-and-flags",
            title: "Scope And Flags",
            bullets: [
              "Use project scope by default for scaffold, plugin, and project skill operations in the current repository.",
              "Use project scope by default for scaffold, plugin, project skills, and project MCP operations in the current repository.",
              "Use `--scope local` only when you want Codex Kit to write into `${CODEX_HOME:-~/.codex}`.",
              "Use `--codex-home` to target a different local Codex directory.",
              "Use `--skills` only for targeted local skill install, sync, or removal.",
              "Use `--query` only with `list --target skills` when searching the shipped skill catalog.",
              "The shipped MCP bundle includes `context7` and a commented `mysql` example wired for `@benborla29/mcp-server-mysql`; uncomment it only when you intentionally want to enable MySQL MCP.",
              "Use `--force` when you intentionally want to overwrite existing or locally modified managed files.",
              "Use `--dry-run` to preview what Codex Kit would write before changing files."
            ]
          },
          {
            id: "managed-files",
            title: "Managed File Behavior",
            body: [
              "The `.codex-kit/manifest.json` file tracks the path, template hash, installed hash, and install version for kit-managed files.",
              "That data powers `status`, safe `update`, and detection of missing or locally modified managed files."
            ]
          }
        ]
      }
    ]
  }
];

export const allPages = docSections.flatMap((section) => section.pages);
