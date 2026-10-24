import type { PropsWithChildren } from 'react';
import { Pressable, Text, TextInput, View, StyleSheet } from 'react-native';

// Native adapters for existing platform tokens. DOM components cannot render in React Native.
export { default as tokens } from './design-tokens.json';
import tokens from './design-tokens.json';
export function Action({
  children,
  onPress,
  disabled = false,
}: {
  children: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { opacity: disabled ? 0.45 : pressed ? 0.8 : 1 },
      ]}
    >
      <Text style={styles.buttonText}>{children}</Text>
    </Pressable>
  );
}
export function Panel({ children }: PropsWithChildren) {
  return <View style={styles.panel}>{children}</View>;
}
export function Notice({ children }: PropsWithChildren) {
  return (
    <Text accessibilityLiveRegion="polite" style={styles.notice}>
      {children}
    </Text>
  );
}
export function Input({
  label,
  value,
  onChange,
  secret = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  secret?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.text}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChange}
        secureTextEntry={secret}
        autoCapitalize="none"
        autoCorrect={false}
        style={styles.input}
      />
    </View>
  );
}
export const styles = StyleSheet.create({
  screen: {
    flexGrow: 1,
    padding: 24,
    gap: 24,
    backgroundColor: tokens.background,
  },
  panel: {
    padding: 24,
    gap: 16,
    borderRadius: 16,
    backgroundColor: tokens.surface,
  },
  button: {
    minHeight: 48,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 24,
    backgroundColor: tokens.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { color: '#fff', fontSize: 16, textAlign: 'center' },
  text: { color: tokens.foreground, fontSize: 16, flexShrink: 1 },
  amount: { fontSize: 32, color: tokens.foreground },
  notice: {
    color: tokens.warning,
    backgroundColor: tokens.warningBackground,
    padding: 16,
    borderRadius: 12,
    fontSize: 16,
  },
  field: { gap: 8 },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: tokens.muted,
    borderRadius: 12,
    padding: 12,
    color: tokens.foreground,
    fontSize: 16,
  },
});
