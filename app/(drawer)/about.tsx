import React from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import * as Linking from "expo-linking";

export default function AboutScreen() {
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* BAŞLIK VE LOGO BÖLÜMÜ */}
      <Animated.View
        entering={FadeInDown.delay(100)}
        style={styles.headerContainer}
      >
        <View style={styles.logoCircle}>
          <Ionicons name="school" size={50} color="white" />
        </View>
        <Text style={styles.appName}>Okul+</Text>
        <Text style={styles.versionText}>Sürüm 1.0.0</Text>
      </Animated.View>

      {/* AMACI VE HEDEFLERİ */}
      <Animated.View entering={FadeInUp.delay(200)} style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="rocket-outline" size={24} color="#007AFF" />
          <Text style={styles.cardTitle}>Projenin Amacı ve Hedefleri</Text>
        </View>
        <Text style={styles.cardText}>
          Bu uygulama, eğitim kurumlarındaki öğretmenlerin branş, nöbet, rol ve
          kişisel bilgilerinin tek bir merkezden güvenli bir şekilde
          yönetilmesini sağlamak amacıyla Anıl Bilgehan YÜZGEÇ tarafından
          geliştirilmiştir. Yalnızca yetkili yöneticiler tarafından veri girişi
          yapılabilen bu sistem, okul içi koordinasyonu maksimum seviyeye
          çıkarmayı hedefler.
        </Text>
      </Animated.View>

      {/* VİZEDEN SONRAKİ EKLENTİLER */}
      <Animated.View entering={FadeInUp.delay(300)} style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="layers-outline" size={24} color="#34C759" />
          <Text style={styles.cardTitle}>Entegre Edilen Teknolojiler</Text>
        </View>
        <Text style={styles.cardSubText}>
          Bu proje vizeden sonraki tüm konuları içermektedir:
        </Text>

        <View style={styles.featureItem}>
          <Ionicons name="checkmark-circle" size={20} color="#34C759" />
          <Text style={styles.featureText}>
            <Text style={styles.bold}>Harita & Konum:</Text> expo-location ile
            canlı adres çözümleme.
          </Text>
        </View>

        <View style={styles.featureItem}>
          <Ionicons name="checkmark-circle" size={20} color="#34C759" />
          <Text style={styles.featureText}>
            <Text style={styles.bold}>Bildirimler:</Text> expo-notifications ile
            yeni kayıt uyarıları.
          </Text>
        </View>

        <View style={styles.featureItem}>
          <Ionicons name="checkmark-circle" size={20} color="#34C759" />
          <Text style={styles.featureText}>
            <Text style={styles.bold}>Cihaz Sensörleri:</Text> İvmeölçer
            (Sallama), Ağ, Batarya ve Parlaklık kontrolü.
          </Text>
        </View>

        <View style={styles.featureItem}>
          <Ionicons name="checkmark-circle" size={20} color="#34C759" />
          <Text style={styles.featureText}>
            <Text style={styles.bold}>Unit Test (Vitest):</Text> %63.63 Test
            Kapsamı (Coverage) ile test edilmiş algoritmalar.
          </Text>
        </View>

        <View style={styles.featureItem}>
          <Ionicons name="checkmark-circle" size={20} color="#34C759" />
          <Text style={styles.featureText}>
            <Text style={styles.bold}>i18n & Erişilebilirlik:</Text> Çift dil
            (TR/EN) desteği ve TalkBack uyumlu butonlar.
          </Text>
        </View>

        <View style={styles.featureItem}>
          <Ionicons name="checkmark-circle" size={20} color="#34C759" />
          <Text style={styles.featureText}>
            <Text style={styles.bold}>Animasyon & Jestler:</Text> Reanimated ile
            Swipe (Kaydırarak silme) ve geçiş efektleri.
          </Text>
        </View>
      </Animated.View>

      {/* GELİŞTİRİCİ BİLGİSİ */}
      <Animated.View
        entering={FadeInUp.delay(400)}
        style={[styles.card, { marginBottom: 40 }]}
      >
        <View style={styles.cardHeader}>
          <Ionicons name="code-slash-outline" size={24} color="#FF9500" />
          <Text style={styles.cardTitle}>Geliştirici</Text>
        </View>
        <Text style={styles.cardText}>
          Bu proje, Anıl Bilgehan YÜZGEÇ modern React Native (Expo) mimarisi
          kullanılarak, kullanıcı deneyimi (UX) ve temiz kod (Clean Code)
          prensipleri göz önünde bulundurularak geliştirilmiştir.
        </Text>
      </Animated.View>

      <Pressable
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: "#F2F2F7",
          padding: 16,
          borderRadius: 12,
          marginVertical: 10,
          marginBottom: 40,
        }}
        onPress={() =>
          Linking.openURL(
            "https://sites.google.com/view/okul-plus-privacy/home",
          )
        }
      >
        <Ionicons name="shield-checkmark" size={24} color="#007AFF" />
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
  container: { flex: 1, backgroundColor: "#f0f2f5", padding: 15 },
  headerContainer: { alignItems: "center", marginVertical: 20 },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#007AFF",
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  appName: { fontSize: 24, fontWeight: "bold", color: "#333", marginTop: 15 },
  versionText: { fontSize: 14, color: "#666", marginTop: 5 },
  card: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 15,
    marginBottom: 15,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginLeft: 10,
  },
  cardSubText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 15,
    fontStyle: "italic",
  },
  cardText: { fontSize: 15, color: "#444", lineHeight: 22 },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    paddingRight: 10,
  },
  featureText: {
    fontSize: 14,
    color: "#333",
    marginLeft: 10,
    flex: 1,
    lineHeight: 20,
  },
  bold: { fontWeight: "bold", color: "#000" },
});
