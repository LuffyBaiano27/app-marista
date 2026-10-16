import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, StatusBar, Image, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { cores } from '../constants/colors';
import { useRouter } from 'expo-router';

// Importações do nosso Firebase
import { auth, db } from '../config/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

export default function LoginScreen() {
  const router = useRouter(); 
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [verSenha, setVerSenha] = useState(false);
  const tema = isDarkMode ? cores.dark : cores.light;

  // FUNÇÃO PROVISÓRIA: Criar o primeiro Admin
  const criarAdminMaster = async () => {
    try {
      const nomeAdmin = "João Marcelo";
      const cpfAdmin = "123.456.789-00"; // Simulando o CPF
      const emailAdmin = "admin@marista.com";

      const senhaGerada = `${cpfAdmin.substring(0,3)}@${nomeAdmin[0].toUpperCase()}${nomeAdmin[1].toLowerCase()}`; 

      const userCredential = await createUserWithEmailAndPassword(auth, emailAdmin, senhaGerada);
      const user = userCredential.user;

      await setDoc(doc(db, 'usuarios', user.uid), {
        nome: nomeAdmin,
        email: emailAdmin,
        cpf: cpfAdmin,
        role: 'admin', 
        criadoEm: new Date()
      });

      Alert.alert(
        "Admin Criado com Sucesso! 🚀", 
        `E-mail: ${emailAdmin}\nSenha Gerada: ${senhaGerada}\n\nAgora você pode logar usando esses dados.`
      );

    } catch (error: any) {
      Alert.alert("Erro ao criar Admin", error.message);
      console.error(error);
    }
  };

  // FUNÇÃO DE LOGIN REAL CONECTADA AO FIREBASE
  const fazerLogin = async () => {
    if (!email || !senha) {
      Alert.alert("Atenção", "Preencha o e-mail e a senha para entrar.");
      return;
    }

    try {
      // Tenta autenticar o usuário no Firebase
      await signInWithEmailAndPassword(auth, email, senha);
      
      // Se a senha estiver correta, navega para o painel principal
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert("Erro de Login", "E-mail ou senha incorretos. Tente novamente.");
      console.error("Erro no login:", error);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: tema.fundoTopo }]} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" backgroundColor={tema.fundoTopo} />

      {/* SEÇÃO SUPERIOR */}
      <View style={[styles.topSection, { backgroundColor: tema.fundoTopo }]}>
        <TouchableOpacity style={styles.btnTema} onPress={() => setIsDarkMode(!isDarkMode)} activeOpacity={0.7}>
          <Ionicons name={isDarkMode ? "sunny" : "moon"} size={26} color={tema.textoLogo} />
        </TouchableOpacity>

        <Image source={require('../../assets/logo-marista.jpeg')} style={styles.logoOficial} resizeMode="contain" />
        <Text style={[styles.tituloLogo, { color: tema.textoLogo }]}>COLÉGIO MARISTA</Text>
        <Text style={[styles.subtituloLogo, { color: tema.textoLogo }]}>Educação que transforma o mundo</Text>
      </View>

      {/* SEÇÃO INFERIOR */}
      <View style={[styles.bottomSection, { backgroundColor: tema.fundoBase }]}>
        
        <Text style={[styles.saudacao, { color: tema.textoPrincipal }]}>Bem-vindo!</Text>
        <Text style={[styles.textoInstrucao, { color: tema.textoSecundario }]}>Acesse sua conta para continuar</Text>

        <View style={[styles.inputContainer, { backgroundColor: tema.inputBackground, borderColor: tema.borda }]}>
          <Ionicons name="mail-outline" size={20} color={tema.icone} style={styles.iconeInput} />
          <TextInput
            style={[styles.input, { color: tema.textoPrincipal }]}
            placeholder="E-mail"
            placeholderTextColor={tema.textoSecundario}
            value={email}
            onChangeText={setEmail}
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
            onChangeText={setSenha}
          />
          <TouchableOpacity onPress={() => setVerSenha(!verSenha)} style={styles.olhoIcon}>
            <Ionicons name={verSenha ? "eye-off-outline" : "eye-outline"} size={20} color={tema.icone} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.btnEsqueci}>
          <Text style={[styles.textoEsqueci, { color: tema.botaoPrimario }]}>Esqueci minha senha?</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.btnEntrar, { backgroundColor: tema.botaoPrimario }]} 
          activeOpacity={0.8}
          onPress={fazerLogin}
        >
          <Text style={[styles.textoBtnEntrar, { color: tema.textoBotao }]}>Entrar</Text>
        </TouchableOpacity>

        {/* Rodapé com botão secreto */}
        <TouchableOpacity style={styles.rodapeContainer} onPress={criarAdminMaster}>
          <Text style={[styles.rodape, { color: tema.textoSecundario }]}>Colégio Marista de Salvador</Text>
          <Text style={[styles.textoSecreto, { color: tema.botaoPrimario }]}>[Criar Admin]</Text>
        </TouchableOpacity>

      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topSection: { flex: 0.4, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  btnTema: { position: 'absolute', top: 50, right: 20, padding: 10, zIndex: 10 },
  logoOficial: { width: 80, height: 80, marginBottom: 10 },
  tituloLogo: { fontSize: 22, fontWeight: 'bold', letterSpacing: 1 },
  subtituloLogo: { fontSize: 14, fontStyle: 'italic', marginTop: 5 },
  bottomSection: { flex: 0.6, borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingHorizontal: 25, paddingTop: 35, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.1, shadowRadius: 5, elevation: 10 },
  saudacao: { fontSize: 24, fontWeight: 'bold', alignSelf: 'flex-start' },
  textoInstrucao: { fontSize: 14, alignSelf: 'flex-start', marginTop: 5, marginBottom: 25 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', width: '100%', height: 55, borderWidth: 1, borderRadius: 10, paddingHorizontal: 15, marginBottom: 15 },
  iconeInput: { marginRight: 12 },
  input: { flex: 1, height: '100%', fontSize: 16 },
  olhoIcon: { padding: 5 },
  btnEsqueci: { alignSelf: 'flex-end', marginBottom: 25 },
  textoEsqueci: { fontSize: 14, fontWeight: '600' },
  btnEntrar: { width: '100%', height: 55, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  textoBtnEntrar: { fontSize: 16, fontWeight: 'bold' },
  rodapeContainer: { position: 'absolute', bottom: 25, alignItems: 'center' },
  rodape: { fontSize: 12 },
  textoSecreto: { fontSize: 10, marginTop: 4, fontWeight: 'bold' } 
});