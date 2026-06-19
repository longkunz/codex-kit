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
- Hơn 40 skill được đóng gói trong `.agents/skills`
- 16 playbook workflow trong `.agents/workflows`
- 16 subagent tập trung trong `.codex/agents`
- dữ liệu UI/UX chia sẻ và scripts trong `.agents/.shared`
- cấu hình Codex trong phạm vi dự án ở `.codex/config.toml`
- quy tắc thực thi Codex trong `.codex/rules/default.rules`
- các project hooks (tùy chọn) trong `.codex/hooks.json` và `.codex/hooks/`
- theo dõi các file được quản lý trong `.codex-kit/manifest.json`

## CLI

Các lệnh chính:

```bash
codex-kit init
codex-kit init --include-plugin
codex-kit init --all
codex-kit install
codex-kit install --target plugin
codex-kit install --target mcp
codex-kit install --target skills
codex-kit install --target skills --scope local
codex-kit install --target hooks
codex-kit install --target memories --scope local
codex-kit update
codex-kit sync --target mcp
codex-kit sync --target plugin
codex-kit sync --target skills
codex-kit sync --target skills --scope local
codex-kit sync --target hooks
codex-kit list --target skills
codex-kit list --target skills --query frontend
codex-kit list --target skills --scope local
codex-kit list --target plugin
codex-kit list --target mcp
codex-kit remove --target skills --scope local --skills clean-code,planning
codex-kit autoskills
codex-kit autoskills --scope local
codex-kit autoskills --dry-run
codex-kit setup-codex
codex-kit setup-codex --enable-memories
codex-kit sync-codex
codex-kit status
codex-kit doctor
codex-kit doctor --json
codex-kit doctor --fix
```

Các ví dụ phổ biến:

```bash
codex-kit init --path ./my-project
codex-kit init --path ./my-project --include-plugin
codex-kit init --path ./my-project --all
codex-kit install --path ./my-project
codex-kit install --target plugin
codex-kit install --target mcp
codex-kit install --target skills
codex-kit install --target hooks
codex-kit install --target memories --scope local
codex-kit doctor

codex-kit list --target skills
codex-kit list --target skills --query frontend
codex-kit list --target skills --scope local
codex-kit list --target mcp

codex-kit install --target skills --scope local
codex-kit install --target skills --scope local --skills clean-code,planning
codex-kit sync --target skills --scope local --skills clean-code,planning
codex-kit remove --target skills --scope local --skills clean-code,planning

codex-kit setup-codex
codex-kit setup-codex --enable-memories
codex-kit sync-codex
```

Các bí danh (alias) cũ vẫn hoạt động:

```bash
codex-kit install --target project
codex-kit sync --target project
codex-kit list-skills
codex-kit search-skills frontend
codex-kit list-installed-skills
codex-kit install-skills
codex-kit sync-skills
codex-kit remove-skills --skills clean-code,planning
```

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
- cục bộ người dùng: danh mục skill được cài đặt vào `${CODEX_HOME:-~/.codex}/skills`
- MCP người dùng: `install --target mcp --scope local` ghi gói MCP được cung cấp vào `${CODEX_HOME:-~/.codex}/config.toml`
- bộ nhớ người dùng: `install --target memories --scope local` chỉ cập nhật `${CODEX_HOME:-~/.codex}/config.toml`

Để khởi tạo dự án:

```bash
npx @longkunz/codex-kit init
npx @longkunz/codex-kit install
```

Bộ khung mặc định không bao gồm workspace plugin và hooks. Bạn có thể thêm plugin trong quá trình init, hoặc thêm mọi gói bổ sung của dự án:

```bash
npx @longkunz/codex-kit init --include-plugin
npx @longkunz/codex-kit init --all
```

`--all` bao gồm cả plugin và project hooks. Nó không kích hoạt memories người dùng cục bộ.

Để chỉ cài đặt workspace plugin vào dự án hiện tại:

```bash
npx @longkunz/codex-kit install --target plugin
```

Plugin sau khi cài đặt bao gồm Codex Kit skill, các hook cục bộ an toàn, và cấu hình MCP `context7`. Các file hook không thực hiện các cuộc gọi mạng hoặc ghi log nội dung prompt, nội dung file, hay các giá trị môi trường.

Đối với một marketplace dự án mới tạo, đăng ký dự án và thêm plugin bằng Codex CLI:

```bash
codex plugin marketplace add /path/to/project
codex plugin add codex-kit@local-plugins
```

