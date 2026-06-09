import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mmqtclxekelvjxtiehvt.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1tcXRjbHhla2Vsdmp4dGllaHZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzNTU4NzQsImV4cCI6MjA5NDkzMTg3NH0.xwbgx4hZXP-DBhZ5-aDrZCpFEEsfaRCFK630kIbY6bs';

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});