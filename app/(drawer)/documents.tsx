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
  where,
  orderBy,
  onSnapshot,
  deleteDoc,
  doc,
  getDocs,
} from "firebase/firestore";
import { db } from "../../utils/firebaseConfig";
import { uploadFileToStorage } from "../../utils/storageService";
import { useAuth } from "../../context/AuthContext";
import CustomDropdown from "../../components/CustomDropdown";
import Toast from "react-native-toast-message";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { sendPushNotification } from "../../utils/pushService";

interface TeacherDocument {
  id: string;
  title: string;
  type: string;
  fileUrl: string;
  fileName: string;
  date: string;
}

export default function DocumentsScreen() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<TeacherDocument[]>([]);
  const [loading, setLoading] = useState(true);

  // Yükleme ve Modal Stateleri
  const [modalVisible, setModalVisible] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [title, setTitle] = useState("");
  const [docType, setDocType] = useState("");

  const docTypes = [
    "Sağlık Raporu",
    "Hizmet İçi Eğitim Sertifikası",
    "Ders Notu / Materyal",
    "Diğer",
  ];

  // SADECE GİRİŞ YAPAN ÖĞRETMENİN BELGELERİNİ GETİR
  useEffect(() => {
    if (!user?.id) return;

    const q = query(
      collection(db, "documents"),
      where("userId", "==", user.id), // Güvenlik: Sadece kendi belgeleri
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as TeacherDocument[];

      // Firestore'da 'where' ve 'orderBy' birlikte kullanımında index ayarı gerektiği için,
      // sıralamayı geçici olarak kod tarafında yapıyoruz:
      data.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      );

      setDocuments(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user?.id]);

  const handleUpload = async () => {
    if (!title || !docType) {
      return Toast.show({
        type: "error",
        text1: "Eksik Bilgi",
        text2: "Lütfen başlık ve belge türü seçin.",
      });
    }

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets.length > 0) {
        setIsUploading(true);
        const file = result.assets[0];

        // 1. Storage'a Yükle
        const safeFileName = `doc_${user?.id}_${Date.now()}`;
        const fileUrl = await uploadFileToStorage(
          file.uri,
          "documents",
          safeFileName,
        );

        // 2. Firestore'a Kaydet
        await addDoc(collection(db, "documents"), {
          userId: user?.id,
          title,
          type: docType,
          fileUrl,
          fileName: file.name,
          date: new Date().toISOString(),
        });

        // ---------------------------------------------------------
        // İDARECİLERE BİLDİRİM GÖNDERME BÖLÜMÜ
        // ---------------------------------------------------------
        try {
          // İdarecileri (Müdür, Müdür Baş Yrd., Müdür Yrd.) bul
          const managersQuery = query(
            collection(db, "users"),
            where("role", "in", [
              "Müdür",
              "Müdür Baş Yardımcısı",
              "Müdür Yardımcısı",
            ]),
          );
          const managersSnapshot = await getDocs(managersQuery);

          // Her bir idarecinin pushToken'ını al ve bildirim at
          managersSnapshot.forEach(async (managerDoc) => {
            const token = managerDoc.data().pushToken;
            if (token) {
              await sendPushNotification(
                token,
                "📄 Yeni Belge Yüklendi",
                `${user?.name || "Bir Personel"}, sisteme "${title}" (${docType}) yükledi.`,
              );
            }
          });
        } catch (pushError) {
          console.error("Bildirim gönderilirken hata oluştu:", pushError);
        }
        // ---------------------------------------------------------

        Toast.show({ type: "success", text1: "Belge Yüklendi ✨" });
        setModalVisible(false);
        setTitle("");
        setDocType("");
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
      await deleteDoc(doc(db, "documents", id));
      Toast.show({ type: "info", text1: "Belge Silindi" });
    } catch (error) {
      Toast.show({ type: "error", text1: "Silinemedi" });
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.headerTitle}>Belgelerim</Text>
          <Text style={styles.headerSubtitle}>
            Sertifika, Rapor ve Ders Notlarınız
          </Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator
          size="large"
          color="#4F46E5"
          style={{ marginTop: 50 }}
        />
      ) : (
        <FlatList
          data={documents}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
          ListEmptyComponent={
            <Animated.View entering={FadeInDown} style={styles.emptyState}>
              <Ionicons name="folder-open-outline" size={60} color="#ccc" />
              <Text style={styles.emptyStateText}>
                Henüz bir belge yüklemediniz.
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
                    item.type === "Sağlık Raporu"
                      ? "medkit"
                      : item.type === "Hizmet İçi Eğitim Sertifikası"
                        ? "ribbon"
                        : "document-text"
                  }
                  size={24}
                  color="#4F46E5"
                />
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardType}>{item.type}</Text>
                <Text style={styles.cardDate}>
                  {new Date(item.date).toLocaleDateString("tr-TR")}
                </Text>
              </View>
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={styles.iconBtn}
                  onPress={() => Linking.openURL(item.fileUrl)}
                >
                  <Ionicons name="eye-outline" size={22} color="#10B981" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.iconBtn}
                  onPress={() => handleDelete(item.id)}
                >
                  <Ionicons name="trash-outline" size={22} color="#EF4444" />
                </TouchableOpacity>
              </View>
            </Animated.View>
          )}
        />
      )}

      {/* YENİ BELGE EKLE BUTONU */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setModalVisible(true)}
      >
        <Ionicons name="add" size={30} color="#FFF" />
      </TouchableOpacity>

      {/* YÜKLEME MODALI */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Yeni Belge Yükle</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close-circle" size={28} color="#999" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Belge Adı / Konusu</Text>
            <TextInput
              style={styles.input}
              placeholder="Örn: 2 Günlük İstirahat Raporu"
              value={title}
              onChangeText={setTitle}
            />

            <Text style={styles.inputLabel}>Belge Türü</Text>
            <View style={{ marginBottom: 20, zIndex: 1000 }}>
              <CustomDropdown
                placeholder="Tür Seçin"
                options={docTypes}
                value={docType}
                onSelect={setDocType}
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
                    name="cloud-upload-outline"
                    size={22}
                    color="#FFF"
                    style={{ marginRight: 10 }}
                  />
                  <Text style={styles.uploadBtnText}>Dosya Seç ve Yükle</Text>
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
    backgroundColor: "#EEF2FF",
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
  cardType: { fontSize: 13, color: "#2218e9", fontWeight: "600" },
  cardDate: { fontSize: 12, color: "#9CA3AF", marginTop: 4 },
  actionButtons: { flexDirection: "row", gap: 10 },
  iconBtn: { padding: 5 },

  fab: {
    position: "absolute",
    bottom: 30,
    right: 20,
    backgroundColor: "#2a20e5",
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
    backgroundColor: "#241ae5",
    padding: 16,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },
  uploadBtnText: { color: "#FFF", fontSize: 16, fontWeight: "bold" },
});
