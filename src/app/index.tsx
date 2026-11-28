import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Keyboard, KeyboardAvoidingView, Platform, Animated, Easing, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { useDemoProfile, type DemoProfile } from '../contexts/demoProfileContext';
import { FeedbackToast, type EstadoFeedback, type TipoFeedback } from '../components/FeedbackToast';

// === CONSTANTES E HELPERS ===
const ICONE_VIOLETA = require('../../assets/images/icon.png');

const BOLHAS_CONFIG = [
  { left: '10%', size: 14, duracao: 7200, atraso: 0, cor: 'rgba(167, 139, 250, 0.28)' },
  { left: '24%', size: 8, duracao: 5800, atraso: 1400, cor: 'rgba(124, 124, 255, 0.34)' },
  { left: '38%', size: 18, duracao: 8600, atraso: 600, cor: 'rgba(139, 92, 246, 0.22)' },
  { left: '54%', size: 10, duracao: 6400, atraso: 2200, cor: 'rgba(196, 181, 253, 0.30)' },
  { left: '68%', size: 16, duracao: 7800, atraso: 900, cor: 'rgba(99, 102, 241, 0.28)' },
  { left: '80%', size: 9, duracao: 6100, atraso: 1800, cor: 'rgba(167, 139, 250, 0.32)' },
  { left: '90%', size: 12, duracao: 7400, atraso: 300, cor: 'rgba(124, 124, 255, 0.26)' },
] as const;

const normalizarPerfil = (roleRaw: unknown): DemoProfile => {
  const cargo = String(roleRaw || '').toLowerCase();
  if (cargo.includes('prof')) return 'professor';
  if (cargo.includes('coord')) return 'coordenador';
  return 'admin';
};

