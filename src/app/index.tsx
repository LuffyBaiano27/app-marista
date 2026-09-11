import React, { useState } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, 
  KeyboardAvoidingView, Platform, StatusBar, Image // Importação do Image adicionada
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { cores } from '../constants/colors';

export default function LoginScreen() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [verSenha, setVerSenha] = useState(false);
  const tema = isDarkMode ? cores.dark : cores.light;

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: tema.fundoTopo }]} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Ajusta a cor dos ícones do celular (bateria, wifi) dependendo do modo */}
      <StatusBar barStyle="light-content" backgroundColor={tema.fundoTopo} />

      {/* SEÇÃO SUPERIOR: Azul Marista */}
      <View style={[styles.topSection, { backgroundColor: tema.fundoTopo }]}>
        
        {/* Botão de Modo Escuro no topo direito */}
        <TouchableOpacity 
          style={styles.btnTema} 
          onPress={() => setIsDarkMode(!isDarkMode)}
          activeOpacity={0.7}
        >
          <Ionicons name={isDarkMode ? "sunny" : "moon"} size={26} color={tema.textoLogo} />
        </TouchableOpacity>

        {/* LOGO OFICIAL DO MARISTA */}
        <Image 
          source={require('../../assets/logo-marista.jpeg')} 
          style={styles.logoOficial}
          resizeMode="contain"
        />

        <Text style={[styles.tituloLogo, { color: tema.textoLogo }]}>COLÉGIO MARISTA</Text>
        <Text style={[styles.subtituloLogo, { color: tema.textoLogo }]}>Educação que transforma o mundo</Text>
      </View>

      {/* SEÇÃO INFERIOR: Base branca/escura com bordas arredondadas */}
      <View style={[styles.bottomSection, { backgroundColor: tema.fundoBase }]}>
        
        <Text style={[styles.saudacao, { color: tema.textoPrincipal }]}>Bem-vindo!</Text>
        <Text style={[styles.textoInstrucao, { color: tema.textoSecundario }]}>Acesse sua conta para continuar</Text>

        {/* Input de E-mail */}
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

        {/* Input de Senha */}
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

        {/* Esqueci minha senha */}
        <TouchableOpacity style={styles.btnEsqueci}>
          <Text style={[styles.textoEsqueci, { color: tema.botaoPrimario }]}>Esqueci minha senha?</Text>
        </TouchableOpacity>

        {/* Botão Entrar */}
        <TouchableOpacity style={[styles.btnEntrar, { backgroundColor: tema.botaoPrimario }]} activeOpacity={0.8}>
          <Text style={[styles.textoBtnEntrar, { color: tema.textoBotao }]}>Entrar</Text>
        </TouchableOpacity>

        {/* Divisor "ou" com linhas laterais */}
        <View style={styles.divisorContainer}>
          <View style={[styles.linhaDivisor, { backgroundColor: tema.borda }]} />
          <Text style={[styles.textoDivisor, { color: tema.textoSecundario }]}>ou</Text>
          <View style={[styles.linhaDivisor, { backgroundColor: tema.borda }]} />
        </View>

        {/* Botão Entrar com Google */}
        <TouchableOpacity style={[styles.btnGoogle, { backgroundColor: tema.fundoBase, borderColor: tema.borda }]} activeOpacity={0.7}>
          <Ionicons name="logo-google" size={20} color={isDarkMode ? '#FFF' : '#DB4437'} />
          <Text style={[styles.textoBtnGoogle, { color: tema.textoPrincipal }]}>Entrar com o Google</Text>
        </TouchableOpacity>

        {/* Rodapé */}
        <Text style={[styles.rodape, { color: tema.textoSecundario }]}>Colégio Marista de Salvador</Text>

      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
  },
  topSection: {
    flex: 0.4,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  btnTema: {
    position: 'absolute',
    top: 50,
    right: 20,
    padding: 10,
    zIndex: 10,
  },
  logoOficial: {
    width: 80, 
    height: 80,
    marginBottom: 10,
  },
  tituloLogo: {
    fontSize: 22,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  subtituloLogo: {
    fontSize: 14,
    fontStyle: 'italic',
    marginTop: 5,
  },
  bottomSection: {
    flex: 0.6,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 25,
    paddingTop: 35,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 10,
  },
  saudacao: {
    fontSize: 24,
    fontWeight: 'bold',
    alignSelf: 'flex-start',
  },
  textoInstrucao: {
    fontSize: 14,
    alignSelf: 'flex-start',
    marginTop: 5,
    marginBottom: 25,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    height: 55,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 15,
  },
  iconeInput: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 16,
  },
  olhoIcon: {
    padding: 5,
  },
  btnEsqueci: {
    alignSelf: 'flex-end',
    marginBottom: 25,
  },
  textoEsqueci: {
    fontSize: 14,
    fontWeight: '600',
  },
  btnEntrar: {
    width: '100%',
    height: 55,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textoBtnEntrar: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  divisorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginVertical: 20,
  },
  linhaDivisor: {
    flex: 1,
    height: 1,
  },
  textoDivisor: {
    marginHorizontal: 10,
    fontSize: 14,
  },
  btnGoogle: {
    flexDirection: 'row',
    width: '100%',
    height: 55,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textoBtnGoogle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  rodape: {
    position: 'absolute',
    bottom: 25,
    fontSize: 12,
  }
});