# 人曾在此

一款以旧电脑、论坛帖子和私人散文为线索的中文叙事调查游戏。正式交付版本为 **1.0.0**，构建标识以 `release.json` 为准。

## 直接游玩

- **安卓：**安装交付目录中的 `人曾在此-1.0.0.apk`。Android 8.0 及以上，系统 WebView / Chrome 105 及以上。游戏资源全部内置，无需账号、服务器或网络。调查进度自动保存在本机；卸载应用或清除应用数据会删除存档。
- **电脑离线：**用 Chrome、Edge 等现代浏览器打开 `人曾在此-离线选择题版.html`。两个离线 HTML 内容相同。网页版刷新或关闭后会重置进度。
- **网页部署：**将网页静态包放到静态服务器。默认保留在线 AI 网关接口；没有可用服务时可以转为阅读预置留言。若希望网站也使用七道选择题，将 `ending-config.js` 中的 `mode` 改为 `choice`。

离线 APK 与 HTML 使用七道选择题。题目顺序固定，选项每局随机且局内稳定，部分题目允许多个满分答案。得分不阻断结局。

## 开发与测试

环境：Node.js 22 或更新版本；打包 ZIP 另需 Python 3.10 或更新版本。安卓构建需 JDK 17/21、Android SDK 36、Build Tools 35.0.0。

```sh
npm ci
npx playwright install chromium
npm run build
npm test
npm run test:browser
npm run test:ui
npm run test:release
node tests/mobile-start.cjs
node tests/forum-pagination-browser.cjs
node tests/connection-input.cjs
```

浏览器默认使用 Playwright 管理的 Chromium；如需自选浏览器，设置 `CHROME_PATH`。测试输出写到 `验收/`；构建时会自动创建该目录。
也可执行 `npm run verify` 一次完成构建、全部前端逻辑和浏览器测试，并生成逐项结果与日志。

```sh
cd android
./gradlew assembleDebug lint
```

Windows 使用 `gradlew.bat`。设置 `ANDROID_HOME` 指向自己的 SDK，勿把 `local.properties` 或签名信息上传仓库。Gradle 的 `preBuild` 会调用统一网页构建器。

正式签名构建见 [安卓构建与更新](docs/ANDROID.md)。源码结构与接口见 [架构说明](docs/ARCHITECTURE.md)，发布操作见 [发布指南](docs/RELEASE.md)。

## 授权与发布

本仓库交付不等于授予开源许可。剧情、图片和图形均继承自用户提供的 rz10；未提供可核实的作者授权记录，详见 [素材来源清单](docs/ASSETS.md)。公开 GitHub 或向平台提交前，需要权利人确认许可范围。

本次 GitHub 交付没有部署服务器或向 TapTap 提交审核。测试结果及未验证项以交付目录的验收报告为准。

## AI 会话与结局导航

在线模式的结局页、番外页提供“返回与哥哥的对话”。“先阅读哥哥留下的文字”是临时阅读分支，返回时保留七问进度、评价、聊天记录、剩余次数及未发送草稿；服务端会话过期时仍需使用已有的重新开始对话入口。离线选择题模式保持原流程。相关回归位于 `tests/core.test.cjs` 和 `tests/browser.cjs`。

## 项目与下载

A product of the TapTap Spotlight 21-Day Game Jam Challenge. The game's base build does not include AI-powered Q&amp;A functionality — the version with integrated AI Q&amp;A can be accessed and played at [https://play.yyxeach.xyz/](https://play.yyxeach.xyz/)

源码与发布包对应 `1.0.0`，包含 AI 结局返回会话修复。

- [下载 APK、离线 HTML、网页包及源码包](https://github.com/2018696241-lab/He-was-here./releases/tag/v1.0.0)
- [交付验收报告](docs/ACCEPTANCE.md)

安卓 APK 使用离线选择题模式，支持本机自动存档；在线网页模式需要另行配置 AI 网关。APK 已签名，但尚未完成安卓设备运行验收。发布包不含签名私钥。
