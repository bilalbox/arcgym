/**
 * HMAC helpers for webhook verify and vote-dedup tokens.
 */

export async function importHmacKey(
  secret: string,
  usage: KeyUsage[]
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    usage
  );
}

export async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await importHmacKey(secret, ['sign']);
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(message)
  );
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function verifyHmacSha256Hex(
  secret: string,
  message: string,
  hexSignature: string
): Promise<boolean> {
  const hexPairs = hexSignature.match(/.{1,2}/g);
  if (!hexPairs || hexPairs.length !== 32) {
    return false;
  }
  if (hexPairs.some((p) => !/^[0-9a-fA-F]{2}$/.test(p))) {
    return false;
  }

  const key = await importHmacKey(secret, ['verify']);
  const sigBytes = new Uint8Array(hexPairs.map((byte) => parseInt(byte, 16)));
  return crypto.subtle.verify(
    'HMAC',
    key,
    sigBytes,
    new TextEncoder().encode(message)
  );
}

/**
 * Ephemeral, non-reversible vote-dedup token.
 * Raw IP is never stored — only this HMAC digest (TTL-bound in KV).
 */
export async function computeVoteDedupToken(
  secret: string,
  date: string,
  drillId: string,
  ip: string
): Promise<string> {
  return hmacSha256Hex(secret, `${date}:${drillId}:${ip}`);
}
