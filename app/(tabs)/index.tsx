import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '../../styles/theme';

export default function Home() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Главная</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },
  text: { color: Colors.textPrimary, fontSize: 20 },
});