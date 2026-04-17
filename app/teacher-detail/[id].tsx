import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  Alert,
  Modal,
  Platform,
  Image,
  TouchableOpacity,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTeachers } from "../../context/TeacherContext";
import { useAuth } from "../../context/AuthContext";
import { Lesson } from "../../constants/types";
import CustomDropdown from "../../components/CustomDropdown";
import MapView, { Marker } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import * as SMS from "expo-sms";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Animated, { FadeInUp } from "react-native-reanimated";
import QRCode from "react-native-qrcode-svg";
import * as Brightness from "expo-brightness";
import * as ImagePicker from "expo-image-picker";
import * as Contacts from "expo-contacts";
import Toast from "react-native-toast-message";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default function DetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const {
    teachers,
    deleteTeacher,
    updateTeacher,
    addLesson,
    updateLesson,
    deleteLesson,
  } = useTeachers();
  const { user } = useAuth();

  const teacher = teachers.find((t) => t.id === id);
  const isTopManagement =
    user &&
    ["Müdür", "Müdür Baş Yardımcısı", "Müdür Yardımcısı"].includes(user.role);

  const getRolePower = (role: string | undefined) => {
    switch (role) {
      case "Müdür":
        return 100;
      case "Müdür Baş Yardımcısı":
        return 80;
      case "Müdür Yardımcısı":
        return 60;
      case "Memur":
        return 40;
      case "Öğretmen":
        return 20;
      default:
        return 0;
    }
  };

  const myPower = user ? getRolePower(user.role) : 0;
  const targetPower = getRolePower(teacher?.role);
  const hasPermission = myPower > targetPower;

  const initialDutyDay =
    teacher?.duty && teacher.duty.includes(" - ")
      ? teacher.duty.split(" - ")[0]
      : teacher?.duty || "Yok";
  const rawDutyLocation =
    teacher?.duty && teacher.duty.includes(" - ")
      ? teacher.duty.split(" - ")[1]
      : "";

  const standardLocations = [
    "Bahçe",
    "Zemin Kat",
    "1. Kat",
    "2. Kat",
    "3. Kat",
  ];
  let initDropLocation = "";
  let initCustomLocation = "";

  if (rawDutyLocation) {
    if (standardLocations.includes(rawDutyLocation)) {
      initDropLocation = rawDutyLocation;
    } else {
      initDropLocation = "Diğer...";
      initCustomLocation = rawDutyLocation;
    }
  }

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [mapVisible, setMapVisible] = useState(false);
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [originalBrightness, setOriginalBrightness] = useState<number | null>(
    null,
  );

  const [tName, setTName] = useState(teacher?.name || "");
  const [tSurname, setTSurname] = useState(teacher?.surname || "");
  const [tTcNo, setTTcNo] = useState(teacher?.tcNo || "");

  const [tGender, setTGender] = useState(teacher?.gender || "");
  const [tMaritalStatus, setTMaritalStatus] = useState(
    teacher?.maritalStatus || "",
  );

  const [tSpouseInstitution, setTSpouseInstitution] = useState(
    teacher?.spouseInstitution || "",
  );
  const [tChildrenCount, setTChildrenCount] = useState(
    teacher?.childrenCount?.toString() || "",
  );
  const [tIsOnMaternityLeave, setTIsOnMaternityLeave] = useState<boolean>(
    teacher?.isOnMaternityLeave || false,
  );

  const [tBranch, setTBranch] = useState(teacher?.branch || "");
  const [tRole, setTRole] = useState(teacher?.role || "");
  const [tPhone, setTPhone] = useState(teacher?.phone || "");
  const [tAddress, setTAddress] = useState(teacher?.address || "");
  const [tAvatar, setTAvatar] = useState(teacher?.avatar || "");

  const [tDutyDay, setTDutyDay] = useState(initialDutyDay);
  const [tDutyLocation, setTDutyLocation] = useState(initDropLocation);
  const [customDutyLocation, setCustomDutyLocation] =
    useState(initCustomLocation);

  const [tAge, setTAge] = useState(teacher?.age?.toString() || "");
  const [tSeniorityYear, setTSeniorityYear] = useState(
    teacher?.seniorityYear?.toString() || "",
  );
  const [tTitle, setTTitle] = useState(teacher?.title || "Öğretmen");
  const [tUsedLeaveDays, setTUsedLeaveDays] = useState(
    teacher?.usedLeaveDays?.toString() || "0",
  );

  const [tClub, setTClub] = useState(teacher?.club || "Yok");
  const [isAddingClub, setIsAddingClub] = useState(false);
  const [newClubName, setNewClubName] = useState("");
  const [customClubs, setCustomClubs] = useState<string[]>([]);

  const [tInspectorScore, setTInspectorScore] = useState(
    teacher?.inspectorScore?.toString() || "",
  );
  const [tInspectorNotes, setTInspectorNotes] = useState(
    teacher?.inspectorNotes || "",
  );
  const [tAwards, setTAwards] = useState(teacher?.awards || "");
  const [tPenalties, setTPenalties] = useState(teacher?.penalties || "");

  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [lessonDay, setLessonDay] = useState("");
  const [lessonTime, setLessonTime] = useState("");
  const [lessonClass, setLessonClass] = useState("");
  const [lessonBranch, setLessonBranch] = useState("");
  const [lessonProgress, setLessonProgress] = useState("");

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
  const titleOptions = ["Öğretmen", "Uzman Öğretmen", "Başöğretmen"];

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
  const assignedClubs = teachers
    .filter((t) => t.id !== teacher?.id)
    .map((t) => t.club)
    .filter(Boolean) as string[];
  const displayClubs = Array.from(
    new Set([...defaultClubs, ...existingClubs, ...customClubs]),
  );

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
      if (Device.isDevice || Platform.OS === "android") {
        const { status: existingStatus } =
          await Notifications.getPermissionsAsync();
        if (existingStatus !== "granted") {
          await Notifications.requestPermissionsAsync();
        }
      }
    }
    setupNotifications();
  }, []);

  if (!teacher) return <Text style={{ padding: 20 }}>Personel Bulunamadı</Text>;

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      return Alert.alert(
        "İzin Reddedildi",
        "Profil fotoğrafını güncellemek için galeri erişim izni gereklidir.",
        [
          { text: "İptal", style: "cancel" },
          { text: "Ayarlara Git", onPress: () => Linking.openSettings() },
        ],
      );
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

  const openQRModal = async () => {
    try {
      const { status } = await Brightness.requestPermissionsAsync();
      if (status === "granted") {
        const current = await Brightness.getBrightnessAsync();
        setOriginalBrightness(current);
        await Brightness.setBrightnessAsync(1);
      }
    } catch (error) {
      console.log("Parlaklık sensörü desteklenmiyor.");
    }
    setQrModalVisible(true);
  };

  const closeQRModal = async () => {
    if (originalBrightness !== null)
      await Brightness.setBrightnessAsync(originalBrightness);
    setQrModalVisible(false);
  };

  const qrData = JSON.stringify({
    id: teacher.id,
    isim: `${teacher.name} ${teacher.surname}`,
    rol: teacher.role,
  });
  const defaultAvatar = `https://ui-avatars.com/api/?name=${teacher.name}+${teacher.surname}&background=007AFF&color=fff&size=300`;

  const handleCall = () => {
    if (!teacher.phone) return Alert.alert("Hata", "Kayıtlı telefon yok.");
    Linking.openURL(`tel:${teacher.phone}`);
  };

  const handleSMS = async () => {
    if (!teacher.phone) return Alert.alert("Hata", "Kayıtlı telefon yok.");
    const isAvailable = await SMS.isAvailableAsync();
    if (isAvailable)
      await SMS.sendSMSAsync(
        [teacher.phone],
        `Merhaba ${teacher.name} Hocam, `,
      );
    else Alert.alert("Hata", "SMS özelliği bulunmuyor.");
  };

  const handleWhatsApp = async () => {
    if (!teacher.phone) return Alert.alert("Hata", "Kayıtlı telefon yok.");
    const cleanPhone = teacher.phone.replace(/[^0-9]/g, "");
    const formattedPhone =
      cleanPhone.length === 10 ? `90${cleanPhone}` : cleanPhone;
    const url = `whatsapp://send?phone=${formattedPhone}&text=Sayın ${teacher.name} Hocam, `;

    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      Linking.openURL(url);
    } else {
      Alert.alert("Hata", "Cihazınızda WhatsApp yüklü değil.");
    }
  };

  const handleSaveContact = async () => {
    if (!teacher.phone) return Alert.alert("Hata", "Kayıtlı telefon yok.");
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== "granted") {
        return Alert.alert(
          "İzin Gerekli",
          "Rehbere kişi eklemek için izin vermelisiniz.",
          [
            { text: "İptal", style: "cancel" },
            { text: "Ayarlara Git", onPress: () => Linking.openSettings() },
          ],
        );
      }

      // 🔥 TypeScript Hatası Çözüldü
      const contact = {
        contactType: Contacts.ContactTypes.Person,
        name: `${teacher.name} ${teacher.surname}`,
        [Contacts.Fields.FirstName]: teacher.name,
        [Contacts.Fields.LastName]: teacher.surname,
        [Contacts.Fields.PhoneNumbers]: [
          {
            label: "mobile",
            number: teacher.phone,
          },
        ],
        [Contacts.Fields.Company]: "Okul+",
        [Contacts.Fields.JobTitle]:
          teacher.role && teacher.role !== "Öğretmen"
            ? teacher.role
            : `${teacher.branch} Öğretmeni`,
      } as Contacts.Contact;

      await Contacts.addContactAsync(contact);
      Toast.show({
        type: "success",
        text1: "Rehbere Kaydedildi 📇",
        text2: `${teacher.name} telefonunuzun rehberine eklendi.`,
      });
    } catch (error) {
      Alert.alert("Hata", "Kişi kaydedilirken bir hata oluştu.");
    }
  };

  const handleUpdateTeacher = async () => {
    const cleanName = tName.trim();
    const cleanSurname = tSurname.trim();
    const cleanPhone = tPhone.replace(/\s/g, "");
    const cleanTc = tTcNo.trim();

    const alphaRegex = /^[a-zA-ZğüşıöçĞÜŞİÖÇ\s]+$/;
    const formatPascalCase = (str: string) =>
      str
        .toLocaleLowerCase("tr-TR")
        .split(" ")
        .map((s) => s.charAt(0).toLocaleUpperCase("tr-TR") + s.slice(1))
        .join(" ");

    if (
      !cleanName ||
      !cleanSurname ||
      !cleanTc ||
      !tGender ||
      !tMaritalStatus
    ) {
      return Toast.show({
        type: "error",
        text1: "Hata ⚠️",
        text2: "Zorunlu alanları boş bırakamazsınız.",
      });
    }

    if (!alphaRegex.test(cleanName) || !alphaRegex.test(cleanSurname)) {
      return Toast.show({
        type: "error",
        text1: "Geçersiz Karakter",
        text2: "Ad ve Soyad sadece harflerden oluşmalıdır.",
      });
    }

    if (cleanTc.length !== 11 || isNaN(Number(cleanTc))) {
      return Toast.show({
        type: "error",
        text1: "TC No Geçersiz",
        text2: "TC Kimlik Numarası tam olarak 11 haneli rakam olmalıdır.",
      });
    }

    let finalDuty = teacher.duty;
    if (isTopManagement) {
      if (tDutyDay && tDutyDay !== "Yok") {
        const actualLocation =
          tDutyLocation === "Diğer..."
            ? customDutyLocation.trim()
            : tDutyLocation;
        if (!tDutyLocation || !actualLocation)
          return Alert.alert("Eksik Bilgi", "Nöbet yerini tam belirleyin!");
        finalDuty = `${tDutyDay} - ${actualLocation}`;

        if (
          teachers.some(
            (t) =>
              t.id !== teacher.id &&
              t.duty?.toLowerCase() === finalDuty.toLowerCase(),
          )
        ) {
          return Alert.alert(
            "Nöbet Kotası Dolu ⚠️",
            `${finalDuty} bölgesinde zaten görevli var!`,
          );
        }
      } else {
        finalDuty = "";
      }
    }

    const finalName = formatPascalCase(cleanName);
    const finalSurname = cleanSurname.toLocaleUpperCase("tr-TR");

    updateTeacher({
      ...teacher,
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
      duty: finalDuty,
      address: tAddress.trim(),
      avatar: tAvatar.trim(),
      age: tAge ? parseInt(tAge) : 0,
      seniorityYear: tSeniorityYear ? parseInt(tSeniorityYear) : 0,
      title: tTitle,
      usedLeaveDays: tUsedLeaveDays ? parseInt(tUsedLeaveDays) : 0,
      club: tClub === "Yok" ? "" : tClub,
      inspectorScore: tInspectorScore ? parseInt(tInspectorScore) : 0,
      inspectorNotes: tInspectorNotes.trim(),
      awards: tAwards.trim(),
      penalties: tPenalties.trim(),
    });

    await Notifications.scheduleNotificationAsync({
      content: {
        title: "✏️ Personel Güncellendi",
        body: `${finalName} bilgileri güncellendi.`,
        sound: true,
      },
      trigger: null,
    });

    setEditModalVisible(false);
    Toast.show({
      type: "success",
      text1: "Güncelleme Başarılı ✨",
      text2: "Değişiklikler kaydedildi.",
    });
  };

  const handleDeleteTeacher = () => {
    if (!hasPermission)
      return Alert.alert("Yetkisiz İşlem", "Yetkiniz buna yetmiyor!");
    const performDelete = async () => {
      router.replace("/(drawer)/(dashboard)/list" as any);
      setTimeout(() => {
        deleteTeacher(teacher.id);
      }, 50);
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "🗑️ Personel Silindi",
          body: `${teacher.name} sistemden silindi.`,
          sound: true,
        },
        trigger: null,
      });

      Toast.show({
        type: "info",
        text1: "🗑️ Personel Silindi",
        text2: `${teacher.name} ${teacher.surname} sistemden başarıyla kaldırıldı.`,
        visibilityTime: 3000,
      });
    };

    if (Platform.OS === "web") {
      if (window.confirm("Emin misiniz?")) performDelete();
    } else {
      Alert.alert(
        "Emin misiniz?",
        "Personeli silmek istediğinize emin misiniz?",
        [
          { text: "İptal", style: "cancel" },
          { text: "Sil", style: "destructive", onPress: performDelete },
        ],
      );
    }
  };

  const handleSaveLesson = async () => {
    if (!lessonDay || !lessonTime || !lessonClass || !lessonBranch)
      return Alert.alert("Hata", "Tüm alanları girin.");
    if (lessonBranch.toLowerCase() !== teacher.branch.toLowerCase())
      return Alert.alert("Kural İhlali ⚠️", `${lessonBranch} dersine giremez!`);

    const isConflict = teacher.lessons.some((lesson) => {
      if (editingLessonId && lesson.id === editingLessonId) return false;
      return (
        lesson.day.trim().toLowerCase() === lessonDay.trim().toLowerCase() &&
        lesson.time.trim() === lessonTime.trim()
      );
    });
    if (isConflict)
      return Alert.alert("Zaman Çakışması ⚠️", "Bu saatte dersi var!");

    const progressValue = lessonProgress ? parseInt(lessonProgress) : 0;
    const finalProgress =
      progressValue > 100 ? 100 : progressValue < 0 ? 0 : progressValue;

    if (editingLessonId) {
      updateLesson(teacher.id, {
        id: editingLessonId,
        day: lessonDay,
        time: lessonTime,
        className: lessonClass,
        branch: lessonBranch,
        curriculumProgress: finalProgress,
      });
      setEditingLessonId(null);
    } else {
      addLesson(teacher.id, {
        id: Date.now().toString(),
        day: lessonDay,
        time: lessonTime,
        className: lessonClass,
        branch: lessonBranch,
        curriculumProgress: finalProgress,
      });
    }
    setLessonDay("");
    setLessonTime("");
    setLessonClass("");
    setLessonBranch("");
    setLessonProgress("");

    Toast.show({
      type: "success",
      text1: "Ders Eklendi",
      text2: "Ders programı başarıyla kaydedildi.",
    });
  };

  const handleDeleteLesson = (
    lessonId: string,
    lessonDay: string,
    lessonTime: string,
  ) => {
    Alert.alert("Dersi Sil", "Emin misiniz?", [
      { text: "İptal", style: "cancel" },
      {
        text: "Sil",
        style: "destructive",
        onPress: async () => {
          deleteLesson(teacher.id, lessonId);
          await Notifications.scheduleNotificationAsync({
            content: {
              title: "➖ Ders Silindi",
              body: `${lessonDay} ${lessonTime} dersi iptal edildi.`,
              sound: true,
            },
            trigger: null,
          });

          Toast.show({
            type: "info",
            text1: "Ders Programdan Çıkarıldı",
            text2: `${lessonDay} günü saat ${lessonTime} dersi başarıyla silindi.`,
          });
        },
      },
    ]);
  };

  const openEditLesson = (lesson: Lesson) => {
    setEditingLessonId(lesson.id);
    setLessonDay(lesson.day);
    setLessonTime(lesson.time);
    setLessonClass(lesson.className);
    setLessonBranch(lesson.branch);
    setLessonProgress(
      lesson.curriculumProgress ? lesson.curriculumProgress.toString() : "",
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.infoCard}>
        <View style={styles.avatarContainer}>
          <Image
            source={{ uri: teacher.avatar || defaultAvatar }}
            style={styles.largeAvatar}
          />
          <Text style={styles.name}>
            {teacher.name} {teacher.surname}
          </Text>
          <Text style={styles.roleBadge}>
            {teacher.role && teacher.role !== "Öğretmen"
              ? teacher.role
              : `${teacher.branch} Öğretmeni`}
          </Text>
          {teacher.role && teacher.role !== "Öğretmen" && (
            <Text style={styles.subBranch}>Branş: {teacher.branch}</Text>
          )}

          {teacher.gender === "Kadın" && teacher.isOnMaternityLeave && (
            <View style={styles.maternityBadge}>
              <Text style={styles.maternityBadgeText}>🤰 Doğum İzninde</Text>
            </View>
          )}
        </View>

        <View style={[styles.infoRow, { alignItems: "center" }]}>
          <Text style={styles.label}>🪪 TC Kimlik No:</Text>
          <Text style={{ fontWeight: "bold", color: "#333", fontSize: 16 }}>
            {teacher.tcNo
              ? isTopManagement
                ? teacher.tcNo
                : "***********"
              : "Girilmeli"}
          </Text>
        </View>

        {/* 🔥 GÜNCELLENDİ: Taşan Telefon ve Butonlar İçin Altlı-Üstlü Ferah Yerleşim */}
        <View
          style={[
            styles.infoRow,
            { flexDirection: "column", alignItems: "flex-start", gap: 10 },
          ]}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              width: "100%",
              alignItems: "center",
            }}
          >
            <Text style={styles.label}>📞 Telefon:</Text>
            <Text style={{ fontWeight: "bold", color: "#333", fontSize: 16 }}>
              {teacher.phone || "-"}
            </Text>
          </View>

          {teacher.phone ? (
            <View
              style={{
                flexDirection: "row",
                justifyContent: "flex-end",
                width: "100%",
                gap: 12,
              }}
            >
              <Pressable style={styles.actionBtn} onPress={handleCall}>
                <Ionicons name="call" size={16} color="white" />
              </Pressable>
              <Pressable
                style={[styles.actionBtn, { backgroundColor: "#FF9500" }]}
                onPress={handleSMS}
              >
                <Ionicons name="chatbubble-ellipses" size={16} color="white" />
              </Pressable>
              <Pressable
                style={[styles.actionBtn, { backgroundColor: "#25D366" }]}
                onPress={handleWhatsApp}
              >
                <Ionicons name="logo-whatsapp" size={16} color="white" />
              </Pressable>
              <Pressable
                style={[styles.actionBtn, { backgroundColor: "#007AFF" }]}
                onPress={handleSaveContact}
              >
                <Ionicons name="person-add" size={16} color="white" />
              </Pressable>
            </View>
          ) : null}
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>🛡️ Nöbet:</Text>
          <Text>{teacher.duty || "-"}</Text>
        </View>

        <View
          style={[
            styles.infoRow,
            { alignItems: "center", borderBottomWidth: 0 },
          ]}
        >
          <Text style={styles.label}>📍 Adres:</Text>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              flex: 1,
              justifyContent: "flex-end",
            }}
          >
            <Text style={{ marginRight: 10, flexShrink: 1 }} numberOfLines={2}>
              {teacher.address || "-"}
            </Text>
            {teacher.address ? (
              <Pressable
                style={styles.mapBtn}
                onPress={() => setMapVisible(true)}
              >
                <Ionicons name="map-outline" size={16} color="white" />
                <Text style={styles.mapBtnText}>Haritada Gör</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>

      <Animated.View entering={FadeInUp.delay(100)} style={styles.hrCard}>
        <View style={styles.cardHeader}>
          <Ionicons name="person-circle-outline" size={24} color="#10B981" />
          <Text style={styles.cardTitle}>Özlük Hakları & İK</Text>
        </View>
        <View style={styles.hrRow}>
          <Text style={styles.hrLabel}>Unvan:</Text>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            {teacher.isDepartmentHead && (
              <Text style={{ fontSize: 16, marginRight: 5 }}>👑</Text>
            )}
            <View style={styles.titleBadge}>
              <Text style={styles.titleBadgeText}>
                {teacher.title || "Öğretmen"}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.hrRow}>
          <Text style={styles.hrLabel}>Durum:</Text>
          <Text style={styles.hrValue}>
            {teacher.gender || "-"} / {teacher.maritalStatus || "-"}
          </Text>
        </View>

        {teacher.maritalStatus === "Evli" && (
          <>
            <View style={styles.hrRow}>
              <Text style={styles.hrLabel}>Eşinin Kurumu / İli:</Text>
              <Text style={styles.hrValue}>
                {teacher.spouseInstitution || "Belirtilmedi"}
              </Text>
            </View>
            <View style={styles.hrRow}>
              <Text style={styles.hrLabel}>Çocuk Yardımı (Çocuk Sayısı):</Text>
              <Text
                style={[
                  styles.hrValue,
                  { color: teacher.childrenCount ? "#007AFF" : "#666" },
                ]}
              >
                {teacher.childrenCount
                  ? `${teacher.childrenCount} Çocuk`
                  : "Yok"}
              </Text>
            </View>
          </>
        )}

        <View style={styles.hrRow}>
          <Text style={styles.hrLabel}>Yaş / Kıdem:</Text>
          <Text style={styles.hrValue}>
            {teacher.age ? `${teacher.age} Yaş` : "-"} /{" "}
            {teacher.seniorityYear ? `${teacher.seniorityYear} Yıl` : "-"}
          </Text>
        </View>
        <View style={styles.hrRow}>
          <Text style={styles.hrLabel}>Emeklilik (65 Yaş):</Text>
          <View style={{ alignItems: "flex-end" }}>
            {teacher.age ? (
              teacher.age >= 65 ? (
                <Text style={[styles.hrValue, { color: "#34C759" }]}>
                  Hak Kazandı 🎉
                </Text>
              ) : (
                <Text style={[styles.hrValue, { color: "#007AFF" }]}>
                  {65 - teacher.age} Yıl Kaldı
                </Text>
              )
            ) : (
              <Text
                style={[
                  styles.hrValue,
                  { color: "#9CA3AF", fontSize: 13, fontStyle: "italic" },
                ]}
              >
                Yaş girilmedi
              </Text>
            )}
          </View>
        </View>
        <View style={styles.hrRow}>
          <Text style={styles.hrLabel}>Kulüp Danışmanlığı:</Text>
          <Text
            style={[
              styles.hrValue,
              {
                color: teacher.club ? "#007AFF" : "#666",
                fontWeight: teacher.club ? "bold" : "normal",
              },
            ]}
          >
            {teacher.club || "Atanmadı"}
          </Text>
        </View>
        <View
          style={[styles.hrRow, { borderBottomWidth: 0, paddingBottom: 0 }]}
        >
          <Text style={styles.hrLabel}>İzin / Rapor Durumu:</Text>
          <View style={{ alignItems: "flex-end" }}>
            {(teacher.usedLeaveDays || 0) > 30 ? (
              <>
                <Text style={[styles.hrValue, { color: "#FF3B30" }]}>
                  Raporlu / Kota Aşıldı
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    color: "#FF3B30",
                    marginTop: 2,
                    fontWeight: "bold",
                  }}
                >
                  Yıllık izne ek +{(teacher.usedLeaveDays || 0) - 30} gün rapor
                </Text>
              </>
            ) : (
              <>
                <Text
                  style={[
                    styles.hrValue,
                    {
                      color:
                        30 - (teacher.usedLeaveDays || 0) < 10
                          ? "#FF3B30"
                          : "#34C759",
                    },
                  ]}
                >
                  {30 - (teacher.usedLeaveDays || 0)} Gün Kaldı
                </Text>
                <Text style={{ fontSize: 12, color: "#999", marginTop: 2 }}>
                  Toplam 30 günden {teacher.usedLeaveDays || 0} gün kullanıldı
                </Text>
              </>
            )}
          </View>
        </View>
      </Animated.View>

      <Animated.View
        entering={FadeInUp.delay(150)}
        style={styles.inspectorCard}
      >
        <View style={styles.cardHeader}>
          <Ionicons name="shield-checkmark-outline" size={24} color="#F59E0B" />
          <Text style={[styles.cardTitle, { color: "#92400E" }]}>
            Müfettiş Değerlendirmesi
          </Text>
        </View>
        <View style={styles.inspectorRow}>
          <Text style={styles.inspectorLabel}>Performans Puanı:</Text>
          <View
            style={[
              styles.scoreBadge,
              {
                backgroundColor:
                  (teacher.inspectorScore || 0) >= 85
                    ? "#D1FAE5"
                    : (teacher.inspectorScore || 0) >= 70
                      ? "#FEF3C7"
                      : "#FEE2E2",
              },
            ]}
          >
            <Text
              style={[
                styles.scoreText,
                {
                  color:
                    (teacher.inspectorScore || 0) >= 85
                      ? "#059669"
                      : (teacher.inspectorScore || 0) >= 70
                        ? "#D97706"
                        : "#DC2626",
                },
              ]}
            >
              {teacher.inspectorScore
                ? `${teacher.inspectorScore} / 100`
                : "Puan Girilmedi"}
            </Text>
          </View>
        </View>
        {teacher.inspectorNotes ? (
          <View style={styles.notesBox}>
            <Text style={styles.notesTitle}>Değerlendirme Notu:</Text>
            <Text style={styles.notesText}>{teacher.inspectorNotes}</Text>
          </View>
        ) : null}
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(180)} style={styles.awardsCard}>
        <View style={styles.cardHeader}>
          <Ionicons name="ribbon-outline" size={24} color="#14ef26" />
          <Text style={[styles.cardTitle, { color: "#1fc216" }]}>
            Ödül & Disiplin Kayıtları
          </Text>
        </View>
        <View style={styles.recordBox}>
          <Text style={[styles.notesTitle, { color: "#059669" }]}>
            🏆 Başarı & Ödüller:
          </Text>
          <Text style={[styles.notesText, { color: "#064E3B" }]}>
            {teacher.awards || "Sistemde kayıtlı ödül bulunmuyor."}
          </Text>
        </View>
        <View
          style={[
            styles.recordBox,
            {
              backgroundColor: "#FEF2F2",
              borderColor: "#FECACA",
              marginTop: 10,
            },
          ]}
        >
          <Text style={[styles.notesTitle, { color: "#DC2626" }]}>
            ⚠️ Disiplin / Uyarı Kayıtları:
          </Text>
          <Text style={[styles.notesText, { color: "#7F1D1D" }]}>
            {teacher.penalties ||
              "Sistemde kayıtlı disiplin cezası bulunmuyor."}
          </Text>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(200)} style={styles.qrCard}>
        <View style={styles.cardHeader}>
          <Ionicons name="qr-code-outline" size={24} color="#34C759" />
          <Text style={styles.cardTitle}>Dijital Kimlik & Yoklama</Text>
        </View>
        <Text style={styles.cardDesc}>
          Cihaz sensörleri aktif. QR kodu büyüttüğünüzde ekran parlaklığı
          maksimum seviyeye çıkacaktır.
        </Text>
        <Pressable style={styles.qrPreviewBtn} onPress={openQRModal}>
          <QRCode value={qrData} size={80} />
          <View style={styles.qrPreviewTextContainer}>
            <Text style={styles.qrPreviewTitle}>QR Kodu Büyüt</Text>
            <Text style={styles.qrPreviewSub}>
              Okula giriş yapmak için dokunun.
            </Text>
          </View>
          <Ionicons name="expand-outline" size={24} color="#666" />
        </Pressable>
      </Animated.View>

      <View style={styles.scheduleCard}>
        <Text style={styles.title}>📅 Ders & Müfredat Programı</Text>
        {isTopManagement && (
          <>
            <View style={styles.formRow}>
              <TextInput
                style={styles.input}
                placeholder="Gün (Pzt)"
                value={lessonDay}
                onChangeText={setLessonDay}
              />
              <TextInput
                style={styles.input}
                placeholder="Saat"
                value={lessonTime}
                onChangeText={setLessonTime}
              />
              <TextInput
                style={styles.input}
                placeholder="Sınıf"
                value={lessonClass}
                onChangeText={setLessonClass}
              />
            </View>
            <View
              style={{
                flexDirection: "row",
                gap: 10,
                marginBottom: 15,
                zIndex: 1000,
              }}
            >
              <View style={{ flex: 2 }}>
                <CustomDropdown
                  placeholder="Branş Seçin"
                  options={branchOptions}
                  value={lessonBranch}
                  onSelect={setLessonBranch}
                />
              </View>
              {editingLessonId && (
                <View style={{ flex: 1 }}>
                  <TextInput
                    style={styles.input}
                    placeholder="% İlerleme"
                    keyboardType="numeric"
                    value={lessonProgress}
                    onChangeText={setLessonProgress}
                  />
                </View>
              )}
            </View>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Pressable
                style={[styles.addBtn, { flex: 1 }]}
                onPress={handleSaveLesson}
              >
                <Text style={{ color: "white", fontWeight: "bold" }}>
                  {editingLessonId ? "Dersi Güncelle" : "+ Ders Ekle"}
                </Text>
              </Pressable>
              {editingLessonId && (
                <Pressable
                  style={[styles.addBtn, { backgroundColor: "#666" }]}
                  onPress={() => {
                    setEditingLessonId(null);
                    setLessonDay("");
                    setLessonTime("");
                    setLessonClass("");
                    setLessonBranch("");
                    setLessonProgress("");
                  }}
                >
                  <Text style={{ color: "white", fontWeight: "bold" }}>
                    İptal
                  </Text>
                </Pressable>
              )}
            </View>
          </>
        )}

        {teacher.lessons.map((lesson) => (
          <View key={lesson.id} style={styles.lessonItem}>
            <View style={{ flex: 1 }}>
              <Text style={styles.lessonTime}>
                {lesson.day} - {lesson.time}
              </Text>
              <Text style={styles.lessonSubject}>
                {lesson.className} - {lesson.branch} Dersi
              </Text>
              <View style={styles.progressContainer}>
                <View style={styles.progressBarBg}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${lesson.curriculumProgress || 0}%`,
                        backgroundColor:
                          (lesson.curriculumProgress || 0) >= 80
                            ? "#10B981"
                            : (lesson.curriculumProgress || 0) >= 40
                              ? "#F59E0B"
                              : "#EF4444",
                      },
                    ]}
                  />
                </View>
                <Text style={styles.progressText}>
                  Müfredat: %{lesson.curriculumProgress || 0}
                </Text>
              </View>
            </View>
            {isTopManagement && (
              <View style={{ flexDirection: "row", gap: 8, marginLeft: 10 }}>
                <Pressable
                  style={styles.smallEditBtn}
                  onPress={() => openEditLesson(lesson)}
                >
                  <Text style={styles.smallBtnText}>Düzenle</Text>
                </Pressable>
                <Pressable
                  style={styles.smallDeleteBtn}
                  onPress={() =>
                    handleDeleteLesson(lesson.id, lesson.day, lesson.time)
                  }
                >
                  <Text style={styles.smallBtnText}>Sil</Text>
                </Pressable>
              </View>
            )}
          </View>
        ))}
      </View>

      {hasPermission && (
        <View style={{ flexDirection: "row", gap: 10, marginBottom: 40 }}>
          <Pressable
            style={[styles.btn, { backgroundColor: "#FF9500" }]}
            onPress={() => setEditModalVisible(true)}
          >
            <Text style={styles.btnText}>Personeli Düzenle</Text>
          </Pressable>
          <Pressable
            style={[styles.btn, { backgroundColor: "#FF3B30" }]}
            onPress={handleDeleteTeacher}
          >
            <Text style={styles.btnText}>Personeli Sil</Text>
          </Pressable>
        </View>
      )}

      {/* DÜZENLEME MODALI */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={editModalVisible}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Kişiyi Düzenle</Text>
            <ScrollView
              style={{ width: "100%", maxHeight: 550 }}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.sectionDivider}>Temel Bilgiler</Text>

              <View
                style={{
                  alignItems: "center",
                  marginBottom: 15,
                  marginTop: 10,
                }}
              >
                <TouchableOpacity
                  onPress={pickImage}
                  activeOpacity={0.8}
                  style={{ position: "relative" }}
                >
                  <Image
                    source={{ uri: tAvatar || defaultAvatar }}
                    style={{
                      width: 80,
                      height: 80,
                      borderRadius: 40,
                      borderWidth: 2,
                      borderColor: "#007AFF",
                    }}
                  />
                  <View
                    style={{
                      position: "absolute",
                      bottom: 0,
                      right: 0,
                      backgroundColor: "#007AFF",
                      padding: 6,
                      borderRadius: 15,
                    }}
                  >
                    <Ionicons name="camera" size={14} color="white" />
                  </View>
                </TouchableOpacity>
                <Text style={{ fontSize: 12, color: "#666", marginTop: 5 }}>
                  Fotoğrafı Değiştir
                </Text>
              </View>

              <TextInput
                style={styles.modalInput}
                placeholder="Ad"
                value={tName}
                onChangeText={(text) => setTName(text.replace(/[0-9]/g, ""))}
                autoCapitalize="words"
              />

              <TextInput
                style={styles.modalInput}
                placeholder="Soyad"
                value={tSurname}
                onChangeText={(text) => setTSurname(text.replace(/[0-9]/g, ""))}
              />

              <TextInput
                style={styles.modalInput}
                placeholder="TC Kimlik No"
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
                  marginBottom: 10,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Cinsiyet:</Text>
                  <CustomDropdown
                    placeholder="Cinsiyet"
                    options={genderOptions}
                    value={tGender}
                    onSelect={setTGender}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Medeni Hal:</Text>
                  <CustomDropdown
                    placeholder="Medeni Hal"
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
                          fontSize: 13,
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
                          fontSize: 13,
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
                    style={[styles.modalInput, { marginBottom: 10 }]}
                    placeholder="Eşinin Çalıştığı Kurum / İl (İsteğe Bağlı)"
                    value={tSpouseInstitution}
                    onChangeText={setTSpouseInstitution}
                  />
                  <TextInput
                    style={[styles.modalInput, { marginBottom: 0 }]}
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

              <View style={{ flexDirection: "row", gap: 10, zIndex: 4000 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Rol:</Text>
                  <CustomDropdown
                    placeholder="Rol Seçiniz"
                    options={roleOptions}
                    value={tRole}
                    onSelect={setTRole}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Branş:</Text>
                  <CustomDropdown
                    placeholder="Branş Seçiniz"
                    options={branchOptions}
                    value={tBranch}
                    onSelect={setTBranch}
                  />
                </View>
              </View>

              <Text style={[styles.sectionDivider, { marginTop: 15 }]}>
                İletişim & Konum
              </Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Telefon"
                value={tPhone}
                onChangeText={(text) => setTPhone(text.replace(/[^0-9]/g, ""))}
                keyboardType="phone-pad"
                maxLength={11}
              />
              <Text style={styles.inputLabel}>Adres:</Text>
              <TextInput
                style={[
                  styles.modalInput,
                  { height: 60, textAlignVertical: "top" },
                ]}
                placeholder="Adres"
                value={tAddress}
                onChangeText={setTAddress}
                multiline
              />

              <Text style={[styles.sectionDivider, { marginTop: 15 }]}>
                Özlük Hakları & İK
              </Text>
              <Text style={styles.inputLabel}>Unvan:</Text>
              <View style={{ marginBottom: 10, zIndex: 3500 }}>
                <CustomDropdown
                  placeholder="Unvan Seç"
                  options={titleOptions}
                  value={tTitle}
                  onSelect={setTTitle}
                />
              </View>

              <View style={{ flexDirection: "row", gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <TextInput
                    style={styles.modalInput}
                    keyboardType="numeric"
                    value={tAge}
                    onChangeText={(text) =>
                      setTAge(text.replace(/[^0-9]/g, ""))
                    }
                    maxLength={2}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <TextInput
                    style={styles.modalInput}
                    keyboardType="numeric"
                    value={tSeniorityYear}
                    onChangeText={(text) =>
                      setTSeniorityYear(text.replace(/[^0-9]/g, ""))
                    }
                    maxLength={2}
                  />
                </View>
              </View>

              <Text style={styles.inputLabel}>Kullanılan İzin (Gün):</Text>
              <TextInput
                style={styles.modalInput}
                keyboardType="numeric"
                placeholder="Kullanılan İzin"
                value={tUsedLeaveDays}
                onChangeText={(text) => {
                  const numericValue = text.replace(/[^0-9]/g, "");
                  setTUsedLeaveDays(numericValue);
                }}
                maxLength={3}
              />

              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: 10,
                  marginBottom: 5,
                }}
              >
                <Text style={styles.inputLabel}>Kulüp Danışmanlığı:</Text>
                <TouchableOpacity
                  onPress={() => setIsAddingClub(true)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: "#D1FAE5",
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 6,
                  }}
                >
                  <Ionicons name="add-circle" size={16} color="#10B981" />
                  <Text
                    style={{
                      color: "#10B981",
                      fontWeight: "bold",
                      fontSize: 12,
                      marginLeft: 4,
                    }}
                  >
                    Yeni Kulüp
                  </Text>
                </TouchableOpacity>
              </View>

              {isAddingClub && (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: 10,
                  }}
                >
                  <TextInput
                    style={[
                      styles.modalInput,
                      { flex: 1, marginBottom: 0, height: 40 },
                    ]}
                    placeholder="Örn: Gezi Kulübü"
                    value={newClubName}
                    onChangeText={setNewClubName}
                  />
                  <TouchableOpacity
                    style={{
                      backgroundColor: "#10B981",
                      paddingHorizontal: 12,
                      height: 40,
                      justifyContent: "center",
                      borderRadius: 8,
                      marginLeft: 8,
                    }}
                    onPress={handleAddNewClub}
                  >
                    <Text style={{ color: "white", fontWeight: "bold" }}>
                      Ekle
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{
                      paddingHorizontal: 8,
                      height: 40,
                      justifyContent: "center",
                    }}
                    onPress={() => setIsAddingClub(false)}
                  >
                    <Ionicons name="close" size={24} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              )}

              <View
                style={{
                  flexDirection: "row",
                  gap: 8,
                  marginBottom: 15,
                  flexWrap: "wrap",
                }}
              >
                <TouchableOpacity
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 6,
                    backgroundColor:
                      tClub === "Yok" || tClub === "" ? "#3B82F6" : "#E5E7EB",
                  }}
                  onPress={() => setTClub("Yok")}
                >
                  <Text
                    style={{
                      color:
                        tClub === "Yok" || tClub === "" ? "#FFF" : "#4B5563",
                      fontWeight: "bold",
                      fontSize: 13,
                    }}
                  >
                    Yok
                  </Text>
                </TouchableOpacity>
                {displayClubs.map((c) => {
                  const isTaken = assignedClubs.includes(c);
                  const isSelected = tClub === c;
                  return (
                    <TouchableOpacity
                      key={c}
                      disabled={isTaken && !isSelected}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 6,
                        backgroundColor: isSelected
                          ? "#3B82F6"
                          : isTaken
                            ? "#F3F4F6"
                            : "#E5E7EB",
                        borderWidth: 1,
                        borderColor:
                          isTaken && !isSelected ? "#D1D5DB" : "transparent",
                      }}
                      onPress={() => setTClub(isSelected ? "Yok" : c || "Yok")}
                    >
                      <Text
                        style={{
                          color: isSelected
                            ? "#FFF"
                            : isTaken
                              ? "#9CA3AF"
                              : "#4B5563",
                          fontWeight: "bold",
                          fontSize: 13,
                          textDecorationLine:
                            isTaken && !isSelected ? "line-through" : "none",
                        }}
                      >
                        {c}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {isTopManagement && (
                <>
                  <Text style={[styles.sectionDivider, { marginTop: 10 }]}>
                    Sicil, Ödül ve Ceza İşlemleri
                  </Text>
                  <Text style={styles.inputLabel}>
                    🏆 Alınan Ödül / Başarı Belgeleri:
                  </Text>
                  <TextInput
                    style={[
                      styles.modalInput,
                      { height: 60, textAlignVertical: "top" },
                    ]}
                    placeholder="Örn: 2025 Üstün Başarı Belgesi..."
                    value={tAwards}
                    onChangeText={setTAwards}
                    multiline
                  />
                  <Text style={styles.inputLabel}>
                    ⚠️ Disiplin / Uyarı Kayıtları:
                  </Text>
                  <TextInput
                    style={[
                      styles.modalInput,
                      { height: 60, textAlignVertical: "top" },
                    ]}
                    placeholder="Varsa alınan disiplin cezaları..."
                    value={tPenalties}
                    onChangeText={setTPenalties}
                    multiline
                  />

                  <Text style={[styles.sectionDivider, { marginTop: 15 }]}>
                    Denetim / Müfettiş Raporu
                  </Text>
                  <Text style={styles.inputLabel}>
                    Performans Puanı (100 Üzerinden):
                  </Text>
                  <TextInput
                    style={styles.modalInput}
                    keyboardType="numeric"
                    placeholder="Örn: 92"
                    value={tInspectorScore}
                    onChangeText={(text) => {
                      const numericValue = text.replace(/[^0-9]/g, "");
                      if (numericValue !== "" && parseInt(numericValue) > 100) {
                        setTInspectorScore("100");
                        Toast.show({
                          type: "info",
                          text1: "Puan Sınırı",
                          text2: "Performans puanı en fazla 100 olabilir.",
                        });
                      } else {
                        setTInspectorScore(numericValue);
                      }
                    }}
                    maxLength={3}
                  />
                  <Text style={styles.inputLabel}>
                    Müfettişin Değerlendirme Notu:
                  </Text>
                  <TextInput
                    style={[
                      styles.modalInput,
                      { height: 80, textAlignVertical: "top" },
                    ]}
                    placeholder="Eğitimcinin sınıf içi performansı..."
                    value={tInspectorNotes}
                    onChangeText={setTInspectorNotes}
                    multiline
                  />

                  <Text style={[styles.sectionDivider, { marginTop: 15 }]}>
                    Nöbet Görevi
                  </Text>
                  <Text style={styles.inputLabel}>Nöbet Günü:</Text>
                  <View style={{ marginBottom: 10, zIndex: 2000 }}>
                    <CustomDropdown
                      placeholder="Nöbet Günü Seçiniz"
                      options={dutyDays}
                      value={tDutyDay}
                      onSelect={setTDutyDay}
                    />
                  </View>
                  {tDutyDay !== "" && tDutyDay !== "Yok" && (
                    <>
                      <Text style={styles.inputLabel}>Nöbet Yeri:</Text>
                      <View style={{ marginBottom: 10, zIndex: 1000 }}>
                        <CustomDropdown
                          placeholder="Nöbet Yeri (Kat/Bahçe)"
                          options={dutyLocations}
                          value={tDutyLocation}
                          onSelect={setTDutyLocation}
                        />
                      </View>
                    </>
                  )}
                  {tDutyLocation === "Diğer..." && (
                    <TextInput
                      style={[
                        styles.modalInput,
                        { borderColor: "#007AFF", borderWidth: 2 },
                      ]}
                      placeholder="Örn: 4. Kat, Spor Salonu..."
                      value={customDutyLocation}
                      onChangeText={setCustomDutyLocation}
                    />
                  )}
                </>
              )}
            </ScrollView>

            <View
              style={{
                flexDirection: "row",
                gap: 10,
                marginTop: 15,
                width: "100%",
              }}
            >
              <Pressable
                style={[styles.btn, { backgroundColor: "#FF3B30", flex: 1 }]}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={styles.btnText}>İptal</Text>
              </Pressable>
              <Pressable
                style={[styles.btn, { backgroundColor: "#34C759", flex: 1 }]}
                onPress={handleUpdateTeacher}
              >
                <Text style={styles.btnText}>Güncelle</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={mapVisible} animationType="slide">
        <View style={{ flex: 1 }}>
          <Pressable
            style={styles.closeMapBtn}
            onPress={() => setMapVisible(false)}
          >
            <Ionicons name="close" size={30} color="white" />
          </Pressable>
          <MapView
            style={{ flex: 1 }}
            initialRegion={{
              latitude: 36.8969,
              longitude: 30.7133,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            }}
          >
            <Marker
              coordinate={{ latitude: 36.8969, longitude: 30.7133 }}
              title={`${teacher.name} ${teacher.surname}`}
              description={teacher.address}
            />
          </MapView>
          <View style={styles.mapInfoBox}>
            <Text style={styles.mapInfoTitle}>Öğretmen Konumu</Text>
            <Text style={styles.mapInfoText}>{teacher.address}</Text>
          </View>
        </View>
      </Modal>

      <Modal
        visible={qrModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={closeQRModal}
      >
        <View style={styles.qrModalOverlay}>
          <View style={styles.qrModalContent}>
            <Text style={styles.qrModalTitle}>Personel Giriş QR Kodu</Text>
            <Text style={styles.qrModalSubTitle}>
              {teacher.name} {teacher.surname}
            </Text>
            <View style={styles.qrBigContainer}>
              <QRCode value={qrData} size={220} />
            </View>
            <Text style={styles.qrModalHint}>
              Lütfen turnikedeki veya nöbetçi masasıdaki okuyucuya bu ekranı
              gösterin.
            </Text>
            <Pressable style={styles.qrCloseBtn} onPress={closeQRModal}>
              <Ionicons
                name="close-circle-outline"
                size={24}
                color="white"
                style={{ marginRight: 8 }}
              />
              <Text style={styles.qrCloseBtnText}>
                Kapat (Parlaklığı Normale Döndür)
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 15, backgroundColor: "#f0f2f5" },
  infoCard: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
    elevation: 2,
  },
  avatarContainer: { alignItems: "center", marginBottom: 20 },
  largeAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 10,
    backgroundColor: "#eee",
    borderWidth: 3,
    borderColor: "#007AFF",
  },
  maternityBadge: {
    backgroundColor: "#FCE7F3",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#FBCFE8",
  },
  maternityBadgeText: {
    color: "#BE185D",
    fontWeight: "bold",
    fontSize: 13,
  },
  name: { fontSize: 22, fontWeight: "bold" },
  roleBadge: {
    fontSize: 18,
    color: "#007AFF",
    fontWeight: "bold",
    marginTop: 5,
    marginBottom: 2,
  },
  subBranch: { fontSize: 14, color: "#666", fontStyle: "italic" },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  label: { fontWeight: "bold", color: "#555" },
  btn: { flex: 1, padding: 12, borderRadius: 8, alignItems: "center" },
  btnText: { color: "white", fontWeight: "bold" },
  scheduleCard: {
    backgroundColor: "white",
    padding: 15,
    borderRadius: 12,
    elevation: 2,
    marginBottom: 30,
  },
  title: { fontSize: 18, fontWeight: "bold", marginBottom: 15 },
  formRow: { flexDirection: "row", gap: 5, marginBottom: 10 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 10,
    borderRadius: 8,
    backgroundColor: "#fafafa",
    marginBottom: 10,
  },
  addBtn: {
    backgroundColor: "#007AFF",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 15,
  },
  lessonItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  lessonTime: { fontSize: 14, color: "#666", fontWeight: "bold" },
  lessonSubject: { fontSize: 16, color: "#333" },
  smallEditBtn: {
    backgroundColor: "#FF9500",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  smallDeleteBtn: {
    backgroundColor: "#FF3B30",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  smallBtnText: { color: "white", fontSize: 12, fontWeight: "bold" },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  modalContent: {
    width: "90%",
    backgroundColor: "white",
    padding: 20,
    borderRadius: 20,
    alignItems: "center",
  },
  modalTitle: { fontSize: 20, fontWeight: "bold", marginBottom: 15 },
  sectionDivider: {
    width: "100%",
    backgroundColor: "#F3F4F6",
    paddingVertical: 6,
    paddingHorizontal: 10,
    color: "#4B5563",
    fontWeight: "bold",
    fontSize: 13,
    marginBottom: 10,
    borderRadius: 6,
    overflow: "hidden",
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#555",
    marginBottom: 4,
    marginLeft: 4,
    alignSelf: "flex-start",
  },
  modalInput: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 10,
    borderRadius: 8,
    backgroundColor: "#fafafa",
    marginBottom: 10,
  },
  dynamicBox: {
    backgroundColor: "#EEF2FF",
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#C7D2FE",
    width: "100%",
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
  actionBtn: {
    backgroundColor: "#34C759",
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: "center",
    alignItems: "center",
    elevation: 2,
  },
  mapBtn: {
    backgroundColor: "#007AFF",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  mapBtnText: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
    marginLeft: 4,
  },
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
    color: "#333",
    marginBottom: 5,
  },
  mapInfoText: { fontSize: 14, color: "#666" },
  hrCard: {
    backgroundColor: "#F8FAFC",
    padding: 20,
    borderRadius: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  hrRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    alignItems: "center",
  },
  hrLabel: { fontWeight: "600", color: "#475569", fontSize: 15 },
  hrValue: { fontWeight: "bold", color: "#1E293B", fontSize: 15 },
  titleBadge: {
    backgroundColor: "#DBEAFE",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  titleBadgeText: { color: "#1D4ED8", fontSize: 13, fontWeight: "bold" },
  inspectorCard: {
    backgroundColor: "#FFFBEB",
    padding: 20,
    borderRadius: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 15 },
  cardTitle: { fontSize: 18, fontWeight: "bold", marginLeft: 10 },
  inspectorRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  inspectorLabel: { fontWeight: "600", color: "#92400E", fontSize: 15 },
  scoreBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  scoreText: { fontWeight: "bold", fontSize: 16 },
  notesBox: {
    backgroundColor: "white",
    padding: 12,
    borderRadius: 8,
    marginTop: 5,
    borderWidth: 1,
    borderColor: "#FEF3C7",
  },
  notesTitle: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#B45309",
    marginBottom: 4,
  },
  notesText: {
    fontSize: 14,
    color: "#78350F",
    fontStyle: "italic",
    lineHeight: 20,
  },
  awardsCard: {
    backgroundColor: "#f3fff3",
    padding: 20,
    borderRadius: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#14e73b",
  },
  recordBox: {
    backgroundColor: "#ECFDF5",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  progressContainer: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  progressBarBg: {
    flex: 1,
    height: 8,
    backgroundColor: "#E5E7EB",
    borderRadius: 4,
    overflow: "hidden",
    marginRight: 10,
  },
  progressBarFill: { height: "100%", borderRadius: 4 },
  progressText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#6B7280",
    width: 90,
  },
  qrCard: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 15,
    marginBottom: 15,
    elevation: 2,
  },
  cardDesc: { fontSize: 14, color: "#666", marginBottom: 15, lineHeight: 20 },
  qrPreviewBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9F9F9",
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#eee",
  },
  qrPreviewTextContainer: { flex: 1, marginLeft: 15 },
  qrPreviewTitle: { fontSize: 16, fontWeight: "bold", color: "#333" },
  qrPreviewSub: { fontSize: 13, color: "#666", marginTop: 3 },
  qrModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  qrModalContent: {
    backgroundColor: "white",
    width: "100%",
    borderRadius: 20,
    padding: 30,
    alignItems: "center",
    elevation: 10,
  },
  qrModalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 5,
  },
  qrModalSubTitle: {
    fontSize: 18,
    color: "#007AFF",
    fontWeight: "500",
    marginBottom: 25,
  },
  qrBigContainer: {
    padding: 20,
    backgroundColor: "white",
    borderRadius: 15,
    elevation: 5,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  qrModalHint: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginTop: 25,
    marginBottom: 25,
    lineHeight: 22,
  },
  qrCloseBtn: {
    flexDirection: "row",
    backgroundColor: "#FF3B30",
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: "center",
    width: "100%",
    justifyContent: "center",
  },
  qrCloseBtnText: { color: "white", fontWeight: "bold", fontSize: 16 },
});
