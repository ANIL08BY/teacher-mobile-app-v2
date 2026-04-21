export interface Lesson {
  id: string;
  day: string;
  time: string;
  className: string;
  branch: string;
  curriculumProgress?: number; // Müfredat İlerleme Yüzdesi (0-100)
}

export interface Teacher {
  id: string;
  name: string;
  surname: string;
  age?: number;
  gender?: string;
  tcNo?: string;
  maritalStatus?: string;
  branch: string;
  address: string;
  phone: string;
  duty: string;
  role?: string;
  avatar?: string;
  lessons: Lesson[];
  title?: string; // 'Öğretmen', 'Uzman Öğretmen', 'Başöğretmen'
  seniorityYear?: number; // Kıdem yılı (Örn: 15)
  isDepartmentHead?: boolean; // Zümre başkanı mı?
  club?: string; // Danışmanlık yaptığı kulüp
  usedLeaveDays?: number; // Kullanılan izin günü (Maks 30)
  inspectorScore?: number; // 100 üzerinden puan
  inspectorNotes?: string; // Müfettişin yazdığı görüş notu
  awards?: string; // Alınan Başarı ve Üstün Başarı Belgeleri
  penalties?: string; // Uyarı, Kınama vb. Disiplin Cezaları
  spouseInstitution?: string; // Eş Durumu (Eşinin Çalıştığı Kurum/İl)
  childrenCount?: number; // Çocuk Yardımı İçin Çocuk Sayısı
  isOnMaternityLeave?: boolean; // Kadın Personel İçin Doğum İzni Durumu
  stepCount?: number; // Günlük Nöbet Adım Sayısı
  lastEmergency?: string; // Son Acil Durum Sinyali (Tarih/Saat)
}