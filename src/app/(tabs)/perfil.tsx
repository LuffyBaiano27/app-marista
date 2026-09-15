import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function TelaGenerica() {
  return (
    <View style={styles.container}>
      <Text style={styles.texto}>perfil</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA', // Fundo claro provisório
  },
  texto: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#003366',
  }
});