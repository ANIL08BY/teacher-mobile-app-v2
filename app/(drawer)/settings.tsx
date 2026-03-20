import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  ScrollView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTeachers } from "../../context/TeacherContext";
import { useAuth } from "../../context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import i18n from "../../utils/i18n";
import { useNavigation } from "expo-router";
import * as Linking from "expo-linking";
import Toast from "react-native-toast-message"; // 🔥 TOAST IMPORT EDİLDİ

export default function SettingsScreen() {
  const { resetDatabase, clearCache, teachers } = useTeachers();
  const { user } = useAuth();
  const navigation = useNavigation();

  const isTopManagement =
    user &&
    ["Müdür", "Müdür Baş Yardımcısı", "Müdür Yardımcısı"].includes(user.role);

  const [lastUpdate, setLastUpdate] = useState<string | null>("...");
  const [theme, setTheme] = useState<string | null>("light");
  const [notifications, setNotifications] = useState<boolean | null>(true);
  const [locale, setLocale] = useState(i18n.locale);

  // Çeviriyi her zaman mevcut state diline zorlama
  const t = (key: string) => i18n.t(key, { locale });

  useEffect(() => {
    navigation.setOptions({ title: t("settingsTitle") });
  }, [locale, navigation]);

  const loadSettingsData = async () => {
    try {
      const values = await AsyncStorage.multiGet([
        "@lastUpdate",
        "@appSettings",
      ]);
      const updateTime = values[0][1];
      const appSettings = values[1][1];

      if (updateTime) {
        const date = new Date(updateTime);
        setLastUpdate(
          new Intl.DateTimeFormat(locale, {
            dateStyle: "short",
            timeStyle: "short",
          }).format(date),
        );
      } else {
        setLastUpdate("-");
      }

      if (appSettings) {
        const parsedSettings = JSON.parse(appSettings);
        setTheme(parsedSettings.theme);
        setNotifications(parsedSettings.notifications);
      }
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    if (isTopManagement) loadSettingsData();
  }, [teachers, isTopManagement, locale]);

  if (!isTopManagement) {
    return (
      <View style={styles.unauthorizedContainer}>
        <Ionicons name="shield-half-outline" size={80} color="#FF3B30" />
        <Text style={styles.unauthorizedTitle}>{t("unauthorizedTitle")}</Text>
        <Text style={styles.unauthorizedText}>{t("unauthorizedText")}</Text>
      </View>
    );
  }

  // İŞLEM FONKSİYONLARI VE TOAST BİLDİRİMLERİ 🔥
  const toggleLanguage = () => {
    const newLang = locale === "tr" ? "en" : "tr";
    i18n.locale = newLang;
    setLocale(newLang);

    Toast.show({
      type: "success",
      text1: "Dil Değiştirildi / Language Changed",
      text2:
        newLang === "tr"
          ? "Uygulama dili Türkçe yapıldı."
          : "App language set to English.",
    });
  };

  const handleToggleNotifications = async () => {
    const newState = !notifications;
    await AsyncStorage.mergeItem(
      "@appSettings",
      JSON.stringify({ notifications: newState }),
    );
    await loadSettingsData();

    Toast.show({
      type: "info",
      text1: "Bildirim Ayarları",
      text2: newState
        ? "Bildirimler başarıyla açıldı 🔔"
        : "Bildirimler kapatıldı 🔕",
    });
  };

  const handleUpdateTheme = async () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    await AsyncStorage.mergeItem(
      "@appSettings",
      JSON.stringify({ theme: newTheme }),
    );
    await loadSettingsData();

    Toast.show({
      type: "success",
      text1: "Tema Güncellendi",
      text2:
        newTheme === "dark"
          ? "Karanlık (Dark) moda geçildi 🌙"
          : "Aydınlık (Light) moda geçildi ☀️",
    });
  };

  const handleClearCache = async () => {
    await clearCache();
    await loadSettingsData();

    Toast.show({
      type: "success",
      text1: "🧹 Önbellek Temizlendi",
      text2: "Uygulama önbelleği başarıyla boşaltıldı ve hızlandırıldı.",
    });
  };

  const handleReset = async () => {
    // Kritik işlem olduğu için Alert ile onay almaya devam ediyoruz
    Alert.alert(t("resetBtn"), t("a11yResetHint"), [
      { text: t("cancelBtn"), style: "cancel" },
      {
        text: t("okBtn"),
        style: "destructive",
        onPress: async () => {
          await resetDatabase();
          await loadSettingsData();

          // İşlem bittikten sonra Toast ile bildiriyoruz
          Toast.show({
            type: "error", // Yıkıcı bir işlem olduğu için kırmızı (error) renk mantıklıdır
            text1: "⚠️ Veritabanı Sıfırlandı",
            text2: "Sistemdeki tüm kayıtlar kalıcı olarak silindi.",
            visibilityTime: 3500,
          });
        },
      },
    ]);
  };

  const formattedDate = new Intl.DateTimeFormat(locale, {
    dateStyle: "full",
    timeStyle: "medium",
  }).format(new Date());
  const isDark = theme === "dark";

  return (
    <ScrollView style={[styles.container, isDark && styles.containerDark]}>
      <Text style={[styles.headerTitle, isDark && styles.textDark]}>
        {t("settingsTitle")}
      </Text>

      <View style={[styles.infoCard, isDark && styles.infoCardDark]}>
        <View style={styles.infoRow}>
          <Ionicons name="calendar-outline" size={24} color="#007AFF" />
          <View style={styles.infoTextContainer}>
            <Text style={[styles.infoLabel, isDark && styles.labelDark]}>
              {t("dateLabel")}
            </Text>
            <Text
              style={[
                styles.infoValue,
                isDark && styles.textDark,
                { color: "#007AFF" },
              ]}
            >
              {formattedDate}
            </Text>
          </View>
        </View>

        <View style={[styles.divider, isDark && styles.dividerDark]} />

        <View style={styles.infoRow}>
          <Ionicons name="time-outline" size={24} color="#007AFF" />
          <View style={styles.infoTextContainer}>
            <Text style={[styles.infoLabel, isDark && styles.labelDark]}>
              {t("lastUpdateLabel")}
            </Text>
            <Text style={[styles.infoValue, isDark && styles.textDark]}>
              {lastUpdate}
            </Text>
          </View>
        </View>

        <View style={[styles.divider, isDark && styles.dividerDark]} />

        <View style={styles.infoRow}>
          <Ionicons name="color-palette-outline" size={24} color="#007AFF" />
          <View style={styles.infoTextContainer}>
            <Text style={[styles.infoLabel, isDark && styles.labelDark]}>
              {t("themeLabel")}
            </Text>
            <Text
              style={[
                styles.infoValue,
                isDark ? { color: "#00FF7F" } : { color: "purple" },
              ]}
            >
              {isDark ? t("themeDark") : t("themeLight")}
            </Text>
          </View>
        </View>

        <View style={[styles.divider, isDark && styles.dividerDark]} />

        <View style={styles.infoRow}>
          <Ionicons name="notifications-outline" size={24} color="#007AFF" />
          <View style={styles.infoTextContainer}>
            <Text style={[styles.infoLabel, isDark && styles.labelDark]}>
              {t("notificationLabel")}
            </Text>
            <Text style={[styles.infoValue, isDark && styles.textDark]}>
              {notifications ? t("statusOn") : t("statusOff")}
            </Text>
          </View>
        </View>
      </View>

      <Pressable
        style={[styles.actionBtn, { backgroundColor: "#8E8E93" }]}
        onPress={toggleLanguage}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={t("languageBtn")}
        accessibilityHint={t("a11yLangHint")}
      >
        <Ionicons
          name="language"
          size={20}
          color="white"
          style={styles.btnIcon}
        />
        <Text style={styles.btnText}>{t("languageBtn")}</Text>
      </Pressable>

      <Pressable
        style={[
          styles.actionBtn,
          { backgroundColor: notifications ? "#34C759" : "#8E8E93" },
        ]}
        onPress={handleToggleNotifications}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={
          notifications ? t("notificationBtnOff") : t("notificationBtnOn")
        }
        accessibilityHint={t("a11yNotifHint")}
      >
        <Ionicons
          name={notifications ? "notifications" : "notifications-off"}
          size={20}
          color="white"
          style={styles.btnIcon}
        />
        <Text style={styles.btnText}>
          {notifications ? t("notificationBtnOff") : t("notificationBtnOn")}
        </Text>
      </Pressable>

      <Pressable
        style={[styles.actionBtn, isDark && { backgroundColor: "#555" }]}
        onPress={handleUpdateTheme}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={t("themeBtn")}
        accessibilityHint={t("a11yThemeHint")}
      >
        <Ionicons
          name={isDark ? "sunny" : "moon"}
          size={20}
          color="white"
          style={styles.btnIcon}
        />
        <Text style={styles.btnText}>{t("themeBtn")}</Text>
      </Pressable>

      <Pressable
        style={[styles.actionBtn, { backgroundColor: "#FF9500" }]}
        onPress={handleClearCache}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={t("cacheBtn")}
        accessibilityHint={t("a11yCacheHint")}
      >
        <Ionicons
          name="trash-bin-outline"
          size={20}
          color="white"
          style={styles.btnIcon}
        />
        <Text style={styles.btnText}>{t("cacheBtn")}</Text>
      </Pressable>

      <Pressable
        style={[
          styles.actionBtn,
          { backgroundColor: "#FF3B30", marginBottom: 40 },
        ]}
        onPress={handleReset}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={t("resetBtn")}
        accessibilityHint={t("a11yResetHint")}
      >
        <Ionicons
          name="warning-outline"
          size={20}
          color="white"
          style={styles.btnIcon}
        />
        <Text style={styles.btnText}>{t("resetBtn")}</Text>
      </Pressable>

      <Pressable
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: "#F2F2F7",
          padding: 16,
          borderRadius: 12,
          marginVertical: 10,
        }}
        onPress={() =>
          Linking.openURL(
            "https://www.termsfeed.com/live/ornek-gizlilik-politikasi",
          )
        }
      >
        <Ionicons name="shield-checkmark" size={24} color="#1613e0" />
        <Text
          style={{
            marginLeft: 12,
            fontSize: 16,
            fontWeight: "600",
            color: "#1C1C1E",
          }}
        >
          Gizlilik Politikası
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 15, backgroundColor: "#f0f2f5" },
  headerTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 15,
  },
  infoCard: {
    backgroundColor: "white",
    padding: 15,
    borderRadius: 12,
    elevation: 2,
    marginBottom: 20,
  },
  infoRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10 },
  infoTextContainer: { marginLeft: 15, flex: 1 },
  infoLabel: { fontSize: 14, color: "#666", fontWeight: "bold" },
  infoValue: { fontSize: 16, color: "#333", marginTop: 4 },
  divider: { height: 1, backgroundColor: "#eee", marginVertical: 5 },
  actionBtn: {
    flexDirection: "row",
    backgroundColor: "#007AFF",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 15,
    elevation: 2,
  },
  btnIcon: { marginRight: 10 },
  btnText: { color: "white", fontWeight: "bold", fontSize: 16 },

  unauthorizedContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#f0f2f5",
  },
  unauthorizedTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginTop: 15,
    marginBottom: 10,
  },
  unauthorizedText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    lineHeight: 24,
  },

  containerDark: { backgroundColor: "#121212" },
  infoCardDark: { backgroundColor: "#1e1e1e" },
  textDark: { color: "#ffffff" },
  labelDark: { color: "#aaaaaa" },
  dividerDark: { backgroundColor: "#333" },
});
