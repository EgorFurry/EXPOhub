import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Modal,
  Platform, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View
} from 'react-native';
import { GlowBackground } from '../../components/shared/GlowBackground';
import { supabase } from '../../lib/supabase';
import { Colors, Font, Radius } from '../../styles/theme';

const CATEGORIES = ['Мебель', 'Освещение', 'Декор', 'Текстиль', 'Кухня', 'Спальня', 'Офис', 'Другое'];

export default function EditProduct() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCatPicker, setShowCatPicker] = useState(false);
  const [form, setForm] = useState({
    name: '', price: '', category: '',
    characteristics: '', logistics: '', note: '', rating: 0
  });
  const [toast, setToast] = useState<{ text: string; type: 'ok' | 'err' } | null>(null);

  useEffect(() => { fetchProduct(); }, [id]);

  async function fetchProduct() {
    const { data } = await supabase.from('visitor_products').select('*').eq('id', id).single();
    if (data) setForm({
      name: data.name || '',
      price: data.price || '',
      category: data.category || '',
      characteristics: data.characteristics || '',
      logistics: data.logistics || '',
      note: data.note || '',
      rating: data.rating || 0,
    });
    setLoading(false);
  }

  function showToast(text: string, type: 'ok' | 'err') {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function save() {
    if (!form.name.trim()) { showToast('Введите название', 'err'); return; }
    setSaving(true);
    const { error } = await supabase.from('visitor_products').update({
      name: form.name, price: form.price, category: form.category,
      characteristics: form.characteristics, logistics: form.logistics, note: form.note,
    }).eq('id', id);
    if (error) showToast('Ошибка сохранения', 'err');
    else { showToast('Сохранено!', 'ok'); setTimeout(() => router.back(), 800); }
    setSaving(false);
  }

  async function deleteProduct() {
    await supabase.from('visitor_products').delete().eq('id', id);
    router.back();
    router.back();
  }

  if (loading) return <View style={styles.loader}><ActivityIndicator color={Colors.primary} size="large" /></View>;

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
        <Text style={styles.headerTitle}>Редактировать товар</Text>
        <TouchableOpacity onPress={deleteProduct} style={styles.deleteBtn}>
          <Text style={styles.deleteBtnText}>🗑️</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.body}>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>НАЗВАНИЕ ТОВАРА *</Text>
          <TextInput style={styles.fieldInput} placeholder="Диван Loft..." placeholderTextColor={Colors.textMuted} value={form.name} onChangeText={v => setForm(p => ({ ...p, name: v }))} />
        </View>

        <View style={[styles.field, { marginTop: 10 }]}>
          <Text style={styles.fieldLabel}>ЦЕНА</Text>
          <TextInput style={styles.fieldInput} placeholder="1 200 €..." placeholderTextColor={Colors.textMuted} value={form.price} onChangeText={v => setForm(p => ({ ...p, price: v }))} />
        </View>

        <View style={[styles.field, { marginTop: 10 }]}>
          <Text style={styles.fieldLabel}>КАТЕГОРИЯ</Text>
          <TouchableOpacity style={styles.picker} onPress={() => setShowCatPicker(true)}>
            <Text style={form.category ? styles.pickerValue : styles.pickerPlaceholder}>
              {form.category || 'Выберите категорию...'}
            </Text>
            <Text style={styles.pickerArrow}>▼</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.field, { marginTop: 10 }]}>
          <Text style={styles.fieldLabel}>РЕЙТИНГ</Text>
          <View style={styles.stars}>
            {[1, 2, 3, 4, 5].map(star => (
              <TouchableOpacity key={star} onPress={() => setForm(p => ({ ...p, rating: star }))}>
                <Text style={[styles.star, form.rating >= star && styles.starActive]}>★</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={[styles.field, { marginTop: 10 }]}>
          <Text style={styles.fieldLabel}>ХАРАКТЕРИСТИКИ</Text>
          <TextInput style={[styles.fieldInput, styles.multiline]} placeholder="Размер, материал, цвет..." placeholderTextColor={Colors.textMuted} value={form.characteristics} onChangeText={v => setForm(p => ({ ...p, characteristics: v }))} multiline />
        </View>

        <View style={[styles.field, { marginTop: 10 }]}>
          <Text style={styles.fieldLabel}>ЛОГИСТИЧЕСКИЕ ПАРАМЕТРЫ</Text>
          <TextInput style={[styles.fieldInput, styles.multiline]} placeholder="Срок поставки, MOQ..." placeholderTextColor={Colors.textMuted} value={form.logistics} onChangeText={v => setForm(p => ({ ...p, logistics: v }))} multiline />
        </View>

        <View style={[styles.field, { marginTop: 10 }]}>
          <Text style={styles.fieldLabel}>КОММЕНТАРИЙ</Text>
          <TextInput style={[styles.fieldInput, styles.multiline]} placeholder="Впечатления, вопросы..." placeholderTextColor={Colors.textMuted} value={form.note} onChangeText={v => setForm(p => ({ ...p, note: v }))} multiline />
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, (saving || !form.name.trim()) && { opacity: 0.5 }]}
          onPress={save}
          disabled={saving || !form.name.trim()}
        >
          <Text style={styles.saveBtnText}>{saving ? 'Сохранение...' : '💾 Сохранить'}</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

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
  root: { flex: 1, backgroundColor: Colors.background },
  loader: { flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },
  toast: { position: 'absolute', top: 60, left: 20, right: 20, padding: 14, borderRadius: Radius.md, zIndex: 100 },
  toastOk: { backgroundColor: 'rgba(76,175,80,0.9)' },
  toastErr: { backgroundColor: 'rgba(196,18,48,0.9)' },
  toastText: { color: '#fff', fontSize: Font.sm, fontWeight: '600', textAlign: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16, backgroundColor: '#180010', borderBottomWidth: 1, borderBottomColor: Colors.border },
  back: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  backText: { color: '#fff', fontSize: 16 },
  headerTitle: { flex: 1, fontSize: Font.lg, fontWeight: '800', color: '#fff' },
  deleteBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(196,18,48,0.3)', alignItems: 'center', justifyContent: 'center' },
  deleteBtnText: { fontSize: 16 },
  body: { padding: 20 },
  field: { gap: 6 },
  fieldLabel: { fontSize: Font.xs, color: Colors.textMuted, fontWeight: '600', marginLeft: 2 },
  fieldInput: { backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.md, padding: 14, fontSize: Font.sm, color: Colors.textPrimary },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  picker: { backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.md, padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pickerValue: { fontSize: Font.sm, color: Colors.textPrimary },
  pickerPlaceholder: { fontSize: Font.sm, color: Colors.textMuted },
  pickerArrow: { fontSize: 10, color: Colors.textMuted },
  stars: { flexDirection: 'row', gap: 6 },
  star: { fontSize: 30, color: Colors.border },
  starActive: { color: Colors.primary },
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