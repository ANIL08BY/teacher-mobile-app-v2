import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, Alert, Image } from 'react-native';
import { Entypo } from '@expo/vector-icons';
import { Teacher } from '../constants/types';
import { useTeachers } from '../context/TeacherContext';
import { useAuth } from '../context/AuthContext';

interface TeacherCardProps {
  teacher: Teacher;
  onPress: () => void;
}

export default function TeacherCard({ teacher, onPress }: TeacherCardProps) {
  const [menuVisible, setMenuVisible] = useState(false);
  const { deleteTeacher } = useTeachers();
  const { user } = useAuth(); 

  const getRolePower = (role: string | undefined) => {
    switch (role) {
      case 'Müdür': return 100;
      case 'Müdür Baş Yardımcısı': return 80;
      case 'Müdür Yardımcısı': return 60;
      case 'Memur': return 40;
      case 'Öğretmen': return 20;
      default: return 0;
    }
  };

  const myPower = user ? getRolePower(user.role) : 0;
  const targetPower = getRolePower(teacher.role);
  const hasPermission = myPower > targetPower; 

  const handleDelete = () => {
    setMenuVisible(false);
    Alert.alert("Sil", "Bu personeli silmek istediğinize emin misiniz?", [
      { text: "İptal", style: "cancel" },
      { text: "Sil", style: "destructive", onPress: () => deleteTeacher(teacher.id) }
    ]);
  };

  const displayRole = teacher.role && teacher.role !== 'Öğretmen' 
    ? teacher.role 
    : `${teacher.branch} Öğretmeni`;

  const defaultAvatar = `https://ui-avatars.com/api/?name=${teacher.name}+${teacher.surname}&background=007AFF&color=fff&size=150`;

  return (
    <View style={styles.card}>
      <Pressable style={styles.infoArea} onPress={onPress}>

        <Image 
          source={{ uri: teacher.avatar || defaultAvatar }} 
          style={styles.avatar} 
        />

        <View style={styles.textContainer}>
          <Text style={styles.name}>{teacher.name} {teacher.surname}</Text>
          <Text style={styles.roleText}>{displayRole}</Text>
          <Text style={styles.dutyText}>Nöbet: {teacher.duty || 'Yok'}</Text>
        </View>

      </Pressable>

      <Pressable style={styles.menuIcon} onPress={() => setMenuVisible(true)}>
        <Entypo name="dots-three-vertical" size={20} color="#666" />
      </Pressable>

      <Modal visible={menuVisible} transparent animationType="fade">
        <Pressable style={styles.overlay} onPress={() => setMenuVisible(false)}>
          <View style={styles.popupMenu}>
            
            <Pressable style={styles.menuItem} onPress={() => { setMenuVisible(false); onPress(); }}>
              <Text style={{color: '#007AFF', fontWeight: 'bold'}}>Detaylara Git</Text>
            </Pressable>
            
            {hasPermission && (
              <>
                <View style={{height: 1, backgroundColor: '#eee'}} />
                <Pressable style={styles.menuItem} onPress={handleDelete}>
                  <Text style={{color: '#FF3B30', fontWeight: 'bold'}}>Hızlı Sil</Text>
                </Pressable>
              </>
            )}

          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { 
    backgroundColor: 'white', 
    borderRadius: 12, 
    marginBottom: 10, 
    flexDirection: 'row', 
    elevation: 1, 
    overflow: 'hidden' 
  },
  infoArea: { 
    flex: 1, 
    padding: 15, 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  avatar: { 
    width: 50, 
    height: 50, 
    borderRadius: 25, 
    marginRight: 15, 
    backgroundColor: '#eee' 
  },
  textContainer: { 
    flex: 1, 
    justifyContent: 'center' 
  },
  name: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: '#333' 
  },
  roleText: { 
    color: '#007AFF', 
    fontWeight: 'bold', 
    marginTop: 2, 
    fontSize: 14 
  },
  dutyText: { 
    color: '#666', 
    marginTop: 2, 
    fontSize: 12 
  },
  menuIcon: { 
    padding: 15, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  overlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.2)', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  popupMenu: { 
    width: 200, 
    backgroundColor: 'white', 
    borderRadius: 10, 
    elevation: 5, 
    overflow: 'hidden' 
  },
  menuItem: { 
    padding: 15, 
    alignItems: 'center' 
  }
});