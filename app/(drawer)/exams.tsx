import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
} from "react-native";
import { useTeachers } from "../../context/TeacherContext";
import { Ionicons } from "@expo/vector-icons";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Toast from "react-native-toast-message";

export default function ExamScheduleScreen() {
  // --- CONTEXT (BEYİN) ---
  const { generateExamSchedule } = useTeachers();

  // --- STATE'LER (Hafıza) ---
  const [examName, setExamName] = useState("");
  const [examList, setExamList] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [schedule, setSchedule] = useState<any[]>([]);

  // --- OTOMATİK KAYIT VE YÜKLEME (ASYNC STORAGE) ---

  // 1. Sayfa ilk açıldığında telefondaki eski verileri getir
  useEffect(() => {
    const loadSavedData = async () => {
      try {
        const savedExams = await AsyncStorage.getItem("@examList");
        const savedSchedule = await AsyncStorage.getItem("@examSchedule");

        if (savedExams) setExamList(JSON.parse(savedExams));
        if (savedSchedule) setSchedule(JSON.parse(savedSchedule));
      } catch (error) {
        console.error("Veriler yüklenemedi", error);
      }
    };
    loadSavedData();
  }, []);

  // 2. examList state'i her değiştiğinde telefona otomatik kaydet
  useEffect(() => {
    AsyncStorage.setItem("@examList", JSON.stringify(examList));
  }, [examList]);

  // 3. schedule (AI Takvimi) her değiştiğinde telefona otomatik kaydet
  useEffect(() => {
    AsyncStorage.setItem("@examSchedule", JSON.stringify(schedule));
  }, [schedule]);

  // --- FONKSİYONLAR ---
  const addExam = () => {
    if (examName.trim() === "") {
      return Toast.show({
        type: "error",
        text1: "Hata",
        text2: "Lütfen bir sınav adı girin.",
      });
    }
    if (examList.includes(examName)) {
      return Toast.show({
        type: "error",
        text1: "Hata",
        text2: "Bu sınav zaten listeye eklendi.",
      });
    }

    setExamList([...examList, examName]);
    setExamName("");

    // Opsiyonel: Eklendiğine dair ufak bir toast da konulabilir ama seri ekleme yapılacağı için yorucu olabilir.
  };

  const removeExam = (exam: string) => {
    setExamList(examList.filter((item) => item !== exam));
    //  Sınav silindiğinde bilgi veren Toast
    Toast.show({
      type: "info",
      text1: "Sınav Silindi",
      text2: `${exam} listeden çıkarıldı.`,
    });
  };

  // İŞTE BÜYÜNÜN GERÇEKLEŞTİĞİ YER
  const handleGenerateSchedule = async () => {
    if (examList.length === 0) {
      return Toast.show({
        type: "error",
        text1: "Eksik Veri",
        text2: "Lütfen dağıtılacak sınavları ekleyin.",
      });
    }

    setIsGenerating(true);
    setSchedule([]); // Yeni hesaplama başlarken eski takvimi temizle

    try {
      const result = await generateExamSchedule(examList);
      setSchedule(result);

      // ALERT YERİNE TOAST BAŞARI MESAJI
      Toast.show({
        type: "success",
        text1: "✨ Mükemmel Planlama",
        text2: "Yapay Zeka takvimi ve gözetmenleri kusursuzca ayarladı!",
        visibilityTime: 4000,
      });
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "AI Hatası",
        text2: "Takvim oluşturulurken bir sorun yaşandı.",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const exportToPDF = async () => {
    try {
      const htmlContent = `
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: 'Helvetica', sans-serif; padding: 20px; color: #1F2937; }
              .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #3B82F6; padding-bottom: 10px; }
              h1 { margin: 0; font-size: 24px; color: #1F2937; }
              p { margin: 5px 0; color: #6B7280; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #D1D5DB; padding: 12px; text-align: left; }
              th { background-color: #F3F4F6; color: #4B5563; font-weight: bold; }
              tr:nth-child(even) { background-color: #F9FAFB; }
              .ai-badge { text-align: right; font-size: 12px; color: #0f35f2; margin-top: 20px; font-style: italic; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>Sınav Gözetmen Takvimi</h1>
              <p>Yapay Zeka (AI) Destekli Adil Dağıtım Çizelgesi</p>
            </div>
            <table>
              <tr>
                <th>Sınav Adı</th>
                <th>Tarih</th>
                <th>Saat</th>
                <th>Atanan Gözetmen</th>
              </tr>
              ${schedule
                .map(
                  (item) => `
                <tr>
                  <td><strong>${item.examName}</strong></td>
                  <td>${item.date}</td>
                  <td>${item.time}</td>
                  <td>${item.invigilator}</td>
                </tr>
              `,
                )
                .join("")}
            </table>
            <div class="ai-badge">Bu çizelge AI tarafından oluşturulmuştur.</div>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      await Sharing.shareAsync(uri, {
        UTI: ".pdf",
        mimeType: "application/pdf",
      });

      // PDF PAYLAŞILDIĞINDA BAŞARI TOASTI
      Toast.show({
        type: "success",
        text1: "📄 Takvim Çıkarıldı",
        text2: "PDF dosyası başarıyla oluşturuldu ve paylaşıldı.",
      });
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "PDF Hatası",
        text2: "Dosya oluşturulurken bir sorun yaşandı.",
      });
    }
  };

  // --- ARAYÜZ (UI) ---
  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>Sınav & Gözetmen Planlama</Text>

      {/* Sınav Ekleme Alanı (Sadece takvim yokken göster) */}
      {schedule.length === 0 && (
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Örn: 9. Sınıf Matematik"
            value={examName}
            onChangeText={setExamName}
          />
          <TouchableOpacity style={styles.addButton} onPress={addExam}>
            <Ionicons name="add" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>
      )}

      {/* EKRANIN ORTASI: YA EKLENEN SINAVLAR YA DA SONUÇLAR */}
      {schedule.length > 0 ? (
        // EĞER YAPAY ZEKA TAKVİMİ OLUŞTURDUYSA SONUÇ KARTLARINI GÖSTER
        <View style={styles.listContainer}>
          <View style={styles.successHeader}>
            <Ionicons name="checkmark-circle" size={24} color="#10B981" />
            <Text style={styles.sectionTitleSuccess}>
              {" "}
              AI Takvimi Başarıyla Oluşturdu
            </Text>
          </View>
          <FlatList
            data={schedule}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.scheduleCard}>
                <View style={styles.scheduleHeader}>
                  <Text style={styles.scheduleExamName}>{item.examName}</Text>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {item.date} - {item.time}
                    </Text>
                  </View>
                </View>
                <View style={styles.invigilatorRow}>
                  <Ionicons name="person" size={16} color="#4B5563" />
                  <Text style={styles.invigilatorText}>
                    {" "}
                    Gözetmen: {item.invigilator}
                  </Text>
                </View>
              </View>
            )}
          />
          <TouchableOpacity
            style={styles.resetButton}
            onPress={() => {
              setSchedule([]);
              setExamList([]);
            }}
          >
            <Text style={styles.resetButtonText}>Yeni Planlama Yap</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.resetButton,
              { backgroundColor: "#10B981", marginBottom: 10 },
            ]}
            onPress={exportToPDF}
          >
            <Ionicons
              name="document-text"
              size={20}
              color="#FFF"
              style={{ marginRight: 8 }}
            />
            <Text style={styles.resetButtonText}>Takvimi PDF Olarak İndir</Text>
          </TouchableOpacity>
        </View>
      ) : (
        // EĞER TAKVİM HENÜZ OLUŞTURULMADIYSA LİSTEYİ GÖSTER
        <View style={styles.listContainer}>
          <Text style={styles.sectionTitle}>
            Planlanacak Sınavlar ({examList.length})
          </Text>
          {examList.length === 0 ? (
            <Text style={styles.emptyText}>Henüz sınav eklenmedi.</Text>
          ) : (
            <FlatList
              data={examList}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <View style={styles.examCard}>
                  <Text style={styles.examText}>{item}</Text>
                  <TouchableOpacity onPress={() => removeExam(item)}>
                    <Ionicons name="trash" size={20} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              )}
            />
          )}
        </View>
      )}

      {/* YAPAY ZEKA ATEŞLEME BUTONU (Sadece takvim yokken göster) */}
      {schedule.length === 0 && (
        <TouchableOpacity
          style={[styles.aiButton, isGenerating && styles.aiButtonDisabled]}
          onPress={handleGenerateSchedule}
          disabled={isGenerating}
        >
          <Ionicons
            name="sparkles"
            size={20}
            color="#FFF"
            style={{ marginRight: 8 }}
          />
          <Text style={styles.aiButtonText}>
            {isGenerating
              ? "AI Hesaplarken Bekleyin..."
              : "AI İle Takvimi Oluştur"}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// --- STİLLER ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    padding: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 20,
    marginTop: 10,
  },
  inputContainer: {
    flexDirection: "row",
    marginBottom: 20,
  },
  input: {
    flex: 1,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 16,
  },
  addButton: {
    backgroundColor: "#3B82F6",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 15,
    borderRadius: 8,
    marginLeft: 10,
  },
  listContainer: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#4B5563",
    marginBottom: 10,
  },
  emptyText: {
    color: "#9CA3AF",
    fontStyle: "italic",
  },
  examCard: {
    backgroundColor: "#FFF",
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: "#3B82F6",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  examText: {
    fontSize: 16,
    color: "#1F2937",
    fontWeight: "500",
  },
  aiButton: {
    backgroundColor: "#2bf016",
    flexDirection: "row",
    justifyContent: "center",
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 20,
    marginBottom: 10,
  },
  aiButtonDisabled: {
    backgroundColor: "#cefdb5",
  },
  aiButtonText: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "bold",
  },
  // SONUÇ KARTLARI STİLLERİ
  successHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  sectionTitleSuccess: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#10B981",
  },
  scheduleCard: {
    backgroundColor: "#FFF",
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  scheduleHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  scheduleExamName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1F2937",
    flex: 1,
  },
  badge: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    color: "#D97706",
    fontWeight: "bold",
    fontSize: 12,
  },
  invigilatorRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    padding: 8,
    borderRadius: 6,
  },
  invigilatorText: {
    fontSize: 14,
    color: "#4B5563",
    fontWeight: "600",
    marginLeft: 5,
  },
  resetButton: {
    backgroundColor: "#EF4444",
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
    marginBottom: 10,
  },
  resetButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "bold",
  },
});
