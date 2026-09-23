# 管理口令

访客可阅读所有公开收藏、搜索、筛选和打开原文。所有收藏写入都需要管理凭证，包括网址、仓库、Skill、论文、文章，以及热点列表的爱心。

首页与热点页的页脚提供「管理」入口，解锁后变成「退出编辑」。输入口令后，在该浏览器保存有效期 30 天的 HttpOnly Cookie。30 天后输入同一口令即可，口令本身不会定期变化。不同浏览器需分别解锁；主动退出会清除当前浏览器的凭证。修改服务器口令后，旧凭证全部失效。

## 本地开发

使用 Node 22 或以上。在项目根目录创建 `.env`（已被 Git 忽略）：

```dotenv
ADMIN_PASSWORD=
SITE_ORIGIN=http://localhost:3000
```

自行填写至少 12 字符的管理口令，不要加 `VITE_` 前缀，不要写入前端源码。先运行 `node --env-file=.env server.mjs 8080`，再运行 `npm run dev`，从 `http://localhost:3000` 访问。Vite 的 API 代理指向本地 8080，不会修改线上收藏。

若直接访问构建后的站点：运行 `npm run build`，将 `SITE_ORIGIN` 改为 `http://localhost:8080`，然后启动同一个 Node 服务。Origin 必须与地址栏完全一致（包括 http/https、主机名、端口）。HTTP 仅允许 localhost/127.0.0.1；公开地址必须 HTTPS。

`SYNC_FILE` 可选，用于指定独立收藏 JSON 文件；默认继续使用项目根目录的 `sync-data.json`。本地演示应使用独立数据文件，不要指向线上数据。

## 服务器首次启用

GitHub Actions 同时部署前端与服务端，并在发布前端前验证管理接口和写入保护。`scripts/deploy.py` 仍只部署前端。首次使用 Actions 前，需准备服务器环境：

1. 备份服务器已有 `sync-data.json`，保留其路径和内容。
2. 在 `/etc/hotspot-tracker.env` 设置 `ADMIN_PASSWORD` 和 `SITE_ORIGIN=https://hitsuji-shouka.com`，权限为 600。口令不放入 GitHub 仓库、Actions 输出或前端环境变量。
3. 在 `/etc/systemd/system/hotspot-tracker.service.d/admin.conf` 添加 `[Service]` 和 `EnvironmentFile=/etc/hotspot-tracker.env`。保留现有端口、运行账户、工作目录和收藏数据路径，不另建竞争同一端口的服务。
4. 推送 main 后，Actions 将两个服务端文件部署到 `/opt/hotspot-tracker/` 并重启已核实的 `hotspot-tracker.service`。升级前会备份旧服务文件和收藏数据到仅服务账户可读的 `backups/` 目录。
5. Actions 验证 `/api/admin` 返回 `configured: true`、未解锁 POST `/api/sync` 返回 401，再发布前端。使用页脚口令解锁核对收藏；不要将演示口令用于正式环境。

未配置口令时，新服务器默认拒绝写入（503），不回退为开放编辑。接口禁止跨站写入，生产 Cookie 带 Secure、HttpOnly、SameSite=Strict；错误口令最多尝试 10 次/15 分钟（单站长共用限额）。修改口令可使已签发的所有凭证失效。

收藏数据保持原结构，不迁移、不清空；浏览器旧本地缓存不再自动上传。公开读取只返回五类收藏集合，不暴露遗留 GitHub token/账号字段。GitHub 账号功能只使用当前浏览器本地存储。

保存失败时不会在界面显示已保存，也不会覆盖本地缓存。不同集合的服务器写入串行落盘，防止并发写入覆盖其他集合。多个设备同时修改同一个集合仍以最后一次提交为准，编辑时尽量只用一个设备。

## 验证

```sh
node scripts/admin-check.mjs
node scripts/admin-state-check.mjs
node scripts/sync-auth-check.mjs
node scripts/reading-check.mjs
node scripts/link-preview-check.mjs
npm run build
```

`admin-check` 会启动本地临时服务器，用独立临时数据验证访客、错误口令、CSRF、Cookie、过期、口令轮换、限速及并发保存；不接触实际收藏。
