import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator, Modal, ScrollView,
  StyleSheet, Text, TextInput,
  TouchableOpacity, View
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { GlowBackground } from '../../components/shared/GlowBackground';
import { supabase } from '../../lib/supabase';
import { Colors, Font, Radius } from '../../styles/theme';

// ─── типы ────────────────────────────────────────────────────
type Exhibition = {
  id: string;
  name: string;
  description: string;
  location: string;
  start_date: string;
  end_date: string;
  color: string;
  category?: string;
  website?: string;
};

type Booth = {
  id: string;
  company_name: string;
  description: string;
  booth_number: string;
  hall: string;
  tags: string[];
};

type ScreenView = 'info' | 'booths';

// ─── SVG иконки ───────────────────────────────────────────────
function IconSearch() {
  return (
    <Svg width={15} height={15} viewBox="0 0 24 24" fill="none">
      <Path d="M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.35-4.35" stroke={Colors.textMuted} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function IconFilter({ active }: { active: boolean }) {
  return (
    <Svg width={17} height={17} viewBox="0 0 24 24" fill="none">
      <Path d="M3 6h18M7 12h10M11 18h2" stroke={active ? Colors.primary : Colors.textMuted} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

// ─── главный компонент ───────────────────────────────────────
export default function ExhibitionDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router  = useRouter();

  const [exhibition, setExhibition] = useState<Exhibition | null>(null);
  const [booths, setBooths]         = useState<Booth[]>([]);
  const [filtered, setFiltered]     = useState<Booth[]>([]);
  const [loading, setLoading]       = useState(true);
  const [currentView, setCurrentView] = useState<ScreenView>('info');
  const [mapActivated, setMapActivated] = useState(false);

  // фильтры стендов
  const [search, setSearch]         = useState('');
  const [activeHall, setActiveHall] = useState('Все');
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [showTagFilter, setShowTagFilter] = useState(false);

  useEffect(() => { fetchData(); }, [id]);

  useEffect(() => {
    let result = booths;
    if (activeHall !== 'Все') result = result.filter(b => b.hall === activeHall);
    if (search) result = result.filter(b =>
      b.company_name.toLowerCase().includes(search.toLowerCase())
    );
    if (activeTags.length > 0)
      result = result.filter(b => activeTags.some(t => b.tags?.includes(t)));
    setFiltered(result);
  }, [search, activeHall, activeTags, booths]);

  async function fetchData() {
    const [exRes, boothRes] = await Promise.all([
      supabase.from('exhibitions').select('*').eq('id', id).single(),
      supabase.from('booths').select('*').eq('exhibition_id', id).order('hall'),
    ]);
    if (exRes.data) setExhibition(exRes.data);
    if (boothRes.data) { setBooths(boothRes.data); setFiltered(boothRes.data); }

    // проверяем активирована ли карта
    const activated = await AsyncStorage.getItem(`map_activated_${id}`);
    if (activated) setMapActivated(true);

    setLoading(false);
  }

  async function activateMap() {
    await AsyncStorage.setItem(`map_activated_${id}`, 'true');
    await AsyncStorage.setItem('active_exhibition_id', id);
    setMapActivated(true);
    router.push('/(tabs)/map');
  }

  function toggleTag(tag: string) {
    setActiveTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  }

  const halls    = ['Все', ...Array.from(new Set(booths.map(b => b.hall).filter(Boolean)))];
  const allTags  = [...new Set(booths.flatMap(b => b.tags ?? []))].sort();
  const hasTagFilter = activeTags.length > 0;

  function formatDate(dateStr: string, short = false) {
    return new Date(dateStr).toLocaleDateString('ru-RU', short
      ? { day: 'numeric', month: 'short' }
      : { day: 'numeric', month: 'long', year: 'numeric' }
    );
  }

  function getDaysLeft() {
    const now   = new Date();
    const start = new Date(exhibition!.start_date);
    const end   = new Date(exhibition!.end_date);
    if (now >= start && now <= end) return 'Сейчас идёт';
    if (now < start) {
      const days = Math.ceil((start.getTime() - now.getTime()) / 86400000);
      return `Через ${days} ${days === 1 ? 'день' : days < 5 ? 'дня' : 'дней'}`;
    }
    return 'Завершена';
  }

  if (loading) return (
    <View style={styles.loader}>
      <ActivityIndicator color={Colors.primary} size="large" />
    </View>
  );

  // ════════════════════════════════════════════════════════════
  // ЭКРАН 1 — Информация о выставке
  // ════════════════════════════════════════════════════════════
  if (currentView === 'info') {
    return (
      <View style={styles.root}>
        <GlowBackground intensity="low" position="top-right" />

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.infoScroll}>

          {/* шапка */}
          <View style={styles.infoHero}>
            <TouchableOpacity onPress={() => router.back()} style={styles.back}>
              <Text style={styles.backText}>←</Text>
            </TouchableOpacity>

            {/* акцентная полоса цвета выставки */}
            <View style={[styles.heroAccent, { backgroundColor: exhibition?.color }]} />

            {/* категория */}
            {exhibition?.category && (
              <View style={[styles.heroCategoryChip, { borderColor: exhibition.color }]}>
                <Text style={[styles.heroCategoryText, { color: exhibition.color }]}>
                  {exhibition.category}
                </Text>
              </View>
            )}

            <Text style={styles.heroName}>{exhibition?.name}</Text>

            {/* статус */}
            <View style={styles.heroStatusRow}>
              <View style={[styles.heroStatus, {
                backgroundColor: getDaysLeft() === 'Сейчас идёт'
                  ? 'rgba(76,175,80,0.15)' : 'rgba(255,255,255,0.06)',
                borderColor: getDaysLeft() === 'Сейчас идёт'
                  ? 'rgba(76,175,80,0.4)' : Colors.border,
              }]}>
                <Text style={[styles.heroStatusText, {
                  color: getDaysLeft() === 'Сейчас идёт' ? '#4CAF50' : Colors.textMuted,
                }]}>
                  {getDaysLeft()}
                </Text>
              </View>
            </View>
          </View>

          {/* инфо-блоки */}
          <View style={styles.infoGrid}>
            <View style={styles.infoCard}>
              <Text style={styles.infoCardLabel}>ДАТА</Text>
              <Text style={styles.infoCardValue}>
                {formatDate(exhibition!.start_date, true)} — {formatDate(exhibition!.end_date, true)}
              </Text>
            </View>
            <View style={styles.infoCard}>
              <Text style={styles.infoCardLabel}>СТЕНДОВ</Text>
              <Text style={styles.infoCardValue}>{booths.length}</Text>
            </View>
          </View>

          {/* место */}
          <View style={styles.infoSection}>
            <Text style={styles.infoSectionLabel}>МЕСТО ПРОВЕДЕНИЯ</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoRowIcon}>📍</Text>
              <Text style={styles.infoRowText}>{exhibition?.location}</Text>
            </View>
          </View>

          {/* описание */}
          {exhibition?.description ? (
            <View style={styles.infoSection}>
              <Text style={styles.infoSectionLabel}>О ВЫСТАВКЕ</Text>
              <Text style={styles.infoDesc}>{exhibition.description}</Text>
            </View>
          ) : null}

          {/* павильоны */}
          {halls.length > 1 && (
            <View style={styles.infoSection}>
              <Text style={styles.infoSectionLabel}>ПАВИЛЬОНЫ</Text>
              <View style={styles.pavilionRow}>
                {halls.filter(h => h !== 'Все').map(hall => (
                  <View key={hall} style={styles.pavilionChip}>
                    <Text style={styles.pavilionChipText}>{hall}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* кнопки действий */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnPrimary]}
              onPress={() => setCurrentView('booths')}
            >
              <Text style={styles.actionBtnPrimaryText}>Смотреть стенды →</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, mapActivated ? styles.actionBtnActivated : styles.actionBtnSecondary]}
              onPress={activateMap}
            >
              <Text style={[styles.actionBtnSecondaryText, mapActivated && { color: '#4CAF50' }]}>
                {mapActivated ? '✓ Карта активирована' : '🗺️ Активировать карту'}
              </Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </View>
    );
  }

  // ════════════════════════════════════════════════════════════
  // ЭКРАН 2 — Список стендов
  // ════════════════════════════════════════════════════════════
  return (
    <View style={styles.root}>
      <GlowBackground intensity="low" position="top-right" />

      {/* шапка списка */}
      <View style={[styles.boothsHeader, { borderBottomColor: exhibition?.color || Colors.primary }]}>
        <TouchableOpacity onPress={() => setCurrentView('info')} style={styles.back}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.boothsHeaderName}>{exhibition?.name}</Text>
          <Text style={styles.boothsHeaderMeta}>{filtered.length} стендов</Text>
        </View>
        {/* кнопка карты */}
        <TouchableOpacity
          style={[styles.mapBtn, mapActivated && styles.mapBtnActive]}
          onPress={activateMap}
        >
          <Text style={styles.mapBtnText}>🗺️</Text>
        </TouchableOpacity>
      </View>

      {/* поиск + фильтр */}
      <View style={styles.searchRow}>
        <View style={styles.searchWrap}>
          <View style={{ marginRight: 8 }}><IconSearch /></View>
          <TextInput
            style={styles.searchInput}
            placeholder="Поиск стендов..."
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
          style={[styles.filterBtn, hasTagFilter && styles.filterBtnActive]}
          onPress={() => setShowTagFilter(true)}
        >
          <IconFilter active={hasTagFilter} />
          {hasTagFilter && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeTags.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* фильтры по залам */}
      <View style={{ height: 46 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.hallsRow}
        >
          {halls.map(hall => (
            <TouchableOpacity
              key={hall}
              style={[styles.hallChip, activeHall === hall && styles.hallChipActive]}
              onPress={() => setActiveHall(hall)}
            >
              <Text style={[styles.hallChipText, activeHall === hall && styles.hallChipTextActive]}>
                {hall}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* активные теги */}
      {hasTagFilter && (
        <View style={styles.activeTagsRow}>
          {activeTags.map(tag => (
            <TouchableOpacity key={tag} style={styles.activeTag} onPress={() => toggleTag(tag)}>
              <Text style={styles.activeTagText}>{tag} ✕</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* список стендов */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
        {filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🔍</Text>
            <Text style={styles.emptyText}>Стенды не найдены</Text>
          </View>
        ) : filtered.map(booth => (
          <TouchableOpacity
            key={booth.id}
            style={styles.boothCard}
            onPress={() => router.push(`/booth/${booth.id}`)}
            activeOpacity={0.8}
          >
            <View style={styles.boothTop}>
              <View style={styles.boothLogo}>
                <Text style={styles.boothLogoText}>{booth.company_name[0]}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.boothName}>{booth.company_name}</Text>
                <Text style={styles.boothNumber}>Стенд {booth.booth_number} · {booth.hall}</Text>
              </View>
              <Text style={styles.arrow}>›</Text>
            </View>
            {booth.description ? (
              <Text style={styles.boothDesc} numberOfLines={2}>{booth.description}</Text>
            ) : null}
            {booth.tags?.length > 0 && (
              <View style={styles.tags}>
                {booth.tags.slice(0, 3).map(tag => (
                  <View key={tag} style={styles.tag}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            )}
          </TouchableOpacity>
        ))}
        <View style={{ height: 20 }} />
      </ScrollView>

      {/* модалка фильтра по тегам */}
      <Modal visible={showTagFilter} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowTagFilter(false)}>
          <TouchableOpacity activeOpacity={1}>
            <View style={styles.modal}>
              <View style={styles.modalHandle} />
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Фильтр по тегам</Text>
                <TouchableOpacity onPress={() => setShowTagFilter(false)}>
                  <Text style={styles.modalClose}>✕</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.filterOptions}>
                {allTags.map(tag => (
                  <TouchableOpacity
                    key={tag}
                    style={[styles.filterOption, activeTags.includes(tag) && styles.filterOptionActive]}
                    onPress={() => toggleTag(tag)}
                  >
                    <Text style={[styles.filterOptionText, activeTags.includes(tag) && styles.filterOptionTextActive]}>
                      {tag}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity style={styles.applyBtn} onPress={() => setShowTagFilter(false)}>
                <Text style={styles.applyBtnText}>Применить</Text>
              </TouchableOpacity>
              {hasTagFilter && (
                <TouchableOpacity style={styles.resetBtn} onPress={() => setActiveTags([])}>
                  <Text style={styles.resetBtnText}>Сбросить</Text>
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

  // ── info экран ──
  infoScroll:     { paddingBottom: 40 },
  infoHero:       { backgroundColor: '#180010', paddingTop: 56, paddingHorizontal: 20, paddingBottom: 24, position: 'relative' },
  heroAccent:     { height: 3, position: 'absolute', top: 0, left: 0, right: 0 },
  heroCategoryChip: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 3, marginBottom: 12, marginTop: 8 },
  heroCategoryText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  heroName:       { fontSize: Font.xl, fontWeight: '900', color: '#fff', letterSpacing: -0.5, marginBottom: 14, lineHeight: 34 },
  heroStatusRow:  { flexDirection: 'row' },
  heroStatus:     { borderWidth: 1, borderRadius: Radius.full, paddingHorizontal: 12, paddingVertical: 4 },
  heroStatusText: { fontSize: Font.xs, fontWeight: '600' },

  infoGrid:       { flexDirection: 'row', gap: 12, padding: 20, paddingBottom: 0 },
  infoCard:       { flex: 1, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, padding: 14 },
  infoCardLabel:  { fontSize: 9, color: Colors.textMuted, letterSpacing: 2, fontWeight: '700', marginBottom: 6 },
  infoCardValue:  { fontSize: Font.sm, fontWeight: '700', color: Colors.textPrimary },

  infoSection:    { paddingHorizontal: 20, paddingTop: 20 },
  infoSectionLabel:{ fontSize: 9, color: Colors.textMuted, letterSpacing: 2, fontWeight: '700', marginBottom: 10 },
  infoRow:        { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  infoRowIcon:    { fontSize: 14 },
  infoRowText:    { flex: 1, fontSize: Font.sm, color: Colors.textSecondary, lineHeight: 20 },
  infoDesc:       { fontSize: Font.sm, color: Colors.textSecondary, lineHeight: 22 },

  pavilionRow:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pavilionChip:   { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, paddingHorizontal: 12, paddingVertical: 6 },
  pavilionChipText:{ fontSize: Font.xs, color: Colors.textSecondary, fontWeight: '600' },

  actionButtons:  { padding: 20, gap: 10, marginTop: 8 },
  actionBtn:      { borderRadius: Radius.md, paddingVertical: 16, alignItems: 'center' },
  actionBtnPrimary:{ backgroundColor: Colors.primary },
  actionBtnPrimaryText:{ color: '#fff', fontSize: Font.md, fontWeight: '700' },
  actionBtnSecondary:{ backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  actionBtnActivated:{ backgroundColor: 'rgba(76,175,80,0.1)', borderWidth: 1, borderColor: 'rgba(76,175,80,0.3)' },
  actionBtnSecondaryText:{ color: Colors.textSecondary, fontSize: Font.md, fontWeight: '600' },

  // ── booths экран ──
  boothsHeader:   { flexDirection: 'row', alignItems: 'center', paddingTop: 56, paddingBottom: 14, paddingHorizontal: 20, borderBottomWidth: 2 },
  boothsHeaderName:{ fontSize: Font.md, fontWeight: '800', color: Colors.textPrimary },
  boothsHeaderMeta:{ fontSize: Font.xs, color: Colors.textMuted, marginTop: 2 },
  mapBtn:         { width: 38, height: 38, borderRadius: Radius.md, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  mapBtnActive:   { borderColor: '#4CAF50', backgroundColor: 'rgba(76,175,80,0.1)' },
  mapBtnText:     { fontSize: 18 },

  searchRow:      { flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4 },
  searchWrap:     { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, paddingHorizontal: 12 },
  searchInput:    { flex: 1, paddingVertical: 11, fontSize: Font.sm, color: Colors.textPrimary },
  clearBtn:       { color: Colors.textMuted, fontSize: 14, padding: 4 },
  filterBtn:      { width: 44, height: 44, borderRadius: Radius.md, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  filterBtnActive:{ borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  filterBadge:    { position: 'absolute', top: 6, right: 6, width: 14, height: 14, borderRadius: 7, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  filterBadgeText:{ color: '#fff', fontSize: 8, fontWeight: '700' },

  hallsRow:       { paddingHorizontal: 20, alignItems: 'center', gap: 8 },
  hallChip:       { paddingHorizontal: 14, paddingVertical: 7, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  hallChipActive: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
  hallChipText:   { fontSize: 12, color: Colors.textMuted, fontWeight: '600' },
  hallChipTextActive:{ color: Colors.primary },

  activeTagsRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 20, paddingBottom: 8 },
  activeTag:      { backgroundColor: Colors.primaryLight, borderWidth: 1, borderColor: Colors.primaryBorder, borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 4 },
  activeTagText:  { color: Colors.primary, fontSize: Font.xs, fontWeight: '600' },

  list:           { padding: 20, paddingTop: 10, gap: 10 },
  emptyState:     { alignItems: 'center', paddingTop: 48 },
  emptyIcon:      { fontSize: 36, marginBottom: 10 },
  emptyText:      { fontSize: Font.md, color: Colors.textMuted, fontWeight: '600' },

  boothCard:      { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, padding: 14 },
  boothTop:       { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  boothLogo:      { width: 42, height: 42, borderRadius: Radius.sm, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  boothLogoText:  { fontSize: Font.lg, fontWeight: '800', color: Colors.primary },
  boothName:      { fontSize: Font.md, fontWeight: '700', color: Colors.textPrimary },
  boothNumber:    { fontSize: Font.xs, color: Colors.textMuted, marginTop: 2 },
  boothDesc:      { fontSize: Font.sm, color: Colors.textSecondary, marginBottom: 8, lineHeight: 18 },
  arrow:          { color: Colors.textMuted, fontSize: 20 },
  tags:           { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  tag:            { backgroundColor: Colors.primaryLight, borderWidth: 1, borderColor: Colors.primaryBorder, borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 3 },
  tagText:        { fontSize: Font.xs, color: Colors.primary, fontWeight: '600' },

  back:           { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  backText:       { color: '#fff', fontSize: 16 },

  modalOverlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modal:          { backgroundColor: '#13131f', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 48 },
  modalHandle:    { width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: 'center', marginBottom: 20 },
  modalHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle:     { fontSize: Font.lg, fontWeight: '800', color: Colors.textPrimary },
  modalClose:     { color: Colors.textMuted, fontSize: 18 },
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
