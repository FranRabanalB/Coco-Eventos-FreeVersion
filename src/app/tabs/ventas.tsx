// src/app/tabs/ventas.tsx
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { AppHeader } from "../../components/app-header";
import { AppText } from "../../components/app-text";
import { Palette } from "../../constants/theme";
import {
  Evento,
  finalizarEvento,
  getDetallesVenta,
  getEstadisticasVentas,
  getEventoActivo,
  getVentas,
  Venta,
} from "../../database/queries";
import { exportarVentasAExcel } from "../../utils/excel-manager";

export default function VentasScreen() {
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [estadisticas, setEstadisticas] = useState<any>(null);
  const [eventoActivo, setEventoActivo] = useState<Evento | null>(null);

  // Estados para el Modal de Detalle (Boleta)
  const [modalVisible, setModalVisible] = useState(false);
  const [ventaSeleccionada, setVentaSeleccionada] = useState<Venta | null>(null);
  const [detallesVenta, setDetallesVenta] = useState<any[]>([]);

  const cargarDatos = async () => {
    try {
      const [ventasData, statsData, eventoData] = await Promise.all([
        getVentas(),
        getEstadisticasVentas(),
        getEventoActivo(),
      ]);

      setVentas(ventasData);
      setEstadisticas(statsData);
      setEventoActivo(eventoData);
    } catch (error) {
      console.error("Error al cargar datos:", error);
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
    }, []),
  );

  const handleTerminarEvento = () => {
    if (!eventoActivo) return;

    Alert.alert(
      "Terminar evento",
      `¿Quieres cerrar "${eventoActivo.nombre}"? Sus ventas e ingresos quedarán guardados y se abrirá un evento nuevo.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Terminar",
          style: "destructive",
          onPress: async () => {
            try {
              await finalizarEvento(eventoActivo.id);
              Alert.alert(
                "Evento terminado",
                "Las ventas e ingresos quedaron guardados.",
              );
              await cargarDatos();
            } catch (error) {
              Alert.alert("Error", "No se pudo terminar el evento.");
            }
          },
        },
      ],
    );
  };

  // Función que abre el Modal y busca los detalles
  const handleVerDetalles = async (venta: Venta) => {
    try {
      const detalles = await getDetallesVenta(venta.id);
      setDetallesVenta(detalles);
      setVentaSeleccionada(venta);
      setModalVisible(true);
    } catch (error) {
      Alert.alert('Error', 'No se pudieron cargar los detalles de la venta.');
    }
  };

  if (cargando) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Palette.coralStrong} />
        <AppText variant="subtitle" style={{ marginTop: 15 }}>
          Cargando estadísticas...
        </AppText>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader
        subtitle="Reporte de Ventas"
        rightContent={
          <TouchableOpacity
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: Palette.blushLight,
              paddingHorizontal: 12,
              paddingVertical: 7,
              borderRadius: 20,
            }}
            onPress={async () => {
              try {
                await exportarVentasAExcel();
              } catch (error: any) {
                Alert.alert("Error", error.message);
              }
            }}
          >
            <Ionicons
              name="download-outline"
              size={18}
              color={Palette.coralStrong}
            />
            <AppText
              variant="caption"
              color={Palette.coralStrong}
              style={{ marginLeft: 5, fontWeight: "bold" }}
            >
              Exportar
            </AppText>
          </TouchableOpacity>
        }
      />

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
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <AppText
              variant="headerTitle"
              color={Palette.coralStrong}
              style={{ fontSize: 26 }}
            >
              ${estadisticas?.totalIngresos || 0}
            </AppText>
            <AppText variant="caption" style={{ marginTop: 4 }}>
              Total Ingresos
            </AppText>
          </View>
          <View style={[styles.statCard, styles.statCardBorder]}>
            <AppText
              variant="headerTitle"
              color={Palette.coralStrong}
              style={{ fontSize: 26 }}
            >
              {estadisticas?.totalVentas || 0}
            </AppText>
            <AppText variant="caption" style={{ marginTop: 4 }}>
              Ventas Realizadas
            </AppText>
          </View>
        </View>

        {eventoActivo && (
          <View style={styles.eventoContainer}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <AppText variant="caption">Evento activo</AppText>
              <AppText variant="cardTitle" style={{ marginTop: 2 }}>
                {eventoActivo.nombre}
              </AppText>
            </View>
            <TouchableOpacity
              style={styles.terminarEventoButton}
              onPress={handleTerminarEvento}
            >
              <Ionicons name="flag-outline" size={18} color="#fff" />
              <AppText variant="button" style={{ fontSize: 13, marginLeft: 6 }}>
                Terminar evento
              </AppText>
            </TouchableOpacity>
          </View>
        )}

       <View style={styles.section}>
          <AppText variant="sectionTitle" style={{ marginBottom: 12 }}>
            📈 Productos Más Vendidos
          </AppText>
          {estadisticas?.masVendidos?.length > 0 ? (
            estadisticas.masVendidos.map((item: any, index: number) => (
              <TouchableOpacity 
                key={index} 
                style={styles.topProduct}
                onPress={() => Alert.alert('ℹ️ Detalles', `Categoría: ${item.categoria_nombre}\nSubcategoría: ${item.variante_nombre}`)}
              >
                <View style={styles.topProductRank}>
                  <AppText
                    variant="caption"
                    color="#fff"
                    style={{ fontWeight: "bold" }}
                  >
                    #{index + 1}
                  </AppText>
                </View>
                <View style={{ flex: 1 }}>
                  <AppText variant="bodyBold">{item.nombre}</AppText>
                  <AppText variant="caption">
                    {item.total_vendido} unidades · ${item.total_ingresos}
                  </AppText>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <AppText
              variant="subtitle"
              color={Palette.textMuted}
              align="center"
              style={{ paddingVertical: 20 }}
            >
              No hay ventas registradas
            </AppText>
          )}
        </View>

        <View style={[styles.section, { marginBottom: 25 }]}>
          <AppText variant="sectionTitle" style={{ marginBottom: 12 }}>
            🕐 Últimas Ventas
          </AppText>
          {ventas.length > 0 ? (
            ventas.slice(0, 10).map((venta) => (
              <TouchableOpacity
                key={venta.id}
                style={styles.ventaItem}
                onPress={() => handleVerDetalles(venta)}
              >
                <View>
                  <AppText variant="cardTitle">Venta #{venta.id}</AppText>
                  <AppText variant="caption">
                    {new Date(venta.fecha).toLocaleDateString()}{" "}
                    {new Date(venta.fecha).toLocaleTimeString()}
                  </AppText>
                </View>
                <AppText variant="price" style={{ fontSize: 18 }}>
                  ${venta.total}
                </AppText>
              </TouchableOpacity>
            ))
          ) : (
            <AppText
              variant="subtitle"
              color={Palette.textMuted}
              align="center"
              style={{ paddingVertical: 20 }}
            >
              No hay ventas registradas
            </AppText>
          )}
        </View>
      </ScrollView>

      {/* MODAL DE DETALLE DE VENTA (BOLETA) */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <AppText variant="sectionTitle">Detalle Venta #{ventaSeleccionada?.id}</AppText>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={Palette.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 350, marginVertical: 10 }}>
              {detallesVenta.map((item, index) => (
                <View key={index} style={styles.detalleItem}>
                  <AppText variant="bodyBold" style={{ fontSize: 16 }}>{item.producto_nombre}</AppText>
                  <AppText variant="caption" color={Palette.textMuted} style={{ marginTop: 4 }}>
                    ${item.precio_unitario} x {item.cantidad} =${item.subtotal}
                  </AppText>
                </View>
              ))}
            </ScrollView>

            <View style={styles.detalleFooter}>
              <AppText variant="cardTitle">Total Cobrado</AppText>
              <AppText variant="headerTitle" color={Palette.coralStrong}>
                ${ventaSeleccionada?.total}
              </AppText>
            </View>
          </View>
        </View>
      </Modal>

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
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Palette.background,
  },
  statsContainer: {
    flexDirection: "row",
    backgroundColor: Palette.surface,
    marginHorizontal: 15,
    marginTop: 15,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  statCard: {
    flex: 1,
    alignItems: "center",
  },
  statCardBorder: {
    borderLeftWidth: 1,
    borderLeftColor: Palette.border,
  },
  eventoContainer: {
    backgroundColor: Palette.surface,
    marginHorizontal: 15,
    marginTop: 15,
    padding: 15,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: Palette.border,
  },
  terminarEventoButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Palette.coralStrong,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
  section: {
    backgroundColor: Palette.surface,
    marginHorizontal: 15,
    marginTop: 15,
    borderRadius: 16,
    padding: 15,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  topProduct: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Palette.border,
  },
  topProductRank: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Palette.rose,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  ventaItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Palette.border,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(45, 35, 36, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Palette.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: Palette.border,
  },
  detalleItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Palette.border,
  },
  detalleFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: Palette.border,
  },
});