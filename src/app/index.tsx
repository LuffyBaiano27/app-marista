import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Animated, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { cores } from '../constants/colors';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

// Firebase
import { auth, db } from '../config/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

export default function LoginScreen() {
  const router = useRouter(); 
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [verSenha, setVerSenha] = useState(false);
  
  // ESTADO PARA EXIBIR ERRO DE LOGIN NA TELA
  const [erroMsg, setErroMsg] = useState('');
  
  const tema = isDarkMode ? cores.dark : cores.light;

  // ANIMAÇÕES NATIVAS DO INÍCIO
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 800, useNativeDriver: true })
    ]).start();
  }, []);

  const criarAdminMaster = async () => {
    try {
      const nomeAdmin = "Luffy Baiano";
      const cpfAdmin = "123.456.789-00"; 
      const emailAdmin = "admin@violeta.com";
      const senhaGerada = `${cpfAdmin.substring(0,3)}@${nomeAdmin[0].toUpperCase()}${nomeAdmin[1].toLowerCase()}`; 

      const userCredential = await createUserWithEmailAndPassword(auth, emailAdmin, senhaGerada);
      const user = userCredential.user;

      await setDoc(doc(db, 'usuarios', user.uid), {
        nome: nomeAdmin, email: emailAdmin, cpf: cpfAdmin, role: 'admin', criadoEm: new Date()
      });

      Alert.alert("Violeta Admin Criado! 🚀", `E-mail: ${emailAdmin}\nSenha: ${senhaGerada}`);
    } catch (error: any) {
      Alert.alert("Erro ao criar Admin", error.message);
    }
  };

  const fazerLogin = async () => {
    if (!email || !senha) return setErroMsg("Preencha o e-mail e a senha.");
    
    setErroMsg(''); // Limpa o erro anterior antes de tentar novamente
    
    try {
      await signInWithEmailAndPassword(auth, email, senha);
      router.replace('/(tabs)');
    } catch (error: any) {
      // Tratamento específico de erros do Firebase Auth
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
        setErroMsg("E-mail ou senha incorretos.");
      } else if (error.code === 'auth/invalid-email') {
        setErroMsg("Formato de e-mail inválido.");
      } else {
        setErroMsg("Erro de conexão. Tente novamente.");
        console.error(error); // Ajuda no log do terminal
      }
    }
  };

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: tema.fundoTopo }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar style="light" />

      {/* SEÇÃO SUPERIOR ANIMADA */}
      <View style={[styles.topSection, { backgroundColor: tema.fundoTopo }]}>
        <TouchableOpacity style={styles.btnTema} onPress={() => setIsDarkMode(!isDarkMode)} activeOpacity={0.7}>
          <Ionicons name={isDarkMode ? "sunny" : "moon"} size={26} color={tema.textoLogo} />
        </TouchableOpacity>

        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }], alignItems: 'center' }}>
          {/* Logo provisória até a oficial chegar */}
          <View style={styles.logoContainer}>
            <Ionicons name="layers" size={50} color={tema.botaoPrimario} />
          </View>
          <Text style={[styles.tituloLogo, { color: tema.textoLogo }]}>VIOLETA</Text>
          <Text style={[styles.subtituloLogo, { color: tema.textoLogo }]}>Gestão Educacional</Text>
        </Animated.View>
      </View>

      <View style={[styles.bottomSection, { backgroundColor: tema.fundoBase }]}>
        <Text style={[styles.saudacao, { color: tema.textoPrincipal }]}>Bem-vindo!</Text>
        <Text style={[styles.textoInstrucao, { color: tema.textoSecundario }]}>Acesse sua instituição</Text>

        <View style={[styles.inputContainer, { backgroundColor: tema.inputBackground, borderColor: tema.borda }]}>
          <Ionicons name="mail-outline" size={20} color={tema.icone} style={styles.iconeInput} />
          <TextInput style={[styles.input, { color: tema.textoPrincipal }]} placeholder="E-mail institucional" placeholderTextColor={tema.textoSecundario} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        </View>

        <View style={[styles.inputContainer, { backgroundColor: tema.inputBackground, borderColor: tema.borda }]}>
          <Ionicons name="lock-closed-outline" size={20} color={tema.icone} style={styles.iconeInput} />
          <TextInput style={[styles.input, { color: tema.textoPrincipal }]} placeholder="Senha" placeholderTextColor={tema.textoSecundario} secureTextEntry={!verSenha} value={senha} onChangeText={setSenha} />
          <TouchableOpacity onPress={() => setVerSenha(!verSenha)} style={styles.olhoIcon}>
            <Ionicons name={verSenha ? "eye-off-outline" : "eye-outline"} size={20} color={tema.icone} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.btnEsqueci}>
          <Text style={[styles.textoEsqueci, { color: tema.botaoPrimario }]}>Esqueci minha senha</Text>
        </TouchableOpacity>

        {/* EXIBIÇÃO DA MENSAGEM DE ERRO (Se existir) */}
        {erroMsg ? (
          <Text style={{ color: '#D32F2F', marginBottom: 15, fontWeight: 'bold', textAlign: 'center' }}>
            {erroMsg}
          </Text>
        ) : null}

        <TouchableOpacity style={[styles.btnEntrar, { backgroundColor: tema.botaoPrimario }]} activeOpacity={0.8} onPress={fazerLogin}>
          <Text style={[styles.textoBtnEntrar, { color: tema.textoBotao }]}>Entrar</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.rodapeContainer} onPress={criarAdminMaster}>
          <Text style={[styles.rodape, { color: tema.textoSecundario }]}>Plataforma Violeta ©</Text>
          <Text style={[styles.textoSecreto, { color: tema.botaoPrimario }]}>[Criar Admin]</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topSection: { flex: 0.45, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  btnTema: { position: 'absolute', top: 50, right: 20, padding: 10, zIndex: 10 },
  logoContainer: { width: 80, height: 80, backgroundColor: '#FFF', borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginBottom: 15, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 5 },
  tituloLogo: { fontSize: 28, fontWeight: '900', letterSpacing: 3 },
  subtituloLogo: { fontSize: 13, fontStyle: 'italic', marginTop: 5, letterSpacing: 1 },
  bottomSection: { flex: 0.55, borderTopLeftRadius: 35, borderTopRightRadius: 35, paddingHorizontal: 25, paddingTop: 40, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: -5 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 15 },
  saudacao: { fontSize: 26, fontWeight: 'bold', alignSelf: 'flex-start' },
  textoInstrucao: { fontSize: 14, alignSelf: 'flex-start', marginTop: 5, marginBottom: 25 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', width: '100%', height: 55, borderWidth: 1, borderRadius: 12, paddingHorizontal: 15, marginBottom: 15 },
  iconeInput: { marginRight: 12 },
  input: { flex: 1, height: '100%', fontSize: 16 },
  olhoIcon: { padding: 5 },
  btnEsqueci: { alignSelf: 'flex-end', marginBottom: 25 },
  textoEsqueci: { fontSize: 14, fontWeight: '600' },
  btnEntrar: { width: '100%', height: 55, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  textoBtnEntrar: { fontSize: 16, fontWeight: 'bold' },
  rodapeContainer: { position: 'absolute', bottom: 30, alignItems: 'center' },
  rodape: { fontSize: 12, opacity: 0.7 },
  textoSecreto: { fontSize: 10, marginTop: 4, fontWeight: 'bold' } 
});