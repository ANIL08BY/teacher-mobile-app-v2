import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, FlatList } from 'react-native';

interface DropdownProps {
  value: string;
  onSelect: (value: string) => void;
  placeholder: string;
  options: string[];
}

export default function CustomDropdown({ value, onSelect, placeholder, options }: DropdownProps) {
  const [visible, setVisible] = useState(false);

  return (
    <View style={styles.container}>
      <Pressable style={styles.dropdownBtn} onPress={() => setVisible(true)}>
        <Text style={{ color: value ? '#333' : '#999', fontSize: 16 }}>{value || placeholder}</Text>
        <Text style={{ color: '#666' }}>▼</Text>
      </Pressable>

      <Modal visible={visible} transparent animationType="fade">
        <Pressable style={styles.overlay} onPress={() => setVisible(false)}>
          <View style={styles.modalContent}>
            <FlatList
              data={options}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <Pressable 
                  style={styles.optionBtn} 
                  onPress={() => { onSelect(item); setVisible(false); }}
                >
                  <Text style={[styles.optionText, value === item && styles.selectedText]}>{item}</Text>
                </Pressable>
              )}
            />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 15 },
  dropdownBtn: { backgroundColor: 'white', padding: 15, borderRadius: 10, borderWidth: 1, borderColor: '#ddd', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '80%', backgroundColor: 'white', borderRadius: 10, maxHeight: 300, elevation: 5, overflow: 'hidden' },
  optionBtn: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
  optionText: { fontSize: 16, color: '#333' },
  selectedText: { color: '#007AFF', fontWeight: 'bold' }
});