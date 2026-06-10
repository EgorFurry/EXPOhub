import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { GlowBackground } from '../components/shared/GlowBackground';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { supabase } from '../lib/supabase';
import { Colors, Font, Radius } from '../styles/theme';
import { UserRole } from '../types';

// ─── перевод ошибок Supabase на человеческий язык ────────────
function translateError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('invalid login credentials') || m.includes('invalid email or password'))
    return 'Неверный email или пароль. Проверьте данные и попробуйте снова.';
  if (m.includes('user already registered') || m.includes('already been registered'))
    return 'Аккаунт с таким email уже существует. Войдите или восстановите пароль.';
  if (m.includes('email not confirmed'))
    return 'Email не подтверждён. Проверьте почту и перейдите по ссылке.';
  if (m.includes('too many requests'))
    return 'Слишком много попыток. Подождите немного и попробуйте снова.';
  if (m.includes('user not found') || m.includes('no user found'))
    return 'Аккаунт не найден. Зарегистрируйтесь, чтобы продолжить.';
  if (m.includes('password') && m.includes('short'))
    return 'Пароль слишком короткий. Минимум 6 символов.';
  if (m.includes('network') || m.includes('fetch'))
    return 'Ошибка сети. Проверьте подключение к интернету.';
  return 'Что-то пошло не так. Попробуйте ещё раз.';
}

// ─── Toast — только для успеха ───────────────────────────────
function SuccessToast({ message }: { message: string }) {
  return (
    <View style={styles.successToast}>
      <Text style={styles.successToastText}>✅ {message}</Text>
    </View>
  );
}

// ─── Inline ошибка под полем ─────────────────────────────────
function FieldError({ message }: { message: string }) {
  if (!message) return null;
  return <Text style={styles.fieldError}>⚠ {message}</Text>;
}

