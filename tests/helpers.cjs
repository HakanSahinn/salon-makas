
const fs = require('node:fs');
const path = require('node:path');

const { transformSync } = require('@babel/core');

function setup(initialState = {}, options = {}) {
  let today = options.today ?? '2026-11-17';
  let saved = JSON.stringify({
    state: { appointments: [], dailyEarnings: {}, ...initialState },
    version: 0,
  });
  let pointer = null;
  const files = new Map();
  const reads = [];
  const storage = {
    failNext: false,
    gate: null,
    getItem: async () => saved,
    setItem: async (_, value) => {
      if (storage.gate) await storage.gate;
      if (storage.failNext) {
        storage.failNext = false;
        throw new Error('Storage full');
      }
      saved = value;
    },
    removeItem: async () => { saved = null; },
  };
  const fileIO = {
    getPointer: async () => pointer,
    setPointer: async (value) => {
      if (storage.gate) await storage.gate;
      if (storage.failNext) { storage.failNext = false; throw new Error('Storage full'); }
      pointer = value;
    },
    getLegacy: async () => saved,
    removeLegacy: async () => { saved = null; },
    readBytes: async (name) => { reads.push(name); if (!files.has(name)) throw new Error('Missing file'); const value = files.get(name); return typeof value === 'string' ? new TextEncoder().encode(value) : value; },
    freeBytes: () => 1024 * 1024 * 1024,
    read: async (name) => { reads.push(name); if (!files.has(name)) throw new Error('Missing file'); return files.get(name); },
    write: async (name, value) => { files.set(name, value); },
    list: async () => [...files.keys()],
    size: async (name) => typeof files.get(name) === 'string' ? new TextEncoder().encode(files.get(name)).length : files.get(name).length,
    remove: async (name) => { files.delete(name); },
  };
  function disk() {
    if (!pointer) return JSON.parse(saved).state;
    const manifest = JSON.parse(files.get(JSON.parse(pointer).current.name));
    const records = Object.values(manifest.months).flatMap(month => month.chunks.flatMap(ref => JSON.parse(ref.compressed ? require('fflate').strFromU8(require('fflate').gunzipSync(files.get(ref.name))) : files.get(ref.name)).map(row => ({
      id: row[0], date: row[1], amountKurus: row[2], type: row[3] === 0 ? 'income' : 'expense',
      ...(row[4] == null ? {} : { category: row[4] }), ...(row[5] == null ? {} : { appointmentId: row[5] }), ...(row[6] ? { legacy: true } : {}),
    }))));
    return { appointments: manifest.appointments, dailyEarnings: manifest.dailyEarnings, monthlyExpenses: manifest.monthlyExpenses, summaryMonths: manifest.summaryMonths, retentionYear: manifest.retentionYear, financialRecords: records };
  }
  function moduleLoader() {
    const cache = new Map();
    function load(file) {
      const filename = path.resolve(file);
      if (cache.has(filename)) return cache.get(filename).exports;
      const code = transformSync(fs.readFileSync(filename, 'utf8'), {
        plugins: ['@babel/plugin-transform-modules-commonjs'],
      }).code;
      const module = { exports: {} };
      cache.set(filename, module);
      function resolve(name) {
        if (name === '@react-native-async-storage/async-storage') return storage;
        if (name.endsWith('/fileIO')) return { fileIO };
        if (name === 'expo-crypto') return require('node:crypto');
        if (name.endsWith('/dates')) return {
          localDate: (date) => date
            ? [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-')
            : today,
          isValidDate: (date) => typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)
            && !Number.isNaN(new Date(date + 'T12:00:00').getTime())
            && new Date(date + 'T12:00:00').toISOString().slice(0, 10) === date,
        };
        if (name.startsWith('.')) return load(path.join(path.dirname(filename), name + '.js'));
        return require(name);
      }
      new Function('module', 'exports', 'require', code)(module, module.exports, resolve);
      return module.exports;
    }
    return load;
  }
  return {
    storage, fileIO, files, reads,
    pointer: () => pointer,
    setToday: value => { today = value; },
    restart: () => { const store = moduleLoader()('src/store/useStore.js').useStore; if (!options.checkCalendar) store.getState().confirmCalendarDate(); return store; },
    load: (file) => moduleLoader()(file),
    disk,
  };
}


module.exports = { setup };

