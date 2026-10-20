// src/app/tabs/nueva-venta.tsx
import { useState, useMemo, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  guardarVentaConEvento,
  getEventoActivo,
  calcularTotalesCarrito,
  Producto,
  CartItem,
} from '../../database/queries';
import { useCatalogo } from '../../hooks/use-catalogo';
import { AppHeader } from '../../components/app-header';
import { CatalogoFilter } from '../../components/catalogo-filter';
import { AppText } from '../../components/app-text';
import { Palette } from '../../constants/theme';

export default function NuevaVentaScreen() {
  const router = useRouter();
  const {
    categorias,
    variantes,
    productosFiltrados,
    categoriaSeleccionada,
    setCategoriaSeleccionada,
    varianteSeleccionada,
    setVarianteSeleccionada,
    searchText,
    setSearchText,
    recargarProductosActuales,
  } = useCatalogo();

  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const agregarAlCarrito = useCallback((producto: Producto) => {
    if (producto.stock <= 0) {
      Alert.alert('Sin stock', `No hay stock disponible de "${producto.nombre}"`);
      return;
    }

    const varianteInfo = variantes.find((v) => v.id === producto.variante_id);

    setCartItems((prev) => {
      const existente = prev.find((item) => item.id === producto.id);
      if (existente) {
        if (existente.cantidad < producto.stock) {
          return prev.map((item) =>
            item.id === producto.id
              ? { ...item, cantidad: item.cantidad + 1 }
              : item
          );
        } else {
          Alert.alert('Stock insuficiente', `No hay suficiente stock de "${producto.nombre}"`);
          return prev;
        }
      }
      return [
        ...prev,
        {
          id: producto.id,
          variante_id: producto.variante_id,
          variante_nombre: varianteInfo?.nombre,
          nombre: producto.nombre,
          precio: producto.precio,
          cantidad: 1,
          stock: producto.stock,
          promo_cantidad: varianteInfo?.promo_cantidad ?? null,
          promo_precio: varianteInfo?.promo_precio ?? null,
        },
      ];
    });
  }, [variantes]);

  const actualizarCantidad = useCallback((id: number, cambio: number) => {
    setCartItems((prev) =>
      prev
        .map((item) => {
          if (item.id === id) {
            const nuevaCantidad = Math.max(0, item.cantidad + cambio);
            if (nuevaCantidad > item.stock) {
              Alert.alert('Stock insuficiente', 'No hay suficiente stock para este producto');
              return item;
            }
            return { ...item, cantidad: nuevaCantidad };
          }
          return item;
        })
        .filter((item) => item.cantidad > 0)
    );
  }, []);

  const eliminarDelCarrito = useCallback((id: number) => {
    setCartItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const resumenCarrito = useMemo(() => {
    return calcularTotalesCarrito(cartItems);
  }, [cartItems]);

  const total = resumenCarrito.totalConDescuento;

  const confirmarYFinalizar = async () => {
    if (cartItems.length === 0) return;

    setGuardando(true);
    try {
      const ventaId = await guardarVentaConEvento(cartItems);
      const eventoActivo = await getEventoActivo();

      Alert.alert(
        '✅ Venta confirmada',
        `Venta #${ventaId} registrada correctamente\nEvento: ${eventoActivo?.nombre || 'Actual'}\nTotal cobrado: $${total}`,
        [
          {
            text: 'OK',
            onPress: () => {
              setCartItems([]);
              setShowConfirmModal(false);
              recargarProductosActuales();
              router.push('/tabs/ventas');
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert('❌ Error', 'No se pudo completar la venta.');
    } finally {
      setGuardando(false);
    }
  };

  const rechazarVenta = () => {
    Alert.alert('Cancelar venta', '¿Seguro que quieres vaciar el carrito?', [
      { text: 'Seguir editando', style: 'cancel' },
      {
        text: 'Vaciar',
        style: 'destructive',
        onPress: () => {
          setCartItems([]);
          setShowConfirmModal(false);
        },
      },
    ]);
  };

  const renderProductItem = useCallback(({ item }: { item: Producto }) => (
    <TouchableOpacity
      style={[styles.productCard, item.stock <= 0 && styles.productCardDisabled]}
      onPress={() => agregarAlCarrito(item)}
      disabled={item.stock <= 0}
    >
      <View style={styles.productPlaceholder}>
        <Ionicons name="pricetag" size={22} color={Palette.coral} />
      </View>
      <AppText variant="caption" color={Palette.textPrimary} align="center" numberOfLines={2} style={{ minHeight: 32, marginBottom: 4 }}>
        {item.nombre}
      </AppText>
      <AppText variant="price">${item.precio}</AppText>
      {item.stock > 0 ? (
        <View style={styles.addButton}>
          <Ionicons name="add" size={18} color="#fff" />
        </View>
      ) : (
        <View style={styles.outOfStockBadge}>
          <AppText variant="caption" style={{ fontSize: 10 }}>Sin stock</AppText>
        </View>
      )}
    </TouchableOpacity>
  ), [agregarAlCarrito]);

  return (
    <View style={styles.container}>
      <AppHeader subtitle="Nueva Venta" />

      <CatalogoFilter
        categorias={categorias}
        variantes={variantes}
        categoriaSeleccionada={categoriaSeleccionada}
        varianteSeleccionada={varianteSeleccionada}
        onSelectCategoria={setCategoriaSeleccionada}
        onSelectVariante={setVarianteSeleccionada}
        searchText={searchText}
        onChangeSearch={setSearchText}
        mostrarPromos={true}
      />

      <FlatList
        data={productosFiltrados}
        keyExtractor={(item) => item.id.toString()}
        numColumns={3}
        contentContainerStyle={styles.productGrid}
        renderItem={renderProductItem}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="search-outline" size={50} color={Palette.textMuted} />
            <AppText variant="subtitle" color={Palette.textMuted} style={{ marginTop: 10 }}>
              No se encontraron productos
            </AppText>
          </View>
        }
      />

      {cartItems.length > 0 && (
        <View style={styles.cartFloating}>
          <TouchableOpacity
            style={styles.cartButton}
            onPress={() => setShowConfirmModal(true)}
          >
            <View style={styles.cartBadge}>
              <AppText variant="bodyBold" color={Palette.coralStrong}>
                {cartItems.reduce((sum, item) => sum + item.cantidad, 0)}
              </AppText>
            </View>
            <Ionicons name="cart" size={24} color="#fff" />
            <AppText variant="sectionTitle" color="#fff" style={{ marginLeft: 10 }}>
              ${total}
            </AppText>
            {resumenCarrito.descuentoTotal > 0 && (
              <View style={styles.promoPill}>
                <AppText variant="caption" color={Palette.coralStrong} style={{ fontSize: 11, fontWeight: 'bold' }}>
                  Oferta aplicada
                </AppText>
              </View>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Modal de confirmación */}
      <Modal
        visible={showConfirmModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowConfirmModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <AppText variant="sectionTitle">Confirmar Venta</AppText>
              <TouchableOpacity onPress={() => setShowConfirmModal(false)}>
                <Ionicons name="close" size={24} color={Palette.textPrimary} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={cartItems}
              keyExtractor={(item) => item.id.toString()}
              style={styles.modalItemsList}
              renderItem={({ item }) => (
                <View style={styles.modalItem}>
                  <View style={{ flex: 1 }}>
                    <AppText variant="bodyBold">{item.nombre}</AppText>
                    <AppText variant="caption">
                      ${item.precio} x {item.cantidad} = ${item.precio * item.cantidad}
                    </AppText>
                  </View>
                  <View style={styles.modalItemActions}>
                    <TouchableOpacity
                      style={styles.quantityButton}
                      onPress={() => actualizarCantidad(item.id, -1)}
                    >
                      <AppText variant="cardTitle" color={Palette.coralStrong}>−</AppText>
                    </TouchableOpacity>
                    <AppText variant="bodyBold" align="center" style={{ marginHorizontal: 10, minWidth: 20 }}>
                      {item.cantidad}
                    </AppText>
                    <TouchableOpacity
                      style={styles.quantityButton}
                      onPress={() => actualizarCantidad(item.id, 1)}
                    >
                      <AppText variant="cardTitle" color={Palette.coralStrong}>+</AppText>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{ marginLeft: 10 }}
                      onPress={() => eliminarDelCarrito(item.id)}
                    >
                      <Ionicons name="trash" size={20} color={Palette.danger} />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            />

            <View style={styles.modalFooter}>
              {resumenCarrito.descuentoTotal > 0 && (
                <View style={styles.promoBox}>
                  <AppText variant="bodyBold" color={Palette.coralStrong} style={{ marginBottom: 4 }}>
                    🎉 Promociones aplicadas:
                  </AppText>
                  {resumenCarrito.promosAplicadas.map((promo, idx) => (
                    <AppText key={idx} variant="caption" color={Palette.textPrimary}>
                      • {promo}
                    </AppText>
                  ))}
                  <View style={styles.discountRow}>
                    <AppText variant="caption">Subtotal normal:</AppText>
                    <AppText variant="caption" color={Palette.textMuted} style={{ textDecorationLine: 'line-through' }}>
                      ${resumenCarrito.subtotalSinDescuento}
                    </AppText>
                  </View>
                  <View style={styles.discountRow}>
                    <AppText variant="caption">Ahorro promo:</AppText>
                    <AppText variant="caption" color={Palette.coralStrong} style={{ fontWeight: 'bold' }}>
                      -${resumenCarrito.descuentoTotal}
                    </AppText>
                  </View>
                </View>
              )}

              <View style={styles.totalContainer}>
                <AppText variant="cardTitle">Total a cobrar</AppText>
                <AppText variant="headerTitle" color={Palette.coralStrong} style={{ fontSize: 24 }}>
                  ${total}
                </AppText>
              </View>
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.rejectButton]}
                  onPress={rechazarVenta}
                  disabled={guardando}
                >
                  <AppText variant="bodyBold" color={Palette.textSecondary}>VACIAR</AppText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.confirmButton]}
                  onPress={confirmarYFinalizar}
                  disabled={guardando || cartItems.length === 0}
                >
                  <AppText variant="button">
                    {guardando ? 'GUARDANDO...' : 'CONFIRMAR'}
                  </AppText>
                </TouchableOpacity>
              </View>
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
  productGrid: {
    paddingHorizontal: 10,
    paddingBottom: 100,
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
  productCardDisabled: {
    opacity: 0.45,
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
  addButton: {
    backgroundColor: Palette.coralStrong,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
  },
  outOfStockBadge: {
    backgroundColor: Palette.blushLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    marginTop: 6,
  },
  cartFloating: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    left: 20,
  },
  cartButton: {
    backgroundColor: Palette.coralStrong,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 30,
    elevation: 4,
  },
  cartBadge: {
    backgroundColor: Palette.surface,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginRight: 10,
  },
  promoPill: {
    backgroundColor: Palette.blushLight,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    marginLeft: 10,
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
    maxHeight: '85%',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: Palette.border,
  },
  modalItemsList: {
    maxHeight: 280,
    marginVertical: 15,
  },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Palette.border,
  },
  modalItemActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Palette.blushLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalFooter: {
    borderTopWidth: 1,
    borderTopColor: Palette.border,
    paddingVertical: 15,
  },
  promoBox: {
    backgroundColor: Palette.blushLight,
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Palette.blush,
  },
  discountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  rejectButton: {
    backgroundColor: Palette.blushLight,
  },
  confirmButton: {
    backgroundColor: Palette.coralStrong,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
});