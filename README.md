# 隙光 · 学习清单

为 2026 年 7 月 13 日至 8 月 29 日设计的移动端学习清单。数据仅保存在当前浏览器的 `localStorage` 中。

## 本地运行

```bash
npm install
npm run dev
```

生产构建：`npm run build`。

## 移动端回归测试

测试覆盖任务状态局部更新、未完成卡片尺寸、连续触控翻页、周总结返回与转盘指针：

```bash
npm run test:mobile
```

普通桌面系统首次运行前需要执行 `npx playwright install chromium`。HarmonyOS PC 会自动复用 `~/.playwright-ohos` 中已签名的 Chromium。
