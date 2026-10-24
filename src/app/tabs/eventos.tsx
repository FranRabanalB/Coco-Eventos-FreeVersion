// src/app/tabs/eventos.tsx
import { useEffect, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import {
  getEventoActivo,
  crearEvento,
  getEstadisticasEvento,
  Evento,
} from '../../database/queries';
import { AppHeader } from '../../components/app-header';
import { AppText } from '../../components/app-text';
import { Palette } from '../../constants/theme';

export default function EventosScreen() {
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [eventoActivo, setEventoActivo] = useState<Evento | null>(null);
  const [estadisticas, setEstadisticas] = useState<any>(null);

  const inicializarEventoPorDefecto = async () => {
    try {
      let activo = await getEventoActivo();
      
      // Si no existe ningún evento activo, lo creamos automáticamente
      if (!activo) {
        await crearEvento('Actual');
        activo = await getEventoActivo();
      }
      
      setEventoActivo(activo);

      if (activo) {
        const stats = await getEstadisticasEvento(activo.id);
        setEstadisticas(stats);
      }
    } catch (error) {
      console.error('Error al inicializar evento:', error);
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  };

  useEffect(() => {
    inicializarEventoPorDefecto();
  }, []);

  useFocusEffect(
    useCallback(() => {
      inicializarEventoPorDefecto();
    }, [])
  );

  if (cargando) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Palette.coralStrong} />
        <AppText variant="subtitle" style={{ marginTop: 15 }}>
          Cargando métricas...
        </AppText>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader subtitle="Eventos" />

      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refrescando}
            onRefresh={() => {
              setRefrescando(true);
              inicializarEventoPorDefecto();
            }}
          />
        }
      >
        <View style={styles.section}>
          <AppText variant="sectionTitle" style={{ marginBottom: 15 }}>
             Evento Activo
          </AppText>
          {eventoActivo && (
            <View style={styles.eventoActivoCard}>
              <View style={styles.eventoHeader}>
                <AppText variant="sectionTitle" style={{ fontSize: 20 }}>
                  {eventoActivo.nombre}
                </AppText>
                <View style={styles.estadoBadge}>
                  <AppText variant="caption" color="#fff" style={{ fontWeight: 'bold' }}>
                    ACTIVO
                  </AppText>
                </View>
              </View>
              
              <View style={styles.eventoStats}>
                <View style={styles.eventoStat}>
                  <AppText variant="headerTitle" color={Palette.coralStrong}>
                    ${estadisticas?.total_ingresos || 0}
                  </AppText>
                  <AppText variant="caption">Ingresos</AppText>
                </View>
                <View style={styles.eventoStat}>
                  <AppText variant="headerTitle" color={Palette.coralStrong}>
                    {estadisticas?.total_ventas || 0}
                  </AppText>
                  <AppText variant="caption">Ventas</AppText>
                </View>
                <View style={styles.eventoStat}>
                  <AppText variant="headerTitle" color={Palette.coralStrong}>
                    {estadisticas?.unidades_vendidas || 0}
                  </AppText>
                  <AppText variant="caption">Unidades</AppText>
                </View>
              </View>
              
              {/* Alerta de versión Pro */}
              <View style={styles.proAlertBox}>
                <AppText variant="bodyBold" color={Palette.textSecondary} align="center" style={{ fontSize: 13 }}>
                  ⭐ Versión Lite
                </AppText>
                <AppText variant="caption" color={Palette.textMuted} align="center" style={{ marginTop: 4, fontSize: 11 }}>
                  Para poder finalizar eventos, guardar un historial de ferias pasadas y separar tus métricas por fecha, actualiza a la versión Pro.
                </AppText>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Palette.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Palette.background,
  },
  section: {
    padding: 15,
  },
  eventoActivoCard: {
    backgroundColor: Palette.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  eventoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  estadoBadge: {
    backgroundColor: Palette.peach,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  eventoStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: Palette.border,
    borderBottomWidth: 1,
    borderBottomColor: Palette.border,
  },
  eventoStat: {
    alignItems: 'center',
  },
  proAlertBox: {
    marginTop: 20,
    padding: 12,
    backgroundColor: Palette.blushLight,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Palette.border,
  }
});