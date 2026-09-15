import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, useColorScheme 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { cores } from '../../constants/colors';

export default function DashboardScreen() {
  const isDarkMode = useColorScheme() === 'dark';
  const tema = isDarkMode ? cores.dark : cores.light;

  const [saudacaoTempo, setSaudacaoTempo] = useState('Olá');
  const [mensagemTempo, setMensagemTempo] = useState('');

  useEffect(() => {
    const hora = new Date().getHours();
    if (hora >= 5 && hora < 12) {
      setSaudacaoTempo('Bom dia');
      setMensagemTempo('Que seja um ótimo dia de aula!');
    } else if (hora >= 12 && hora < 18) {
      setSaudacaoTempo('Boa tarde');
      setMensagemTempo('Que seja uma ótima tarde de aula!');
    } else {
      setSaudacaoTempo('Boa noite');
      setMensagemTempo('Que seja uma excelente noite de aula!');
    }
  }, []);

  const turmasDoDia = [
    { id: 1, nome: '6º Ano A', materia: 'Matemática', alunos: 32, horario: 'Segunda • 7h às 8h' },
    { id: 2, nome: '7º Ano B', materia: 'Matemática', alunos: 28, horario: 'Terça • 9h às 10h' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: tema.fundoBase }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* CABEÇALHO: Saudação e Ações do Perfil */}
        <View style={styles.header}>
          <View style={styles.headerTextContainer}>
            <Text style={[styles.tituloSaudacao, { color: tema.textoPrincipal }]}>
              {saudacaoTempo}, Professor(a)! 👋
            </Text>
            <Text style={[styles.subtituloSaudacao, { color: tema.textoSecundario }]}>
              {mensagemTempo}
            </Text>
          </View>
          
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.iconButton}>
              <Ionicons name="notifications-outline" size={24} color={tema.textoPrincipal} />
              {/* Bolinha vermelha de notificação */}
              <View style={styles.notificationBadge} /> 
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.avatar, { backgroundColor: tema.inputBackground, borderColor: tema.borda }]}>
              <Ionicons name="person" size={20} color={tema.botaoPrimario} />
            </TouchableOpacity>
          </View>
        </View>

        {/* BANNER INSTITUCIONAL */}
        <View style={[styles.banner, { backgroundColor: tema.fundoTopo }]}>
          <Text style={[styles.textoBanner, { color: tema.textoLogo }]}>
            "Juntos por uma educação que transforma."
          </Text>
          <Text style={[styles.assinaturaBanner, { color: tema.textoLogo, opacity: 0.8 }]}>
            COLÉGIO MARISTA
          </Text>
          <Ionicons name="school" size={60} color={tema.textoLogo} style={styles.watermark} />
        </View>

        {/* SEÇÃO: MINHAS TURMAS */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: tema.textoPrincipal }]}>Minhas turmas</Text>
          <TouchableOpacity>
            <Text style={[styles.btnVerTodas, { color: tema.botaoPrimario }]}>Ver todas {'>'}</Text>
          </TouchableOpacity>
        </View>

        {/* LISTA DE TURMAS */}
        {turmasDoDia.map((turma) => (
          <TouchableOpacity 
            key={turma.id} 
            style={[styles.cardTurma, { backgroundColor: tema.inputBackground, borderColor: tema.borda }]}
            activeOpacity={0.7}
          >
            <View style={[styles.iconeTurmaBg, { backgroundColor: tema.botaoPrimario + '20' }]}>
              <Ionicons name="people" size={24} color={tema.botaoPrimario} />
            </View>
            <View style={styles.infoTurma}>
              <Text style={[styles.nomeTurma, { color: tema.textoPrincipal }]}>{turma.nome}</Text>
              <Text style={[styles.materiaTurma, { color: tema.textoSecundario }]}>{turma.materia}</Text>
              <View style={styles.detalhesTurma}>
                <Ionicons name="person" size={12} color={tema.textoSecundario} />
                <Text style={[styles.textoDetalhe, { color: tema.textoSecundario }]}> {turma.alunos} alunos</Text>
              </View>
              <View style={styles.detalhesTurma}>
                <Ionicons name="time-outline" size={12} color={tema.textoSecundario} />
                <Text style={[styles.textoDetalhe, { color: tema.textoSecundario }]}> {turma.horario}</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={tema.icone} />
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* BOTÃO FLUTUANTE */}
      <View style={[styles.footer, { backgroundColor: tema.fundoBase, borderTopColor: tema.borda }]}>
        <TouchableOpacity style={[styles.btnRegistrar, { backgroundColor: tema.botaoPrimario }]} activeOpacity={0.8}>
          <Ionicons name="add-circle" size={20} color={tema.textoBotao} style={{ marginRight: 8 }} />
          <Text style={[styles.textoBtnRegistrar, { color: tema.textoBotao }]}>Registrar frequência</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 20, paddingTop: 50, paddingBottom: 100 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  headerTextContainer: { flex: 1 },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  iconButton: { marginRight: 15, position: 'relative' },
  notificationBadge: { position: 'absolute', top: -2, right: -2, width: 10, height: 10, borderRadius: 5, backgroundColor: '#DB4437', borderWidth: 1, borderColor: '#FFF' },
  tituloSaudacao: { fontSize: 20, fontWeight: 'bold' },
  subtituloSaudacao: { fontSize: 13, marginTop: 2 },
  avatar: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  banner: { width: '100%', padding: 20, borderRadius: 15, marginBottom: 30, position: 'relative', overflow: 'hidden', elevation: 3 },
  textoBanner: { fontSize: 16, fontWeight: 'bold', fontStyle: 'italic', marginBottom: 10, zIndex: 2 },
  assinaturaBanner: { fontSize: 12, fontWeight: '600', zIndex: 2 },
  watermark: { position: 'absolute', right: -10, bottom: -15, opacity: 0.2, transform: [{ rotate: '-15deg' }] },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold' },
  btnVerTodas: { fontSize: 14, fontWeight: '600' },
  cardTurma: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 12, borderWidth: 1, marginBottom: 12 },
  iconeTurmaBg: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  infoTurma: { flex: 1 },
  nomeTurma: { fontSize: 16, fontWeight: 'bold' },
  materiaTurma: { fontSize: 14, marginBottom: 5 },
  detalhesTurma: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  textoDetalhe: { fontSize: 12 },
  footer: { position: 'absolute', bottom: 0, width: '100%', padding: 20, borderTopWidth: 1 },
  btnRegistrar: { flexDirection: 'row', width: '100%', height: 55, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  textoBtnRegistrar: { fontSize: 16, fontWeight: 'bold' }
});