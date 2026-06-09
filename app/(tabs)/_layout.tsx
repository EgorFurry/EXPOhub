import { Tabs } from 'expo-router';
import { StyleSheet, Text } from 'react-native';
import { Colors } from '../../styles/theme';
import { ColorValue } from 'react-native';

function TabIcon({ emoji, color }: { emoji: string; color: ColorValue }) {
  return <Text style={{ fontSize: 20, opacity: color === Colors.tabActive ? 1 : 0.5 }}>{emoji}</Text>;
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
          tabBarIcon: ({ color }) => <TabIcon emoji="🏠" color={color} />,
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: 'Карта',
          tabBarIcon: ({ color }) => <TabIcon emoji="🗺️" color={color} />,
        }}
      />
      <Tabs.Screen
        name="ticket"
        options={{
          title: 'Билет',
          tabBarIcon: ({ color }) => <TabIcon emoji="🎫" color={color} />,
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: 'Итоги',
          tabBarIcon: ({ color }) => <TabIcon emoji="📊" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Профиль',
          tabBarIcon: ({ color }) => <TabIcon emoji="👤" color={color} />,
        }}
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