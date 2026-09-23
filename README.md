# 羊宇宙漫游指南

> 在羊的宇宙里漫游——杨胜翔的个人博客，也是一座每日热点追踪站。

[![Deploy to ECS](https://github.com/hitsuji-shouka/hotspot-tracker/actions/workflows/deploy.yml/badge.svg)](https://github.com/hitsuji-shouka/hotspot-tracker/actions/workflows/deploy.yml)

**在线访问**：<https://hitsuji-shouka.com/> ｜ **热点追踪**：<https://hitsuji-shouka.com/hotspot> ｜ **GitHub**：[@hitsuji-shouka](https://github.com/hitsuji-shouka)

## 截图

| 个人首页 | 热点追踪站 |
| --- | --- |
| ![个人首页](docs/screenshot-home.png) | ![热点追踪站](docs/screenshot-hotspot.png) |

## 站点地图

| 页面 | 内容 |
| --- | --- |
| `/` | 简历页：自我介绍、实习经历、教育经历、科研论文、精选 GitHub 项目 |
| `/shelf` | 漫游：影视 / 书籍 / 音乐书架（`src/data/shelf.ts` 维护） |
| `/blog` | 博客列表（`src/posts/*.md`） |
| `/post/:slug` | 博文详情页（Markdown 渲染，支持标签与日期） |
| `/hotspot` | 热点追踪站：GitHub 热点、Agent Skills、论文热点、AI 新闻、财经看点、统一收藏 |
| `/lab` | 实验室：按分类浏览实验卡片 |
| `/lab/sheep-room` | 羊的小屋：进入 3D 小屋，填写房间想法，观看 AI 逛店并选择购物清单，最后生成概念效果图（需单独配置服务） |

## 功能

- **个人博客**：极简编辑风首页，自动拉取 GitHub 头像与按 Star 排序的精选仓库；博文存放在 `src/posts/*.md`，frontmatter 支持 `title / date / tags / summary`。
- **GitHub 热点**：按语言 / 主题分类，支持今日 / 本周 / 本月时间范围、关键词搜索与限流兜底提示。
- **每日榜单**：GitHub 项目、Agent Skills、Hugging Face 论文、AI 新闻四个榜单由服务器定时任务每天早间更新（`update_snapshots.py`，cron 08:10）。
- **每日推送**：本地定时任务每天早间推送 Skills / GitHub / 论文 / AI 新闻 Top10（08:14–08:20，增量去重）。
- **统一收藏**：网址、仓库、Skill、论文、文章收藏集中在一个 Tab，通过 `/api/sync` 在服务器端持久化，手机与电脑数据一致。旧 `/reading` 地址跳转至 `/hotspot?view=fav&tab=articles`，文章继续使用 `readingArticles` 同步键。
- **文章标签**：支持自定义主题与图标；同名标签忽略大小写合并计数和筛选。手机端标签为单行横向滑动，桌面端常用标签优先，其余可展开。
- **文章导入**：手动填写链接和标题，简介与标签选填，不依赖外部预览服务；来源按链接自动识别，点击标题打开原文，删除收藏后可撤销。
- **管理口令**：访客只读，页脚「管理」解锁后可操作所有收藏及热点爱心。浏览器凭证有效期 30 天，过期后重新输入同一口令。部署配置见 [管理口令](docs/admin.md)。
- **羊的小屋**：Luna 在隔离的浏览器里逛宜家，页面同步展示真实店铺画面；只收录能从商品详情页核对价格的家具。效果图为概念图，购买前需在商家页面核对。未配置服务时页面如实显示未开通。

## 技术栈

- 前端：React 19 · TypeScript · Vite · Tailwind CSS · shadcn/ui · lucide-react
- 服务端：Node.js 静态服务 + `/api/sync`（`server.mjs`，systemd 常驻）
- 基础设施：阿里云 ECS · Cloudflare 命名隧道（HTTPS，免备案）· GitHub Actions CI/CD

## 本地开发

```bash
npm install
npm run dev
```

本地 API 代理指向 `127.0.0.1:8080`，需要另外启动 `server.mjs`。口令不配置时为只读；本地启用方法见上面的管理口令文档。

### 羊的小屋服务

`server.mjs` 需要设置 `SITE_ORIGIN`、`ROOM_API_KEY`（或官方 OpenAI 用的 `OPENAI_API_KEY`）、`ROOM_BROWSER_EXECUTABLE`（服务器上的 Chromium/Chrome 可执行文件绝对路径）和 `ROOM_ENABLED=1` 才会开放逛店。密钥只放在服务器环境变量，不写入前端或仓库；默认不开通。`SITE_ORIGIN` 必须与用户浏览器访问站点时的 Origin 完全一致，本地例如 `http://127.0.0.1:4186`。官方接口默认使用 `https://api.openai.com/v1`、`gpt-6-luna` 和 `gpt-image-2`；使用 AICode007 时设置 `ROOM_API_BASE_URL=https://api.aicode007.com`、`ROOM_TEXT_MODEL=gpt-5.6-luna`、`ROOM_IMAGE_MODEL=gpt-image-2`。如果本机 Node 24 需要通过 `HTTP_PROXY`/`HTTPS_PROXY` 出网，再设置 `NODE_USE_ENV_PROXY=1`。效果图只在选完商品后手动生成，每轮服务端只接受一次生图提交，失败不自动重试。为控制费用，服务端目前每天全站最多 30 次逛店、10 次效果图；每个来源地址每天最多 2 次逛店、1 次效果图，同时只运行一个逛店浏览器，重启服务后计数清零。图片只返回给当前页面，不会保存到服务器；本轮商品记录在服务端内存中保留一小时。

逛店通过兼容 OpenAI Responses API 的函数调用驱动 Playwright 浏览器，Luna 只读取网页文字，选择搜索、点击、滚动、明确加入小屋购物袋或结束。仅浏览商品不会入袋；名称、规格、照片和人民币价格从当前详情页核实，重复或超预算商品不能加入。用户选择使用独立的「小屋购物袋」，不调用商家加购，也不需要登录。Chrome CDP 连续画面和真实鼠标事件同步至 3D 电脑屏幕，入袋事件驱动黑板、照片提示、图册和完整清单。单轮最多 20 次决策；购物时间以分钟输入，默认 2.5 分钟，可在目标面板设为 0.5–10 分钟。镜头推进完成、服务端接受本轮后开始计时，包含浏览器启动和网页等待；到时中止模型请求并关闭逛店浏览器，保留已选商品与完整清单，不再接受入袋。也可以随时手动停止。

最后手动生成一次效果图：前端仅提交本轮 runId，服务端使用已核实清单和商品参考照片调用 `images/edits`；接口兼容性尚未实际生图验收，不会自动退回纯文字生图。效果图是搭配概念图，不保证实物外观或尺寸完全一致。`node scripts/room-check.mjs` 检查输入、图片来源和配额；`node scripts/room-stream-check.mjs` 验证本地浏览器连续帧；`node scripts/room-browser-check.mjs` 使用确定动作验证真实宜家搜索与入袋，后两项需要本机 Chrome，均不调用收费模型。详细流程和验收记录见 [体验改造与调研](design/sheep-room-experience.md)。部署前需配置服务端密钥、浏览器及长连接转发，并验收生图接口。

## 部署

- **日常**：`git push origin main` 即可——GitHub Actions 会自动构建并发布到 ECS（commit message 加 `[skip ci]` 可跳过）。
- **手动**：`npm run build && DEPLOY_PASS='服务器密码' npm run deploy`（也支持 `DEPLOY_KEY` 私钥）。
- 前端部署只替换服务器上的 `index.html` 与 `assets/`，不影响 `dist/data` 榜单数据与 `sync-data.json` 收藏数据。
- Actions 同时部署 `server.mjs`、`server-auth.mjs` 并重启 `hotspot-tracker.service`，先验证未解锁的写入被拒绝，再发布前端；服务器口令配置独立保存在 `/etc/hotspot-tracker.env`。手动 `deploy.py` 仍只发布前端。

## 目录结构

```
src/pages/      页面：博客首页 / 热点追踪 / 博文详情
src/sections/   追踪站各数据源模块（Skills、论文、AI 新闻、财经、收藏…）
src/posts/      Markdown 博文
src/lib/        GitHub API、缓存、文章加载等工具
scripts/        每日榜单与推送脚本、部署脚本
public/         站点图标与静态资源
```

## 数据来源

GitHub Search API · skills.sh · Hugging Face Papers · 量子位 · Hacker News · 新浪财经。收藏与同步数据保存在服务器 `sync-data.json`，仓库中不包含任何密码或密钥。
