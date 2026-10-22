const fs = require('fs');
const assert = require('assert');

// 1. Check lazyWithRetry.js
const lazyCode = fs.readFileSync('src/utils/lazyWithRetry.js', 'utf8');
assert(lazyCode.includes('studenthub_chunk_reload_cooldown'), 'Must define studenthub_chunk_reload_cooldown');
assert(lazyCode.includes('navigator.onLine'), 'Must check navigator.onLine');
assert(lazyCode.includes('window.location.reload()'), 'Must call window.location.reload()');
console.log('✓ lazyWithRetry.js structure verified');

// 2. Check main.jsx
const mainCode = fs.readFileSync('src/main.jsx', 'utf8');
assert(mainCode.includes('vite:preloadError'), 'Must listen for vite:preloadError');
assert(mainCode.includes('preventDefault'), 'Must call preventDefault');
assert(mainCode.includes('navigator.onLine'), 'Must check navigator.onLine');
assert(mainCode.includes('window.location.reload()'), 'Must reload on preloadError');
console.log('✓ main.jsx structure verified');

// 3. Check App.jsx
const appCode = fs.readFileSync('src/App.jsx', 'utf8');
assert(!appCode.includes('localStorage.clear()'), 'CRITICAL: localStorage.clear() must be completely eradicated!');
assert(appCode.includes('lazyWithRetry'), 'Must use lazyWithRetry in App.jsx');
assert(appCode.includes('isChunkLoadError'), 'RootErrorBoundary must use isChunkLoadError');
console.log('✓ App.jsx verified (localStorage.clear eradicated, lazyWithRetry applied)');

// 4. Check LandingPage.jsx
const landingCode = fs.readFileSync('src/pages/LandingPage.jsx', 'utf8');
assert(landingCode.includes('https://github.com/Gekamil/AppHub/releases/download/latest/AppHub.apk'), 'Android APK link must point to GitHub Release');
assert(landingCode.includes('download="AppHub.apk"'), 'Android APK download attribute must be AppHub.apk');
assert(landingCode.includes('https://github.com/Gekamil/AppHub/releases/download/latest/AppHub-Setup.exe'), 'Windows Setup link must point to GitHub Release');
assert(landingCode.includes('download="AppHub-Setup.exe"'), 'Windows Setup download attribute must be AppHub-Setup.exe');
console.log('✓ LandingPage.jsx download links verified');

// 5. Functional test of server/whatsapp-bridge.js handleDownloadRoute
const bridgeCode = fs.readFileSync('server/whatsapp-bridge.js', 'utf8');
assert(bridgeCode.includes('302'), 'handleDownloadRoute must issue 302 redirects');

function mockRes() {
  return {
    statusCode: null,
    headers: {},
    ended: false,
    writeHead(status, headers) {
      this.statusCode = status;
      this.headers = headers;
    },
    end() {
      this.ended = true;
    }
  };
}

// Extract handleDownloadRoute function from server/whatsapp-bridge.js and test it
const fnMatch = bridgeCode.match(/function handleDownloadRoute\(req, res\) \{[\s\S]*?\n\}/);
assert(fnMatch, 'handleDownloadRoute must exist in server/whatsapp-bridge.js');
const GITHUB_RELEASE_APK_URL = 'https://github.com/Gekamil/AppHub/releases/download/latest/AppHub.apk';
const GITHUB_RELEASE_SETUP_URL = 'https://github.com/Gekamil/AppHub/releases/download/latest/AppHub-Setup.exe';

const handleDownloadRoute = new Function('req', 'res', 'GITHUB_RELEASE_APK_URL', 'GITHUB_RELEASE_SETUP_URL',
  fnMatch[0].replace('function handleDownloadRoute(req, res) {', '').slice(0, -1)
);

// Test APK routes
['/download/AppHub.apk', '/download/StudentHub.apk', '/download/apphub.apk', '/download/studenthub.apk'].forEach((url) => {
  const res = mockRes();
  const handled = handleDownloadRoute({ url }, res, GITHUB_RELEASE_APK_URL, GITHUB_RELEASE_SETUP_URL);
  assert.strictEqual(handled, true, `URL ${url} should be handled`);
  assert.strictEqual(res.statusCode, 302, `URL ${url} should return 302`);
  assert.strictEqual(res.headers.Location, GITHUB_RELEASE_APK_URL, `URL ${url} should redirect to APK URL`);
  assert.strictEqual(res.ended, true);
});
console.log('✓ server/whatsapp-bridge.js APK 302 redirect functional tests passed');

// Test Setup routes
['/download/AppHub-Setup.exe', '/download/StudentHub-Setup.exe', '/download/studenthub.exe'].forEach((url) => {
  const res = mockRes();
  const handled = handleDownloadRoute({ url }, res, GITHUB_RELEASE_APK_URL, GITHUB_RELEASE_SETUP_URL);
  assert.strictEqual(handled, true, `URL ${url} should be handled`);
  assert.strictEqual(res.statusCode, 302, `URL ${url} should return 302`);
  assert.strictEqual(res.headers.Location, GITHUB_RELEASE_SETUP_URL, `URL ${url} should redirect to Setup.exe URL`);
  assert.strictEqual(res.ended, true);
});
console.log('✓ server/whatsapp-bridge.js Setup.exe 302 redirect functional tests passed');

// Non-download route
{
  const res = mockRes();
  const handled = handleDownloadRoute({ url: '/api/test' }, res, GITHUB_RELEASE_APK_URL, GITHUB_RELEASE_SETUP_URL);
  assert.strictEqual(handled, false);
}
console.log('✓ server/whatsapp-bridge.js non-download pass-through verified');

// 6. Check vite.config.js
const viteCode = fs.readFileSync('vite.config.js', 'utf8');
assert(viteCode.includes('302'), 'Vite dev middleware must issue 302 redirects');
assert(viteCode.includes('https://github.com/Gekamil/AppHub/releases/download/latest/AppHub.apk'), 'Vite must redirect to GitHub release APK');
console.log('✓ vite.config.js dev server redirects verified');

console.log('\n*** ALL M1 VERIFICATIONS AND FUNCTIONAL TESTS PASSED WITH 100% SUCCESS ***');
