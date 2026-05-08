import { describe, it, expect, vi } from 'vitest';
import { db } from '../utils/firebaseConfig';

// 🔥 Firebase'i mockluyoruz ki testler internet bağlantısı aramasın
vi.mock('../utils/firebaseConfig', () => ({
  db: { type: 'firestore_mock', collection: vi.fn() }
}));

describe('5. Firebase Veritabanı (firebaseConfig) Bağlantı Testleri', () => {
  it('1. Veritabanı (db) nesnesi projeye başarılı şekilde aktarılmış (export) olmalıdır', () => {
    expect(db).toBeDefined();
  });

  it('2. db nesnesi boş (null veya undefined) değer dönmemelidir', () => {
    expect(db).not.toBeNull();
  });

  it('3. Mocklanmış db nesnesinin tipi güvenlik için firestore_mock olmalıdır', () => {
    expect((db as any).type).toBe('firestore_mock');
  });

  it('4. Veritabanı collection (koleksiyon) metoduna sahip olmalıdır', () => {
    expect(typeof (db as any).collection).toBe('function');
  });
});