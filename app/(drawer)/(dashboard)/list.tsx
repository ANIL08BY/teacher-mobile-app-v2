import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  SectionList,
  Pressable,
  Alert,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { useTeachers } from "../../../context/TeacherContext";
import { useAuth } from "../../../context/AuthContext";
import TeacherCard from "../../../components/TeacherCard";
import { Ionicons } from "@expo/vector-icons";
import { Teacher } from "../../../constants/types";

import { Swipeable } from "react-native-gesture-handler";
import Animated, {
  FadeInDown,
  FadeInRight,
  FadeInUp,
  FadeOutLeft,
  Layout,
} from "react-native-reanimated";
import Toast from "react-native-toast-message";

export default function ListScreen() {
  const { teachers, deleteTeacher } = useTeachers();
  const { user } = useAuth();
  const router = useRouter();

  const isTopManagement =
    user &&
    ["Müdür", "Müdür Baş Yardımcısı", "Müdür Yardımcısı"].includes(user.role);

  const [searchQuery, setSearchQuery] = useState("");

  // 🔥 YENİ: AKTİF FİLTRE DURUMU
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const SECTIONS_PER_PAGE = 3;

  const branchOrder = [
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

  const groupedAndFilteredTeachers = useMemo(() => {
    const filtered = teachers.filter((teacher) => {
      // 1. ARAMA MANTIĞI
      const query = searchQuery.toLocaleLowerCase("tr-TR");
      const fullName = `${teacher.name} ${teacher.surname}`.toLocaleLowerCase(
        "tr-TR",
      );
      const branch = (teacher.branch || "").toLocaleLowerCase("tr-TR");
      const role = (teacher.role || "").toLocaleLowerCase("tr-TR");

      const matchesSearch =
        fullName.includes(query) ||
        branch.includes(query) ||
        role.includes(query);

      // 🔥 2. YENİ İK FİLTRE MANTIĞI
      let matchesFilter = true;
      if (activeFilter === "maternity") {
        matchesFilter = teacher.isOnMaternityLeave === true;
      } else if (activeFilter === "head") {
        matchesFilter = teacher.isDepartmentHead === true;
      } else if (activeFilter === "married") {
        matchesFilter = teacher.maritalStatus === "Evli";
      }

      // Hem arama kelimesine hem de filtreye uymalı
      return matchesSearch && matchesFilter;
    });

    const groups = filtered.reduce(
      (acc, teacher) => {
        const branchName = teacher.branch || "Diğer";
        const existingGroup = acc.find((g) => g.title === branchName);

        if (existingGroup) {
          existingGroup.data.push(teacher);
        } else {
          acc.push({ title: branchName, data: [teacher] });
        }
        return acc;
      },
      [] as { title: string; data: Teacher[] }[],
    );

    // Her zümrenin kendi içindeki öğretmenlerini "Zümre Başkanı" en üstte olacak şekilde sırala
    groups.forEach((group) => {
      group.data.sort((a, b) => {
        if (a.isDepartmentHead === b.isDepartmentHead) return 0;
        return a.isDepartmentHead ? -1 : 1;
      });
    });

    return groups.sort((a, b) => {
      const indexA = branchOrder.indexOf(a.title);
      const indexB = branchOrder.indexOf(b.title);

      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;

      return a.title.localeCompare(b.title);
    });
  }, [teachers, searchQuery, activeFilter]); // 👈 activeFilter da eklendi

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    setCurrentPage(1);
  };

  const handleFilterSelect = (filterType: string) => {
    // Aynı filtreye tekrar basılırsa filtreyi kapat
    setActiveFilter((prev) => (prev === filterType ? null : filterType));
    setCurrentPage(1); // Filtre değişince sayfa 1'e dönsün
  };

  const clearAllFilters = () => {
    setSearchQuery("");
    setActiveFilter(null);
    setCurrentPage(1);
  };

  const totalPages = Math.ceil(
    groupedAndFilteredTeachers.length / SECTIONS_PER_PAGE,
  );

  const paginatedSections = useMemo(() => {
    const startIndex = (currentPage - 1) * SECTIONS_PER_PAGE;
    return groupedAndFilteredTeachers.slice(
      startIndex,
      startIndex + SECTIONS_PER_PAGE,
    );
  }, [groupedAndFilteredTeachers, currentPage]);

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const handleDelete = (id: string, name: string, surname: string) => {
    if (!isTopManagement) {
      return Alert.alert(
        "Yetkisiz İşlem",
        "Personel silme yetkiniz bulunmamaktadır.",
      );
    }
    Alert.alert(
      "Personeli Sil",
      `${name} ${surname} adlı personeli sistemden kalıcı olarak silmek istediğinize emin misiniz?`,
      [
        { text: "İptal", style: "cancel" },
        {
          text: "Evet, Sil",
          style: "destructive",
          onPress: () => {
            deleteTeacher(id);
            Toast.show({
              type: "info",
              text1: "🗑️ İşlem Tamamlandı",
              text2: `${name} ${surname} listeden çıkarıldı.`,
            });
          },
        },
      ],
    );
  };

  const renderRightActions = (id: string, name: string, surname: string) => {
    return (
      <TouchableOpacity
        style={styles.deleteActionContainer}
        onPress={() => handleDelete(id, name, surname)}
      >
        <Ionicons name="trash-outline" size={28} color="white" />
        <Text style={styles.actionText}>Sil</Text>
      </TouchableOpacity>
    );
  };

  const renderLeftActions = (id: string) => {
    return (
      <TouchableOpacity
        style={styles.detailActionContainer}
        onPress={() => router.push(`/teacher-detail/${id}` as any)}
      >
        <Ionicons name="information-circle-outline" size={28} color="white" />
        <Text style={styles.actionText}>Detay</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.pageHint}>
        💡 İpucu: Detay için sağa,{" "}
        {isTopManagement
          ? "Silmek için sola kaydırın."
          : "Detay için tıklayın."}
      </Text>

      {/* Sadece veritabanında öğretmen varsa Arama Kutusunu göster */}
      {teachers.length > 0 && (
        <View>
          <View style={styles.searchContainer}>
            <Ionicons
              name="search"
              size={20}
              color="#666"
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="İsim, Branş veya Rol ile ara..."
              value={searchQuery}
              onChangeText={handleSearch}
            />
            {searchQuery.length > 0 && (
              <Pressable
                onPress={() => handleSearch("")}
                style={styles.clearBtn}
              >
                <Ionicons name="close-circle" size={20} color="#999" />
              </Pressable>
            )}
          </View>

          {/* 🔥 YENİ: DİNAMİK FİLTRELEME ÇİPLERİ */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterScroll}
            contentContainerStyle={styles.filterContainer}
          >
            <TouchableOpacity
              style={[
                styles.filterChip,
                activeFilter === "maternity" && styles.filterChipActive,
              ]}
              onPress={() => handleFilterSelect("maternity")}
            >
              <Text
                style={[
                  styles.filterChipText,
                  activeFilter === "maternity" && styles.filterChipTextActive,
                ]}
              >
                🤰 Doğum İzninde Olanlar
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterChip,
                activeFilter === "head" && styles.filterChipActive,
              ]}
              onPress={() => handleFilterSelect("head")}
            >
              <Text
                style={[
                  styles.filterChipText,
                  activeFilter === "head" && styles.filterChipTextActive,
                ]}
              >
                👑 Zümre Başkanları
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterChip,
                activeFilter === "married" && styles.filterChipActive,
              ]}
              onPress={() => handleFilterSelect("married")}
            >
              <Text
                style={[
                  styles.filterChipText,
                  activeFilter === "married" && styles.filterChipTextActive,
                ]}
              >
                💍 Evli Personel
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      {/* EMPTY STATE (BOŞ DURUM) MANTIĞI */}
      {teachers.length === 0 ? (
        /* Senaryo 1: Veritabanı Tamamen Boş */
        <Animated.View
          entering={FadeInDown.delay(200)}
          style={styles.emptyDbContainer}
        >
          <Ionicons name="folder-open-outline" size={80} color="#ccc" />
          <Text style={styles.emptyDbTitle}>Sistemde Kayıt Yok</Text>
          <Text style={styles.emptyDbText}>
            Görünüşe göre henüz hiç personel eklenmemiş.
          </Text>
          {isTopManagement && (
            <Pressable
              style={styles.addFirstBtn}
              onPress={() => router.push("/(dashboard)/add" as any)}
            >
              <Ionicons
                name="add-circle-outline"
                size={24}
                color="white"
                style={{ marginRight: 8 }}
              />
              <Text style={styles.addFirstBtnText}>
                Hadi İlk Personeli Ekle!
              </Text>
            </Pressable>
          )}
        </Animated.View>
      ) : groupedAndFilteredTeachers.length === 0 ? (
        /* Senaryo 2: Kayıt Var Ama Arama VEYA Filtre Sonucu Boş */
        <Animated.View entering={FadeInUp} style={styles.emptyContainer}>
          <Ionicons name="search-outline" size={60} color="#ccc" />
          <Text style={styles.emptyText}>
            Aradığınız kriterde veya filtrede personel bulunamadı.
          </Text>
          <Pressable style={styles.clearSearchBtn} onPress={clearAllFilters}>
            <Text style={styles.clearSearchBtnText}>
              Arama ve Filtreleri Temizle
            </Text>
          </Pressable>
        </Animated.View>
      ) : (
        /* Senaryo 3: Her Şey Normal, Listeyi Göster */
        <SectionList
          sections={paginatedSections}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20 }}
          renderSectionHeader={({ section: { title } }) => (
            <View style={styles.sectionHeaderContainer}>
              <Ionicons name="library-outline" size={20} color="#007AFF" />
              <Text style={styles.sectionHeaderText}>{title} Zümresi</Text>
            </View>
          )}
          renderItem={({ item, index }) => (
            <Animated.View
              entering={FadeInRight.delay(index * 100)}
              exiting={FadeOutLeft}
              layout={Layout.springify()}
            >
              <Swipeable
                renderRightActions={() =>
                  renderRightActions(item.id, item.name, item.surname as string)
                }
                renderLeftActions={() => renderLeftActions(item.id)}
                overshootRight={false}
                overshootLeft={false}
              >
                <View style={styles.teacherItemWrapper}>
                  {item.isDepartmentHead && (
                    <View style={styles.departmentHeadBadge}>
                      <Text style={styles.departmentHeadText}>
                        👑 Zümre Başkanı
                      </Text>
                    </View>
                  )}

                  <TeacherCard
                    teacher={item}
                    onPress={() =>
                      router.push(`/teacher-detail/${item.id}` as any)
                    }
                  />

                  {(item.title && item.title !== "Öğretmen") ||
                  item.age ||
                  item.seniorityYear ||
                  item.isOnMaternityLeave ? (
                    <View style={styles.teacherDetailsRow}>
                      {item.title && item.title !== "Öğretmen" && (
                        <View style={styles.titleBadge}>
                          <Text style={styles.titleBadgeText}>
                            {item.title}
                          </Text>
                        </View>
                      )}

                      {item.isOnMaternityLeave && (
                        <View
                          style={[
                            styles.titleBadge,
                            {
                              backgroundColor: "#FCE7F3",
                              borderColor: "#FBCFE8",
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.titleBadgeText,
                              { color: "#BE185D" },
                            ]}
                          >
                            🤰 İzinli
                          </Text>
                        </View>
                      )}

                      <Text style={styles.detailText}>
                        {item.age ? `${item.age} Yaş` : ""}
                        {item.age && item.seniorityYear ? " • " : ""}
                        {item.seniorityYear
                          ? `${item.seniorityYear} Yıl Kıdem`
                          : ""}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </Swipeable>
            </Animated.View>
          )}
        />
      )}

      {groupedAndFilteredTeachers.length > SECTIONS_PER_PAGE && (
        <View style={styles.paginationContainer}>
          <Pressable
            style={[
              styles.pageBtn,
              currentPage === 1 && styles.pageBtnDisabled,
            ]}
            onPress={handlePrevPage}
            disabled={currentPage === 1}
          >
            <Ionicons
              name="chevron-back"
              size={20}
              color={currentPage === 1 ? "#999" : "white"}
            />
            <Text
              style={[
                styles.pageBtnText,
                currentPage === 1 && { color: "#999" },
              ]}
            >
              Önceki
            </Text>
          </Pressable>
          <Text style={styles.pageIndicator}>
            Sayfa {currentPage} / {totalPages}
          </Text>
          <Pressable
            style={[
              styles.pageBtn,
              currentPage === totalPages && styles.pageBtnDisabled,
            ]}
            onPress={handleNextPage}
            disabled={currentPage === totalPages}
          >
            <Text
              style={[
                styles.pageBtnText,
                currentPage === totalPages && { color: "#999" },
              ]}
            >
              Sonraki
            </Text>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={currentPage === totalPages ? "#999" : "white"}
            />
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 15, backgroundColor: "#f0f2f5" },
  pageHint: {
    fontSize: 13,
    color: "#666",
    marginBottom: 10,
    fontStyle: "italic",
    textAlign: "center",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 10,
    paddingHorizontal: 10,
    marginBottom: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 16, color: "#333" },
  clearBtn: { padding: 5 },

  // 🔥 FİLTRE STİLLERİ
  filterScroll: { marginBottom: 15 },
  filterContainer: { gap: 10, paddingHorizontal: 2, paddingBottom: 5 },
  filterChip: {
    backgroundColor: "#E5E7EB",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },
  filterChipActive: {
    backgroundColor: "#007AFF",
    borderColor: "#007AFF",
  },
  filterChipText: {
    color: "#4B5563",
    fontWeight: "bold",
    fontSize: 13,
  },
  filterChipTextActive: {
    color: "#FFF",
  },

  sectionHeaderContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e6f2ff",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 15,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: "#007AFF",
  },
  sectionHeaderText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#007AFF",
    marginLeft: 8,
  },

  emptyDbContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 40,
    paddingHorizontal: 20,
  },
  emptyDbTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#555",
    marginTop: 15,
  },
  emptyDbText: {
    fontSize: 16,
    color: "#888",
    textAlign: "center",
    marginTop: 10,
    marginBottom: 25,
  },
  addFirstBtn: {
    flexDirection: "row",
    backgroundColor: "#34C759",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  addFirstBtnText: { color: "white", fontWeight: "bold", fontSize: 16 },

  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 50,
  },
  emptyText: { fontSize: 16, color: "#888", marginTop: 10 },
  clearSearchBtn: {
    marginTop: 15,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: "#e6f2ff",
    borderRadius: 8,
  },
  clearSearchBtnText: { color: "#007AFF", fontWeight: "bold", fontSize: 14 },

  paginationContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "white",
    padding: 15,
    borderRadius: 12,
    elevation: 5,
    marginTop: 10,
  },
  pageBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#007AFF",
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 8,
  },
  pageBtnDisabled: { backgroundColor: "#eee" },
  pageBtnText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 14,
    marginHorizontal: 5,
  },
  pageIndicator: { fontSize: 16, fontWeight: "bold", color: "#555" },

  deleteActionContainer: {
    backgroundColor: "#FF3B30",
    justifyContent: "center",
    alignItems: "center",
    width: 90,
    borderRadius: 12,
    marginBottom: 10,
    marginLeft: 10,
  },
  detailActionContainer: {
    backgroundColor: "#34C759",
    justifyContent: "center",
    alignItems: "center",
    width: 90,
    borderRadius: 12,
    marginBottom: 10,
    marginRight: 10,
  },
  actionText: { color: "white", fontWeight: "bold", marginTop: 5 },

  teacherItemWrapper: { marginBottom: 10 },
  departmentHeadBadge: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    alignSelf: "flex-start",
    marginBottom: -8,
    marginLeft: 15,
    zIndex: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  departmentHeadText: { color: "#D97706", fontWeight: "900", fontSize: 12 },
  teacherDetailsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: -5,
    marginBottom: 5,
    marginLeft: 15,
    flexWrap: "wrap",
  },
  titleBadge: {
    backgroundColor: "#DBEAFE",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  titleBadgeText: { color: "#1D4ED8", fontSize: 11, fontWeight: "bold" },
  detailText: { color: "#6B7280", fontSize: 12, fontWeight: "500" },
});
