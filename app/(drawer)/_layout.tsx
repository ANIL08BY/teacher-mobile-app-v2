import { Drawer } from "expo-router/drawer";
import { Pressable, Alert, DeviceEventEmitter } from "react-native"; // 🔥 DeviceEventEmitter eklendi
import { useAuth } from "../../context/AuthContext";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import i18n from "../../utils/i18n";
import React, { useState, useEffect } from "react"; // 🔥 React hookları eklendi
import AsyncStorage from "@react-native-async-storage/async-storage"; // 🔥 AsyncStorage eklendi

export default function DrawerLayout() {
  const { logout, user } = useAuth();
  const router = useRouter();

  // 🔥 Drawer'ı hissettirmeden baştan çizdirmek için bir anahtar (key) oluşturuyoruz
  const [drawerKey, setDrawerKey] = useState(0);

  useEffect(() => {
    // 1. Uygulama ilk açıldığında kaydedilmiş dili bul ve uygula
    const loadSavedLanguage = async () => {
      const savedLang = await AsyncStorage.getItem("appLanguage");
      if (savedLang && savedLang !== i18n.locale) {
        i18n.locale = savedLang;
        setDrawerKey((prev) => prev + 1);
      }
    };
    loadSavedLanguage();

    // 2. Ayarlar sayfasından gelen "Dil Değişti" sinyalini dinle
    const subscription = DeviceEventEmitter.addListener(
      "languageChanged",
      (newLang) => {
        i18n.locale = newLang;
        // Sinyal gelince state'i değiştiriyoruz. Bu da aşağıdaki <Drawer> etiketinin key'ini değiştirip onu İngilizce baştan kuruyor!
        setDrawerKey((prev) => prev + 1);
      },
    );

    return () => subscription.remove();
  }, []);

  // Yetki Kontrolü
  const isTopManagement =
    user &&
    ["Müdür", "Müdür Baş Yardımcısı", "Müdür Yardımcısı"].includes(user.role);

  const handleLogout = () => {
    Alert.alert(i18n.t("logoutTitle"), i18n.t("logoutMsg"), [
      { text: i18n.t("cancelBtn"), style: "cancel" },
      {
        text: i18n.t("logoutBtn"),
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/(auth)/login");
        },
      },
    ]);
  };

  return (
    <Drawer
      key={`drawer-${drawerKey}`} // 🔥 İŞTE SİHİR BURADA: Key değiştiği an React Native tüm menüyü sıfırdan çizer.
      initialRouteName="index"
      screenOptions={{
        headerTintColor: "#007AFF",
        headerRight: () => (
          <Pressable
            onPress={handleLogout}
            style={{ marginRight: 15, padding: 5 }}
          >
            <Ionicons name="log-out-outline" size={28} color="#FF3B30" />
          </Pressable>
        ),
      }}
    >
      {/* ÖZET EKRANI */}
      <Drawer.Screen
        name="index"
        options={{
          title: i18n.t("menuSummary"),
          drawerIcon: ({ color }) => (
            <Ionicons name="grid-outline" size={24} color={color} />
          ),
        }}
      />

      {/* ANA SAYFA */}
      <Drawer.Screen
        name="(dashboard)"
        options={{
          title: i18n.t("menuHomeTitle"),
          drawerLabel: i18n.t("menuHomeLabel"),
          drawerIcon: ({ color }) => (
            <Ionicons name="home-outline" size={22} color={color} />
          ),
        }}
      />

      {/* PROFİL */}
      <Drawer.Screen
        name="profile"
        options={{
          title: i18n.t("menuProfile"),
          drawerIcon: ({ color }) => (
            <Ionicons name="person-outline" size={22} color={color} />
          ),
        }}
      />

      {/* HAFTALIK PROGRAMLAR */}
      <Drawer.Screen
        name="schedule"
        options={{
          title: i18n.t("menuScheduleTitle"),
          drawerLabel: i18n.t("menuScheduleLabel"),
          drawerIcon: ({ color, size }) => (
            <Ionicons name="time-outline" size={size} color={color} />
          ),
        }}
      />

      {/* TAKVİM */}
      <Drawer.Screen
        name="calendar"
        options={{
          title: i18n.t("menuCalendarTitle"),
          drawerLabel: i18n.t("menuCalendarLabel"),
          drawerIcon: ({ color, size }) => (
            <Ionicons name="calendar-outline" size={size} color={color} />
          ),
        }}
      />

      {/* BELGELER */}
      <Drawer.Screen
        name="documents"
        options={{
          title: i18n.t("menuDocumentsTitle"),
          drawerLabel: i18n.t("menuDocumentsLabel"),
          drawerIcon: ({ color, size }) => (
            <Ionicons name="folder-open-outline" size={size} color={color} />
          ),
        }}
      />

      {/* DUYURU PANOSU */}
      <Drawer.Screen
        name="announcements"
        options={{
          title: i18n.t("menuAnnouncementsTitle"),
          drawerLabel: i18n.t("menuAnnouncementsLabel"),
          drawerIcon: ({ color }) => (
            <Ionicons name="megaphone-outline" size={22} color={color} />
          ),
        }}
      />

      {/* DUYURU YAYINLA (Sadece Yönetim) */}
      <Drawer.Screen
        name="add-announcement"
        options={{
          title: i18n.t("menuAddAnnouncementTitle"),
          drawerLabel: i18n.t("menuAddAnnouncementLabel"),
          drawerItemStyle: { display: isTopManagement ? "flex" : "none" },
          drawerIcon: ({ color }) => (
            <Ionicons name="create-outline" size={22} color={color} />
          ),
        }}
      />

      {/* ANKETLER */}
      <Drawer.Screen
        name="polls"
        options={{
          title: i18n.t("menuPollsTitle"),
          drawerLabel: i18n.t("menuPollsLabel"),
          drawerIcon: ({ color, size }) => (
            <Ionicons name="pie-chart-outline" size={size} color={color} />
          ),
        }}
      />

      {/* İZİN İŞLEMLERİ */}
      <Drawer.Screen
        name="leave-requests"
        options={{
          title: i18n.t("menuLeaveTitle"),
          drawerLabel: i18n.t("menuLeaveLabel"),
          drawerIcon: ({ color, size }) => (
            <Ionicons name="calendar-clear-outline" size={size} color={color} />
          ),
        }}
      />

      {/* SINAV PLANLAMA */}
      <Drawer.Screen
        name="exams"
        options={{
          title: i18n.t("menuExamsTitle"),
          drawerLabel: i18n.t("menuExamsLabel"),
          drawerIcon: ({ color, size }) => (
            <Ionicons name="sparkles" size={size} color={color} />
          ),
        }}
      />

      {/* ZÜMRE BAŞKANI SEÇİMİ */}
      <Drawer.Screen
        name="department-head"
        options={{
          title: i18n.t("menuDeptHeadTitle"),
          drawerLabel: i18n.t("menuDeptHeadLabel"),
          drawerIcon: ({ color, size }) => (
            <Ionicons name="ribbon" size={size} color={color} />
          ),
        }}
      />

      {/* TOPLANTI & KARARLAR */}
      <Drawer.Screen
        name="meetings"
        options={{
          title: i18n.t("menuMeetingsTitle"),
          drawerLabel: i18n.t("menuMeetingsLabel"),
          drawerIcon: ({ color, size }) => (
            <Ionicons name="document-text-outline" size={size} color={color} />
          ),
        }}
      />

      {/* YARDIM */}
      <Drawer.Screen
        name="helpdesk"
        options={{
          title: i18n.t("menuHelpdeskTitle"),
          drawerLabel: i18n.t("menuHelpdeskLabel"),
          drawerIcon: ({ color, size }) => (
            <Ionicons name="construct-outline" size={size} color={color} />
          ),
        }}
      />

      {/* CİHAZ SENSÖRLERİ */}
      <Drawer.Screen
        name="sensors"
        options={{
          title: i18n.t("menuSensors"),
          drawerIcon: ({ color, size }) => (
            <Ionicons name="hardware-chip-outline" size={size} color={color} />
          ),
        }}
      />

      {/* NÖBET TAKİP & GÜVENLİK (SENSÖRLER) */}
      <Drawer.Screen
        name="duty-tracking"
        options={{
          title: i18n.t("menuDutyTitle"),
          drawerLabel: i18n.t("menuDutyLabel"),
          drawerIcon: ({ color, size }) => (
            <Ionicons
              name="shield-checkmark-outline"
              size={size}
              color={color}
            />
          ),
        }}
      />

      {/* SİSTEM AYARLARI (Sadece Yönetim) */}
      <Drawer.Screen
        name="settings"
        options={{
          title: i18n.t("settingsTitle"),
          drawerItemStyle: { display: isTopManagement ? "flex" : "none" },
          drawerIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size} color={color} />
          ),
        }}
      />

      {/* HAKKINDA */}
      <Drawer.Screen
        name="about"
        options={{
          title: i18n.t("menuAbout"),
          drawerIcon: ({ color }) => (
            <Ionicons
              name="information-circle-outline"
              size={22}
              color={color}
            />
          ),
        }}
      />
    </Drawer>
  );
}
