import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
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

export default function Analytics() {
  const router = useRouter();
  const [products, setProducts] = useState<VisitorProduct[]>([]);
  const [boothNotes, setBoothNotes] = useState<BoothNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'products' | 'booths'>('products');
  const [filterCategory, setFilterCategory] = useState('');
  const [exporting, setExporting] = useState(false);

  const categories = [...new Set(products.map(p => p.category).filter(Boolean))];
  const filteredProducts = filterCategory ? products.filter(p => p.category === filterCategory) : products;

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const [productsRes, notesRes] = await Promise.all([
      supabase.from('visitor_products').select('*, booths(company_name, hall, booth_number)').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('visitor_booth_notes').select('*, booths(company_name, hall, booth_number)').eq('user_id', user.id).order('created_at', { ascending: false }),
    ]);

    if (productsRes.data) setProducts(productsRes.data);
    if (notesRes.data) setBoothNotes(notesRes.data);
    setLoading(false);
  }

  async function exportToCSV() {
    setExporting(true);
    try {
      let csv = '';
      if (tab === 'products') {
        csv = 'Компания,Стенд,Зал,Название товара,Цена,Категория,Характеристики,Логистика,Комментарий,Дата\n';
        filteredProducts.forEach(p => {
          csv += [p.booths?.company_name || '', p.booths?.booth_number || '', p.booths?.hall || '', p.name || '', p.price || '', p.category || '', p.characteristics || '', p.logistics || '', p.note || '', new Date(p.created_at).toLocaleDateString('ru-RU')].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',') + '\n';
        });
      } else {
        csv = 'Компания,Стенд,Зал,Контакт,Телефон,Email,Оценка,Заметка,Дата\n';
        boothNotes.forEach(n => {
          csv += [n.booths?.company_name || '', n.booths?.booth_number || '', n.booths?.hall || '', n.contact_name || '', n.contact_phone || '', n.contact_email || '', n.rating || '', n.note || '', new Date(n.created_at).toLocaleDateString('ru-RU')].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',') + '\n';
        });
      }
      const filename = `expohub_${tab}_${Date.now()}.csv`;
      const path = FileSystem.documentDirectory + filename;
      await FileSystem.writeAsStringAsync(path, '\uFEFF' + csv, { encoding: FileSystem.EncodingType.UTF8 });
      await Sharing.shareAsync(path, { mimeType: 'text/csv', dialogTitle: 'Экспорт данных ExpoHub' });
    } catch (e) { console.error(e); }
    setExporting(false);
  }

  if (loading) return <View style={styles.loader}><ActivityIndicator color={Colors.primary} size="large" /></View>;

  const avgRating = boothNotes.filter(n => n.rating > 0).length > 0 ? boothNotes.filter(n => n.rating > 0).reduce((a, b) => a + b.rating, 0) / boothNotes.filter(n => n.rating > 0).length : 0;
  const catStats = products.reduce((acc, p) => { if (p.category) acc[p.category] = (acc[p.category] || 0) + 1; return acc; }, {} as Record<string, number>);

  return (
    <View style={styles.root}>
      <GlowBackground intensity="low" position="top-right" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        <View style={styles.header}>
          <Text style={styles.title}>Аналитика</Text>
          <TouchableOpacity style={[styles.exportBtn, exporting && { opacity: 0.6 }]} onPress={exportToCSV} disabled={exporting}>
            <Text style={styles.exportBtnText}>{exporting ? '...' : '📥 Excel'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsGrid}>
          <StatBox icon="🏢" value={boothNotes.length} label="Стендов посещено" />
          <StatBox icon="🛋️" value={products.length} label="Товаров найдено" />
          <StatBox icon="⭐" value={avgRating ? avgRating.toFixed(1) : '—'} label="Средняя оценка" />
          <StatBox icon="📦" value={Object.keys(catStats).length} label="Категорий" />
        </View>

        {Object.keys(catStats).length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>ТОП КАТЕГОРИИ</Text>
            <View style={styles.card}>
              {Object.entries(catStats).sort((a, b) => b[1] - a[1]).map(([cat, count], i) => {
                const max = Math.max(...Object.values(catStats));
                return (
                  <View key={cat} style={styles.catRow}>
                    <Text style={styles.catRank}>#{i + 1}</Text>
                    <Text style={styles.catName}>{cat}</Text>
                    <View style={styles.catBarWrap}><View style={[styles.catBar, { width: `${(count / max) * 100}%` }]} /></View>
                    <Text style={styles.catCount}>{count}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        <View style={styles.tabs}>
          <TouchableOpacity style={[styles.tabBtn, tab === 'products' && styles.tabBtnActive]} onPress={() => setTab('products')}>
            <Text style={[styles.tabBtnText, tab === 'products' && styles.tabBtnTextActive]}>🛋️ Товары ({products.length})</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tabBtn, tab === 'booths' && styles.tabBtnActive]} onPress={() => setTab('booths')}>
            <Text style={[styles.tabBtnText, tab === 'booths' && styles.tabBtnTextActive]}>🏢 Стенды ({boothNotes.length})</Text>
          </TouchableOpacity>
        </View>

        {tab === 'products' && categories.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
            <TouchableOpacity style={[styles.filterChip, !filterCategory && styles.filterChipActive]} onPress={() => setFilterCategory('')}>
              <Text style={[styles.filterChipText, !filterCategory && styles.filterChipTextActive]}>Все</Text>
            </TouchableOpacity>
            {categories.map(cat => (
              <TouchableOpacity key={cat} style={[styles.filterChip, filterCategory === cat && styles.filterChipActive]} onPress={() => setFilterCategory(filterCategory === cat ? '' : cat)}>
                <Text style={[styles.filterChipText, filterCategory === cat && styles.filterChipTextActive]}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {tab === 'products' && (
          filteredProducts.length === 0 ? (
            <View style={styles.empty}><Text style={styles.emptyIcon}>🛋️</Text><Text style={styles.emptyTitle}>Нет товаров</Text></View>
          ) : filteredProducts.map(p => (
            <View key={p.id} style={styles.itemCard}>
              <View style={styles.itemHeader}>
                <Text style={styles.itemName}>{p.name}</Text>
                {p.price ? <Text style={styles.itemPrice}>{p.price}</Text> : null}
              </View>
              <Text style={styles.itemCompany}>🏢 {p.booths?.company_name} · {p.booths?.hall}</Text>
              {p.category ? <View style={styles.itemBadge}><Text style={styles.itemBadgeText}>{p.category}</Text></View> : null}
              {p.characteristics ? <Text style={styles.itemMeta}>📐 {p.characteristics}</Text> : null}
              {p.logistics ? <Text style={styles.itemMeta}>🚚 {p.logistics}</Text> : null}
              {p.note ? <Text style={styles.itemNote}>💬 {p.note}</Text> : null}
            </View>
          ))
        )}

        {tab === 'booths' && (
          boothNotes.length === 0 ? (
            <View style={styles.empty}><Text style={styles.emptyIcon}>🏢</Text><Text style={styles.emptyTitle}>Нет стендов</Text></View>
          ) : boothNotes.map(n => (
            <TouchableOpacity key={n.id} style={styles.itemCard} onPress={() => router.push(`/booth/${n.booth_id}` as any)}>
              <View style={styles.itemHeader}>
                <Text style={styles.itemName}>{n.booths?.company_name}</Text>
                {n.rating > 0 && <View style={styles.ratingBadge}><Text style={styles.ratingBadgeText}>★ {n.rating}</Text></View>}
              </View>
              <Text style={styles.itemCompany}>Стенд {n.booths?.booth_number} · {n.booths?.hall}</Text>
              {n.contact_name ? <Text style={styles.itemMeta}>👤 {n.contact_name}</Text> : null}
              {n.contact_phone ? <Text style={styles.itemMeta}>📞 {n.contact_phone}</Text> : null}
              {n.contact_email ? <Text style={styles.itemMeta}>✉️ {n.contact_email}</Text> : null}
              {n.note ? <Text style={styles.itemNote}>💬 {n.note}</Text> : null}
            </TouchableOpacity>
          ))
        )}

      </ScrollView>
    </View>
  );
}

function StatBox({ icon, value, label }: { icon: string; value: number | string; label: string }) {
  return (
    <View style={statStyles.box}>
      <Text style={statStyles.icon}>{icon}</Text>
      <Text style={statStyles.value}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
    </View>
  );
}

const statStyles = StyleSheet.create({
  box: { width: '48%', backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, padding: 14, alignItems: 'center', gap: 6, marginBottom: 10 },
  icon: { fontSize: 28 },
  value: { fontSize: Font.xl, fontWeight: '900', color: Colors.textPrimary },
  label: { fontSize: Font.xs, color: Colors.textMuted, textAlign: 'center' },
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  loader: { flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 20, paddingTop: 60, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: Font.xl, fontWeight: '800', color: Colors.textPrimary },
  exportBtn: { backgroundColor: Colors.primary, borderRadius: Radius.md, paddingHorizontal: 16, paddingVertical: 8 },
  exportBtnText: { color: '#fff', fontSize: Font.sm, fontWeight: '700' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 10 },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: Font.xs, color: Colors.textMuted, letterSpacing: 2, fontWeight: '700', marginBottom: 10 },
  card: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, padding: 14, gap: 10 },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  catRank: { fontSize: Font.xs, color: Colors.textMuted, width: 24 },
  catName: { fontSize: Font.sm, color: Colors.textPrimary, fontWeight: '600', width: 80 },
  catBarWrap: { flex: 1, height: 6, backgroundColor: Colors.border, borderRadius: 3, overflow: 'hidden' },
  catBar: { height: '100%', backgroundColor: Colors.primary, borderRadius: 3 },
  catCount: { fontSize: Font.sm, color: Colors.textMuted, width: 20, textAlign: 'right' },
  tabs: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  tabBtn: { flex: 1, paddingVertical: 10, borderRadius: Radius.md, alignItems: 'center', backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  tabBtnActive: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
  tabBtnText: { fontSize: Font.sm, color: Colors.textMuted, fontWeight: '600' },
  tabBtnTextActive: { color: Colors.primary },
  filterRow: { marginBottom: 12 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border, marginRight: 8 },
  filterChipActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  filterChipText: { fontSize: Font.xs, color: Colors.textMuted, fontWeight: '600' },
  filterChipTextActive: { color: Colors.primary },
  itemCard: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, padding: 14, marginBottom: 8, gap: 4 },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemName: { fontSize: Font.md, fontWeight: '700', color: Colors.textPrimary, flex: 1 },
  itemPrice: { fontSize: Font.sm, color: Colors.primary, fontWeight: '700' },
  itemCompany: { fontSize: Font.xs, color: Colors.textMuted },
  itemBadge: { alignSelf: 'flex-start', backgroundColor: Colors.primaryLight, borderWidth: 1, borderColor: Colors.primaryBorder, borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 2 },
  itemBadgeText: { fontSize: Font.xs, color: Colors.primary, fontWeight: '600' },
  itemMeta: { fontSize: Font.xs, color: Colors.textSecondary },
  itemNote: { fontSize: Font.xs, color: Colors.textMuted, fontStyle: 'italic' },
  ratingBadge: { backgroundColor: Colors.primaryLight, borderRadius: Radius.sm, paddingHorizontal: 8, paddingVertical: 2 },
  ratingBadgeText: { color: Colors.primary, fontSize: Font.xs, fontWeight: '700' },
  empty: { alignItems: 'center', paddingTop: 40 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: Font.lg, fontWeight: '800', color: Colors.textPrimary },
});