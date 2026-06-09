import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Modal,
  Platform, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View
} from 'react-native';
import { GlowBackground } from '../components/shared/GlowBackground';
import { supabase } from '../lib/supabase';
import { Colors, Font, Radius } from '../styles/theme';

const CATEGORIES = ['Мебель', 'Освещение', 'Декор', 'Текстиль', 'Кухня', 'Спальня', 'Офис', 'Другое'];

const EMPTY = {
  name: '', price: '', category: '',
  characteristics: '', logistics: '', note: '', rating: 0
};

export default function AddProduct() {
  const { booth_id, booth_name } = useLocalSearchParams();
  const router = useRouter();
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [showCatPicker, setShowCatPicker] = useState(false);
  const [toast, setToast] = useState<{ text: string; type: 'ok' | 'err' } | null>(null);

  function showToast(text: string, type: 'ok' | 'err') {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function pickImage(fromCamera = false) {
    showToast('Доступно после пересборки билда', 'err');
  }

  async function save() {
    if (!form.name.trim()) { showToast('Введите название', 'err'); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from('visitor_products').insert({
      user_id: user.id,
      booth_id,
      name: form.name,
      price: form.price,
      category: form.category,
      characteristics: form.characteristics,
      logistics: form.logistics,
      note: form.note,
    });
    if (error) showToast('Ошибка сохранения', 'err');
    else { showToast('Товар добавлен!', 'ok'); setTimeout(() => router.back(), 800); }
    setSaving(false);
  }

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <GlowBackground intensity="low" position="top-right" />

      {toast && (
        <View style={[styles.toast, toast.type === 'ok' ? styles.toastOk : styles.toastErr]}>
          <Text style={styles.toastText}>{toast.text}</Text>
        </View>
      )}

      {/* шапка */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Добавить товар</Text>
          <Text style={styles.headerSub}>{booth_name}</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.body}>

        {/* OCR блок */}
        <View style={styles.ocrBlock}>
          <Text style={styles.sectionTitle}>📸 ФОТО ДЛЯ РАСПОЗНАВАНИЯ</Text>
          <Text style={styles.ocrHint}>Сфотографируйте товар или визитку — ИИ заполнит поля автоматически</Text>
          {analyzing && (
            <View style={styles.analyzingRow}>
              <ActivityIndicator color={Colors.primary} size="small" />
              <Text style={styles.analyzingText}>Анализирую изображение...</Text>
            </View>
          )}
          <View style={styles.photoRow}>
            <TouchableOpacity style={styles.photoBtn} onPress={() => pickImage(true)}>
              <Text style={styles.photoBtnIcon}>📷</Text>
              <Text style={styles.photoBtnText}>Камера</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.photoBtn} onPress={() => pickImage(false)}>
              <Text style={styles.photoBtnIcon}>🖼️</Text>
              <Text style={styles.photoBtnText}>Галерея</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* название */}
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>НАЗВАНИЕ ТОВАРА *</Text>
          <TextInput style={styles.fieldInput} placeholder="Диван Loft, Стол Oslo..." placeholderTextColor={Colors.textMuted} value={form.name} onChangeText={v => setForm(p => ({ ...p, name: v }))} />
        </View>

        {/* цена */}
        <View style={[styles.field, { marginTop: 10 }]}>
          <Text style={styles.fieldLabel}>ЦЕНА</Text>
          <TextInput style={styles.fieldInput} placeholder="1 200 €, по запросу..." placeholderTextColor={Colors.textMuted} value={form.price} onChangeText={v => setForm(p => ({ ...p, price: v }))} />
        </View>

        {/* категория — выпадающий список */}
        <View style={[styles.field, { marginTop: 10 }]}>
          <Text style={styles.fieldLabel}>КАТЕГОРИЯ</Text>
          <TouchableOpacity style={styles.picker} onPress={() => setShowCatPicker(true)}>
            <Text style={form.category ? styles.pickerValue : styles.pickerPlaceholder}>
              {form.category || 'Выберите категорию...'}
            </Text>
            <Text style={styles.pickerArrow}>▼</Text>
          </TouchableOpacity>
        </View>

        {/* рейтинг */}
        <View style={[styles.field, { marginTop: 10 }]}>
          <Text style={styles.fieldLabel}>РЕЙТИНГ ТОВАРА</Text>
          <View style={styles.stars}>
            {[1, 2, 3, 4, 5].map(star => (
              <TouchableOpacity key={star} onPress={() => setForm(p => ({ ...p, rating: star }))}>
                <Text style={[styles.star, form.rating >= star && styles.starActive]}>★</Text>
              </TouchableOpacity>
            ))}
            {form.rating > 0 && (
              <TouchableOpacity onPress={() => setForm(p => ({ ...p, rating: 0 }))} style={styles.clearRating}>
                <Text style={styles.clearRatingText}>сбросить</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* характеристики */}
        <View style={[styles.field, { marginTop: 10 }]}>
          <Text style={styles.fieldLabel}>ХАРАКТЕРИСТИКИ</Text>
          <TextInput style={[styles.fieldInput, styles.multiline]} placeholder="Размер, материал, цвет, вес..." placeholderTextColor={Colors.textMuted} value={form.characteristics} onChangeText={v => setForm(p => ({ ...p, characteristics: v }))} multiline />
        </View>

        {/* логистика */}
        <View style={[styles.field, { marginTop: 10 }]}>
          <Text style={styles.fieldLabel}>ЛОГИСТИЧЕСКИЕ ПАРАМЕТРЫ</Text>
          <TextInput style={[styles.fieldInput, styles.multiline]} placeholder="Срок поставки, страна производства, MOQ..." placeholderTextColor={Colors.textMuted} value={form.logistics} onChangeText={v => setForm(p => ({ ...p, logistics: v }))} multiline />
        </View>

        {/* комментарий */}
        <View style={[styles.field, { marginTop: 10 }]}>
          <Text style={styles.fieldLabel}>КОММЕНТАРИЙ</Text>
          <TextInput style={[styles.fieldInput, styles.multiline]} placeholder="Впечатления, вопросы, договорённости..." placeholderTextColor={Colors.textMuted} value={form.note} onChangeText={v => setForm(p => ({ ...p, note: v }))} multiline />
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, (saving || !form.name.trim()) && { opacity: 0.5 }]}
          onPress={save}
          disabled={saving || !form.name.trim()}
        >
          <Text style={styles.saveBtnText}>
            {saving ? 'Сохранение...' : '💾 Сохранить товар'}
          </Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

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
              <TouchableOpacity
                key={cat}
                style={[styles.catOption, form.category === cat && styles.catOptionActive]}
                onPress={() => { setForm(p => ({ ...p, category: cat })); setShowCatPicker(false); }}
              >
                <Text style={[styles.catOptionText, form.category === cat && styles.catOptionTextActive]}>
                  {cat}
                </Text>
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
  root: { flex: 1, backgroundColor: Colors.background },
  toast: { position: 'absolute', top: 60, left: 20, right: 20, padding: 14, borderRadius: Radius.md, zIndex: 100 },
  toastOk: { backgroundColor: 'rgba(76,175,80,0.9)' },
  toastErr: { backgroundColor: 'rgba(196,18,48,0.9)' },
  toastText: { color: '#fff', fontSize: Font.sm, fontWeight: '600', textAlign: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16, backgroundColor: '#180010', borderBottomWidth: 1, borderBottomColor: Colors.border },
  back: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  backText: { color: '#fff', fontSize: 16 },
  headerTitle: { fontSize: Font.lg, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: Font.xs, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  body: { padding: 20 },
  sectionTitle: { fontSize: Font.xs, color: Colors.textMuted, letterSpacing: 2, fontWeight: '700', marginBottom: 6 },
  ocrBlock: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.lg, padding: 16, marginBottom: 20 },
  ocrHint: { fontSize: Font.xs, color: Colors.textMuted, marginBottom: 12, lineHeight: 18 },
  analyzingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  analyzingText: { fontSize: Font.sm, color: Colors.primary },
  photoRow: { flexDirection: 'row', gap: 10 },
  photoBtn: { flex: 1, backgroundColor: Colors.primaryLight, borderWidth: 1, borderColor: Colors.primaryBorder, borderRadius: Radius.md, paddingVertical: 12, alignItems: 'center', gap: 4 },
  photoBtnIcon: { fontSize: 22 },
  photoBtnText: { fontSize: Font.xs, color: Colors.primary, fontWeight: '700' },
  field: { gap: 6 },
  fieldLabel: { fontSize: Font.xs, color: Colors.textMuted, fontWeight: '600', marginLeft: 2 },
  fieldInput: { backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.md, padding: 14, fontSize: Font.sm, color: Colors.textPrimary },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  picker: { backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.md, padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pickerValue: { fontSize: Font.sm, color: Colors.textPrimary },
  pickerPlaceholder: { fontSize: Font.sm, color: Colors.textMuted },
  pickerArrow: { fontSize: 10, color: Colors.textMuted },
  stars: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  star: { fontSize: 30, color: Colors.border },
  starActive: { color: Colors.primary },
  clearRating: { marginLeft: 8 },
  clearRatingText: { fontSize: Font.xs, color: Colors.textMuted },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: Radius.md, paddingVertical: 16, alignItems: 'center', marginTop: 24 },
  saveBtnText: { color: '#fff', fontSize: Font.md, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#13131f', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: Font.lg, fontWeight: '800', color: Colors.textPrimary },
  modalClose: { color: Colors.textMuted, fontSize: 18 },
  catOption: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  catOptionActive: { borderBottomColor: Colors.primaryBorder },
  catOptionText: { fontSize: Font.md, color: Colors.textSecondary },
  catOptionTextActive: { color: Colors.primary, fontWeight: '700' },
  catCheck: { color: Colors.primary, fontSize: Font.md },
});