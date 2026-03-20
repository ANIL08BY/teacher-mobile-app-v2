import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';

export default function SkeletonCard() {
  const fadeAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 0.3, duration: 800, useNativeDriver: true })
      ])
    ).start();
  }, [fadeAnim]);

  return (
    <Animated.View style={[styles.card, { opacity: fadeAnim }]}>
      <View style={styles.infoArea}>

        <View style={styles.namePlaceholder} />

        <View style={styles.branchPlaceholder} />
      </View>

      <View style={styles.iconPlaceholder} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: 'white', borderRadius: 12, marginBottom: 10, flexDirection: 'row', padding: 15, alignItems: 'center', elevation: 1 },
  infoArea: { flex: 1 },
  namePlaceholder: { width: '60%', height: 20, backgroundColor: '#e0e0e0', borderRadius: 4, marginBottom: 10 },
  branchPlaceholder: { width: '40%', height: 14, backgroundColor: '#e0e0e0', borderRadius: 4 },
  iconPlaceholder: { width: 20, height: 20, backgroundColor: '#e0e0e0', borderRadius: 10 }
});