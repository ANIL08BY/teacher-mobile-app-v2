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
  Image,
  ScrollView,
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
  where,
} from "firebase/firestore";
import * as ImagePicker from "expo-image-picker";
import { db } from "../../utils/firebaseConfig";
import { uploadFileToStorage } from "../../utils/storageService";
import { useAuth } from "../../context/AuthContext";
import Toast from "react-native-toast-message";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import CustomDropdown from "../../components/CustomDropdown";

interface HelpdeskTicket {
  id: string;
  userId: string;
  userName: string;
  category: string;
  description: string;
  imageUrl?: string;
  status: "Bekliyor" | "İşleme Alındı" | "Çözüldü" | "İptal Edildi";
  createdAt: string;
}

export default function HelpdeskScreen() {
  const { user } = useAuth();
  const isTopManagement =
    user &&
    ["Müdür", "Müdür Baş Yardımcısı", "Müdür Yardımcısı"].includes(user.role);

  const [tickets, setTickets] = useState<HelpdeskTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Yeni Arıza Form Stateleri
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);

  const categories = [
    "Elektrik Arızası",
    "Bilişim / Akıllı Tahta",
    "Mobilya / Tamirat",
    "Temizlik / Hijyen",
    "Diğer",
  ];

  // Verileri Canlı Çek (Müdürse hepsi, öğretmense sadece kendisininki)
  useEffect(() => {
    let q;
    if (isTopManagement) {
      q = query(collection(db, "helpdesk"), orderBy("createdAt", "desc"));
    } else {
      q = query(
        collection(db, "helpdesk"),
        where("userId", "==", user?.id),
        orderBy("createdAt", "desc"),
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as HelpdeskTicket[];
      setTickets(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user?.id, isTopManagement]);

  // Resim Seçme Fonksiyonu (Kamera veya Galeri)
  const pickImage = async (useCamera: boolean) => {
    try {
      // Önce izin iste
      const permissionResult = useCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (permissionResult.status !== "granted") {
        Alert.alert(
          "İzin Gerekli",
          `Fotoğraf ${useCamera ? "çekmek" : "seçmek"} için izin vermelisiniz.`,
        );
        return;
      }

      // Resmi al
      const result = useCamera
        ? await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            quality: 0.5,
          })
        : await ImagePicker.launchImageLibraryAsync({
            allowsEditing: true,
            quality: 0.5,
          });

      if (!result.canceled && result.assets.length > 0) {
        setSelectedImageUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Resim seçme hatası:", error);
    }
  };

  // Yeni Arıza Bildirimi Gönder
  const handleSubmitTicket = async () => {
    if (!category || !description.trim()) {
      return Toast.show({
        type: "error",
        text1: "Eksik Bilgi",
        text2: "Lütfen kategori ve açıklama yazın.",
      });
    }

    setIsSubmitting(true);
    let uploadedImageUrl = null;

    try {
      // 1. Eğer resim seçildiyse Firebase Storage'a yükle
      if (selectedImageUri) {
        const safeFileName = `helpdesk_${user?.id}_${Date.now()}`;
        uploadedImageUrl = await uploadFileToStorage(
          selectedImageUri,
          "helpdesk",
          safeFileName,
        );
      }

      // 2. Firestore'a veriyi kaydet
      await addDoc(collection(db, "helpdesk"), {
        userId: user?.id,
        userName: user?.name,
        category,
        description,
        imageUrl: uploadedImageUrl,
        status: "Bekliyor",
        createdAt: new Date().toISOString(),
      });

      Toast.show({ type: "success", text1: "Arıza Bildirildi ✨" });
      setModalVisible(false);
      setCategory("");
      setDescription("");
      setSelectedImageUri(null);
    } catch (error) {
      console.error("Gönderim hatası:", error);
      Toast.show({ type: "error", text1: "Bildirim gönderilemedi!" });
    } finally {
      setIsSubmitting(false);
    }
  };

  // İdareci İşlemi: Durumu Güncelle
  const handleUpdateStatus = async (ticketId: string) => {
    const statusOptions = [
      "Bekliyor",
      "İşleme Alındı",
      "Çözüldü",
      "İptal Edildi",
    ];

    Alert.alert(
      "Durumu Güncelle",
      "Arıza bildirimi için yeni durumu seçin:",
      statusOptions.map((status) => ({
        text: status,
        onPress: async () => {
          try {
            await updateDoc(doc(db, "helpdesk", ticketId), { status: status });
            Toast.show({ type: "info", text1: `Durum: ${status}` });
          } catch (error) {
            Toast.show({ type: "error", text1: "Hata oluştu" });
          }
        },
        style: status === "İptal Edildi" ? "destructive" : "default",
      })),
      { cancelable: true },
    );
  };

  // Duruma Göre Renk Seçici
  const getStatusColor = (status: string) => {
    switch (status) {
      case "Çözüldü":
        return "#10B981"; // Yeşil
      case "İşleme Alındı":
        return "#3B82F6"; // Mavi
      case "İptal Edildi":
        return "#EF4444"; // Kırmızı
      default:
        return "#F59E0B"; // Turuncu (Bekliyor)
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Arıza & Destek</Text>
        <Text style={styles.headerSubtitle}>
          {isTopManagement
            ? "Okul içi teknik sorunları yönetin"
            : "Teknik sorunları idareye bildirin"}
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
          data={tickets}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 100 }}
          ListEmptyComponent={
            <Animated.View entering={FadeInDown} style={styles.emptyState}>
              <Ionicons name="construct-outline" size={60} color="#ccc" />
              <Text style={styles.emptyStateText}>
                Hiç arıza bildirimi bulunmuyor.
              </Text>
            </Animated.View>
          }
          renderItem={({ item, index }) => (
            <Animated.View
              entering={FadeInUp.delay(index * 100)}
              style={styles.card}
            >
              <View style={styles.cardMain}>
                <View style={styles.cardHeader}>
                  <Text style={styles.userName}>{item.userName}</Text>
                  <TouchableOpacity
                    style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusColor(item.status) + "20" },
                    ]}
                    onPress={
                      isTopManagement
                        ? () => handleUpdateStatus(item.id)
                        : undefined
                    }
                    disabled={!isTopManagement}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        { color: getStatusColor(item.status) },
                      ]}
                    >
                      {item.status}
                    </Text>
                    {isTopManagement && (
                      <Ionicons
                        name="chevron-down"
                        size={12}
                        color={getStatusColor(item.status)}
                        style={{ marginLeft: 4 }}
                      />
                    )}
                  </TouchableOpacity>
                </View>

                <Text style={styles.categoryText}>{item.category}</Text>
                <Text style={styles.descriptionText}>{item.description}</Text>
              </View>

              {item.imageUrl && (
                <Image
                  source={{ uri: item.imageUrl }}
                  style={styles.cardImage}
                  resizeMode="cover"
                />
              )}
            </Animated.View>
          )}
        />
      )}

      {/* Sadece Öğretmenler Arıza Bildirebilir (İdareciler de isterse kontrolü kaldırabilirsin) */}
      {!isTopManagement && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setModalVisible(true)}
        >
          <Ionicons name="megaphone-outline" size={28} color="#FFF" />
        </TouchableOpacity>
      )}

      {/* YENİ ARIZA MODALI */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Arıza Bildirimi Oluştur</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close-circle" size={28} color="#999" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 500 }} nestedScrollEnabled={true}>
              <Text style={styles.inputLabel}>Arıza Kategorisi</Text>
              <View style={{ marginBottom: 15, zIndex: 1000 }}>
                <CustomDropdown
                  placeholder="Kategori Seçin"
                  options={categories}
                  value={category}
                  onSelect={setCategory}
                />
              </View>

              <Text style={styles.inputLabel}>Açıklama</Text>
              <TextInput
                style={[styles.input, { height: 80, textAlignVertical: "top" }]}
                placeholder="Arızanın yerini ve detayını yazın..."
                value={description}
                onChangeText={setDescription}
                multiline
              />

              <Text style={styles.inputLabel}>Fotoğraf (İsteğe Bağlı)</Text>
              <View style={styles.imagePickerRow}>
                <TouchableOpacity
                  style={styles.imagePickerBtn}
                  onPress={() => pickImage(true)}
                >
                  <Ionicons name="camera-outline" size={24} color="#4F46E5" />
                  <Text style={styles.imagePickerBtnText}>Kamera</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.imagePickerBtn}
                  onPress={() => pickImage(false)}
                >
                  <Ionicons name="images-outline" size={24} color="#4F46E5" />
                  <Text style={styles.imagePickerBtnText}>Galeri</Text>
                </TouchableOpacity>
              </View>

              {selectedImageUri && (
                <View style={styles.previewContainer}>
                  <Image
                    source={{ uri: selectedImageUri }}
                    style={styles.imagePreview}
                  />
                  <TouchableOpacity
                    style={styles.removeImageBtn}
                    onPress={() => setSelectedImageUri(null)}
                  >
                    <Ionicons name="close-circle" size={24} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>

            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleSubmitTicket}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.submitBtnText}>Arızayı Bildir</Text>
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
    backgroundColor: "#FFF",
    borderRadius: 16,
    marginBottom: 15,
    elevation: 3,
    overflow: "hidden",
  },
  cardMain: { padding: 15 },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  userName: { fontSize: 13, color: "#6B7280", fontWeight: "600" },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: { fontSize: 11, fontWeight: "bold" },
  categoryText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 6,
  },
  descriptionText: { fontSize: 14, color: "#4B5563", fontStyle: "italic" },
  cardImage: { width: "100%", height: 150 },

  fab: {
    position: "absolute",
    bottom: 30,
    right: 20,
    backgroundColor: "#EF4444",
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
    maxHeight: "85%",
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
    marginTop: 10,
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

  imagePickerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  imagePickerBtn: {
    flex: 0.48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#4F46E5",
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#EEF2FF",
  },
  imagePickerBtnText: { color: "#4F46E5", fontWeight: "bold", marginLeft: 8 },

  previewContainer: { position: "relative", marginBottom: 15 },
  imagePreview: { width: "100%", height: 150, borderRadius: 8 },
  removeImageBtn: {
    position: "absolute",
    top: 5,
    right: 5,
    backgroundColor: "#FFF",
    borderRadius: 12,
  },

  submitBtn: {
    backgroundColor: "#EF4444",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 15,
  },
  submitBtnText: { color: "#FFF", fontSize: 16, fontWeight: "bold" },
});
