// src/app/tabs/index.tsx
import { useEffect, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { getDatabase } from '../../database';
import {
  getVentas,
  getProductosStockBajo,
  getInventarioCompleto,
  Venta,
} from '../../database/queries';
import { AppHeader } from '../../components/app-header';
import { AppText } from '../../components/app-text';
import { Palette } from '../../constants/theme';

export default function HomeScreen() {
  const router = useRouter();
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [stockBajoCount, setStockBajoCount] = useState(0);
  const [stats, setStats] = useState({
    totalVentas: 0,
    totalProductos: 0,
    stockBajo: 0,
  });

  const cargarDatos = async () => {
    try {
      setError(null);
      await getDatabase();

      const [ventasData, stockBajo, inventario] = await Promise.all([
        getVentas(),
        getProductosStockBajo(10),
        getInventarioCompleto(),
      ]);

      setVentas(ventasData.slice(0, 5));
      setStockBajoCount(stockBajo.length);

      const totalIngresos = ventasData.reduce((sum, v) => sum + v.total, 0);

      setStats({
        totalVentas: totalIngresos,
        totalProductos: inventario.length,
        stockBajo: stockBajo.length,
      });
    } catch (e) {
      setError('No se pudieron cargar los datos. Reintenta por favor.');
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

  const formatearFecha = (fecha: string) => {
    const date = new Date(fecha);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (cargando) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Palette.coralStrong} />
        <AppText variant="subtitle" style={{ marginTop: 15 }}>
          Inicializando COCO EVENTOS...
        </AppText>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle" size={60} color={Palette.danger} />
        <AppText variant="sectionTitle" color={Palette.danger} align="center" style={{ marginVertical: 15 }}>
          {error}
        </AppText>
        <TouchableOpacity style={styles.retryButton} onPress={cargarDatos}>
          <AppText variant="button">Reintentar</AppText>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader subtitle="Inicio · ¡Bienvenido! 👋" />

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
        showsVerticalScrollIndicator={false}
      >
        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { backgroundColor: Palette.coralStrong }]}>
            <Ionicons name="cash" size={24} color="#fff" />
            <AppText variant="sectionTitle" color="#fff" style={{ marginTop: 4 }}>
              ${stats.totalVentas}
            </AppText>
            <AppText variant="caption" color="#fff">Ventas Totales</AppText>
          </View>
          <View style={[styles.statCard, { backgroundColor: Palette.rose }]}>
            <Ionicons name="cube" size={24} color="#fff" />
            <AppText variant="sectionTitle" color="#fff" style={{ marginTop: 4 }}>
              {stats.totalProductos}
            </AppText>
            <AppText variant="caption" color="#fff">Productos</AppText>
          </View>
          <View style={[styles.statCard, { backgroundColor: Palette.peach }]}>
            <Ionicons name="warning" size={24} color="#fff" />
            <AppText variant="sectionTitle" color="#fff" style={{ marginTop: 4 }}>
              {stats.stockBajo}
            </AppText>
            <AppText variant="caption" color="#fff">Stock Bajo</AppText>
          </View>
        </View>

        {stockBajoCount > 0 && (
          <TouchableOpacity
            style={styles.stockAlert}
            onPress={() => router.push('/tabs/inventario')}
          >
            <Ionicons name="warning" size={20} color={Palette.coralStrong} />
            <AppText variant="bodyBold" color={Palette.coralStrong} style={{ flex: 1, marginLeft: 10 }}>
              ⚠️ {stockBajoCount} productos con stock bajo
            </AppText>
            <Ionicons name="chevron-forward" size={20} color={Palette.textSecondary} />
          </TouchableOpacity>
        )}


        {/* Últimas Ventas */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <AppText variant="sectionTitle">🕐 Últimas Ventas</AppText>
            <TouchableOpacity onPress={() => router.push('/tabs/ventas')}>
              <AppText variant="bodyBold" color={Palette.coralStrong}>Ver todas</AppText>
            </TouchableOpacity>
          </View>

          {ventas.length > 0 ? (
            ventas.map((venta) => (
              <TouchableOpacity
                key={venta.id}
                style={styles.ventaCard}
                onPress={() => router.push('/tabs/ventas')}
              >
                <View>
                  <AppText variant="cardTitle">Venta #{venta.id}</AppText>
                  <AppText variant="caption">{formatearFecha(venta.fecha)}</AppText>
                </View>
                <AppText variant="price" style={{ fontSize: 18 }}>${venta.total}</AppText>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyVentas}>
              <Ionicons name="cart-outline" size={50} color={Palette.textMuted} />
              <AppText variant="subtitle" color={Palette.textMuted} style={{ marginTop: 10 }}>
                No hay ventas registradas
              </AppText>
              <TouchableOpacity
                style={styles.emptyVentasButton}
                onPress={() => router.push('/tabs/nueva-venta')}
              >
                <AppText variant="button">Crear primera venta</AppText>
              </TouchableOpacity>
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
    padding: 20,
    backgroundColor: Palette.background,
  },
  retryButton: {
    backgroundColor: Palette.coralStrong,
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 15,
    backgroundColor: Palette.surface,
    marginHorizontal: 15,
    marginTop: 15,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Palette.border,
    gap: 8,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 14,
  },
  stockAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.blushLight,
    marginHorizontal: 15,
    marginTop: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Palette.blush,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 15,
    paddingVertical: 18,
    backgroundColor: Palette.surface,
    marginHorizontal: 15,
    marginTop: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  actionButton: {
    alignItems: 'center',
  },
  actionIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 15,
    paddingBottom: 30,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  ventaCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Palette.surface,
    padding: 15,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  emptyVentas: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: Palette.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  emptyVentasButton: {
    backgroundColor: Palette.coralStrong,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 15,
  },
});