const gerarIniciais = (nome: string) => {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return 'AD';
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return `${partes[0][0]}${partes[partes.length - 1][0]}`.toUpperCase();
};

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { setPerfil, setPerfilReal, setUsuarioLogado, setModoTema, temaAtivo: tema } = useDemoProfile();
  const bottomInset = Platform.OS === 'web' ? 0 : insets.bottom;

  // === ESTADOS ===
  const [alturaTeclado, setAlturaTeclado] = useState(0);
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [verSenha, setVerSenha] = useState(false);
  const [erroMsg, setErroMsg] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [feedback, setFeedback] = useState<EstadoFeedback>({ visivel: false, tipo: 'sucesso', titulo: '', mensagem: '' });

  const notificar = useCallback((tipo: TipoFeedback, titulo: string, mensagem: string) => {
    setFeedback({ visivel: true, tipo, titulo, mensagem });
  }, []);
  const fecharFeedback = useCallback(() => setFeedback(prev => ({ ...prev, visivel: false })), []);

  const isEscuro = tema.fundoBase !== '#FFFFFF' && tema.fundoBase !== '#F5F7FA';
  const alternarTema = () => setModoTema(isEscuro ? 'Claro' : 'Escuro');

  // === ANIMAÇÕES (ENTRADA + BOLHAS E ORBES FLUTUANTES) ===
  const fadeLogo = useRef(new Animated.Value(0)).current;
  const scaleLogo = useRef(new Animated.Value(0.82)).current;
  const slideCard = useRef(new Animated.Value(40)).current;
  const fadeCard = useRef(new Animated.Value(0)).current;
  const orbPulse = useRef(new Animated.Value(0)).current;
  const bolhasAnim = useRef(BOLHAS_CONFIG.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    const eventoMostrar = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const eventoEsconder = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const subShow = Keyboard.addListener(eventoMostrar, e => {
      setAlturaTeclado(e.endCoordinates?.height || 0);
    });
    const subHide = Keyboard.addListener(eventoEsconder, () => {
      setAlturaTeclado(0);
    });
    return () => {
      subShow.remove();
      subHide.remove();
    };
  }, []);

  useEffect(() => {
    fadeLogo.setValue(0);
    scaleLogo.setValue(0.82);
    slideCard.setValue(40);
    fadeCard.setValue(0);

    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeLogo, { toValue: 1, duration: 500, useNativeDriver: false }),
        Animated.spring(scaleLogo, { toValue: 1, friction: 6, tension: 85, useNativeDriver: false }),
      ]),
      Animated.parallel([
        Animated.timing(fadeCard, { toValue: 1, duration: 420, useNativeDriver: false }),
        Animated.timing(slideCard, { toValue: 0, duration: 480, useNativeDriver: false }),
      ]),
    ]).start();

    const loopOrb = Animated.loop(
      Animated.sequence([
        Animated.timing(orbPulse, { toValue: 1, duration: 4200, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
        Animated.timing(orbPulse, { toValue: 0, duration: 4200, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
      ])
    );
    loopOrb.start();

    const loopsBolhas = bolhasAnim.map((anim, i) => {
      const cfg = BOLHAS_CONFIG[i];
      const loop = Animated.loop(
        Animated.sequence([
          Animated.delay(cfg.atraso),
          Animated.timing(anim, { toValue: 1, duration: cfg.duracao, easing: Easing.linear, useNativeDriver: false }),
          Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: false }),
        ])
      );
      loop.start();
      return loop;
    });

    return () => {
      loopOrb.stop();
      loopsBolhas.forEach(l => l.stop());
    };
  }, [fadeLogo, scaleLogo, slideCard, fadeCard, orbPulse, bolhasAnim]);

  const orbFloatY = orbPulse.interpolate({ inputRange: [0, 1], outputRange: [0, 14] });
  const orbFloatYInv = orbPulse.interpolate({ inputRange: [0, 1], outputRange: [0, -14] });

  // === AUTENTICAÇÃO E DETECÇÃO DE PERFIL ===
  const resolverDadosUsuario = async (uid: string, emailDigitado: string) => {
    const emailLimpo = emailDigitado.trim().toLowerCase();
    try {
      const porUid = await getDoc(doc(db, 'usuarios', uid));
      if (porUid.exists()) {
        const d = porUid.data() as any;
        if (d.ativo === false || d.situacao === 'Inativo') throw new Error('CONTA_INATIVA');
        const nome = String(d.nome || emailLimpo.split('@')[0] || 'Usuário');
        return { perfil: normalizarPerfil(d.role ?? d.perfil), nome, email: String(d.email || emailLimpo) };
      }
      if (emailLimpo) {
        const snapEmail = await getDocs(query(collection(db, 'usuarios'), where('email', '==', emailLimpo)));
        if (!snapEmail.empty) {
          const d = snapEmail.docs[0].data() as any;
          if (d.ativo === false || d.situacao === 'Inativo') throw new Error('CONTA_INATIVA');
          const nome = String(d.nome || emailLimpo.split('@')[0] || 'Usuário');
          return { perfil: normalizarPerfil(d.role ?? d.perfil), nome, email: String(d.email || emailLimpo) };
        }
      }
    } catch (err: any) {
      if (err?.message === 'CONTA_INATIVA') throw err;
    }
    const perfilFallback: DemoProfile = emailLimpo.includes('prof') ? 'professor' : emailLimpo.includes('coord') ? 'coordenador' : 'admin';
    const nomeFallback = emailLimpo.split('@')[0] || 'Usuário';
    return { perfil: perfilFallback, nome: nomeFallback.charAt(0).toUpperCase() + nomeFallback.slice(1), email: emailLimpo };
  };

  const fazerLogin = async () => {
    if (!email.trim() || !senha.trim()) {
      const msg = 'Preencha o e-mail e a senha.';
      setErroMsg(msg);
      return notificar('aviso', 'Campos obrigatórios', msg);
    }
    setErroMsg('');
    setCarregando(true);
    try {
      const credencial = await signInWithEmailAndPassword(auth, email.trim(), senha);
      const dados = await resolverDadosUsuario(credencial.user.uid, email);
      setPerfil(dados.perfil);
      setPerfilReal(dados.perfil);
      setUsuarioLogado({ nome: dados.nome, email: dados.email, iniciais: gerarIniciais(dados.nome) });
      router.replace('/(tabs)');
    } catch (error: any) {
      let msg = 'Erro de conexão. Tente novamente.';
      if (error?.message === 'CONTA_INATIVA') msg = 'Esta conta está inativa. Contate a coordenação ou administração.';
      else if (error?.code === 'auth/invalid-credential' || error?.code === 'auth/wrong-password' || error?.code === 'auth/user-not-found') msg = 'E-mail ou senha incorretos.';
      else if (error?.code === 'auth/invalid-email') msg = 'Formato de e-mail inválido.';
      setErroMsg(msg);
      notificar('erro', 'Falha no acesso', msg);
    } finally {
      setCarregando(false);
    }
  };

  const tecladoAberto = alturaTeclado > 0;

  // === INTERFACE ===
  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: '#16092B' }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar style="light" />

      {/* Topo Atmosférico Animado (Roxo da Meia-Noite + Bolhas Azul-Galáxia) */}
      <View style={[styles.topSection, tecladoAberto && { flex: 0.24, paddingTop: 12 }]}>
        <Animated.View style={[styles.orbVioleta, { transform: [{ translateY: orbFloatY }] }]} pointerEvents="none" />
        <Animated.View style={[styles.orbGalaxia, { transform: [{ translateY: orbFloatYInv }] }]} pointerEvents="none" />

        {BOLHAS_CONFIG.map((cfg, idx) => {
          const anim = bolhasAnim[idx];
          const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [30, -340] });
          const opacity = anim.interpolate({ inputRange: [0, 0.18, 0.78, 1], outputRange: [0, 0.85, 0.65, 0] });
          const scale = anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.7, 1.08, 0.9] });
          return (
            <Animated.View
              key={idx}
              pointerEvents="none"
              style={[
                styles.bolha,
                {
                  left: cfg.left,
                  width: cfg.size,
                  height: cfg.size,
                  borderRadius: cfg.size / 2,
                  backgroundColor: cfg.cor,
                  opacity,
                  transform: [{ translateY }, { scale }],
                },
              ]}
            />
          );
        })}

        <TouchableOpacity style={[styles.btnTema, { top: Math.max(insets.top + 8, 20) }]} onPress={alternarTema} activeOpacity={0.75} accessibilityLabel="Alternar tema">
          <Ionicons name={isEscuro ? 'sunny' : 'moon'} size={20} color="#F4F3FF" />
        </TouchableOpacity>

        <Animated.View style={{ opacity: fadeLogo, transform: [{ scale: tecladoAberto ? 0.72 : scaleLogo }], alignItems: 'center' }}>
          {!tecladoAberto && (
            <View style={styles.logoHalo}>
              <View style={styles.logoContainer}>
                <Image source={ICONE_VIOLETA} style={styles.logoImagem} resizeMode="cover" />
              </View>
            </View>
          )}
          <Text style={[styles.tituloLogo, tecladoAberto && { fontSize: 22, letterSpacing: 2.5 }]}>VIOLETA</Text>
          {!tecladoAberto && (
            <View style={styles.pillSubtitulo}>
              <Text style={styles.subtituloLogo}>GESTÃO EDUCACIONAL</Text>
            </View>
          )}
        </Animated.View>
      </View>

      {/* Card Inferior de Login */}
      <Animated.View
        style={[
          styles.bottomSection,
          {
            flex: tecladoAberto ? 0.76 : 0.55,
            paddingTop: tecladoAberto ? 20 : 30,
            paddingBottom: tecladoAberto ? 16 : bottomInset,
            backgroundColor: isEscuro ? '#130F21' : tema.fundoBase,
            borderTopColor: isEscuro ? 'rgba(124, 124, 255, 0.35)' : 'rgba(79, 70, 229, 0.18)',
            opacity: fadeCard,
            transform: [{ translateY: slideCard }],
          },
        ]}
      >
        <View style={styles.formWrapper}>
          <Text style={[styles.saudacao, { color: tema.textoPrincipal }]}>Bem-vindo!</Text>
          <Text style={[styles.textoInstrucao, { color: tema.textoSecundario, marginBottom: tecladoAberto ? 14 : 22 }]}>Acesse sua conta docente, coordenação ou gestão</Text>

          <View style={[styles.inputContainer, { backgroundColor: tema.inputBackground, borderColor: tema.borda }]}>
            <Ionicons name="mail-outline" size={20} color={tema.botaoPrimario} style={styles.iconeInput} />
            <TextInput
              style={[styles.input, { color: tema.textoPrincipal }]}
              placeholder="E-mail institucional"
              placeholderTextColor={tema.textoSecundario}
              value={email}
              onChangeText={t => { setEmail(t); if (erroMsg) setErroMsg(''); }}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View style={[styles.inputContainer, { backgroundColor: tema.inputBackground, borderColor: tema.borda }]}>
            <Ionicons name="lock-closed-outline" size={20} color={tema.botaoPrimario} style={styles.iconeInput} />
            <TextInput
              style={[styles.input, { color: tema.textoPrincipal }]}
              placeholder="Senha"
              placeholderTextColor={tema.textoSecundario}
              secureTextEntry={!verSenha}
              value={senha}
              onChangeText={t => { setSenha(t); if (erroMsg) setErroMsg(''); }}
            />
            <TouchableOpacity onPress={() => setVerSenha(!verSenha)} style={styles.olhoIcon}>
              <Ionicons name={verSenha ? 'eye-off-outline' : 'eye-outline'} size={20} color={tema.icone} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={[styles.btnEsqueci, tecladoAberto && { marginBottom: 12 }]} onPress={() => notificar('aviso', 'Recuperação de senha', 'Solicite a redefinição à coordenação ou administração da instituição.')}>
            <Text style={[styles.textoEsqueci, { color: tema.botaoPrimario }]}>Esqueci minha senha</Text>
          </TouchableOpacity>

          {!!erroMsg && (
            <View style={styles.erroBox}>
              <Ionicons name="alert-circle" size={16} color="#EF4444" />
              <Text style={styles.erroTexto}>{erroMsg}</Text>
            </View>
          )}

          <TouchableOpacity style={[styles.btnEntrar, { backgroundColor: tema.botaoPrimario, opacity: carregando ? 0.7 : 1 }]} activeOpacity={0.85} onPress={() => void fazerLogin()} disabled={carregando}>
            <Text style={[styles.textoBtnEntrar, { color: tema.textoBotao }]}>{carregando ? 'Entrando...' : 'Entrar'}</Text>
          </TouchableOpacity>

          {!tecladoAberto && (
            <View style={[styles.rodapeContainer, { paddingBottom: Math.max(12, bottomInset) }]}>
              <Text style={[styles.rodape, { color: tema.textoSecundario }]}>Plataforma Violeta ©</Text>
            </View>
          )}
        </View>
      </Animated.View>

      <FeedbackToast feedback={feedback} onFechar={fecharFeedback} fundoCard={tema.fundoTopo} textoPrincipal={tema.textoPrincipal} textoSecundario={tema.textoSecundario} />
    </KeyboardAvoidingView>
  );
}

