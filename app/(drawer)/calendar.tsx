import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Calendar, LocaleConfig } from "react-native-calendars";
import {
  collection,
  addDoc,
  query,
  onSnapshot,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db } from "../../utils/firebaseConfig";
import { useAuth } from "../../context/AuthContext";
import Toast from "react-native-toast-message";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import CustomDropdown from "../../components/CustomDropdown";

// Takvim Türkçe
LocaleConfig.locales["tr"] = {
  monthNames: [
    "Ocak",
    "Şubat",
    "Mart",
    "Nisan",
    "Mayıs",
    "Haziran",
    "Temmuz",
    "Ağustos",
    "Eylül",
    "Ekim",
    "Kasım",
    "Aralık",
  ],
  monthNamesShort: [
    "Oca",
    "Şub",
    "Mar",
    "Nis",
    "May",
    "Haz",
    "Tem",
    "Ağu",
    "Eyl",
    "Eki",
    "Kas",
    "Ara",
  ],
  dayNames: [
    "Pazar",
    "Pazartesi",
    "Salı",
    "Çarşamba",
    "Perşembe",
    "Cuma",
    "Cumartesi",
  ],
  dayNamesShort: ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"],
  today: "Bugün",
};
LocaleConfig.defaultLocale = "tr";

interface SchoolEvent {
  id: string;
  title: string;
  description: string;
  date: string; // YYYY-MM-DD formatında
  type: string;
  createdBy: string;
}

