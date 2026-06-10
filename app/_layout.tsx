import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="auth" />
      <Stack.Screen name="visitor" />
      <Stack.Screen name="exhibitor" />
      <Stack.Screen name="register-exhibitor" />
      <Stack.Screen name="exhibition/[id]" />
      <Stack.Screen name="booth/[id]" />
      <Stack.Screen name="product/[id]" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="edit-product/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="add-product" options={{ headerShown: false }} />
    </Stack>
  );
}