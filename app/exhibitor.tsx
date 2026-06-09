import { useRouter } from 'expo-router';
import { useEffect } from 'react';

export default function Exhibitor() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/(tabs)');
  }, []);

  return null;
}