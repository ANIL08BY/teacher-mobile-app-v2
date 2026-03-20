import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Linking,
  Modal,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db } from "../../utils/firebaseConfig";
import { uploadFileToStorage } from "../../utils/storageService";
import { useAuth } from "../../context/AuthContext";
import CustomDropdown from "../../components/CustomDropdown";
import Toast from "react-native-toast-message";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";

interface Schedule {
  id: string;
  title: string;
  type: string;
  fileUrl: string;
  fileName: string;
  date: string;
  senderName: string;
}

export default function ScheduleScreen() {
  const { user } = useAuth();
  const isTopManagement =
    user &&
    ["Müdür", "Müdür Baş Yardımcısı", "Müdür Yardımcısı"].includes(user.role);

  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Form
  const [title, setTitle] = useState("");
  const [scheduleType, setScheduleType] = useState("");
  const scheduleTypes = ["Nöbet Çizelgesi", "Ders Programı", "Sınav Takvimi"];

  // Verileri Çek
  useEffect(() => {
    const q = query(collection(db, "schedules"), orderBy("date", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Schedule[];
      setSchedules(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Dosya Yükleme
  const handleUpload = async () => {
    if (!title || !scheduleType) {
      return Toast.show({
        type: "error",
        text1: "Eksik Bilgi",
        text2: "Lütfen başlık ve tür seçin.",
      });
    }

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*", // Excel, PDF vb.
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets.length > 0) {
        setIsUploading(true);
        const file = result.assets[0];

        const safeFileName = `schedule_${Date.now()}`;
        const fileUrl = await uploadFileToStorage(
          file.uri,
          "schedules",
          safeFileName,
        );

        await addDoc(collection(db, "schedules"), {
          title,
          type: scheduleType,
          fileUrl,
          fileName: file.name,
          senderName: user?.name || "Yönetim",
          date: new Date().toISOString(),
        });

        Toast.show({ type: "success", text1: "Program Yayınlandı ✨" });
        setModalVisible(false);
        setTitle("");
        setScheduleType("");
      }
    } catch (error) {
      console.error("Yükleme hatası:", error);
      Toast.show({ type: "error", text1: "Yükleme Başarısız!" });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, "schedules", id));
      Toast.show({ type: "info", text1: "Program Silindi" });
    } catch (error) {
      Toast.show({ type: "error", text1: "Silinemedi" });
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Haftalık Programlar</Text>
        <Text style={styles.headerSubtitle}>
          Nöbet çizelgeleri ve ders programları
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator
          size="large"
          color="#10B981"
          style={{ marginTop: 50 }}
        />
      ) : (
        <FlatList
          data={schedules}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 100 }}
          ListEmptyComponent={
            <Animated.View entering={FadeInDown} style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={60} color="#ccc" />
              <Text style={styles.emptyStateText}>
                Henüz bir program yayınlanmadı.
              </Text>
            </Animated.View>
          }
          renderItem={({ item, index }) => (
            <Animated.View
              entering={FadeInUp.delay(index * 100)}
              style={styles.card}
            >
              <View style={styles.cardIcon}>
                <Ionicons
                  name={
                    item.type === "Nöbet Çizelgesi"
                      ? "shield-checkmark"
                      : "school"
                  }
                  size={24}
                  color="#10B981"
                />
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardType}>{item.type}</Text>
                <Text style={styles.cardDate}>
                  Yayınlayan: {item.senderName} |{" "}
                  {new Date(item.date).toLocaleDateString("tr-TR")}
                </Text>
              </View>
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={styles.iconBtn}
                  onPress={() => Linking.openURL(item.fileUrl)}
                >
                  <Ionicons name="download-outline" size={24} color="#4F46E5" />
                </TouchableOpacity>
                {isTopManagement && (
                  <TouchableOpacity
                    style={styles.iconBtn}
                    onPress={() => handleDelete(item.id)}
                  >
                    <Ionicons name="trash-outline" size={24} color="#EF4444" />
                  </TouchableOpacity>
                )}
              </View>
            </Animated.View>
          )}
        />
      )}

      {isTopManagement && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setModalVisible(true)}
        >
          <Ionicons name="add" size={30} color="#FFF" />
        </TouchableOpacity>
      )}

      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Yeni Program Yayınla</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close-circle" size={28} color="#999" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Program Başlığı</Text>
            <TextInput
              style={styles.input}
              placeholder="Örn: 24-28 Ekim Nöbet Listesi"
              value={title}
              onChangeText={setTitle}
            />

            <Text style={styles.inputLabel}>Tür</Text>
            <View style={{ marginBottom: 20, zIndex: 1000 }}>
              <CustomDropdown
                placeholder="Tür Seçin"
                options={scheduleTypes}
                value={scheduleType}
                onSelect={setScheduleType}
              />
            </View>

            <TouchableOpacity
              style={styles.uploadBtn}
              onPress={handleUpload}
              disabled={isUploading}
            >
              {isUploading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Ionicons
                    name="document-attach-outline"
                    size={22}
                    color="#FFF"
                    style={{ marginRight: 10 }}
                  />
                  <Text style={styles.uploadBtnText}>
                    Excel/PDF Seç ve Yayınla
                  </Text>
                </>
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
    marginBottom: 12,
    elevation: 2,
    alignItems: "center",
  },
  cardIcon: {
    backgroundColor: "#ECFDF5",
    padding: 12,
    borderRadius: 10,
    marginRight: 15,
  },
  cardInfo: { flex: 1 },
  cardTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 4,
  },
  cardType: { fontSize: 13, color: "#10B981", fontWeight: "600" },
  cardDate: { fontSize: 11, color: "#9CA3AF", marginTop: 4 },
  actionButtons: { flexDirection: "row", gap: 10 },
  iconBtn: { padding: 5 },
  fab: {
    position: "absolute",
    bottom: 30,
    right: 20,
    backgroundColor: "#10B981",
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
  uploadBtn: {
    backgroundColor: "#10B981",
    padding: 16,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },
  uploadBtnText: { color: "#FFF", fontSize: 16, fontWeight: "bold" },
});
