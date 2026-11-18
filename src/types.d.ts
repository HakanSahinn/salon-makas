import type { StoreApi, UseBoundStore } from 'zustand';

export interface Appointment {
  id: string;
  date: string;
  time: string;
  customerName: string;
  status: 'bekliyor' | 'tamamlandi';
  earnedKurus?: number;
  earningsDate?: string;
}
export interface FinancialRecord {
  id: string;
  type: 'income' | 'expense';
  date: string;
  amountKurus: number | null;
  category?: string;
  appointmentId?: string;
  legacy?: boolean;
}
export interface FinancialReport {
  income: number;
  expense: number;
  profit: number;
  categories: Record<string, number>;
  skipped: number;
  totalRecords: number;
  rows: FinancialRecord[];
  summaryOnly: boolean;
  nextCursor: { date: string; id: string } | null;
}
export interface ReportQuery {
  range: { start: string; end: string };
  today: string;
  period: string;
  cursor?: { date: string; id: string } | null;
}
export interface SalonState {
  appointments: Appointment[];
  dailyEarnings: Record<string, number>;
  monthlyExpenses: Record<string, Record<string, number>>;
  financialRecords: FinancialRecord[];
  summaryMonths: Record<string, { income: number; expense: number }>;
  retentionYear: number;
  recordMonths: string[];
  archiveRevision: number;
  addAppointment(input: Pick<Appointment, 'customerName' | 'date' | 'time'>): Promise<boolean>;
  completeAppointment(id: string, amount?: number | null): Promise<boolean>;
  rescheduleAppointment(id: string, date: string, time: string): Promise<boolean>;
  deleteAppointment(id: string): Promise<boolean>;
  removePastAppointments(today: string): Promise<boolean>;
  addExpense(category: string, amount: number): Promise<boolean>;
  updateFinancialRecord(id: string, amount: number, category?: string, month?: string): Promise<boolean>;
  deleteFinancialRecord(id: string, month?: string): Promise<boolean>;
  readFinancialRecords(months: string[]): Promise<FinancialRecord[]>;
  readFinancialReport(query: ReportQuery, cancelled?: () => boolean): Promise<FinancialReport | null>;
  maintainCalendar(): Promise<boolean>;
  recoverLocal(): Promise<boolean>;
  confirmCalendarDate(): void;
}
export type SalonBoundStore = UseBoundStore<StoreApi<SalonState>> & {
  persist: { rehydrate(): Promise<void> | void; hasHydrated(): boolean };
};
export type RootStackParams = {
  Main: undefined;
  AddAppointment: { date?: string } | undefined;
  EditAppointment: { id: string };
  CompleteAppointment: { id: string };
  AddExpense: undefined;
  FinancialRecords: { month: string };
  Reports: { month?: string; period?: string } | undefined;
  EditFinancialRecord: { id: string; month: string; record: FinancialRecord };
};
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParams { Today: undefined; Calendar: undefined; Earnings: undefined; }
  }
}
