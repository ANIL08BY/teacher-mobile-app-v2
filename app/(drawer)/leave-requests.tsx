import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  getDocs,
  where,
} from "firebase/firestore";
import { db } from "../../utils/firebaseConfig";
import { useAuth } from "../../context/AuthContext";
import { sendPushNotification } from "../../utils/pushService"; // Bildirim servisi
import Toast from "react-native-toast-message";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import CustomDropdown from "../../components/CustomDropdown";

interface LeaveRequest {
  id: string;
  userId: string;
  userName: string;
  type: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: "Bekliyor" | "Onaylandı" | "Reddedildi";
  createdAt: string;
  userPushToken?: string;
}

export default function LeaveRequestsScreen() {
  const { user } = useAuth();
  const isTopManagement =
    user &&
    ["Müdür", "Müdür Baş Yardımcısı", "Müdür Yardımcısı"].includes(user.role);

  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Stateleri
  const [type, setType] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const leaveTypes = [
    "Mazeret İzni",
    "Hastalık İzni",
    "Yıllık İzin",
    "Ücretsiz İzin",
  ];

  // Verileri Çek (Müdürse hepsini, öğretmense sadece kendininkileri)
  useEffect(() => {
    let q;
    if (isTopManagement) {
      q = query(collection(db, "leaveRequests"), orderBy("createdAt", "desc"));
    } else {
      q = query(
        collection(db, "leaveRequests"),
        where("userId", "==", user?.id),
        orderBy("createdAt", "desc"),
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as LeaveRequest[];
      setRequests(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user?.id, isTopManagement]);

  // Yeni İzin Talebi Gönder
  const handleSubmitRequest = async () => {
    if (!type || !startDate || !endDate || !reason) {
      return Toast.show({
        type: "error",
        text1: "Eksik Bilgi",
        text2: "Lütfen tüm alanları doldurun.",
      });
    }

    setIsSubmitting(true);
    try {
      // 1. Veritabanına kaydet
      await addDoc(collection(db, "leaveRequests"), {
        userId: user?.id,
        userName: user?.name,
        type,
        startDate,
        endDate,
        reason,
        status: "Bekliyor",
        createdAt: new Date().toISOString(),
      });

      // 2. İdarecilere Bildirim Gönder
      const managersQuery = query(
        collection(db, "users"),
        where("role", "in", [
          "Müdür",
          "Müdür Baş Yardımcısı",
          "Müdür Yardımcısı",
        ]),
      );
      const managersSnapshot = await getDocs(managersQuery);

      managersSnapshot.forEach(async (managerDoc: any) => {
        const token = managerDoc.data().pushToken;
        if (token) {
          await sendPushNotification(
            token,
            "🔔 Yeni İzin Talebi",
            `${user?.name}, ${type} talebinde bulundu.`,
          );
        }
      });

      Toast.show({ type: "success", text1: "Talebiniz İletildi ✨" });
      setModalVisible(false);
      setType("");
      setStartDate("");
      setEndDate("");
      setReason("");
    } catch (error) {
      Toast.show({ type: "error", text1: "Bir hata oluştu!" });
    } finally {
      setIsSubmitting(false);
    }
  };

  // İdareci İşlemi: Onayla veya Reddet
  const handleUpdateStatus = async (
    requestId: string,
    newStatus: "Onaylandı" | "Reddedildi",
    requestUserId: string,
    requestUserName: string,
  ) => {
    Alert.alert(
      `${newStatus} Olarak İşaretle`,
      `Bu izin talebini ${newStatus.toLowerCase()} olarak işaretlemek istediğinize emin misiniz?`,
      [
        { text: "Vazgeç", style: "cancel" },
        {
          text: "Evet",
          onPress: async () => {
            try {
              // 1. Durumu Güncelle
              await updateDoc(doc(db, "leaveRequests", requestId), {
                status: newStatus,
              });
              Toast.show({ type: "info", text1: `İzin ${newStatus}` });

              // 2. Talep eden öğretmene bildirim gönder (Öğretmenin token'ını bulmamız lazım)
              const userDoc = await getDocs(
                query(
                  collection(db, "users"),
                  where("id", "==", requestUserId),
                ),
              );
              if (!userDoc.empty) {
                const token = userDoc.docs[0].data().pushToken;
                if (token) {
                  await sendPushNotification(
                    token,
                    `İzin Durumu Güncellendi`,
                    `İzin talebiniz yönetim tarafından ${newStatus}.`,
                  );
                }
              }
            } catch (error) {
              Toast.show({ type: "error", text1: "Hata oluştu" });
            }
          },
        },
      ],
    );
  };

  // Duruma Göre Renk Seçici
  const getStatusColor = (status: string) => {
    if (status === "Onaylandı") return "#10B981"; // Yeşil
    if (status === "Reddedildi") return "#EF4444"; // Kırmızı
    return "#F59E0B"; // Turuncu (Bekliyor)
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>İzin Talepleri</Text>
        <Text style={styles.headerSubtitle}>
          {isTopManagement
            ? "Personel izin taleplerini yönetin"
            : "Yeni izin talep edin ve durumunu takip edin"}
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator
          size="large"
          color="#4F46E5"
          style={{ marginTop: 50 }}
        />
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 100 }}
          ListEmptyComponent={
            <Animated.View entering={FadeInDown} style={styles.emptyState}>
              <Ionicons name="calendar-clear-outline" size={60} color="#ccc" />
              <Text style={styles.emptyStateText}>
                Hiç izin talebi bulunmuyor.
              </Text>
            </Animated.View>
          }
          renderItem={({ item, index }) => (
            <Animated.View
              entering={FadeInUp.delay(index * 100)}
              style={[
                styles.card,
                {
                  borderLeftColor: getStatusColor(item.status),
                  borderLeftWidth: 5,
                },
              ]}
            >
              <View style={styles.cardInfo}>
                {isTopManagement && (
                  <Text style={styles.userName}>{item.userName}</Text>
                )}
                <Text style={styles.cardTitle}>{item.type}</Text>
                <Text style={styles.cardDates}>
                  {item.startDate} - {item.endDate}
                </Text>
                <Text style={styles.cardReason}>Gerekçe: {item.reason}</Text>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusColor(item.status) + "20" },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      { color: getStatusColor(item.status) },
                    ]}
                  >
                    {item.status}
                  </Text>
                </View>
              </View>

              {/* Sadece İdareciler "Bekleyen" taleplere işlem yapabilir */}
              {isTopManagement && item.status === "Bekliyor" && (
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: "#10B981" }]}
                    onPress={() =>
                      handleUpdateStatus(
                        item.id,
                        "Onaylandı",
                        item.userId,
                        item.userName,
                      )
                    }
                  >
                    <Ionicons name="checkmark" size={20} color="#FFF" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.actionBtn,
                      { backgroundColor: "#EF4444", marginTop: 10 },
                    ]}
                    onPress={() =>
                      handleUpdateStatus(
                        item.id,
                        "Reddedildi",
                        item.userId,
                        item.userName,
                      )
                    }
                  >
                    <Ionicons name="close" size={20} color="#FFF" />
                  </TouchableOpacity>
                </View>
              )}
            </Animated.View>
          )}
        />
      )}

      {/* Sadece Öğretmenler talep oluşturabilir (İdareciler de isteyebilir dersen isTopManagement kontrolünü kaldırabilirsin) */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setModalVisible(true)}
      >
        <Ionicons name="add" size={30} color="#FFF" />
      </TouchableOpacity>

      {/* İZİN TALEP MODALI */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Yeni İzin Talebi</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close-circle" size={28} color="#999" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>İzin Türü</Text>
            <View style={{ marginBottom: 15, zIndex: 1000 }}>
              <CustomDropdown
                placeholder="Tür Seçin"
                options={leaveTypes}
                value={type}
                onSelect={setType}
              />
            </View>

            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={styles.inputLabel}>Başlangıç Tarihi</Text>
                <TextInput
                  style={styles.input}
                  placeholder="GG/AA/YYYY"
                  value={startDate}
                  onChangeText={setStartDate}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Bitiş Tarihi</Text>
                <TextInput
                  style={styles.input}
                  placeholder="GG/AA/YYYY"
                  value={endDate}
                  onChangeText={setEndDate}
                />
              </View>
            </View>

            <Text style={styles.inputLabel}>Gerekçe / Açıklama</Text>
            <TextInput
              style={[styles.input, { height: 80, textAlignVertical: "top" }]}
              placeholder="İzin talebinizin detayını yazın..."
              value={reason}
              onChangeText={setReason}
              multiline
            />

            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleSubmitRequest}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.submitBtnText}>Talebi Gönder</Text>
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
  headerRow: { marginBottom: 20 },
  headerTitle: { fontSize: 24, fontWeight: "bold", color: "#1F2937" },
  headerSubtitle: { fontSize: 14, color: "#6B7280", marginTop: 4 },
  emptyState: { alignItems: "center", marginTop: 60 },
  emptyStateText: { color: "#9CA3AF", marginTop: 10, fontSize: 16 },

  card: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    elevation: 2,
  },
  cardInfo: { flex: 1, justifyContent: "center" },
  userName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 5,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#170cee",
    marginBottom: 4,
  },
  cardDates: {
    fontSize: 13,
    color: "#4B5563",
    marginBottom: 4,
    fontWeight: "600",
  },
  cardReason: {
    fontSize: 13,
    color: "#6B7280",
    fontStyle: "italic",
    marginBottom: 10,
  },
  statusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: { fontSize: 12, fontWeight: "bold" },

  actionButtons: { justifyContent: "center", paddingLeft: 10 },
  actionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    elevation: 2,
  },

  fab: {
    position: "absolute",
    bottom: 30,
    right: 20,
    backgroundColor: "#1d13e1",
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
    marginBottom: 20,
  },
  modalTitle: { fontSize: 20, fontWeight: "bold", color: "#1F2937" },
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
  row: { flexDirection: "row", justifyContent: "space-between" },
  submitBtn: {
    backgroundColor: "#2217ed",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
  },
  submitBtnText: { color: "#FFF", fontSize: 16, fontWeight: "bold" },
});
