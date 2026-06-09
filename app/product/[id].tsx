import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors, Font } from '../../styles/theme';

export default function ProductDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => router.back()} style={styles.back}>
        <Text style={styles.backText}>← Назад</Text>
      </TouchableOpacity>
      <Text style={styles.title}>Товар</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: 20, paddingTop: 60 },
  back: { marginBottom: 20 },
  backText: { color: Colors.textMuted, fontSize: Font.sm },
  title: { color: Colors.textPrimary, fontSize: Font.xl, fontWeight: '800' },
});