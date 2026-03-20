import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'], // Hem terminalde % oranını gösterir hem de tıklanabilir web sayfası raporu verir
      // Klasör nerede olursa olsun içindeki .ts dosyalarını bul ve rapora kat! ve SADECE test ettiğimiz mantık klasörlerini rapora dahil et
      include: ['**/utils/**/*.ts', '**/constants/**/*.ts'], 
      exclude: ['**/__tests__/**'] // Test klasörünün kendisini hesaptan düş
    },
  },
});