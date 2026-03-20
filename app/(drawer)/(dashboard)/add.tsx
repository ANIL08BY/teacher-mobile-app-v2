import React, { useState, useEffect } from "react";
import {
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  Alert,
  View,
  Platform,
  TouchableOpacity,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { useTeachers } from "../../../context/TeacherContext";
import { useAuth } from "../../../context/AuthContext";
import CustomDropdown from "../../../components/CustomDropdown";
import { Ionicons } from "@expo/vector-icons";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import Toast from "react-native-toast-message";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../../utils/firebaseConfig";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default function AddScreen() {
  const { addTeacher, teachers } = useTeachers();
  const { user } = useAuth();
  const router = useRouter();

  const isTopManagement =
    user &&
    ["Müdür", "Müdür Baş Yardımcısı", "Müdür Yardımcısı"].includes(user.role);

  const [tName, setTName] = useState("");
  const [tSurname, setTSurname] = useState("");
  const [tTcNo, setTTcNo] = useState("");

  const [tGender, setTGender] = useState("");
  const [tMaritalStatus, setTMaritalStatus] = useState("");

  const [tSpouseInstitution, setTSpouseInstitution] = useState("");
  const [tChildrenCount, setTChildrenCount] = useState("");
  const [tIsOnMaternityLeave, setTIsOnMaternityLeave] =
    useState<boolean>(false);

  const [tBranch, setTBranch] = useState("");
  const [tRole, setTRole] = useState("");
  const [tPhone, setTPhone] = useState("");
  const [tAddress, setTAddress] = useState("");
  const [tDutyDay, setTDutyDay] = useState("");
  const [tDutyLocation, setTDutyLocation] = useState("");
  const [customDutyLocation, setCustomDutyLocation] = useState("");
  const [tAvatar, setTAvatar] = useState("");

  const [tAge, setTAge] = useState("");
  const [tSeniorityYear, setTSeniorityYear] = useState("");
  const [tTitle, setTTitle] = useState("Öğretmen");
  const [tUsedLeaveDays, setTUsedLeaveDays] = useState("");

  const [tClub, setTClub] = useState("");
  const [isAddingClub, setIsAddingClub] = useState(false);
  const [newClubName, setNewClubName] = useState("");
  const [customClubs, setCustomClubs] = useState<string[]>([]);

  // DROPDOWN SEÇENEKLERİ
  const genderOptions = ["Erkek", "Kadın"];
  const maritalStatusOptions = ["Bekar", "Evli"];
  const branchOptions = [
    "Matematik",
    "Fizik",
    "Kimya",
    "Biyoloji",
    "Edebiyat",
    "Tarih",
    "İngilizce",
    "Rehberlik",
    "Sınıf Öğretmeni",
    "Okul Öncesi",
    "Beden Eğitimi",
    "Müzik",
    "Görsel Sanatlar",
    "Bilişim",
    "Din Kültürü",
    "Diğer",
  ];
  const roleOptions = [
    "Müdür",
    "Müdür Baş Yardımcısı",
    "Müdür Yardımcısı",
    "Memur",
    "Öğretmen",
  ];
  const dutyDays = ["Yok", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma"];
  const dutyLocations = [
    "Bahçe",
    "Zemin Kat",
    "1. Kat",
    "2. Kat",
    "3. Kat",
    "Diğer...",
  ];

  const defaultClubs = [
    "Bilişim Kulübü",
    "Kızılay Kulübü",
    "Yeşilay Kulübü",
    "Spor Kulübü",
    "Satranç Kulübü",
    "Müzik Kulübü",
  ];
  const existingClubs = teachers
    .map((t) => t.club)
    .filter((c) => c && c !== "Atanmadı" && c !== "Yok") as string[];
  const displayClubs = Array.from(
    new Set([...defaultClubs, ...existingClubs, ...customClubs]),
  );
  const assignedClubs = existingClubs;

  useEffect(() => {
    async function setupNotifications() {
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
          name: "Varsayılan",
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#FF231F7C",
        });
      }
    }
    setupNotifications();
  }, []);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "İzin Reddedildi",
        "Profil fotoğrafı eklemek için galeri erişim izni gereklidir.",
      );
      return;
    }
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) setTAvatar(result.assets[0].uri);
  };

  const handleAddNewClub = () => {
    if (newClubName.trim() === "")
      return Alert.alert("Hata", "Lütfen geçerli bir kulüp adı giriniz.");
    setCustomClubs([...customClubs, newClubName.trim()]);
    setTClub(newClubName.trim());
    setNewClubName("");
    setIsAddingClub(false);
  };

  if (!isTopManagement) {
    return (
      <View style={styles.unauthorizedContainer}>
        <Ionicons name="shield-half-outline" size={80} color="#FF3B30" />
        <Text style={styles.unauthorizedTitle}>Yetkisiz Erişim</Text>
        <Text style={styles.unauthorizedText}>
          Sadece Yöneticiler sisteme yeni personel ekleyebilir.
        </Text>
      </View>
    );
  }

  // Bildirim gönderme motoru
  const sendPushNotification = async (
    expoPushToken: string,
    title: string,
    body: string,
  ) => {
    const message = {
      to: expoPushToken, // Artık parametre olarak geliyor
      sound: "default",
      title: title,
      body: body,
    };

    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(message),
    });
  };

  const handleSave = async () => {
    // --- 1. TEMİZLEME ---
    const cleanName = tName.trim();
    const cleanSurname = tSurname.trim();
    const cleanPhone = tPhone.replace(/\s/g, "");
    const cleanTc = tTcNo.trim();

    // Regex: Sadece harfler ve boşluk
    const alphaRegex = /^[a-zA-ZğüşıöçĞÜŞİÖÇ\s]+$/;
    const formatPascalCase = (str: string) =>
      str
        .toLocaleLowerCase("tr-TR")
        .split(" ")
        .map((s) => s.charAt(0).toLocaleUpperCase("tr-TR") + s.slice(1))
        .join(" ");

    // --- 2. DOĞRULAMA ---
    if (
      !cleanName ||
      !cleanSurname ||
      !cleanTc ||
      !tGender ||
      !tMaritalStatus ||
      !tBranch ||
      !tRole
    ) {
      return Toast.show({
        type: "error",
        text1: "Eksik Alanlar ⚠️",
        text2: "Lütfen zorunlu yıldızlı (*) alanları doldurunuz.",
      });
    }

    if (!alphaRegex.test(cleanName) || !alphaRegex.test(cleanSurname)) {
      return Toast.show({
        type: "error",
        text1: "Hatalı Giriş",
        text2: "Ad ve Soyad sadece harflerden oluşmalıdır.",
      });
    }

    if (cleanTc.length !== 11 || isNaN(Number(cleanTc))) {
      return Toast.show({
        type: "error",
        text1: "TC No Hatası",
        text2: "TC Kimlik Numarası 11 haneli bir sayı olmalıdır.",
      });
    }

    // --- 3. MÜKERRERLİK ---
    if (teachers.some((t) => t.tcNo === cleanTc)) {
      return Alert.alert(
        "Mükerrer Kayıt ⚠️",
        "Bu TC Kimlik Numarası zaten kayıtlı!",
      );
    }

    // --- 4. NÖBET ---
    let finalDuty = "";
    if (tDutyDay && tDutyDay !== "Yok") {
      const actualLocation =
        tDutyLocation === "Diğer..."
          ? customDutyLocation.trim()
          : tDutyLocation;
      if (!tDutyLocation || !actualLocation)
        return Alert.alert("Eksik Bilgi", "Nöbet yerini tam belirleyin!");
      finalDuty = `${tDutyDay} - ${actualLocation}`;
    }

    // --- 5. KAYIT ---
    const finalName = formatPascalCase(cleanName);
    const finalSurname = cleanSurname.toLocaleUpperCase("tr-TR");

    addTeacher({
      id: Date.now().toString(),
      tcNo: cleanTc,
      name: finalName,
      surname: finalSurname,
      gender: tGender,
      maritalStatus: tMaritalStatus,
      spouseInstitution:
        tMaritalStatus === "Evli" ? tSpouseInstitution.trim() : "",
      childrenCount:
        tMaritalStatus === "Evli" && tChildrenCount
          ? parseInt(tChildrenCount)
          : 0,
      isOnMaternityLeave: tGender === "Kadın" ? tIsOnMaternityLeave : false,
      branch: tBranch,
      role: tRole,
      phone: cleanPhone,
      address: tAddress.trim(),
      duty: finalDuty,
      avatar:
        tAvatar ||
        `https://ui-avatars.com/api/?name=${finalName}+${finalSurname}&background=4F46E5&color=fff&size=200`,
      lessons: [],
      age: tAge ? parseInt(tAge) : 0,
      seniorityYear: tSeniorityYear ? parseInt(tSeniorityYear) : 0,
      title: tTitle,
      isDepartmentHead: false,
      usedLeaveDays: tUsedLeaveDays ? parseInt(tUsedLeaveDays) : 0,
      club: tClub || "Atanmadı",
    });

    try {
      // 1. Firestore'dan Müdür ve Yardımcılarının tokenlarını çek
      const usersRef = collection(db, "users");
      const q = query(
        usersRef,
        where("role", "in", ["Müdür", "Müdür Yardımcısı"]),
      );
      const querySnapshot = await getDocs(q);

      // 2. Her bir yöneticiye bildirim gönder
      querySnapshot.forEach(async (userDoc) => {
        const adminToken = userDoc.data().pushToken;
        if (adminToken) {
          await sendPushNotification(
            adminToken, // Dinamik olarak Firestore'dan geldi
            "📢 Yeni Personel Kaydı",
            `${finalName} ${finalSurname} sisteme eklendi.`,
          );
        }
      });
    } catch (e) {
      console.log("Bildirim zincirinde hata:", e);
    }

    Toast.show({
      type: "success",
      text1: "✨ Başarılı",
      text2: "Personel başarıyla kaydedildi.",
    });
    setTimeout(() => router.push("/(drawer)/(dashboard)/list" as any), 1000);
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.avatarSection}>
        <TouchableOpacity
          style={styles.avatarContainer}
          onPress={pickImage}
          activeOpacity={0.8}
        >
          {tAvatar ? (
            <Image source={{ uri: tAvatar }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Ionicons name="person-add" size={40} color="#9CA3AF" />
            </View>
          )}
          <View style={styles.editBadge}>
            <Ionicons name="camera" size={16} color="white" />
          </View>
        </TouchableOpacity>
        <Text style={styles.avatarHint}>Fotoğraf Seçmek İçin Dokunun</Text>
      </View>

      <Text style={styles.sectionHeader}>Temel Bilgiler</Text>
      {/* 🛡️ AD: Sayı giremez, her kelime büyük başlar */}
      <TextInput
        style={styles.input}
        placeholder="Ad *"
        value={tName}
        onChangeText={(text) => setTName(text.replace(/[0-9]/g, ""))}
        autoCapitalize="words"
      />
      {/* 🛡️ SOYAD: Sayı giremez, otomatik büyük harfe zorlar */}
      <TextInput
        style={styles.input}
        placeholder="Soyad *"
        value={tSurname}
        onChangeText={(text) => setTSurname(text.replace(/[0-9]/g, ""))}
      />
      {/* 🛡️ TC NO: Sadece 11 rakam */}
      <TextInput
        style={styles.input}
        placeholder="TC Kimlik No *"
        value={tTcNo}
        onChangeText={(text) => setTTcNo(text.replace(/[^0-9]/g, ""))}
        keyboardType="numeric"
        maxLength={11}
      />

      <View
        style={{
          flexDirection: "row",
          gap: 10,
          zIndex: 4500,
          marginBottom: 15,
        }}
      >
        <View style={{ flex: 1 }}>
          <CustomDropdown
            placeholder="Cinsiyet Seç *"
            options={genderOptions}
            value={tGender}
            onSelect={setTGender}
          />
        </View>
        <View style={{ flex: 1 }}>
          <CustomDropdown
            placeholder="Medeni Hal Seç *"
            options={maritalStatusOptions}
            value={tMaritalStatus}
            onSelect={setTMaritalStatus}
          />
        </View>
      </View>

      {tGender === "Kadın" && (
        <View style={styles.dynamicBox}>
          <Text style={styles.dynamicLabel}>🤰 Doğum İzni Durumu</Text>
          <View style={{ flexDirection: "row", gap: 10, marginTop: 5 }}>
            <TouchableOpacity
              style={[
                styles.radioBtn,
                !tIsOnMaternityLeave && styles.radioBtnActive,
              ]}
              onPress={() => setTIsOnMaternityLeave(false)}
            >
              <Text
                style={{
                  color: !tIsOnMaternityLeave ? "#FFF" : "#4B5563",
                  fontWeight: "bold",
                }}
              >
                Aktif Çalışıyor
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.radioBtn,
                tIsOnMaternityLeave && {
                  backgroundColor: "#EC4899",
                  borderColor: "#EC4899",
                },
              ]}
              onPress={() => setTIsOnMaternityLeave(true)}
            >
              <Text
                style={{
                  color: tIsOnMaternityLeave ? "#FFF" : "#4B5563",
                  fontWeight: "bold",
                }}
              >
                İzinde (Raporlu)
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {tMaritalStatus === "Evli" && (
        <View style={styles.dynamicBox}>
          <Text style={styles.dynamicLabel}>💍 Eş ve Çocuk Durumu</Text>
          <TextInput
            style={[styles.input, { marginBottom: 10 }]}
            placeholder="Eşinin Çalıştığı Kurum / İl"
            value={tSpouseInstitution}
            onChangeText={setTSpouseInstitution}
          />
          {/* 🛡️ ÇOCUK SAYISI: Sadece 2 hane rakam */}
          <TextInput
            style={[styles.input, { marginBottom: 0 }]}
            placeholder="Çocuk Sayısı"
            value={tChildrenCount}
            onChangeText={(text) =>
              setTChildrenCount(text.replace(/[^0-9]/g, ""))
            }
            keyboardType="numeric"
            maxLength={2}
          />
        </View>
      )}

      <Text style={[styles.sectionHeader, { marginTop: 10 }]}>
        Kurum Bilgileri
      </Text>
      <View style={{ zIndex: 4000, marginBottom: 15 }}>
        <CustomDropdown
          placeholder="Rol Seçiniz *"
          options={roleOptions}
          value={tRole}
          onSelect={setTRole}
        />
      </View>
      <View style={{ zIndex: 3000, marginBottom: 15 }}>
        <CustomDropdown
          placeholder="Branş Seçiniz *"
          options={branchOptions}
          value={tBranch}
          onSelect={setTBranch}
        />
      </View>

      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          marginBottom: 15,
        }}
      >
        <View style={{ flex: 1, marginRight: 10 }}>
          <Text style={styles.label}>Yaş</Text>
          {/* 🛡️ YAŞ: Sadece 2 hane rakam */}
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={tAge}
            onChangeText={(text) => setTAge(text.replace(/[^0-9]/g, ""))}
            placeholder="Örn: 35"
            maxLength={2}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Kıdem Yılı</Text>
          {/* 🛡️ KIDEM: Sadece 2 hane rakam */}
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={tSeniorityYear}
            onChangeText={(text) =>
              setTSeniorityYear(text.replace(/[^0-9]/g, ""))
            }
            placeholder="Örn: 10"
            maxLength={2}
          />
        </View>
      </View>

      <Text style={styles.label}>Unvan</Text>
      <View
        style={{
          flexDirection: "row",
          gap: 10,
          marginBottom: 20,
          flexWrap: "wrap",
        }}
      >
        {["Öğretmen", "Uzman Öğretmen", "Başöğretmen"].map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.titleBadge, tTitle === t && styles.titleBadgeActive]}
            onPress={() => setTTitle(t)}
          >
            <Text
              style={{
                color: tTitle === t ? "#FFF" : "#4B5563",
                fontWeight: "bold",
              }}
            >
              {t}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Kullanılan İzin (Yıllık 30 Gün)</Text>
      {/* 🛡️ İZİN: Sadece 3 hane rakam */}
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        value={tUsedLeaveDays}
        onChangeText={(text) => setTUsedLeaveDays(text.replace(/[^0-9]/g, ""))}
        placeholder="Örn: 5"
        maxLength={3}
      />

      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: 15,
          marginBottom: 10,
        }}
      >
        <Text style={styles.label}>Kulüp Danışmanlığı</Text>
        <TouchableOpacity
          onPress={() => setIsAddingClub(true)}
          style={styles.addClubBtnSmall}
        >
          <Ionicons name="add-circle" size={18} color="#10B981" />
          <Text style={styles.addClubBtnText}>Yeni Kulüp</Text>
        </TouchableOpacity>
      </View>

      {isAddingClub && (
        <View style={styles.newClubContainer}>
          <TextInput
            style={[styles.input, { flex: 1, marginBottom: 0, height: 45 }]}
            placeholder="Kulüp Adı"
            value={newClubName}
            onChangeText={setNewClubName}
          />
          <TouchableOpacity
            style={styles.confirmClubBtn}
            onPress={handleAddNewClub}
          >
            <Text style={{ color: "white", fontWeight: "bold" }}>Ekle</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.cancelClubBtn}
            onPress={() => setIsAddingClub(false)}
          >
            <Ionicons name="close" size={24} color="#EF4444" />
          </TouchableOpacity>
        </View>
      )}

      <View
        style={{
          flexDirection: "row",
          gap: 10,
          marginBottom: 20,
          flexWrap: "wrap",
        }}
      >
        {displayClubs.map((c) => {
          const isTaken = assignedClubs.includes(c);
          const isSelected = tClub === c;
          return (
            <TouchableOpacity
              key={c}
              disabled={isTaken && !isSelected}
              style={[
                styles.clubBtn,
                isSelected && styles.clubBtnActive,
                isTaken && !isSelected && styles.clubBtnTaken,
              ]}
              onPress={() => setTClub(isSelected ? "" : c)}
            >
              <Text
                style={[
                  styles.clubBtnText,
                  isSelected && styles.clubBtnTextActive,
                  isTaken && !isSelected && styles.clubBtnTextTaken,
                ]}
              >
                {c}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={[styles.sectionHeader, { marginTop: 10 }]}>
        İletişim & Nöbet
      </Text>
      {/* 🛡️ TELEFON: Sadece 11 rakam */}
      <TextInput
        style={styles.input}
        placeholder="Telefon (Örn: 05xx)"
        value={tPhone}
        onChangeText={(text) => setTPhone(text.replace(/[^0-9]/g, ""))}
        keyboardType="phone-pad"
        maxLength={11}
      />

      <View style={{ zIndex: 2000, marginBottom: 15, marginTop: 10 }}>
        <CustomDropdown
          placeholder="Nöbet Günü Seçiniz"
          options={dutyDays}
          value={tDutyDay}
          onSelect={setTDutyDay}
        />
      </View>

      {tDutyDay !== "" && tDutyDay !== "Yok" && (
        <View style={{ zIndex: 1000, marginBottom: 15 }}>
          <CustomDropdown
            placeholder="Nöbet Yeri"
            options={dutyLocations}
            value={tDutyLocation}
            onSelect={setTDutyLocation}
          />
        </View>
      )}

      {tDutyLocation === "Diğer..." && (
        <TextInput
          style={[styles.input, { borderColor: "#007AFF", borderWidth: 2 }]}
          placeholder="Özel Nöbet Yeri"
          value={customDutyLocation}
          onChangeText={setCustomDutyLocation}
        />
      )}

      <TextInput
        style={[styles.input, { height: 80, textAlignVertical: "top" }]}
        placeholder="Adres"
        value={tAddress}
        onChangeText={setTAddress}
        multiline
      />

      <Pressable style={styles.saveBtn} onPress={handleSave}>
        <Text style={styles.btnText}>Personeli Kaydet</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#f0f2f5" },
  sectionHeader: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: "white",
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#ddd",
    fontSize: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#4B5563",
    marginBottom: 5,
  },
  dynamicBox: {
    backgroundColor: "#EEF2FF",
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#C7D2FE",
  },
  dynamicLabel: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#4338CA",
    marginBottom: 8,
  },
  radioBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#FFF",
  },
  radioBtnActive: { backgroundColor: "#3B82F6", borderColor: "#3B82F6" },
  avatarSection: { alignItems: "center", marginBottom: 25 },
  avatarContainer: { position: "relative" },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: "#E5E7EB",
  },
  avatarPlaceholder: {
    backgroundColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
  },
  editBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#4F46E5",
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#FFF",
  },
  avatarHint: {
    marginTop: 10,
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "bold",
  },
  addClubBtnSmall: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#D1FAE5",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addClubBtnText: {
    color: "#10B981",
    fontWeight: "bold",
    fontSize: 13,
    marginLeft: 4,
  },
  newClubContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  confirmClubBtn: {
    backgroundColor: "#10B981",
    paddingHorizontal: 15,
    height: 45,
    justifyContent: "center",
    borderRadius: 10,
    marginLeft: 10,
  },
  cancelClubBtn: {
    paddingHorizontal: 10,
    height: 45,
    justifyContent: "center",
  },
  titleBadge: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#E5E7EB",
  },
  titleBadgeActive: { backgroundColor: "#3B82F6" },
  saveBtn: {
    backgroundColor: "#34C759",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
    marginBottom: 50,
  },
  btnText: { color: "white", fontWeight: "bold", fontSize: 16 },
  clubBtn: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#E5E7EB",
    borderWidth: 1,
    borderColor: "transparent",
  },
  clubBtnActive: { backgroundColor: "#3B82F6" },
  clubBtnTaken: { backgroundColor: "#F3F4F6", borderColor: "#D1D5DB" },
  clubBtnText: { color: "#4B5563", fontWeight: "bold" },
  clubBtnTextActive: { color: "#FFF" },
  clubBtnTextTaken: { color: "#9CA3AF", textDecorationLine: "line-through" },
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
});
