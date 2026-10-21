# 安卓构建、签名与更新

应用标识：`com.renzengzaici.game`。初始版本 1.0.0 / versionCode 1。最低 Android 8.0（API 26），compile / target SDK 36。系统网页组件要求 WebView / Chrome 105 或更新版本；组件过旧时显示更新说明，不进入空白页面。

## 构建

安装 JDK 17 或 21、Android SDK platform 36、Build Tools 35.0.0 与 platform-tools，设置 `JAVA_HOME` 和 `ANDROID_HOME`。

```sh
npm ci
cd android
./gradlew assembleDebug lint
```

Gradle Wrapper 锁定 8.13，Android Gradle Plugin 8.13.2，Kotlin 2.2.21；依赖锁在工程中。Windows 中文项目目录启用了路径检查兼容选项。如果某个本机工具仍不支持中文路径，可把源码解压到英文路径构建。

如果 Windows JDK 报 `Unable to establish loopback connection`，可在当前终端把 `JAVA_TOOL_OPTIONS` 设置为 `-Djdk.net.unixdomain.tmpdir=<本机可写的英文临时目录> -Djava.io.tmpdir=<同一目录>`，只改变本次构建环境。

## 正式签名

交付目录另附“签名私密包”，包括发布密钥和配置。请离线备份，切勿上传 GitHub、TapTap 素材区或发给玩家。

设置环境变量 `RENZENG_SIGNING_PROPERTIES` 指向私密包中的 `keystore.properties`；把其中的 `storeFile` 改为密钥在你电脑上的实际路径，使用正斜线。配置按 UTF-8 读取。然后执行：

```sh
./gradlew assembleRelease
```

输出为 `android/app/build/outputs/apk/release/app-release.apk`。缺少签名配置时只会得到未签名构建，不能将其作为正式安装包交付。

验证：

```sh
apksigner verify --verbose --print-certs app-release.apk
adb install -r app-release.apk
```

更新时维持同一包名、同一签名，提高 `release.json` 的 `versionCode`。覆盖安装应保留进度；卸载后再装不会保留进度。调试包与正式包签名不同，不可直接相互覆盖。

## 测试清单

安装正式包后，在飞行模式下冷启动、完成主线和七问；检查键盘、返回键、弹窗和横竖屏。途中切后台、强制结束进程后重新打开，确认阅读位置、棋盘和题目选项保持。用同一签名覆盖安装后确认进度仍在。

最终验收报告明确区分浏览器、安卓模拟器与物理手机；未实测设备不写为通过。源码中 `tests/release-browser.cjs` 验证安卓资源与存档接口，但不替代系统级安装和真机验收。
