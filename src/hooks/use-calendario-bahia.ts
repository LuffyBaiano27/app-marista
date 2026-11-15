import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { calendarioBahia } from '../utils/calendario';

export function useCalendarioBahia() {
  const [agora, setAgora] = useState(() => new Date());
  const calendario = calendarioBahia(agora);
  useEffect(() => {
    const atualizar = () => setAgora(new Date());
    const timer = setTimeout(atualizar, Math.max(1, calendario.fim.getTime() - Date.now()));
    const evento = AppState.addEventListener('change', estado => { if (estado === 'active') atualizar(); });
    return () => { clearTimeout(timer); evento.remove(); };
  }, [agora, calendario.data]);
  useFocusEffect(useCallback(() => { setAgora(new Date()); }, []));
  return calendario;
}
