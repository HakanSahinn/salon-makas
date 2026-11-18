import { isValidDate, localDate } from './dates';

export class ValidationError extends Error {}

export function validateAppointmentSlot(appointments, date, time, excludeId) {
  if (!isValidDate(date) || date < localDate()) throw new ValidationError('Bugünü veya ileri bir tarih seç.');
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new ValidationError('Geçerli bir saat seç.');
  const original = appointments.find((item) => item.id === excludeId);
  if (time !== original?.time && !time.endsWith(':00') && !time.endsWith(':30')) {
    throw new ValidationError('Saat veya buçuk saat seç.');
  }
  if (appointments.some((item) => item.id !== excludeId && item.date === date && item.time === time)) {
    throw new ValidationError('Bu tarih ve saatte başka bir randevu var. Başka bir saat seç.');
  }
}
