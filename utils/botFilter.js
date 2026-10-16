// Bot / social-preview crawler detector
const BOT_PATTERNS = [
  /WhatsApp/i,
  /LinkedInBot/i,
  /Twitterbot/i,
  /facebookexternalhit/i,
  /TelegramBot/i,
  /Slackbot/i,
  /Googlebot/i,
  /bingbot/i,
  /Applebot/i,
  /crawler/i,
  /spider/i,
];

function isBot(userAgent = '') {
  return BOT_PATTERNS.some(p => p.test(userAgent));
}

module.exports = { isBot };
