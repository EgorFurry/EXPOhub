import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator, Modal, ScrollView,
  StyleSheet, Text, TextInput,
  TouchableOpacity, View
} from 'react-native';
import { GlowBackground } from '../../components/shared/GlowBackground';
import { supabase } from '../../lib/supabase';
import { Colors, Font, Radius } from '../../styles/theme';
import { Exhibition } from '../../types';

export default function Home() {
  const router = useRouter();
  const [exhibitions, setExhibitions] = useState<Exhibition[]>([]);
  const [filtered, setFiltered] = useState<Exhibition[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showFilter, setShowFilter] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');

  useEffect(() => { fetchExhibitions(); }, []);

  useEffect(() => {
    let result = exhibitions;
    if (search) result = result.filter(e =>
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.location.toLowerCase().includes(search.toLowerCase())
    );
    if (selectedLocation) result = result.filter(e => e.location.includes(selectedLocation));
    if (selectedMonth) result = result.filter(e => e.start_date.startsWith(selectedMonth));
    setFiltered(result);
  }, [search, selectedLocation, selectedMonth, exhibitions]);

  async function fetchExhibitions() {
    const { data } = await supabase.from('exhibitions').select('*').order('start_date');
    if (data) { setExhibitions(data); setFiltered(data); }
    setLoading(false);
  }

  const locations = [...new Set(exhibitions.map(e => e.location.split(',')[1]?.trim()).filter(Boolean))];
  const months = [...new Set(exhibitions.map(e => e.start_date.slice(0, 7)))];
  const hasFilter = selectedLocation || selectedMonth;

  if (loading) return (
    <View style={styles.loader}>
      <ActivityIndicator color={Colors.primary} size="large" />
    </View>
  );

  return (
    <View style={styles.root}>
      <GlowBackground intensity="low" position="top-right" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Добро пожаловать 👋</Text>
            <Text style={styles.title}>ExpoHub</Text>
          </View>
          <TouchableOpacity style={styles.avatar}>
            <Text style={styles.avatarText}>И</Text>
          </TouchableOpacity>
        </View>

        {/* поиск + фильтр */}
        <View style={styles.searchRow}>
          <View style={styles.searchWrap}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Поиск выставок..."
              placeholderTextColor={Colors.textMuted}
              value={search}
              onChangeText={setSearch}
            />
            {search ? (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Text style={styles.clearBtn}>✕</Text>
              </TouchableOpacity>
            ) : null}
          </View>
          <TouchableOpacity
            style={[styles.filterBtn, hasFilter && styles.filterBtnActive]}
            onPress={() => setShowFilter(true)}
          >
            <Text style={styles.filterIcon}>⚙️</Text>
            {hasFilter && <View style={styles.filterDot} />}
          </TouchableOpacity>
        </View>

        {/* активные фильтры */}
        {hasFilter && (
          <View style={styles.activeFilters}>
            {selectedLocation ? (
              <TouchableOpacity style={styles.activeFilter} onPress={() => setSelectedLocation('')}>
                <Text style={styles.activeFilterText}>📍 {selectedLocation} ✕</Text>
              </TouchableOpacity>
            ) : null}
            {selectedMonth ? (
              <TouchableOpacity style={styles.activeFilter} onPress={() => setSelectedMonth('')}>
                <Text style={styles.activeFilterText}>📅 {selectedMonth} ✕</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        )}

        {/* ближайшие */}
        {!search && !hasFilter && (
          <>
            <Text style={styles.sectionTitle}>БЛИЖАЙШИЕ ВЫСТАВКИ</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontal}>
              {exhibitions.slice(0, 3).map(ex => (
                <TouchableOpacity
                  key={ex.id}
                  style={styles.featuredCard}
                  onPress={() => router.push(`/exhibition/${ex.id}`)}
                >
                  <View style={[styles.featuredAccent, { backgroundColor: ex.color }]} />
                  <Text style={[styles.featuredDate, { color: ex.color }]}>
                    {new Date(ex.start_date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                  </Text>
                  <Text style={styles.featuredName}>{ex.name}</Text>
                  <Text style={styles.featuredLocation}>📍 {ex.location}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

        <Text style={styles.sectionTitle}>
          {hasFilter || search ? `НАЙДЕНО: ${filtered.length}` : 'ВСЕ ВЫСТАВКИ'}
        </Text>
        {filtered.map(ex => (
          <TouchableOpacity
            key={ex.id}
            style={styles.listCard}
            onPress={() => router.push(`/exhibition/${ex.id}`)}
          >
            <View style={[styles.listCardBar, { backgroundColor: ex.color }]} />
            <View style={styles.listCardContent}>
              <Text style={styles.listCardName}>{ex.name}</Text>
              <Text style={styles.listCardMeta}>📍 {ex.location}</Text>
              <Text style={styles.listCardMeta}>
                📅 {new Date(ex.start_date).toLocaleDateString('ru-RU')} — {new Date(ex.end_date).toLocaleDateString('ru-RU')}
              </Text>
            </View>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
        ))}

      </ScrollView>

      {/* модалка фильтров */}
      <Modal visible={showFilter} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Фильтры</Text>
              <TouchableOpacity onPress={() => setShowFilter(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.filterLabel}>ГОРОД</Text>
            <View style={styles.filterOptions}>
              {locations.map(loc => (
                <TouchableOpacity
                  key={loc}
                  style={[styles.filterOption, selectedLocation === loc && styles.filterOptionActive]}
                  onPress={() => setSelectedLocation(selectedLocation === loc ? '' : loc)}
                >
                  <Text style={[styles.filterOptionText, selectedLocation === loc && styles.filterOptionTextActive]}>
                    {loc}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.filterLabel}>МЕСЯЦ</Text>
            <View style={styles.filterOptions}>
              {months.map(m => (
                <TouchableOpacity
                  key={m}
                  style={[styles.filterOption, selectedMonth === m && styles.filterOptionActive]}
                  onPress={() => setSelectedMonth(selectedMonth === m ? '' : m)}
                >
                  <Text style={[styles.filterOptionText, selectedMonth === m && styles.filterOptionTextActive]}>
                    {new Date(m + '-01').toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={styles.applyBtn}
              onPress={() => setShowFilter(false)}
            >
              <Text style={styles.applyBtnText}>Применить</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.resetBtn}
              onPress={() => { setSelectedLocation(''); setSelectedMonth(''); }}
            >
              <Text style={styles.resetBtnText}>Сбросить фильтры</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  loader: { flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 20, paddingTop: 60 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  greeting: { fontSize: Font.xs, color: Colors.textMuted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 },
  title: { fontSize: Font.xl, fontWeight: '800', color: Colors.textPrimary, letterSpacing: -0.5 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: Font.md, fontWeight: '700' },
  searchRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  searchWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, paddingHorizontal: 12 },
  searchIcon: { fontSize: 14, marginRight: 6 },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: Font.sm, color: Colors.textPrimary },
  clearBtn: { color: Colors.textMuted, fontSize: 14, padding: 4 },
  filterBtn: { width: 48, height: 48, borderRadius: Radius.md, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  filterBtnActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  filterIcon: { fontSize: 18 },
  filterDot: { position: 'absolute', top: 8, right: 8, width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.primary },
  activeFilters: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 12 },
  activeFilter: { backgroundColor: Colors.primaryLight, borderWidth: 1, borderColor: Colors.primaryBorder, borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 4 },
  activeFilterText: { color: Colors.primary, fontSize: Font.xs, fontWeight: '600' },
  sectionTitle: { fontSize: Font.xs, color: Colors.textMuted, letterSpacing: 2, fontWeight: '700', marginBottom: 12 },
  horizontal: { marginHorizontal: -20, paddingHorizontal: 20, marginBottom: 28 },
  featuredCard: { width: 220, marginRight: 12, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.lg, padding: 16, overflow: 'hidden' },
  featuredAccent: { position: 'absolute', top: 0, left: 0, right: 0, height: 3 },
  featuredDate: { fontSize: Font.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, marginTop: 8 },
  featuredName: { fontSize: Font.md, fontWeight: '800', color: Colors.textPrimary, marginBottom: 8 },
  featuredLocation: { fontSize: Font.sm, color: Colors.textMuted },
  listCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, marginBottom: 8, overflow: 'hidden' },
  listCardBar: { width: 4, alignSelf: 'stretch' },
  listCardContent: { flex: 1, padding: 14 },
  listCardName: { fontSize: Font.md, fontWeight: '700', color: Colors.textPrimary, marginBottom: 4 },
  listCardMeta: { fontSize: Font.xs, color: Colors.textMuted, marginBottom: 2 },
  arrow: { color: Colors.textMuted, fontSize: 20, paddingRight: 14 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#13131f', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: Font.lg, fontWeight: '800', color: Colors.textPrimary },
  modalClose: { color: Colors.textMuted, fontSize: 18 },
  filterLabel: { fontSize: Font.xs, color: Colors.textMuted, letterSpacing: 2, fontWeight: '700', marginBottom: 10 },
  filterOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  filterOption: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  filterOptionActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  filterOptionText: { fontSize: Font.sm, color: Colors.textMuted, fontWeight: '600' },
  filterOptionTextActive: { color: Colors.primary },
  applyBtn: { backgroundColor: Colors.primary, borderRadius: Radius.md, paddingVertical: 16, alignItems: 'center', marginBottom: 10 },
  applyBtnText: { color: '#fff', fontSize: Font.md, fontWeight: '700' },
  resetBtn: { borderRadius: Radius.md, paddingVertical: 14, alignItems: 'center' },
  resetBtnText: { color: Colors.textMuted, fontSize: Font.sm },
});