import { Dimensions, StyleSheet, View } from 'react-native';

const { width, height } = Dimensions.get('window');

type Props = {
  intensity?: 'low' | 'medium' | 'high';
  position?: 'top-right' | 'top-left' | 'center';
};

export function GlowBackground({ intensity = 'medium', position = 'top-right' }: Props) {
  const opacity = {
    low:    { o1: 0.05, o2: 0.08, o3: 0.04 },
    medium: { o1: 0.08, o2: 0.12, o3: 0.06 },
    high:   { o1: 0.12, o2: 0.18, o3: 0.10 },
  }[intensity];

  const pos = {
    'top-right': { top: -width * 0.3, right: -width * 0.3 },
    'top-left':  { top: -width * 0.3, left: -width * 0.3 },
    'center':    { top: height * 0.2, left: width * 0.1 },
  }[position];

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={[styles.glow1, pos, { backgroundColor: `rgba(196, 18, 48, ${opacity.o1})` }]} />
      <View style={[styles.glow2, pos, { backgroundColor: `rgba(196, 18, 48, ${opacity.o2})` }]} />
      <View style={[styles.glow3, { backgroundColor: `rgba(196, 18, 48, ${opacity.o3})` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  glow1: {
    position: 'absolute',
    width: width * 0.9,
    height: width * 0.9,
    borderRadius: width * 0.45,
  },
  glow2: {
    position: 'absolute',
    width: width * 0.6,
    height: width * 0.6,
    borderRadius: width * 0.3,
  },
  glow3: {
    position: 'absolute',
    width: width * 0.4,
    height: width * 0.4,
    borderRadius: width * 0.2,
    bottom: -width * 0.2,
    left: -width * 0.1,
  },
});