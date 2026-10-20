const http = require('http');

function request(options, postData) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, body: data }));
    });
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function runDashboardTests() {
  console.log('====================================================');
  console.log('   LINKPULSE DASHBOARD UI POLISH VERIFICATION');
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition, testName) {
    total++;
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
    }
  }

  // 1. Authenticate demo user (admin@linkpulse.io or alex@company.com)
  const loginData = 'email=admin%40linkpulse.io&password=password123';
  const loginRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(loginData)
    }
  }, loginData);

  const sessionCookie = loginRes.headers['set-cookie'] ? loginRes.headers['set-cookie'][0].split(';')[0] : '';
  assert(!!sessionCookie, 'Session cookie obtained for demo user');

  // 2. Fetch Dashboard
  const dashRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/',
    method: 'GET',
    headers: { 'Cookie': sessionCookie }
  });

  assert(dashRes.statusCode === 200, 'GET / with session returns 200 OK');
  const html = dashRes.body;

  // 3. Stat Cards with Icons
  assert(html.includes('stat-icon-blue'), 'Dashboard: "My Links" has blue icon container');
  assert(html.includes('stat-icon-green'), 'Dashboard: "Active Links" has green icon container');
  assert(html.includes('stat-icon-amber'), 'Dashboard: "My Link Clicks" has amber icon container');
  assert(html.includes('stat-icon-purple'), 'Dashboard: "Campaigns" has purple icon container');

  // 4. Section Divider
  assert(html.includes('dashboard-section-divider'), 'Dashboard: Section divider exists');
  assert(html.includes('divider-icon-bubble'), 'Dashboard: Divider has centered icon bubble');

  // 5. Search Bar
  assert(html.includes('search-bar-wrap'), 'Dashboard: Search bar is wrapped in container');
  assert(html.includes('search-bar-icon'), 'Dashboard: Search bar has visible search SVG icon');
  assert(html.includes('table-search-input'), 'Dashboard: Input has table-search-input class');
  assert(html.includes('placeholder="Search links..."'), 'Dashboard: Placeholder is "Search links..."');
  assert(html.includes('Ctrl K'), 'Dashboard: Shows Ctrl K shortcut hint');
  assert(html.includes("e.key === 'k' || e.key === 'K'"), 'Dashboard: Ctrl+K keyboard shortcut handler active');

  // 6. Notification Bell & Dropdown
  assert(html.includes('notification-wrap'), 'Dashboard: Notification wrapper present in topbar');
  assert(html.includes('notification-btn'), 'Dashboard: Bell icon button present');
  assert(html.includes('notification-badge'), 'Dashboard: Unread count badge present');
  assert(html.includes('notification-dropdown'), 'Dashboard: Elevated notification dropdown present');
  assert(html.includes('Notifications'), 'Dashboard: Dropdown contains "Notifications" title');
  assert(html.includes('Mark all as read'), 'Dashboard: Dropdown contains "Mark all as read" button');
  assert(html.includes('notif-unread-dot'), 'Dashboard: Dropdown contains unread indicator dots');

  // 7. Table Actions
  assert(html.includes('btn-action-copy'), 'Dashboard: Table has copy action button');
  assert(html.includes('btn-action-share'), 'Dashboard: Table has share & QR action button');
  assert(html.includes('btn-action-analytics'), 'Dashboard: Table has link analytics action button');
  assert(html.includes('btn-action-toggle'), 'Dashboard: Table has toggle action button');
  assert(html.includes('btn-action-delete'), 'Dashboard: Table has delete action button');

  // 8. Theme Switcher (exactly one in the desktop authenticated topbar)
  const appTopbarMatch = html.match(/<div class="app-topbar">([\s\S]*?)<\/div>\s*<div class="container">/);
  const desktopTopbarHtml = appTopbarMatch ? appTopbarMatch[1] : '';
  const desktopThemeToggles = (desktopTopbarHtml.match(/data-theme-toggle/g) || []).length;
  assert(desktopThemeToggles === 1, `Dashboard: Exactly one theme toggle in desktop topbar (found ${desktopThemeToggles})`);

  console.log(`\n====================================================`);
  console.log(`DASHBOARD RESULTS: ${passed} / ${total} TESTS PASSED (${Math.round(passed/total*100)}%)`);
  console.log(`====================================================\n`);

  process.exit(passed === total ? 0 : 1);
}

runDashboardTests().catch(err => {
  console.error(err);
  process.exit(1);
});
