import { SymbolView } from 'expo-symbols';
import { PropsWithChildren, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useColorScheme } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { cores } from '../../constants/colors';

export function Collapsible({ children, title }: PropsWithChildren & { title: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const theme = useColorScheme() === 'dark' ? cores.dark : cores.light;

  return (
    <View style={{ backgroundColor: theme.fundoBase }}>
      <Pressable
        style={({ pressed }) => [styles.heading, pressed && styles.pressedHeading]}
        onPress={() => setIsOpen((value) => !value)}
        accessibilityRole="button"
        accessibilityState={{ expanded: isOpen }}>
        <View style={[styles.button, { backgroundColor: theme.inputBackground }]}>
          <SymbolView
            name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
            size={14}
            weight="bold"
            tintColor={theme.textoPrincipal}
            style={{ transform: [{ rotate: isOpen ? '90deg' : '0deg' }] }}
          />
        </View>

        <Text style={{ fontSize: 14, color: theme.textoPrincipal }}>{title}</Text>
      </Pressable>
      {isOpen && (
        <Animated.View entering={FadeIn.duration(200)}>
          <View style={[styles.content, { backgroundColor: theme.inputBackground }]}>
            {children}
          </View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pressedHeading: {
    opacity: 0.7,
  },
  button: {
    width: 32,
    height: 32,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    marginTop: 16,
    borderRadius: 16,
    marginLeft: 32,
    padding: 32,
  },
});
