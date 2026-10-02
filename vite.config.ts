import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/',
  build: {
    target: 'es2015', // iOS 구형/신형 Safari 완벽 호환 보장
  },
  envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
  define: {
    'process.env.NEXT_PUBLIC_SUPABASE_URL': JSON.stringify(process.env.NEXT_PUBLIC_SUPABASE_URL || ''),
    'process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY': JSON.stringify(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''),
  },
  server: {
    port: 3000,
    open: false,
  }
});
