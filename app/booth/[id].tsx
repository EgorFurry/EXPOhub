import AsyncStorage from '@react-native-async-storage/async-storage';
import { AudioModule, RecordingPresets, useAudioRecorder } from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Clipboard, Image, KeyboardAvoidingView,
  Linking, Modal, Platform, ScrollView,
  StyleSheet, Text, TextInput,
  TouchableOpacity, View
} from 'react-native';
import Svg, { Path, Line } from 'react-native-svg';
import { GlowBackground } from '../../components/shared/GlowBackground';
import { supabase } from '../../lib/supabase';
import { Colors, Font, Radius } from '../../styles/theme';

// ─── типы ────────────────────────────────────────────────────
type Booth = {
  id: string;
  company_name: string;
  description: string;
  booth_number: string;
  hall: string;
  tags: string[];
};

type Product = { id: string; name: string; category: string; };
type VisitorProduct = { id: string; name: string; price: string; category: string; note: string; };

type VisitorNote = {
  contact_name: string;
  contact_position: string;
  contact_phone: string;
  contact_email: string;
  website: string;
  telegram: string;
  wechat: string;
  note: string;
  rating: number;
};

const EMPTY_NOTE: VisitorNote = {
  contact_name: '', contact_position: '', contact_phone: '',
  contact_email: '', website: '', telegram: '', wechat: '', note: '', rating: 0,
};

// ─── форматирование телефона ──────────────────────────────────
function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 0) return '';
  if (digits.startsWith('7') || digits.startsWith('8')) {
    const d = digits.startsWith('8') ? '7' + digits.slice(1) : digits;
    const p = d.slice(1);
    let result = '+7';
    if (p.length > 0) result += ' ' + p.slice(0, 3);
    if (p.length > 3) result += ' ' + p.slice(3, 6);
    if (p.length > 6) result += ' ' + p.slice(6, 8);
    if (p.length > 8) result += ' ' + p.slice(8, 10);
    return result;
  }
  // международный формат
  return '+' + digits.slice(0, 15);
}

