// src/app/tabs/inventario.tsx
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ajustarStock,
  getProductosStockBajo,
  Producto,
} from '../../database/queries';
import { useCatalogo } from '../../hooks/use-catalogo';
import { AppHeader } from '../../components/app-header';
import { CatalogoFilter } from '../../components/catalogo-filter';
import { AppText } from '../../components/app-text';
import { Palette } from '../../constants/theme';

export default function InventarioScreen() {
  const router = useRouter();
  const {
    cargando,
    refrescando,
    categorias,
    variantes,
    productos,
    productosFiltrados,
    categoriaSeleccionada,
    setCategoriaSeleccionada,
    varianteSeleccionada,
    setVarianteSeleccionada,
    searchText,
    setSearchText,
    recargarProductosActuales,
  } = useCatalogo();

  const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [cantidadAjuste, setCantidadAjuste] = useState('');
  const [tipoAjuste, setTipoAjuste] = useState<'agregar' | 'quitar'>('agregar');
  const [stockBajoCount, setStockBajoCount] = useState(0);

  const actualizarConteoStockBajo = useCallback(async () => {
    const stockBajo = await getProductosStockBajo(10);
    setStockBajoCount(stockBajo.length);
  }, []);

  useFocusEffect(
    useCallback(() => {
      actualizarConteoStockBajo();
    }, [actualizarConteoStockBajo])
  );

  const abrirModalAjuste = (producto: Producto) => {
    setProductoSeleccionado(producto);
    setCantidadAjuste('');
    setTipoAjuste('agregar');
    setModalVisible(true);
  };

  const confirmarAjuste = async () => {
    if (!productoSeleccionado) return;

    const cantidad = parseInt(cantidadAjuste);
    if (isNaN(cantidad) || cantidad <= 0) {
      Alert.alert('Error', 'Ingresa una cantidad válida');
      return;
    }

    const cantidadReal = tipoAjuste === 'agregar' ? cantidad : -cantidad;
    const motivo = tipoAjuste === 'agregar' ? 'Entrada de inventario' : 'Salida de inventario';

    try {
      await ajustarStock(productoSeleccionado.id, cantidadReal, motivo);
      setModalVisible(false);
      await recargarProductosActuales();
      await actualizarConteoStockBajo();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo ajustar el stock');
    }
  };

  if (cargando && !refrescando && categorias.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Palette.coralStrong} />
        <AppText variant="subtitle" style={{ marginTop: 15 }}>
          Cargando inventario...
        </AppText>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader
        subtitle={`Inventario · ${productos.length} productos`}
        rightContent={
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {stockBajoCount > 0 && (
              <TouchableOpacity
                style={styles.badgeButton}
                onPress={() => {
                  const bajos = productos.filter((p) => p.stock < 10);
                  if (bajos.length > 0) {
                    const nombres = bajos.map((p) => `• ${p.nombre} (${p.stock})`).join('\n');
                    Alert.alert('⚠️ Stock bajo en esta variante', nombres);
                  }
                }}
              >
                <Ionicons name="warning" size={18} color={Palette.coralStrong} />
                <AppText variant="caption" color={Palette.coralStrong} style={{ marginLeft: 5, fontWeight: 'bold' }}>
                  {stockBajoCount}
                </AppText>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.badgeButton, styles.newCatalogButton]}
              onPress={() => router.push('/tabs/gestionar-catalogo' as any)}
            >
              <Ionicons name="add-circle" size={18} color="#fff" />
              <AppText variant="caption" color="#fff" style={{ marginLeft: 5, fontWeight: 'bold' }}>
                Catálogo
              </AppText>
            </TouchableOpacity>
          </View>
        }
      />

      <CatalogoFilter
        categorias={categorias}
        variantes={variantes}
        categoriaSeleccionada={categoriaSeleccionada}
        varianteSeleccionada={varianteSeleccionada}
        onSelectCategoria={setCategoriaSeleccionada}
        onSelectVariante={setVarianteSeleccionada}
        searchText={searchText}
        onChangeSearch={setSearchText}
      />

      <FlatList
        data={productosFiltrados}
        keyExtractor={(item) => item.id.toString()}
        numColumns={3}
        contentContainerStyle={styles.productGrid}
        refreshControl={
          <RefreshControl refreshing={refrescando} onRefresh={recargarProductosActuales} />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.productCard, item.stock <= 0 && styles.productCardEmpty]}
            onPress={() => abrirModalAjuste(item)}
          >
            <View style={styles.productPlaceholder}>
              <Ionicons name="cube" size={22} color={Palette.terracottaStrong} />
            </View>
            <AppText variant="caption" color={Palette.textPrimary} align="center" numberOfLines={2} style={{ minHeight: 32, marginBottom: 4 }}>
              {item.nombre}
            </AppText>
            <AppText variant="price">${item.precio}</AppText>
            <View style={styles.productBottom}>
              <View
                style={[
                  styles.stockBadge,
                  item.stock < 10 && styles.stockBadgeLow,
                  item.stock <= 0 && styles.stockBadgeEmpty,
                ]}
              >
                <AppText variant="caption" color={Palette.textPrimary} style={{ fontWeight: 'bold' }}>
                  {item.stock}
                </AppText>
              </View>
              <View style={styles.editButton}>
                <Ionicons name="create-outline" size={16} color={Palette.coralStrong} />
              </View>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="cube-outline" size={50} color={Palette.textMuted} />
            <AppText variant="subtitle" color={Palette.textMuted} style={{ marginTop: 10 }}>
              No hay productos en esta variante
            </AppText>
          </View>
        }
      />

      <Modal
        visible={modalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <AppText variant="sectionTitle">Ajustar Stock</AppText>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={Palette.textPrimary} />
              </TouchableOpacity>
            </View>

            {productoSeleccionado && (
              <>
                <View style={styles.productInfoModal}>
                  <AppText variant="cardTitle">{productoSeleccionado.nombre}</AppText>
                  <AppText variant="subtitle" style={{ marginTop: 4 }}>
                    Stock actual: {productoSeleccionado.stock} unidades
                  </AppText>
                </View>

                <View style={styles.tipoAjusteContainer}>
                  <TouchableOpacity
                    style={[
                      styles.tipoButton,
                      tipoAjuste === 'agregar' && styles.tipoButtonActiveAdd,
                    ]}
                    onPress={() => setTipoAjuste('agregar')}
                  >
                    <Ionicons
                      name="add-circle"
                      size={22}
                      color={tipoAjuste === 'agregar' ? '#fff' : Palette.peach}
                    />
                    <AppText
                      variant="bodyBold"
                      color={tipoAjuste === 'agregar' ? '#fff' : Palette.textSecondary}
                    >
                      Agregar
                    </AppText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.tipoButton,
                      tipoAjuste === 'quitar' && styles.tipoButtonActiveRemove,
                    ]}
                    onPress={() => setTipoAjuste('quitar')}
                  >
                    <Ionicons
                      name="remove-circle"
                      size={22}
                      color={tipoAjuste === 'quitar' ? '#fff' : Palette.coralStrong}
                    />
                    <AppText
                      variant="bodyBold"
                      color={tipoAjuste === 'quitar' ? '#fff' : Palette.textSecondary}
                    >
                      Quitar
                    </AppText>
                  </TouchableOpacity>
                </View>

                <View style={styles.cantidadContainer}>
                  <AppText variant="cardTitle" style={{ marginRight: 15 }}>Cantidad:</AppText>
                  <TextInput
                    style={styles.cantidadInput}
                    value={cantidadAjuste}
                    onChangeText={setCantidadAjuste}
                    keyboardType="numeric"
                    placeholder="0"
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
                    onPress={confirmarAjuste}
                  >
                    <AppText variant="button">Confirmar</AppText>
                  </TouchableOpacity>
                </View>
              </>
            )}
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
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Palette.background,
  },
  badgeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.blushLight,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  newCatalogButton: {
    backgroundColor: Palette.coralStrong,
    marginLeft: 8,
  },
  productGrid: {
    paddingHorizontal: 10,
    paddingBottom: 20,
  },
  productCard: {
    flex: 1,
    margin: 5,
    backgroundColor: Palette.surface,
    borderRadius: 14,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Palette.border,
    maxWidth: '31%',
  },
  productCardEmpty: {
    opacity: 0.5,
  },
  productPlaceholder: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: Palette.blushLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  productBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 6,
    paddingHorizontal: 2,
  },
  stockBadge: {
    backgroundColor: Palette.blushLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    minWidth: 26,
    alignItems: 'center',
  },
  stockBadgeLow: {
    backgroundColor: Palette.peachLight,
  },
  stockBadgeEmpty: {
    backgroundColor: Palette.roseLight,
  },
  editButton: {
    backgroundColor: Palette.blushLight,
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
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
    marginBottom: 16,
  },
  productInfoModal: {
    backgroundColor: Palette.blushLight,
    padding: 15,
    borderRadius: 14,
    marginBottom: 16,
    alignItems: 'center',
  },
  tipoAjusteContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 10,
  },
  tipoButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: Palette.background,
    borderWidth: 1,
    borderColor: Palette.border,
    gap: 6,
  },
  tipoButtonActiveAdd: {
    backgroundColor: Palette.peach,
    borderColor: Palette.peach,
  },
  tipoButtonActiveRemove: {
    backgroundColor: Palette.coralStrong,
    borderColor: Palette.coralStrong,
  },
  cantidadContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  cantidadInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: 12,
    padding: 12,
    fontSize: 18,
    fontFamily: 'Nunito_700Bold',
    textAlign: 'center',
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