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
  ScrollView,
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
  getDoc,
} from "firebase/firestore";
import { db } from "../../utils/firebaseConfig";
import { useAuth } from "../../context/AuthContext";
import Toast from "react-native-toast-message";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";

interface PollOption {
  text: string;
  votes: number;
}

interface Poll {
  id: string;
  question: string;
  options: PollOption[];
  createdBy: string;
  creatorName: string;
  createdAt: string;
  votedUsers: string[]; // Oy kullananların ID'lerini tutacağız ki 2 kez oy veremesinler
  status: "Aktif" | "Kapalı";
}

export default function PollsScreen() {
  const { user } = useAuth();
  const isTopManagement =
    user &&
    ["Müdür", "Müdür Baş Yardımcısı", "Müdür Yardımcısı"].includes(user.role);

  const [polls, setpolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);

  // Yeni Anket Modal Stateleri
  const [modalVisible, setModalVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]); // Başlangıçta 2 boş seçenek

  // Anketleri Firestore'dan Canlı Çek
  useEffect(() => {
    const q = query(collection(db, "polls"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Poll[];
      setpolls(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Yeni Seçenek Inputu Ekle
  const addOptionInput = () => {
    if (options.length < 5) {
      setOptions([...options, ""]);
    } else {
      Toast.show({
        type: "info",
        text1: "Maksimum 5 seçenek ekleyebilirsiniz.",
      });
    }
  };

  // Seçenek Metnini Güncelle
  const updateOptionText = (text: string, index: number) => {
    const newOptions = [...options];
    newOptions[index] = text;
    setOptions(newOptions);
  };

  // Yeni Anket Oluştur (Sadece İdareciler)
  const handleCreatePoll = async () => {
    const validOptions = options.filter((opt) => opt.trim() !== "");
    if (!question.trim() || validOptions.length < 2) {
      return Toast.show({
        type: "error",
        text1: "Eksik Bilgi",
        text2: "Soru ve en az 2 seçenek girmelisiniz.",
      });
    }

    setIsSubmitting(true);
    try {
      const formattedOptions = validOptions.map((opt) => ({
        text: opt,
        votes: 0,
      }));

      await addDoc(collection(db, "polls"), {
        question,
        options: formattedOptions,
        createdBy: user?.id,
        creatorName: user?.name,
        createdAt: new Date().toISOString(),
        votedUsers: [],
        status: "Aktif",
      });

      Toast.show({ type: "success", text1: "Anket Yayınlandı ✨" });
      setModalVisible(false);
      setQuestion("");
      setOptions(["", ""]);
    } catch (error) {
      Toast.show({ type: "error", text1: "Bir hata oluştu!" });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Oy Kullanma İşlemi
  const handleVote = async (pollId: string, optionIndex: number) => {
    if (!user?.id) return;
    try {
      const pollRef = doc(db, "polls", pollId);
      const pollSnap = await getDoc(pollRef);

      if (pollSnap.exists()) {
        const pollData = pollSnap.data() as Poll;

        // Daha önce oy kullanmış mı kontrol et
        if (pollData.votedUsers.includes(user.id)) {
          return Toast.show({ type: "error", text1: "Zaten oy kullandınız!" });
        }

        // Oy sayısını artır ve kullanıcıyı votedUsers listesine ekle
        const updatedOptions = [...pollData.options];
        updatedOptions[optionIndex].votes += 1;
        const updatedVotedUsers = [...pollData.votedUsers, user.id];

        await updateDoc(pollRef, {
          options: updatedOptions,
          votedUsers: updatedVotedUsers,
        });
      }
    } catch (error) {
      Toast.show({ type: "error", text1: "Oy verilirken hata oluştu." });
    }
  };

  // Yüzdelik Hesaplama Aracı
  const calculatePercentage = (votes: number, totalVotes: number) => {
    if (totalVotes === 0) return 0;
    return Math.round((votes / totalVotes) * 100);
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Anketler</Text>
        <Text style={styles.headerSubtitle}>
          Kurum içi oylamalar ve kararlar
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator
          size="large"
          color="#53e60f"
          style={{ marginTop: 50 }}
        />
      ) : (
        <FlatList
          data={polls}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 100 }}
          ListEmptyComponent={
            <Animated.View entering={FadeInDown} style={styles.emptyState}>
              <Ionicons name="pie-chart-outline" size={60} color="#ccc" />
              <Text style={styles.emptyStateText}>
                Henüz aktif bir anket bulunmuyor.
              </Text>
            </Animated.View>
          }
          renderItem={({ item, index }) => {
            const totalVotes = item.options.reduce(
              (sum, opt) => sum + opt.votes,
              0,
            );
            const hasVoted = user?.id
              ? item.votedUsers.includes(user.id)
              : false;

            return (
              <Animated.View
                entering={FadeInUp.delay(index * 100)}
                style={styles.card}
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.creatorName}>
                    {item.creatorName} bir anket başlattı
                  </Text>
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor:
                          item.status === "Aktif" ? "#10B98120" : "#EF444420",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        {
                          color:
                            item.status === "Aktif" ? "#10B981" : "#EF4444",
                        },
                      ]}
                    >
                      {item.status}
                    </Text>
                  </View>
                </View>

                <Text style={styles.questionText}>{item.question}</Text>
                <Text style={styles.voteCount}>{totalVotes} Oy Kullanıldı</Text>

                <View style={styles.optionsContainer}>
                  {item.options.map((opt, i) => {
                    const percentage = calculatePercentage(
                      opt.votes,
                      totalVotes,
                    );

                    // Eğer kullanıcı oy kullandıysa veya anket kapalıysa SONUÇLARI (Progress Bar) göster
                    if (hasVoted || item.status === "Kapalı") {
                      return (
                        <View key={i} style={styles.resultRow}>
                          <View style={styles.resultTextContainer}>
                            <Text style={styles.resultOptionText}>
                              {opt.text}
                            </Text>
                            <Text style={styles.resultPercentageText}>
                              %{percentage}
                            </Text>
                          </View>
                          <View style={styles.progressBarBackground}>
                            <View
                              style={[
                                styles.progressBarFill,
                                { width: `${percentage}%` },
                              ]}
                            />
                          </View>
                        </View>
                      );
                    }

                    // Henüz oy kullanmadıysa TIKLANABİLİR butonları göster
                    return (
                      <TouchableOpacity
                        key={i}
                        style={styles.voteButton}
                        onPress={() => handleVote(item.id, i)}
                      >
                        <Text style={styles.voteButtonText}>{opt.text}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </Animated.View>
            );
          }}
        />
      )}

      {/* Sadece İdareciler Anket Oluşturabilir */}
      {isTopManagement && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setModalVisible(true)}
        >
          <Ionicons name="add" size={30} color="#FFF" />
        </TouchableOpacity>
      )}

      {/* YENİ ANKET MODALI */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Yeni Anket Oluştur</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close-circle" size={28} color="#999" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 400 }}>
              <Text style={styles.inputLabel}>Soru</Text>
              <TextInput
                style={[styles.input, { height: 60, textAlignVertical: "top" }]}
                placeholder="Örn: Toplantı ne zaman olsun?"
                value={question}
                onChangeText={setQuestion}
                multiline
              />

              <Text style={styles.inputLabel}>Seçenekler</Text>
              {options.map((opt, index) => (
                <TextInput
                  key={index}
                  style={styles.input}
                  placeholder={`${index + 1}. Seçenek`}
                  value={opt}
                  onChangeText={(text) => updateOptionText(text, index)}
                />
              ))}

              {options.length < 5 && (
                <TouchableOpacity
                  style={styles.addOptionBtn}
                  onPress={addOptionInput}
                >
                  <Ionicons
                    name="add-circle-outline"
                    size={20}
                    color="#49ea18"
                  />
                  <Text style={styles.addOptionText}>Seçenek Ekle</Text>
                </TouchableOpacity>
              )}
            </ScrollView>

            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleCreatePoll}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.submitBtnText}>Anketi Yayınla</Text>
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
    padding: 20,
    borderRadius: 16,
    marginBottom: 15,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  creatorName: { fontSize: 13, color: "#6B7280", fontWeight: "600" },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 11, fontWeight: "bold" },
  questionText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 8,
  },
  voteCount: { fontSize: 12, color: "#9CA3AF", marginBottom: 15 },

  optionsContainer: { marginTop: 5 },
  voteButton: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    alignItems: "center",
  },
  voteButtonText: { fontSize: 15, fontWeight: "600", color: "#4B5563" },

  resultRow: { marginBottom: 12 },
  resultTextContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  resultOptionText: { fontSize: 14, fontWeight: "600", color: "#374151" },
  resultPercentageText: { fontSize: 14, fontWeight: "bold", color: "#4eee25" },
  progressBarBackground: {
    height: 10,
    backgroundColor: "#E5E7EB",
    borderRadius: 5,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#37eb0f",
    borderRadius: 5,
  },

  fab: {
    position: "absolute",
    bottom: 30,
    right: 20,
    backgroundColor: "#2eee11",
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
    maxHeight: "80%",
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
  addOptionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 10,
    marginBottom: 15,
  },
  addOptionText: { color: "#4aeb14", fontWeight: "bold", marginLeft: 5 },
  submitBtn: {
    backgroundColor: "#48e613",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
  },
  submitBtnText: { color: "#FFF", fontSize: 16, fontWeight: "bold" },
});
