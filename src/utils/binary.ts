const b64chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const b64lookup = new Uint8Array(256);
for (let i = 0; i < b64chars.length; i++) {
  b64lookup[b64chars.charCodeAt(i)] = i;
}

/**
 * Decode a Base64-encoded string into a Uint8Array byte buffer.
 * Compatible with React Native Hermes, JavaScriptCore, browser, and Node.js.
 */
export function base64ToUint8Array(base64: string): Uint8Array {
  const clean = base64.replace(/[\s=]/g, '');
  const len = clean.length;
  const byteLength = (len * 3) >> 2;
  const bytes = new Uint8Array(byteLength);

  let p = 0;
  for (let i = 0; i < len; i += 4) {
    const enc1 = b64lookup[clean.charCodeAt(i)];
    const enc2 = b64lookup[clean.charCodeAt(i + 1)];
    const enc3 = i + 2 < len ? b64lookup[clean.charCodeAt(i + 2)] : 64;
    const enc4 = i + 3 < len ? b64lookup[clean.charCodeAt(i + 3)] : 64;

    const chr1 = (enc1 << 2) | (enc2 >> 4);
    const chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
    const chr3 = ((enc3 & 3) << 6) | enc4;

    bytes[p++] = chr1;
    if (enc3 !== 64 && p < byteLength) bytes[p++] = chr2;
    if (enc4 !== 64 && p < byteLength) bytes[p++] = chr3;
  }

  return bytes;
}
