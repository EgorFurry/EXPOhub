import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator, Modal, ScrollView,
  StyleSheet, Text, TextInput,
  TouchableOpacity, View
} from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { GlowBackground } from '../../components/shared/GlowBackground';
import { supabase } from '../../lib/supabase';
import { Colors, Font, Radius } from '../../styles/theme';

type Exhibition = {
  id: string;
  name: string;
  description: string;
  location: string;
  start_date: string;
  end_date: string;
  color: string;
  category?: string;
};

const CATEGORIES = ['Мебель', 'Интерьер', 'Строительство', 'Технологии', 'Дизайн', 'Другое'];

// ─── SVG иконки ───────────────────────────────────────────────
function IconSearch() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Circle cx="11" cy="11" r="7" stroke={Colors.textMuted} strokeWidth={1.8} />
      <Line x1="16.5" y1="16.5" x2="22" y2="22" stroke={Colors.textMuted} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

function IconFilter({ active }: { active: boolean }) {
  const color = active ? Colors.primary : Colors.textMuted;
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M3 6h18M7 12h10M11 18h2" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

function IconClose() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Path d="M18 6L6 18M6 6l12 12" stroke={Colors.textMuted} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

// ─── главный компонент ───────────────────────────────────────
export default function Home() {
  const router = useRouter();
  const [exhibitions, setExhibitions] = useState<Exhibition[]>([]);
  const [filtered, setFiltered]       = useState<Exhibition[]>([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState('');
  const [showFilter, setShowFilter]   = useState(false);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedMonth, setSelectedMonth]       = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  useEffect(() => { fetchExhibitions(); }, []);

  useEffect(() => {
    let result = exhibitions;
    if (search)
      result = result.filter(e =>
        e.name.toLowerCase().includes(search.toLowerCase()) ||
        e.location.toLowerCase().includes(search.toLowerCase())
      );
    if (selectedLocation)
      result = result.filter(e => e.location.includes(selectedLocation));
    if (selectedMonth)
      result = result.filter(e => e.start_date.startsWith(selectedMonth));
    if (selectedCategory)
      result = result.filter(e => e.category === selectedCategory);
    setFiltered(result);
  }, [search, selectedLocation, selectedMonth, selectedCategory, exhibitions]);

  async function fetchExhibitions() {
    const { data } = await supabase.from('exhibitions').select('*').order('start_date');
    if (data) { setExhibitions(data); setFiltered(data); }
    setLoading(false);
  }

  const locations   = [...new Set(exhibitions.map(e => e.location.split(',')[0]?.trim()).filter(Boolean))];
  const months      = [...new Set(exhibitions.map(e => e.start_date.slice(0, 7)))];
  const hasFilter   = !!(selectedLocation || selectedMonth || selectedCategory);
  const activeCount = [selectedLocation, selectedMonth, selectedCategory].filter(Boolean).length;

  function resetFilters() {
    setSelectedLocation('');
    setSelectedMonth('');
    setSelectedCategory('');
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  }

  if (loading) return (
    <View style={styles.loader}>
      <ActivityIndicator color={Colors.primary} size="large" />
    </View>
  );

  return (
    <View style={styles.root}>
      <GlowBackground intensity="low" position="top-right" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* ── шапка ── */}
        <View style={styles.header}>
          <Text style={styles.title}>ExpoHub</Text>
          <Text style={styles.greeting}>Добро пожаловать 👋</Text>
        </View>

        {/* ── поиск + фильтр ── */}
        <View style={styles.searchRow}>
          <View style={styles.searchWrap}>
            <View style={styles.searchIconWrap}>
              <IconSearch />
            </View>
            <TextInput
              style={styles.searchInput}
              placeholder="Поиск выставок..."
              placeholderTextColor={Colors.textMuted}
              value={search}
              onChangeText={setSearch}
            />
            {search ? (
              <TouchableOpacity onPress={() => setSearch('')} style={styles.clearBtn}>
                <IconClose />
              </TouchableOpacity>
            ) : null}
          </View>

          <TouchableOpacity
            style={[styles.filterBtn, hasFilter && styles.filterBtnActive]}
            onPress={() => setShowFilter(true)}
          >
            <IconFilter active={hasFilter} />
            {activeCount > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{activeCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* ── активные фильтры — чипы ── */}
        {hasFilter && (
          <View style={styles.activeFilters}>
            {selectedLocation ? (
              <TouchableOpacity style={styles.chip} onPress={() => setSelectedLocation('')}>
                <Text style={styles.chipText}>{selectedLocation}</Text>
                <Text style={styles.chipX}>✕</Text>
              </TouchableOpacity>
            ) : null}
            {selectedMonth ? (
              <TouchableOpacity style={styles.chip} onPress={() => setSelectedMonth('')}>
                <Text style={styles.chipText}>
                  {new Date(selectedMonth + '-01').toLocaleDateString('ru-RU', { month: 'long' })}
                </Text>
                <Text style={styles.chipX}>✕</Text>
              </TouchableOpacity>
            ) : null}
            {selectedCategory ? (
              <TouchableOpacity style={styles.chip} onPress={() => setSelectedCategory('')}>
                <Text style={styles.chipText}>{selectedCategory}</Text>
                <Text style={styles.chipX}>✕</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        )}

        {/* ── ближайшие (горизонтальный скролл) ── */}
        {!search && !hasFilter && exhibitions.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>БЛИЖАЙШИЕ</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.horizontal}
              contentContainerStyle={{ paddingHorizontal: 20 }}
            >
              {exhibitions.slice(0, 5).map(ex => (
                <TouchableOpacity
                  key={ex.id}
                  style={styles.featuredCard}
                  onPress={() => router.push(`/exhibition/${ex.id}`)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.featuredAccent, { backgroundColor: ex.color }]} />
                  <View style={styles.featuredBody}>
                    {ex.category ? (
                      <View style={[styles.categoryChip, { borderColor: ex.color }]}>
                        <Text style={[styles.categoryChipText, { color: ex.color }]}>{ex.category}</Text>
                      </View>
                    ) : null}
                    <Text style={styles.featuredName} numberOfLines={2}>{ex.name}</Text>
                    <Text style={[styles.featuredDate, { color: ex.color }]}>
                      {formatDate(ex.start_date)} — {formatDate(ex.end_date)}
                    </Text>
                    <Text style={styles.featuredLocation} numberOfLines={1}>
                      {ex.location.split(',')[0]}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

        {/* ── список всех ── */}
        <Text style={styles.sectionTitle}>
          {hasFilter || search ? `НАЙДЕНО: ${filtered.length}` : 'ВСЕ ВЫСТАВКИ'}
        </Text>

        {filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🔍</Text>
            <Text style={styles.emptyText}>Ничего не найдено</Text>
            <Text style={styles.emptyHint}>Попробуйте изменить фильтры или поисковый запрос</Text>
          </View>
        ) : (
          filtered.map(ex => (
            <TouchableOpacity
              key={ex.id}
              style={styles.listCard}
              onPress={() => router.push(`/exhibition/${ex.id}`)}
              activeOpacity={0.8}
            >
              <View style={[styles.listCardBar, { backgroundColor: ex.color }]} />
              <View style={styles.listCardContent}>
                <Text style={styles.listCardName}>{ex.name}</Text>
                <Text style={styles.listCardMeta}>
                  {ex.location.split(',')[0]}
                </Text>
                <Text style={styles.listCardMeta}>
                  {formatDate(ex.start_date)} — {formatDate(ex.end_date)}
                </Text>
                {ex.category ? (
                  <View style={styles.listCardCategory}>
                    <Text style={styles.listCardCategoryText}>{ex.category}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.arrow}>›</Text>
            </TouchableOpacity>
          ))
        )}

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* ── модалка фильтров ── */}
      <Modal visible={showFilter} transparent animationType="slide">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowFilter(false)}
        >
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
            <View style={styles.modal}>
              <View style={styles.modalHandle} />

              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Фильтры</Text>
                <TouchableOpacity onPress={() => setShowFilter(false)} style={styles.modalCloseBtn}>
                  <Text style={styles.modalClose}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* город */}
              {locations.length > 0 && (
                <>
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
                </>
              )}

              {/* месяц */}
              {months.length > 0 && (
                <>
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
                </>
              )}

              {/* категория */}
              <Text style={styles.filterLabel}>КАТЕГОРИЯ</Text>
              <View style={styles.filterOptions}>
                {CATEGORIES.map(cat => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.filterOption, selectedCategory === cat && styles.filterOptionActive]}
                    onPress={() => setSelectedCategory(selectedCategory === cat ? '' : cat)}
                  >
                    <Text style={[styles.filterOptionText, selectedCategory === cat && styles.filterOptionTextActive]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity style={styles.applyBtn} onPress={() => setShowFilter(false)}>
                <Text style={styles.applyBtnText}>Применить</Text>
              </TouchableOpacity>

              {hasFilter && (
                <TouchableOpacity style={styles.resetBtn} onPress={resetFilters}>
                  <Text style={styles.resetBtnText}>Сбросить фильтры</Text>
                </TouchableOpacity>
              )}
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// ─── стили ───────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:           { flex: 1, backgroundColor: Colors.background },
  loader:         { flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },
  scroll:         { padding: 20, paddingTop: 60 },

  header:         { marginBottom: 24 },
  title:          { fontSize: Font.xl, fontWeight: '800', color: Colors.textPrimary, letterSpacing: -0.5, marginBottom: 4 },
  greeting:       { fontSize: Font.xs, color: Colors.textMuted, letterSpacing: 1 },

  searchRow:      { flexDirection: 'row', gap: 10, marginBottom: 12 },
  searchWrap:     { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, paddingHorizontal: 12 },
  searchIconWrap: { marginRight: 8 },
  searchInput:    { flex: 1, paddingVertical: 13, fontSize: Font.sm, color: Colors.textPrimary },
  clearBtn:       { padding: 4 },
  filterBtn:      { width: 48, height: 48, borderRadius: Radius.md, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  filterBtnActive:{ borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  filterBadge:    { position: 'absolute', top: 7, right: 7, width: 14, height: 14, borderRadius: 7, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  filterBadgeText:{ color: '#fff', fontSize: 8, fontWeight: '700' },

  activeFilters:  { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 12 },
  chip:           { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: Colors.primaryLight, borderWidth: 1, borderColor: Colors.primaryBorder, borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 5 },
  chipText:       { color: Colors.primary, fontSize: Font.xs, fontWeight: '600' },
  chipX:          { color: Colors.primary, fontSize: 10 },

  sectionTitle:   { fontSize: Font.xs, color: Colors.textMuted, letterSpacing: 2, fontWeight: '700', marginBottom: 12 },

  horizontal:     { marginHorizontal: -20, marginBottom: 28 },
  featuredCard:   { width: 200, marginRight: 12, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.lg, overflow: 'hidden' },
  featuredAccent: { height: 3 },
  featuredBody:   { padding: 14 },
  categoryChip:   { borderWidth: 1, borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start', marginBottom: 8 },
  categoryChipText:{ fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  featuredName:   { fontSize: Font.md, fontWeight: '800', color: Colors.textPrimary, marginBottom: 8, lineHeight: 20 },
  featuredDate:   { fontSize: Font.xs, fontWeight: '700', marginBottom: 4 },
  featuredLocation:{ fontSize: Font.xs, color: Colors.textMuted },

  listCard:       { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, marginBottom: 8, overflow: 'hidden' },
  listCardBar:    { width: 3, alignSelf: 'stretch' },
  listCardContent:{ flex: 1, padding: 14 },
  listCardName:   { fontSize: Font.md, fontWeight: '700', color: Colors.textPrimary, marginBottom: 4 },
  listCardMeta:   { fontSize: Font.xs, color: Colors.textMuted, marginBottom: 2 },
  listCardCategory:{ marginTop: 6, alignSelf: 'flex-start', backgroundColor: Colors.primaryLight, borderWidth: 1, borderColor: Colors.primaryBorder, borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 2 },
  listCardCategoryText:{ fontSize: 9, color: Colors.primary, fontWeight: '600' },
  arrow:          { color: Colors.textMuted, fontSize: 20, paddingRight: 14 },

  emptyState:     { alignItems: 'center', paddingVertical: 48 },
  emptyIcon:      { fontSize: 40, marginBottom: 12 },
  emptyText:      { fontSize: Font.md, fontWeight: '700', color: Colors.textPrimary, marginBottom: 6 },
  emptyHint:      { fontSize: Font.sm, color: Colors.textMuted, textAlign: 'center' },

  modalOverlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modal:          { backgroundColor: '#13131f', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 48 },
  modalHandle:    { width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: 'center', marginBottom: 20 },
  modalHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle:     { fontSize: Font.lg, fontWeight: '800', color: Colors.textPrimary },
  modalCloseBtn:  { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center' },
  modalClose:     { color: Colors.textMuted, fontSize: 14 },

  filterLabel:    { fontSize: Font.xs, color: Colors.textMuted, letterSpacing: 2, fontWeight: '700', marginBottom: 10 },
  filterOptions:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  filterOption:   { paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  filterOptionActive:{ borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  filterOptionText:{ fontSize: Font.sm, color: Colors.textMuted, fontWeight: '600' },
  filterOptionTextActive:{ color: Colors.primary },

  applyBtn:       { backgroundColor: Colors.primary, borderRadius: Radius.md, paddingVertical: 16, alignItems: 'center', marginBottom: 10 },
  applyBtnText:   { color: '#fff', fontSize: Font.md, fontWeight: '700' },
  resetBtn:       { borderRadius: Radius.md, paddingVertical: 14, alignItems: 'center' },
  resetBtnText:   { color: Colors.textMuted, fontSize: Font.sm },
});
