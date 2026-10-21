# 架构与维护

## 单一源码与三个产物

`web/` 是唯一游戏源码。`tools/build.cjs` 读取 `release.json`，生成：

1. `artifacts/web/`：在线网页静态资源，保留 AI 网关模式。
2. `artifacts/人曾在此-离线选择题版.html` 与短文件名副本：样式、脚本和使用到的图片全部内嵌，CSP 禁止网络请求。
3. `android/app/src/main/assets/game/`：安卓离线资源，开启本机自动存档。

禁止直接修改生成产物。发布标识、应用包名与版本号统一维护在 `release.json`。剧情中的历史年代、账号密码和内容版本不随应用版本号机械替换。

## 游戏分层

- `content/`：故事、线索、账号和题库；题库选项 ID 是稳定身份，修改选项时不要复用旧 ID 表示不同答案。
- `core/investigation.js`：导航、阅读、搜索解锁、账号隔离、结局和番外。
- `core/puzzle.js`：棋盘落子、规则、检查、撤销和重做；通过组合挂到 Investigation，不保留提示或自动解题 API。
- `core/quiz-session.js`：创建每局选项排列、查询显示选项和校验答题记录。采用 Fisher–Yates 洗牌；如恰好全 A 均满分，交换第一题的首项与一个非满分项。
- `client/`：页面和事件；选项显示位置必须通过 `game.quizOptions()` 映射，不得直接用显示下标读取原题库。
- `infrastructure/save-store.js`：安卓存档读取、校验、备份和写入；网页端默认不启用。
- `infrastructure/ending-service.js`：在线接口隔离。离线模式不会发起 AI 请求。

脚本保持显式加载顺序，支持单文件内嵌，不引入前端框架或运行时打包依赖。

## 接口与存档

- `game.quizOptions(questionIndex?)` 返回本局显示顺序的选项。
- `game.answerQuiz(displayIndex)` 接收显示下标，记录稳定 `optionId`、原文、回复和分数。
- `game.onPersist` 在核心状态变动后保存，界面直接状态变更也在事件结束时保存。
- `game.beforeRestart` 在新调查前清除主存档与备份；存储清理失败时不抹掉当前进度。
- `game.resumeConversation()` 用于在线结局、番外和临时阅读分支返回 AI 会话；解除 `localOnly`，保留所有回答、聊天、草稿和会话过期状态，已有评价且未达到聊天上限时重新开放输入。仅探测连接，不重新创建或清空服务端会话。
- `RenZengPlatform.back()` 供安卓返回键调用，返回是否已消费；`save()` 保存当前阅读位置。

存档键为 `renzeng.save.v1`，备份键为 `renzeng.save.backup.v1`，记录 schema、故事 ID、内容版本、游戏状态与完整性校验值。校验值用于发现损坏，不是防作弊机制。保存前校验旧记录，损坏时暂停自动写入并提供“恢复上次备份”“清除并重开”“暂时游玩不保存”，避免覆盖用户数据。每次保存保留上一份有效快照。

更新应用但不改变存档结构时沿用 schema。改变结构或剧情 ID 时须先提供迁移函数和旧版存档夹具；未知版本不能静默重置。当前 1.0.0 不宣称能导入旧网页的会话进度。

安卓壳只负责资源加载、安全区、键盘、返回键、生命周期和异常恢复。正式构建关闭 WebView 调试，无 JavaScript 原生权限桥，无网络权限。
