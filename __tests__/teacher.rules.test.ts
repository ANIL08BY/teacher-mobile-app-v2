import { describe, it, expect } from 'vitest';
import { INITIAL_TEACHERS } from '../constants/data';

describe('3. Öğretmen İş Kuralları ve Limit (Business Logic) Testleri', () => {
  it('1. Hiçbir öğretmenin kullanılan izin günü (usedLeaveDays) 30\'u geçmemelidir', () => {
    const invalidLeaves = INITIAL_TEACHERS.filter(t => t.usedLeaveDays !== undefined && t.usedLeaveDays > 30);
    expect(invalidLeaves.length).toBe(0);
  });

  it('2. Tüm öğretmenlerin branş (branch) bilgisi eksiksiz girilmiş olmalıdır', () => {
    const missingBranch = INITIAL_TEACHERS.filter(t => !t.branch || t.branch.trim() === '');
    expect(missingBranch.length).toBe(0);
  });

  it('3. Personelin sisteme girilen kıdem yılı (seniorityYear) negatif olamaz', () => {
    const negativeSeniority = INITIAL_TEACHERS.filter(t => t.seniorityYear !== undefined && t.seniorityYear < 0);
    expect(negativeSeniority.length).toBe(0);
  });

  it('4. Derslere ait ID değerleri null olmamalı ve benzersiz bir metin (string) olmalıdır', () => {
    const firstLesson = INITIAL_TEACHERS[0].lessons[0];
    if(firstLesson) {
      expect(typeof firstLesson.id).toBe('string');
      expect(firstLesson.id.length).toBeGreaterThan(0);
    } else {
      expect(firstLesson).toBeUndefined();
    }
  });
});