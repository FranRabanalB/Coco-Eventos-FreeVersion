// src/constants/theme.ts
import { Platform } from 'react-native';

// Paleta pastel rosada/durazno basada en tu referencia
export const Palette = {
  blushLight: '#F9E2E4',   // 1. Rosa muy pálido (fondos suaves, badges)
  blush: '#F4CFD3',        //    Círculo 1
  roseLight: '#F4ABB8',    // 2. Rosa pastel (botones secundarios, chips)
  rose: '#EE95A6',         //    Círculo 2
  coral: '#EB7A86',        // 3. Coral rosado (color principal / activo)
  coralStrong: '#E56674',  //    Círculo 3 (botones principales, carrito)
  peachLight: '#F7B499',   // 4. Durazno pastel (variantes activas, alertas suaves)
  peach: '#F49E7D',        //    Círculo 4
  terracotta: '#EAA596',   // 5. Terracota suave (tarjetas, acentos)
  terracottaStrong: '#DE8C7B', // Círculo 5

  // Neutros para que la interfaz respire
  background: '#FDFBF9',   // Fondo general blanco cálido
  surface: '#FFFFFF',      // Tarjetas y headers
  border: '#F2E6E6',       // Bordes sutiles
  textPrimary: '#2D2324',  // Texto oscuro cálido (más suave que el negro puro)
  textSecondary: '#8C7A7B',// Subtítulos y textos secundarios
  textMuted: '#B8A9AA',    // Placeholders y sin stock
  success: '#68B984',      // Verde suave para confirmaciones/ofertas
  danger: '#E05A5A',       // Rojo para borrar/error
} as const;

export const Colors = {
  light: {
    text: Palette.textPrimary,
    background: Palette.background,
    backgroundElement: Palette.blushLight,
    backgroundSelected: Palette.roseLight,
    textSecondary: Palette.textSecondary,
  },
  dark: {
    text: '#ffffff',
    background: '#1E1819',
    backgroundElement: '#2D2324',
    backgroundSelected: '#3D2F31',
    textSecondary: '#B8A9AA',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;