import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Teacher } from '../constants/types';
import Toast from 'react-native-toast-message';

// -----------------------------------------------------------
// 1. PDF ÇIKTISI (Mevcut Nöbet Çizelgesi İşlemi)
// -----------------------------------------------------------
export const exportTeachersToPDF = async (teachers: Teacher[]) => {
  if (teachers.length === 0) {
    return Toast.show({
      type: 'error',
      text1: 'Eksik Veri',
      text2: 'Çıktısı alınacak personel bulunamadı.',
    });
  }

  const tableRows = teachers.map(t => `
    <tr>
      <td>${t.name} ${t.surname}</td>
      <td>${t.branch}</td>
      <td>${t.role}</td>
      <td><b>${t.duty || 'Nöbeti Yok'}</b></td>
      <td>${t.phone || 'Belirtilmedi'}</td>
    </tr>
  `).join('');

  const htmlContent = `
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 20px; color: #333; }
          .header { text-align: center; margin-bottom: 30px; padding-bottom: 10px; border-bottom: 2px solid #007AFF; }
          .title { font-size: 24px; font-weight: bold; color: #007AFF; margin: 0; }
          .subtitle { font-size: 14px; color: #666; margin-top: 5px; }
          table { width: 100%; border-collapse: collapse; font-size: 14px; }
          th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
          th { background-color: #007AFF; color: white; font-weight: bold; }
          tr:nth-child(even) { background-color: #f9f9f9; }
          .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #999; }
        </style>
      </head>
      <body>
        <div class="header">
          <p class="title">Öğretmen ve Nöbet Çizelgesi</p>
          <p class="subtitle">Bu belge sistem tarafından otomatik olarak oluşturulmuştur. Tarih: ${new Date().toLocaleDateString('tr-TR')}</p>
        </div>
        <table>
          <thead>
            <tr>
              <th>Ad Soyad</th>
              <th>Zümre</th>
              <th>Görev / Rol</th>
              <th>Nöbet Yeri ve Günü</th>
              <th>Telefon</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
        <div class="footer">
          Öğretmen Otomasyonu Mobil Uygulaması © ${new Date().getFullYear()}
        </div>
      </body>
    </html>
  `;

  try {
    const { uri } = await Print.printToFileAsync({ 
      html: htmlContent,
      base64: false
    });

    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(uri, { 
        mimeType: 'application/pdf', 
        dialogTitle: 'Nöbet Çizelgesini Paylaş', 
        UTI: 'com.adobe.pdf' 
      });
      
      Toast.show({
        type: 'success',
        text1: '📄 PDF Çıkarıldı',
        text2: 'Öğretmen listesi başarıyla oluşturuldu ve paylaşıldı.',
      });
    } else {
      Toast.show({
        type: 'error',
        text1: 'Paylaşım Hatası',
        text2: 'Cihazınızda paylaşım özelliği desteklenmiyor.',
      });
    }
  } catch (error) {
    Toast.show({
      type: 'error',
      text1: 'PDF Hatası',
      text2: 'PDF oluşturulurken bir sorun meydana geldi.',
    });
    console.error(error);
  }
};

// -----------------------------------------------------------
// 2. EXCEL / CSV ÇIKTISI (YENİ - Detaylı İK Çıktısı)
// -----------------------------------------------------------
export const exportTeachersToCSV = async (teachers: Teacher[]) => {
  if (teachers.length === 0) {
    return Toast.show({
      type: 'error',
      text1: 'Eksik Veri',
      text2: 'Dışa aktarılacak personel bulunamadı.',
    });
  }

  try {
    // 1. Sütun Başlıkları
    const headers = [
      "Ad", "Soyad", "TC Kimlik No", "Cinsiyet", "Medeni Hal", 
      "Eşinin Kurumu", "Çocuk Sayısı", "Doğum İzni", "Yaş", "Kıdem Yılı", 
      "Zümre", "Unvan", "Rol", "Nöbet Görevi", "Kulüp", "Kullanılan İzin", 
      "Telefon", "Adres"
    ];

    // 2. Satır Verilerini Çekme ve Formatlama
    const rows = teachers.map(t => {
      return [
        `"${t.name}"`, 
        `"${t.surname}"`,
        `"${t.tcNo || 'Belirtilmedi'}"`, // Sayı formatı bozulmasın diye metin yaptık
        `"${t.gender || '-'}"`,
        `"${t.maritalStatus || '-'}"`,
        `"${t.spouseInstitution || '-'}"`,
        `"${t.childrenCount || '0'}"`,
        `"${t.isOnMaternityLeave ? 'İzinde' : 'Aktif'}"`,
        `"${t.age || '-'}"`,
        `"${t.seniorityYear || '-'}"`,
        `"${t.branch}"`,
        `"${t.title || 'Öğretmen'}"`,
        `"${t.role || 'Öğretmen'}"`,
        `"${t.duty || 'Yok'}"`,
        `"${t.club || 'Yok'}"`,
        `"${t.usedLeaveDays || '0'}"`,
        `"${t.phone || '-'}"`,
        `"${(t.address || '-').replace(/"/g, '""')}"` // Adres içindeki tırnakları ve virgülleri Excel için güvenli hale getirdik
      ].join(",");
    });

    // 3. UTF-8 BOM Ekleyerek Excel'de Türkçe Karakterlerin Bozulmasını Önleme
    const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\n");

    // 4. Dosyayı Cihaza Kaydetme
    // TypeScript'in 'yok' dediği özellikleri 'any' üzerinden zorla tanıtıyoruz
    const fs: any = FileSystem; 
    const directory = fs.documentDirectory || fs.cacheDirectory;
    const fileUri = directory + "Personel_Listesi_Detayli.csv";

    // Fonksiyonu da aynı şekilde any üzerinden çağırıyoruz
    await fs.writeAsStringAsync(fileUri, csvContent, {
      encoding: "utf8",
    });

    // 5. Paylaşım Penceresini Açma
    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/csv',
        dialogTitle: 'Detaylı Personel Listesini (Excel) Paylaş',
        UTI: 'public.comma-separated-values-text'
      });

      Toast.show({
        type: 'success',
        text1: '📊 Excel Dosyası Hazır',
        text2: 'Detaylı personel listesi başarıyla oluşturuldu.',
      });
    } else {
      Toast.show({
        type: 'error',
        text1: 'Paylaşım Hatası',
        text2: 'Cihazınızda paylaşım özelliği desteklenmiyor.',
      });
    }
  } catch (error) {
    Toast.show({
      type: 'error',
      text1: 'Dışa Aktarma Hatası',
      text2: 'Excel/CSV dosyası oluşturulurken bir sorun yaşandı.',
    });
    console.error(error);
  }
};