# 必应每日一图

每天归档一张必应中国区的 1920×1080 壁纸。Vue 页面展示最新图片、按月分页的历史列表和图片详情。普通下载使用站点归档图，UHD 入口指向必应官方图片地址。

## 本地运行

使用 Node.js 24 和 `package.json` 指定的 pnpm 版本。

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm collect
pnpm build
pnpm preview
```

`pnpm collect` 访问必应，将图片和 JSON 写到 `.archive/`。可以设置 `ARCHIVE_DIR` 指向另一份归档。跳过采集也能构建空站点，用于检查首次部署的空状态。`pnpm preview` 输出本地预览地址。

## 发布到 GitHub Pages

1. 将新版代码推送到 GitHub 仓库的默认分支。
2. 在 **Settings → Pages → Build and deployment → Source** 选择 **GitHub Actions**。
3. 在 **Actions** 打开 **Collect wallpapers and publish Pages**，从默认分支点击 **Run workflow**。首次运行保持 **Fetch a wallpaper before publishing** 勾选，即可采集并发布第一张图。

工作流在北京时间每天 **00:17** 和 **04:17** 触发采集，并在默认分支代码更新后重新发布。有效的同日记录会被复用。遇到采集错误时，工作流记录错误并停止该次发布。归档已经保存而部署失败时，可以手动运行工作流并取消勾选采集，直接从 GitHub 归档重发。

`archive` 分支由首次成功采集创建。工作流需要向此分支提交和推送的权限，以及部署到 `github-pages` 环境的权限。仓库若启用了规则集，请为工作流保留对应写入路径。站点地址可从 Pages 设置或成功运行的部署步骤打开。

## 代码和归档

| 位置 | 用途 |
| --- | --- |
| `web/` | Vue 页面、路由、样式和静态数据读取 |
| `scripts/` | Node.js 采集、图片校验、索引生成及发布目录组装 |
| `.github/workflows/pages.yml` | 定时采集、归档提交和 Pages 部署 |
| `archive` 分支的 `images/YYYY-MM/YYYY-MM-DD/1920x1080.jpg` | 每日高清图片 |
| `archive` 分支的 `metadata/months/YYYY-MM.json` | 月度原始记录 |
| `metadata/index.json` 和 `metadata/latest.json` | 从月度记录生成的月份索引和最新图片 |

构建根据月度记录生成完整的 `dist/`。Vue 使用 Hash 路由和相对资源基址，适用于仓库名子路径和站点根路径。历史归档从新版首张成功采集的图片开始积累。动态 API 和画廊单独排期，项目决策见 [重构备忘录](REFACTOR-NOTES.md)。

## 来源与许可

本项目源自 [androidmumo/Bing-upyun](https://github.com/androidmumo/Bing-upyun)，旧版由 [XyoZang](https://xenns.com/) 二次开发。项目代码许可见 [GPL-3.0](LICENSE)。壁纸来自 Microsoft Bing，版权归各图片权利人所有。
