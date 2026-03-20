import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  Alert,
  Modal,
  ActivityIndicator,
  TouchableOpacity,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../utils/firebaseConfig";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import CustomDropdown from "../../components/CustomDropdown";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as DocumentPicker from "expo-document-picker";
import { uploadFileToStorage } from "../../utils/storageService";
import Toast from "react-native-toast-message";

interface MeetingNote {
  id: string;
  title: string;
  branch: string;
  content: string; // Metin olarak girilen karar
  pdfUrl?: string; // YENİ: Eğer dışarıdan PDF yüklendiyse
  fileName?: string; // YENİ: Yüklenen dosyanın adı
  date: string;
  createdAt: any;
}

export default function MeetingsScreen() {
  const { user } = useAuth();
  const isTopManagement =
    user &&
    ["Müdür", "Müdür Baş Yardımcısı", "Müdür Yardımcısı"].includes(user.role);

  const [notes, setNotes] = useState<MeetingNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form Stateleri
  const [title, setTitle] = useState("");
  const [branch, setBranch] = useState("");
  const [content, setContent] = useState("");

  // YENİ: Dosya Yükleme Stateleri
  const [selectedFile, setSelectedFile] =
    useState<DocumentPicker.DocumentPickerAsset | null>(null);

  const branchOptions = [
    "Genel Kurul",
    "Matematik",
    "Fizik",
    "Kimya",
    "Biyoloji",
    "Edebiyat",
    "Tarih",
    "İngilizce",
    "Rehberlik",
    "Diğer",
  ];

  // (ESKİ) PDF ÇIKTI ALMA FONKSİYONU - Korundu
  const handleExportPDF = async () => {
    if (notes.length === 0)
      return Alert.alert("Hata", "Çıktı alınacak karar bulunamadı.");
    try {
      const htmlContent = `
        <html>
          <head>
            <style>
              body { font-family: 'Helvetica'; padding: 20px; color: #333; }
              h1 { color: #1D4ED8; text-align: center; border-bottom: 2px solid #1D4ED8; padding-bottom: 10px; }
              .note { border: 1px solid #ccc; border-radius: 8px; padding: 15px; margin-bottom: 15px; background-color: #f9f9f9; }
              .title { font-size: 18px; font-weight: bold; color: #111; margin-bottom: 5px; }
              .meta { font-size: 12px; color: #666; margin-bottom: 10px; font-style: italic; }
              .content { font-size: 14px; line-height: 1.6; }
              .footer { text-align: center; margin-top: 30px; font-size: 10px; color: #999; }
            </style>
          </head>
          <body>
            <h1>OkulPlus - Toplantı ve Zümre Kararları</h1>
            ${notes
              .map(
                (note) => `
              <div class="note">
                <div class="title">${note.title}</div>
                <div class="meta">Kategori: ${note.branch} | Tarih: ${note.date}</div>
                <div class="content">${note.content ? note.content.replace(/\n/g, "<br/>") : "<i>(Bu karar ekli PDF dosyası içindedir)</i>"}</div>
              </div>
            `,
              )
              .join("")}
            <div class="footer">OkulPlus Otomasyon Sistemi | Tarih: ${new Date().toLocaleDateString()}</div>
          </body>
        </html>
      `;
      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      await Sharing.shareAsync(uri);
    } catch (error) {
      Alert.alert("Hata", "PDF oluşturulamadı.");
    }
  };

  // Verileri Çek (Eski haliyle aynı)
  const fetchNotes = async () => {
    try {
      const q = query(collection(db, "meetings"), orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      const fetchedNotes: MeetingNote[] = [];
      querySnapshot.forEach((doc) => {
        fetchedNotes.push({ id: doc.id, ...doc.data() } as MeetingNote);
      });
      setNotes(fetchedNotes);
    } catch (error) {
      console.error("Kararlar çekilirken hata:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, []);

  // YENİ: Cihazdan PDF Seçme
  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets.length > 0) {
        setSelectedFile(result.assets[0]);
        setContent(""); // Eğer dosya seçtiyse metin alanını boşaltalım
      }
    } catch (error) {
      console.error("Belge seçme hatası:", error);
    }
  };

  // GÜNCELLENMİŞ: Yeni Karar Ekleme (Metin veya Dosya)
  const handleSaveNote = async () => {
    if (!title || !branch) {
      return Alert.alert(
        "Eksik Bilgi",
        "Lütfen Başlık ve Zümre alanlarını doldurun.",
      );
    }
    if (!content && !selectedFile) {
      return Alert.alert(
        "Eksik Bilgi",
        "Lütfen ya bir karar metni yazın ya da bir PDF dosyası yükleyin.",
      );
    }

    setIsSaving(true);
    try {
      let uploadedPdfUrl = "";
      let uploadedFileName = "";

      // Eğer dışarıdan bir dosya seçildiyse önce onu Storage'a yükle
      if (selectedFile) {
        const safeFileName = `tutanak_${Date.now()}.pdf`;
        uploadedPdfUrl = await uploadFileToStorage(
          selectedFile.uri,
          "meetings",
          safeFileName,
        );
        uploadedFileName = selectedFile.name;
      }

      const today = new Date();
      const dateString = `${today.getDate().toString().padStart(2, "0")}/${(today.getMonth() + 1).toString().padStart(2, "0")}/${today.getFullYear()}`;

      await addDoc(collection(db, "meetings"), {
        title,
        branch,
        content: content || "Ekli dosyaya bakınız.", // Metin yoksa uyarı yaz
        pdfUrl: uploadedPdfUrl, // Yüklenen dosyanın linki
        fileName: uploadedFileName,
        date: dateString,
        createdAt: serverTimestamp(),
      });

      setModalVisible(false);
      setTitle("");
      setBranch("");
      setContent("");
      setSelectedFile(null);
      fetchNotes();

      Toast.show({
        type: "success",
        text1: "📝 Karar Kaydedildi",
        text2: "Sisteme başarıyla işlendi.",
      });
    } catch (error) {
      Alert.alert("Hata", "Karar kaydedilemedi.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteNote = (id: string) => {
    Alert.alert("Kararı Sil", "Emin misiniz?", [
      { text: "İptal", style: "cancel" },
      {
        text: "Sil",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteDoc(doc(db, "meetings", id));
            setNotes(notes.filter((n) => n.id !== id));
            Toast.show({ type: "info", text1: "🗑️ Karar Silindi" });
          } catch (error) {
            Alert.alert("Hata", "Silinemedi.");
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      {/* ÜST BİLGİ VE PDF ÇIKTI BUTONU (KORUNDU) */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Toplantı & Zümre Kararları</Text>
          <Text style={styles.headerSubtitle}>
            Alınan kararları inceleyin veya yeni ekleyin.
          </Text>
        </View>
        <TouchableOpacity style={styles.exportBtn} onPress={handleExportPDF}>
          <Ionicons name="download-outline" size={18} color="white" />
          <Text style={styles.exportBtnText}>Tümünü PDF Yap</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator
          size="large"
          color="#007AFF"
          style={{ marginTop: 50 }}
        />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
        >
          {notes.length === 0 ? (
            <Animated.View entering={FadeInDown} style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={60} color="#ccc" />
              <Text style={styles.emptyStateText}>
                Henüz sisteme bir karar girilmemiş.
              </Text>
            </Animated.View>
          ) : (
            notes.map((note, index) => (
              <Animated.View
                key={note.id}
                entering={FadeInUp.delay(index * 100)}
                style={styles.noteCard}
              >
                <View style={styles.noteHeader}>
                  <View style={styles.branchBadge}>
                    <Text style={styles.branchText}>{note.branch}</Text>
                  </View>
                  <Text style={styles.dateText}>{note.date}</Text>
                </View>

                <Text style={styles.noteTitle}>{note.title}</Text>
                <Text style={styles.noteContent}>{note.content}</Text>

                {/* YENİ: EĞER PDF EKLENMİŞSE GÖSTER */}
                {note.pdfUrl && (
                  <TouchableOpacity
                    style={styles.attachmentBtn}
                    onPress={() => Linking.openURL(note.pdfUrl!)}
                  >
                    <Ionicons
                      name="document-attach"
                      size={18}
                      color="#4F46E5"
                    />
                    <Text style={styles.attachmentText}>
                      Eki Görüntüle: {note.fileName}
                    </Text>
                  </TouchableOpacity>
                )}

                {isTopManagement && (
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => handleDeleteNote(note.id)}
                  >
                    <Ionicons name="trash-outline" size={16} color="#FF3B30" />
                    <Text style={styles.deleteBtnText}>Sil</Text>
                  </TouchableOpacity>
                )}
              </Animated.View>
            ))
          )}
        </ScrollView>
      )}

      {/* FAB BUTON */}
      {isTopManagement && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setModalVisible(true)}
        >
          <Ionicons name="add" size={30} color="#FFF" />
        </TouchableOpacity>
      )}

      {/* MODAL */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Yeni Karar Ekle</Text>
              <TouchableOpacity
                onPress={() => {
                  setModalVisible(false);
                  setSelectedFile(null);
                }}
              >
                <Ionicons name="close-circle" size={28} color="#999" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Toplantı Konusu / Başlık:</Text>
            <TextInput
              style={styles.input}
              placeholder="Örn: 1. Dönem Zümre"
              value={title}
              onChangeText={setTitle}
            />

            <Text style={styles.inputLabel}>Zümre / Kategori:</Text>
            <View style={{ marginBottom: 15, zIndex: 1000 }}>
              <CustomDropdown
                placeholder="Zümre Seçin"
                options={branchOptions}
                value={branch}
                onSelect={setBranch}
              />
            </View>

            {/* YENİ: DOSYA YÜKLEME VEYA METİN SEÇİMİ */}
            <Text style={styles.inputLabel}>
              Karar İçeriği (Yazın VEYA PDF Yükleyin):
            </Text>

            <TouchableOpacity style={styles.pickFileBtn} onPress={pickDocument}>
              <Ionicons
                name="document-attach-outline"
                size={20}
                color={selectedFile ? "#10B981" : "#4F46E5"}
              />
              <Text
                style={[
                  styles.pickFileText,
                  selectedFile && { color: "#10B981" },
                ]}
              >
                {selectedFile
                  ? `Seçildi: ${selectedFile.name}`
                  : "Cihazdan PDF Seç"}
              </Text>
            </TouchableOpacity>

            {!selectedFile && (
              <TextInput
                style={[
                  styles.input,
                  { height: 100, textAlignVertical: "top" },
                ]}
                placeholder="1. Alınan karar...&#10;2. Alınan karar..."
                value={content}
                onChangeText={setContent}
                multiline
              />
            )}

            <TouchableOpacity
              style={styles.saveBtn}
              onPress={handleSaveNote}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.saveBtnText}>Kaydet ve Yayınla</Text>
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
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 5,
  },
  headerSubtitle: { fontSize: 13, color: "#6B7280" },
  exportBtn: {
    backgroundColor: "#10B981",
    padding: 10,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  exportBtnText: {
    color: "white",
    fontWeight: "bold",
    marginLeft: 5,
    fontSize: 13,
  },

  emptyState: { alignItems: "center", marginTop: 60 },
  emptyStateText: { color: "#9CA3AF", marginTop: 10, fontSize: 16 },

  noteCard: {
    backgroundColor: "#FFF",
    padding: 16,
    borderRadius: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    elevation: 2,
  },
  noteHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  branchBadge: {
    backgroundColor: "#DBEAFE",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  branchText: { color: "#1D4ED8", fontSize: 12, fontWeight: "bold" },
  dateText: { color: "#6B7280", fontSize: 12, fontWeight: "600" },
  noteTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 8,
  },
  noteContent: { fontSize: 14, color: "#4B5563", lineHeight: 22 },

  attachmentBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EEF2FF",
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  attachmentText: {
    color: "#4F46E5",
    marginLeft: 8,
    fontSize: 13,
    fontWeight: "bold",
  },

  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-end",
    marginTop: 10,
    padding: 5,
  },
  deleteBtnText: {
    color: "#FF3B30",
    fontSize: 13,
    fontWeight: "bold",
    marginLeft: 4,
  },

  fab: {
    position: "absolute",
    bottom: 30,
    right: 20,
    backgroundColor: "#007AFF",
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
    minHeight: "60%",
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

  pickFileBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EEF2FF",
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#C7D2FE",
    borderStyle: "dashed",
    marginBottom: 15,
  },
  pickFileText: { color: "#4F46E5", marginLeft: 8, fontWeight: "bold" },

  saveBtn: {
    backgroundColor: "#10B981",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
  },
  saveBtnText: { color: "#FFF", fontSize: 16, fontWeight: "bold" },
});
