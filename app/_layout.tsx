import { Stack } from "expo-router";
import { TeacherProvider } from "../context/TeacherContext";
import { AuthProvider } from "../context/AuthContext";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { LogBox } from "react-native";
import Toast from "react-native-toast-message";

LogBox.ignoreLogs(["expo-notifications: Android Push notifications"]);

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <TeacherProvider>
          <Stack>
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="(drawer)" options={{ headerShown: false }} />
            <Stack.Screen
              name="teacher-detail/[id]"
              options={{ title: "Öğretmen Detayı" }}
            />
          </Stack>
          <Toast />
        </TeacherProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
