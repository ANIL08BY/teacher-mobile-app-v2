import { Teacher } from '../constants/types';
// İsteğe bağlı: Gerçek bir (Gemini vs.) API anahtarı eklenebilir.
// Boş bırakırsanız sistem "Demo" çalışır ve hata vermeden matematiksel adil dağıtım yapar.
const GEMINI_API_KEY = ""; 

export const generateFairDutySchedule = async (teachers: Teacher[]): Promise<{ id: string, newDuty: string }[]> => {
  // Sadece Öğretmen ve Müdür Yardımcılarını nöbet listesine dahil et
  const eligibleTeachers = teachers.filter(t => t.role === 'Öğretmen' || t.role === 'Müdür Yardımcısı');

  if (eligibleTeachers.length === 0) return [];

  // 1. GERÇEK GEMINI API ENTEGRASYONU (Eğer Key Girilmişse)
  if (GEMINI_API_KEY) {
    try {
      const prompt = `Aşağıdaki öğretmen listesine Pazartesi'den Cuma'ya kadar (Bahçe, Zemin Kat, 1. Kat, 2. Kat, 3. Kat) olacak şekilde adil bir nöbet programı hazırla. Sadece şu JSON formatında cevap ver: [{"id": "öğretmen_id", "newDuty": "Pazartesi - Bahçe"}]. Liste: ${JSON.stringify(eligibleTeachers.map(t => ({ id: t.id, name: t.name, branch: t.branch })))}`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });

      const data = await response.json();
      const textResponse = data.candidates[0].content.parts[0].text;
      const cleanJson = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleanJson);
    } catch (error) {
      console.warn("Gemini API Hatası, Demo algoritmaya geçiliyor...", error);
    }
  }

  // Demo Algoritma
  return new Promise((resolve) => {
    setTimeout(() => {
      const days = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'];
      const locations = ['Bahçe', 'Zemin Kat', '1. Kat', '2. Kat', '3. Kat'];
      const assignments: { id: string, newDuty: string }[] = [];

      let dayIdx = 0;
      let locIdx = 0;

      // Öğretmenleri rastgele karıştır (Yapay zeka adil dağıtım simülasyonu)
      const shuffled = [...eligibleTeachers].sort(() => Math.random() - 0.5);

      shuffled.forEach(t => {
        assignments.push({ id: t.id, newDuty: `${days[dayIdx]} - ${locations[locIdx]}` });
        locIdx++;
        if (locIdx >= locations.length) {
          locIdx = 0;
          dayIdx++;
          if (dayIdx >= days.length) dayIdx = 0;
        }
      });

      resolve(assignments);
    }, 2500); // 2.5 saniye yapay zeka düşünme animasyonu (Kullanıcı deneyimi için)
  });
};

export const generateExamScheduleAI = async (teachers: Teacher[], examList: string[]): Promise<any[]> => {
  const eligibleTeachers = teachers.filter(t => t.role === 'Öğretmen' || t.role === 'Müdür Yardımcısı');
  if (eligibleTeachers.length === 0 || examList.length === 0) return [];

  // 1. GERÇEK GEMINI API ENTEGRASYONU
  if (GEMINI_API_KEY) {
    try {
      const prompt = `Sen uzman bir okul koordinatörüsün. Sana vereceğim sınav listesini ve öğretmen havuzunu kullanarak adil bir sınav gözetmenlik takvimi oluştur.
      
      PLANLANACAK SINAVLAR: ${examList.join(', ')}
      
      ÖĞRETMEN HAVUZU: ${JSON.stringify(eligibleTeachers.map(t => ({ name: t.name, branch: t.branch })))}
      
      KURALLAR:
      1. Her sınava sadece 1 gözetmen ata.
      2. Bir öğretmeni kendi branşıyla ilgili bir sınava KESİNLİKLE gözetmen yapma (Kopya riskine karşı).
      3. Gözetmenlik görevlerini öğretmenler arasında adil dağıt.
      4. Sınavları Pazartesi-Cuma aralığına ve 09:00 veya 11:00 saatlerine dağıt.
      
      ÇIKTI FORMATI: Sadece JSON formatında dizi ver. Başka hiçbir metin yazma:
      [{"id": "1", "examName": "9. Sınıf Matematik", "date": "Pazartesi", "time": "09:00", "invigilator": "Ahmet Hoca"}]`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });

      const data = await response.json();
      const textResponse = data.candidates[0].content.parts[0].text;
      const cleanJson = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleanJson);
    } catch (error) {
      console.warn("Gemini Sınav API Hatası, Demo algoritmaya geçiliyor...", error);
    }
  }

  // 2. DEMO ALGORİTMA (API Key yoksa veya internet koparsa çalışır)
  return new Promise((resolve) => {
    setTimeout(() => {
      const days = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'];
      const times = ['09:00', '11:00'];
      const assignments: any[] = [];
      
      // Öğretmenleri rastgele karıştır (Adil dağıtım simülasyonu)
      const shuffled = [...eligibleTeachers].sort(() => Math.random() - 0.5);

      examList.forEach((exam, index) => {
        assignments.push({
          id: String(index + 1),
          examName: exam,
          date: days[index % 5],
          time: times[index % 2],
          invigilator: shuffled.length > 0 ? shuffled[index % shuffled.length].name : 'Atanamadı'
        });
      });

      resolve(assignments);
    }, 2500); // 2.5 saniye AI düşünme efekti
  });
};

