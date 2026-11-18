import { Gunzip, strFromU8 } from 'fflate';
import { ValidationError } from './validation';

export function expandGzip(bytes, maxBytes) {
  if (bytes.length < 18 || bytes[0] !== 31 || bytes[1] !== 139) throw new ValidationError('Sıkıştırılmış dosya geçersiz.');
  const trailer = new DataView(bytes.buffer, bytes.byteOffset + bytes.length - 8, 8);
  const expectedLength = trailer.getUint32(4, true);
  if (expectedLength > maxBytes) throw new ValidationError('Dosyanın açılmış boyutu güvenli sınırı aşıyor.');
  const chunks = [];
  let size = 0;
  let crc = -1;
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let bit = 0; bit < 8; bit += 1) c = (c >>> 1) ^ ((c & 1) ? 0xedb88320 : 0);
    table[n] = c >>> 0;
  }
  const decoder = new Gunzip(chunk => {
    size += chunk.length;
    if (size > maxBytes) throw new ValidationError('Dosyanın açılmış boyutu güvenli sınırı aşıyor.');
    for (const byte of chunk) crc = (crc >>> 8) ^ table[(crc ^ byte) & 255];
    chunks.push(chunk);
  });
  for (let offset = 0; offset < bytes.length; offset += 1024) decoder.push(bytes.subarray(offset, offset + 1024), offset + 1024 >= bytes.length);
  if (size !== expectedLength || ((crc ^ -1) >>> 0) !== trailer.getUint32(0, true)) throw new ValidationError('Dosya bütünlüğü doğrulanamadı.');
  const expanded = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { expanded.set(chunk, offset); offset += chunk.length; }
  return strFromU8(expanded);
}
