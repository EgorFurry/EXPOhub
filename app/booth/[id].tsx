import AsyncStorage from '@react-native-async-storage/async-storage';
import { AudioModule, RecordingPresets, useAudioRecorder } from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator, Image, KeyboardAvoidingView,
  Platform, ScrollView,
  StyleSheet, Text, TextInput,
  TouchableOpacity, View
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

type Product = {
  id: string;
  name: string;
  category: string;
};

type VisitorProduct = {
  id: string;
  name: string;
  price: string;
  category: string;
  note: string;
};

type VisitorNote = {
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  note: string;
  rating: number;
};

export default function BoothDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [booth, setBooth] = useState<Booth | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [visitorProducts, setVisitorProducts] = useState<VisitorProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [cardPhoto, setCardPhoto] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [noteData, setNoteData] = useState<VisitorNote>({
    contact_name: '', contact_phone: '', contact_email: '', note: '', rating: 0,
  });

  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  useEffect(() => { fetchData(); }, [id]);

  async function fetchData() {
    const { data: { user } } = await supabase.auth.getUser();
    const [boothRes, productsRes] = await Promise.all([
      supabase.from('booths').select('*').eq('id', id).single(),
      supabase.from('products').select('*').eq('booth_id', id),
    ]);
    if (boothRes.data) setBooth(boothRes.data);
    if (productsRes.data) setProducts(productsRes.data);
    if (user) {
      const [noteRes, vpRes] = await Promise.all([
        supabase.from('visitor_booth_notes').select('*').eq('user_id', user.id).eq('booth_id', id).single(),
        supabase.from('visitor_products').select('*').eq('user_id', user.id).eq('booth_id', id),
      ]);
      if (noteRes.data) {
        setNoteData({
          contact_name: noteRes.data.contact_name || '',
          contact_phone: noteRes.data.contact_phone || '',
          contact_email: noteRes.data.contact_email || '',
          note: noteRes.data.note || '',
          rating: noteRes.data.rating || 0,
        });
        setSaved(true);
      }
      if (vpRes.data) setVisitorProducts(vpRes.data);
    }
    // загружаем сохранённое фото
    const savedPhoto = await AsyncStorage.getItem(`booth_photo_${id}`);
    if (savedPhoto) {
      const info = await FileSystem.getInfoAsync(savedPhoto);
      if (info.exists) setCardPhoto(savedPhoto);
    }
    setLoading(false);
  }

  async function saveNote() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setSaving(true);
    await supabase.from('visitor_booth_notes').upsert({
      user_id: user.id, booth_id: id, ...noteData,
      updated_at: new Date().toISOString(),
    });
    setSaved(true);
    setSaving(false);
  }

  async function deleteProduct(productId: string) {
    await supabase.from('visitor_products').delete().eq('id', productId);
    setVisitorProducts(p => p.filter(vp => vp.id !== productId));
  }

  async function savePhotoLocally(uri: string) {
    const boothDir = `${FileSystem.documentDirectory}booths/${id}/`;
    await FileSystem.makeDirectoryAsync(boothDir, { intermediates: true });
    const filename = `card_${Date.now()}.jpg`;
    const dest = boothDir + filename;
    await FileSystem.copyAsync({ from: uri, to: dest });
    setCardPhoto(dest);
    await AsyncStorage.setItem(`booth_photo_${id}`, dest);
  }

  async function pickCardPhoto() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (!result.canceled && result.assets[0]) await savePhotoLocally(result.assets[0].uri);
  }

  async function pickFromGallery() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });
    if (!result.canceled && result.assets[0]) await savePhotoLocally(result.assets[0].uri);
  }

  async function startRecording() {
    try {
      await AudioModule.requestRecordingPermissionsAsync();
      await audioRecorder.record();
      setIsRecording(true);
    } catch (e) { console.error('recording error:', e); }
  }

  async function stopRecording() {
    await audioRecorder.stop();
    setAudioUri(audioRecorder.uri);
    setIsRecording(false);
  }

  if (loading) return (
    <View style={styles.loader}>
      <ActivityIndicator color={Colors.primary} size="large" />
    </View>
  );

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <GlowBackground intensity="low" position="top-right" />

      <View style={styles.hero}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <View style={styles.logoWrap}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>{booth?.company_name[0]}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.companyName}>{booth?.company_name}</Text>
            <Text style={styles.boothMeta}>Стенд {booth?.booth_number} · {booth?.hall}</Text>
          </View>
        </View>
        {booth?.tags && (
          <View style={styles.tags}>
            {booth.tags.map(tag => (
              <View key={tag} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.body}>

        <Text style={styles.sectionTitle}>📸 ФОТО ВИЗИТКИ</Text>
        <View style={styles.photoBlock}>
          {cardPhoto && <Image source={{ uri: cardPhoto }} style={styles.cardPhotoPreview} />}
          <View style={styles.photoRow}>
            <TouchableOpacity style={styles.photoBtn} onPress={pickCardPhoto}>
              <Text style={styles.photoBtnIcon}>📷</Text>
              <Text style={styles.photoBtnText}>Камера</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.photoBtn} onPress={pickFromGallery}>
              <Text style={styles.photoBtnIcon}>🖼️</Text>
              <Text style={styles.photoBtnText}>Галерея</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.sectionTitle}>🎙️ АУДИО ЗАМЕТКА</Text>
        <View style={styles.audioBlock}>
          {!isRecording && !audioUri && (
            <TouchableOpacity style={styles.recordBtn} onPress={startRecording}>
              <Text style={styles.recordBtnIcon}>🎙️</Text>
              <Text style={styles.recordBtnText}>Начать запись</Text>
            </TouchableOpacity>
          )}
          {isRecording && (
            <TouchableOpacity style={[styles.recordBtn, styles.recordBtnActive]} onPress={stopRecording}>
              <Text style={styles.recordBtnIcon}>⏹️</Text>
              <Text style={styles.recordBtnText}>Остановить</Text>
            </TouchableOpacity>
          )}
          {audioUri && !isRecording && (
            <View style={styles.audioRow}>
              <View style={styles.audioRecorded}>
                <Text style={styles.audioRecordedText}>🎙️ Запись сохранена</Text>
              </View>
              <TouchableOpacity style={styles.recordBtn} onPress={startRecording}>
                <Text style={styles.recordBtnText}>🔄 Перезаписать</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteAudioBtn} onPress={() => setAudioUri(null)}>
                <Text style={styles.deleteAudioText}>✕ Удалить</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <Text style={styles.sectionTitle}>ОЦЕНКА СТЕНДА</Text>
        <View style={styles.stars}>
          {[1, 2, 3, 4, 5].map(star => (
            <TouchableOpacity key={star} onPress={() => setNoteData(p => ({ ...p, rating: star }))}>
              <Text style={[styles.star, noteData.rating >= star && styles.starActive]}>★</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>КОНТАКТ НА СТЕНДЕ</Text>
        <View style={styles.fields}>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Имя контакта</Text>
            <TextInput style={styles.fieldInput} placeholder="Иван Петров" placeholderTextColor={Colors.textMuted} value={noteData.contact_name} onChangeText={v => setNoteData(p => ({ ...p, contact_name: v }))} />
          </View>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Телефон</Text>
            <TextInput style={styles.fieldInput} placeholder="+7 (___) ___-__-__" placeholderTextColor={Colors.textMuted} value={noteData.contact_phone} onChangeText={v => setNoteData(p => ({ ...p, contact_phone: v }))} keyboardType="phone-pad" />
          </View>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Email</Text>
            <TextInput style={styles.fieldInput} placeholder="contact@company.com" placeholderTextColor={Colors.textMuted} value={noteData.contact_email} onChangeText={v => setNoteData(p => ({ ...p, contact_email: v }))} keyboardType="email-address" autoCapitalize="none" />
          </View>
        </View>

        <Text style={styles.sectionTitle}>ЗАМЕТКА</Text>
        <TextInput style={styles.noteInput} placeholder="Что заинтересовало? Вопросы, цены, условия..." placeholderTextColor={Colors.textMuted} value={noteData.note} onChangeText={v => setNoteData(p => ({ ...p, note: v }))} multiline numberOfLines={4} />

        {products.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>ТОВАРЫ СТЕНДА</Text>
            {products.map(product => (
              <TouchableOpacity key={product.id} style={styles.productCard} onPress={() => router.push(`/product/${product.id}` as any)}>
                <View style={styles.productIcon}><Text style={{ fontSize: 20 }}>🛋️</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.productName}>{product.name}</Text>
                  {product.category && <Text style={styles.productCategory}>{product.category}</Text>}
                </View>
                <Text style={styles.arrow}>›</Text>
              </TouchableOpacity>
            ))}
          </>
        )}

        <Text style={styles.sectionTitle}>МОИ НАХОДКИ</Text>
        {visitorProducts.map(vp => (
          <TouchableOpacity
            key={vp.id}
            style={styles.myProductCard}
            onPress={() => router.push(`/product/${vp.id}` as any)}
          >
            <View style={styles.productIcon}><Text style={{ fontSize: 20 }}>🛋️</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.productName}>{vp.name}</Text>
              {vp.price ? <Text style={styles.productPrice}>{vp.price}</Text> : null}
              {vp.category ? <Text style={styles.productCategory}>{vp.category}</Text> : null}
              {vp.note ? <Text style={styles.productNote}>{vp.note}</Text> : null}
            </View>
            <TouchableOpacity onPress={() => deleteProduct(vp.id)} style={styles.deleteBtn}>
              <Text style={styles.deleteBtnText}>✕</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          style={styles.addProductBlock}
          onPress={() => router.push(`/add-product?booth_id=${id}&booth_name=${booth?.company_name}` as any)}
        >
          <Text style={styles.addProductIcon}>+</Text>
          <Text style={styles.addProductText}>Добавить товар</Text>
          <Text style={styles.addProductHint}>Название, цена, характеристики...</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={saveNote} disabled={saving}>
          <Text style={styles.saveBtnText}>
            {saving ? 'Сохранение...' : saved ? '✓ Обновить заметку' : '💾 Сохранить визитку'}
          </Text>
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  loader: { flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },
  hero: { backgroundColor: '#180010', paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  back: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  backText: { color: '#fff', fontSize: 16 },
  logoWrap: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  logo: { width: 48, height: 48, borderRadius: 12, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  logoText: { fontSize: Font.xl, fontWeight: '800', color: Colors.primary },
  companyName: { fontSize: Font.lg, fontWeight: '800', color: '#fff' },
  boothMeta: { fontSize: Font.xs, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: { backgroundColor: 'rgba(196,18,48,0.2)', borderWidth: 1, borderColor: Colors.primaryBorder, borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 3 },
  tagText: { color: Colors.primary, fontSize: Font.xs, fontWeight: '600' },
  body: { padding: 20, paddingBottom: 40 },
  sectionTitle: { fontSize: Font.xs, color: Colors.textMuted, letterSpacing: 2, fontWeight: '700', marginBottom: 10, marginTop: 16 },
  photoBlock: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, padding: 12, gap: 10 },
  cardPhotoPreview: { width: '100%', height: 150, borderRadius: Radius.sm, resizeMode: 'cover' },
  photoRow: { flexDirection: 'row', gap: 10 },
  photoBtn: { flex: 1, backgroundColor: Colors.primaryLight, borderWidth: 1, borderColor: Colors.primaryBorder, borderRadius: Radius.md, paddingVertical: 12, alignItems: 'center', gap: 4 },
  photoBtnIcon: { fontSize: 20 },
  photoBtnText: { fontSize: Font.xs, color: Colors.primary, fontWeight: '700' },
  audioBlock: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, padding: 12, gap: 8 },
  recordBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: Radius.md, backgroundColor: Colors.primaryLight, borderWidth: 1, borderColor: Colors.primaryBorder },
  recordBtnActive: { backgroundColor: 'rgba(196,18,48,0.3)', borderColor: Colors.primary },
  recordBtnIcon: { fontSize: 20 },
  recordBtnText: { fontSize: Font.sm, color: Colors.primary, fontWeight: '700' },
  audioRow: { gap: 8 },
  audioRecorded: { paddingVertical: 12, borderRadius: Radius.md, backgroundColor: 'rgba(76,175,80,0.15)', borderWidth: 1, borderColor: 'rgba(76,175,80,0.3)', alignItems: 'center' },
  audioRecordedText: { color: '#4CAF50', fontSize: Font.sm, fontWeight: '600' },
  deleteAudioBtn: { paddingVertical: 10, borderRadius: Radius.md, backgroundColor: 'rgba(196,18,48,0.1)', borderWidth: 1, borderColor: Colors.primaryBorder, alignItems: 'center' },
  deleteAudioText: { color: Colors.primary, fontSize: Font.xs, fontWeight: '600' },
  stars: { flexDirection: 'row', gap: 8 },
  star: { fontSize: 32, color: Colors.border },
  starActive: { color: Colors.primary },
  fields: { gap: 10 },
  field: { gap: 6 },
  fieldLabel: { fontSize: Font.xs, color: Colors.textMuted, fontWeight: '600', marginLeft: 2 },
  fieldInput: { backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.md, padding: 14, fontSize: Font.sm, color: Colors.textPrimary },
  noteInput: { backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.md, padding: 14, fontSize: Font.sm, color: Colors.textPrimary, minHeight: 100, textAlignVertical: 'top' },
  productCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, padding: 12, marginBottom: 8 },
  myProductCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.primaryBorder, borderRadius: Radius.md, padding: 12, marginBottom: 8 },
  productIcon: { width: 44, height: 44, borderRadius: Radius.sm, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  productName: { fontSize: Font.md, fontWeight: '600', color: Colors.textPrimary },
  productPrice: { fontSize: Font.sm, color: Colors.primary, fontWeight: '700', marginTop: 2 },
  productCategory: { fontSize: Font.xs, color: Colors.textMuted, marginTop: 2 },
  productNote: { fontSize: Font.xs, color: Colors.textSecondary, marginTop: 2 },
  arrow: { color: Colors.textMuted, fontSize: 20 },
  addProductBlock: { borderWidth: 1.5, borderColor: Colors.border, borderStyle: 'dashed', borderRadius: Radius.md, padding: 20, alignItems: 'center', marginTop: 8, marginBottom: 8 },
  addProductIcon: { fontSize: 28, color: Colors.primary, marginBottom: 6 },
  addProductText: { fontSize: Font.md, fontWeight: '700', color: Colors.textPrimary, marginBottom: 4 },
  addProductHint: { fontSize: Font.xs, color: Colors.textMuted },
  deleteBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(196,18,48,0.15)', alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  deleteBtnText: { color: Colors.primary, fontSize: 12 },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: Radius.md, paddingVertical: 16, alignItems: 'center', marginTop: 24 },
  saveBtnText: { color: '#fff', fontSize: Font.md, fontWeight: '700' },
});