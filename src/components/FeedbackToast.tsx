import React, { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet, TouchableOpacity, View, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export type TipoFeedback = 'sucesso' | 'erro' | 'aviso';
export interface EstadoFeedback {
  visivel: boolean;
  tipo: TipoFeedback;
  titulo: string;
  mensagem: string;
}

interface Props {
  feedback: EstadoFeedback;
  onFechar: () => void;
  fundoCard: string;
  textoPrincipal?: string;
  textoSecundario?: string;
  duracaoMs?: number;
}

const ESTILO: Record<TipoFeedback, { icone: keyof typeof Ionicons.glyphMap; cor: string; bg: string }> = {
  sucesso: { icone: 'checkmark-circle', cor: '#2E7D32', bg: '#2E7D3225' },
  erro: { icone: 'close-circle', cor: '#D32F2F', bg: '#D32F2F25' },
  aviso: { icone: 'alert-circle', cor: '#EF6C00', bg: '#EF6C0025' },
};

const usarDriverNativo = Platform.OS !== 'web';

const corPareceEscura = (hex?: string) => {
  if (!hex) return true;
  const limpo = hex.replace('#', '').trim();
  if (limpo.length < 6) return true;
  const r = parseInt(limpo.slice(0, 2), 16);
  const g = parseInt(limpo.slice(2, 4), 16);
  const b = parseInt(limpo.slice(4, 6), 16);
  if ([r, g, b].some(n => Number.isNaN(n))) return true;
  const luminancia = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminancia < 0.5;
};

export function FeedbackToast({
  feedback,
  onFechar,
  fundoCard,
  duracaoMs = 3400,
}: Props) {
  const translateY = useRef(new Animated.Value(-40)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.5)).current;
  const barraProgresso = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!feedback.visivel) return;

    translateY.setValue(-40);
    opacity.setValue(0);
    scale.setValue(0.5);
    barraProgresso.setValue(1);

    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: usarDriverNativo,
        friction: 7,
        tension: 110,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 160,
        useNativeDriver: usarDriverNativo,
      }),
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: usarDriverNativo,
        friction: 5,
        tension: 150,
      }),
    ]).start();

    const animBarra = Animated.timing(barraProgresso, {
      toValue: 0,
      duration: duracaoMs,
      useNativeDriver: false,
    });
    animBarra.start();

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -30,
          duration: 180,
          useNativeDriver: usarDriverNativo,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 180,
          useNativeDriver: usarDriverNativo,
        }),
      ]).start(({ finished }) => {
        if (finished) onFechar();
      });
    }, duracaoMs);

    return () => {
      animBarra.stop();
      clearTimeout(timer);
    };
  }, [
    feedback.visivel,
    feedback.titulo,
    feedback.mensagem,
    feedback.tipo,
    duracaoMs,
    onFechar,
    opacity,
    scale,
    translateY,
    barraProgresso,
  ]);

  if (!feedback.visivel) return null;

  const cfg = ESTILO[feedback.tipo];
  const escuro = corPareceEscura(fundoCard);
  const corTitulo = escuro ? '#FFFFFF' : '#111827';
  const corMensagem = escuro ? 'rgba(255, 255, 255, 0.88)' : '#374151';
  const corFechar = escuro ? 'rgba(255, 255, 255, 0.78)' : '#4B5563';
  const larguraBarra = barraProgresso.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <Animated.View
      style={[styles.wrapper, { opacity, transform: [{ translateY }] }]}
      pointerEvents="box-none"
    >
      <TouchableOpacity
        activeOpacity={0.92}
        onPress={onFechar}
        style={[
          styles.card,
          { backgroundColor: fundoCard, borderColor: cfg.cor },
        ]}
      >
        <View style={styles.conteudo}>
          <Animated.View
            style={[
              styles.iconeBox,
              { backgroundColor: cfg.bg, transform: [{ scale }] },
            ]}
          >
            <Ionicons name={cfg.icone} size={26} color={cfg.cor} />
          </Animated.View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.titulo, { color: corTitulo }]}>
              {feedback.titulo}
            </Text>
            {!!feedback.mensagem && (
              <Text
                style={[styles.mensagem, { color: corMensagem }]}
                numberOfLines={2}
              >
                {feedback.mensagem}
              </Text>
            )}
          </View>
          <Ionicons name="close" size={18} color={corFechar} />
        </View>
        <View style={[styles.trilha, { backgroundColor: cfg.bg }]}>
          <Animated.View
            style={[
              styles.barra,
              { width: larguraBarra, backgroundColor: cfg.cor },
            ]}
          />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: 44,
    left: 16,
    right: 16,
    zIndex: 9999,
    elevation: 24,
  },
  card: {
    borderWidth: 1.5,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  conteudo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  iconeBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titulo: {
    fontSize: 14,
    fontWeight: '800',
  },
  mensagem: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  trilha: {
    width: '100%',
    height: 4,
  },
  barra: {
    height: '100%',
  },
});