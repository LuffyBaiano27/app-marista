import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { auth } from '../config/firebase';
import { useAuth } from '../contexts/authContext';
import type { IdentidadeGrade } from '../services/turmas';
import { classificarErroGrade } from '../types/turma';

type Consulta<T> = (identidade: IdentidadeGrade, vigente: () => boolean) => Promise<T>;
export function useLeituraAcademica<T>(consulta: Consulta<T>, chave = '') {
  const { usuario, dadosPerfil, statusPerfil } = useAuth();
  const role = dadosPerfil?.role;
  const [estado, setEstado] = useState<{ usuario: typeof usuario; role?: string; chave: string;
    dados: T | null; carregando: boolean; erro: ReturnType<typeof classificarErroGrade> | null }>(
    { usuario: null, chave, dados: null, carregando: true, erro: null });
  const versao = useRef(0);
  const focada = useRef(false);
  const atualizar = useCallback(async () => {
    const atual = ++versao.current;
    const base = { usuario, role, chave, dados: null };
    setEstado({ ...base, carregando: true, erro: null });
    const vigente = () => focada.current && versao.current === atual && auth.currentUser === usuario;
    if (!usuario || !role || statusPerfil !== 'disponivel') {
      setEstado({ ...base, carregando: false, erro: classificarErroGrade({ code: 'permission-denied' }) });
      return;
    }
    try {
      const dados = await consulta({ uid: usuario.uid, role }, vigente);
      if (vigente()) setEstado({ ...base, dados, carregando: false, erro: null });
    } catch (erro) {
      if (vigente()) setEstado({ ...base, carregando: false, erro: classificarErroGrade(erro) });
    }
  }, [usuario, role, chave, consulta, statusPerfil]);
  useFocusEffect(useCallback(() => {
    focada.current = true;
    void atualizar();
    return () => { focada.current = false; ++versao.current; };
  }, [atualizar]));
  const atual = estado.usuario === usuario && estado.role === role && estado.chave === chave && statusPerfil === 'disponivel';
  return { dados: atual ? estado.dados : null, erro: atual ? estado.erro : null,
    carregando: !atual || estado.carregando, atualizar };
}
