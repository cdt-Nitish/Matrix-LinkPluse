// Async click logger — fires after redirect is sent
const { clicks } = require('../data/store');

function logClick(linkId, campaignId, req) {
  setImmediate(() => {
    try {
      const ua = req.headers['user-agent'] || '';
      const src = req.query.src === 'qr' ? 'qr' : 'direct';

      // Simple device detection without external library
      let deviceType = 'Desktop';
      if (/Mobile|Android|iPhone|iPod/i.test(ua)) deviceType = 'Mobile';
      else if (/iPad|Tablet/i.test(ua)) deviceType = 'Tablet';

      // Simple browser detection
      let browser = 'Other';
      if (/Edg\//i.test(ua)) browser = 'Edge';
      else if (/Chrome/i.test(ua)) browser = 'Chrome';
      else if (/Firefox/i.test(ua)) browser = 'Firefox';
      else if (/Safari/i.test(ua)) browser = 'Safari';

      clicks.push({
        id: `clk_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        linkId,
        campaignId,
        timestamp: new Date(),
        country: 'IN', // geo-ip placeholder
        deviceType,
        browser,
        source: src,
        referrer: req.headers['referer'] || '',
      });
    } catch (e) {
      // Never crash the server on analytics failure
      console.error('[clickLogger]', e.message);
    }
  });
}

module.exports = { logClick };
