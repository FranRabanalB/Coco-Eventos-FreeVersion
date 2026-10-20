// src/components/app-text.tsx
import React from 'react';
import { Text, TextProps, StyleSheet, TextStyle } from 'react-native';
import { Palette } from '../constants/theme';

export type TextVariant =
  | 'headerTitle'
  | 'sectionTitle'
  | 'cardTitle'
  | 'body'
  | 'bodyBold'
  | 'subtitle'
  | 'caption'
  | 'price'
  | 'button';

interface AppTextProps extends TextProps {
  variant?: TextVariant;
  color?: string;
  align?: 'auto' | 'left' | 'right' | 'center' | 'justify';
}

export function AppText({
  variant = 'body',
  color,
  align,
  style,
  children,
  ...rest
}: AppTextProps) {
  // Combinamos la variante base con cualquier estilo extra que pase la pantalla
  const baseVariantStyle = variantStyles[variant];
  const flatStyle = StyleSheet.flatten([baseVariantStyle, style]) as TextStyle;

  // Asignamos la fuente Nunito correcta según el fontWeight
  let fontFamily = 'Nunito_400Regular';
  const weight = flatStyle?.fontWeight;

  if (weight === 'bold' || weight === '700') {
    fontFamily = 'Nunito_700Bold';
  } else if (weight === '800' || weight === '900') {
    fontFamily = 'Nunito_800ExtraBold';
  } else if (weight === '600') {
    fontFamily = 'Nunito_600SemiBold';
  } else if (weight === '500') {
    fontFamily = 'Nunito_500Medium';
  }

  // Quitamos fontWeight nativo para que Android/iOS no desactiven la fuente Nunito
  const { fontWeight, ...cleanStyle } = flatStyle || {};

  return (
    <Text
      style={[
        cleanStyle,
        { fontFamily },
        color ? { color } : null,
        align ? { textAlign: align } : null,
      ]}
      {...rest}
    >
      {children}
    </Text>
  );
}

const variantStyles = StyleSheet.create({
  headerTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: Palette.textPrimary,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Palette.textPrimary,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Palette.textPrimary,
  },
  body: {
    fontSize: 14,
    fontWeight: '400',
    color: Palette.textPrimary,
  },
  bodyBold: {
    fontSize: 14,
    fontWeight: '600',
    color: Palette.textPrimary,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: Palette.textSecondary,
  },
  caption: {
    fontSize: 12,
    fontWeight: '500',
    color: Palette.textSecondary,
  },
  price: {
    fontSize: 15,
    fontWeight: '800',
    color: Palette.coralStrong,
  },
  button: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});