import React, { useMemo, useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { useTeachers } from "../../context/TeacherContext";
import { useAuth } from "../../context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import TeacherCard from "../../components/TeacherCard";
import Animated, {
  FadeInDown,
  FadeInUp,
  FadeInRight,
  FadeOutLeft,
  Layout,
} from "react-native-reanimated";
import { Swipeable } from "react-native-gesture-handler";
import { generateFairDutySchedule } from "../../utils/aiService";
import * as Location from "expo-location";
import MapView, { Marker, Callout } from "react-native-maps";
import {
  exportTeachersToPDF,
  exportTeachersToCSV,
} from "../../utils/exportService";
import Toast from "react-native-toast-message";
import { registerForPushNotificationsAsync } from "../../utils/notificationService";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../utils/firebaseConfig";

export default function DashboardScreen() {
  // --- RESMİ TATİL HESAPLAMA MOTORU ---
  const staticHolidays = [
    { name: "Yılbaşı", date: "01-01" },
    { name: "23 Nisan Ulusal Egemenlik ve Çocuk Bayramı", date: "04-23" },
    { name: "1 Mayıs Emek ve Dayanışma Günü", date: "05-01" },
    { name: "19 Mayıs Atatürk'ü Anma ve Gençlik Bayramı", date: "05-19" },
    { name: "15 Temmuz Demokrasi ve Milli Birlik Günü", date: "07-15" },
    { name: "30 Ağustos Zafer Bayramı", date: "08-30" },
    { name: "29 Ekim Cumhuriyet Bayramı", date: "10-29" },
  ];

  // Dini bayramların 2026 ve 2027 kesinleşmiş tarihleri
  const dynamicHolidays = [
    {
      name: "Ramazan Bayramı Arifesi (Yarım Gün)",
      dates: ["2026-03-19", "2027-03-08"],
    },
    { name: "Ramazan Bayramı", dates: ["2026-03-20", "2027-03-09"] },
    {
      name: "Kurban Bayramı Arifesi (Yarım Gün)",
      dates: ["2026-05-26", "2027-05-15"],
    },
    { name: "Kurban Bayramı", dates: ["2026-05-27", "2027-05-16"] },
  ];

  const getNextHoliday = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Saat farklarını sıfırla ki günü tam hesaplasın
    const currentYear = today.getFullYear();
    let nextHoliday = null;
    let minDiff = Infinity;

    // 1. Sabit (Milli) Tatilleri Kontrol Et
    for (const holiday of staticHolidays) {
      let holidayDate = new Date(`${currentYear}-${holiday.date}`);
      if (holidayDate.getTime() < today.getTime()) {
        holidayDate = new Date(`${currentYear + 1}-${holiday.date}`);
      }
      const diffTime = holidayDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays >= 0 && diffDays < minDiff) {
        minDiff = diffDays;
        nextHoliday = { name: holiday.name, daysLeft: diffDays };
      }
    }

    // 2. Dinamik (Dini) Tatilleri Kontrol Et
    for (const holiday of dynamicHolidays) {
      for (const dateStr of holiday.dates) {
        const holidayDate = new Date(dateStr);
        const diffTime = holidayDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays >= 0 && diffDays < minDiff) {
          minDiff = diffDays;
          nextHoliday = { name: holiday.name, daysLeft: diffDays };
        }
      }
    }

    return nextHoliday;
  };

  const upcomingHoliday = getNextHoliday();

  const { teachers, deleteTeacher, updateTeacher } = useTeachers();
  const { user } = useAuth();
  const router = useRouter();

  const isTopManagement =
    user &&
    ["Müdür", "Müdür Baş Yardımcısı", "Müdür Yardımcısı"].includes(user.role);

  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isLocationLoading, setIsLocationLoading] = useState(false);

  const [liveMapVisible, setLiveMapVisible] = useState(false);
  const [myLocation, setMyLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [activeDutyMarkers, setActiveDutyMarkers] = useState<any[]>([]);

  const stats = useMemo(() => {
    const total = teachers.length;
    const days = [
      "Pazar",
      "Pazartesi",
      "Salı",
      "Çarşamba",
      "Perşembe",
      "Cuma",
      "Cumartesi",
    ];
    const todayStr = days[new Date().getDay()];
    const onDutyToday = teachers.filter((t) => {
      if (!t.duty) return false;
      const dutyDay = t.duty.split(" ")[0];
      return dutyDay === todayStr;
    }).length;
    const uniqueBranches = new Set(teachers.map((t) => t.branch)).size;
    const sickLeaveCount = teachers.filter(
      (t) => (t.usedLeaveDays || 0) > 30,
    ).length;
    // Müsait Personel Hesaplaması: Toplam personelden, o gün nöbetçi olanları ve raporlu olanları çıkarıyoruz.
    const availableStaff = total - onDutyToday - sickLeaveCount;
    return {
      total,
      onDutyToday,
      uniqueBranches,
      todayStr,
      sickLeaveCount,
      availableStaff,
    };
  }, [teachers]);

  const recentTeachers = useMemo(() => {
    return [...teachers].reverse().slice(0, 3);
  }, [teachers]);

  useEffect(() => {
    const setupNotifications = async () => {
      const userId = user?.id || (user as any)?.uid;

      if (userId) {
        try {
          const token = await registerForPushNotificationsAsync();
          if (token) {
            // 🔥 OTOMATİK KAYIT: Token'ı Firestore'daki kullanıcı dökümanına yazıyoruz
            const userRef = doc(db, "users", userId);
            await updateDoc(userRef, {
              pushToken: token,
              lastLogin: new Date().toISOString(), // İsteğe bağlı: Son giriş zamanı
            });
            console.log("Token Firestore'a başarıyla kaydedildi!");
          }
        } catch (error) {
          console.error("Token kaydedilirken hata oluştu:", error);
        }
      }
    };

    setupNotifications();
  }, [user]);

  const handleDelete = (id: string, name: string, surname: string) => {
    if (!isTopManagement)
      return Alert.alert(
        "Yetkisiz İşlem",
        "Personel silme yetkiniz bulunmamaktadır.",
      );
    Alert.alert(
      "Personeli Sil",
      `${name} ${surname} adlı personeli sistemden silmek istediğinize emin misiniz?`,
      [
        { text: "İptal", style: "cancel" },
        {
          text: "Evet, Sil",
          style: "destructive",
          onPress: () => {
            (deleteTeacher(id),
              Toast.show({
                type: "info",
                text1: "🗑️ Personel Silindi",
                text2: `${name} ${surname} sistemden kalıcı olarak kaldırıldı.`,
              }));
          },
        },
      ],
    );
  };

  const renderRightActions = (id: string, name: string, surname: string) => (
    <TouchableOpacity
      style={styles.deleteActionContainer}
      onPress={() => handleDelete(id, name, surname)}
    >
      <Ionicons name="trash-outline" size={28} color="white" />
      <Text style={styles.actionTextSide}>Sil</Text>
    </TouchableOpacity>
  );

  const renderLeftActions = (id: string) => (
    <TouchableOpacity
      style={styles.detailActionContainer}
      onPress={() => router.push(`/teacher-detail/${id}` as any)}
    >
      <Ionicons name="information-circle-outline" size={28} color="white" />
      <Text style={styles.actionTextSide}>Detay</Text>
    </TouchableOpacity>
  );

  const handleAIAssignment = async () => {
    if (teachers.length === 0)
      return Alert.alert("Hata", "Dağıtım yapılacak personel bulunamadı.");
    setIsAiLoading(true);
    try {
      const assignments = await generateFairDutySchedule(teachers);
      assignments.forEach((assignment) => {
        const targetTeacher = teachers.find((t) => t.id === assignment.id);
        if (targetTeacher) {
          updateTeacher({ ...targetTeacher, duty: assignment.newDuty });
        }
      });
      Toast.show({
        type: "success",
        text1: "✨ Yapay Zeka İşlemi Başarılı",
        text2: "Tüm personelin adil nöbet programı oluşturuldu.",
        visibilityTime: 4000,
      });
    } catch (error) {
      Alert.alert("Hata", "Dağıtım sırasında bir sorun oluştu.");
    } finally {
      setIsAiLoading(false);
    }
  };

  const startDuty = async () => {
    setIsLocationLoading(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Erişim Reddedildi",
          "Nöbet başlatmak için konum izni gereklidir.",
        );
        return;
      }
      let location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      // Öğretmen nöbeti başlattığında sisteme bildirimi (Simülasyon)
      Alert.alert(
        "📍 Nöbet Başladı",
        `Konumunuz başarıyla idareye iletildi.\nEnlem: ${location.coords.latitude.toFixed(4)}\nBoylam: ${location.coords.longitude.toFixed(4)}`,
      );
    } catch (error) {
      Alert.alert(
        "Hata",
        "Konumunuz alınamadı. Cihazınızın GPS ayarlarını kontrol edin.",
      );
    } finally {
      setIsLocationLoading(false);
    }
  };

  const openLiveDutyMap = async () => {
    setIsLocationLoading(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Erişim Reddedildi",
          "Haritayı açmak için konum izni gereklidir.",
        );
        return;
      }
      let location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const myLat = location.coords.latitude;
      const myLng = location.coords.longitude;
      setMyLocation({ lat: myLat, lng: myLng });

      // Bugün nöbeti olanları yöneticinin etrafında haritaya diziyoruz
      const days = [
        "Pazar",
        "Pazartesi",
        "Salı",
        "Çarşamba",
        "Perşembe",
        "Cuma",
        "Cumartesi",
      ];
      const todayStr = days[new Date().getDay()];
      const todayTeachers = teachers.filter(
        (t) => t.duty && t.duty.startsWith(todayStr),
      );

      const markers = todayTeachers.map((t, index) => {
        // Rastgele 100-200 metre etrafına dağıt
        const randomLatOffset = (Math.random() - 0.5) * 0.002;
        const randomLngOffset = (Math.random() - 0.5) * 0.002;
        return {
          id: t.id,
          name: `${t.name} ${t.surname}`,
          branch: t.branch,
          dutyArea: t.duty,
          lat: myLat + randomLatOffset,
          lng: myLng + randomLngOffset,
        };
      });

      setActiveDutyMarkers(markers);
      setLiveMapVisible(true);
    } catch (error) {
      Alert.alert("Hata", "Harita yüklenemedi. Lütfen GPS sensörünüzü açın.");
    } finally {
      setIsLocationLoading(false);
    }
  };

  // Profil Fotoğrafı (Eğer yüklemediyse varsayılan harf avatarı göster)
  const defaultAvatar = `https://ui-avatars.com/api/?name=${user?.name || "Kullanıcı"}&background=4F46E5&color=fff&size=200`;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* 1. TIKLANABİLİR PROFİL ALANI (YENİ) */}
      <Animated.View entering={FadeInDown.delay(50)}>
        <TouchableOpacity
          style={styles.profileHeader}
          activeOpacity={0.7}
          onPress={() => router.push("/profile")}
        >
          <Image
            source={{ uri: user?.avatar || defaultAvatar }}
            style={styles.profileImage}
          />
          <View style={styles.profileTextContainer}>
            <Text style={styles.welcomeText}>Hoş Geldiniz,</Text>
            <Text style={styles.profileName}>{user?.name || "Kullanıcı"}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>
                {user?.role || "Personel"}
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#9CA3AF" />
        </TouchableOpacity>
      </Animated.View>

      {/* 🌴 YAKLAŞAN RESMİ TATİL WIDGET'I */}
      {upcomingHoliday && (
        <Animated.View entering={FadeInDown.delay(100)}>
          <View
            style={{
              backgroundColor: "#f2ffee",
              padding: 16,
              borderRadius: 16,
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 20,
              borderWidth: 1,
              borderColor: "#ccfec7",
              elevation: 2,
            }}
          >
            <View
              style={{
                backgroundColor: "#30ec1b",
                padding: 12,
                borderRadius: 12,
                marginRight: 15,
              }}
            >
              <Ionicons name="calendar" size={28} color="white" />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 12,
                  color: "#2ae90d",
                  fontWeight: "bold",
                  marginBottom: 4,
                  letterSpacing: 1,
                }}
              >
                YAKLAŞAN RESMİ TATİL
              </Text>
              <Text
                style={{
                  fontSize: 16,
                  color: "#16e51d",
                  fontWeight: "900",
                  marginBottom: 4,
                }}
              >
                {upcomingHoliday.name}
              </Text>
              <Text
                style={{ fontSize: 14, color: "#20e919", fontWeight: "600" }}
              >
                ⏳{" "}
                {upcomingHoliday.daysLeft === 0
                  ? "Bugün!"
                  : `${upcomingHoliday.daysLeft} Gün Kaldı`}
              </Text>
            </View>
          </View>
        </Animated.View>
      )}

      {/* YAPAY ZEKA VE KONUM YÜKLENİYOR (MODAL) */}
      <Modal
        visible={isAiLoading || isLocationLoading}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.aiModalOverlay}>
          <View style={styles.aiModalContent}>
            {isLocationLoading ? (
              <Ionicons
                name="earth-outline"
                size={55}
                color="#007AFF"
                style={{ marginBottom: 15 }}
              />
            ) : (
              <Ionicons
                name="color-wand"
                size={55}
                color="#2755c8"
                style={{ marginBottom: 15 }}
              />
            )}
            <Text style={styles.aiModalTitle}>
              {isLocationLoading
                ? "Uydu Bağlantısı Kuruluyor"
                : "Yapay Zeka Çalışıyor"}
            </Text>
            <Text style={styles.aiModalDesc}>
              {isLocationLoading
                ? "Konum verileri çekiliyor, lütfen bekleyin..."
                : "Branşlar, yoğunluklar ve mevcut nöbetler analiz edilerek en adil dağıtım yapılıyor. Lütfen bekleyin..."}
            </Text>
            <ActivityIndicator
              size="large"
              color={isLocationLoading ? "#007AFF" : "#3a4db6"}
              style={{ marginTop: 25 }}
            />
          </View>
        </View>
      </Modal>

      {/* CANLI NÖBET HARİTASI (MODAL) */}
      <Modal visible={liveMapVisible} animationType="slide">
        <View style={{ flex: 1 }}>
          <Pressable
            style={styles.closeMapBtn}
            onPress={() => setLiveMapVisible(false)}
          >
            <Ionicons name="close" size={30} color="white" />
          </Pressable>

          {myLocation && (
            <MapView
              style={{ flex: 1 }}
              initialRegion={{
                latitude: myLocation.lat,
                longitude: myLocation.lng,
                latitudeDelta: 0.005,
                longitudeDelta: 0.005,
              }}
              showsUserLocation={true}
            >
              {activeDutyMarkers.map((marker) => (
                <Marker
                  key={marker.id}
                  coordinate={{ latitude: marker.lat, longitude: marker.lng }}
                >
                  <View style={styles.customMarker}>
                    <Ionicons name="person-circle" size={30} color="#FF3B30" />
                  </View>

                  <Callout tooltip={true}>
                    <View
                      style={[
                        styles.calloutView,
                        {
                          backgroundColor: "white",
                          borderRadius: 12,
                          padding: 12,
                          elevation: 5,
                          shadowColor: "#000",
                          shadowOpacity: 0.2,
                          shadowRadius: 5,
                          borderWidth: 1,
                          borderColor: "#eee",
                        },
                      ]}
                    >
                      <Text style={styles.calloutTitle}>{marker.name}</Text>
                      <Text style={styles.calloutText}>{marker.branch}</Text>
                      <Text style={styles.calloutDuty}>
                        📍 {marker.dutyArea}
                      </Text>
                    </View>
                  </Callout>
                </Marker>
              ))}
            </MapView>
          )}

          <View style={styles.mapInfoBox}>
            <Text style={styles.mapInfoTitle}>Canlı Nöbet Takibi</Text>
            <Text style={styles.mapInfoText}>
              Şu an okul ve çevresinde {activeDutyMarkers.length} adet nöbetçi
              personel aktif olarak görev yapmaktadır.
            </Text>
          </View>
        </View>
      </Modal>

      <View style={styles.statsGrid}>
        <Animated.View
          entering={FadeInUp.delay(200)}
          style={[
            styles.statCard,
            { borderBottomColor: "#007AFF", borderBottomWidth: 4 },
          ]}
        >
          <Ionicons name="people" size={28} color="#007AFF" />
          <Text style={styles.statValue}>{stats.total}</Text>
          <Text style={styles.statLabel}>Toplam Personel</Text>
        </Animated.View>

        <Animated.View
          entering={FadeInUp.delay(300)}
          style={[
            styles.statCard,
            { borderBottomColor: "#FF9500", borderBottomWidth: 4 },
          ]}
        >
          <Ionicons name="shield-checkmark" size={28} color="#FF9500" />
          <Text style={styles.statValue}>{stats.onDutyToday}</Text>
          <Text style={styles.statLabel}>Bugün Nöbetçi</Text>
        </Animated.View>

        <Animated.View
          entering={FadeInUp.delay(400)}
          style={[
            styles.statCard,
            { borderBottomColor: "#34C759", borderBottomWidth: 4 },
          ]}
        >
          <Ionicons name="library" size={28} color="#34C759" />
          <Text style={styles.statValue}>{stats.uniqueBranches}</Text>
          <Text style={styles.statLabel}>Farklı Zümre</Text>
        </Animated.View>

        <Animated.View
          entering={FadeInUp.delay(500)}
          style={[
            styles.statCard,
            { borderBottomColor: "#4b5ef3", borderBottomWidth: 4 },
          ]}
        >
          <Ionicons name="calendar" size={28} color="#3964e4" />
          <Text style={styles.statValue}>{stats.todayStr}</Text>
          <Text style={styles.statLabel}>Güncel Gün</Text>
        </Animated.View>

        {/* RAPORLU PERSONEL KARTI */}
        <Animated.View
          entering={FadeInUp.delay(600)}
          style={[
            styles.statCard,
            { borderBottomColor: "#EF4444", borderBottomWidth: 4 },
          ]}
        >
          <Ionicons name="medkit" size={28} color="#EF4444" />
          <Text style={styles.statValue}>{stats.sickLeaveCount}</Text>
          <Text style={styles.statLabel}>Raporlu Personel</Text>
        </Animated.View>

        {/* MÜSAİT PERSONEL KARTI */}
        <Animated.View
          entering={FadeInUp.delay(700)}
          style={[
            styles.statCard,
            { borderBottomColor: "#10B981", borderBottomWidth: 4 }, // Pozitif bir durum olduğu için Yeşil
          ]}
        >
          <Ionicons name="checkmark-circle" size={28} color="#10B981" />
          <Text style={styles.statValue}>{stats.availableStaff}</Text>
          <Text style={styles.statLabel}>Müsait Personel</Text>
        </Animated.View>
      </View>

      <Animated.Text
        entering={FadeInRight.delay(600)}
        style={styles.sectionTitle}
      >
        Hızlı İşlemler
      </Animated.Text>

      {/* DİNAMİK AKSİYON BUTONLARI */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.actionRowContainer}
      >
        <View style={styles.actionRow}>
          <Pressable
            style={styles.actionBtn}
            onPress={() => router.push("/(dashboard)/list" as any)}
          >
            <View style={[styles.iconCircle, { backgroundColor: "#E6F2FF" }]}>
              <Ionicons name="list" size={24} color="#007AFF" />
            </View>
            <Text style={styles.actionText}>Tüm Liste</Text>
          </Pressable>

          {/* ZÜMRE BAŞKANI BUTONU */}
          <Pressable
            style={styles.actionBtn}
            onPress={() => router.push("/department-head" as any)}
          >
            <View style={[styles.iconCircle, { backgroundColor: "#a0ec94" }]}>
              <Ionicons name="ribbon" size={24} color="#1cbc19" />
            </View>
            <Text style={styles.actionText}>Zümre Başkanı Seç</Text>
          </Pressable>

          {/* TOPLANTI KARARLARI BUTONU */}
          <Pressable
            style={styles.actionBtn}
            onPress={() => router.push("/meetings" as any)}
          >
            <View style={[styles.iconCircle, { backgroundColor: "#FFE4E6" }]}>
              <Ionicons name="briefcase" size={24} color="#E11D48" />
            </View>
            <Text style={styles.actionText}>Toplantılar</Text>
          </Pressable>

          {/* 🔥 YENİ: EXCEL İNDİR BUTONU */}
          <Pressable
            style={styles.actionBtn}
            onPress={() => exportTeachersToCSV(teachers)}
          >
            <View style={[styles.iconCircle, { backgroundColor: "#D1FAE5" }]}>
              <Ionicons name="stats-chart" size={24} color="#059669" />
            </View>
            <Text style={styles.actionText}>Excel İndir</Text>
          </Pressable>

          <Pressable
            style={styles.actionBtn}
            onPress={() => exportTeachersToPDF(teachers)}
          >
            <View style={[styles.iconCircle, { backgroundColor: "#E6F9E6" }]}>
              <Ionicons name="document-text" size={24} color="#34C759" />
            </View>
            <Text style={styles.actionText}>PDF İndir</Text>
          </Pressable>

          <Pressable
            style={styles.actionBtn}
            onPress={() => router.push("/exams" as any)}
          >
            <View style={[styles.iconCircle, { backgroundColor: "#fffae8" }]}>
              <Ionicons name="sparkles" size={24} color="#ea840f" />
            </View>
            <Text style={styles.actionText}>Sınav Planla</Text>
          </Pressable>

          {isTopManagement ? (
            <>
              <Pressable
                style={styles.actionBtn}
                onPress={() => router.push("/(dashboard)/add" as any)}
              >
                <View
                  style={[styles.iconCircle, { backgroundColor: "#E6FFE6" }]}
                >
                  <Ionicons name="person-add" size={24} color="#34C759" />
                </View>
                <Text style={styles.actionText}>Kayıt Ekle</Text>
              </Pressable>

              <Pressable style={styles.actionBtn} onPress={openLiveDutyMap}>
                <View
                  style={[styles.iconCircle, { backgroundColor: "#FFE6E6" }]}
                >
                  <Ionicons name="map" size={24} color="#FF3B30" />
                </View>
                <Text style={styles.actionText}>Canlı Nöbet</Text>
              </Pressable>

              <Pressable style={styles.actionBtn} onPress={handleAIAssignment}>
                <View
                  style={[styles.iconCircle, { backgroundColor: "#e6ffe6" }]}
                >
                  <Ionicons name="color-wand" size={24} color="#1ddd1d" />
                </View>
                <Text style={styles.actionText}>AI Nöbet</Text>
              </Pressable>
            </>
          ) : (
            <Pressable style={styles.actionBtn} onPress={startDuty}>
              <View style={[styles.iconCircle, { backgroundColor: "#FFE6E6" }]}>
                <Ionicons name="location" size={24} color="#FF3B30" />
              </View>
              <Text style={styles.actionText}>Nöbet Başlat</Text>
            </Pressable>
          )}

          <Pressable
            style={styles.actionBtn}
            onPress={() => router.push("/settings" as any)}
          >
            <View style={[styles.iconCircle, { backgroundColor: "#F0F0F0" }]}>
              <Ionicons name="settings" size={24} color="#666" />
            </View>
            <Text style={styles.actionText}>Ayarlar</Text>
          </Pressable>
        </View>
      </ScrollView>

      <Animated.View
        entering={FadeInUp.delay(700)}
        style={styles.recentSection}
      >
        <Text style={styles.sectionTitle}>Son Eklenenler</Text>
        {recentTeachers.length === 0 ? (
          <Text style={styles.emptyText}>Henüz kayıtlı personel yok.</Text>
        ) : (
          recentTeachers.map((teacher, index) => (
            <Animated.View
              key={teacher.id}
              entering={FadeInRight.delay(700 + index * 100)}
              exiting={FadeOutLeft}
              layout={Layout.springify()}
            >
              <Swipeable
                renderRightActions={() =>
                  renderRightActions(teacher.id, teacher.name, teacher.surname)
                }
                renderLeftActions={() => renderLeftActions(teacher.id)}
                overshootRight={false}
                overshootLeft={false}
              >
                <TeacherCard
                  teacher={teacher}
                  onPress={() =>
                    router.push(`/teacher-detail/${teacher.id}` as any)
                  }
                />
              </Swipeable>
            </Animated.View>
          ))
        )}
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f0f2f5", padding: 15 },

  // YENİ PROFİL STİLLERİ
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    padding: 15,
    borderRadius: 16,
    elevation: 2,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginTop: 10,
  },
  profileImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 15,
    backgroundColor: "#E5E7EB",
  },
  profileTextContainer: { flex: 1 },
  welcomeText: { fontSize: 13, color: "#6B7280" },
  profileName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 4,
  },
  roleBadge: {
    backgroundColor: "#DBEAFE",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  roleBadgeText: { color: "#1D4ED8", fontSize: 12, fontWeight: "bold" },

  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 25,
  },
  statCard: {
    width: "48%",
    backgroundColor: "white",
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    elevation: 2,
  },
  statValue: { fontSize: 22, fontWeight: "bold", color: "#333", marginTop: 8 },
  statLabel: { fontSize: 13, color: "#666", marginTop: 4 },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 15,
  },
  actionRowContainer: { marginBottom: 30 },
  actionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 15,
    paddingRight: 20,
  },
  actionBtn: { alignItems: "center", width: 75 },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    elevation: 1,
  },
  actionText: {
    fontSize: 12,
    color: "#444",
    fontWeight: "bold",
    textAlign: "center",
  },

  recentSection: { marginBottom: 40 },
  emptyText: {
    fontSize: 14,
    color: "#888",
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 10,
  },

  deleteActionContainer: {
    backgroundColor: "#FF3B30",
    justifyContent: "center",
    alignItems: "center",
    width: 90,
    borderRadius: 12,
    marginBottom: 10,
    marginLeft: 10,
  },
  detailActionContainer: {
    backgroundColor: "#34C759",
    justifyContent: "center",
    alignItems: "center",
    width: 90,
    borderRadius: 12,
    marginBottom: 10,
    marginRight: 10,
  },
  actionTextSide: { color: "white", fontWeight: "bold", marginTop: 5 },

  aiModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  aiModalContent: {
    backgroundColor: "white",
    width: "100%",
    padding: 30,
    borderRadius: 20,
    alignItems: "center",
    elevation: 10,
  },
  aiModalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
    textAlign: "center",
  },
  aiModalDesc: {
    fontSize: 15,
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
  },

  // HARİTA STİLLERİ
  closeMapBtn: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 100,
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 10,
    borderRadius: 20,
  },
  mapInfoBox: {
    position: "absolute",
    bottom: 40,
    left: 20,
    right: 20,
    backgroundColor: "white",
    padding: 15,
    borderRadius: 15,
    elevation: 5,
  },
  mapInfoTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FF3B30",
    marginBottom: 5,
  },
  mapInfoText: { fontSize: 14, color: "#666", lineHeight: 20 },
  customMarker: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 2,
    elevation: 4,
  },
  calloutView: { width: 150, padding: 5 },
  calloutTitle: {
    fontWeight: "bold",
    fontSize: 14,
    color: "#333",
    marginBottom: 3,
  },
  calloutText: { fontSize: 12, color: "#666", marginBottom: 3 },
  calloutDuty: { fontSize: 12, color: "#007AFF", fontWeight: "bold" },
});
