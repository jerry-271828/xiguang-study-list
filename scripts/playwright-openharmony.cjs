// Playwright only recognises linux/darwin/win32. The browser configuration
// still points at the signed OHOS-musl Chromium installed by harmonybrew.
if (process.platform === 'openharmony') {
  Object.defineProperty(process, 'platform', { value: 'linux' });
}
