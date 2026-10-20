// src/components/catalogo-filter.tsx
import React from 'react';
import { View, ScrollView, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Categoria, Variante } from '../database/queries';
import { Palette } from '../constants/theme';
import { AppText } from './app-text';

interface CatalogoFilterProps {
  categorias: Categoria[];
  variantes: Variante[];
  categoriaSeleccionada: number | null;
  varianteSeleccionada: number | null;
  onSelectCategoria: (id: number) => void;
  onSelectVariante: (id: number) => void;
  searchText: string;
  onChangeSearch: (text: string) => void;
  mostrarPromos?: boolean;
}

export function CatalogoFilter({
  categorias,
  variantes,
  categoriaSeleccionada,
  varianteSeleccionada,
  onSelectCategoria,
  onSelectVariante,
  searchText,
  onChangeSearch,
  mostrarPromos = false,
}: CatalogoFilterProps) {
  return (
    <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesContainer}
        contentContainerStyle={styles.categoriesContent}
      >
        {categorias.map((cat) => {
          const activa = categoriaSeleccionada === cat.id;
          return (
            <TouchableOpacity
              key={cat.id}
              style={[styles.categoryButton, activa && styles.categoryButtonActive]}
              onPress={() => onSelectCategoria(cat.id)}
            >
              <AppText
                variant="bodyBold"
                color={activa ? '#FFFFFF' : Palette.textSecondary}
              >
                {cat.nombre.toUpperCase()}
              </AppText>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.variantesContainer}
        contentContainerStyle={styles.variantesContent}
      >
        {variantes.map((var_) => {
          const activa = varianteSeleccionada === var_.id;
          const tienePromo = mostrarPromos && var_.promo_cantidad && var_.promo_precio;
          return (
            <TouchableOpacity
              key={var_.id}
              style={[styles.varianteButton, activa && styles.varianteButtonActive]}
              onPress={() => onSelectVariante(var_.id)}
            >
              <AppText
                variant={activa ? 'bodyBold' : 'body'}
                color={activa ? '#FFFFFF' : Palette.textSecondary}
              >
                {var_.nombre} {tienePromo ? `(${var_.promo_cantidad}x$${var_.promo_precio})` : ''}
              </AppText>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={Palette.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar productos..."
          value={searchText}
          onChangeText={onChangeSearch}
          placeholderTextColor={Palette.textMuted}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  categoriesContainer: {
    backgroundColor: Palette.surface,
    minHeight: 70,
    maxHeight: 70,
    borderBottomWidth: 1,
    borderBottomColor: Palette.border,
  },
  categoriesContent: {
    paddingHorizontal: 15,
    alignItems: 'center',
    minHeight: 70,
  },
  categoryButton: {
    minHeight: 42,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginRight: 10,
    borderRadius: 24,
    backgroundColor: Palette.blushLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryButtonActive: {
    backgroundColor: Palette.coralStrong,
  },
  variantesContainer: {
    backgroundColor: Palette.surface,
    minHeight: 58,
    maxHeight: 58,
    borderBottomWidth: 1,
    borderBottomColor: Palette.border,
  },
  variantesContent: {
    paddingHorizontal: 15,
    alignItems: 'center',
    minHeight: 58,
  },
  varianteButton: {
    minHeight: 38,
    paddingHorizontal: 18,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: Palette.background,
    borderWidth: 1,
    borderColor: Palette.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  varianteButtonActive: {
    backgroundColor: Palette.peach,
    borderColor: Palette.peach,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.surface,
    marginHorizontal: 15,
    marginVertical: 10,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    fontFamily: 'Nunito_400Regular',
    color: Palette.textPrimary,
  },
});