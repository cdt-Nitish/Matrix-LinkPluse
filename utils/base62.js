// Base62 short code generator
const CHARS = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

function toBase62(n) {
  let code = '';
  while (n > 0) {
    code = CHARS[n % 62] + code;
    n = Math.floor(n / 62);
  }
  return code.padStart(6, '0');
}

module.exports = { toBase62 };