// === ESTILOS ===
const styles = StyleSheet.create({
  container: { flex: 1 },
  topSection: { flex: 0.45, justifyContent: 'center', alignItems: 'center', position: 'relative', paddingHorizontal: 20, overflow: 'hidden' },
  orbVioleta: { position: 'absolute', width: 320, height: 320, borderRadius: 160, backgroundColor: 'rgba(139, 92, 246, 0.24)', top: -90, left: -70 },
  orbGalaxia: { position: 'absolute', width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(79, 70, 229, 0.30)', bottom: -100, right: -60 },
  bolha: { position: 'absolute', bottom: -10, borderWidth: 1, borderColor: 'rgba(221, 214, 254, 0.25)' },
  btnTema: { position: 'absolute', top: 44, right: 20, width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center', zIndex: 10, backgroundColor: 'rgba(124, 124, 255, 0.22)', borderWidth: 1, borderColor: 'rgba(196, 181, 253, 0.35)' },
  logoHalo: { padding: 8, borderRadius: 34, backgroundColor: 'rgba(124, 124, 255, 0.16)', borderWidth: 1, borderColor: 'rgba(167, 139, 250, 0.35)', marginBottom: 14 },
  logoContainer: { width: 118, height: 118, borderRadius: 28, overflow: 'hidden', borderWidth: 2, borderColor: 'rgba(196, 181, 253, 0.65)', elevation: 12, shadowColor: '#7C7CFF', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.45, shadowRadius: 14 },
  logoImagem: { width: '100%', height: '100%' },
  tituloLogo: { fontSize: 30, fontWeight: '900', letterSpacing: 4, color: '#FFFFFF' },
  pillSubtitulo: { marginTop: 6, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, backgroundColor: 'rgba(124, 124, 255, 0.2)', borderWidth: 1, borderColor: 'rgba(196, 181, 253, 0.28)' },
  subtituloLogo: { fontSize: 10, fontWeight: '800', letterSpacing: 1.6, color: '#DDD6FE' },
  bottomSection: { flex: 0.55, borderTopLeftRadius: 32, borderTopRightRadius: 32, borderTopWidth: 1.5, paddingHorizontal: 24, paddingTop: 30, alignItems: 'center', elevation: 16, shadowColor: '#4F46E5', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.2, shadowRadius: 12 },
  formWrapper: { width: '100%', maxWidth: 460, flex: 1 },
  saudacao: { fontSize: 25, fontWeight: '800' },
  textoInstrucao: { fontSize: 14, marginTop: 4, marginBottom: 22 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', width: '100%', height: 54, borderWidth: 1.2, borderRadius: 14, paddingHorizontal: 14, marginBottom: 14 },
  iconeInput: { marginRight: 10 },
  input: { flex: 1, height: '100%', fontSize: 15 },
  olhoIcon: { padding: 6 },
  btnEsqueci: { alignSelf: 'flex-end', marginBottom: 18 },
  textoEsqueci: { fontSize: 13, fontWeight: '700' },
  erroBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 14 },
  erroTexto: { color: '#EF4444', fontSize: 13, fontWeight: '700' },
  btnEntrar: { width: '100%', height: 54, borderRadius: 14, justifyContent: 'center', alignItems: 'center', elevation: 6, shadowColor: '#6366F1', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 8 },
  textoBtnEntrar: { fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },
  rodapeContainer: { marginTop: 'auto', paddingBottom: 22, alignItems: 'center' },
  rodape: { fontSize: 12, opacity: 0.75 },
});