Chạy lệnh `codex-kit doctor` trước để xác thực tên marketplace, đường dẫn mã nguồn, chính sách (policy), siêu dữ liệu plugin, các hook được tích hợp, cấu hình MCP, và phiên bản package. Codex Kit chuẩn bị các file marketplace cục bộ nhưng không sửa đổi registry plugin Codex toàn cầu của người dùng.

Để chỉ cài đặt các skill của dự án vào dự án hiện tại:

```bash
npx @longkunz/codex-kit install --target skills
```

Để cài đặt gói hook an toàn tùy chọn vào dự án hiện tại:

```bash
npx @longkunz/codex-kit install --target hooks
```

Gói hook tạo ra:

- `.codex/hooks.json`
- `.codex/hooks/user_prompt_secret_scan.mjs`
- `.codex/hooks/pre_tool_use_policy.mjs`
- `.codex/hooks/post_tool_use_log.mjs`
- `.codex/hooks/stop_validation.mjs`

Hooks an toàn theo mặc định: chúng chạy trên máy cục bộ, không thực hiện các cuộc gọi mạng và không log nội dung prompt, nội dung file hay giá trị môi trường. Các file hook hiện tại sẽ không bị ghi đè trừ khi bạn dùng tham số `--force`.

Để cài đặt MCP bundle được cung cấp vào dự án hoặc cấu hình Codex cục bộ:

```bash
npx @longkunz/codex-kit install --target mcp
npx @longkunz/codex-kit install --target mcp --scope local
```

Gói MCP hiện tại bao gồm:

- `context7` cho tài liệu dành cho nhà phát triển
- ví dụ MCP MySQL được comment qua `@benborla29/mcp-server-mysql`; chỉ bỏ comment khi bạn thực sự muốn bật MySQL MCP

Để thực hiện thiết lập toàn bộ cục bộ trong một lệnh cho repository hiện tại:

```bash
npx @longkunz/codex-kit setup-codex
```

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

Sau khi nâng cấp Codex Kit, hãy đồng bộ lại cả plugin workspace và các skill dự án bằng lệnh:

```bash
npx @longkunz/codex-kit sync-codex
```

Để cài đặt các skill vào Codex người dùng cục bộ:

```bash
npx @longkunz/codex-kit install --target skills --scope local
```

Theo mặc định, skill cục bộ được cài đặt vào thư mục:

```text
${CODEX_HOME:-~/.codex}/skills
```

## Autoskills

Lấy cảm hứng từ [midudev/autoskills](https://github.com/midudev/autoskills), Codex Kit đi kèm với lệnh tự động phát hiện riêng. Thay vì kéo từ các registry bên thứ ba, nó quét bộ công cụ (stack) dự án và chỉ cài đặt các skill có liên quan từ danh mục đã được kiểm duyệt của Codex Kit.

```bash
npx @longkunz/codex-kit autoskills
npx @longkunz/codex-kit autoskills --scope local
npx @longkunz/codex-kit autoskills --dry-run
```

Trình quét kiểm tra các file `package.json`, `pyproject.toml`, `Cargo.toml`, `go.mod`, `Gemfile`, cấu hình framework (Next.js, Tailwind, Playwright, Vitest, ...) và phần mở rộng file (`.sh`, `.ps1`, `.tsx`, ...). Nó cũng nhận ra các sự kết hợp stack khác nhau chẳng hạn như `React + Tailwind CSS`, `Next.js + Playwright`, hoặc `FastAPI + SQLAlchemy`, và thêm "bonus frontend" (design + SEO) khi phát hiện có web frontend.

Cài đặt ở phạm vi dự án sẽ lưu vào `.agents/skills/<skill>/` cùng với phần còn lại của Codex Kit scaffold, và ghi báo cáo tóm tắt quá trình thực thi vào `.codex-kit/autoskills-lock.json`. Cài đặt ở phạm vi local lưu vào `${CODEX_HOME:-~/.codex}/skills`. Dùng tham số `--force` để ghi đè các tệp hiện tại; hành vi mặc định là không phá hủy.

Để duyệt qua hoặc tìm kiếm trong danh mục được cung cấp:

```bash
npx @longkunz/codex-kit list --target skills
npx @longkunz/codex-kit list --target skills --query frontend
npx @longkunz/codex-kit list --target skills --scope local
```

Plugin đi kèm cũng có thể giúp ánh xạ các yêu cầu ngôn ngữ tự nhiên như "cài skill frontend" hoặc "liệt kê skills debug" vào đúng lệnh của Codex Kit.

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
