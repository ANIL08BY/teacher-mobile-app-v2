import { describe, it, expect } from 'vitest';
import { INITIAL_TEACHERS } from '../constants/data'; 

describe('Veritabanı Başlangıç Verileri (INITIAL_TEACHERS) Testleri', () => {
  
  it('1. Başlangıç verisi kesinlikle bir dizi (array) olmalıdır', () => {
    expect(Array.isArray(INITIAL_TEACHERS)).toBe(true);
  });

  it('2. Sistemde en az 1 adet varsayılan öğretmen yüklü olmalıdır', () => {
    expect(INITIAL_TEACHERS.length).toBeGreaterThan(0);
  });

  it('3. Kayıtlı öğretmenlerin zorunlu alanları (id, name, role) eksiksiz olmalıdır', () => {
    const firstTeacher = INITIAL_TEACHERS[0];
    
    expect(firstTeacher).toHaveProperty('id');
    expect(firstTeacher).toHaveProperty('name');
    expect(firstTeacher).toHaveProperty('role');
    
    // İsim alanı boş bir string (metin) olmamalıdır
    expect(firstTeacher.name.length).toBeGreaterThan(0);
  });

  it('4. Öğretmenlerin başlangıçta ders (lessons) dizisi tanımlanmış olmalıdır', () => {
    const firstTeacher = INITIAL_TEACHERS[0];
    expect(Array.isArray(firstTeacher.lessons)).toBe(true);
  });
});