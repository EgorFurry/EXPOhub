import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert, KeyboardAvoidingView,
  Platform, ScrollView,
  StyleSheet, Text,
  TouchableOpacity, View
} from 'react-native';
import { GlowBackground } from '../components/shared/GlowBackground';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { supabase } from '../lib/supabase';
import { Colors, Font } from '../styles/theme';

export default function RegisterExhibitor() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function signUp() {
    if (!fullName.trim()) { Alert.alert('Ошибка', 'Введите ФИО'); return; }
    if (!company.trim()) { Alert.alert('Ошибка', 'Введите название компании'); return; }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email, password,
      options: {
        data: { full_name: fullName, company_name: company, role: 'exhibitor' }
      }
    });
    if (error) Alert.alert('Ошибка', error.message);
    else { Alert.alert('Готово! ✅', 'Аккаунт создан, войдите'); router.back(); }
    setLoading(false);
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View style={styles.container}>

          <GlowBackground intensity="medium" position="top-right" />

          <TouchableOpacity onPress={() => router.back()} style={styles.back}>
            <Text style={styles.backText}>← Назад</Text>
          </TouchableOpacity>

          <View style={styles.top}>
            <Text style={styles.tagline}>Экспонент</Text>
            <View style={styles.decorLine} />
            <Text style={styles.title}>Регистрация</Text>
          </View>

          <View style={styles.form}>
            <Input
              label="ФИО"
              placeholder="Иван Иванов"
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
            />
            <Input
              label="Название компании"
              placeholder="ООО Компания"
              value={company}
              onChangeText={setCompany}
              autoCapitalize="words"
            />
            <Input
              label="Email"
              placeholder="your@email.com"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <Input
              label="Пароль"
              placeholder="Минимум 6 символов"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            <Button
              title={loading ? 'Загрузка...' : 'Зарегистрироваться →'}
              onPress={signUp}
              loading={loading}
            />
          </View>

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1, padding: 28, justifyContent: 'center' },
  back: { marginBottom: 24 },
  backText: { color: Colors.textMuted, fontSize: Font.sm },
  top: { marginBottom: 28 },
  tagline: { fontSize: Font.xs, letterSpacing: 3, textTransform: 'uppercase', color: Colors.textMuted, fontWeight: '600', marginBottom: 8 },
  decorLine: { width: 32, height: 2, backgroundColor: Colors.primary, marginBottom: 14, borderRadius: 2 },
  title: { fontSize: Font.xl, fontWeight: '800', color: Colors.textPrimary, letterSpacing: -0.5 },
  form: { gap: 12 },
});