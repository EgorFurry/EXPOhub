import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator, ScrollView,
  StyleSheet, Text,
  TextInput, TouchableOpacity, View
} from 'react-native';
import { GlowBackground } from '../../components/shared/GlowBackground';
import { supabase } from '../../lib/supabase';
import { Colors, Font, Radius } from '../../styles/theme';

type Booth = {
  id: string;
  company_name: string;
  description: string;
  booth_number: string;
  hall: string;
  tags: string[];
};

type Exhibition = {
  id: string;
  name: string;
  location: string;
  start_date: string;
  end_date: string;
  color: string;
};

export default function ExhibitionDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [exhibition, setExhibition] = useState<Exhibition | null>(null);
  const [booths, setBooths] = useState<Booth[]>([]);
  const [filtered, setFiltered] = useState<Booth[]>([]);
  const [search, setSearch] = useState('');
  const [activeHall, setActiveHall] = useState('Все');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [id]);

  async function fetchData() {
    const [exRes, boothRes] = await Promise.all([
      supabase.from('exhibitions').select('*').eq('id', id).single(),
      supabase.from('booths').select('*').eq('exhibition_id', id).order('hall'),
    ]);
    if (exRes.data) setExhibition(exRes.data);
    if (boothRes.data) { setBooths(boothRes.data); setFiltered(boothRes.data); }
    setLoading(false);
  }

  useEffect(() => {
    let result = booths;
    if (activeHall !== 'Все') result = result.filter(b => b.hall === activeHall);
    if (search) result = result.filter(b => b.company_name.toLowerCase().includes(search.toLowerCase()));
    setFiltered(result);
  }, [search, activeHall, booths]);

  const halls = ['Все', ...Array.from(new Set(booths.map(b => b.hall).filter(Boolean)))];

  if (loading) return (
    <View style={styles.loader}>
      <ActivityIndicator color={Colors.primary} size="large" />
    </View>
  );

  return (
    <View style={styles.root}>
      <GlowBackground intensity="low" position="top-right" />

      {/* шапка */}
      <View style={[styles.header, { borderBottomColor: exhibition?.color || Colors.primary }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerName}>{exhibition?.name}</Text>
          <Text style={styles.headerMeta}>📍 {exhibition?.location}</Text>
        </View>
      </View>

      {/* поиск */}
      <View style={styles.searchWrap}>
        <TextInput
          style={styles.search}
          placeholder="🔍 Поиск стендов..."
          placeholderTextColor={Colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* фильтры по залам */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.halls} contentContainerStyle={{ alignItems: 'center', paddingVertical: 8 }}>
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

      {/* список стендов */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
        {filtered.length === 0 ? (
          <Text style={styles.empty}>Стенды не найдены</Text>
        ) : filtered.map(booth => (
          <TouchableOpacity
            key={booth.id}
            style={styles.boothCard}
            onPress={() => router.push(`/booth/${booth.id}`)}
          >
            <View style={styles.boothTop}>
              <View style={styles.boothLogo}>
                <Text style={styles.boothLogoText}>{booth.company_name[0]}</Text>
              </View>
              <View style={styles.boothInfo}>
                <Text style={styles.boothName}>{booth.company_name}</Text>
                <Text style={styles.boothNumber}>Стенд {booth.booth_number} · {booth.hall}</Text>
              </View>
            </View>
            {booth.description && (
              <Text style={styles.boothDesc} numberOfLines={2}>{booth.description}</Text>
            )}
            {booth.tags && booth.tags.length > 0 && (
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
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  loader: { flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20, borderBottomWidth: 2 },
  back: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  backText: { color: Colors.textPrimary, fontSize: 18 },
  headerInfo: { flex: 1 },
  headerName: { fontSize: Font.lg, fontWeight: '800', color: Colors.textPrimary },
  headerMeta: { fontSize: Font.xs, color: Colors.textMuted, marginTop: 2 },
  searchWrap: { paddingHorizontal: 20, paddingTop: 14 },
  search: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, padding: 12, fontSize: Font.sm, color: Colors.textPrimary },
  halls: { paddingHorizontal: 20, marginTop: 8, marginBottom: 0, maxHeight: 44 },
  hallChip: { 
    paddingHorizontal: 14, 
    paddingVertical: 6, 
    borderRadius: Radius.full, 
    borderWidth: 1, 
    borderColor: Colors.border, 
    marginRight: 8,
    height: 32,
    alignSelf: 'flex-start',
  },hallChipActive: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
  hallChipText: { fontSize: Font.xs, color: Colors.textMuted, fontWeight: '600' },
  hallChipTextActive: { color: Colors.primary },
  list: { padding: 20, paddingTop: 12, gap: 10 },
  empty: { color: Colors.textMuted, textAlign: 'center', marginTop: 40 },
  boothCard: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, padding: 14 },
  boothTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  boothLogo: { width: 44, height: 44, borderRadius: Radius.sm, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  boothLogoText: { fontSize: Font.lg, fontWeight: '800', color: Colors.primary },
  boothInfo: { flex: 1 },
  boothName: { fontSize: Font.md, fontWeight: '700', color: Colors.textPrimary },
  boothNumber: { fontSize: Font.xs, color: Colors.textMuted, marginTop: 2 },
  boothDesc: { fontSize: Font.sm, color: Colors.textSecondary, marginBottom: 8, lineHeight: 18 },
  tags: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  tag: { backgroundColor: Colors.primaryLight, borderWidth: 1, borderColor: Colors.primaryBorder, borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 3 },
  tagText: { fontSize: Font.xs, color: Colors.primary, fontWeight: '600' },
});