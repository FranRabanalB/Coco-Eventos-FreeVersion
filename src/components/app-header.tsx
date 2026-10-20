// src/components/app-header.tsx
import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Palette } from '../constants/theme';
import { AppText } from './app-text';

interface AppHeaderProps {
  subtitle: string;
  title?: string;
  showBack?: boolean;
  rightContent?: React.ReactNode;
}

export function AppHeader({
  subtitle,
  title = 'COCO Eventos',
  showBack = false,
  rightContent,
}: AppHeaderProps) {
  const router = useRouter();

  return (
    <View style={styles.header}>
      <View style={styles.leftContainer}>
        {showBack && (
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={Palette.textPrimary} />
          </TouchableOpacity>
        )}
        <View>
          <AppText variant="headerTitle">{title}</AppText>
          <AppText variant="subtitle">{subtitle}</AppText>
        </View>
      </View>
      {rightContent && <View style={styles.rightContainer}>{rightContent}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: Palette.surface,
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: Palette.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});