# 在线网关参考代码

这些文件来自用户提供的 rz10 交付目录，后端自身标识仍为 rz7。离线 HTML 与 APK 不依赖它们。此次只保留运行代码、提示词、配置示例和单元测试，不包含原服务器安装器、部署脚本或运营记录。

`config.example.json` 默认关闭服务。模型名称、价格和有效期是继承示例，**不是本次核验的当前报价**，正式运营前须由运营者更新。真实提供商密钥通过原网关要求的环境配置提供，绝不可放进网页或 APK。

运行测试（不调用真实模型）：

```sh
cd server-reference
python -m unittest test_gateway.py
```

部署使用 Python 标准库。入口 `gateway.py` 默认仅监听回环地址 127.0.0.1:4318。`RENZENG_CONFIG` 指定服务配置，`RENZENG_LEDGER` 指定计费账本路径，`RENZENG_PORT` 指定本地端口。运营者自行配置反向代理 `/api/renzeng` 和允许的站点来源；不要直接把服务暴露到公网。本次未更改或发布任何真实服务器。
