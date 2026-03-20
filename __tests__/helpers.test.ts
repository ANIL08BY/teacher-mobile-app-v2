import { describe, it, expect } from 'vitest';
import { generateInitials, validatePhoneNumber } from '../utils/helpers';

describe('Yardımcı Fonksiyon (Helpers) Testleri', () => {
  
  it('1. İsim ve soyisimden doğru baş harfleri büyük harfle üretmelidir', () => {
    expect(generateInitials('Mustafa', 'Kemal')).toBe('MK');
    expect(generateInitials('ali', 'veli')).toBe('AV');
  });

  it('2. İsim veya soyisim eksikse "??" dönmelidir', () => {
    expect(generateInitials('', '')).toBe('??');
  });

  it('3. Telefon numarası 10 haneden büyükse geçerli sayılmalıdır', () => {
    expect(validatePhoneNumber('05554443322')).toBe(true);
  });

  it('4. Telefon numarası eksik veya kısaysa geçersiz sayılmalıdır', () => {
    expect(validatePhoneNumber('123')).toBe(false);
    expect(validatePhoneNumber('')).toBe(false);
  });
});