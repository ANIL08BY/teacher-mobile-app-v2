import React from "react";
import { View, Text, StyleSheet } from "react-native";
import AppIntroSlider from "react-native-app-intro-slider";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Animated, { FadeInDown } from "react-native-reanimated";

const slides = [
  {
    key: "1",
    title: "Akıllı Nöbet Sistemi",
    text: "Yapay zeka desteğiyle adil ve hızlı nöbet dağıtımı yapın, canlı olarak takip edin.",
    icon: "color-wand",
    color: "#4F46E5", // İndigo (İdareci Rengi)
  },
  {
    key: "2",
    title: "Anında Destek & İzin",
    text: "Okuldaki arızaları fotoğraflı bildirin, izin taleplerinizi saniyeler içinde oluşturun.",
    icon: "construct",
    color: "#10B981", // Zümrüt Yeşili
  },
  {
    key: "3",
    title: "Kurum İçi Etkileşim",
    text: "Okul takvimini yönetin, anketlerle kurum içi iletişimi ve şeffaflığı artırın.",
    icon: "pie-chart",
    color: "#F59E0B", // Kehribar Sarısı
  },
];

export default function OnboardingScreen() {
  const router = useRouter();

  const onDone = async () => {
    // Kullanıcı tanıtımı bitirdi, telefon hafızasına "Gördü" olarak kaydet
    await AsyncStorage.setItem("hasSeenOnboarding", "true");
    // Giriş yapma ekranına (veya ana dizine) yönlendir
    router.replace("/");
  };

  const renderItem = ({ item }: any) => {
    return (
      <View style={[styles.slide, { backgroundColor: item.color }]}>
        <Animated.View
          entering={FadeInDown.delay(200)}
          style={styles.iconContainer}
        >
          <Ionicons name={item.icon} size={120} color="#FFF" />
        </Animated.View>
        <Animated.Text entering={FadeInDown.delay(400)} style={styles.title}>
          {item.title}
        </Animated.Text>
        <Animated.Text entering={FadeInDown.delay(600)} style={styles.text}>
          {item.text}
        </Animated.Text>
      </View>
    );
  };

  return (
    <AppIntroSlider
      renderItem={renderItem}
      data={slides}
      onDone={onDone}
      showSkipButton={true}
      onSkip={onDone}
      nextLabel="İleri"
      skipLabel="Geç"
      doneLabel="Başla"
      activeDotStyle={{ backgroundColor: "#FFF", width: 30 }}
      dotStyle={{ backgroundColor: "rgba(255,255,255,0.3)" }}
    />
  );
}

const styles = StyleSheet.create({
  slide: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
  },
  iconContainer: {
    marginBottom: 50,
    backgroundColor: "rgba(255,255,255,0.2)",
    padding: 30,
    borderRadius: 100,
  },
  title: {
    fontSize: 28,
    color: "#FFF",
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
  },
  text: {
    fontSize: 16,
    color: "rgba(255,255,255,0.9)",
    textAlign: "center",
    lineHeight: 24,
  },
});
