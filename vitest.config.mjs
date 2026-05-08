import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      // Sadece %100 test ettiğimiz güvenli mantık dosyalarını taraması:
      include: [
        'constants/data.ts',
        'utils/helpers.ts',
      ],
    },
  },
});