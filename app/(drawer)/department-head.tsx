import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useTeachers } from "../../context/TeacherContext";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import Toast from "react-native-toast-message";

export default function DepartmentHeadScreen() {
  const { teachers, selectDepartmentHead, assignDepartmentHead } =
    useTeachers();

  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState<{
    selectedTeacher: string;
    reason: string;
  } | null>(null);

  // Benzersiz branş listesini oluştur
  const branches = Array.from(new Set(teachers.map((t) => t.branch))).filter(
    Boolean,
  );

  const handleAISelection = async () => {
    if (!selectedBranch) {
      return Toast.show({
        type: "error",
        text1: "Eksik Seçim",
        text2: "Lütfen analiz edilecek bir zümre seçin.",
      });
    }

    setIsAnalyzing(true);
    setAiResult(null);

    try {
      const result = await selectDepartmentHead(selectedBranch);
      if (result) {
        setAiResult(result);
        // İsteğe bağlı: Analiz bitince ufak bir bilgi toast'u da atılabilir
        Toast.show({
          type: "success",
          text1: "Analiz Tamamlandı",
          text2: "Yapay Zeka en uygun adayı belirledi.",
          visibilityTime: 2000,
        });
      } else {
        Toast.show({
          type: "info",
          text1: "Personel Bulunamadı",
          text2: "Bu zümrede kayıtlı öğretmen bulunmuyor.",
        });
      }
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "AI Hatası",
        text2: "Analiz sırasında bir sorun oluştu.",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedBranch || !aiResult) return;

    // AI'ın seçtiği öğretmenin ID'sini bul
    const winner = teachers.find(
      (t) => t.name === aiResult.selectedTeacher && t.branch === selectedBranch,
    );

    if (winner) {
      await assignDepartmentHead(selectedBranch, winner.id);

      // ATAMA BAŞARILI TOAST BİLDİRİMİ
      Toast.show({
        type: "success",
        text1: "✨ Zümre Başkanı Atandı",
        text2: `${winner.name} başarıyla ${selectedBranch} zümre başkanı yapıldı.`,
      });

      setAiResult(null); // İşlem bitince ekranı temizle
      setSelectedBranch(null);
    } else {
      Toast.show({
        type: "error",
        text1: "Kayıt Hatası",
        text2: "Seçilen öğretmen veritabanında bulunamadı.",
      });
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.headerTitle}>AI Zümre Başkanı Seçimi</Text>
      <Text style={styles.subtitle}>
        Yapay zeka; unvan, yaş ve kıdem yılına göre en uygun lideri analiz eder.
      </Text>

      {/* 1. BRANŞ SEÇİMİ */}
      <Text style={styles.sectionTitle}>1. Zümre Seçin</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.branchScroll}
      >
        {branches.length === 0 ? (
          <Text style={{ color: "#666", fontStyle: "italic" }}>
            Önce sisteme öğretmen eklemelisiniz.
          </Text>
        ) : (
          branches.map((branch) => (
            <TouchableOpacity
              key={branch}
              style={[
                styles.branchChip,
                selectedBranch === branch && styles.branchChipSelected,
              ]}
              onPress={() => {
                setSelectedBranch(branch);
                setAiResult(null);
              }}
            >
              <Text
                style={[
                  styles.branchText,
                  selectedBranch === branch && styles.branchTextSelected,
                ]}
              >
                {branch}
              </Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* 2. AI ANALİZ BUTONU */}
      {selectedBranch && !aiResult && (
        <Animated.View entering={FadeInUp}>
          <TouchableOpacity
            style={[
              styles.aiButton,
              isAnalyzing && { backgroundColor: "#aff394" },
            ]}
            onPress={handleAISelection}
            disabled={isAnalyzing}
          >
            {isAnalyzing ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Ionicons
                  name="sparkles"
                  size={24}
                  color="#FFF"
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.aiButtonText}>
                  {selectedBranch} Zümresini Analiz Et
                </Text>
              </>
            )}
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* 3. YAPAY ZEKA SONUÇ KARTI */}
      {aiResult && (
        <Animated.View entering={FadeInDown} style={styles.resultCard}>
          <View style={styles.resultHeader}>
            <Ionicons name="ribbon" size={32} color="#D97706" />
            <Text style={styles.resultTitle}>Yapay Zeka Önerisi</Text>
          </View>

          <Text style={styles.winnerName}>{aiResult.selectedTeacher}</Text>

          <View style={styles.reasonBox}>
            <Text style={styles.reasonTitle}>Analiz Gerekçesi:</Text>
            <Text style={styles.reasonText}>{aiResult.reason}</Text>
          </View>

          <TouchableOpacity style={styles.assignButton} onPress={handleAssign}>
            <Ionicons
              name="checkmark-circle"
              size={24}
              color="#FFF"
              style={{ marginRight: 8 }}
            />
            <Text style={styles.assignButtonText}>
              Onayla ve Zümre Başkanı Yap
            </Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F3F4F6", padding: 20 },
  headerTitle: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#1F2937",
    marginTop: 10,
  },
  subtitle: { fontSize: 14, color: "#6B7280", marginBottom: 25, marginTop: 5 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#4B5563",
    marginBottom: 15,
  },

  branchScroll: { flexDirection: "row", marginBottom: 30 },
  branchChip: {
    backgroundColor: "#E5E7EB",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },
  branchChipSelected: { backgroundColor: "#1144ed", borderColor: "#1144ed" },
  branchText: { color: "#4B5563", fontWeight: "bold" },
  branchTextSelected: { color: "#FFF" },

  aiButton: {
    backgroundColor: "#25e50f",
    flexDirection: "row",
    padding: 18,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
  },
  aiButtonText: { color: "#FFF", fontSize: 18, fontWeight: "bold" },

  resultCard: {
    backgroundColor: "#FFF",
    padding: 20,
    borderRadius: 16,
    marginTop: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    elevation: 5,
  },
  resultHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#D97706",
    marginLeft: 10,
  },
  winnerName: {
    fontSize: 28,
    fontWeight: "900",
    color: "#1F2937",
    textAlign: "center",
    marginBottom: 20,
  },

  reasonBox: {
    backgroundColor: "#F9FAFB",
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    marginBottom: 20,
  },
  reasonTitle: { fontWeight: "bold", color: "#4B5563", marginBottom: 5 },
  reasonText: { color: "#6B7280", lineHeight: 22, fontStyle: "italic" },

  assignButton: {
    backgroundColor: "#10B981",
    flexDirection: "row",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  assignButtonText: { color: "#FFF", fontSize: 18, fontWeight: "bold" },
});
