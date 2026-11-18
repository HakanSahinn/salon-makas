import { Calendar, LocaleConfig } from 'react-native-calendars';
import { colors } from '../ui';

LocaleConfig.locales.tr = {
  monthNames: ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'],
  monthNamesShort: ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'],
  dayNames: ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'],
  dayNamesShort: ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'],
  today: 'Bugün',
};
LocaleConfig.defaultLocale = 'tr';

/** @type {import('react-native-calendars/src/types').Theme} */
const calendarTheme = {
  calendarBackground: colors.surface,
  monthTextColor: colors.ink,
  textMonthFontWeight: '800',
  textMonthFontSize: 17,
  textSectionTitleColor: colors.muted,
  textDayHeaderFontWeight: '700',
  textDayHeaderFontSize: 12,
  dayTextColor: colors.ink,
  textDayFontWeight: '500',
  textDisabledColor: '#A5AAA1',
  todayTextColor: colors.forest,
  todayBackgroundColor: colors.sage,
  selectedDayBackgroundColor: colors.forest,
  selectedDayTextColor: colors.surface,
  dotColor: colors.forest,
  selectedDotColor: colors.amber,
  arrowColor: colors.forest,
};

/** @param {{initialDate?: string, markedDates?: object, minDate?: string, maxDate?: string, onSelectDate: (date: string) => void}} props */
export function AppointmentCalendar({ initialDate, markedDates, minDate, maxDate, onSelectDate }) {
  return (
    <Calendar
      firstDay={1}
      hideExtraDays
      initialDate={initialDate}
      minDate={minDate}
      maxDate={maxDate}
      markedDates={markedDates}
      disableAllTouchEventsForDisabledDays
      onDayPress={day => {
        if ((!minDate || day.dateString >= minDate) && (!maxDate || day.dateString <= maxDate)) onSelectDate(day.dateString);
      }}
      theme={calendarTheme}
    />
  );
}
