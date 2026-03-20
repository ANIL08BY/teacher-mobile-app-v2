import { I18n } from 'i18n-js';
import * as Localization from 'expo-localization';

const translations = {
  en: {
    settingsTitle: 'System Settings',
    languageBtn: 'Switch to Turkish 🇹🇷',
    themeBtn: 'Toggle Theme',
    cacheBtn: 'Clear Cache Only',
    resetBtn: 'Reset Whole System',
    dateLabel: 'Current Date:',
    lastUpdateLabel: 'Last Update:',
    themeLabel: 'Active Theme:',
    notificationLabel: 'Notifications:',
    notificationBtnOn: 'Turn On Notifications',
    notificationBtnOff: 'Turn Off Notifications',
    
    // YENİ EKLENEN SABİT METİNLER
    themeDark: 'Dark Mode',
    themeLight: 'Light Mode',
    statusOn: 'ON',
    statusOff: 'OFF',
    cancelBtn: 'Cancel',
    okBtn: 'OK',

    unauthorizedTitle: 'Unauthorized Access',
    unauthorizedText: 'Only Administrators can view and modify system settings and the database.',
    
    a11yLangHint: 'Changes the application language between English and Turkish.',
    a11yThemeHint: 'Changes the background color to dark or light mode.',
    a11yCacheHint: 'Deletes only temporary data, teachers will not be deleted.',
    a11yResetHint: 'Warning! Deletes all teachers and resets the entire database.',
    a11yNotifHint: 'Toggles system notifications on or off.'
  },
  tr: {
    settingsTitle: 'Sistem Ayarları',
    languageBtn: 'İngilizceye Çevir 🇬🇧',
    themeBtn: 'Temayı Değiştir',
    cacheBtn: 'Sadece Önbelleği Sil',
    resetBtn: 'Tüm Sistemi Sıfırla',
    dateLabel: 'Geçerli Tarih:',
    lastUpdateLabel: 'Son Güncellenme:',
    themeLabel: 'Aktif Tema:',
    notificationLabel: 'Bildirim Ayarı:',
    notificationBtnOn: 'Bildirimleri Aç',
    notificationBtnOff: 'Bildirimleri Kapat',
    
    // YENİ EKLENEN SABİT METİNLER
    themeDark: 'Karanlık Mod',
    themeLight: 'Aydınlık Mod',
    statusOn: 'AÇIK',
    statusOff: 'KAPALI',
    cancelBtn: 'İptal',
    okBtn: 'Tamam',

    unauthorizedTitle: 'Yetkisiz Erişim',
    unauthorizedText: 'Sistem ayarlarını ve veritabanını yalnızca Yöneticiler görüntüleyebilir ve değiştirebilir.',
    
    a11yLangHint: 'Uygulama dilini Türkçe ve İngilizce arasında değiştirir.',
    a11yThemeHint: 'Arka plan rengini karanlık veya aydınlık mod olarak değiştirir.',
    a11yCacheHint: 'Sadece geçici verileri siler, kayıtlı öğretmenlere dokunmaz.',
    a11yResetHint: 'Dikkat! Tüm öğretmenleri siler ve veritabanını tamamen sıfırlar.',
    a11yNotifHint: 'Sistem bildirimlerini açar veya kapatır.'
  }
};

const i18n = new I18n(translations);
const deviceLang = Localization.getLocales()[0]?.languageCode ?? 'en';
i18n.locale = deviceLang.includes('tr') ? 'tr' : 'en';
i18n.enableFallback = true;

export default i18n;