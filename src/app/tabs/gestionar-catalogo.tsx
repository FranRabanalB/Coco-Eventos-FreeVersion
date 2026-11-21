// src/app/tabs/gestionar-catalogo.tsx
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Categoria,
  crearCategoria,
  crearProducto,
  crearVariante,
  getCategorias,
  getVariantesByCategoria,
  Variante,
  actualizarVariante,
  getInventarioCompleto,
} from '../../database/queries';
import { AppText } from '../../components/app-text';
import { Palette } from '../../constants/theme';
import { AppHeader } from '../../components/app-header';
import AsyncStorage from '@react-native-async-storage/async-storage';


export default function GestionarCatalogoScreen() {
  const [tabActiva, setTabActiva] = useState<'categoria' | 'variante' | 'producto'>('categoria');

  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [variantes, setVariantes] = useState<Variante[]>([]);
  const [variantesDeCatVar, setVariantesDeCatVar] = useState<Variante[]>([]);

  // Categoría
  const [nombreCategoria, setNombreCategoria] = useState('');

  // Variante (Sin Promociones)
  const [catSeleccionadaVar, setCatSeleccionadaVar] = useState<number | null>(null);
  const [varianteEditandoId, setVarianteEditandoId] = useState<number | null>(null);
  const [nombreVariante, setNombreVariante] = useState('');
  const [alertaStockMinimo, setAlertaStockMinimo] = useState('10');
  const [limitesStock, setLimitesStock] = useState<Record<number, number>>({});

  // Producto
  const [catSeleccionadaProd, setCatSeleccionadaProd] = useState<number | null>(null);
  const [varSeleccionadaProd, setVarSeleccionadaProd] = useState<number | null>(null);
  const [nombreProducto, setNombreProducto] = useState('');
  const [precioProducto, setPrecioProducto] = useState('');
  const [stockProducto, setStockProducto] = useState('');

  // --- CONTADOR VERSIÓN GRATIS ---
  const [totalProductos, setTotalProductos] = useState(0);

  const actualizarConteo = async () => {
    const inv = await getInventarioCompleto();
    setTotalProductos(inv.length);
  };

 const cargarLimitesStock = async () => {
    try {
      const guardado = await AsyncStorage.getItem('limites_stock_variantes');
      if (guardado) setLimitesStock(JSON.parse(guardado));
    } catch (error) {
      console.error('Error al cargar límites de stock:', error);
    }
  };

  useEffect(() => {
    cargarCategorias();
    actualizarConteo();
    cargarLimitesStock();
  }, [tabActiva]);

  useEffect(() => {
    if (tabActiva === 'variante' && catSeleccionadaVar) {
      cargarVariantesParaEdicion(catSeleccionadaVar);
    } else if (tabActiva === 'producto' && catSeleccionadaProd) {
      cargarVariantesParaProducto(catSeleccionadaProd);
    }
  }, [catSeleccionadaVar, catSeleccionadaProd, tabActiva]);

  const cargarCategorias = async () => {
    try {
      const cats = await getCategorias();
      setCategorias(cats);
    } catch (error) {
      console.error('Error al cargar categorías:', error);
    }
  };

  const cargarVariantesParaEdicion = async (categoriaId: number) => {
    try {
      const vars = await getVariantesByCategoria(categoriaId);
      setVariantesDeCatVar(vars);
      seleccionarModoNuevaVariante();
    } catch (error) {
      console.error('Error al cargar variantes para edición:', error);
    }
  };

  const cargarVariantesParaProducto = async (categoriaId: number) => {
    try {
      const vars = await getVariantesByCategoria(categoriaId);
      setVariantes(vars);
      setVarSeleccionadaProd(null);
    } catch (error) {
      console.error('Error al cargar variantes:', error);
    }
  };

  const seleccionarModoNuevaVariante = () => {
    setVarianteEditandoId(null);
    setNombreVariante('');
    setAlertaStockMinimo('10');
  };

  const seleccionarVarianteParaEditar = (v: Variante) => {
    setVarianteEditandoId(v.id);
    setNombreVariante(v.nombre);
    const limite = limitesStock[v.id] !== undefined ? limitesStock[v.id] : 10;
    setAlertaStockMinimo(limite.toString());
  };

  const handleCrearCategoria = async () => {
    if (!nombreCategoria.trim()) {
      Alert.alert('Error', 'El nombre de la categoría no puede estar vacío');
      return;
    }
    try {
      await crearCategoria(nombreCategoria.trim());
      Alert.alert('¡Éxito!', 'Categoría creada correctamente');
      setNombreCategoria('');
      cargarCategorias();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };
const handleGuardarVariante = async () => {
    if (!catSeleccionadaVar) {
      Alert.alert('Error', 'Debes seleccionar una categoría');
      return;
    }
    if (!nombreVariante.trim()) {
      Alert.alert('Error', 'El nombre de la variante no puede estar vacío');
      return;
    }

    const limiteNum = parseInt(alertaStockMinimo, 10);
    if (isNaN(limiteNum) || limiteNum < 0) {
      Alert.alert('Error', 'La alerta de stock bajo debe ser 0 o mayor');
      return;
    }

    try {
      let idVarianteGuardada: number;

      if (varianteEditandoId) {
        await actualizarVariante(varianteEditandoId, nombreVariante.trim(), null, null);
        idVarianteGuardada = varianteEditandoId;
        Alert.alert('¡Éxito!', 'Variante actualizada correctamente');
      } else {
        idVarianteGuardada = await crearVariante(catSeleccionadaVar, nombreVariante.trim(), null, null);
        Alert.alert('¡Éxito!', 'Variante creada correctamente');
      }

      // Guardar el límite de stock bajo para esta variante
      const nuevosLimites = { ...limitesStock, [idVarianteGuardada]: limiteNum };
      setLimitesStock(nuevosLimites);
      await AsyncStorage.setItem('limites_stock_variantes', JSON.stringify(nuevosLimites));

      await cargarVariantesParaEdicion(catSeleccionadaVar);
      setCatSeleccionadaProd(catSeleccionadaVar);
      await cargarVariantesParaProducto(catSeleccionadaVar);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const handleCrearProducto = async () => {
    if (!catSeleccionadaProd || !varSeleccionadaProd) {
      Alert.alert('Error', 'Debes seleccionar una categoría y una variante');
      return;
    }
    if (!nombreProducto.trim() || !precioProducto) {
      Alert.alert('Error', 'El nombre y el precio son obligatorios');
      return;
    }

    const precio = parseInt(precioProducto);
    const stock = parseInt(stockProducto) || 0;

    if (isNaN(precio) || precio < 0) {
      Alert.alert('Error', 'El precio debe ser un número válido');
      return;
    }

    try {
      await crearProducto(varSeleccionadaProd, nombreProducto.trim(), precio, stock);
      Alert.alert('¡Éxito!', 'Producto creado correctamente');
      setNombreProducto('');
      setPrecioProducto('');
      setStockProducto('');
      actualizarConteo(); // Refresca el contador de la versión Gratis
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const renderSelectorCategorias = (
    seleccionada: number | null,
    setSeleccionada: (id: number) => void,
    esParaProducto: boolean = false
  ) => (
    <View style={styles.selectorContainer}>
      <AppText variant="bodyBold" style={{ marginBottom: 8 }}>Selecciona la Categoría:</AppText>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
        {categorias.map((cat) => {
          const activa = seleccionada === cat.id;
          return (
            <TouchableOpacity
              key={cat.id}
              style={[styles.chip, activa && styles.chipActivo]}
              onPress={() => {
                setSeleccionada(cat.id);
                if (esParaProducto) {
                  cargarVariantesParaProducto(cat.id);
                }
              }}
            >
              <AppText variant="bodyBold" color={activa ? '#fff' : Palette.textSecondary}>
                {cat.nombre}
              </AppText>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      
      {/* AQUÍ VA EL ENCABEZADO QUE FALTABA */}
      <AppHeader subtitle="Gestión de Catálogo" showBack={true} />

      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, tabActiva === 'categoria' && styles.tabActiva]}
          onPress={() => setTabActiva('categoria')}
        >
          <AppText variant="caption" color={tabActiva === 'categoria' ? '#fff' : Palette.textSecondary} style={{ fontWeight: 'bold' }}>
            Categoría
          </AppText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tabActiva === 'variante' && styles.tabActiva]}
          onPress={() => setTabActiva('variante')}
        >
          <AppText variant="caption" color={tabActiva === 'variante' ? '#fff' : Palette.textSecondary} style={{ fontWeight: 'bold' }}>
            Variante
          </AppText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tabActiva === 'producto' && styles.tabActiva]}
          onPress={() => setTabActiva('producto')}
        >
          <AppText variant="caption" color={tabActiva === 'producto' ? '#fff' : Palette.textSecondary} style={{ fontWeight: 'bold' }}>
            Producto
          </AppText>
        </TouchableOpacity>
      </View>
      
      <ScrollView style={styles.content} contentContainerStyle={styles.contentPadding}>
        {tabActiva === 'categoria' && (
          <View style={styles.formCard}>
            <AppText variant="sectionTitle" style={{ marginBottom: 4 }}>Nueva Categoría</AppText>
            <AppText variant="caption" style={{ marginBottom: 18 }}>
              Categoria es un grupo de productos que comparten características similares. Por ejemplo, "Prints", "Chapas", "Llaveros", etc.
            </AppText>

            <View style={styles.inputContainer}>
              <AppText variant="bodyBold" style={{ marginBottom: 8 }}>Nombre de Categoría</AppText>
              <TextInput
                style={styles.input}
                placeholder="Ej. Posters"
                placeholderTextColor={Palette.textMuted}
                value={nombreCategoria}
                onChangeText={setNombreCategoria}
              />
            </View>

            <TouchableOpacity style={styles.submitButton} onPress={handleCrearCategoria}>
              <Ionicons name="save-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
              <AppText variant="button">Guardar Categoría</AppText>
            </TouchableOpacity>
          </View>
          
        )}

        {tabActiva === 'variante' && (
          <View style={styles.formCard}>
            <AppText variant="sectionTitle" style={{ marginBottom: 4 }}>
              {varianteEditandoId ? 'Editar Variante' : 'Nueva Variante'}
            </AppText>
            <AppText variant="caption" style={{ marginBottom: 18 }}>
              Las variantes son subcategorías dentro de una categoría. Por ejemplo, si la categoría es "Chapas", las variantes podrían ser "Chapa Grande", "Chapa Mediana" y "Chapa Pequeña".
            </AppText>

            {renderSelectorCategorias(catSeleccionadaVar, setCatSeleccionadaVar)}

            {catSeleccionadaVar && (
              <View style={styles.selectorContainer}>
                <AppText variant="bodyBold" style={{ marginBottom: 8 }}>
                  ¿Crear nueva o editar existente?
                </AppText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                

                  {variantesDeCatVar.map((vari) => {
                    const activa = varianteEditandoId === vari.id;
                    return (
                      <TouchableOpacity
                        key={vari.id}
                        style={[styles.chip, activa && styles.chipActivoVar]}
                        onPress={() => seleccionarVarianteParaEditar(vari)}
                      >
                        <AppText variant="bodyBold" color={activa ? '#fff' : Palette.textSecondary}>
                          {vari.nombre}
                        </AppText>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            <View style={styles.inputContainer}>
              <AppText variant="bodyBold" style={{ marginBottom: 8 }}>
                Nombre de la Variante
              </AppText>
              <TextInput
                style={styles.input}
                placeholder="Ej. Chapa Grande"
                placeholderTextColor={Palette.textMuted}
                value={nombreVariante}
                onChangeText={setNombreVariante}
              />
            </View>

            <View style={styles.inputContainer}>
              <AppText variant="bodyBold" style={{ marginBottom: 4 }}>
                Alerta de Stock Bajo (Mínimo)
              </AppText>
              <AppText variant="caption" color={Palette.textMuted} style={{ marginBottom: 8 }}>
                Pon 0 si no quieres recibir avisos de stock bajo en esta variante.
              </AppText>
              <TextInput
                style={styles.input}
                placeholder="10"
                placeholderTextColor={Palette.textMuted}
                keyboardType="numeric"
                value={alertaStockMinimo}
                onChangeText={setAlertaStockMinimo}
              />
            </View>
            <TouchableOpacity style={styles.submitButton} onPress={handleGuardarVariante}>
              <Ionicons name="save-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
              <AppText variant="button">
                {varianteEditandoId ? 'Actualizar Variante' : 'Guardar Variante'}
              </AppText>
            </TouchableOpacity>
          </View>
        )}

        {tabActiva === 'producto' && (
          <View style={styles.formCard}>
            <AppText variant="sectionTitle" style={{ marginBottom: 4 }}>Nuevo Producto</AppText>
            <AppText variant="caption" style={{ marginBottom: 18 }}>
              Los productos son los artículos que vendes. Cada producto pertenece a una categoría y a una variante. Por ejemplo, un producto podría ser "Chapita Chikawa" que pertenece a la categoría "Chapas" y a la variante "Chapa Grande".
            </AppText>

            {renderSelectorCategorias(catSeleccionadaProd, setCatSeleccionadaProd, true)}

            {catSeleccionadaProd && (
              <View style={styles.selectorContainer}>
                <AppText variant="bodyBold" style={{ marginBottom: 8 }}>Selecciona la Variante:</AppText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                  {variantes.length === 0 ? (
                    <AppText variant="caption" color={Palette.textMuted} style={{ paddingVertical: 10 }}>
                      No hay variantes en esta categoría
                    </AppText>
                  ) : (
                    variantes.map((vari) => {
                      const activa = varSeleccionadaProd === vari.id;
                      return (
                        <TouchableOpacity
                          key={vari.id}
                          style={[styles.chip, activa && styles.chipActivoVar]}
                          onPress={() => setVarSeleccionadaProd(vari.id)}
                        >
                          <AppText variant="bodyBold" color={activa ? '#fff' : Palette.textSecondary}>
                            {vari.nombre}
                          </AppText>
                        </TouchableOpacity>
                      );
                    })
                  )}
                </ScrollView>
              </View>
            )}

            <View style={styles.inputContainer}>
              <AppText variant="bodyBold" style={{ marginBottom: 8 }}>Nombre del Producto</AppText>
              <TextInput
                style={styles.input}
                placeholder="Ej. Pikachu"
                placeholderTextColor={Palette.textMuted}
                value={nombreProducto}
                onChangeText={setNombreProducto}
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputContainer, { flex: 1, marginRight: 10 }]}>
                <AppText variant="bodyBold" style={{ marginBottom: 8 }}>Precio ($)</AppText>
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  placeholderTextColor={Palette.textMuted}
                  keyboardType="numeric"
                  value={precioProducto}
                  onChangeText={setPrecioProducto}
                />
              </View>
              <View style={[styles.inputContainer, { flex: 1 }]}>
                <AppText variant="bodyBold" style={{ marginBottom: 8 }}>Stock Inicial</AppText>
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  placeholderTextColor={Palette.textMuted}
                  keyboardType="numeric"
                  value={stockProducto}
                  onChangeText={setStockProducto}
                />
              </View>
            </View>

            <TouchableOpacity style={styles.submitButton} onPress={handleCrearProducto}>
              <Ionicons name="save-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
              <AppText variant="button">Guardar Producto</AppText>
            </TouchableOpacity>

            {/* --- CONTADOR DE VERSIÓN GRATIS --- */}
            <AppText variant="caption" align="center" color={Palette.textSecondary} style={{ marginTop: 15 }}>
              Has ingresado {totalProductos} de 10 productos (Versión Lite).
              {totalProductos >= 10 && '\nLímite alcanzado. Actualiza a Pro.'}
            </AppText>

          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Palette.background,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: Palette.surface,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Palette.border,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: Palette.blushLight,
  },
  tabActiva: {
    backgroundColor: Palette.coralStrong,
  },
  content: {
    flex: 1,
  },
  contentPadding: {
    padding: 20,
  },
  formCard: {
    backgroundColor: Palette.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  inputContainer: {
    marginBottom: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'Nunito_400Regular',
    color: Palette.textPrimary,
    backgroundColor: Palette.background,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  submitButton: {
    backgroundColor: Palette.coralStrong,
    flexDirection: 'row',
    paddingVertical: 15,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  selectorContainer: {
    marginBottom: 15,
  },
  chipScroll: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Palette.blushLight,
    marginRight: 10,
  },
  chipActivo: {
    backgroundColor: Palette.coralStrong,
  },
  chipActivoVar: {
    backgroundColor: Palette.peach,
  },
});