import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator, ScrollView,
  StyleSheet, Text,
  TouchableOpacity, View
} from 'react-native';
import { GlowBackground } from '../../components/shared/GlowBackground';
import { supabase } from '../../lib/supabase';
import { Colors, Font, Radius } from '../../styles/theme';

type Profile = {
  full_name: string;
  role: string;
  company_name: string;
  avatar_url: string;
};

export default function Profile() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchProfile(); }, []);

  async function fetchProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    setEmail(user.email || '');
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (data) setProfile(data);
    else {
      // создаём профиль если нет
      const meta = user.user_metadata;
      const newProfile = {
        id: user.id,
        full_name: meta?.full_name || '',
        role: meta?.role || 'visitor',
        company_name: meta?.company_name || '',
        avatar_url: '',
      };
      await supabase.from('profiles').insert(newProfile);
      setProfile(newProfile as Profile);
    }
    setLoading(false);
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.replace('/auth');
  }

  if (loading) return (
    <View style={styles.loader}>
      <ActivityIndicator color={Colors.primary} size="large" />
    </View>
  );

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : email[0]?.toUpperCase() || '?';

  return (
    <View style={styles.root}>
      <GlowBackground intensity="medium" position="top-right" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* аватар */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.name}>{profile?.full_name || 'Пользователь'}</Text>
          <Text style={styles.email}>{email}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>
              {profile?.role === 'exhibitor' ? '🏢 Экспонент' : '👤 Посетитель'}
            </Text>
          </View>
        </View>

        {/* инфо */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ИНФОРМАЦИЯ</Text>

          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Имя</Text>
              <Text style={styles.infoValue}>{profile?.full_name || '—'}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{email}</Text>
            </View>
            {profile?.company_name ? (
              <>
                <View style={styles.divider} />
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Компания</Text>
                  <Text style={styles.infoValue}>{profile.company_name}</Text>
                </View>
              </>
            ) : null}
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Роль</Text>
              <Text style={styles.infoValue}>
                {profile?.role === 'exhibitor' ? 'Экспонент' : 'Посетитель'}
              </Text>
            </View>
          </View>
        </View>

        {/* статистика */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>СТАТИСТИКА</Text>
          <View style={styles.statsRow}>
            <StatCard label="Выставок" value="—" icon="🏛️" />
            <StatCard label="Стендов" value="—" icon="🏢" />
            <StatCard label="Товаров" value="—" icon="🛋️" />
          </View>
        </View>

        {/* действия */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>НАСТРОЙКИ</Text>
          <View style={styles.infoCard}>
            <TouchableOpacity style={styles.menuRow}>
              <Text style={styles.menuIcon}>🔔</Text>
              <Text style={styles.menuText}>Уведомления</Text>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity style={styles.menuRow}>
              <Text style={styles.menuIcon}>🌐</Text>
              <Text style={styles.menuText}>Язык</Text>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity style={styles.menuRow}>
              <Text style={styles.menuIcon}>❓</Text>
              <Text style={styles.menuText}>Помощь</Text>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* выход */}
        <TouchableOpacity style={styles.signOutBtn} onPress={signOut}>
          <Text style={styles.signOutText}>Выйти из аккаунта</Text>
        </TouchableOpacity>

        <Text style={styles.version}>ExpoHub v1.0.0</Text>

      </ScrollView>
    </View>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <View style={statStyles.card}>
      <Text style={statStyles.icon}>{icon}</Text>
      <Text style={statStyles.value}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
    </View>
  );
}

const statStyles = StyleSheet.create({
  card: { flex: 1, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, padding: 12, alignItems: 'center', gap: 4 },
  icon: { fontSize: 22 },
  value: { fontSize: Font.lg, fontWeight: '800', color: Colors.textPrimary },
  label: { fontSize: Font.xs, color: Colors.textMuted },
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  loader: { flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingBottom: 40 },
  avatarSection: { alignItems: 'center', paddingTop: 70, paddingBottom: 28, paddingHorizontal: 20 },
  avatar: { width: 88, height: 88, borderRadius: 44, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 14, shadowColor: Colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 14, elevation: 6 },
  avatarText: { fontSize: Font.xl, fontWeight: '900', color: '#fff' },
  name: { fontSize: Font.lg, fontWeight: '800', color: Colors.textPrimary, marginBottom: 4 },
  email: { fontSize: Font.sm, color: Colors.textMuted, marginBottom: 10 },
  roleBadge: { backgroundColor: Colors.primaryLight, borderWidth: 1, borderColor: Colors.primaryBorder, borderRadius: Radius.full, paddingHorizontal: 14, paddingVertical: 5 },
  roleBadgeText: { fontSize: Font.xs, color: Colors.primary, fontWeight: '700' },
  section: { paddingHorizontal: 20, marginBottom: 20 },
  sectionTitle: { fontSize: Font.xs, color: Colors.textMuted, letterSpacing: 2, fontWeight: '700', marginBottom: 10 },
  infoCard: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, overflow: 'hidden' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14 },
  infoLabel: { fontSize: Font.sm, color: Colors.textMuted },
  infoValue: { fontSize: Font.sm, color: Colors.textPrimary, fontWeight: '600', maxWidth: '60%', textAlign: 'right' },
  divider: { height: 1, backgroundColor: Colors.border, marginHorizontal: 14 },
  statsRow: { flexDirection: 'row', gap: 10 },
  menuRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  menuIcon: { fontSize: 18 },
  menuText: { flex: 1, fontSize: Font.sm, color: Colors.textPrimary },
  menuArrow: { fontSize: 18, color: Colors.textMuted },
  signOutBtn: { marginHorizontal: 20, marginTop: 8, backgroundColor: 'rgba(196,18,48,0.1)', borderWidth: 1, borderColor: Colors.primaryBorder, borderRadius: Radius.md, paddingVertical: 14, alignItems: 'center' },
  signOutText: { color: Colors.primary, fontSize: Font.md, fontWeight: '700' },
  version: { textAlign: 'center', fontSize: Font.xs, color: Colors.textMuted, marginTop: 16 },
});