// src/app/tabs/index.tsx
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View
} from "react-native";
import { AppHeader } from "../../components/app-header";
import { AppText } from "../../components/app-text";
import { Palette } from "../../constants/theme";
import { getDatabase } from "../../database";
import {
  getInventarioCompleto,
  getProductosStockBajo,
  getVentas,
  Venta,
} from "../../database/queries";

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

  const [mostrarTutorial, setMostrarTutorial] = useState(false);
  const [mostrarInfoDemo, setMostrarInfoDemo] = useState(false);

  const abrirWeb = () => {
    Linking.openURL("https://landige-page-coco-eventos.vercel.app/");
  };

  const verificarPrimeraVez = async () => {
    try {
      const yaVioTutorial = await AsyncStorage.getItem("tutorial_visto");
      if (!yaVioTutorial) {
        setMostrarTutorial(true);
      }
    } catch (error) {
      console.error("Error leyendo storage", error);
    }
  };

  const cerrarTutorial = async () => {
    try {
      await AsyncStorage.setItem("tutorial_visto", "true");
      setMostrarTutorial(false);
    } catch (error) {
      console.error("Error guardando storage", error);
    }
  };

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
      setError("No se pudieron cargar los datos. Reintenta por favor.");
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  };

  useEffect(() => {
    verificarPrimeraVez();
    cargarDatos();
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargarDatos();
    }, []),
  );

  const formatearFecha = (fecha: string) => {
    const date = new Date(fecha);
    return date.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (cargando) {
    return (
      <View style={styles.container}>
        <AppHeader subtitle="Inicio" />
        <View style={{ padding: 40, alignItems: "center" }}>
          <ActivityIndicator size="large" color={Palette.coralStrong} />
          <AppText variant="subtitle" style={{ marginTop: 15 }}>
            Inicializando COCO Eventos...
          </AppText>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle" size={60} color={Palette.danger} />
        <AppText
          variant="sectionTitle"
          color={Palette.danger}
          align="center"
          style={{ marginVertical: 15 }}
        >
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
      <AppHeader
        subtitle="Inicio · ¡Bienvenido!"
        rightContent={
          <TouchableOpacity
            onPress={() => setMostrarInfoDemo(true)}
            style={{
              padding: 5,
              backgroundColor: Palette.blushLight,
              borderRadius: 20,
            }}
          >
            <Ionicons
              name="information-circle-outline"
              size={24}
              color={Palette.coralStrong}
            />
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
        showsVerticalScrollIndicator={false}
      >
        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View
            style={[styles.statCard, { backgroundColor: Palette.coralStrong }]}
          >
            <Ionicons name="cash" size={24} color="#fff" />
            <AppText
              variant="sectionTitle"
              color="#fff"
              align="center"
              style={{ marginTop: 4 }}
            >
              ${stats.totalVentas}
            </AppText>
            <AppText variant="caption" color="#fff" align="center">
              Ventas Totales
            </AppText>
          </View>
          <View style={[styles.statCard, { backgroundColor: Palette.rose }]}>
            <Ionicons name="cube" size={24} color="#fff" />
            <AppText
              variant="sectionTitle"
              color="#fff"
              style={{ marginTop: 4 }}
              align="center"
            >
              {stats.totalProductos}
            </AppText>
            <AppText variant="caption" color="#fff" align="center">
              Productos
            </AppText>
          </View>
          <View style={[styles.statCard, { backgroundColor: Palette.peach }]}>
            <Ionicons name="warning" size={24} color="#fff" />
            <AppText
              variant="sectionTitle"
              color="#fff"
              style={{ marginTop: 4 }}
              align="center"  
            >
              {stats.stockBajo}
            </AppText>
            <AppText variant="caption" color="#fff" align="center">
              Stock Bajo
            </AppText>
          </View>
        </View>

        {stockBajoCount > 0 && (
          <TouchableOpacity
            style={styles.stockAlert}
            onPress={() => router.push("/tabs/inventario")}
          >
            <Ionicons name="warning" size={20} color={Palette.coralStrong} />
            <AppText
              variant="bodyBold"
              color={Palette.coralStrong}
              style={{ flex: 1, marginLeft: 10 }}
            >
              Atención: {stockBajoCount} productos con stock bajo
            </AppText>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={Palette.textSecondary}
            />
          </TouchableOpacity>
        )}

        {/* Últimas Ventas */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <AppText variant="sectionTitle">Últimas Ventas</AppText>
            <TouchableOpacity onPress={() => router.push("/tabs/ventas")}>
              <AppText variant="bodyBold" color={Palette.coralStrong}>
                Ver todas
              </AppText>
            </TouchableOpacity>
          </View>

          {ventas.length > 0 ? (
            ventas.map((venta) => (
              <TouchableOpacity
                key={venta.id}
                style={styles.ventaCard}
                onPress={() => router.push("/tabs/ventas")}
              >
                <View>
                  <AppText variant="cardTitle">Venta #{venta.id}</AppText>
                  <AppText variant="caption">
                    {formatearFecha(venta.fecha)}
                  </AppText>
                </View>
                <AppText variant="price" style={{ fontSize: 18 }}>
                  ${venta.total}
                </AppText>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyVentas}>
              <Ionicons
                name="cart-outline"
                size={50}
                color={Palette.textMuted}
              />
              <AppText
                variant="subtitle"
                color={Palette.textMuted}
                style={{ marginTop: 10 }}
              >
                No hay ventas registradas
              </AppText>
              <TouchableOpacity
                style={styles.emptyVentasButton}
                onPress={() => router.push("/tabs/nueva-venta")}
              >
                <AppText variant="button">Crear primera venta</AppText>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Modal del Tutorial (Onboarding) */}
      <Modal
        visible={mostrarTutorial}
        animationType="fade"
        transparent={true}
        onRequestClose={cerrarTutorial}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.tutorialCard}>
            <Image
              source={require("../../../assets/images/coquito.png")}
              style={{ width: 80, height: 80, marginBottom: 20 }}
            />
            <AppText
              variant="headerTitle"
              align="center"
              style={{ marginBottom: 10 }}
            >
              ¡Bienvenido a COCO Eventos!
            </AppText>
            <AppText
              variant="body"
              align="center"
              color={Palette.textSecondary}
              style={{ marginBottom: 20 }}
            >
              Aquí tienes 3 pasos para empezar tu feria:
            </AppText>

            <View style={{ width: "100%", marginBottom: 20 }}>
              <AppText variant="bodyBold" style={{ marginBottom: 5 }}>
                1. Crea tu catálogo
              </AppText>
              <AppText
                variant="caption"
                color={Palette.textMuted}
                style={{ marginBottom: 15 }}
              >
                Registra tus productos en la pestaña Catálogo.
              </AppText>

              <AppText variant="bodyBold" style={{ marginBottom: 5 }}>
                2. Carga tu inventario
              </AppText>
              <AppText
                variant="caption"
                color={Palette.textMuted}
                style={{ marginBottom: 15 }}
              >
                Asigna el stock inicial desde la pestaña Inventario.
              </AppText>

              <AppText variant="bodyBold" style={{ marginBottom: 5 }}>
                3. ¡A Vender!
              </AppText>
              <AppText variant="caption" color={Palette.textMuted}>
                Agrega ítems al carrito y cobra rápido en Nueva Venta.
              </AppText>
            </View>

            <TouchableOpacity
              style={styles.tutorialButton}
              onPress={cerrarTutorial}
            >
              <AppText variant="button">¡Entendido, a vender!</AppText>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal de Información (Demo) */}
      <Modal
        visible={mostrarInfoDemo}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setMostrarInfoDemo(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.tutorialCard}>
            <Image
              source={require("../../../assets/images/monki.png")}
              style={{
                width: 120,
                height: 120,
                marginBottom: 15,
                borderRadius: 20,
              }}
            />
            <AppText
              variant="headerTitle"
              align="center"
              style={{ marginBottom: 10 }}
            >
              Versión Demo
            </AppText>
            <AppText
              variant="body"
              align="center"
              color={Palette.textSecondary}
              style={{ marginBottom: 25 }}
            >
              Esta es una demostración en desarrollo de COCO Eventos. Ayúdanos a
              mejorar o entérate de las próximas novedades.
            </AppText>

            <TouchableOpacity
              style={[styles.tutorialButton, { marginBottom: 12 }]}
              onPress={abrirWeb}
            >
              <AppText variant="button">Ver web y opinar</AppText>
            </TouchableOpacity>

            <TouchableOpacity
              style={{ paddingVertical: 10 }}
              onPress={() => setMostrarInfoDemo(false)}
            >
              <AppText variant="bodyBold" color={Palette.textMuted}>
                Cerrar
              </AppText>
            </TouchableOpacity>
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
    flexDirection: "row",
    justifyContent: "space-between",
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
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 14,
  },
  stockAlert: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Palette.blushLight,
    marginHorizontal: 15,
    marginTop: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Palette.blush,
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 15,
    paddingBottom: 30,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  ventaCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: Palette.surface,
    padding: 15,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  emptyVentas: {
    alignItems: "center",
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(45, 35, 36, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  tutorialCard: {
    backgroundColor: Palette.surface,
    borderRadius: 24,
    padding: 30,
    width: "100%",
    maxWidth: 350,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  tutorialButton: {
    backgroundColor: Palette.coralStrong,
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 30,
    width: "100%",
    alignItems: "center",
  },
});
