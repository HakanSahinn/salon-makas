import { useEffect, useState } from 'react';
import { ValidationError } from './validation';
import { useStore } from './store/useStore';

export function useFinancialReport(query) {
  const revision = useStore(state => state.archiveRevision);
  const read = useStore(state => state.readFinancialReport);
  const [retry, setRetry] = useState(0);
  const key = JSON.stringify({ ...query, revision, retry });
  const [result, setResult] = useState(/** @type {{key: string, report: import('./types').FinancialReport | null, error: string} | null} */ (null));
  useEffect(() => {
    let active = true;
    read(JSON.parse(key), () => !active).then(
      report => { if (active) setResult({ key, report, error: '' }); },
      error => { if (active) setResult({ key, report: null, error: error instanceof ValidationError ? error.message : 'Rapor okunamadı. Tekrar deneyin.' }); },
    );
    return () => { active = false; };
  }, [key, read]);
  return { loading: result?.key !== key, report: result?.key === key ? result.report : null,
    error: result?.key === key ? result.error : '', reload: () => setRetry(value => value + 1) };
}
