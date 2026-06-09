import { registerRootComponent } from 'expo';
import { ExpoRoot } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, StyleSheet, Text, View } from 'react-native';

const { width, height } = Dimensions.get('window');

function SplashScreen({ onFinish }: { onFinish: () => void }) {
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const glowScale   = useRef(new Animated.Value(0.4)).current;
  const logoScale   = useRef(new Animated.Value(0.6)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const tagOpacity  = useRef(new Animated.Value(0)).current;
  const exitOpacity = useRef(new Animated.Value(1)).current;
  const dot1Opacity = useRef(new Animated.Value(0.2)).current;
  const dot2Opacity = useRef(new Animated.Value(0.2)).current;
  const dot3Opacity = useRef(new Animated.Value(0.2)).current;
  const dot1Scale   = useRef(new Animated.Value(1)).current;
  const dot2Scale   = useRef(new Animated.Value(1)).current;
  const dot3Scale   = useRef(new Animated.Value(1)).current;

  const animateDot = (opacity: Animated.Value, scale: Animated.Value) =>
    Animated.parallel([
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.2, duration: 250, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.spring(scale, { toValue: 1.6, tension: 120, friction: 6, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, tension: 120, friction: 6, useNativeDriver: true }),
      ]),
    ]);

  useEffect(() => {
    const dotLoop = () => {
      Animated.sequence([
        animateDot(dot1Opacity, dot1Scale),
        animateDot(dot2Opacity, dot2Scale),
        animateDot(dot3Opacity, dot3Scale),
        Animated.delay(300),
      ]).start(({ finished }) => { if (finished) dotLoop(); });
    };

    Animated.sequence([
      Animated.parallel([
        Animated.timing(glowOpacity, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.spring(glowScale, { toValue: 1, tension: 25, friction: 10, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.spring(logoScale, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
        Animated.timing(logoOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]),
      Animated.timing(tagOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.delay(200),
    ]).start(() => {
      dotLoop();
      setTimeout(() => {
        Animated.timing(exitOpacity, {
          toValue: 0, duration: 600, useNativeDriver: true,
        }).start(() => onFinish());
      }, 2500);
    });
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: exitOpacity }]}>
      <Animated.View style={[styles.glow1, { opacity: glowOpacity, transform: [{ scale: glowScale }] }]} />
      <Animated.View style={[styles.glow2, { opacity: glowOpacity, transform: [{ scale: glowScale }] }]} />
      <Animated.View style={[styles.glow3, { opacity: glowOpacity, transform: [{ scale: glowScale }] }]} />
      <Animated.View style={[styles.glow4, { opacity: glowOpacity, transform: [{ scale: glowScale }] }]} />
      <Animated.View style={[styles.logoWrap, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}>
        <View style={styles.logoRow}>
          <Text style={styles.logoRed}>Expo</Text>
          <Text style={styles.logoWhite}>Hub</Text>
        </View>
        <Animated.Text style={[styles.tagline, { opacity: tagOpacity }]}>
          EXHIBITION PLATFORM
        </Animated.Text>
      </Animated.View>
      <Animated.View style={[styles.dotsRow, { opacity: tagOpacity }]}>
        <Animated.View style={[styles.dot, { opacity: dot1Opacity, transform: [{ scale: dot1Scale }] }]} />
        <Animated.View style={[styles.dot, { opacity: dot2Opacity, transform: [{ scale: dot2Scale }] }]} />
        <Animated.View style={[styles.dot, { opacity: dot3Opacity, transform: [{ scale: dot3Scale }] }]} />
      </Animated.View>
    </Animated.View>
  );
}

function AppRoot() {
  const ctx = require.context('./app');
  return <ExpoRoot context={ctx} />;
}

function Main() {
  const [isReady, setIsReady] = useState(false);
  if (!isReady) return <SplashScreen onFinish={() => setIsReady(true)} />;
  return <AppRoot />;
}

registerRootComponent(Main);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0B12', alignItems: 'center', justifyContent: 'center' },
  glow1: { position: 'absolute', width: width * 0.9, height: height * 0.7, borderRadius: width * 0.6, backgroundColor: 'rgba(196,18,48,0.07)' },
  glow2: { position: 'absolute', width: width * 0.75, height: height * 0.58, borderRadius: width * 0.5, backgroundColor: 'rgba(196,18,48,0.10)' },
  glow3: { position: 'absolute', width: width * 0.58, height: height * 0.44, borderRadius: width * 0.4, backgroundColor: 'rgba(196,18,48,0.14)' },
  glow4: { position: 'absolute', width: width * 0.38, height: height * 0.28, borderRadius: width * 0.3, backgroundColor: 'rgba(196,18,48,0.20)' },
  logoWrap: { alignItems: 'center', gap: 12, zIndex: 10 },
  logoRow: { flexDirection: 'row', alignItems: 'baseline' },
  logoRed: { fontSize: 56, fontWeight: '900', color: '#C41230', letterSpacing: -2 },
  logoWhite: { fontSize: 56, fontWeight: '900', color: '#FFFFFF', letterSpacing: -2 },
  tagline: { fontSize: 11, color: 'rgba(255,255,255,0.35)', letterSpacing: 4, fontWeight: '600' },
  dotsRow: { flexDirection: 'row', gap: 10, marginTop: 60, zIndex: 10, alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#C41230', elevation: 3 },
});