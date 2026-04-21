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
import {
  Accelerometer,
  Pedometer,
  Gyroscope,
  Magnetometer,
  DeviceMotion,
} from "expo-sensors";
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

  // Sensör Stateleri
  const [stepCount, setStepCount] = useState(0);
  const [acceleration, setAcceleration] = useState(0);
  const [isMeetingMode, setIsMeetingMode] = useState(false);
  const [heading, setHeading] = useState(0);
  const [isEmergencyMode, setIsEmergencyMode] = useState(false);
  const [systemLogs, setSystemLogs] = useState<string[]>([]);

  const SHAKE_THRESHOLD = 1.8;
  const isEmergencyTriggered = useRef(false);

  const teacherOptions = teachers.map((t) => t.name + " " + t.surname);
  const selectedTeacher = teachers.find((t) => t.id === selectedTeacherId);

  const addLog = (message: string) => {
    const time = new Date().toLocaleTimeString("tr-TR");
    setSystemLogs((prev) => [`[${time}] ${message}`, ...prev].slice(0, 5)); // Son 5 logu tut
  };

  // 1. İVMEÖLÇER & JİROSKOP & MANYETOMETRE & DEVICEMOTION
  useEffect(() => {
    let accSub: any, gyroSub: any, magSub: any, motionSub: any;

    if (isDutyActive) {
      // İVMEÖLÇER (Sallama Algılama)
      Accelerometer.setUpdateInterval(100);
      accSub = Accelerometer.addListener((data) => {
        const totalAcc = Math.sqrt(
          data.x * data.x + data.y * data.y + data.z * data.z,
        );
        setAcceleration(Number(totalAcc.toFixed(2)));
        if (totalAcc > SHAKE_THRESHOLD && !isEmergencyTriggered.current) {
          isEmergencyTriggered.current = true;
          triggerEmergency("Sarsıntı Algılandı");
        }
      });

      // JİROSKOP (Toplantı Modu)
      Gyroscope.setUpdateInterval(100); // 500'den 100'e düşürdük (Saniyede 10 kez tarayacak!)
      gyroSub = Gyroscope.addListener((data) => {
        // Hem X (öne takla) hem Y (sağa/sola yuvarlama) eksenini kontrol ediyoruz.
        // Hassasiyet eşiğini 3'ten 2.5'e çektik (Daha ufak bilek hareketini algılar).
        if (Math.abs(data.x) > 2.5 || Math.abs(data.y) > 2.5) {
          toggleMeetingMode();
        }
      });

      // MANYETOMETRE (Pusula - Acil Toplanma Yönü)
      Magnetometer.setUpdateInterval(100);
      magSub = Magnetometer.addListener((data) => {
        let angle = Math.atan2(data.y, data.x) * (180 / Math.PI);
        if (angle < 0) angle += 360;
        setHeading(Math.round(angle));
      });

      // DEVICEMOTION (Düşme Algılama)
      DeviceMotion.setUpdateInterval(200);
      motionSub = DeviceMotion.addListener((event) => {
        const { acceleration, rotationRate } = event;
        if (acceleration && rotationRate) {
          const totalAcc = Math.sqrt(
            acceleration.x ** 2 + acceleration.y ** 2 + acceleration.z ** 2,
          );
          const totalRot =
            Math.abs(rotationRate.alpha) + Math.abs(rotationRate.beta);

          // Çok sert ivmelenme ve dönme varsa (Düşme Eşiği)
          if (totalAcc > 20 && totalRot > 5 && !isEmergencyTriggered.current) {
            isEmergencyTriggered.current = true;
            triggerEmergency("Personel Düşmesi Algılandı!");
          }
        }
      });
    }

    return () => {
      accSub?.remove();
      gyroSub?.remove();
      magSub?.remove();
      motionSub?.remove();
    };
  }, [isDutyActive]);

  // 2. ADIMSAYAR (PEDOMETER)
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

  // Bekleme süresi (cooldown) için bir referans ekliyoruz
  const lastToggleTime = useRef(0);

  const toggleMeetingMode = () => {
    // SPAM KORUMASI: İki tetikleme arasında en az 2 saniye geçmeli
    const now = Date.now();
    if (now - lastToggleTime.current < 2000) return;
    lastToggleTime.current = now;

    setIsMeetingMode((prev) => {
      const newStatus = !prev;

      // REACT RENDER HATASI ÇÖZÜMÜ: Yan etkileri (Side Effects) asenkron yapıyoruz
      setTimeout(() => {
        Vibration.vibrate(100);
        if (selectedTeacherId)
          updateMeetingStatus(selectedTeacherId, newStatus);
        addLog(newStatus ? "Toplantı Modu Aktif" : "Normal Moda Dönüldü");
        Toast.show({
          type: newStatus ? "info" : "success",
          text1: newStatus ? "🔇 Toplantı Modu" : "🔊 Normal Mod",
        });
      }, 0);

      return newStatus;
    });
  };

  const triggerEmergency = (reason: string) => {
    setIsEmergencyMode(true);
    Vibration.vibrate([500, 500, 500, 500]);
    addLog(`🚨 SİNYAL GÖNDERİLDİ: ${reason}`);

    if (selectedTeacherId) {
      // Firebase'e logu yazıyoruz (Buradan gittiğini anlıyoruz)
      logEmergency(
        selectedTeacherId,
        `${new Date().toLocaleString("tr-TR")} - ${reason}`,
      );
    }

    Alert.alert(
      "🚨 ACİL DURUM",
      `${reason}\nİdareye ve güvenlik birimlerine anlık konum ve sinyal gönderildi. Lütfen Acil Toplanma Alanına yönelin!`,
      [
        {
          text: "Anlaşıldı",
          onPress: () => {
            isEmergencyTriggered.current = false;
            setIsEmergencyMode(false);
          },
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

      {/* PUSULA VE ACİL DURUM KARTI */}
      <Animated.View
        entering={FadeInDown.delay(50)}
        style={[styles.card, isEmergencyMode ? styles.emergencyBg : null]}
      >
        <View style={styles.headerRow}>
          <Ionicons
            name="compass"
            size={28}
            color={isEmergencyMode ? "#EF4444" : "#007AFF"}
          />
          <Text
            style={[styles.cardTitle, isEmergencyMode && { color: "#EF4444" }]}
          >
            Acil Toplanma Alanı Yönü
          </Text>
        </View>
        <Text style={styles.desc}>
          Magnetometre (Pusula) verisine göre yönünüz:
        </Text>

        <View style={styles.compassContainer}>
          {/* Cihazın dönüşüne göre tam tersi yönde dönen pusula oku */}
          <View
            style={[
              styles.compassNeedle,
              { transform: [{ rotate: `${360 - heading}deg` }] },
            ]}
          >
            <Ionicons
              name="navigate-circle"
              size={80}
              color={isEmergencyMode ? "#EF4444" : "#007AFF"}
            />
          </View>
          <Text style={styles.headingText}>{heading}°</Text>
        </View>
      </Animated.View>

      {/* DEVICEMOTION & SALLAMA DURUMU */}
      <Animated.View
        entering={FadeInDown.delay(100)}
        style={[styles.card, { borderColor: "#FECACA", borderWidth: 1 }]}
      >
        <View style={styles.headerRow}>
          <Ionicons name="warning" size={28} color="#EF4444" />
          <Text style={styles.cardTitle}>Kaza / Düşme Sensörleri</Text>
        </View>
        <Text style={styles.desc}>
          İvmeölçer ve DeviceMotion aktif. Düşme veya sert sallama algılanırsa
          yardım çağrılır.
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
        <TouchableOpacity
          style={styles.testBtn}
          onPress={() => triggerEmergency("Manuel Test Sinyali")}
        >
          <Text style={{ color: "#EF4444", fontWeight: "bold" }}>
            Acil Durum Sinyalini Test Et
          </Text>
        </TouchableOpacity>
      </Animated.View>

      {/* DİĞER KARTLAR (Toplantı & Adım) */}
      <View style={{ flexDirection: "row", gap: 10, marginBottom: 15 }}>
        <View
          style={[
            styles.card,
            {
              flex: 1,
              marginBottom: 0,
              backgroundColor: isMeetingMode ? "#f5f4e5" : "#FFF",
            },
          ]}
        >
          <Ionicons
            name={isMeetingMode ? "volume-mute" : "volume-high"}
            size={24}
            color="#e8da12"
          />
          <Text style={{ fontWeight: "bold", marginTop: 5, color: "#d8b60e" }}>
            Toplantı Modu
          </Text>
          <Text style={{ fontSize: 12, color: "#666" }}>Ters Çevir</Text>
        </View>
        <View style={[styles.card, { flex: 1, marginBottom: 0 }]}>
          <Ionicons name="footsteps" size={24} color="#10B981" />
          <Text style={{ fontWeight: "bold", marginTop: 5 }}>
            {stepCount} Adım
          </Text>
          <Text style={{ fontSize: 12, color: "#666" }}>Pedometer</Text>
        </View>
      </View>

      {/* CANLI SİSTEM LOGLARI (SİNYALİN GİTTİĞİNİ BURADAN ANLAYACAKSIN) */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>📡 Canlı Sensör & Sinyal Logları</Text>
        {systemLogs.length === 0 ? (
          <Text style={{ color: "#999", fontStyle: "italic", marginTop: 10 }}>
            Henüz bir hareket veya sinyal yok...
          </Text>
        ) : (
          systemLogs.map((log, index) => (
            <Text
              key={index}
              style={[
                styles.logText,
                log.includes("🚨") && { color: "#EF4444", fontWeight: "bold" },
              ]}
            >
              {log}
            </Text>
          ))
        )}
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
          if (isDutyActive) {
            updateStepCount(selectedTeacherId, stepCount);
            addLog("Nöbet Bitirildi. Veriler Kaydedildi.");
          } else {
            addLog("Nöbet Başladı. Sensörler Dinleniyor...");
          }
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

const styles = StyleSheet.create({
  container: { flex: 1, padding: 15, backgroundColor: "#F3F4F6" },
  card: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 15,
    marginBottom: 15,
    elevation: 3,
  },
  emergencyBg: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
    borderWidth: 2,
  },
  headerRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1F2937",
    marginLeft: 10,
  },
  desc: { fontSize: 13, color: "#6B7280", marginBottom: 15 },
  progressBarBg: {
    height: 12,
    backgroundColor: "#E5E7EB",
    borderRadius: 6,
    overflow: "hidden",
    marginTop: 10,
  },
  progressBarFill: { height: "100%", borderRadius: 6 },
  testBtn: {
    marginTop: 15,
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FECACA",
    backgroundColor: "#FEF2F2",
  },
  compassContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
  },
  compassNeedle: {
    width: 80,
    height: 80,
    alignItems: "center",
    justifyContent: "center",
  },
  headingText: {
    fontSize: 24,
    fontWeight: "bold",
    marginTop: 10,
    color: "#333",
  },
  logText: {
    fontSize: 13,
    color: "#4B5563",
    marginTop: 5,
    fontFamily: "monospace",
  },
  mainBtn: {
    padding: 18,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 5,
    marginBottom: 40,
  },
  mainBtnText: { color: "white", fontSize: 18, fontWeight: "bold" },
});
