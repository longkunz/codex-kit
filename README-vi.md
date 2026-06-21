# Codex Kit

[![npm version](https://img.shields.io/npm/v/@longkunz/codex-kit.svg)](https://www.npmjs.com/package/@longkunz/codex-kit)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

*Đọc bằng ngôn ngữ khác: [English](README.md), [Tiếng Việt](README-vi.md)*

> Bộ công cụ khởi tạo ứng dụng native cho Codex với tài liệu được tạo sẵn, skills, workflows, agents, hỗ trợ plugin và quản lý skill cục bộ.

Codex Kit giúp bạn khởi tạo một repository đã biết cách làm việc với Codex.

Thay vì phải xây dựng lại cùng một lớp điều hành trong mỗi dự án, bạn có một bộ khung sẵn sàng sử dụng với tài liệu định tuyến, danh mục skill, các playbook workflow, các subagent tập trung, cấu hình Codex và các lệnh cập nhật/trạng thái.

## Cài đặt nhanh

```bash
npx @longkunz/codex-kit init
```

Hoặc cài đặt global:

```bash
npm install -g @longkunz/codex-kit
codex-kit init
```

Khởi tạo vào một thư mục cụ thể:

```bash
npx @longkunz/codex-kit init --path ./my-project
```

## Bạn nhận được gì

- tài liệu định tuyến gốc: `AGENTS.md`, `ARCHITECTURE.md`, `AGENT_FLOW.md`
- catalog gồm 38 skill (17 core + 21 optional), với 17 skill core được cài mặc định
- 7 playbook workflow trong `.agents/workflows`
- 16 subagent tập trung trong `.codex/agents`
- dữ liệu UI/UX chia sẻ và scripts trong `.agents/.shared`
- cấu hình Codex trong phạm vi dự án ở `.codex/config.toml`
- quy tắc thực thi Codex trong `.codex/rules/default.rules`
- các project hooks (tùy chọn) trong `.codex/hooks.json` và `.codex/hooks/`
- theo dõi các file được quản lý trong `.codex-kit/manifest.json`

## Tham chiếu lệnh nhanh

| Nhóm | Lệnh | Mô tả |
|---|---|---|
| Thiết lập | `codex-kit init` | Khởi tạo dự án với 17 skill core. |
| Thiết lập | `codex-kit init --profile <name>` | Khởi tạo skill core kèm theo profile tùy chọn. |
| Thiết lập | `codex-kit init --include-plugin` | Khởi tạo kèm workspace plugin. |
| Thiết lập | `codex-kit init --include-hooks` | Khởi tạo kèm project hooks. |
| Thiết lập | `codex-kit init --all` | Khởi tạo với plugin và hooks. |
| Thiết lập | `codex-kit setup-codex` | Thiết lập scaffold, workspace plugin và các skill core của dự án. |
| Thiết lập | `codex-kit setup-codex --enable-memories` | Thiết lập toàn bộ kèm bật memories cục bộ người dùng. |
| Skills | `codex-kit install skill <name>` | Cài đặt một skill theo tên. |
| Skills | `codex-kit install --target skills` | Cài 17 skill core vào dự án hiện tại. |
| Skills | `codex-kit install --target skills --profile <name>` | Cài đặt skill core + skill của profile. |
| Skills | `codex-kit autoskills` | Phát hiện stack của project và cài các skill phù hợp từ catalog. |
| Skills | `codex-kit autoskills --dry-run` | Xem trước công nghệ và skill được phát hiện mà không ghi file. |
| Skills | `codex-kit sync --target skills` | Đồng bộ các canonical skill hiện đang cài trong dự án. |
| Khám phá | `codex-kit list --target skills` | Liệt kê skill với thông tin tier và profile. |
| Khám phá | `codex-kit list --target skills --query <text>` | Tìm kiếm trong danh mục skill. |
| Khám phá | `codex-kit list --target plugin` | Hiển thị trạng thái workspace plugin. |
| Khám phá | `codex-kit list --target mcp` | Hiển thị trạng thái MCP bundle. |
| Khám phá | `codex-kit list --target memories` | Hiển thị trạng thái memories cục bộ. |
| Khám phá | `codex-kit status` | Hiển thị trạng thái các file được quản lý. |
| Bảo trì | `codex-kit update` | Làm mới các file scaffold. |
| Bảo trì | `codex-kit sync-codex` | Đồng bộ scaffold + plugin + skill sau khi nâng cấp. |
| Bảo trì | `codex-kit sync --target plugin` | Đồng bộ workspace plugin. |
| Bảo trì | `codex-kit sync --target mcp` | Đồng bộ MCP bundle trong cấu hình dự án. |
| Bảo trì | `codex-kit sync --target hooks` | Đồng bộ project hooks. |
| Thành phần | `codex-kit install --target plugin` | Chỉ cài đặt workspace plugin. |
| Thành phần | `codex-kit install --target mcp` | Cài MCP bundle vào cấu hình dự án. |
| Thành phần | `codex-kit install --target mcp --scope local` | Cài MCP bundle vào cấu hình Codex cục bộ người dùng. |
| Thành phần | `codex-kit install --target hooks` | Cài đặt project hooks. |
| Thành phần | `codex-kit install --target memories --scope local` | Bật memories cục bộ người dùng. |
| Chẩn đoán | `codex-kit doctor` | Kiểm tra sức khỏe dự án Codex Kit. |
| Chẩn đoán | `codex-kit doctor --fix` | Sửa chữa an toàn các vấn đề phát hiện được. |
| Chẩn đoán | `codex-kit doctor --json` | Xuất kết quả kiểm tra dưới dạng JSON. |
| Chẩn đoán | `codex-kit doctor --strict` | Coi cảnh báo là lỗi. |

> Xem [Tham chiếu lệnh nhanh](#tham-chiếu-lệnh-nhanh) cho danh sách đầy đủ. Để xem chi tiết tùy chọn, chạy `codex-kit --help`.

## Tích hợp Codex

Codex Kit đi kèm với một bộ khung plugin Codex cục bộ:

- manifest của plugin: `plugins/codex-kit/.codex-plugin/plugin.json`
- skill của plugin: `plugins/codex-kit/skills/codex-kit/SKILL.md`
- hỗ trợ marketplace cục bộ thông qua `.agents/plugins/marketplace.json`

Có hai phạm vi cài đặt khác nhau:

- cục bộ dự án: `init` hoặc `install` (không có đối số) sẽ cài đặt bộ khung mà không bao gồm plugin tùy chọn; `init --include-plugin` thêm plugin workspace, và `init --all` thêm plugin kèm theo project hooks
- cài đặt cục bộ dự án có trọng tâm: `install --target plugin` hoặc `install --target skills` chỉ thêm những phần đó vào repository hiện tại
- hooks dự án: `install --target hooks` tạo `.codex/hooks.json` và các script hook an toàn cục bộ
- MCP dự án: `install --target mcp` ghi gói MCP được cung cấp vào `.codex/config.toml`
- MCP người dùng: `install --target mcp --scope local` ghi gói MCP được cung cấp vào `${CODEX_HOME:-~/.codex}/config.toml`
- bộ nhớ người dùng: `install --target memories --scope local` chỉ cập nhật `${CODEX_HOME:-~/.codex}/config.toml`

Bộ khung mặc định không bao gồm workspace plugin và hooks. Bạn có thể thêm plugin trong quá trình init, hoặc thêm mọi gói bổ sung của dự án:

```bash
npx @longkunz/codex-kit init --include-plugin
npx @longkunz/codex-kit init --all
```

`--all` bao gồm cả plugin và project hooks. Nó không kích hoạt memories người dùng cục bộ.

Plugin sau khi cài đặt bao gồm Codex Kit skill, các hook cục bộ an toàn, và cấu hình MCP `context7`. Các file hook không thực hiện các cuộc gọi mạng hoặc ghi log nội dung prompt, nội dung file, hay các giá trị môi trường.

Đối với một marketplace dự án mới tạo, đăng ký dự án và thêm plugin bằng Codex CLI:

```bash
codex plugin marketplace add /path/to/project
codex plugin add codex-kit@local-plugins
```

Chạy lệnh `codex-kit doctor` trước để xác thực tên marketplace, đường dẫn mã nguồn, chính sách (policy), siêu dữ liệu plugin, các hook được tích hợp, cấu hình MCP, và phiên bản package. Codex Kit chuẩn bị các file marketplace cục bộ nhưng không sửa đổi registry plugin Codex toàn cầu của người dùng.

Gói hook tạo ra:

- `.codex/hooks.json`
- `.codex/hooks/user_prompt_secret_scan.mjs`
- `.codex/hooks/pre_tool_use_policy.mjs`
- `.codex/hooks/post_tool_use_log.mjs`
- `.codex/hooks/stop_validation.mjs`

Hooks an toàn theo mặc định: chúng chạy trên máy cục bộ, không thực hiện các cuộc gọi mạng và không log nội dung prompt, nội dung file hay giá trị môi trường. Các file hook hiện tại sẽ không bị ghi đè trừ khi bạn dùng tham số `--force`.

Gói MCP hiện tại bao gồm:

- `context7` cho tài liệu dành cho nhà phát triển
- ví dụ MCP MySQL được comment qua `@benborla29/mcp-server-mysql`; chỉ bỏ comment khi bạn thực sự muốn bật MySQL MCP

Memories (bộ nhớ) là tùy chọn (opt-in) và chỉ khả dụng ở phía cục bộ người dùng (user-local). Để bật tính năng này:

```bash
npx @longkunz/codex-kit install --target memories --scope local
npx @longkunz/codex-kit setup-codex --enable-memories
```

Lệnh này chỉ ghi vào file `${CODEX_HOME:-~/.codex}/config.toml`:

```toml
[features]
memories = true

[memories]
use_memories = true
generate_memories = true
disable_on_external_context = true
```

Bộ khung dự án không bao giờ mặc định kích hoạt memories và không bao giờ ghi lại nội dung memory cá nhân.

## Danh mục skill theo category

Category nhóm skill theo chức năng. Profile là gói cài đặt dành cho optional skills; category không nhất thiết tương ứng với một profile.

| Category | Mục đích | Skill core | Skill optional |
|---|---|---|---|
| Planning & Routing | Lên kế hoạch, làm rõ và định tuyến công việc. | `architecture`, `brainstorming`, `planning`, `repo-onboarding` | `app-builder`, `parallel-agents` |
| Backend & Platform | API, database và các pattern platform. | `api-patterns`, `database-design` | `mcp-builder`, `nodejs-best-practices`, `python-patterns`, `rust-pro` |
| Frontend & UI | Thiết kế giao diện web và mobile. | `frontend-design`, `tailwind-patterns`, `web-design-guidelines` | `game-development`, `i18n-localization`, `mobile-design`, `nextjs-react-expert` |
| Debugging & Review | Debug dựa trên bằng chứng và code review. | `code-review`, `debugging` | — |
| Testing & Validation | Chiến lược unit, integration và validation. | `lint-and-validate`, `test-hardening`, `testing` | `tdd-workflow`, `webapp-testing` |
| Docs, Delivery & Operations | Tài liệu, triển khai và vận hành. | `documentation`, `release-deployment` | `doc`, `mcp-onboarding`, `server-management` |
| Security, Performance & Discoverability | Bảo mật, profiling và tối ưu tìm kiếm. | `security-review` | `geo-fundamentals`, `performance-profiling`, `red-team-tactics`, `seo-fundamentals` |
| Shell & Environment | Shell scripting và pattern theo hệ điều hành. | — | `bash-linux`, `powershell-windows` |

- **Core**: được cài mặc định bằng `codex-kit init`.
- **Optional**: được cài qua profile hoặc `codex-kit install skill <name>`.

## Profiles

Profile là các gói cài đặt được đặt tên sẵn, cài đặt skill core cùng với một bộ skill optional được chọn lọc trong một bước:

```bash
codex-kit init --profile backend-node
```

| Profile | Skill optional bao gồm |
|---|---|
| `backend-node` | `nodejs-best-practices` |
| `backend-python` | `python-patterns` |
| `rust` | `rust-pro` |
| `frontend-framework` | `i18n-localization`, `nextjs-react-expert`, `webapp-testing` |
| `mobile` | `mobile-design` |
| `game` | `game-development` |
| `mcp` | `mcp-builder`, `mcp-onboarding` |
| `security-advanced` | `red-team-tactics` |
| `performance` | `performance-profiling` |
| `operations` | `bash-linux`, `powershell-windows`, `server-management` |
| `discoverability` | `geo-fundamentals`, `seo-fundamentals` |
| `documents` | `doc` |
| `tdd` | `tdd-workflow` |
| `scaffolding` | `app-builder` |

`parallel-agents` là skill optional không thuộc profile nào. Cài đặt trực tiếp bằng:

```bash
codex-kit install skill parallel-agents
```

## Tự động phát hiện và cài skill

`codex-kit autoskills` phát hiện công nghệ đang được sử dụng trong repository và cài các skill phù hợp từ canonical catalog của Codex Kit.

Đây là công cụ hỗ trợ cài đặt. Nó không quyết định skill nào được Codex kích hoạt trong lúc xử lý một prompt.

Xem trước công nghệ được phát hiện và các skill sẽ được chọn mà không ghi file:

```bash
codex-kit autoskills --dry-run
```

Cài các skill được phát hiện:

```bash
codex-kit autoskills
```

Ví dụ, một project dùng React, Next.js và Playwright có thể được chọn các skill:

- `frontend-design`
- `nextjs-react-expert`
- `seo-fundamentals`
- `testing`
- `web-design-guidelines`
- `webapp-testing`

Command sẽ báo cả số skill được chọn và tổng số file được ghi. Một skill có thể chứa nhiều file như `SKILL.md`, reference, script, metadata agent và hướng dẫn verification.

Autoskills có thể quét các dấu hiệu như:

- `package.json`
- `pyproject.toml`
- `Cargo.toml`
- `go.mod`
- `Gemfile`
- file cấu hình framework hoặc testing
- phần mở rộng source như `.tsx`, `.sh`, `.ps1`

Autoskills chỉ cài các skill nằm trong audited canonical catalog của Codex Kit. Nó không tải skill từ registry bên thứ ba và không resolve tên skill legacy.

Các skill được cài vào `.agents/skills/`. Tóm tắt kết quả phát hiện được ghi vào `.codex-kit/autoskills-lock.json`.

Chỉ dùng `--force` khi cần refresh các managed skill file hiện có.

Để duyệt qua hoặc tìm kiếm trong danh mục, xem `codex-kit list --target skills` trong [Tham chiếu lệnh nhanh](#tham-chiếu-lệnh-nhanh).

## Codex Rules

Codex Kit cung cấp mẫu cấu hình quy tắc thực thi (execution policy template) tối giản ở thư mục `.codex/rules/default.rules`.

Các dự án cũ vẫn đang sử dụng file `codex/rules/default.rules` sẽ được di chuyển sang cấu hình mới trong suốt quá trình `init` khi nó được xem là an toàn. Nếu cả hai đường dẫn này cùng tồn tại, Codex Kit sẽ không can thiệp vào các file của người dùng và in ra thông báo cảnh báo.

Quy định này cố ý để phạm vi hẹp:

- nhắc hỏi trước các thao tác cài đặt các dependency như `npm install` hoặc `pnpm install`
- nhắc hỏi trước `git push`
- nhắc hỏi trước khi Codex Kit ghi vào thư mục cục bộ của Codex với `--scope local`

Điều này không thay thế `AGENTS.md`, các skill, hoặc workflow. Các file đó vẫn đảm nhiệm vai trò định hướng hành vi; `.codex/rules/default.rules` chỉ dùng làm quy tắc cấp quyền thực thi cho sandbox.

## Doctor

Sử dụng `doctor` để xác thực workspace đã tạo:

```bash
npx @longkunz/codex-kit doctor
npx @longkunz/codex-kit doctor --json
npx @longkunz/codex-kit doctor --fix
```

Doctor kiểm tra xác thực tính hợp lệ của `AGENTS.md`, các skill, subagents, `.codex/config.toml`, rules, hooks, luồng marketplace của plugin và meta data, plugin hooks/MCP đi kèm, tính nhất quán của manifest, cũng như trạng thái của memory cục bộ. Các cảnh báo sẽ không tính là lỗi theo mặc định; tham số `--strict` sẽ xem cảnh báo như một lỗi. Chạy `--fix` sẽ thực hiện sửa chữa an toàn, ví dụ như di dời các rule path cũ và thiết lập đồng bộ lại manifest cho các tệp đã tạo sẵn có trên ổ đĩa.

Cấu hình mặc định và subagent templates để các model selection được bình luận, vì vậy Codex dùng cài đặt mặc định của account hoặc environment trừ khi project đã thiết lập bằng một model rõ ràng.

## Yêu cầu

- Node.js `>=20`

## Tài liệu

- [Giới thiệu](https://codexkit.xyz/#/docs/introduction)
- [Cài đặt](https://codexkit.xyz/#/docs/installation)
- [Thiết lập Codex cục bộ](https://codexkit.xyz/#/docs/local-codex-setup)
- [Tham khảo CLI](https://codexkit.xyz/#/docs/commands-and-options)

## Giấy phép (License)

MIT
