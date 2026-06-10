import { useLocalSearchParams, useRouter } from 'expo-router';
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
  booth_id: string;
  created_at: string;
  booths: { company_name: string; booth_number: string; hall: string };
};

export default function ProductDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [product, setProduct] = useState<VisitorProduct | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchProduct(); }, [id]);

  async function fetchProduct() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from('visitor_products')
      .select('*, booths(company_name, booth_number, hall)')
      .eq('id', id)
      .single();
    if (data) setProduct(data);
    setLoading(false);
  }

  if (loading) return (
    <View style={styles.loader}>
      <ActivityIndicator color={Colors.primary} size="large" />
    </View>
  );

  if (!product) return (
    <View style={styles.loader}>
      <Text style={{ color: Colors.textMuted }}>Товар не найден</Text>
    </View>
  );

  return (
    <View style={styles.root}>
      <GlowBackground intensity="low" position="top-right" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{product.name}</Text>
          <Text style={styles.headerSub}>{product.booths?.company_name}</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>

        {/* иконка + название */}
        <View style={styles.iconWrap}>
          <Text style={styles.iconText}>🛋️</Text>
        </View>
        <Text style={styles.name}>{product.name}</Text>

        {/* цена */}
        {product.price ? (
          <View style={styles.priceWrap}>
            <Text style={styles.priceLabel}>ЦЕНА</Text>
            <Text style={styles.price}>{product.price}</Text>
          </View>
        ) : null}

        {/* категория */}
        {product.category && (
          <View style={styles.badgeRow}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{product.category}</Text>
            </View>
          </View>
        )}

        {/* стенд */}
        <TouchableOpacity
          style={styles.boothLink}
          onPress={() => router.push(`/booth/${product.booth_id}` as any)}
        >
          <Text style={styles.boothLinkIcon}>🏢</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.boothLinkName}>{product.booths?.company_name}</Text>
            <Text style={styles.boothLinkMeta}>Стенд {product.booths?.booth_number} · {product.booths?.hall}</Text>
          </View>
          <Text style={styles.boothLinkArrow}>›</Text>
        </TouchableOpacity>

        {/* характеристики */}
        {product.characteristics ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>ХАРАКТЕРИСТИКИ</Text>
            <View style={styles.infoCard}>
              <Text style={styles.infoText}>{product.characteristics}</Text>
            </View>
          </View>
        ) : null}

        {/* логистика */}
        {product.logistics ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>ЛОГИСТИКА</Text>
            <View style={styles.infoCard}>
              <Text style={styles.infoText}>{product.logistics}</Text>
            </View>
          </View>
        ) : null}

        {/* заметка */}
        {product.note ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>КОММЕНТАРИЙ</Text>
            <View style={styles.infoCard}>
              <Text style={styles.infoText}>{product.note}</Text>
            </View>
          </View>
        ) : null}

        {/* дата */}
        <Text style={styles.date}>
          Добавлено {new Date(product.created_at).toLocaleDateString('ru-RU')}
        </Text>

        <TouchableOpacity
          style={styles.btnPrimary}
          onPress={() => router.push(`/booth/${product.booth_id}` as any)}
        >
          <Text style={styles.btnPrimaryText}>Перейти к стенду →</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.btnSecondary}
          onPress={() => router.push(`/edit-product/${product.id}` as any)}
        >
          <Text style={styles.btnSecondaryText}>✏️ Редактировать</Text>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  loader: { flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16, backgroundColor: '#180010', borderBottomWidth: 1, borderBottomColor: Colors.border },
  back: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  backText: { color: '#fff', fontSize: 16 },
  headerTitle: { fontSize: Font.md, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: Font.xs, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  body: { padding: 20, paddingBottom: 40, alignItems: 'center' },
  iconWrap: { width: 80, height: 80, borderRadius: 20, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: 16, marginTop: 8 },
  iconText: { fontSize: 40 },
  name: { fontSize: Font.xl, fontWeight: '900', color: Colors.textPrimary, textAlign: 'center', marginBottom: 8 },
  priceWrap: { alignItems: 'center', marginBottom: 12 },
  priceLabel: { fontSize: Font.xs, color: Colors.textMuted, letterSpacing: 2, marginBottom: 2 },
  price: { fontSize: Font.lg, fontWeight: '800', color: Colors.primary },
  badgeRow: { flexDirection: 'row', marginBottom: 16 },
  badge: { backgroundColor: Colors.primaryLight, borderWidth: 1, borderColor: Colors.primaryBorder, borderRadius: Radius.full, paddingHorizontal: 12, paddingVertical: 4 },
  badgeText: { color: Colors.primary, fontSize: Font.xs, fontWeight: '700' },
  boothLink: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, padding: 12, marginBottom: 20, width: '100%', gap: 10 },
  boothLinkIcon: { fontSize: 20 },
  boothLinkName: { fontSize: Font.sm, fontWeight: '700', color: Colors.textPrimary },
  boothLinkMeta: { fontSize: Font.xs, color: Colors.textMuted, marginTop: 2 },
  boothLinkArrow: { color: Colors.textMuted, fontSize: 18 },
  section: { width: '100%', marginBottom: 12 },
  btnSecondary: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, paddingVertical: 14, alignItems: 'center', width: '100%', marginTop: 10 },
  btnSecondaryText: { color: Colors.textPrimary, fontSize: Font.md, fontWeight: '600' },
  sectionTitle: { fontSize: Font.xs, color: Colors.textMuted, letterSpacing: 2, fontWeight: '700', marginBottom: 8 },
  infoCard: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, padding: 14 },
  infoText: { fontSize: Font.sm, color: Colors.textSecondary, lineHeight: 20 },
  date: { fontSize: Font.xs, color: Colors.textMuted, marginBottom: 20, alignSelf: 'flex-start' },
  btnPrimary: { backgroundColor: Colors.primary, borderRadius: Radius.md, paddingVertical: 16, alignItems: 'center', width: '100%' },
  btnPrimaryText: { color: '#fff', fontSize: Font.md, fontWeight: '700' },
});