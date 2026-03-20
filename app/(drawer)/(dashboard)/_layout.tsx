import { Tabs } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: '#007AFF', headerShown: false }}>
      <Tabs.Screen 
        name="list" 
        options={{ title: 'Ana Sayfa', tabBarIcon: ({ color }) => <FontAwesome name="users" size={24} color={color} /> }} 
      />
      <Tabs.Screen 
        name="add" 
        options={{ title: 'Yeni Ekle', tabBarIcon: ({ color }) => <FontAwesome name="plus-circle" size={24} color={color} /> }} 
      />
    </Tabs>
  );
}