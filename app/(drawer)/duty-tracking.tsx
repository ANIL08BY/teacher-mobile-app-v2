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
import { Accelerometer, Pedometer, Gyroscope } from "expo-sensors";
import { Ionicons } from "@expo/vector-icons";
import { useTeachers } from "../../context/TeacherContext";
import CustomDropdown from "../../components/CustomDropdown";
import Toast from "react-native-toast-message";
import Animated, { FadeInDown } from "react-native-reanimated";

export default function DutyTrackingScreen() {
  const { teachers, updateStepCount, logEmergency, updateMeetingStatus } =
    useTeachers();

  const [selectedTeacherId, setSelectedTeacherId] = useState<string>("");
  const [isDutyActive, setIsDutyActive] = useState(false);
  const [stepCount, setStepCount] = useState(0);
  const [acceleration, setAcceleration] = useState(0);
  const [isMeetingMode, setIsMeetingMode] = useState(false);

  const SHAKE_THRESHOLD = 1.8;
  const isEmergencyTriggered = useRef(false);

  const teacherOptions = teachers.map((t) => t.name + " " + t.surname);
  const selectedTeacher = teachers.find((t) => t.id === selectedTeacherId);

  // 1. İVMEÖLÇER (SALLAMA) & JİROSKOP (TOPLANTI MODU) DİNLEYİCİSİ
  useEffect(() => {
    let accSub: any;
    let gyroSub: any;

    if (isDutyActive) {
      // İvmeölçer
      Accelerometer.setUpdateInterval(100);
      accSub = Accelerometer.addListener((data) => {
        const totalAcc = Math.sqrt(
          data.x * data.x + data.y * data.y + data.z * data.z,
        );
        setAcceleration(Number(totalAcc.toFixed(2)));
        if (totalAcc > SHAKE_THRESHOLD && !isEmergencyTriggered.current) {
          isEmergencyTriggered.current = true;
          triggerEmergency();
        }
      });

      // 🔥 JİROSKOP: Dönme hareketini algılar
      Gyroscope.setUpdateInterval(500);
      gyroSub = Gyroscope.addListener((data) => {
        // Eğer telefon hızlıca x ekseninde döndürülürse (masaya ters kapatma hareketi)
        if (Math.abs(data.x) > 3) {
          toggleMeetingMode();
        }
      });
    }

    return () => {
      accSub?.remove();
      gyroSub?.remove();
    };
  }, [isDutyActive]);

  // 2. ADIMSAYAR
  useEffect(() => {
    let stepSub: any;
    const subscribe = async () => {
      const { status } = await Pedometer.requestPermissionsAsync();
      if (status === "granted" && isDutyActive) {
        stepSub = Pedometer.watchStepCount((result) =>
          setStepCount(result.steps),
        );
      }
    };
    subscribe();
    return () => stepSub?.remove();
  }, [isDutyActive]);

  const toggleMeetingMode = () => {
    setIsMeetingMode((prev) => {
      const newStatus = !prev;
      Vibration.vibrate(100);
      if (selectedTeacherId) updateMeetingStatus(selectedTeacherId, newStatus);

      Toast.show({
        type: newStatus ? "info" : "success",
        text1: newStatus ? "🔇 Toplantı Modu Aktif" : "🔊 Normal Mod",
        text2: newStatus
          ? "Durumunuz 'Meşgul' olarak güncellendi."
          : "Tekrar 'Müsait' olarak işaretlendiniz.",
      });
      return newStatus;
    });
  };

  const triggerEmergency = () => {
    Vibration.vibrate([500, 500, 500, 500]);
    if (selectedTeacherId)
      logEmergency(selectedTeacherId, new Date().toLocaleString("tr-TR"));
    Alert.alert(
      "🚨 ACİL DURUM",
      "Sarsıntı algılandı! İdareye bildirim gönderildi.",
      [
        {
          text: "Kapat",
          onPress: () => (isEmergencyTriggered.current = false),
        },
      ],
    );
  };

  return (
    <ScrollView style={styles.container}>
      <Animated.View entering={FadeInDown} style={styles.card}>
        <Text style={styles.cardTitle}>Nöbetçi Personel</Text>
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

      {/* TOPLANTI MODU KARTI (JİROSKOP) */}
      <Animated.View
        entering={FadeInDown.delay(100)}
        style={[
          styles.card,
          { backgroundColor: isMeetingMode ? "#F3E5F5" : "#FFF" },
        ]}
      >
        <View style={styles.headerRow}>
          <Ionicons
            name={isMeetingMode ? "volume-mute" : "volume-high"}
            size={28}
            color="#9C27B0"
          />
          <Text style={[styles.cardTitle, { color: "#7B1FA2" }]}>
            Toplantı Modu (Jiroskop)
          </Text>
        </View>
        <Text style={styles.desc}>
          Cihazı hızlıca ters çevirerek (veya masaya kapatarak) otomatik olarak
          toplantı moduna geçebilirsiniz.
        </Text>
        <TouchableOpacity
          style={[styles.testBtn, { borderColor: "#9C27B0" }]}
          onPress={toggleMeetingMode}
        >
          <Text style={{ color: "#9C27B0", fontWeight: "bold" }}>
            Modu Manuel Değiştir
          </Text>
        </TouchableOpacity>
      </Animated.View>

      {/* ADIMSAYAR KARTI */}
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <Ionicons name="footsteps" size={28} color="#10B981" />
          <Text style={styles.cardTitle}>Nöbet Performansı</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{stepCount}</Text>
          <Text style={styles.statLabel}>Adım</Text>
        </View>
      </View>

      {/* SALLAMA KARTI */}
      <View style={[styles.card, { borderColor: "#FECACA", borderWidth: 1 }]}>
        <View style={styles.headerRow}>
          <Ionicons name="warning" size={28} color="#EF4444" />
          <Text style={styles.cardTitle}>Acil Durum (Sallama)</Text>
        </View>
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
      </View>

      <TouchableOpacity
        style={[
          styles.mainBtn,
          { backgroundColor: isDutyActive ? "#EF4444" : "#10B981" },
        ]}
        onPress={() => {
          if (!selectedTeacherId)
            return Toast.show({
              type: "error",
              text1: "Hata",
              text2: "Personel seçin!",
            });
          if (isDutyActive) updateStepCount(selectedTeacherId, stepCount);
          setIsDutyActive(!isDutyActive);
        }}
      >
        <Text style={styles.mainBtnText}>
          {isDutyActive ? "Nöbeti Bitir" : "Nöbeti Başlat"}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ... Stiller (Öncekiyle aynı, sadece mor renkli dokunuşlar eklendi)
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
  desc: { fontSize: 13, color: "#6B7280", marginBottom: 15 },
  statBox: { alignItems: "center" },
  statNumber: { fontSize: 48, fontWeight: "900", color: "#10B981" },
  statLabel: { fontSize: 14, color: "#6B7280", fontWeight: "bold" },
  progressBarBg: {
    height: 12,
    backgroundColor: "#E5E7EB",
    borderRadius: 6,
    overflow: "hidden",
  },
  progressBarFill: { height: "100%", borderRadius: 6 },
  testBtn: {
    marginTop: 5,
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
  },
  mainBtn: {
    padding: 18,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
    marginBottom: 40,
  },
  mainBtnText: { color: "white", fontSize: 18, fontWeight: "bold" },
});
