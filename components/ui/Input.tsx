import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { Colors, Font, Radius } from '../../styles/theme';

type Props = TextInputProps & {
  label?: string;
};

export function Input({ label, style, ...props }: Props) {
  return (
    <View style={styles.wrapper}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        style={[styles.input, style]}
        placeholderTextColor={Colors.textMuted}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 6 },
  label: {
    fontSize: Font.sm,
    fontWeight: '600',
    color: Colors.textMuted,
    marginLeft: 2,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: 16,
    fontSize: Font.md,
    color: Colors.textPrimary,
  },
});