// ─── SVG иконки ───────────────────────────────────────────────
function IconShare() {
  return (
    <Svg width={15} height={15} viewBox="0 0 24 24" fill="none">
      <Path d="M4 12v7a1 1 0 001 1h14a1 1 0 001-1v-7" stroke="#fff" strokeWidth={1.8} strokeLinecap="round" />
      <Path d="M16 6l-4-4-4 4" stroke="#fff" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Line x1="12" y1="2" x2="12" y2="15" stroke="#fff" strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

// ─── Toast ────────────────────────────────────────────────────
function Toast({ message, type }: { message: string; type: 'error' | 'success' | 'info' }) {
  const bg = type === 'success' ? 'rgba(76,175,80,0.95)' : type === 'info' ? 'rgba(33,150,243,0.95)' : 'rgba(196,18,48,0.95)';
  return <View style={[styles.toast, { backgroundColor: bg }]}><Text style={styles.toastText}>{message}</Text></View>;
}

// ─── главный компонент ───────────────────────────────────────
export default function BoothDetail() {
  const { id } = useLocalSearchParams();
  const router  = useRouter();

  const [booth, setBooth]                     = useState<Booth | null>(null);
  const [products, setProducts]               = useState<Product[]>([]);
  const [visitorProducts, setVisitorProducts] = useState<VisitorProduct[]>([]);
  const [loading, setLoading]                 = useState(true);
  const [saving, setSaving]                   = useState(false);
  const [saved, setSaved]                     = useState(false);
  const [cardPhoto, setCardPhoto]             = useState<string | null>(null);
  const [cardPhotoBase64, setCardPhotoBase64] = useState<string | null>(null);
  const [isRecording, setIsRecording]         = useState(false);
  const [audioUri, setAudioUri]               = useState<string | null>(null);
  const [analyzing, setAnalyzing]             = useState(false);
  const [toast, setToast]                     = useState<{ message: string; type: 'error' | 'success' | 'info' } | null>(null);
  const [noteData, setNoteData]               = useState<VisitorNote>(EMPTY_NOTE);
  const [photoFullscreen, setPhotoFullscreen] = useState(false);

  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  function showToast(message: string, type: 'error' | 'success' | 'info' = 'info') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

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
          contact_name:     noteRes.data.contact_name     || '',
          contact_position: noteRes.data.contact_position || '',
          contact_phone:    noteRes.data.contact_phone    || '',
          contact_email:    noteRes.data.contact_email    || '',
          website:          noteRes.data.website          || '',
          telegram:         noteRes.data.telegram         || '',
          wechat:           noteRes.data.wechat           || '',
          note:             noteRes.data.note             || '',
          rating:           noteRes.data.rating           || 0,
        });
        setSaved(true);
      }
      if (vpRes.data) setVisitorProducts(vpRes.data);
    }

    const savedPhoto = await AsyncStorage.getItem(`booth_photo_${id}`);
    if (savedPhoto) {
      const info = await FileSystem.getInfoAsync(savedPhoto);
      if (info.exists) setCardPhoto(savedPhoto);
    }
    setLoading(false);
  }

  // ── OCR ──
  async function analyzeBusinessCard(base64: string) {
    setAnalyzing(true);
    showToast('🤖 Распознаю визитку...', 'info');
    try {
      const { data, error } = await supabase.functions.invoke('analyze-image', {
        body: { base64, mediaType: 'image/jpeg', mode: 'business_card' },
      });
      if (error) throw error;
      const parsed = JSON.parse((data?.result ?? '{}').replace(/```json|```/g, '').trim());
      setNoteData(prev => ({
        ...prev,
        contact_name:     parsed.contact_name  || prev.contact_name,
        contact_position: parsed.position      || prev.contact_position,
        contact_phone:    parsed.contact_phone || prev.contact_phone,
        contact_email:    parsed.contact_email || prev.contact_email,
        website:          parsed.website       || prev.website,
        telegram:         parsed.telegram      || prev.telegram,
        wechat:           parsed.wechat        || prev.wechat,
      }));
      showToast('✅ Поля заполнены автоматически', 'success');
    } catch { showToast('Не удалось распознать визитку', 'error'); }
    setAnalyzing(false);
  }

  // ── фото ──
  async function savePhotoLocally(uri: string, base64?: string) {
    const dir = `${FileSystem.documentDirectory}booths/${id}/`;
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    const dest = dir + `card_${Date.now()}.jpg`;
    await FileSystem.copyAsync({ from: uri, to: dest });
    setCardPhoto(dest);
    await AsyncStorage.setItem(`booth_photo_${id}`, dest);
    if (base64) setCardPhotoBase64(base64);
  }

  async function pickCardPhoto() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) { showToast('Нет доступа к камере', 'error'); return; }
    const result = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.8 });
    if (!result.canceled && result.assets[0]) await savePhotoLocally(result.assets[0].uri, result.assets[0].base64 ?? undefined);
  }

  async function pickFromGallery() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { showToast('Нет доступа к галерее', 'error'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.8 });
    if (!result.canceled && result.assets[0]) await savePhotoLocally(result.assets[0].uri, result.assets[0].base64 ?? undefined);
  }

  // ── аудио ──
  async function startRecording() {
    try { await AudioModule.requestRecordingPermissionsAsync(); await audioRecorder.record(); setIsRecording(true); }
    catch { showToast('Ошибка записи', 'error'); }
  }
  async function stopRecording() {
    try {
      const result = await audioRecorder.stop();
      setAudioUri(result ?? null);
    } catch { showToast('Ошибка остановки записи', 'error'); }
    setIsRecording(false);
  }

  // ── сохранение ──
  async function saveNote() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from('visitor_booth_notes').upsert({
      user_id: user.id,
      booth_id: id,
      ...noteData,
    }, {
      onConflict: 'user_id,booth_id',
    });
    if (error) showToast('Ошибка сохранения', 'error');
    else { setSaved(true); showToast('✅ Сохранено', 'success'); }
    setSaving(false);
  }

  // ── поделиться визиткой ──
  async function shareCard() {
    try {
      const lines = [
        `🏢 ${booth?.company_name}`,
        booth?.booth_number ? `Стенд ${booth.booth_number} · ${booth.hall}` : '',
        '',
        noteData.contact_name     ? `👤 ${noteData.contact_name}`           : '',
        noteData.contact_position ? `💼 ${noteData.contact_position}`        : '',
        noteData.contact_phone    ? `📞 ${noteData.contact_phone}`           : '',
        noteData.contact_email    ? `✉️ ${noteData.contact_email}`           : '',
        noteData.website          ? `🌐 ${noteData.website}`                 : '',
        noteData.telegram         ? `✈️ ${noteData.telegram}`                : '',
        noteData.wechat           ? `💬 WeChat: ${noteData.wechat}`          : '',
        noteData.note             ? `\n📝 ${noteData.note}`                  : '',
        '\n— ExpoHub',
      ].filter(Boolean).join('\n');

      const path = `${FileSystem.documentDirectory}booth_share.txt`;
      await FileSystem.writeAsStringAsync(path, lines);
      await Sharing.shareAsync(path, { dialogTitle: 'Поделиться визиткой' });
    } catch { showToast('Ошибка при шаринге', 'error'); }
  }

  // ── кликабельные контакты ──
  function handlePhoneTap(phone: string) {
    Alert.alert(phone, undefined, [
      { text: 'Позвонить', onPress: () => Linking.openURL(`tel:${phone.replace(/\s/g, '')}`) },
      { text: 'Скопировать', onPress: () => { Clipboard.setString(phone); showToast('Скопировано', 'success'); } },
      { text: 'Отмена', style: 'cancel' },
    ]);
  }

  function handleEmailTap(email: string) {
    Linking.openURL(`mailto:${email}`);
  }

  function handleWeChatTap(wechat: string) {
    Alert.alert('WeChat', wechat, [
      { text: 'Скопировать ID', onPress: () => { Clipboard.setString(wechat); showToast('Скопировано', 'success'); } },
      { text: 'Отмена', style: 'cancel' },
    ]);
  }

  function setField(key: keyof VisitorNote, value: string | number) {
    setNoteData(p => ({ ...p, [key]: value }));
  }

  // ── форматирование телефона при вводе ──
  function handlePhoneChange(raw: string) {
    const formatted = formatPhone(raw);
    setField('contact_phone', formatted);
  }

  async function deleteProduct(productId: string) {
    await supabase.from('visitor_products').delete().eq('id', productId);
    setVisitorProducts(p => p.filter(vp => vp.id !== productId));
  }

  if (loading) return <View style={styles.loader}><ActivityIndicator color={Colors.primary} size="large" /></View>;

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <GlowBackground intensity="low" position="top-right" />
      {toast && <Toast message={toast.message} type={toast.type} />}

      {/* шапка с рейтингом */}
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
          {/* рейтинг в шапке */}
          <View style={styles.heroStars}>
            {[1,2,3,4,5].map(star => (
              <TouchableOpacity key={star} onPress={() => setField('rating', star)}>
                <Text style={[styles.heroStar, noteData.rating >= star && styles.heroStarActive]}>★</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        {booth?.tags && booth.tags.length > 0 && (
          <View style={styles.tags}>
            {booth.tags.map(tag => <View key={tag} style={styles.tag}><Text style={styles.tagText}>{tag}</Text></View>)}
          </View>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.body}>

        {/* фото визитки + OCR */}
        <Text style={styles.sectionTitle}>ФОТО ВИЗИТКИ</Text>
        <View style={styles.photoBlock}>
          {cardPhoto && (
            <>
              <TouchableOpacity onPress={() => setPhotoFullscreen(true)}>
                <Image source={{ uri: cardPhoto }} style={styles.cardPhotoPreview} />
              </TouchableOpacity>
              <Modal visible={photoFullscreen} transparent animationType="fade">
                <TouchableOpacity
                  style={{ flex:1, backgroundColor:'rgba(0,0,0,0.95)', alignItems:'center', justifyContent:'center' }}
                  onPress={() => setPhotoFullscreen(false)}
                >
                  <Image source={{ uri: cardPhoto }} style={{ width:'95%', height:'70%', resizeMode:'contain' }} />
                  <Text style={{ color:'rgba(255,255,255,0.4)', marginTop:16, fontSize:12 }}>Нажми чтобы закрыть</Text>
                </TouchableOpacity>
              </Modal>
            </>
          )}
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
          {cardPhoto && (
            <TouchableOpacity
              style={[styles.ocrBtn, analyzing && { opacity: 0.6 }]}
              onPress={() => cardPhotoBase64 && analyzeBusinessCard(cardPhotoBase64)}
              disabled={analyzing || !cardPhotoBase64}
            >
              {analyzing ? <ActivityIndicator color={Colors.primary} size="small" /> : <Text style={styles.ocrBtnIcon}>🤖</Text>}
              <Text style={styles.ocrBtnText}>{analyzing ? 'Распознаю...' : 'Распознать визитку'}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* аудио */}
        <Text style={styles.sectionTitle}>АУДИО ЗАМЕТКА</Text>
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
              <View style={styles.audioRecorded}><Text style={styles.audioRecordedText}>🎙️ Запись сохранена</Text></View>
              <TouchableOpacity style={styles.recordBtn} onPress={startRecording}><Text style={styles.recordBtnText}>🔄 Перезаписать</Text></TouchableOpacity>
              <TouchableOpacity style={styles.deleteAudioBtn} onPress={() => setAudioUri(null)}><Text style={styles.deleteAudioText}>✕ Удалить</Text></TouchableOpacity>
            </View>
          )}
        </View>

        {/* контакт */}
        <Text style={styles.sectionTitle}>КОНТАКТ НА СТЕНДЕ</Text>
        <View style={styles.fields}>
          <Field label="Имя контакта" placeholder="Иван Петров"
            value={noteData.contact_name} onChangeText={v => setField('contact_name', v)} />
          <Field label="Должность" placeholder="Менеджер по продажам"
            value={noteData.contact_position} onChangeText={v => setField('contact_position', v)} />

          {/* телефон с форматированием и действием при тапе */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Телефон</Text>
            <View style={styles.fieldRow}>
              <TextInput
                style={styles.fieldInput}
                placeholder="+7 777 123 45 67"
                placeholderTextColor={Colors.textMuted}
                value={noteData.contact_phone}
                onChangeText={handlePhoneChange}
                keyboardType="phone-pad"
              />
              {noteData.contact_phone ? (
                <TouchableOpacity onPress={() => handlePhoneTap(noteData.contact_phone)}>
                  <Text style={styles.linkBtn}>📞</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          {/* email с действием при тапе */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Email</Text>
            <View style={styles.fieldRow}>
              <TextInput
                style={styles.fieldInput}
                placeholder="contact@company.com"
                placeholderTextColor={Colors.textMuted}
                value={noteData.contact_email}
                onChangeText={v => setField('contact_email', v)}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              {noteData.contact_email ? (
                <TouchableOpacity onPress={() => handleEmailTap(noteData.contact_email)}>
                  <Text style={styles.linkBtn}>✉️</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        </View>

        {/* онлайн контакты */}
        <Text style={styles.sectionTitle}>ОНЛАЙН КОНТАКТЫ</Text>
        <View style={styles.fields}>
          <Field label="Сайт" placeholder="https://company.com"
            value={noteData.website} onChangeText={v => setField('website', v)}
            keyboardType="url" autoCapitalize="none"
            suffix={noteData.website ? (
              <TouchableOpacity onPress={() => Linking.openURL(noteData.website)}>
                <Text style={styles.linkBtn}>↗</Text>
              </TouchableOpacity>
            ) : undefined} />

          <Field label="Telegram" placeholder="@username"
            value={noteData.telegram} onChangeText={v => setField('telegram', v)}
            autoCapitalize="none"
            suffix={noteData.telegram ? (
              <TouchableOpacity onPress={() => Linking.openURL(`https://t.me/${noteData.telegram.replace('@', '')}`)}>
                <Text style={styles.linkBtn}>↗</Text>
              </TouchableOpacity>
            ) : undefined} />

          {/* WeChat с копированием */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>WeChat</Text>
            <View style={styles.fieldRow}>
              <TextInput
                style={styles.fieldInput}
                placeholder="WeChat ID"
                placeholderTextColor={Colors.textMuted}
                value={noteData.wechat}
                onChangeText={v => setField('wechat', v)}
                autoCapitalize="none"
              />
              {noteData.wechat ? (
                <TouchableOpacity onPress={() => handleWeChatTap(noteData.wechat)}>
                  <Text style={styles.linkBtn}>💬</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        </View>

        {/* заметка */}
        <Text style={styles.sectionTitle}>ЗАМЕТКА</Text>
        <TextInput
          style={styles.noteInput}
          placeholder="Что заинтересовало? Вопросы, цены, условия..."
          placeholderTextColor={Colors.textMuted}
          value={noteData.note}
          onChangeText={v => setField('note', v)}
          multiline numberOfLines={4}
        />

        {/* товары стенда */}
        {products.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>ТОВАРЫ СТЕНДА</Text>
            {products.map(product => (
              <TouchableOpacity key={product.id} style={styles.productCard}
                onPress={() => router.push(`/product/${product.id}` as any)}>
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

        {/* мои находки */}
        <Text style={styles.sectionTitle}>МОИ НАХОДКИ</Text>
        {visitorProducts.map(vp => (
          <View key={vp.id} style={styles.myProductCard}>
            <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
              onPress={() => router.push(`/product/${vp.id}` as any)}>
              <View style={styles.productIcon}><Text style={{ fontSize: 20 }}>🛋️</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.productName}>{vp.name}</Text>
                {vp.price    ? <Text style={styles.productPrice}>{vp.price}</Text>       : null}
                {vp.category ? <Text style={styles.productCategory}>{vp.category}</Text> : null}
                {vp.note     ? <Text style={styles.productNote}>{vp.note}</Text>         : null}
              </View>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => deleteProduct(vp.id)} style={styles.deleteBtn}>
              <Text style={styles.deleteBtnText}>✕</Text>
            </TouchableOpacity>
          </View>
        ))}

        {/* добавить товар */}
        <TouchableOpacity style={styles.addProductBlock}
          onPress={() => router.push(`/add-product?booth_id=${id}&booth_name=${booth?.company_name}` as any)}>
          <Text style={styles.addProductIcon}>+</Text>
          <Text style={styles.addProductText}>Добавить товар</Text>
          <Text style={styles.addProductHint}>Название, цена, характеристики...</Text>
        </TouchableOpacity>

        {/* кнопки: поделиться + сохранить */}
        <View style={styles.actionRow}>
          {saved && (
            <TouchableOpacity style={styles.shareBtn} onPress={shareCard}>
              <IconShare />
              <Text style={styles.shareBtnText}>Поделиться</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.saveBtn, saving && { opacity: 0.6 }, saved && { flex: 1 }]}
            onPress={saveNote} disabled={saving}
          >
            <Text style={styles.saveBtnText}>
              {saving ? 'Сохранение...' : saved ? '✓ Обновить' : '💾 Сохранить визитку'}
            </Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── компонент поля ───────────────────────────────────────────
type FieldProps = {
  label: string; placeholder: string; value: string;
  onChangeText: (v: string) => void;
  keyboardType?: any; autoCapitalize?: any; suffix?: React.ReactNode;
};

function Field({ label, placeholder, value, onChangeText, keyboardType, autoCapitalize, suffix }: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.fieldRow}>
        <TextInput
          style={suffix ? [styles.fieldInput, { flex: 1, borderWidth: 0, padding: 0 }] : styles.fieldInput}
          placeholder={placeholder} placeholderTextColor={Colors.textMuted}
          value={value} onChangeText={onChangeText}
          keyboardType={keyboardType} autoCapitalize={autoCapitalize ?? 'sentences'}
        />
        {suffix}
      </View>
    </View>
  );
}

// ─── стили ───────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:               { flex: 1, backgroundColor: Colors.background },
  loader:             { flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },
  toast:              { position: 'absolute', top: 60, left: 20, right: 20, padding: 14, borderRadius: Radius.md, zIndex: 100, alignItems: 'center' },
  toastText:          { color: '#fff', fontSize: Font.sm, fontWeight: '600' },

  hero:               { backgroundColor: '#180010', paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  back:               { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  backText:           { color: '#fff', fontSize: 16 },
  logoWrap:           { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  logo:               { width: 48, height: 48, borderRadius: 12, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  logoText:           { fontSize: Font.xl, fontWeight: '800', color: Colors.primary },
  companyName:        { fontSize: Font.lg, fontWeight: '800', color: '#fff' },
  boothMeta:          { fontSize: Font.xs, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  heroStars:          { flexDirection: 'row', gap: 2 },
  heroStar:           { fontSize: 20, color: 'rgba(255,255,255,0.2)' },
  heroStarActive:     { color: Colors.primary },
  tags:               { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag:                { backgroundColor: 'rgba(196,18,48,0.2)', borderWidth: 1, borderColor: Colors.primaryBorder, borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 3 },
  tagText:            { color: Colors.primary, fontSize: Font.xs, fontWeight: '600' },

  body:               { padding: 20, paddingBottom: 40 },
  sectionTitle:       { fontSize: Font.xs, color: Colors.textMuted, letterSpacing: 2, fontWeight: '700', marginBottom: 10, marginTop: 16 },

  photoBlock:         { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, padding: 12, gap: 10 },
  cardPhotoPreview:   { width: '100%', height: 150, borderRadius: Radius.sm, resizeMode: 'cover' },
  photoRow:           { flexDirection: 'row', gap: 10 },
  photoBtn:           { flex: 1, backgroundColor: Colors.primaryLight, borderWidth: 1, borderColor: Colors.primaryBorder, borderRadius: Radius.md, paddingVertical: 12, alignItems: 'center', gap: 4 },
  photoBtnIcon:       { fontSize: 20 },
  photoBtnText:       { fontSize: Font.xs, color: Colors.primary, fontWeight: '700' },
  ocrBtn:             { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 13, borderRadius: Radius.md, borderWidth: 1.5, borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  ocrBtnIcon:         { fontSize: 18 },
  ocrBtnText:         { fontSize: Font.sm, color: Colors.primary, fontWeight: '700' },

  audioBlock:         { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, padding: 12, gap: 8 },
  recordBtn:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: Radius.md, backgroundColor: Colors.primaryLight, borderWidth: 1, borderColor: Colors.primaryBorder },
  recordBtnActive:    { backgroundColor: 'rgba(196,18,48,0.3)', borderColor: Colors.primary },
  recordBtnIcon:      { fontSize: 20 },
  recordBtnText:      { fontSize: Font.sm, color: Colors.primary, fontWeight: '700' },
  audioRow:           { gap: 8 },
  audioRecorded:      { paddingVertical: 12, borderRadius: Radius.md, backgroundColor: 'rgba(76,175,80,0.15)', borderWidth: 1, borderColor: 'rgba(76,175,80,0.3)', alignItems: 'center' },
  audioRecordedText:  { color: '#4CAF50', fontSize: Font.sm, fontWeight: '600' },
  deleteAudioBtn:     { paddingVertical: 10, borderRadius: Radius.md, backgroundColor: 'rgba(196,18,48,0.1)', borderWidth: 1, borderColor: Colors.primaryBorder, alignItems: 'center' },
  deleteAudioText:    { color: Colors.primary, fontSize: Font.xs, fontWeight: '600' },

  fields:             { gap: 10 },
  field:              { gap: 6 },
  fieldLabel:         { fontSize: Font.xs, color: Colors.textMuted, fontWeight: '600', marginLeft: 2 },
  fieldRow:           { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 2 },
  fieldInput:         { flex: 1, paddingVertical: 12, fontSize: Font.sm, color: Colors.textPrimary },
  linkBtn:            { fontSize: 18, paddingLeft: 8, paddingVertical: 10 },

  noteInput:          { backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.md, padding: 14, fontSize: Font.sm, color: Colors.textPrimary, minHeight: 100, textAlignVertical: 'top' },

  productCard:        { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, padding: 12, marginBottom: 8 },
  myProductCard:      { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.primaryBorder, borderRadius: Radius.md, padding: 12, marginBottom: 8 },
  productIcon:        { width: 44, height: 44, borderRadius: Radius.sm, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  productName:        { fontSize: Font.md, fontWeight: '600', color: Colors.textPrimary },
  productPrice:       { fontSize: Font.sm, color: Colors.primary, fontWeight: '700', marginTop: 2 },
  productCategory:    { fontSize: Font.xs, color: Colors.textMuted, marginTop: 2 },
  productNote:        { fontSize: Font.xs, color: Colors.textSecondary, marginTop: 2 },
  arrow:              { color: Colors.textMuted, fontSize: 20 },

  addProductBlock:    { borderWidth: 1.5, borderColor: Colors.border, borderStyle: 'dashed', borderRadius: Radius.md, padding: 20, alignItems: 'center', marginTop: 8, marginBottom: 8 },
  addProductIcon:     { fontSize: 28, color: Colors.primary, marginBottom: 6 },
  addProductText:     { fontSize: Font.md, fontWeight: '700', color: Colors.textPrimary, marginBottom: 4 },
  addProductHint:     { fontSize: Font.xs, color: Colors.textMuted },

  deleteBtn:          { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(196,18,48,0.15)', alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  deleteBtnText:      { color: Colors.primary, fontSize: 12 },

  actionRow:          { flexDirection: 'row', gap: 10, marginTop: 24 },
  shareBtn:           { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, paddingHorizontal: 16, paddingVertical: 16 },
  shareBtnText:       { color: Colors.textSecondary, fontSize: Font.sm, fontWeight: '600' },
  saveBtn:            { flex: 2, backgroundColor: Colors.primary, borderRadius: Radius.md, paddingVertical: 16, alignItems: 'center' },
  saveBtnText:        { color: '#fff', fontSize: Font.md, fontWeight: '700' },
});
