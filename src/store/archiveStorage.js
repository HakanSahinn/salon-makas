import { randomUUID } from 'expo-crypto';
import { gzipSync, strToU8 } from 'fflate';
import { expandGzip } from '../boundedCodec';
import { localDate } from '../dates';
import { financialUpdate, migrateFinancialRecords } from '../financialRecords';
import { checkCalendar, retainYear } from '../retention';
import { ValidationError } from '../validation';
import { fileIO } from './fileIO';
import { createReportReader } from './reportReader';

export const chunkSize = 256;
export const packRecord = r => [r.id, r.date, r.amountKurus, r.type === 'income' ? 0 : 1, r.category ?? null, r.appointmentId ?? null, r.legacy ? 1 : 0];
export function unpackRecord([id, date, amountKurus, type, category, appointmentId, legacy]) {
  return { id, date, amountKurus, type: type === 0 ? 'income' : 'expense', ...(category == null ? {} : { category }),
    ...(appointmentId == null ? {} : { appointmentId }), ...(legacy ? { legacy: true } : {}) };
}
function checksum(text) {
  let value = 2166136261;
  for (let i = 0; i < text.length; i += 1) value = Math.imul(value ^ text.charCodeAt(i), 16777619);
  return (value >>> 0).toString(16);
}

export function createArchiveStorage(io = fileIO) {
  let manifest;
  let pointer;
  let confirmedDate;
  async function writeJSON(prefix, data) {
    const compressed = prefix.startsWith('month-');
    const text = JSON.stringify(data);
    const name = `${prefix}-${randomUUID()}.${compressed ? 'bin' : 'json'}`;
    await io.write(name, compressed ? gzipSync(strToU8(text)) : text);
    return { name, hash: checksum(text), ...(compressed ? { compressed: true } : {}) };
  }
  async function readJSON(ref) {
    if (!ref || !/^(manifest-|month-)[a-zA-Z0-9_.-]+\.(json|bin)$/.test(ref.name)) throw new Error('Yerel kayıt dizini geçersiz.');
    const text = ref.compressed ? expandGzip(await io.readBytes(ref.name), 1024 * 1024) : await io.read(ref.name);
    if (checksum(text) !== ref.hash) throw new Error('Yerel veri doğrulanamadı.');
    return JSON.parse(text);
  }
  async function readChunk(ref) { return (await readJSON(ref)).map(unpackRecord); }
  async function readMonths(months, source = manifest) {
    const records = [];
    for (const month of new Set(months)) for (const ref of source.months[month]?.chunks ?? []) {
      for (const record of await readChunk(ref)) records.push(record);
    }
    return records;
  }
  function view(data = manifest) {
    return { appointments: data.appointments, dailyEarnings: data.dailyEarnings, monthlyExpenses: data.monthlyExpenses,
      summaryMonths: data.summaryMonths ?? {}, retentionYear: data.retentionYear, recordMonths: Object.keys(data.months).sort() };
  }
  async function cleanup() {
    const keep = new Set();
    for (const ref of [pointer.current, pointer.previous].filter(Boolean)) {
      keep.add(ref.name);
      const data = await readJSON(ref);
      for (const month of Object.values(data.months)) for (const chunk of month.chunks) keep.add(chunk.name);
    }
    for (const name of await io.list()) if (/^(manifest-|month-).+\.(json|bin)$/.test(name) && !keep.has(name)) await io.remove(name);
  }
  async function publishManifest(data, retirePrevious = false) {
    const next = { ...data, generation: (manifest?.generation ?? 0) + 1, savedAt: new Date().toISOString() };
    const current = await writeJSON('manifest', next);
    const nextPointer = { current, ...(retirePrevious ? {} : { previous: pointer?.current }) };
    await io.setPointer(JSON.stringify(nextPointer));
    manifest = next;
    pointer = nextPointer;
    try { await cleanup(); } catch { /* Old files are retried after the next successful commit. */ }
    return view();
  }
  async function maintainCalendar() {
    const today = localDate();
    checkCalendar(manifest, today, confirmedDate === today);
    if (manifest.version === 3 && manifest.lastActiveDate === today) return null;
    const next = retainYear(manifest, today);
    // Prepare the complete UI view before activating any new disk state.
    const records = await readMonths([today.slice(0, 7)], next);
    await publishManifest(next, true);
    return { ...view(), financialRecords: records };
  }
  async function publish(state, changes) {
    const months = { ...manifest.months };
    for (const [month, records] of Object.entries(changes)) {
      if (!month.startsWith(String(manifest.retentionYear) + '-')) throw new ValidationError('Geçmiş yıl özetleri düzenlenemez.');
      if (!records.length) { delete months[month]; continue; }
      const chunks = [];
      for (let i = 0; i < records.length; i += chunkSize) {
        const packed = records.slice(i, i + chunkSize).map(packRecord);
        const old = manifest.months[month]?.chunks[i / chunkSize];
        chunks.push(old?.compressed && old.hash === checksum(JSON.stringify(packed)) ? old : await writeJSON(`month-${month}`, packed));
      }
      months[month] = { count: records.length, chunks };
    }
    return publishManifest({ ...manifest, appointments: state.appointments, dailyEarnings: state.dailyEarnings,
      monthlyExpenses: state.monthlyExpenses, months });
  }
  function validateManifest(data) {
    if (![2, 3].includes(data?.version) || !Array.isArray(data.appointments) || !data.months || !data.dailyEarnings || !data.monthlyExpenses) throw new Error('Yerel veri sürümü geçersiz.');
  }
  async function load() {
    const saved = await io.getPointer();
    if (saved) {
      pointer = JSON.parse(saved ?? 'null');
      manifest = await readJSON(pointer.current);
      validateManifest(manifest);
    } else {
      const files = await io.list();
      const legacy = await io.getLegacy();
      if (files.some(name => /^manifest-.+\.json$/.test(name)) || (!legacy && files.some(name => /^month-.+\.(json|bin)$/.test(name)))) {
        throw new Error('Arşiv var fakat dizini okunamadı. Mevcut dosyalar korundu.');
      }
      const old = migrateFinancialRecords({ appointments: [], dailyEarnings: {}, monthlyExpenses: {}, ...(legacy ? JSON.parse(legacy).state : {}) });
      const normalized = financialUpdate(old.financialRecords, old.appointments);
      if (!normalized) throw new Error('Eski mali veriler doğrulanamadı.');
      checkCalendar(normalized, localDate(), confirmedDate === localDate());
      const months = {};
      for (const record of old.financialRecords) {
        const month = record.date.slice(0, 7);
        if (month.startsWith(localDate().slice(0, 4) + '-')) (months[month] ??= []).push(record);
      }
      const descriptors = {};
      for (const [month, records] of Object.entries(months)) {
        const chunks = [];
        for (let i = 0; i < records.length; i += chunkSize) chunks.push(await writeJSON(`month-${month}`, records.slice(i, i + chunkSize).map(packRecord)));
        descriptors[month] = { chunks, count: records.length };
      }
      const next = retainYear({ ...normalized, months: descriptors }, localDate());
      const current = await readMonths([localDate().slice(0, 7)], next);
      await publishManifest(next, true);
      try { await io.removeLegacy(); await io.remove('migration-backup.json'); await io.cleanupRemovedFeatures?.(); } catch { /* Retry on the next successful load. */ }
      return { ...view(), financialRecords: current };
    }
    const updated = await maintainCalendar();
    const result = updated ?? { ...view(), financialRecords: await readMonths([localDate().slice(0, 7)]) };
    try { await io.removeLegacy(); await io.remove('migration-backup.json'); await io.cleanupRemovedFeatures?.(); await cleanup(); } catch { /* Retry on the next load. */ }
    return result;
  }
  async function recoverLocal() {
    const candidates = [];
    const saved = await io.getPointer();
    try { const p = JSON.parse(saved ?? 'null'); for (const ref of [p?.current, p?.previous, p?.checkpoint].filter(Boolean)) candidates.push(ref); } catch { /* Scan verified local generations below. */ }
    for (const name of await io.list()) if (/^manifest-.+\.json$/.test(name) && !candidates.some(ref => ref.name === name)) {
      try { const text = await io.read(name); const data = JSON.parse(text); candidates.push({ name, hash: checksum(text), generation: data.generation ?? 0, modified: await io.modified?.(name) ?? 0 }); } catch { /* Ignore incomplete candidates. */ }
    }
    candidates.sort((a, b) => (b.generation ?? Number.MAX_SAFE_INTEGER) - (a.generation ?? Number.MAX_SAFE_INTEGER) || (b.modified ?? 0) - (a.modified ?? 0));
    for (const ref of candidates) {
      try {
        const data = await readJSON(ref);
        validateManifest(data);
        for (const month of Object.values(data.months)) for (const chunk of month.chunks) await readJSON(chunk);
        await io.setPointer(JSON.stringify({ current: ref }));
        manifest = data;
        pointer = { current: ref };
        return true;
      } catch { /* Do not delete damaged or incomplete data. */ }
    }
    throw new Error('Doğrulanmış yerel kayıt bulunamadı. Mevcut dosyalar silinmedi.');
  }
  const report = createReportReader({ getManifest: () => manifest, readChunk });
  return { load, publish, readMonths, maintainCalendar, recoverLocal, report,
    confirmDate() { confirmedDate = localDate(); },
    async discardOrphans() { if (manifest && pointer) await cleanup(); },
    async findMonth(id, hint) {
      for (const month of [...new Set([hint, localDate().slice(0, 7), ...Object.keys(manifest.months)].filter(Boolean))]) {
        if ((await readMonths([month])).some(r => r.id === id)) return month;
      }
      return null;
    },
  };
}
export const archiveStorage = createArchiveStorage();
