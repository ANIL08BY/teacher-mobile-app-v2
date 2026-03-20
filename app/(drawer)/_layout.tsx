import { Drawer } from "expo-router/drawer";
import { Pressable, Alert } from "react-native";
import { useAuth } from "../../context/AuthContext";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function DrawerLayout() {
  const { logout, user } = useAuth();
  const router = useRouter();

  // Yetki Kontrolü
  const isTopManagement =
    user &&
    ["Müdür", "Müdür Baş Yardımcısı", "Müdür Yardımcısı"].includes(user.role);

  const handleLogout = () => {
    Alert.alert(
      "Çıkış",
      "Hesabınızdan çıkış yapmak istediğinize emin misiniz?",
      [
        { text: "İptal", style: "cancel" },
        {
          text: "Çıkış Yap",
          style: "destructive",
          onPress: async () => {
            await logout();
            router.replace("/(auth)/login");
          },
        },
      ],
    );
  };

  return (
    <Drawer
      initialRouteName="index"
      screenOptions={{
        headerTintColor: "#007AFF",
        headerRight: () => (
          <Pressable
            onPress={handleLogout}
            style={{ marginRight: 15, padding: 5 }}
          >
            <Ionicons name="log-out-outline" size={28} color="#FF3B30" />
          </Pressable>
        ),
      }}
    >
      {/* ÖZET EKRANI */}
      <Drawer.Screen
        name="index"
        options={{
          title: "Özet",
          drawerIcon: ({ color }) => (
            <Ionicons name="grid-outline" size={24} color={color} />
          ),
        }}
      />

      {/* ANA SAYFA */}
      <Drawer.Screen
        name="(dashboard)"
        options={{
          title: "Öğretmen Otomasyonu",
          drawerLabel: "Ana Sayfa",
          drawerIcon: ({ color }) => (
            <Ionicons name="home-outline" size={22} color={color} />
          ),
        }}
      />

      {/* PROFİL */}
      <Drawer.Screen
        name="profile"
        options={{
          title: "Profilim",
          drawerIcon: ({ color }) => (
            <Ionicons name="person-outline" size={22} color={color} />
          ),
        }}
      />

      <Drawer.Screen
        name="schedule"
        options={{
          drawerLabel: "Ders & Nöbet",
          title: "Haftalık Programlar",
          drawerIcon: ({ color, size }) => (
            <Ionicons name="calendar-outline" size={size} color={color} />
          ),
        }}
      />

      {/* BELGELER */}
      <Drawer.Screen
        name="documents"
        options={{
          drawerLabel: "Belgelerim",
          title: "Özlük Dosyam",
          drawerIcon: ({ color, size }) => (
            <Ionicons name="folder-open-outline" size={size} color={color} />
          ),
        }}
      />

      {/* DUYURU PANOSU */}
      <Drawer.Screen
        name="announcements"
        options={{
          drawerLabel: "Duyuru Panosu",
          title: "📢 Okul Duyuruları",
          drawerIcon: ({ color }) => (
            <Ionicons name="megaphone-outline" size={22} color={color} />
          ),
        }}
      />

      {/* DUYURU YAYINLA (Sadece Yönetim) */}
      <Drawer.Screen
        name="add-announcement"
        options={{
          drawerLabel: "Duyuru Yayınla",
          title: "✍️ Yeni Duyuru",
          drawerItemStyle: { display: isTopManagement ? "flex" : "none" },
          drawerIcon: ({ color }) => (
            <Ionicons name="create-outline" size={22} color={color} />
          ),
        }}
      />

      {/* İZİN İŞLEMLERİ */}
      <Drawer.Screen
        name="leave-requests"
        options={{
          drawerLabel: "İzin İşlemleri",
          title: "İzin Talepleri",
          drawerIcon: ({ color, size }) => (
            <Ionicons name="calendar-clear-outline" size={size} color={color} />
          ),
        }}
      />

      {/* SINAV PLANLAMA */}
      <Drawer.Screen
        name="exams"
        options={{
          drawerLabel: "Sınav & Gözetmen",
          title: "Sınav & Gözetmen Planlama",
          drawerIcon: ({ color, size }) => (
            <Ionicons name="sparkles" size={size} color={color} />
          ),
        }}
      />

      {/* ZÜMRE BAŞKANI SEÇİMİ */}
      <Drawer.Screen
        name="department-head"
        options={{
          drawerLabel: "Zümre Başkanı Seç",
          title: "Zümre Başkanı Seçimi",
          drawerIcon: ({ color, size }) => (
            <Ionicons name="ribbon" size={size} color={color} />
          ),
        }}
      />

      {/* TOPLANTI & KARARLAR */}
      <Drawer.Screen
        name="meetings"
        options={{
          drawerLabel: "Toplantı & Kararlar",
          title: "Toplantı Kararları",
          drawerIcon: ({ color, size }) => (
            <Ionicons name="document-text-outline" size={size} color={color} />
          ),
        }}
      />

      {/* CİHAZ SENSÖRLERİ */}
      <Drawer.Screen
        name="sensors"
        options={{
          title: "Cihaz Sensörleri",
          drawerIcon: ({ color, size }) => (
            <Ionicons name="hardware-chip-outline" size={size} color={color} />
          ),
        }}
      />

      {/* SİSTEM AYARLARI (Sadece Yönetim) */}
      <Drawer.Screen
        name="settings"
        options={{
          title: "Sistem Ayarları",
          drawerItemStyle: { display: isTopManagement ? "flex" : "none" },
          drawerIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size} color={color} />
          ),
        }}
      />

      {/* HAKKINDA */}
      <Drawer.Screen
        name="about"
        options={{
          title: "Hakkında",
          drawerIcon: ({ color }) => (
            <Ionicons
              name="information-circle-outline"
              size={22}
              color={color}
            />
          ),
        }}
      />
    </Drawer>
  );
}
