import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { useDemoProfile } from '../contexts/demoProfileContext';
import { FeedbackToast, type EstadoFeedback, type TipoFeedback } from '../components/FeedbackToast';

export default function LoginScreen() {
  const router = useRouter();
  const { setModoTema, temaAtivo: tema } = useDemoProfile();

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

  const fadeLogo = useRef(new Animated.Value(0)).current;
  const scaleLogo = useRef(new Animated.Value(0.78)).current;
  const slideCard = useRef(new Animated.Value(42)).current;
  const fadeCard = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fadeLogo.setValue(0);
    scaleLogo.setValue(0.78);
    slideCard.setValue(42);
    fadeCard.setValue(0);

    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeLogo, { toValue: 1, duration: 550, useNativeDriver: false }),
        Animated.spring(scaleLogo, { toValue: 1, friction: 6, tension: 85, useNativeDriver: false }),
      ]),
      Animated.parallel([
        Animated.timing(fadeCard, { toValue: 1, duration: 450, useNativeDriver: false }),
        Animated.timing(slideCard, { toValue: 0, duration: 500, useNativeDriver: false }),
      ]),
    ]).start();
  }, [fadeLogo, scaleLogo, slideCard, fadeCard]);

  const criarAdminMaster = async () => {
    if (carregando) return;
    setCarregando(true);
    try {
      const nomeAdmin = 'Luffy Baiano';
      const cpfAdmin = '123.456.789-00';
      const emailAdmin = 'admin@violeta.com';
      const senhaGerada = `${cpfAdmin.substring(0, 3)}@${nomeAdmin[0].toUpperCase()}${nomeAdmin[1].toLowerCase()}`;

      const userCredential = await createUserWithEmailAndPassword(auth, emailAdmin, senhaGerada);
      await setDoc(doc(db, 'usuarios', userCredential.user.uid), {
        nome: nomeAdmin,
        email: emailAdmin,
        cpf: cpfAdmin,
        role: 'admin',
        criadoEm: new Date(),
      });

      notificar('sucesso', 'Violeta Admin Criado!', `E-mail: ${emailAdmin} • Senha: ${senhaGerada}`);
    } catch (error: any) {
      notificar('erro', 'Erro ao criar Admin', error?.message || 'Não foi possível criar o administrador.');
    } finally {
      setCarregando(false);
    }
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
      await signInWithEmailAndPassword(auth, email.trim(), senha);
      router.replace('/(tabs)');
    } catch (error: any) {
      let msg = 'Erro de conexão. Tente novamente.';
      if (error?.code === 'auth/invalid-credential' || error?.code === 'auth/wrong-password' || error?.code === 'auth/user-not-found') {
        msg = 'E-mail ou senha incorretos.';
      } else if (error?.code === 'auth/invalid-email') {
        msg = 'Formato de e-mail inválido.';
      }
      setErroMsg(msg);
      notificar('erro', 'Falha no acesso', msg);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: tema.fundoTopo }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar style={isEscuro ? 'light' : 'dark'} />

      <View style={[styles.topSection, { backgroundColor: tema.fundoTopo }]}>
        <TouchableOpacity style={[styles.btnTema, { backgroundColor: 'rgba(255,255,255,0.14)' }]} onPress={alternarTema} activeOpacity={0.75} accessibilityLabel="Alternar tema">
          <Ionicons name={isEscuro ? 'sunny' : 'moon'} size={22} color={tema.textoLogo} />
        </TouchableOpacity>

        <Animated.View style={{ opacity: fadeLogo, transform: [{ scale: scaleLogo }], alignItems: 'center' }}>
          <View style={[styles.logoContainer, { borderColor: 'rgba(255,255,255,0.35)' }]}>
            <Ionicons name="layers" size={46} color={tema.botaoPrimario} />
          </View>
          <Text style={[styles.tituloLogo, { color: tema.textoLogo }]}>VIOLETA</Text>
          <Text style={[styles.subtituloLogo, { color: tema.textoLogo }]}>Gestão Educacional</Text>
        </Animated.View>
      </View>

      <Animated.View style={[styles.bottomSection, { backgroundColor: tema.fundoBase, opacity: fadeCard, transform: [{ translateY: slideCard }] }]}>
        <View style={styles.formWrapper}>
          <Text style={[styles.saudacao, { color: tema.textoPrincipal }]}>Bem-vindo!</Text>
          <Text style={[styles.textoInstrucao, { color: tema.textoSecundario }]}>Acesse sua instituição</Text>

          <View style={[styles.inputContainer, { backgroundColor: tema.inputBackground, borderColor: tema.borda }]}>
            <Ionicons name="mail-outline" size={20} color={tema.icone} style={styles.iconeInput} />
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
            <Ionicons name="lock-closed-outline" size={20} color={tema.icone} style={styles.iconeInput} />
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

          <TouchableOpacity
            style={styles.btnEsqueci}
            onPress={() => notificar('aviso', 'Recuperação de senha', 'Solicite a redefinição à coordenação ou administração da instituição.')}
          >
            <Text style={[styles.textoEsqueci, { color: tema.botaoPrimario }]}>Esqueci minha senha</Text>
          </TouchableOpacity>

          {!!erroMsg && (
            <View style={styles.erroBox}>
              <Ionicons name="alert-circle" size={16} color="#D32F2F" />
              <Text style={styles.erroTexto}>{erroMsg}</Text>
            </View>
          )}

          <TouchableOpacity style={[styles.btnEntrar, { backgroundColor: tema.botaoPrimario, opacity: carregando ? 0.7 : 1 }]} activeOpacity={0.85} onPress={() => void fazerLogin()} disabled={carregando}>
            <Text style={[styles.textoBtnEntrar, { color: tema.textoBotao }]}>{carregando ? 'Entrando...' : 'Entrar'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.rodapeContainer} onPress={() => void criarAdminMaster()} disabled={carregando}>
            <Text style={[styles.rodape, { color: tema.textoSecundario }]}>Plataforma Violeta ©</Text>
            <Text style={[styles.textoSecreto, { color: tema.botaoPrimario }]}>[Criar Admin]</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      <FeedbackToast
        feedback={feedback}
        onFechar={fecharFeedback}
        fundoCard={tema.fundoTopo}
        textoPrincipal={tema.textoPrincipal}
        textoSecundario={tema.textoSecundario}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topSection: { flex: 0.44, justifyContent: 'center', alignItems: 'center', position: 'relative', paddingHorizontal: 20 },
  btnTema: { position: 'absolute', top: 48, right: 20, width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  logoContainer: { width: 88, height: 88, backgroundColor: '#FFF', borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 14, borderWidth: 1.5, elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.25, shadowRadius: 8 },
  tituloLogo: { fontSize: 28, fontWeight: '900', letterSpacing: 3 },
  subtituloLogo: { fontSize: 12, fontStyle: 'italic', marginTop: 4, letterSpacing: 0.8, opacity: 0.9 },
  bottomSection: { flex: 0.56, borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingHorizontal: 24, paddingTop: 32, alignItems: 'center', elevation: 16, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.12, shadowRadius: 10 },
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
  erroTexto: { color: '#D32F2F', fontSize: 13, fontWeight: '700' },
  btnEntrar: { width: '100%', height: 54, borderRadius: 14, justifyContent: 'center', alignItems: 'center', elevation: 3 },
  textoBtnEntrar: { fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },
  rodapeContainer: { marginTop: 'auto', paddingBottom: 24, alignItems: 'center' },
  rodape: { fontSize: 12, opacity: 0.75 },
  textoSecreto: { fontSize: 11, marginTop: 4, fontWeight: '700' },
});