export default function CalendarScreen() {
  const { user } = useAuth();
  const isTopManagement =
    user &&
    ["Müdür", "Müdür Baş Yardımcısı", "Müdür Yardımcısı"].includes(user.role);

  const [events, setEvents] = useState<SchoolEvent[]>([]);
  const [markedDates, setMarkedDates] = useState<any>({});
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [loading, setLoading] = useState(true);

  // Form Stateleri
  const [modalVisible, setModalVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventType, setEventType] = useState("");

  const eventTypes = ["Toplantı", "Sınav", "Tatil", "Etkinlik", "Diğer"];

  // Etkinlik Türüne Göre Renk Belirleme
  const getEventColor = (type: string) => {
    switch (type) {
      case "Toplantı":
        return "#3B82F6"; // Mavi
      case "Sınav":
        return "#F59E0B"; // Turuncu
      case "Tatil":
        return "#EF4444"; // Kırmızı
      case "Etkinlik":
        return "#10B981"; // Yeşil
      default:
        return "#e1f012"; // Sarı
    }
  };

  // Firebase'den Etkinlikleri Çek
  useEffect(() => {
    const q = query(collection(db, "events"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedEvents: SchoolEvent[] = [];
      const marks: any = {};

      snapshot.forEach((doc) => {
        const data = doc.data();
        fetchedEvents.push({ id: doc.id, ...data } as SchoolEvent);

        // Takvim için işaretli günleri (markedDates) hazırla
        if (!marks[data.date]) {
          marks[data.date] = { dots: [] };
        }
        marks[data.date].dots.push({
          color: getEventColor(data.type),
          key: doc.id,
        });
      });

      // Seçili günü de marks objesine ekle ki vurgulansın
      if (selectedDate) {
        if (marks[selectedDate]) {
          marks[selectedDate].selected = true;
          marks[selectedDate].selectedColor = "#EEF2FF";
          marks[selectedDate].selectedTextColor = "#4F46E5";
        } else {
          marks[selectedDate] = {
            selected: true,
            selectedColor: "#EEF2FF",
            selectedTextColor: "#4F46E5",
          };
        }
      }

      setEvents(fetchedEvents);
      setMarkedDates(marks);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [selectedDate]);

  // Yeni Etkinlik Ekle (Sadece İdareciler)
  const handleAddEvent = async () => {
    if (!title || !description || !eventType || !selectedDate) {
      return Toast.show({
        type: "error",
        text1: "Hata",
        text2: "Lütfen takvimden bir gün seçip tüm alanları doldurun.",
      });
    }

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, "events"), {
        title,
        description,
        date: selectedDate,
        type: eventType,
        createdBy: user?.name,
        createdAt: new Date().toISOString(),
      });

      Toast.show({ type: "success", text1: "Etkinlik Eklendi ✨" });
      setModalVisible(false);
      setTitle("");
      setDescription("");
      setEventType("");
    } catch (error) {
      Toast.show({ type: "error", text1: "Bir hata oluştu" });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Etkinlik Sil (Sadece İdareciler)
  const handleDeleteEvent = (eventId: string) => {
    Alert.alert(
      "Etkinliği Sil",
      "Bu etkinliği silmek istediğinize emin misiniz?",
      [
        { text: "İptal", style: "cancel" },
        {
          text: "Sil",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDoc(doc(db, "events", eventId));
              Toast.show({ type: "success", text1: "Etkinlik silindi" });
            } catch (error) {
              Toast.show({ type: "error", text1: "Silinemedi" });
            }
          },
        },
      ],
    );
  };

  // Takvimde Bir Güne Tıklanınca
  const onDayPress = (day: any) => {
    setSelectedDate(day.dateString);
  };

  // Seçili gündeki etkinlikleri filtrele
  const selectedDayEvents = events.filter((e) => e.date === selectedDate);

  // Günü formatla (Örn: 2026-03-25 -> 25 Mart 2026)
  const formatDateTR = (dateString: string) => {
    if (!dateString) return "Bir gün seçin";
    const date = new Date(dateString);
    return date.toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Okul Takvimi</Text>
        <Text style={styles.headerSubtitle}>
          Etkinlikler, toplantılar ve tatiller
        </Text>
      </View>

      <View style={styles.calendarContainer}>
        <Calendar
          onDayPress={onDayPress}
          markedDates={markedDates}
          markingType={"multi-dot"}
          theme={{
            backgroundColor: "#ffffff",
            calendarBackground: "#ffffff",
            textSectionTitleColor: "#6B7280",
            selectedDayBackgroundColor: "#1354eb",
            selectedDayTextColor: "#ffffff",
            todayTextColor: "#1f32dd",
            dayTextColor: "#1F2937",
            textDisabledColor: "#D1D5DB",
            arrowColor: "#1328e7",
            monthTextColor: "#1F2937",
            textDayFontWeight: "500",
            textMonthFontWeight: "bold",
            textDayHeaderFontWeight: "600",
          }}
        />
      </View>

      <View style={styles.eventListHeader}>
        <Text style={styles.eventListTitle}>{formatDateTR(selectedDate)}</Text>
        <Text style={styles.eventCount}>
          {selectedDayEvents.length} Etkinlik
        </Text>
      </View>

      {selectedDayEvents.length === 0 ? (
        <Animated.View entering={FadeInDown} style={styles.emptyState}>
          <Ionicons name="calendar-outline" size={40} color="#D1D5DB" />
          <Text style={styles.emptyStateText}>
            Bu tarihte planlı bir etkinlik yok.
          </Text>
        </Animated.View>
      ) : (
        <FlatList
          data={selectedDayEvents}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 100 }}
          renderItem={({ item, index }) => (
            <Animated.View
              entering={FadeInUp.delay(index * 100)}
              style={[
                styles.eventCard,
                { borderLeftColor: getEventColor(item.type) },
              ]}
            >
              <View style={styles.eventInfo}>
                <View style={styles.eventHeaderRow}>
                  <Text style={styles.eventTitle}>{item.title}</Text>
                  <View
                    style={[
                      styles.typeBadge,
                      { backgroundColor: getEventColor(item.type) + "20" },
                    ]}
                  >
                    <Text
                      style={[
                        styles.typeText,
                        { color: getEventColor(item.type) },
                      ]}
                    >
                      {item.type}
                    </Text>
                  </View>
                </View>
                <Text style={styles.eventDescription}>{item.description}</Text>
                <Text style={styles.eventCreator}>
                  Ekleyen: {item.createdBy}
                </Text>
              </View>
              {isTopManagement && (
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => handleDeleteEvent(item.id)}
                >
                  <Ionicons name="trash-outline" size={20} color="#EF4444" />
                </TouchableOpacity>
              )}
            </Animated.View>
          )}
        />
      )}

      {/* Sadece İdareciler Etkinlik Ekleyebilir */}
      {isTopManagement && selectedDate && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setModalVisible(true)}
        >
          <Ionicons name="add" size={30} color="#FFF" />
        </TouchableOpacity>
      )}

      {/* YENİ ETKİNLİK MODALI */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Yeni Etkinlik Ekle</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close-circle" size={28} color="#999" />
              </TouchableOpacity>
            </View>

            <Text style={styles.selectedDateText}>
              Tarih: {formatDateTR(selectedDate)}
            </Text>

            <Text style={styles.inputLabel}>Etkinlik Türü</Text>
            <View style={{ marginBottom: 15, zIndex: 1000 }}>
              <CustomDropdown
                placeholder="Tür Seçin"
                options={eventTypes}
                value={eventType}
                onSelect={setEventType}
              />
            </View>

            <Text style={styles.inputLabel}>Etkinlik Başlığı</Text>
            <TextInput
              style={styles.input}
              placeholder="Örn: 1. Dönem Veli Toplantısı"
              value={title}
              onChangeText={setTitle}
            />

            <Text style={styles.inputLabel}>Açıklama / Detay</Text>
            <TextInput
              style={[styles.input, { height: 80, textAlignVertical: "top" }]}
              placeholder="Saat, yer veya diğer detayları yazın..."
              value={description}
              onChangeText={setDescription}
              multiline
            />

            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleAddEvent}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.submitBtnText}>Takvime Ekle</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F3F4F6", padding: 20 },
  headerRow: { marginBottom: 15 },
  headerTitle: { fontSize: 24, fontWeight: "bold", color: "#1F2937" },
  headerSubtitle: { fontSize: 14, color: "#6B7280", marginTop: 4 },

  calendarContainer: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    overflow: "hidden",
    elevation: 3,
    marginBottom: 20,
    paddingBottom: 10,
  },

  eventListHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
    paddingHorizontal: 5,
  },
  eventListTitle: { fontSize: 18, fontWeight: "bold", color: "#1F2937" },
  eventCount: { fontSize: 14, color: "#6B7280", fontWeight: "600" },

  emptyState: { alignItems: "center", marginTop: 30 },
  emptyStateText: { color: "#9CA3AF", marginTop: 10, fontSize: 15 },

  eventCard: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 5,
    elevation: 2,
  },
  eventInfo: { flex: 1, justifyContent: "center" },
  eventHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1F2937",
    flex: 1,
    marginRight: 10,
  },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  typeText: { fontSize: 11, fontWeight: "bold" },
  eventDescription: { fontSize: 14, color: "#4B5563", marginBottom: 8 },
  eventCreator: { fontSize: 12, color: "#9CA3AF", fontStyle: "italic" },
  deleteBtn: { justifyContent: "center", paddingLeft: 10 },

  fab: {
    position: "absolute",
    bottom: 30,
    right: 20,
    backgroundColor: "#1325e9",
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 25,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  modalTitle: { fontSize: 20, fontWeight: "bold", color: "#1F2937" },
  selectedDateText: {
    fontSize: 15,
    color: "#1512e8",
    fontWeight: "600",
    marginBottom: 20,
    backgroundColor: "#EEF2FF",
    padding: 10,
    borderRadius: 8,
    textAlign: "center",
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#4B5563",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    backgroundColor: "#F9FAFB",
    marginBottom: 15,
  },
  submitBtn: {
    backgroundColor: "#24e721",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
  },
  submitBtnText: { color: "#FFF", fontSize: 16, fontWeight: "bold" },
});
