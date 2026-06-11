import * as FileSystem from 'expo-file-system/legacy';
import { AudioModule, RecordingPresets, useAudioRecorder } from 'expo-audio';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator, Image, KeyboardAvoidingView, Modal,
  Platform, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View
} from 'react-native';
import Svg, { Path, Circle, Line, Rect } from 'react-native-svg';
import { GlowBackground } from '../components/shared/GlowBackground';
import { supabase } from '../lib/supabase';
import { Colors, Font, Radius } from '../styles/theme';

const CATEGORIES = ['Мебель', 'Освещение', 'Декор', 'Текстиль', 'Кухня', 'Спальня', 'Офис', 'Другое'];
const EMPTY = { name: '', price: '', category: '', characteristics: '', logistics: '', note: '', rating: 0 };

function IconMic({ recording }: { recording: boolean }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Rect x="9" y="2" width="6" height="11" rx="3" stroke={recording ? Colors.primary : Colors.textMuted} strokeWidth={1.8} />
      <Path d="M5 10a7 7 0 0014 0" stroke={recording ? Colors.primary : Colors.textMuted} strokeWidth={1.8} strokeLinecap="round" />
      <Line x1="12" y1="19" x2="12" y2="22" stroke={recording ? Colors.primary : Colors.textMuted} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

function IconShare() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path d="M4 12v7a1 1 0 001 1h14a1 1 0 001-1v-7" stroke="#fff" strokeWidth={1.8} strokeLinecap="round" />
      <Path d="M16 6l-4-4-4 4" stroke="#fff" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Line x1="12" y1="2" x2="12" y2="15" stroke="#fff" strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

type FieldWithMicProps = {
  label: string; placeholder: string; value: string;
  onChangeText: (v: string) => void;
  audioUri: string | null; isRecording: boolean;
  onStartRecording: () => void; onStopRecording: () => void; onDeleteAudio: () => void;
};

function FieldWithMic({ label, placeholder, value, onChangeText, audioUri, isRecording, onStartRecording, onStopRecording, onDeleteAudio }: FieldWithMicProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.micFieldWrap}>
        <TextInput style={[styles.fieldInput, styles.multiline, { paddingBottom: 36 }]} placeholder={placeholder} placeholderTextColor={Colors.textMuted} value={value} onChangeText={onChangeText} multiline />
        <TouchableOpacity style={[styles.micBtn, isRecording && styles.micBtnActive]} onPress={isRecording ? onStopRecording : onStartRecording}>
          <IconMic recording={isRecording} />
        </TouchableOpacity>
      </View>
      {audioUri && !isRecording && (
        <View style={styles.audioStatus}>
          <Text style={styles.audioStatusText}>🎙️ Аудио записано</Text>
          <TouchableOpacity onPress={onDeleteAudio}><Text style={styles.audioDeleteBtn}>✕ Удалить</Text></TouchableOpacity>
        </View>
      )}
      {isRecording && (
        <View style={styles.audioRecording}>
          <View style={styles.recordingDot} />
          <Text style={styles.audioRecordingText}>Запись...</Text>
        </View>
      )}
    </View>
  );
}

