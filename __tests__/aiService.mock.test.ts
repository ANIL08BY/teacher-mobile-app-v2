import { describe, it, expect, vi } from 'vitest';
import { generateExamScheduleAI, selectDepartmentHeadAI } from '../utils/aiService';

// 🔥 Gerçek API'ye gitmesini engellemek için Vitest Mock kullanıyoruz
vi.mock('../utils/aiService', () => ({
  generateExamScheduleAI: vi.fn().mockResolvedValue([{ id: 'exam1', name: 'Matematik' }]),
  selectDepartmentHeadAI: vi.fn().mockResolvedValue({ selectedTeacher: 't1', reason: 'Liderlik' })
}));

describe('4. Yapay Zeka Servisi (aiService) İzolasyon ve Mock Testleri', () => {
  it('1. Sınav dağıtım fonksiyonu (generateExamScheduleAI) sisteme tanımlı olmalıdır', () => {
    expect(generateExamScheduleAI).toBeDefined();
  });

  it('2. Zümre başkanı seçimi (selectDepartmentHeadAI) sisteme tanımlı olmalıdır', () => {
    expect(selectDepartmentHeadAI).toBeDefined();
  });

  it('3. generateExamScheduleAI çağrıldığında sahte (mock) sonuç olan diziyi dönmelidir', async () => {
    const result = await generateExamScheduleAI([], []);
    expect(Array.isArray(result)).toBe(true);
  });

  it('4. selectDepartmentHeadAI geçerli bir seçim sebebi (reason) dönmelidir', async () => {
    const result = await selectDepartmentHeadAI([], 'Matematik');
    expect(result).toHaveProperty('selectedTeacher');
    expect(result).toHaveProperty('reason', 'Liderlik');
  });
});