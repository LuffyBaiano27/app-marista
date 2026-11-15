import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { auth, db } from '../config/firebase';
import { useAuth } from '../contexts/authContext';
import { buscarGradeTurmas, type GradeTurmas } from '../services/turmas';
import { useCalendarioBahia } from './use-calendario-bahia';
import { calendarioBahia } from '../utils/calendario';
import { classificarErroGrade } from '../types/turma';

const vazia: GradeTurmas = { turmas: [], chamadasHoje: {}, diariosHoje: {}, turmasInvalidas: 0 };
type ErroGrade = ReturnType<typeof classificarErroGrade>;

export function useGradeTurmas() {
  const calendario = useCalendarioBahia();
  const data = calendario.data;
  const { usuario, dadosPerfil, statusPerfil } = useAuth();
  const [estado, setEstado] = useState<{ sessao: typeof usuario; role?: string; data: string;
    grade: GradeTurmas; carregando: boolean; erro: ErroGrade | null }>({
    sessao: null, data, grade: vazia, carregando: true, erro: null,
  });
  const versao = useRef(0);
  const focada = useRef(false);
  const role = dadosPerfil?.role;

  const atualizar = useCallback(async () => {
    const atual = ++versao.current;
    setEstado({ sessao: usuario, role, data, grade: vazia, carregando: true, erro: null });
    const vigente = () => focada.current && atual === versao.current && auth.currentUser === usuario && calendarioBahia().data === data;
    if (!usuario || !role || statusPerfil !== 'disponivel') {
      setEstado({ sessao: usuario, role, data, grade: vazia, carregando: false,
        erro: classificarErroGrade({ code: 'permission-denied' }) });
      return;
    }
    try {
      const grade = await buscarGradeTurmas(db, { uid: usuario.uid, role }, data, vigente);
      if (vigente()) setEstado({ sessao: usuario, role, data, grade, carregando: false, erro: null });
    } catch (erro) {
      if (vigente()) setEstado({ sessao: usuario, role, data, grade: vazia, carregando: false,
        erro: classificarErroGrade(erro) });
    }
  }, [usuario, role, statusPerfil, data]);

  useFocusEffect(useCallback(() => {
    focada.current = true;
    void atualizar();
    return () => { focada.current = false; ++versao.current; };
  }, [atualizar]));

  // Evita expor dados antigos inclusive no render anterior à execução do efeito.
  const mesmaSessao = estado.sessao === usuario && estado.role === role && estado.data === data && statusPerfil === 'disponivel';
  return {
    ...(mesmaSessao ? estado.grade : vazia),
    carregando: !mesmaSessao || estado.carregando,
    erro: mesmaSessao ? estado.erro : null,
    atualizar,
    calendario,
  };
}