export default function AddProduct() {
  const { booth_id, booth_name } = useLocalSearchParams();
  const router = useRouter();

  const [form, setForm]               = useState(EMPTY);
  const [mainImage, setMainImage]     = useState<string | null>(null);
  const [mediaImages, setMediaImages] = useState<string[]>([]);
  const [saving, setSaving]           = useState(false);
  const [saved, setSaved]             = useState(false);
  const [analyzing, setAnalyzing]     = useState(false);
  const [showCatPicker, setShowCatPicker] = useState(false);
  const [toast, setToast]             = useState<{ text: string; type: 'ok' | 'err' } | null>(null);
  const [viewingPhoto, setViewingPhoto] = useState<string | null>(null);

  const [charAudioUri, setCharAudioUri]   = useState<string | null>(null);
  const [charRecording, setCharRecording] = useState(false);
  const charRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  const [noteAudioUri, setNoteAudioUri]   = useState<string | null>(null);
  const [noteRecording, setNoteRecording] = useState(false);
  const noteRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  function showToast(text: string, type: 'ok' | 'err') {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function pickMainImage(fromCamera = false) {
    const perm = fromCamera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { showToast('Нет доступа', 'err'); return; }
    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ base64: true, quality: 0.7 })
      : await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.7 });
    if (!result.canceled && result.assets[0]) {
      setMainImage(result.assets[0].uri);
      if (result.assets[0].base64) await analyzeWithClaude(result.assets[0].base64);
    }
  }

  async function analyzeWithClaude(base64: string) {
    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-image', { body: { base64, mediaType: 'image/jpeg', mode: 'product' } });
      if (error) throw error;
      const parsed = JSON.parse(data.result.replace(/```json|```/g, '').trim());
      setForm(p => ({
        ...p,
        name:            parsed.name            || p.name,
        price:           parsed.price           || p.price,
        category:        parsed.category        || p.category,
        characteristics: parsed.characteristics || p.characteristics,
        logistics:       parsed.logistics       || p.logistics,
        note:            parsed.note            || p.note,
      }));
      showToast('✅ Данные извлечены из фото', 'ok');
    } catch { showToast('Не удалось распознать фото', 'err'); }
    setAnalyzing(false);
  }

  async function addMediaPhoto(fromCamera = false) {
    const perm = fromCamera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { showToast('Нет доступа', 'err'); return; }
    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.8 })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.8, allowsMultipleSelection: true });
    if (!result.canceled) {
      const uris = result.assets.map(a => a.uri);
      setMediaImages(prev => [...prev, ...uris].slice(0, 10));
    }
  }

  function removeMedia(uri: string) { setMediaImages(prev => prev.filter(u => u !== uri)); }

  async function startCharRecording() {
    try {
      const perm = await AudioModule.requestRecordingPermissionsAsync();
      console.log('MIC PERM:', JSON.stringify(perm));
      if (!perm.granted) { showToast('Нет доступа к микрофону', 'err'); return; }
      await charRecorder.record();
      setCharRecording(true);
      console.log('RECORDING STARTED');
    } catch (e) {
      console.log('MIC ERROR:', String(e));
      showToast('Ошибка: ' + String(e), 'err');
    }
  }
  async function stopCharRecording() {
    try { const result = await charRecorder.stop(); setCharAudioUri(result ?? null); } catch {}
    setCharRecording(false);
  }

  async function startNoteRecording() {
    try { await AudioModule.requestRecordingPermissionsAsync(); await noteRecorder.record(); setNoteRecording(true); }
    catch { showToast('Ошибка записи', 'err'); }
  }
  async function stopNoteRecording() {
    try { const result = await noteRecorder.stop(); setNoteAudioUri(result ?? null); } catch {}
    setNoteRecording(false);
  }

  async function save() {
    if (!form.name.trim()) { showToast('Введите название', 'err'); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from('visitor_products').insert({
      user_id: user.id, booth_id,
      name: form.name, price: form.price, category: form.category,
      characteristics: form.characteristics, logistics: form.logistics, note: form.note,
    });
    if (error) showToast('Ошибка сохранения', 'err');
    else { setSaved(true); showToast('Товар сохранён!', 'ok'); }
    setSaving(false);
  }

  async function shareProduct() {
    try {
      const lines = [
        `📦 ${form.name}`,
        form.price           ? `💰 ${form.price}`           : '',
        form.category        ? `🏷️ ${form.category}`        : '',
        form.characteristics ? `📐 ${form.characteristics}` : '',
        form.logistics       ? `🚚 ${form.logistics}`       : '',
        form.note            ? `💬 ${form.note}`            : '',
        '\n— ExpoHub',
      ].filter(Boolean).join('\n');
      const path = `${FileSystem.documentDirectory}product_share.txt`;
      await FileSystem.writeAsStringAsync(path, lines);
      await Sharing.shareAsync(path, { dialogTitle: 'Поделиться товаром' });
    } catch { showToast('Ошибка при шаринге', 'err'); }
  }

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <GlowBackground intensity="low" position="top-right" />

      {toast && (
        <View style={[styles.toast, toast.type === 'ok' ? styles.toastOk : styles.toastErr]}>
          <Text style={styles.toastText}>{toast.text}</Text>
        </View>
      )}

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Добавить товар</Text>
          <Text style={styles.headerSub}>{booth_name as string}</Text>
        </View>
        <View style={styles.headerStars}>
          {[1,2,3,4,5].map(star => (
            <TouchableOpacity key={star} onPress={() => setForm(p => ({ ...p, rating: star }))}>
              <Text style={[styles.headerStar, form.rating >= star && styles.headerStarActive]}>★</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.body}>

        <View style={styles.ocrBlock}>
          <Text style={styles.sectionTitle}>ФОТО ДЛЯ РАСПОЗНАВАНИЯ</Text>
          <Text style={styles.ocrHint}>Сфотографируйте товар — ИИ заполнит поля автоматически</Text>
          {mainImage && (
            <TouchableOpacity onPress={() => setViewingPhoto(mainImage)}>
              <Image source={{ uri: mainImage }} style={styles.preview} />
            </TouchableOpacity>
          )}
          {analyzing && (
            <View style={styles.analyzingRow}>
              <ActivityIndicator color={Colors.primary} size="small" />
              <Text style={styles.analyzingText}>Анализирую изображение...</Text>
            </View>
          )}
          <View style={styles.photoRow}>
            <TouchableOpacity style={styles.photoBtn} onPress={() => pickMainImage(true)}>
              <Text style={styles.photoBtnIcon}>📷</Text>
              <Text style={styles.photoBtnText}>Камера</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.photoBtn} onPress={() => pickMainImage(false)}>
              <Text style={styles.photoBtnIcon}>🖼️</Text>
              <Text style={styles.photoBtnText}>Галерея</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>НАЗВАНИЕ ТОВАРА *</Text>
          <TextInput style={styles.fieldInput} placeholder="Диван Loft, Стол Oslo..." placeholderTextColor={Colors.textMuted} value={form.name} onChangeText={v => setForm(p => ({ ...p, name: v }))} />
        </View>

        <View style={[styles.field, { marginTop: 10 }]}>
          <Text style={styles.fieldLabel}>ЦЕНА</Text>
          <TextInput style={styles.fieldInput} placeholder="1 200 €, по запросу..." placeholderTextColor={Colors.textMuted} value={form.price} onChangeText={v => setForm(p => ({ ...p, price: v }))} />
        </View>

        <View style={[styles.field, { marginTop: 10 }]}>
          <Text style={styles.fieldLabel}>КАТЕГОРИЯ</Text>
          <TouchableOpacity style={styles.picker} onPress={() => setShowCatPicker(true)}>
            <Text style={form.category ? styles.pickerValue : styles.pickerPlaceholder}>{form.category || 'Выберите категорию...'}</Text>
            <Text style={styles.pickerArrow}>▼</Text>
          </TouchableOpacity>
        </View>

        <View style={{ marginTop: 10 }}>
          <FieldWithMic label="ХАРАКТЕРИСТИКИ" placeholder="Размер, материал, цвет, вес..."
            value={form.characteristics} onChangeText={v => setForm(p => ({ ...p, characteristics: v }))}
            audioUri={charAudioUri} isRecording={charRecording}
            onStartRecording={startCharRecording} onStopRecording={stopCharRecording} onDeleteAudio={() => setCharAudioUri(null)} />
        </View>

        <View style={[styles.field, { marginTop: 10 }]}>
          <Text style={styles.fieldLabel}>ЛОГИСТИЧЕСКИЕ ПАРАМЕТРЫ</Text>
          <TextInput style={[styles.fieldInput, styles.multiline]} placeholder="Срок поставки, страна производства, MOQ..." placeholderTextColor={Colors.textMuted} value={form.logistics} onChangeText={v => setForm(p => ({ ...p, logistics: v }))} multiline />
        </View>

        <View style={{ marginTop: 10 }}>
          <FieldWithMic label="КОММЕНТАРИЙ" placeholder="Впечатления, вопросы, договорённости..."
            value={form.note} onChangeText={v => setForm(p => ({ ...p, note: v }))}
            audioUri={noteAudioUri} isRecording={noteRecording}
            onStartRecording={startNoteRecording} onStopRecording={stopNoteRecording} onDeleteAudio={() => setNoteAudioUri(null)} />
        </View>

        <View style={[styles.mediaBlock, { marginTop: 16 }]}>
          <Text style={styles.sectionTitle}>МЕДИАФАЙЛЫ</Text>
          <Text style={styles.ocrHint}>Добавьте фото товара (до 10 штук)</Text>
          {mediaImages.length > 0 && (
            <View style={styles.mediaGrid}>
              {mediaImages.map((uri, i) => (
                <TouchableOpacity key={i} style={styles.mediaThumb} onPress={() => setViewingPhoto(uri)}>
                  <Image source={{ uri }} style={styles.mediaThumbImg} />
                  <TouchableOpacity style={styles.mediaRemoveBtn} onPress={() => removeMedia(uri)}>
                    <Text style={styles.mediaRemoveText}>✕</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </View>
          )}
          {mediaImages.length < 10 && (
            <View style={styles.photoRow}>
              <TouchableOpacity style={styles.photoBtn} onPress={() => addMediaPhoto(true)}>
                <Text style={styles.photoBtnIcon}>📷</Text>
                <Text style={styles.photoBtnText}>Камера</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.photoBtn} onPress={() => addMediaPhoto(false)}>
                <Text style={styles.photoBtnIcon}>🖼️</Text>
                <Text style={styles.photoBtnText}>Галерея</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.actionRow}>
          {saved && (
            <TouchableOpacity style={styles.shareBtn} onPress={shareProduct}>
              <IconShare />
              <Text style={styles.shareBtnText}>Поделиться</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.saveBtn, (!form.name.trim() || saving) && { opacity: 0.5 }, saved && { flex: 1 }]}
            onPress={saved ? () => router.back() : save}
            disabled={saving || !form.name.trim()}
          >
            <Text style={styles.saveBtnText}>
              {saving ? 'Сохранение...' : saved ? '✓ Готово' : '💾 Сохранить товар'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* просмотр фото на весь экран */}
      <Modal visible={!!viewingPhoto} transparent animationType="fade">
        <TouchableOpacity
          style={styles.photoViewer}
          onPress={() => setViewingPhoto(null)}
          activeOpacity={1}
        >
          {viewingPhoto && (
            <Image source={{ uri: viewingPhoto }} style={styles.photoViewerImg} />
          )}
          <Text style={styles.photoViewerHint}>Нажми чтобы закрыть</Text>
        </TouchableOpacity>
      </Modal>

      {/* модалка категорий */}
      <Modal visible={showCatPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Категория</Text>
              <TouchableOpacity onPress={() => setShowCatPicker(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            {CATEGORIES.map(cat => (
              <TouchableOpacity key={cat} style={[styles.catOption, form.category === cat && styles.catOptionActive]}
                onPress={() => { setForm(p => ({ ...p, category: cat })); setShowCatPicker(false); }}>
                <Text style={[styles.catOptionText, form.category === cat && styles.catOptionTextActive]}>{cat}</Text>
                {form.category === cat && <Text style={styles.catCheck}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root:             { flex: 1, backgroundColor: Colors.background },
  toast:            { position: 'absolute', top: 60, left: 20, right: 20, padding: 14, borderRadius: Radius.md, zIndex: 100 },
  toastOk:          { backgroundColor: 'rgba(76,175,80,0.9)' },
  toastErr:         { backgroundColor: 'rgba(196,18,48,0.9)' },
  toastText:        { color: '#fff', fontSize: Font.sm, fontWeight: '600', textAlign: 'center' },
  header:           { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16, backgroundColor: '#180010', borderBottomWidth: 1, borderBottomColor: Colors.border },
  back:             { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  backText:         { color: '#fff', fontSize: 16 },
  headerTitle:      { fontSize: Font.lg, fontWeight: '800', color: '#fff' },
  headerSub:        { fontSize: Font.xs, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  headerStars:      { flexDirection: 'row', gap: 2 },
  headerStar:       { fontSize: 20, color: 'rgba(255,255,255,0.2)' },
  headerStarActive: { color: Colors.primary },
  body:             { padding: 20 },
  sectionTitle:     { fontSize: Font.xs, color: Colors.textMuted, letterSpacing: 2, fontWeight: '700', marginBottom: 6 },
  ocrBlock:         { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.lg, padding: 16, marginBottom: 20 },
  mediaBlock:       { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.lg, padding: 16 },
  ocrHint:          { fontSize: Font.xs, color: Colors.textMuted, marginBottom: 12, lineHeight: 18 },
  preview:          { width: '100%', height: 160, borderRadius: Radius.md, marginBottom: 12, resizeMode: 'cover' },
  analyzingRow:     { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  analyzingText:    { fontSize: Font.sm, color: Colors.primary },
  photoRow:         { flexDirection: 'row', gap: 10 },
  photoBtn:         { flex: 1, backgroundColor: Colors.primaryLight, borderWidth: 1, borderColor: Colors.primaryBorder, borderRadius: Radius.md, paddingVertical: 12, alignItems: 'center', gap: 4 },
  photoBtnIcon:     { fontSize: 22 },
  photoBtnText:     { fontSize: Font.xs, color: Colors.primary, fontWeight: '700' },
  mediaGrid:        { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  mediaThumb:       { width: 90, height: 90, borderRadius: Radius.sm, overflow: 'hidden' },
  mediaThumbImg:    { width: '100%', height: '100%', resizeMode: 'cover' },
  mediaRemoveBtn:   { position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(0,0,0,0.65)', alignItems: 'center', justifyContent: 'center' },
  mediaRemoveText:  { color: '#fff', fontSize: 11, fontWeight: '700' },
  field:            { gap: 6 },
  fieldLabel:       { fontSize: Font.xs, color: Colors.textMuted, fontWeight: '600', marginLeft: 2 },
  fieldInput:       { backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.md, padding: 14, fontSize: Font.sm, color: Colors.textPrimary },
  multiline:        { minHeight: 80, textAlignVertical: 'top' },
  micFieldWrap:     { position: 'relative' },
  micBtn:           { position: 'absolute', bottom: 10, right: 10, width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  micBtnActive:     { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  audioStatus:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  audioStatusText:  { fontSize: Font.xs, color: '#4CAF50', fontWeight: '600' },
  audioDeleteBtn:   { fontSize: Font.xs, color: Colors.primary, fontWeight: '600' },
  audioRecording:   { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  recordingDot:     { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary },
  audioRecordingText: { fontSize: Font.xs, color: Colors.primary, fontWeight: '600' },
  picker:           { backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.md, padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pickerValue:      { fontSize: Font.sm, color: Colors.textPrimary },
  pickerPlaceholder:{ fontSize: Font.sm, color: Colors.textMuted },
  pickerArrow:      { fontSize: 10, color: Colors.textMuted },
  actionRow:        { flexDirection: 'row', gap: 10, marginTop: 24 },
  shareBtn:         { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, paddingHorizontal: 16, paddingVertical: 16 },
  shareBtnText:     { color: Colors.textSecondary, fontSize: Font.sm, fontWeight: '600' },
  saveBtn:          { flex: 1, backgroundColor: Colors.primary, borderRadius: Radius.md, paddingVertical: 16, alignItems: 'center' },
  saveBtnText:      { color: '#fff', fontSize: Font.md, fontWeight: '700' },
  photoViewer:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.96)', alignItems: 'center', justifyContent: 'center' },
  photoViewerImg:   { width: '95%', height: '75%', resizeMode: 'contain' },
  photoViewerHint:  { color: 'rgba(255,255,255,0.3)', marginTop: 16, fontSize: 12 },
  modalOverlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modal:            { backgroundColor: '#13131f', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalHeader:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle:       { fontSize: Font.lg, fontWeight: '800', color: Colors.textPrimary },
  modalClose:       { color: Colors.textMuted, fontSize: 18 },
  catOption:        { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  catOptionActive:  { borderBottomColor: Colors.primaryBorder },
  catOptionText:    { fontSize: Font.md, color: Colors.textSecondary },
  catOptionTextActive: { color: Colors.primary, fontWeight: '700' },
  catCheck:         { color: Colors.primary, fontSize: Font.md },
});
