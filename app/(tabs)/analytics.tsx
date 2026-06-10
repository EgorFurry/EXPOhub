import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
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

// ─── типы ────────────────────────────────────────────────────
type VisitorProduct = {
  id: string;
  name: string;
  price: string;
  category: string;
  characteristics: string;
  logistics: string;
  note: string;
  created_at: string;
  booths: { company_name: string; hall: string; booth_number: string };
};

type BoothNote = {
  id: string;
  booth_id: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  note: string;
  rating: number;
  created_at: string;
  booths: { company_name: string; hall: string; booth_number: string };
};

// ─── SVG иконки ───────────────────────────────────────────────
function IconShare() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path d="M4 12v7a1 1 0 001 1h14a1 1 0 001-1v-7" stroke="#fff" strokeWidth={1.8} strokeLinecap="round" />
      <Path d="M16 6l-4-4-4 4" stroke="#fff" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Line x1="12" y1="2" x2="12" y2="15" stroke="#fff" strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

function IconSearch() {
  return (
    <Svg width={15} height={15} viewBox="0 0 24 24" fill="none">
      <Circle cx="11" cy="11" r="7" stroke={Colors.textMuted} strokeWidth={1.8} />
      <Line x1="16.5" y1="16.5" x2="22" y2="22" stroke={Colors.textMuted} strokeWidth={1.8} strokeLinecap="round" />
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
export default function Analytics() {
  const router = useRouter();
  const [products, setProducts]     = useState<VisitorProduct[]>([]);
  const [boothNotes, setBoothNotes] = useState<BoothNote[]>([]);
  const [loading, setLoading]       = useState(true);
  const [tab, setTab]               = useState<'products' | 'booths'>('products');
  const [sharing, setSharing]       = useState(false);

  // поиск и фильтры
  const [search, setSearch]                   = useState('');
  const [filterCategory, setFilterCategory]   = useState('');
  const [filterBooth, setFilterBooth]         = useState('');
  const [showFilter, setShowFilter]           = useState(false);

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const [productsRes, notesRes] = await Promise.all([
      supabase.from('visitor_products')
        .select('*, booths(company_name, hall, booth_number)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
      supabase.from('visitor_booth_notes')
        .select('*, booths(company_name, hall, booth_number)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
    ]);

    if (productsRes.data) setProducts(productsRes.data);
    if (notesRes.data) setBoothNotes(notesRes.data);
    setLoading(false);
  }

  // ── фильтрация ──
  const categories   = [...new Set(products.map(p => p.category).filter(Boolean))];
  const boothNames   = [...new Set([
    ...products.map(p => p.booths?.company_name),
    ...boothNotes.map(n => n.booths?.company_name),
  ].filter(Boolean))];

  const filteredProducts = products.filter(p => {
    const matchSearch   = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.booths?.company_name?.toLowerCase().includes(search.toLowerCase());
    const matchCategory = !filterCategory || p.category === filterCategory;
    const matchBooth    = !filterBooth || p.booths?.company_name === filterBooth;
    return matchSearch && matchCategory && matchBooth;
  });

  const filteredBooths = boothNotes.filter(n => {
    const matchSearch = !search ||
      n.booths?.company_name?.toLowerCase().includes(search.toLowerCase()) ||
      n.contact_name?.toLowerCase().includes(search.toLowerCase());
    const matchBooth = !filterBooth || n.booths?.company_name === filterBooth;
    return matchSearch && matchBooth;
  });

  const hasFilter = !!(filterCategory || filterBooth);
  const activeFilterCount = [filterCategory, filterBooth].filter(Boolean).length;

  function resetFilters() {
    setFilterCategory('');
    setFilterBooth('');
  }

  // ── поделиться (CSV) ──
  async function shareData() {
    setSharing(true);
    try {
      let csv = '';
      if (tab === 'products') {
        csv = 'Компания,Стенд,Зал,Название товара,Цена,Категория,Характеристики,Логистика,Комментарий,Дата\n';
        filteredProducts.forEach(p => {
          csv += [
            p.booths?.company_name || '', p.booths?.booth_number || '', p.booths?.hall || '',
            p.name || '', p.price || '', p.category || '',
            p.characteristics || '', p.logistics || '', p.note || '',
            new Date(p.created_at).toLocaleDateString('ru-RU'),
          ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',') + '\n';
        });
      } else {
        csv = 'Компания,Стенд,Зал,Контакт,Телефон,Email,Оценка,Заметка,Дата\n';
        filteredBooths.forEach(n => {
          csv += [
            n.booths?.company_name || '', n.booths?.booth_number || '', n.booths?.hall || '',
            n.contact_name || '', n.contact_phone || '', n.contact_email || '',
            n.rating || '', n.note || '',
            new Date(n.created_at).toLocaleDateString('ru-RU'),
          ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',') + '\n';
        });
      }

      const filename = `expohub_${tab}_${Date.now()}.csv`;
      const path = FileSystem.documentDirectory + filename;
      await FileSystem.writeAsStringAsync(path, '\uFEFF' + csv, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      await Sharing.shareAsync(path, {
        mimeType: 'text/csv',
        dialogTitle: 'Поделиться данными ExpoHub',
      });
    } catch (e) { console.error(e); }
    setSharing(false);
  }

  // ── статистика ──
  const avgRating = boothNotes.filter(n => n.rating > 0).length > 0
    ? (boothNotes.filter(n => n.rating > 0).reduce((a, b) => a + b.rating, 0) / boothNotes.filter(n => n.rating > 0).length)
    : 0;
  const catStats = products.reduce((acc, p) => {
    if (p.category) acc[p.category] = (acc[p.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (loading) return (
    <View style={styles.loader}>
      <ActivityIndicator color={Colors.primary} size="large" />
    </View>
  );

  return (
    <View style={styles.root}>
      <GlowBackground intensity="low" position="top-right" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── шапка ── */}
        <View style={styles.header}>
          <Text style={styles.title}>Итоги</Text>
          <TouchableOpacity
            style={[styles.shareBtn, sharing && { opacity: 0.6 }]}
            onPress={shareData}
            disabled={sharing}
          >
            <IconShare />
            <Text style={styles.shareBtnText}>{sharing ? '...' : 'Поделиться'}</Text>
          </TouchableOpacity>
        </View>

        {/* ── 4 блока статистики ── */}
        <View style={styles.statsGrid}>
          <StatBox value={boothNotes.length} label="Стендов посещено" color={Colors.primary} />
          <StatBox value={products.length} label="Товаров найдено" color="#3B82F6" />
          <StatBox value={avgRating ? avgRating.toFixed(1) : '—'} label="Средняя оценка" color="#F59E0B" />
          <StatBox value={Object.keys(catStats).length} label="Категорий" color="#10B981" />
        </View>

        {/* ── топ категории ── */}
        {Object.keys(catStats).length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>ТОП КАТЕГОРИИ</Text>
            <View style={styles.card}>
              {Object.entries(catStats).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([cat, count], i) => {
                const max = Math.max(...Object.values(catStats));
                return (
                  <View key={cat} style={styles.catRow}>
                    <Text style={styles.catRank}>#{i + 1}</Text>
                    <Text style={styles.catName}>{cat}</Text>
                    <View style={styles.catBarWrap}>
                      <View style={[styles.catBar, { width: `${(count / max) * 100}%` as any }]} />
                    </View>
                    <Text style={styles.catCount}>{count}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* ── поиск + фильтр ── */}
        <View style={styles.searchRow}>
          <View style={styles.searchWrap}>
            <View style={{ marginRight: 8 }}><IconSearch /></View>
            <TextInput
              style={styles.searchInput}
              placeholder={tab === 'products' ? 'Поиск товаров...' : 'Поиск стендов...'}
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
            <IconFilter active={hasFilter} />
            {activeFilterCount > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* ── табы ── */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tabBtn, tab === 'products' && styles.tabBtnActive]}
            onPress={() => { setTab('products'); setSearch(''); }}
          >
            <Text style={[styles.tabBtnText, tab === 'products' && styles.tabBtnTextActive]}>
              Товары ({products.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, tab === 'booths' && styles.tabBtnActive]}
            onPress={() => { setTab('booths'); setSearch(''); }}
          >
            <Text style={[styles.tabBtnText, tab === 'booths' && styles.tabBtnTextActive]}>
              Стенды ({boothNotes.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── фильтр по категории (только для товаров) ── */}
        {tab === 'products' && categories.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
            <TouchableOpacity
              style={[styles.filterChip, !filterCategory && styles.filterChipActive]}
              onPress={() => setFilterCategory('')}
            >
              <Text style={[styles.filterChipText, !filterCategory && styles.filterChipTextActive]}>Все</Text>
            </TouchableOpacity>
            {categories.map(cat => (
              <TouchableOpacity
                key={cat}
                style={[styles.filterChip, filterCategory === cat && styles.filterChipActive]}
                onPress={() => setFilterCategory(filterCategory === cat ? '' : cat)}
              >
                <Text style={[styles.filterChipText, filterCategory === cat && styles.filterChipTextActive]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* ── список товаров ── */}
        {tab === 'products' && (
          filteredProducts.length === 0 ? (
            <EmptyState text="Нет товаров" hint="Добавляйте товары в карточках стендов" />
          ) : filteredProducts.map(p => (
            <View key={p.id} style={styles.itemCard}>
              <View style={styles.itemHeader}>
                <Text style={styles.itemName} numberOfLines={1}>{p.name}</Text>
                {p.price ? <Text style={styles.itemPrice}>{p.price}</Text> : null}
              </View>
              <Text style={styles.itemCompany}>{p.booths?.company_name} · {p.booths?.hall}</Text>
              {p.category ? (
                <View style={styles.itemBadge}>
                  <Text style={styles.itemBadgeText}>{p.category}</Text>
                </View>
              ) : null}
              {p.characteristics ? <Text style={styles.itemMeta}>{p.characteristics}</Text> : null}
              {p.logistics      ? <Text style={styles.itemMeta}>{p.logistics}</Text>       : null}
              {p.note           ? <Text style={styles.itemNote}>{p.note}</Text>            : null}
            </View>
          ))
        )}

        {/* ── список стендов ── */}
        {tab === 'booths' && (
          filteredBooths.length === 0 ? (
            <EmptyState text="Нет стендов" hint="Посещайте стенды и сохраняйте контакты" />
          ) : filteredBooths.map(n => (
            <TouchableOpacity
              key={n.id}
              style={styles.itemCard}
              onPress={() => router.push(`/booth/${n.booth_id}` as any)}
              activeOpacity={0.8}
            >
              <View style={styles.itemHeader}>
                <Text style={styles.itemName} numberOfLines={1}>{n.booths?.company_name}</Text>
                {n.rating > 0 && (
                  <View style={styles.ratingBadge}>
                    <Text style={styles.ratingBadgeText}>★ {n.rating}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.itemCompany}>Стенд {n.booths?.booth_number} · {n.booths?.hall}</Text>
              {n.contact_name  ? <Text style={styles.itemMeta}>{n.contact_name}</Text>  : null}
              {n.contact_phone ? <Text style={styles.itemMeta}>{n.contact_phone}</Text> : null}
              {n.contact_email ? <Text style={styles.itemMeta}>{n.contact_email}</Text> : null}
              {n.note          ? <Text style={styles.itemNote}>{n.note}</Text>          : null}
            </TouchableOpacity>
          ))
        )}

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* ── модалка фильтра ── */}
      <Modal visible={showFilter} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowFilter(false)}>
          <TouchableOpacity activeOpacity={1}>
            <View style={styles.modal}>
              <View style={styles.modalHandle} />
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Фильтры</Text>
                <TouchableOpacity onPress={() => setShowFilter(false)}>
                  <Text style={styles.modalClose}>✕</Text>
                </TouchableOpacity>
              </View>

              {tab === 'products' && categories.length > 0 && (
                <>
                  <Text style={styles.filterLabel}>КАТЕГОРИЯ</Text>
                  <View style={styles.filterOptions}>
                    {categories.map(cat => (
                      <TouchableOpacity
                        key={cat}
                        style={[styles.filterOption, filterCategory === cat && styles.filterOptionActive]}
                        onPress={() => setFilterCategory(filterCategory === cat ? '' : cat)}
                      >
                        <Text style={[styles.filterOptionText, filterCategory === cat && styles.filterOptionTextActive]}>
                          {cat}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              {boothNames.length > 0 && (
                <>
                  <Text style={styles.filterLabel}>СТЕНД</Text>
                  <View style={styles.filterOptions}>
                    {boothNames.map(name => (
                      <TouchableOpacity
                        key={name}
                        style={[styles.filterOption, filterBooth === name && styles.filterOptionActive]}
                        onPress={() => setFilterBooth(filterBooth === name ? '' : name!)}
                      >
                        <Text style={[styles.filterOptionText, filterBooth === name && styles.filterOptionTextActive]}>
                          {name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

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

// ─── вспомогательные компоненты ──────────────────────────────
function StatBox({ value, label, color }: { value: number | string; label: string; color: string }) {
  return (
    <View style={statStyles.box}>
      <Text style={[statStyles.value, { color }]}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
    </View>
  );
}

function EmptyState({ text, hint }: { text: string; hint: string }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>{text}</Text>
      <Text style={styles.emptyHint}>{hint}</Text>
    </View>
  );
}

// ─── стили ───────────────────────────────────────────────────
const statStyles = StyleSheet.create({
  box:   { width: '48%', backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, padding: 16, marginBottom: 10 },
  value: { fontSize: Font.xl, fontWeight: '900', marginBottom: 4 },
  label: { fontSize: Font.xs, color: Colors.textMuted, lineHeight: 16 },
});

const styles = StyleSheet.create({
  root:         { flex: 1, backgroundColor: Colors.background },
  loader:       { flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },
  scroll:       { padding: 20, paddingTop: 60, paddingBottom: 40 },

  header:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title:        { fontSize: Font.xl, fontWeight: '800', color: Colors.textPrimary },
  shareBtn:     { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.primary, borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 8 },
  shareBtnText: { color: '#fff', fontSize: Font.xs, fontWeight: '700' },

  statsGrid:    { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 10 },

  section:      { marginBottom: 16 },
  sectionTitle: { fontSize: Font.xs, color: Colors.textMuted, letterSpacing: 2, fontWeight: '700', marginBottom: 10 },
  card:         { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, padding: 14, gap: 10 },
  catRow:       { flexDirection: 'row', alignItems: 'center', gap: 8 },
  catRank:      { fontSize: Font.xs, color: Colors.textMuted, width: 24 },
  catName:      { fontSize: Font.sm, color: Colors.textPrimary, fontWeight: '600', width: 80 },
  catBarWrap:   { flex: 1, height: 5, backgroundColor: Colors.border, borderRadius: 3, overflow: 'hidden' },
  catBar:       { height: '100%', backgroundColor: Colors.primary, borderRadius: 3 },
  catCount:     { fontSize: Font.sm, color: Colors.textMuted, width: 20, textAlign: 'right' },

  searchRow:    { flexDirection: 'row', gap: 10, marginBottom: 12 },
  searchWrap:   { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, paddingHorizontal: 12 },
  searchInput:  { flex: 1, paddingVertical: 11, fontSize: Font.sm, color: Colors.textPrimary },
  clearBtn:     { color: Colors.textMuted, fontSize: 14, padding: 4 },
  filterBtn:    { width: 44, height: 44, borderRadius: Radius.md, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  filterBtnActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  filterBadge:  { position: 'absolute', top: 6, right: 6, width: 14, height: 14, borderRadius: 7, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  filterBadgeText: { color: '#fff', fontSize: 8, fontWeight: '700' },

  tabs:         { flexDirection: 'row', gap: 10, marginBottom: 12 },
  tabBtn:       { flex: 1, paddingVertical: 10, borderRadius: Radius.md, alignItems: 'center', backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  tabBtnActive: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
  tabBtnText:   { fontSize: Font.sm, color: Colors.textMuted, fontWeight: '600' },
  tabBtnTextActive: { color: Colors.primary },

  filterRow:    { marginBottom: 12 },
  filterChip:   { paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border, marginRight: 8 },
  filterChipActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  filterChipText: { fontSize: Font.xs, color: Colors.textMuted, fontWeight: '600' },
  filterChipTextActive: { color: Colors.primary },

  itemCard:     { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, padding: 14, marginBottom: 8, gap: 4 },
  itemHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  itemName:     { fontSize: Font.md, fontWeight: '700', color: Colors.textPrimary, flex: 1 },
  itemPrice:    { fontSize: Font.sm, color: Colors.primary, fontWeight: '700' },
  itemCompany:  { fontSize: Font.xs, color: Colors.textMuted, marginBottom: 4 },
  itemBadge:    { alignSelf: 'flex-start', backgroundColor: Colors.primaryLight, borderWidth: 1, borderColor: Colors.primaryBorder, borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 2, marginBottom: 4 },
  itemBadgeText:{ fontSize: Font.xs, color: Colors.primary, fontWeight: '600' },
  itemMeta:     { fontSize: Font.xs, color: Colors.textSecondary },
  itemNote:     { fontSize: Font.xs, color: Colors.textMuted, fontStyle: 'italic' },
  ratingBadge:  { backgroundColor: Colors.primaryLight, borderRadius: Radius.sm, paddingHorizontal: 8, paddingVertical: 2 },
  ratingBadgeText: { color: Colors.primary, fontSize: Font.xs, fontWeight: '700' },

  empty:        { alignItems: 'center', paddingTop: 40, gap: 8 },
  emptyTitle:   { fontSize: Font.md, fontWeight: '700', color: Colors.textPrimary },
  emptyHint:    { fontSize: Font.sm, color: Colors.textMuted, textAlign: 'center' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modal:        { backgroundColor: '#13131f', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 48 },
  modalHandle:  { width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: 'center', marginBottom: 20 },
  modalHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle:   { fontSize: Font.lg, fontWeight: '800', color: Colors.textPrimary },
  modalClose:   { color: Colors.textMuted, fontSize: 18 },
  filterLabel:  { fontSize: Font.xs, color: Colors.textMuted, letterSpacing: 2, fontWeight: '700', marginBottom: 10 },
  filterOptions:{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  filterOption: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  filterOptionActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  filterOptionText: { fontSize: Font.sm, color: Colors.textMuted, fontWeight: '600' },
  filterOptionTextActive: { color: Colors.primary },
  applyBtn:     { backgroundColor: Colors.primary, borderRadius: Radius.md, paddingVertical: 16, alignItems: 'center', marginBottom: 10 },
  applyBtnText: { color: '#fff', fontSize: Font.md, fontWeight: '700' },
  resetBtn:     { borderRadius: Radius.md, paddingVertical: 14, alignItems: 'center' },
  resetBtnText: { color: Colors.textMuted, fontSize: Font.sm },
});
