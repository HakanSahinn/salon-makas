import { ValidationError } from '../validation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Directory, File, Paths } from 'expo-file-system';

const directory = () => new Directory(Paths.document, 'salon-makas-data');
const file = (name) => {
  if (!/^[a-zA-Z0-9_.-]+$/.test(name)) throw new Error('Geçersiz yerel dosya adı.');
  return new File(directory(), name);
};

export const fileIO = {
  getPointer: () => AsyncStorage.getItem('salon-makas-archive-v2'),
  setPointer: (value) => AsyncStorage.setItem('salon-makas-archive-v2', value),
  getLegacy: () => AsyncStorage.getItem('berber-randevulari'),
  removeLegacy: () => AsyncStorage.removeItem('berber-randevulari'),
  async readBytes(name) { return file(name).bytes(); },
  freeBytes: () => Paths.availableDiskSpace,
  async read(name) { return file(name).text(); },
  async write(name, text) {
    const bytes = typeof text === 'string' ? new TextEncoder().encode(text).length : text.length;
    if (Paths.availableDiskSpace < bytes + 5 * 1024 * 1024) throw new ValidationError('Telefonda yeterli boş alan yok. Biraz alan açıp tekrar deneyin; mevcut kayıtlar korundu.');
    directory().create({ intermediates: true, idempotent: true });
    const target = file(name);
    target.create({ overwrite: true });
    await target.write(text);
    if (typeof text === 'string') {
      if (await target.text() !== text) throw new Error('Telefona yazılan veri doğrulanamadı.');
    } else {
      const check = await target.bytes();
      if (check.length !== text.length || !check.every((value, index) => value === text[index])) throw new Error('Telefona yazılan veri doğrulanamadı.');
    }
  },
  async list() { return directory().exists ? directory().list().map((entry) => entry.name) : []; },
  async remove(name) { if (file(name).exists) file(name).delete(); },
  async modified(name) { return file(name).modificationTime ?? 0; },
  async cleanupRemovedFeatures() {
    for (const name of ['salon-makas-before-restore.smk', 'salon-makas-before-restore.json', 'salon-makas-before-restore.pending']) {
      const old = new File(Paths.document, name);
      if (old.exists) old.delete();
    }
  },
  async size(name) { return file(name).size; },
};
