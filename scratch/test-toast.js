const fs = require('fs');
const path = require('path');

const css = fs.readFileSync(path.join(__dirname, '../public/css/main.css'), 'utf8');

let passed = 0;
let total = 0;

function assert(cond, name) {
  total++;
  if (cond) {
    console.log(`[PASS] ${name}`);
    passed++;
  } else {
    console.error(`[FAIL] ${name}`);
  }
}

console.log('--- Testing Toast Notification System Styling ---');

// Check toast container z-index
assert(css.includes('z-index: 99999;'), 'Toast container has z-index 99999 (above modals/headers)');

// Check dark theme styling
assert(css.includes('background-color: var(--card-bg);') && css.includes('color: var(--text-primary);'), 'Dark theme: uses card-bg and text-primary (no white-on-white bug)');

// Check light theme styling
assert(css.includes('[data-theme="light"] .toast') && css.includes('background-color: #FFFFFF;') && css.includes('color: #0F172A;'), 'Light theme: uses pure white background and dark navy text with clear border');

// Check checkmark icon stroke in dark and light themes
assert(css.includes('stroke: #22C55E;') && css.includes('stroke: #16A34A;'), 'Toast icon has vibrant green checkmark stroke in both dark and light themes');

// Check copied button feedback
assert(css.includes('.btn-action.copied'), 'Button has green .copied feedback state styling');

console.log(`\nToast tests passed: ${passed} / ${total}`);
process.exit(passed === total ? 0 : 1);
