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
import { Colors, Font, Radius } from '../styles/theme';
import { UserRole } from '../types';

export default function Auth() {
  const router = useRouter();
  const [role, setRole] = useState<UserRole>('visitor');
  const [isLogin, setIsLogin] = useState(true);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function signIn() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) Alert.alert('Ошибка', error.message);
    else router.replace(role === 'exhibitor' ? '/exhibitor' : '/visitor');
    setLoading(false);
  }

  async function signUp() {
    if (!fullName.trim()) { Alert.alert('Ошибка', 'Введите ФИО'); return; }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: fullName, role } }
    });
    if (error) Alert.alert('Ошибка', error.message);
    else Alert.alert('Готово! ✅', 'Аккаунт создан, войдите');
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

          <View style={styles.logoRow}>
            <Text style={styles.logoRed}>Expo</Text>
            <Text style={styles.logoWhite}>Hub</Text>
          </View>

          <View style={styles.top}>
            <Text style={styles.tagline}>Добро пожаловать</Text>
            <View style={styles.decorLine} />
            <Text style={styles.title}>{isLogin ? 'Войти' : 'Регистрация'}</Text>
          </View>

          <View style={styles.roleRow}>
            <TouchableOpacity
              style={[styles.roleBtn, role === 'visitor' && styles.roleBtnActive]}
              onPress={() => { setRole('visitor'); setIsLogin(true); }}
            >
              <Text style={[styles.roleBtnText, role === 'visitor' && styles.roleBtnTextActive]}>
                👤 Посетитель
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.roleBtn, role === 'exhibitor' && styles.roleBtnActive]}
              onPress={() => { setRole('exhibitor'); setIsLogin(true); }}
            >
              <Text style={[styles.roleBtnText, role === 'exhibitor' && styles.roleBtnTextActive]}>
                🏢 Экспонент
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.form}>
            {!isLogin && (
              <Input
                label="ФИО"
                placeholder="Иван Иванов"
                value={fullName}
                onChangeText={setFullName}
                autoCapitalize="words"
              />
            )}
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
              title={loading ? 'Загрузка...' : isLogin ? 'Войти →' : 'Зарегистрироваться →'}
              onPress={isLogin ? signIn : signUp}
              loading={loading}
            />

            {role === 'visitor' && (
              <Button
                title={isLogin ? 'Создать аккаунт' : 'Уже есть аккаунт? Войти'}
                onPress={() => { setIsLogin(!isLogin); setFullName(''); }}
                variant="secondary"
              />
            )}

            {role === 'exhibitor' && (
              <Button
                title="Зарегистрироваться как экспонент"
                onPress={() => router.push('/register-exhibitor')}
                variant="secondary"
              />
            )}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1, padding: 28, justifyContent: 'center' },
  logoRow: { flexDirection: 'row', marginBottom: 40, alignItems: 'baseline' },
  logoRed: { fontSize: 32, fontWeight: '900', color: Colors.primary, letterSpacing: -1 },
  logoWhite: { fontSize: 32, fontWeight: '900', color: Colors.textPrimary, letterSpacing: -1 },
  top: { marginBottom: 28 },
  tagline: { fontSize: Font.xs, letterSpacing: 3, textTransform: 'uppercase', color: Colors.textMuted, fontWeight: '600', marginBottom: 8 },
  decorLine: { width: 32, height: 2, backgroundColor: Colors.primary, marginBottom: 14, borderRadius: 2 },
  title: { fontSize: Font.xl, fontWeight: '800', color: Colors.textPrimary, letterSpacing: -0.5 },
  roleRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  roleBtn: { flex: 1, paddingVertical: 14, borderRadius: Radius.md, alignItems: 'center', borderWidth: 1.5, borderColor: Colors.border, backgroundColor: 'transparent' },
  roleBtnActive: { borderColor: Colors.primary },
  roleBtnText: { fontSize: Font.sm, fontWeight: '600', color: Colors.textMuted },
  roleBtnTextActive: { color: Colors.primary },
  form: { gap: 12 },
});