export const selectDepartmentHeadAI = async (teachers: Teacher[], branch: string): Promise<{ selectedTeacher: string, reason: string } | null> => {
  // Sadece o branşın öğretmenlerini filtrele
  const branchTeachers = teachers.filter(t => t.branch === branch);

  if (branchTeachers.length === 0) return null;
  if (branchTeachers.length === 1) {
    return { 
      selectedTeacher: branchTeachers[0].name, 
      reason: "Bu branşta başka öğretmen bulunmadığı için mevcut tek aday otomatik olarak Zümre Başkanı olarak atanmıştır." 
    };
  }

  // 1. GERÇEK GEMINI API ENTEGRASYONU
  if (GEMINI_API_KEY) {
    try {
      const prompt = `Sen tecrübeli ve adil bir okul müdürüsün. Aşağıdaki ${branch} branşı öğretmenleri arasından Zümre Başkanı seçeceksin.
      
      KRİTERLER: 
      1. Kariyer basamaklarına dikkat et: Başöğretmen > Uzman Öğretmen > Öğretmen.
      2. Kıdem yılı (tecrübe) ne kadar yüksekse liderlik vasfı o kadar fazladır.
      3. Gerekçeyi yazarken öğretmenin unvanını ve kıdem yılını överek resmi ve motive edici bir dil kullan.

      ADAYLAR: ${JSON.stringify(branchTeachers.map(t => ({ isim: t.name, unvan: t.title || 'Öğretmen', kidemYili: t.seniorityYear || 0 })))}

      ÇIKTI FORMATI: Sadece JSON formatında cevap ver. Başka hiçbir metin yazma:
      {"selectedTeacher": "Ahmet Hoca", "reason": "Sayın Ahmet Hoca, 15 yıllık mesleki tecrübesi ve Uzman Öğretmen unvanıyla zümresine liderlik edecek en uygun aday olarak belirlenmiştir."}`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });

      const data = await response.json();
      const textResponse = data.candidates[0].content.parts[0].text;
      const cleanJson = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleanJson);
    } catch (error) {
      console.warn("Gemini Zümre API Hatası, Demo algoritmaya geçiliyor...", error);
    }
  }

  // 2. DEMO ALGORİTMA (API Key yoksa, en yüksek kıdemliyi veya unvanlıyı matematiksel olarak seçer)
  return new Promise((resolve) => {
    setTimeout(() => {
      // Puanlama sistemi simülasyonu (Başöğretmen: 20p, Uzman: 10p, Her kıdem yılı: 1p)
      const scoredTeachers = branchTeachers.map(t => {
        let score = t.seniorityYear || 0;
        if (t.title === 'Başöğretmen') score += 20;
        else if (t.title === 'Uzman Öğretmen') score += 10;
        return { ...t, score };
      });

      // En yüksek puanlıyı bul
      const winner = scoredTeachers.sort((a, b) => b.score - a.score)[0];

      resolve({
        selectedTeacher: winner.name,
        reason: `${winner.name}, ${winner.title || 'Öğretmen'} unvanı ve ${winner.seniorityYear || 0} yıllık tecrübesi göz önüne alınarak sistem algoritması tarafından en uygun lider aday olarak belirlenmiştir.`
      });
    }, 2500); // 2.5 saniye AI düşünme efekti
  });
};