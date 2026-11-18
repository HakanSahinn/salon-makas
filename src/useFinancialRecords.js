import { useEffect, useState } from 'react';
import { useStore } from './store/useStore';

export function useFinancialRecords(months) {
  const revision = useStore((state) => state.archiveRevision);
  const read = useStore((state) => state.readFinancialRecords);
  const [retry, setRetry] = useState(0);
  const key = [...new Set(months)].sort().join(',');
  const [result, setResult] = useState({ key: '', revision: -1, retry: -1, records: /** @type {import('./types').FinancialRecord[]} */ ([]), error: '', loading: true });
  useEffect(() => {
    let active = true;
    read(key ? key.split(',') : []).then(
      (records) => { if (active) setResult({ key, revision, retry, records, error: '', loading: false }); },
      () => { if (active) setResult({ key, revision, retry, records: [], error: 'Mali kayıtlar okunamadı. Tekrar deneyin.', loading: false }); },
    );
    return () => { active = false; };
  }, [key, revision, retry, read]);
  const stale = result.key !== key || result.revision !== revision || result.retry !== retry;
  return { records: stale ? [] : result.records, loading: stale || result.loading, error: stale ? '' : result.error,
    reload: () => setRetry((value) => value + 1) };
}
