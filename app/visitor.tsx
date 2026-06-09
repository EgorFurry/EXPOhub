import { useRouter } from 'expo-router';
import { useEffect } from 'react';

export default function Visitor() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/(tabs)');
  }, []);

  return null;
}