import { useEffect, useRef, useState } from 'react';
import { useNavigation, usePreventRemove } from '@react-navigation/native';
import { ValidationError } from './validation';

export function useSaveAction() {
  const navigation = useNavigation();
  const locked = useRef(false);
  const [saving, setSaving] = useState(false);
  const [finished, setFinished] = useState(false);
  const [saveError, setSaveError] = useState('');

  usePreventRemove(saving && !finished, () => {});
  useEffect(() => {
    if (finished) navigation.goBack();
  }, [finished, navigation]);

  async function runSave(operation) {
    if (locked.current) return;
    locked.current = true;
    setSaveError('');
    setSaving(true);
    try {
      const saved = await operation();
      if (!saved) {
        setSaveError('İşlem yapılamadı. Bilgileri kontrol edip tekrar dene.');
        locked.current = false;
        setSaving(false);
      } else {
        setFinished(true);
      }
    } catch (error) {
      setSaveError(error instanceof ValidationError
        ? error.message
        : 'Telefona kaydedilemedi. İşlemi tekrar deneyebilirsin.');
      locked.current = false;
      setSaving(false);
    }
  }

  return { saving, saveError, runSave };
}
