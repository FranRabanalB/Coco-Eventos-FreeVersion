// src/app/tabs/eventos.tsx
import { useEffect, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import {
  getEventoActivo,
  getEventos,
  finalizarEvento,
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
  const [eventosFinalizados, setEventosFinalizados] = useState<Evento[]>([]);
  const [estadisticas, setEstadisticas] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [nuevoEventoNombre, setNuevoEventoNombre] = useState('');

  const cargarDatos = async () => {
    try {
      const activo = await getEventoActivo();
      setEventoActivo(activo);

      const todos = await getEventos();
      setEventosFinalizados(todos.filter((e) => e.estado === 'finalizado'));

      if (activo) {
        const stats = await getEstadisticasEvento(activo.id);
        setEstadisticas(stats);
      }
    } catch (error) {
      console.error('Error al cargar datos:', error);
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargarDatos();
    }, [])
  );

  const handleFinalizarEvento = async () => {
    if (!eventoActivo) return;

    Alert.alert(
      'Finalizar Evento',
      `¿Estás seguro de que quieres finalizar "${eventoActivo.nombre}"?\n\nSe creará automáticamente un nuevo evento.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Finalizar',
          style: 'destructive',
          onPress: async () => {
            try {
              await finalizarEvento(eventoActivo.id);
              Alert.alert('✅ Éxito', 'Evento finalizado correctamente');
              cargarDatos();
            } catch (error) {
              Alert.alert('❌ Error', 'No se pudo finalizar el evento');
            }
          },
        },
      ]
    );
  };

  const handleCrearEvento = async () => {
    if (!nuevoEventoNombre.trim()) {
      Alert.alert('Error', 'Ingresa un nombre para el evento');
      return;
    }

    try {
      await crearEvento(nuevoEventoNombre.trim());
      Alert.alert('✅ Éxito', 'Evento creado correctamente');
      setModalVisible(false);
      setNuevoEventoNombre('');
      cargarDatos();
    } catch (error) {
      Alert.alert('❌ Error', 'No se pudo crear el evento');
    }
  };

  const verDetallesEvento = async (evento: Evento) => {
    const stats = await getEstadisticasEvento(evento.id);

    Alert.alert(
      `📊 ${evento.nombre}`,
      `📅 Inicio: ${new Date(evento.fecha_inicio).toLocaleDateString()}\n` +
        `📅 Fin: ${evento.fecha_fin ? new Date(evento.fecha_fin).toLocaleDateString() : 'Activo'}\n\n` +
        `💰 Total Ingresos: $${stats?.total_ingresos || 0}\n` +
        `🛒 Total Ventas: ${stats?.total_ventas || 0}\n` +
        `📦 Unidades Vendidas: ${stats?.unidades_vendidas || 0}\n` +
        `📦 Productos Vendidos: ${stats?.productos_vendidos || 0}\n\n` +
        `🏆 Más Vendido: ${stats?.masVendidos?.[0]?.nombre || 'N/A'}\n` +
        `📦 Unidades: ${stats?.masVendidos?.[0]?.total_vendido || 0}`,
      [{ text: 'OK' }]
    );
  };

  if (cargando) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Palette.coralStrong} />
        <AppText variant="subtitle" style={{ marginTop: 15 }}>
          Cargando eventos...
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
              cargarDatos();
            }}
          />
        }
      >
        <View style={styles.section}>
          <AppText variant="sectionTitle" style={{ marginBottom: 15 }}>
            🎯 Evento Activo
          </AppText>
          {eventoActivo ? (
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
              <TouchableOpacity
                style={styles.finalizarButton}
                onPress={handleFinalizarEvento}
              >
                <AppText variant="button">🏁 Terminar Evento</AppText>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.crearEventoCard}
              onPress={() => setModalVisible(true)}
            >
              <Ionicons name="add-circle" size={40} color={Palette.coralStrong} />
              <AppText variant="subtitle" style={{ marginTop: 10 }}>
                Crear nuevo evento
              </AppText>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.section}>
          <AppText variant="sectionTitle" style={{ marginBottom: 15 }}>
            📋 Eventos Finalizados
          </AppText>
          {eventosFinalizados.length > 0 ? (
            eventosFinalizados.map((evento) => (
              <TouchableOpacity
                key={evento.id}
                style={styles.eventoCard}
                onPress={() => verDetallesEvento(evento)}
              >
                <View style={{ flex: 1 }}>
                  <AppText variant="cardTitle">{evento.nombre}</AppText>
                  <AppText variant="caption">
                    {new Date(evento.fecha_inicio).toLocaleDateString()} -{' '}
                    {evento.fecha_fin
                      ? new Date(evento.fecha_fin).toLocaleDateString()
                      : 'Activo'}
                  </AppText>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <AppText variant="price" style={{ fontSize: 18 }}>
                    ${evento.total_ingresos}
                  </AppText>
                  <AppText variant="caption">{evento.total_ventas} ventas</AppText>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <AppText variant="subtitle" color={Palette.textMuted} align="center" style={{ paddingVertical: 20 }}>
              No hay eventos finalizados
            </AppText>
          )}
        </View>

        <Modal
          visible={modalVisible}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <AppText variant="sectionTitle">Nuevo Evento</AppText>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Ionicons name="close" size={24} color={Palette.textPrimary} />
                </TouchableOpacity>
              </View>

              <View style={{ marginBottom: 20 }}>
                <AppText variant="bodyBold" style={{ marginBottom: 8 }}>
                  Nombre del evento:
                </AppText>
                <TextInput
                  style={styles.modalInput}
                  value={nuevoEventoNombre}
                  onChangeText={setNuevoEventoNombre}
                  placeholder="Ej: Feria Primavera 2026"
                  placeholderTextColor={Palette.textMuted}
                />
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setModalVisible(false)}
                >
                  <AppText variant="bodyBold" color={Palette.textSecondary}>Cancelar</AppText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.confirmButton]}
                  onPress={handleCrearEvento}
                >
                  <AppText variant="button">Crear</AppText>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
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
  finalizarButton: {
    backgroundColor: Palette.coralStrong,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 15,
  },
  crearEventoCard: {
    backgroundColor: Palette.surface,
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Palette.border,
  },
  eventoCard: {
    backgroundColor: Palette.surface,
    padding: 15,
    borderRadius: 14,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Palette.border,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(45, 35, 36, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: Palette.surface,
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    fontFamily: 'Nunito_400Regular',
    color: Palette.textPrimary,
    backgroundColor: Palette.background,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: Palette.blushLight,
  },
  confirmButton: {
    backgroundColor: Palette.coralStrong,
  },
});