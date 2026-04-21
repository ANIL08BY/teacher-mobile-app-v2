import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Vibration,
  ScrollView,
} from "react-native";
import { Accelerometer, Pedometer } from "expo-sensors";
import { Ionicons } from "@expo/vector-icons";
import { useTeachers } from "../../context/TeacherContext";
import CustomDropdown from "../../components/CustomDropdown";
import Toast from "react-native-toast-message";
import Animated, { FadeInDown } from "react-native-reanimated";

export default function DutyTrackingScreen() {
  const { teachers, updateStepCount, logEmergency } = useTeachers();

  const [selectedTeacherId, setSelectedTeacherId] = useState<string>("");
  const [isDutyActive, setIsDutyActive] = useState(false);
  const [stepCount, setStepCount] = useState(0);
  const [isPedometerAvailable, setIsPedometerAvailable] = useState("checking");
  const [acceleration, setAcceleration] = useState(0);

  // Hassasiyet Eşiği (G Kuvveti) - 1.8 şiddetli bir sallamaya denk gelir
  const SHAKE_THRESHOLD = 1.8;
  const isEmergencyTriggered = useRef(false);

  // Öğretmen Seçenekleri
  const teacherOptions = teachers.map((t) => t.name + " " + t.surname);
  const selectedTeacher = teachers.find((t) => t.id === selectedTeacherId);

  // 1. İVMEÖLÇER (SALLAYARAK ACİL DURUM) DİNLEYİCİSİ
  useEffect(() => {
    let subscription: any;

    if (isDutyActive) {
      // 100ms aralıklarla sensör verisini çek
      Accelerometer.setUpdateInterval(100);
      subscription = Accelerometer.addListener((data) => {
        const { x, y, z } = data;
        // Toplam vektörel ivme (G Kuvveti formülü)
        const totalAcceleration = Math.sqrt(x * x + y * y + z * z);
        setAcceleration(Number(totalAcceleration.toFixed(2)));

        // Sarsıntı eşiği aşıldıysa ve daha önce tetiklenmediyse
        if (
          totalAcceleration > SHAKE_THRESHOLD &&
          !isEmergencyTriggered.current
        ) {
          isEmergencyTriggered.current = true;
          triggerEmergency();
        }
      });
    }

    return () => {
      if (subscription) subscription.remove();
    };
  }, [isDutyActive]);

  // 2. ADIMSAYAR (PEDOMETER) DİNLEYİCİSİ
  useEffect(() => {
    let stepSubscription: any;

    const subscribeToPedometer = async () => {
      // 🔥 YENİ 1: İşletim sisteminden "Fiziksel Aktivite" çalışma zamanı iznini iste
      const { status } = await Pedometer.requestPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(
          "İzin Gerekli",
          "Adımların sayılabilmesi için cihazınızın 'Fiziksel Aktivite' iznini onaylamanız gerekmektedir.",
        );
        setIsPedometerAvailable("false");
        return; // İzin yoksa sensörü hiç çalıştırma
      }

      // 🔥 YENİ 2: İzin varsa sensörün çipi sağlam mı diye donanımı kontrol et
      const isAvailable = await Pedometer.isAvailableAsync();
      setIsPedometerAvailable(String(isAvailable));

      // 🔥 YENİ 3: Her şey tamamsa ve Nöbet Başladıysa adımları saymaya başla
      if (isAvailable && isDutyActive) {
        stepSubscription = Pedometer.watchStepCount((result) => {
          setStepCount(result.steps);
        });
      }
    };

    subscribeToPedometer();

    return () => {
      if (stepSubscription) stepSubscription.remove();
    };
  }, [isDutyActive]);

  const triggerEmergency = () => {
    Vibration.vibrate([500, 500, 500, 500]); // Cihazı güçlüce titret
    const time = new Date().toLocaleString("tr-TR");

    if (selectedTeacherId) {
      logEmergency(selectedTeacherId, time);
    }

    Alert.alert(
      "🚨 ACİL DURUM SİNYALİ",
      "Sarsıntı algılandı! İdareye ve güvenlik birimlerine anlık konum ve acil durum çağrısı gönderildi.",
      [
        {
          text: "Anlaşıldı",
          onPress: () => {
            isEmergencyTriggered.current = false;
          },
        },
      ],
    );
  };

  const handleStartDuty = () => {
    if (!selectedTeacherId) {
      return Toast.show({
        type: "error",
        text1: "Hata",
        text2: "Lütfen önce nöbetçi personeli seçin.",
      });
    }
    setIsDutyActive(true);
    Toast.show({
      type: "success",
      text1: "Nöbet Başladı",
      text2: "Sensörler aktif edildi. Güvenli nöbetler!",
    });
  };

  const handleEndDuty = () => {
    setIsDutyActive(false);
    if (selectedTeacherId) {
      updateStepCount(selectedTeacherId, stepCount);
      Toast.show({
        type: "info",
        text1: "Nöbet Bitti",
        text2: `Veriler buluta işlendi. Toplam Adım: ${stepCount}`,
      });
    }
    setStepCount(0);
    setAcceleration(0);
  };

  return (
    <ScrollView style={styles.container}>
      <Animated.View entering={FadeInDown.delay(100)} style={styles.card}>
        <Text style={styles.cardTitle}>Nöbetçi Personel Seçimi</Text>
        <CustomDropdown
          placeholder="Personel Seç"
          options={teacherOptions}
          value={
            selectedTeacher
              ? `${selectedTeacher.name} ${selectedTeacher.surname}`
              : ""
          }
          onSelect={(val) => {
            const t = teachers.find(
              (teacher) => `${teacher.name} ${teacher.surname}` === val,
            );
            if (t) setSelectedTeacherId(t.id);
          }}
        />
      </Animated.View>

      <Animated.View
        entering={FadeInDown.delay(200)}
        style={[
          styles.card,
          { backgroundColor: isDutyActive ? "#ECFDF5" : "#FFF" },
        ]}
      >
        <View style={styles.headerRow}>
          <Ionicons
            name="footsteps"
            size={28}
            color={isDutyActive ? "#10B981" : "#9CA3AF"}
          />
          <Text style={styles.cardTitle}>Performans (Adımsayar)</Text>
        </View>
        <Text style={styles.desc}>
          Sensör Durumu:{" "}
          {isPedometerAvailable === "true"
            ? "✅ Aktif"
            : "❌ Cihaz Desteklemiyor"}
        </Text>

        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{stepCount}</Text>
          <Text style={styles.statLabel}>Attığınız Adım</Text>
        </View>

        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            marginTop: 10,
          }}
        >
          <Text style={styles.infoText}>
            🔥 Yakılan Kalori: {(stepCount * 0.04).toFixed(0)} kcal
          </Text>
          <Text style={styles.infoText}>
            📏 Mesafe: {(stepCount * 0.000762).toFixed(2)} km
          </Text>
        </View>
      </Animated.View>

      <Animated.View
        entering={FadeInDown.delay(300)}
        style={[
          styles.card,
          {
            backgroundColor: isDutyActive ? "#FEF2F2" : "#FFF",
            borderColor: "#FECACA",
            borderWidth: 1,
          },
        ]}
      >
        <View style={styles.headerRow}>
          <Ionicons name="warning" size={28} color="#EF4444" />
          <Text style={styles.cardTitle}>Acil Durum (İvmeölçer)</Text>
        </View>
        <Text style={styles.desc}>
          Nöbet esnasında tehlikeli bir durumda ekranı açmadan telefonu 2 kez
          hızlıca sallamanız yeterlidir.
        </Text>

        <View style={styles.progressBarBg}>
          <View
            style={[
              styles.progressBarFill,
              {
                width: `${Math.min((acceleration / 3) * 100, 100)}%`,
                backgroundColor: acceleration > 1.5 ? "#EF4444" : "#3B82F6",
              },
            ]}
          />
        </View>
        <Text style={styles.infoText}>
          Anlık G-Kuvveti: {acceleration}G (Eşik: {SHAKE_THRESHOLD}G)
        </Text>

        <TouchableOpacity
          style={styles.testBtn}
          onPress={triggerEmergency}
          disabled={!isDutyActive}
        >
          <Text style={styles.testBtnText}>Sarsıntıyı Manuel Test Et</Text>
        </TouchableOpacity>
      </Animated.View>

      <TouchableOpacity
        style={[
          styles.mainBtn,
          { backgroundColor: isDutyActive ? "#EF4444" : "#10B981" },
        ]}
        onPress={isDutyActive ? handleEndDuty : handleStartDuty}
      >
        <Ionicons
          name={isDutyActive ? "stop-circle" : "play-circle"}
          size={24}
          color="white"
          style={{ marginRight: 10 }}
        />
        <Text style={styles.mainBtnText}>
          {isDutyActive ? "Nöbeti Bitir & Kaydet" : "Nöbeti Başlat"}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 15, backgroundColor: "#F3F4F6" },
  card: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 15,
    marginBottom: 15,
    elevation: 3,
  },
  headerRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1F2937",
    marginLeft: 10,
  },
  desc: { fontSize: 13, color: "#6B7280", marginBottom: 15, lineHeight: 20 },
  statBox: { alignItems: "center", marginVertical: 10 },
  statNumber: { fontSize: 48, fontWeight: "900", color: "#10B981" },
  statLabel: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  infoText: { fontSize: 14, fontWeight: "600", color: "#4B5563" },
  progressBarBg: {
    height: 12,
    backgroundColor: "#E5E7EB",
    borderRadius: 6,
    overflow: "hidden",
    marginBottom: 5,
  },
  progressBarFill: { height: "100%", borderRadius: 6 },
  testBtn: {
    marginTop: 15,
    backgroundColor: "#FEE2E2",
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },
  testBtnText: { color: "#EF4444", fontWeight: "bold" },
  mainBtn: {
    flexDirection: "row",
    padding: 18,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    marginBottom: 40,
    elevation: 4,
  },
  mainBtnText: { color: "white", fontSize: 18, fontWeight: "bold" },
});