// ─── главный компонент ───────────────────────────────────────
export default function Auth() {
  const router = useRouter();
  const [role, setRole]         = useState<UserRole>('visitor');
  const [isLogin, setIsLogin]   = useState(true);
  const [fullName, setFullName] = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // ошибки по полям
  const [errors, setErrors] = useState({
    fullName: '',
    email:    '',
    password: '',
    general:  '',
  });

  function clearErrors() {
    setErrors({ fullName: '', email: '', password: '', general: '' });
  }

  function setError(field: keyof typeof errors, message: string) {
    setErrors(prev => ({ ...prev, [field]: message }));
  }

  function showSuccess(msg: string) {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  }

  // ── валидация ──
  function validateEmail(val: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
  }

  async function signIn() {
    clearErrors();
    let hasError = false;

    if (!email.trim()) {
      setError('email', 'Введите email'); hasError = true;
    } else if (!validateEmail(email)) {
      setError('email', 'Некорректный формат email'); hasError = true;
    }
    if (!password) {
      setError('password', 'Введите пароль'); hasError = true;
    }
    if (hasError) return;

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      setError('general', translateError(error.message));
    } else {
      router.replace('/(tabs)');
    }
    setLoading(false);
  }

  async function signUp() {
    clearErrors();
    let hasError = false;

    if (!fullName.trim()) {
      setError('fullName', 'Введите ФИО'); hasError = true;
    }
    if (!email.trim()) {
      setError('email', 'Введите email'); hasError = true;
    } else if (!validateEmail(email)) {
      setError('email', 'Некорректный формат email'); hasError = true;
    }
    if (!password) {
      setError('password', 'Введите пароль'); hasError = true;
    } else if (password.length < 6) {
      setError('password', 'Пароль минимум 6 символов'); hasError = true;
    }
    if (hasError) return;

    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { full_name: fullName.trim(), role } },
    });
    if (error) {
      setError('general', translateError(error.message));
    } else {
      showSuccess('Аккаунт создан! Добро пожаловать.');
      router.replace('/(tabs)');
    }
    setLoading(false);
  }

  function switchMode() {
    setIsLogin(v => !v);
    setFullName('');
    clearErrors();
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      {successMsg && <SuccessToast message={successMsg} />}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={styles.container}>
          <GlowBackground intensity="medium" position="top-right" />

          {/* логотип */}
          <View style={styles.logoRow}>
            <Text style={styles.logoRed}>Expo</Text>
            <Text style={styles.logoWhite}>Hub</Text>
          </View>

          {/* заголовок */}
          <View style={styles.top}>
            <Text style={styles.title}>{isLogin ? 'Войти' : 'Регистрация'}</Text>
            <View style={styles.decorLine} />
            <Text style={styles.tagline}>Добро пожаловать</Text>
          </View>

          {/* выбор роли */}
          <View style={styles.roleRow}>
            <TouchableOpacity
              style={[styles.roleBtn, role === 'visitor' && styles.roleBtnActive]}
              onPress={() => { setRole('visitor'); setIsLogin(true); clearErrors(); }}
            >
              <Text style={[styles.roleBtnText, role === 'visitor' && styles.roleBtnTextActive]}>
                👤 Посетитель
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.roleBtn, role === 'exhibitor' && styles.roleBtnActive]}
              onPress={() => { setRole('exhibitor'); setIsLogin(true); clearErrors(); }}
            >
              <Text style={[styles.roleBtnText, role === 'exhibitor' && styles.roleBtnTextActive]}>
                🏢 Экспонент
              </Text>
            </TouchableOpacity>
          </View>

          {/* форма */}
          <View style={styles.form}>

            {/* общая ошибка */}
            {errors.general ? (
              <View style={styles.generalError}>
                <Text style={styles.generalErrorText}>{errors.general}</Text>
              </View>
            ) : null}

            {/* ФИО — только при регистрации */}
            {!isLogin && (
              <View>
                <Input
                  label="ФИО"
                  placeholder="Иван Иванов"
                  value={fullName}
                  onChangeText={v => { setFullName(v); setError('fullName', ''); }}
                  autoCapitalize="words"
                  style={errors.fullName ? styles.inputError : undefined}
                />
                <FieldError message={errors.fullName} />
              </View>
            )}

            {/* email */}
            <View>
              <Input
                label="Email"
                placeholder="your@email.com"
                value={email}
                onChangeText={v => { setEmail(v); setError('email', ''); setError('general', ''); }}
                autoCapitalize="none"
                keyboardType="email-address"
                style={errors.email ? styles.inputError : undefined}
              />
              <FieldError message={errors.email} />
            </View>

            {/* пароль */}
            <View>
              <Input
                label="Пароль"
                placeholder="Минимум 6 символов"
                value={password}
                onChangeText={v => { setPassword(v); setError('password', ''); setError('general', ''); }}
                secureTextEntry
                style={errors.password ? styles.inputError : undefined}
              />
              <FieldError message={errors.password} />
            </View>

            {/* кнопка действия */}
            <Button
              title={isLogin ? 'Войти →' : 'Зарегистрироваться →'}
              onPress={isLogin ? signIn : signUp}
              loading={loading}
              style={{ marginTop: 4 }}
            />

            {/* переключение режима */}
            {role === 'visitor' && (
              <Button
                title={isLogin ? 'Создать аккаунт' : 'Уже есть аккаунт? Войти'}
                onPress={switchMode}
                variant="secondary"
              />
            )}

            {role === 'exhibitor' && !isLogin && (
              <Button
                title="Уже есть аккаунт? Войти"
                onPress={switchMode}
                variant="secondary"
              />
            )}

            {role === 'exhibitor' && isLogin && (
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
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  // Ключевой фикс белой полоски:
  // flexGrow: 1 растягивает контент, backgroundColor закрашивает пустое место
  scrollContent: {
    flexGrow: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flexGrow: 1,
    padding: 28,
    justifyContent: 'center',
    backgroundColor: Colors.background,
    minHeight: '100%',
  },
  successToast: {
    position: 'absolute', top: 60, left: 20, right: 20,
    padding: 14, borderRadius: Radius.md, zIndex: 100,
    backgroundColor: 'rgba(76,175,80,0.95)',
    borderWidth: 1, borderColor: Colors.success,
  },
  successToastText: {
    color: '#fff', fontSize: Font.sm, fontWeight: '600', textAlign: 'center',
  },
  generalError: {
    backgroundColor: 'rgba(196,18,48,0.1)',
    borderWidth: 1, borderColor: Colors.primaryBorder,
    borderRadius: Radius.md, padding: 12,
  },
  generalErrorText: {
    color: Colors.primary, fontSize: Font.sm, fontWeight: '500', lineHeight: 18,
  },
  fieldError: {
    color: Colors.primary, fontSize: Font.xs,
    marginTop: 4, marginLeft: 4, fontWeight: '500',
  },
  inputError: {
    borderColor: Colors.primary,
    borderWidth: 1.5,
  },
  logoRow: {
    flexDirection: 'row', marginBottom: 40, alignItems: 'baseline',
  },
  logoRed: {
    fontSize: 32, fontWeight: '900', color: Colors.primary, letterSpacing: -1,
  },
  logoWhite: {
    fontSize: 32, fontWeight: '900', color: Colors.textPrimary, letterSpacing: -1,
  },
  top: { marginBottom: 28 },
  title: {
    fontSize: Font.xl, fontWeight: '800', color: Colors.textPrimary,
    letterSpacing: -0.5, marginBottom: 10,
  },
  decorLine: {
    width: 32, height: 2, backgroundColor: Colors.primary,
    marginBottom: 10, borderRadius: 2,
  },
  tagline: {
    fontSize: Font.xs, letterSpacing: 3, textTransform: 'uppercase',
    color: Colors.textMuted, fontWeight: '600',
  },
  roleRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  roleBtn: {
    flex: 1, paddingVertical: 14, borderRadius: Radius.md,
    alignItems: 'center', borderWidth: 1.5,
    borderColor: Colors.border, backgroundColor: 'transparent',
  },
  roleBtnActive: { borderColor: Colors.primary },
  roleBtnText: { fontSize: Font.sm, fontWeight: '600', color: Colors.textMuted },
  roleBtnTextActive: { color: Colors.primary },
  form: { gap: 12 },
});
