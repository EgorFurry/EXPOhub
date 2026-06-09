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
  note: string;
  booth_id: string;
  booths: { company_name: string };
};

type SavedBooth = {
  id: string;
  booth_id: string;
  booths: {
    company_name: string;
    booth_number: string;
    hall: string;
    tags: string[];
  };
};

export default function Ticket() {
  const router = useRouter();
  const [products, setProducts] = useState<VisitorProduct[]>([]);
  const [booths, setBooths] = useState<SavedBooth[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'products' | 'booths'>('products');

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const [productsRes, boothsRes] = await Promise.all([
      supabase.from('visitor_products')
        .select('*, booths(company_name)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
      supabase.from('saved_booths')
        .select('*, booths(company_name, booth_number, hall, tags)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
    ]);

    if (productsRes.data) setProducts(productsRes.data);
    if (boothsRes.data) setBooths(boothsRes.data);
    setLoading(false);
  }

  if (loading) return (
    <View style={styles.loader}>
      <ActivityIndicator color={Colors.primary} size="large" />
    </View>
  );

  return (
    <View style={styles.root}>
      <GlowBackground intensity="low" position="top-right" />

      <View style={styles.header}>
        <Text style={styles.title}>Мои находки</Text>
        <Text style={styles.subtitle}>
          {products.length} товаров · {booths.length} стендов
        </Text>
      </View>

      {/* табы */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'products' && styles.tabBtnActive]}
          onPress={() => setTab('products')}
        >
          <Text style={[styles.tabBtnText, tab === 'products' && styles.tabBtnTextActive]}>
            🛋️ Товары ({products.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'booths' && styles.tabBtnActive]}
          onPress={() => setTab('booths')}
        >
          <Text style={[styles.tabBtnText, tab === 'booths' && styles.tabBtnTextActive]}>
            🏢 Стенды ({booths.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>

        {tab === 'products' && (
          products.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🛋️</Text>
              <Text style={styles.emptyTitle}>Нет товаров</Text>
              <Text style={styles.emptyText}>Добавляйте товары на стендах выставки</Text>
            </View>
          ) : products.map(p => (
            <TouchableOpacity
              key={p.id}
              style={styles.card}
              onPress={() => router.push(`/booth/${p.booth_id}`)}
            >
              <View style={styles.cardIcon}>
                <Text style={{ fontSize: 22 }}>🛋️</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardName}>{p.name}</Text>
                <Text style={styles.cardSub}>{p.booths?.company_name}</Text>
                {p.price ? <Text style={styles.cardPrice}>{p.price}</Text> : null}
                {p.category ? <Text style={styles.cardMeta}>{p.category}</Text> : null}
              </View>
              <Text style={styles.arrow}>›</Text>
            </TouchableOpacity>
          ))
        )}

        {tab === 'booths' && (
          booths.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🏢</Text>
              <Text style={styles.emptyTitle}>Нет стендов</Text>
              <Text style={styles.emptyText}>Сохраняйте визитки стендов</Text>
            </View>
          ) : booths.map(b => (
            <TouchableOpacity
              key={b.id}
              style={styles.card}
              onPress={() => router.push(`/booth/${b.booth_id}`)}
            >
              <View style={styles.cardLogo}>
                <Text style={styles.cardLogoText}>{b.booths?.company_name[0]}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardName}>{b.booths?.company_name}</Text>
                <Text style={styles.cardSub}>Стенд {b.booths?.booth_number} · {b.booths?.hall}</Text>
                {b.booths?.tags && (
                  <View style={styles.tags}>
                    {b.booths.tags.slice(0, 2).map(tag => (
                      <View key={tag} style={styles.tag}>
                        <Text style={styles.tagText}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
              <Text style={styles.arrow}>›</Text>
            </TouchableOpacity>
          ))
        )}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  loader: { flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },
  header: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 16 },
  title: { fontSize: Font.xl, fontWeight: '800', color: Colors.textPrimary },
  subtitle: { fontSize: Font.xs, color: Colors.textMuted, marginTop: 4 },
  tabs: { flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginBottom: 8 },
  tabBtn: { flex: 1, paddingVertical: 10, borderRadius: Radius.md, alignItems: 'center', backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  tabBtnActive: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
  tabBtnText: { fontSize: Font.sm, color: Colors.textMuted, fontWeight: '600' },
  tabBtnTextActive: { color: Colors.primary },
  list: { padding: 20, gap: 10 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, padding: 12 },
  cardIcon: { width: 44, height: 44, borderRadius: Radius.sm, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  cardLogo: { width: 44, height: 44, borderRadius: Radius.sm, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  cardLogoText: { fontSize: Font.lg, fontWeight: '800', color: Colors.primary },
  cardName: { fontSize: Font.md, fontWeight: '700', color: Colors.textPrimary },
  cardSub: { fontSize: Font.xs, color: Colors.textMuted, marginTop: 2 },
  cardPrice: { fontSize: Font.sm, color: Colors.primary, fontWeight: '700', marginTop: 2 },
  cardMeta: { fontSize: Font.xs, color: Colors.textMuted, marginTop: 2 },
  arrow: { color: Colors.textMuted, fontSize: 20 },
  tags: { flexDirection: 'row', gap: 6, marginTop: 4 },
  tag: { backgroundColor: Colors.primaryLight, borderWidth: 1, borderColor: Colors.primaryBorder, borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 2 },
  tagText: { color: Colors.primary, fontSize: 10, fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: Font.lg, fontWeight: '800', color: Colors.textPrimary, marginBottom: 8 },
  emptyText: { fontSize: Font.sm, color: Colors.textMuted, textAlign: 'center' },
});