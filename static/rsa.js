// Pure JS RSA using BigInt. Educational only — NOT production-safe (no padding).
// Works in modern browsers (and Node with crypto.getRandomValues available).

// --- Environment: secure random bytes ---
function randomBytes(len) {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const arr = new Uint8Array(len);
    crypto.getRandomValues(arr);
    return arr;
  }
  // Node fallback
  try {
    const nodeCrypto = require('crypto');
    return new Uint8Array(nodeCrypto.randomBytes(len));
  } catch (e) {
    throw new Error('No secure random source available');
  }
}

// --- Byte / BigInt conversions ---
function bytesToBigInt(bytes) {
  let b = 0n;
  for (const v of bytes) {
    b = (b << 8n) + BigInt(v);
  }
  return b;
}
function bigIntToBytes(bi, byteLength = null) {
  if (bi === 0n) return new Uint8Array([0]);
  let tmp = bi < 0n ? -bi : bi;
  const bytes = [];
  while (tmp > 0n) {
    bytes.push(Number(tmp & 0xffn));
    tmp >>= 8n;
  }
  bytes.reverse();
  if (byteLength) {
    if (bytes.length > byteLength) throw new Error('Integer too large for desired byteLength');
    const pad = new Array(byteLength - bytes.length).fill(0);
    return new Uint8Array(pad.concat(bytes));
  }
  return new Uint8Array(bytes);
}

// --- Text helpers ---
const encoder = new TextEncoder();
const decoder = new TextDecoder();
function textToBigInt(str) { return bytesToBigInt(encoder.encode(str)); }
function bigIntToText(bi) { return decoder.decode(bigIntToBytes(bi)); }

// --- Base64 helpers (for transporting ciphertext) ---
function base64EncodeUint8(arr) {
  if (typeof btoa !== 'undefined') {
    let s = '';
    for (const byte of arr) s += String.fromCharCode(byte);
    return btoa(s);
  }
  // Node
  return Buffer.from(arr).toString('base64');
}
function base64DecodeToUint8(b64) {
  if (typeof atob !== 'undefined') {
    const s = atob(b64);
    const arr = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) arr[i] = s.charCodeAt(i);
    return arr;
  }
  return new Uint8Array(Buffer.from(b64, 'base64'));
}

// --- Modular arithmetic ---
function modPow(base, exp, mod) {
  base = ((base % mod) + mod) % mod;
  let result = 1n;
  while (exp > 0n) {
    if (exp & 1n) result = (result * base) % mod;
    base = (base * base) % mod;
    exp >>= 1n;
  }
  return result;
}
function egcd(a, b) {
  if (b === 0n) return [a, 1n, 0n];
  const [g, x1, y1] = egcd(b, a % b);
  return [g, y1, x1 - (a / b) * y1];
}
function modInv(a, m) {
  const [g, x] = (function inner(a, m) {
    if (m === 0n) return [a, 1n, 0n];
    const [g, x1, y1] = inner(m, a % m);
    return [g, y1, x1 - (a / m) * y1];
  })(a, m);
  if (g !== 1n) throw new Error('Inverse does not exist');
  return ((x % m) + m) % m;
}

// --- Miller-Rabin primality test ---
function isProbablePrime(n, k = 16) {
  if (n === 2n || n === 3n) return true;
  if (n < 2n || n % 2n === 0n) return false;
  // write n-1 as d*2^s
  let s = 0n;
  let d = n - 1n;
  while ((d & 1n) === 0n) {
    d >>= 1n;
    s += 1n;
  }
  witnessLoop:
  for (let i = 0; i < k; i++) {
    // pick a in [2, n-2]
    const a = 2n + (bytesToBigInt(randomBytes(8)) % (n - 4n));
    let x = modPow(a, d, n);
    if (x === 1n || x === n - 1n) continue;
    for (let r = 1n; r < s; r++) {
      x = (x * x) % n;
      if (x === n - 1n) continue witnessLoop;
    }
    return false;
  }
  return true;
}

// --- Random BigInt of bit length ---
function randomBigInt(bits) {
  if (bits < 1) return 0n;
  const bytes = Math.ceil(bits / 8);
  const rnd = randomBytes(bytes);
  // mask top bits beyond 'bits'
  const topBits = bits % 8;
  if (topBits !== 0) {
    const mask = (1 << topBits) - 1;
    rnd[0] &= mask;
  }
  // set highest bit to ensure bit length
  const highestIndex = 0;
  rnd[highestIndex] |= (1 << ((topBits || 8) - 1));
  return bytesToBigInt(rnd);
}
async function generatePrime(bits) {
  while (true) {
    const p = randomBigInt(bits) | 1n; // make odd
    if (isProbablePrime(p)) return p;
  }
}

// --- Key generation ---
async function generateKeypair(bits = 1024, e = 65537n) {
  if (bits < 512) throw new Error('Use at least 512 bits for educational/demo only');
  const half = Math.floor(bits / 2);
  let p, q;
  do {
    p = await generatePrime(half);
    q = await generatePrime(bits - half);
  } while (p === q);
  const n = p * q;
  const phi = (p - 1n) * (q - 1n);
  if (gcd(e, phi) !== 1n) throw new Error('e and phi(n) not coprime; try different e');
  const d = modInv(e, phi);
  return {
    publicKey: { e, n },
    privateKey: { d, n, p, q },
  };
}
function gcd(a, b) { return b === 0n ? a < 0n ? -a : a : gcd(b, a % b); }

// --- Encryption / Decryption (textbook RSA) ---
// Warning: no padding — only for demonstration; messages must be < n.
function encryptText(msg, pub) {
  const m = textToBigInt(msg);
  if (m >= pub.n) throw new Error('Message too long for RSA modulus. Use smaller message or bigger key.');
  const c = modPow(m, pub.e, pub.n);
  // convert to bytes then base64
  return base64EncodeUint8(bigIntToBytes(c));
}
function decryptText(b64cipher, priv) {
  const cBytes = base64DecodeToUint8(b64cipher);
  const c = bytesToBigInt(cBytes);
  const m = modPow(c, priv.d, priv.n);
  return bigIntToText(m);
}

// --- Example usage (async because prime gen loops) ---
async function example() {
  console.log('Generating 1024-bit keypair (this can be slow) ...');
  const { publicKey, privateKey } = await generateKeypair(1024);
  console.log('Public n bitlength ~', publicKey.n.toString(2).length);
  const plaintext = 'hello, RSA in pure JS!';
  const cipher = encryptText(plaintext, publicKey);
  console.log('Cipher (base64):', cipher);
  const recovered = decryptText(cipher, privateKey);
  console.log('Recovered:', recovered);
  return { publicKey, privateKey, cipher, recovered };
}
