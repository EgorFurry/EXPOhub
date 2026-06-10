import { Tabs } from 'expo-router';
import { ColorValue, StyleSheet } from 'react-native';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';
import { Colors } from '../../styles/theme';

type IconProps = { color: ColorValue };

const c = (color: ColorValue): string =>
  typeof color === 'string' ? color : String(color);

function IconHome({ color }: IconProps) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path d="M3 10.5L12 3l9 7.5V20a1 1 0 01-1 1H5a1 1 0 01-1-1v-9.5z" stroke={c(color)} strokeWidth={1.7} strokeLinejoin="round" />
      <Path d="M9 21V12h6v9" stroke={c(color)} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function IconMap({ color }: IconProps) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path d="M9 4L3 7v13l6-3 6 3 6-3V4l-6 3-6-3z" stroke={c(color)} strokeWidth={1.7} strokeLinejoin="round" />
      <Line x1="9" y1="4" x2="9" y2="17" stroke={c(color)} strokeWidth={1.7} />
      <Line x1="15" y1="7" x2="15" y2="20" stroke={c(color)} strokeWidth={1.7} />
    </Svg>
  );
}

function IconAnalytics({ color }: IconProps) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="12" width="4" height="9" rx="1" stroke={c(color)} strokeWidth={1.7} />
      <Rect x="10" y="7" width="4" height="14" rx="1" stroke={c(color)} strokeWidth={1.7} />
      <Rect x="17" y="3" width="4" height="18" rx="1" stroke={c(color)} strokeWidth={1.7} />
    </Svg>
  );
}

function IconProfile({ color }: IconProps) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="8" r="4" stroke={c(color)} strokeWidth={1.7} />
      <Path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke={c(color)} strokeWidth={1.7} strokeLinecap="round" />
    </Svg>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: Colors.tabActive,
        tabBarInactiveTintColor: Colors.tabInactive,
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Главная',
          tabBarIcon: ({ color }) => <IconHome color={color} />,
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: 'Карта',
          tabBarIcon: ({ color }) => <IconMap color={color} />,
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: 'Итоги',
          tabBarIcon: ({ color }) => <IconAnalytics color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Профиль',
          tabBarIcon: ({ color }) => <IconProfile color={color} />,
        }}
      />
      <Tabs.Screen
        name="ticket"
        options={{ href: null }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.tabBar,
    borderTopColor: Colors.border,
    borderTopWidth: 1,
    paddingBottom: 8,
    height: 60,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
});
