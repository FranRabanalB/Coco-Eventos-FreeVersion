// src/database/queries.ts
import { getDatabase } from "./index";

export interface Categoria {
  id: number;
  nombre: string;
}

export interface Variante {
  id: number;
  categoria_id: number;
  nombre: string;
  promo_cantidad?: number | null;
  promo_precio?: number | null;
}

export interface Producto {
  id: number;
  variante_id: number;
  nombre: string;
  precio: number;
  stock: number;
}

export interface Venta {
  id: number;
  fecha: string;
  total: number;
  evento_id?: number | null;
}

export interface Evento {
  id: number;
  nombre: string;
  fecha_inicio: string;
  fecha_fin: string | null;
  estado: "activo" | "finalizado";
  total_ingresos: number;
  total_ventas: number;
}

export interface DetalleVenta {
  id: number;
  venta_id: number;
  producto_id: number;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

export interface MovimientoStock {
  id: number;
  producto_id: number;
  tipo: "entrada" | "salida";
  cantidad: number;
  fecha: string;
}

interface ResumenVentas {
  count: number;
  total: number | null;
}

// Funciones existentes...
export async function getCategorias(): Promise<Categoria[]> {
  try {
    const db = await getDatabase();
    const result = await db.getAllAsync(
      "SELECT * FROM categorias ORDER BY nombre",
    );
    return result as Categoria[];
  } catch (error) {
    console.error("❌ Error en getCategorias:", error);
    return [];
  }
}

export async function getVariantesByCategoria(
  categoriaId: number,
): Promise<Variante[]> {
  try {
    const db = await getDatabase();
    const result = await db.getAllAsync(
      "SELECT * FROM variantes WHERE categoria_id = ? ORDER BY nombre",
      [categoriaId],
    );
    return result as Variante[];
  } catch (error) {
    console.error("❌ Error en getVariantesByCategoria:", error);
    return [];
  }
}

export async function getProductosByVariante(
  varianteId: number,
): Promise<Producto[]> {
  try {
    const db = await getDatabase();
    const result = await db.getAllAsync(
      "SELECT * FROM productos WHERE variante_id = ? ORDER BY nombre",
      [varianteId],
    );
    return result as Producto[];
  } catch (error) {
    console.error("❌ Error en getProductosByVariante:", error);
    return [];
  }
}

export async function buscarProductos(termino: string): Promise<Producto[]> {
  try {
    const db = await getDatabase();
    const result = await db.getAllAsync(
      `SELECT p.*, v.nombre as variante_nombre, c.nombre as categoria_nombre 
       FROM productos p
       JOIN variantes v ON p.variante_id = v.id
       JOIN categorias c ON v.categoria_id = c.id
       WHERE p.nombre LIKE ? 
       ORDER BY p.nombre`,
      [`%${termino}%`],
    );
    return result as Producto[];
  } catch (error) {
    console.error("❌ Error en buscarProductos:", error);
    return [];
  }
}

export async function getProductoById(id: number): Promise<Producto | null> {
  try {
    const db = await getDatabase();
    const result = await db.getAllAsync(
      "SELECT * FROM productos WHERE id = ?",
      [id],
    );
    return result.length > 0 ? (result[0] as Producto) : null;
  } catch (error) {
    console.error("❌ Error en getProductoById:", error);
    return null;
  }
}

// ✅ NUEVAS FUNCIONES PARA VENTAS

export interface CartItem {
  id: number;
  variante_id: number;
  variante_nombre?: string;
  nombre: string;
  precio: number;
  cantidad: number;
  stock: number;
  promo_cantidad?: number | null;
  promo_precio?: number | null;
}

/** Calcula el subtotal, descuentos por variante y total final del carrito */
export function calcularTotalesCarrito(items: CartItem[]) {
  let subtotalSinDescuento = 0;
  let totalConDescuento = 0;
  const grupos: Record<number, CartItem[]> = {};

  for (const item of items) {
    subtotalSinDescuento += item.precio * item.cantidad;
    const vId = item.variante_id || 0;
    if (!grupos[vId]) grupos[vId] = [];
    grupos[vId].push(item);
  }

  const promosAplicadas: string[] = [];

  for (const vId in grupos) {
    const grupo = grupos[vId];
    const promoCant = grupo[0].promo_cantidad;
    const promoPrecio = grupo[0].promo_precio;
    const cantidadTotal = grupo.reduce((acc, item) => acc + item.cantidad, 0);

    if (
      promoCant &&
      promoPrecio &&
      promoCant > 0 &&
      cantidadTotal >= promoCant
    ) {
      const numPromos = Math.floor(cantidadTotal / promoCant);
      const sobrantes = cantidadTotal % promoCant;

      const preciosUnitarios: number[] = [];
      grupo.forEach((item) => {
        for (let i = 0; i < item.cantidad; i++) {
          preciosUnitarios.push(item.precio);
        }
      });

      const costoSobrantes = preciosUnitarios
        .slice(0, sobrantes)
        .reduce((a, b) => a + b, 0);

      totalConDescuento += numPromos * promoPrecio + costoSobrantes;
      promosAplicadas.push(
        `${grupo[0].variante_nombre || "Promo"}: ${numPromos}x (${promoCant} por $${promoPrecio})`,
      );
    } else {
      totalConDescuento += grupo.reduce(
        (acc, item) => acc + item.precio * item.cantidad,
        0,
      );
    }
  }

  const descuentoTotal = subtotalSinDescuento - totalConDescuento;
  return {
    subtotalSinDescuento,
    totalConDescuento,
    descuentoTotal,
    promosAplicadas,
  };
}

/**
 * Guarda una venta completa en la base de datos
 * @param items - Array de items del carrito
 * @returns El ID de la venta creada
 */
export async function guardarVenta(items: CartItem[]): Promise<number> {
  const db = await getDatabase();

  try {
    const { totalConDescuento: total } = calcularTotalesCarrito(items);
    const fecha = new Date().toISOString();

    await db.execAsync("BEGIN TRANSACTION");

    const ventaResult = await db.runAsync(
      "INSERT INTO ventas (fecha, total) VALUES (?, ?)",
      [fecha, total],
    );

    const ventaId = ventaResult.lastInsertRowId;

    for (const item of items) {
      const subtotal = item.precio * item.cantidad;
      await db.runAsync(
        `INSERT INTO detalle_ventas 
         (venta_id, producto_id, cantidad, precio_unitario, subtotal) 
         VALUES (?, ?, ?, ?, ?)`,
        [ventaId, item.id, item.cantidad, item.precio, subtotal],
      );

      await db.runAsync("UPDATE productos SET stock = stock - ? WHERE id = ?", [
        item.cantidad,
        item.id,
      ]);

      await db.runAsync(
        `INSERT INTO movimientos_stock 
         (producto_id, tipo, cantidad, fecha) 
         VALUES (?, ?, ?, ?)`,
        [item.id, "salida", item.cantidad, fecha],
      );
    }

    await db.execAsync("COMMIT");
    return ventaId;
  } catch (error) {
    await db.execAsync("ROLLBACK");
    console.error("❌ Error al guardar la venta:", error);
    throw new Error("No se pudo completar la venta");
  }
}

/** Guarda una venta asociada al evento activo y actualiza sus totales. */
export async function guardarVentaConEvento(
  items: CartItem[],
): Promise<number> {
  const db = await getDatabase();
  const evento = await getEventoActivo();

  if (!evento) {
    throw new Error("No hay un evento activo para registrar la venta");
  }

  const { totalConDescuento: total } = calcularTotalesCarrito(items);
  const fecha = new Date().toISOString();

  try {
    await db.execAsync("BEGIN TRANSACTION");

    const ventaResult = await db.runAsync(
      "INSERT INTO ventas (fecha, total, evento_id) VALUES (?, ?, ?)",
      [fecha, total, evento.id],
    );
    const ventaId = ventaResult.lastInsertRowId;

    for (const item of items) {
      const subtotal = item.precio * item.cantidad;
      await db.runAsync(
        `INSERT INTO detalle_ventas
         (venta_id, producto_id, cantidad, precio_unitario, subtotal)
         VALUES (?, ?, ?, ?, ?)`,
        [ventaId, item.id, item.cantidad, item.precio, subtotal],
      );
      await db.runAsync("UPDATE productos SET stock = stock - ? WHERE id = ?", [
        item.cantidad,
        item.id,
      ]);
      await db.runAsync(
        `INSERT INTO movimientos_stock (producto_id, tipo, cantidad, fecha)
         VALUES (?, ?, ?, ?)`,
        [item.id, "salida", item.cantidad, fecha],
      );
    }

    await db.runAsync(
      `UPDATE eventos
       SET total_ingresos = total_ingresos + ?, total_ventas = total_ventas + 1
       WHERE id = ?`,
      [total, evento.id],
    );
    await db.execAsync("COMMIT");
    return ventaId;
  } catch (error) {
    await db.execAsync("ROLLBACK");
    console.error("❌ Error al guardar la venta con evento:", error);
    throw new Error("No se pudo completar la venta");
  }
}

/**
 * Obtiene todas las ventas
 */
export async function getVentas(): Promise<Venta[]> {
  try {
    const db = await getDatabase();
    const result = await db.getAllAsync(
      "SELECT * FROM ventas ORDER BY fecha DESC",
    );
    return result as Venta[];
  } catch (error) {
    console.error("❌ Error en getVentas:", error);
    return [];
  }
}

export async function getEventoActivo(): Promise<Evento | null> {
  try {
    const db = await getDatabase();
    const result = await db.getAllAsync(
      `SELECT * FROM eventos WHERE estado = 'activo' ORDER BY id DESC LIMIT 1`,
    );
    return result.length > 0 ? (result[0] as Evento) : null;
  } catch (error) {
    console.error("❌ Error en getEventoActivo:", error);
    return null;
  }
}

export async function getEventos(): Promise<Evento[]> {
  try {
    const db = await getDatabase();
    const result = await db.getAllAsync(
      "SELECT * FROM eventos ORDER BY fecha_inicio DESC",
    );
    return result as Evento[];
  } catch (error) {
    console.error("❌ Error en getEventos:", error);
    return [];
  }
}
export async function crearEvento(nombre: string): Promise<number> {
  const db = await getDatabase();

  // --- VERSIÓN GRATIS: Evento Único y Estático ---
  const eventosExistentes = await db.getAllAsync<{ id: number }>(
    "SELECT id FROM eventos LIMIT 1",
  );

  if (eventosExistentes.length > 0) {
    // Si ya existe un evento (incluso si se cerró por accidente en pruebas),
    // lo forzamos a estar activo y lo reutilizamos. Jamás dará error.
    await db.runAsync(`UPDATE eventos SET estado = 'activo' WHERE id = ?`, [
      eventosExistentes[0].id,
    ]);
    return eventosExistentes[0].id;
  }

  // Si la base de datos está totalmente vacía (recién instalada), crea el evento estático
  const result = await db.runAsync(
    `INSERT INTO eventos (nombre, fecha_inicio, estado, total_ingresos, total_ventas)
     VALUES (?, ?, 'activo', 0, 0)`,
    ["Actual", new Date().toISOString()],
  );
  return result.lastInsertRowId;
}

export async function getEstadisticasEvento(eventoId: number): Promise<any> {
  try {
    const db = await getDatabase();

    // Primero obtenemos los ingresos reales directamente de la tabla eventos
    // para evitar que se dupliquen al cruzar con detalle_ventas
    const evento = await db.getAllAsync<any>(
      `SELECT total_ingresos FROM eventos WHERE id = ?`,
      [eventoId],
    );

    // Luego obtenemos los conteos de unidades y ventas reales
    const resumen = await db.getAllAsync<any>(
      `SELECT
         COUNT(DISTINCT v.id) as total_ventas,
         COALESCE(SUM(dv.cantidad), 0) as unidades_vendidas,
         COUNT(DISTINCT dv.producto_id) as productos_vendidos
       FROM ventas v
       LEFT JOIN detalle_ventas dv ON dv.venta_id = v.id
       WHERE v.evento_id = ?`,
      [eventoId],
    );

    // Productos más vendidos (Actualizado para traer categoría y variante)
    const masVendidos = await db.getAllAsync(
      `SELECT 
         p.id,
         p.nombre,
         c.nombre as categoria_nombre,
         v.nombre as variante_nombre,
         SUM(dv.cantidad) as total_vendido,
         SUM(dv.subtotal) as total_ingresos
       FROM detalle_ventas dv
       JOIN productos p ON dv.producto_id = p.id
       JOIN variantes v ON p.variante_id = v.id
       JOIN categorias c ON v.categoria_id = c.id
       GROUP BY p.id
       ORDER BY total_vendido DESC
       LIMIT 5`,
    );

    return {
      ...resumen[0],
      total_ingresos: evento[0]?.total_ingresos || 0, // Usamos el valor real sin duplicar
      masVendidos,
    };
  } catch (error) {
    console.error("❌ Error en getEstadisticasEvento:", error);
    return null;
  }
}

export async function getVentasByEvento(eventoId: number): Promise<Venta[]> {
  try {
    const db = await getDatabase();
    const result = await db.getAllAsync(
      "SELECT * FROM ventas WHERE evento_id = ? ORDER BY fecha DESC",
      [eventoId],
    );
    return result as Venta[];
  } catch (error) {
    console.error("❌ Error en getVentasByEvento:", error);
    return [];
  }
}

/**
 * Obtiene los detalles de una venta específica
 */
export async function getDetallesVenta(
  ventaId: number,
): Promise<DetalleVenta[]> {
  try {
    const db = await getDatabase();
    const result = await db.getAllAsync(
      `SELECT dv.*, p.nombre as producto_nombre 
       FROM detalle_ventas dv
       JOIN productos p ON dv.producto_id = p.id
       WHERE dv.venta_id = ?`,
      [ventaId],
    );
    return result as DetalleVenta[];
  } catch (error) {
    console.error("❌ Error en getDetallesVenta:", error);
    return [];
  }
}

/**
 * Obtiene el historial de movimientos de stock
 */
export async function getMovimientosStock(
  productoId?: number,
): Promise<MovimientoStock[]> {
  try {
    const db = await getDatabase();
    let query = "SELECT * FROM movimientos_stock ORDER BY fecha DESC";
    let params: any[] = [];

    if (productoId) {
      query =
        "SELECT * FROM movimientos_stock WHERE producto_id = ? ORDER BY fecha DESC";
      params = [productoId];
    }

    const result = await db.getAllAsync(query, params);
    return result as MovimientoStock[];
  } catch (error) {
    console.error("❌ Error en getMovimientosStock:", error);
    return [];
  }
}

export async function getEstadisticasVentas() {
  try {
    const db = await getDatabase();

    // Total de ventas
    const totalVentasResult = await db.getAllAsync<ResumenVentas>(
      "SELECT COUNT(*) as count, SUM(total) as total FROM ventas",
    );

    // 🚀 Productos más vendidos (AHORA SÍ TRAE LA CATEGORÍA Y VARIANTE)
    const masVendidos = await db.getAllAsync(
      `SELECT 
         p.id,
         p.nombre,
         c.nombre as categoria_nombre,
         v.nombre as variante_nombre,
         SUM(dv.cantidad) as total_vendido,
         SUM(dv.subtotal) as total_ingresos
       FROM detalle_ventas dv
       JOIN productos p ON dv.producto_id = p.id
       JOIN variantes v ON p.variante_id = v.id
       JOIN categorias c ON v.categoria_id = c.id
       GROUP BY p.id
       ORDER BY total_vendido DESC
       LIMIT 5`,
    );

    // Ventas por día (últimos 7 días)
    const ventasPorDia = await db.getAllAsync(
      `SELECT 
         DATE(fecha) as dia,
         COUNT(*) as cantidad,
         SUM(total) as total
       FROM ventas
       WHERE fecha >= DATE('now', '-7 days')
       GROUP BY DATE(fecha)
       ORDER BY dia DESC`,
    );

    // Productos con stock bajo (< 10)
    const stockBajo = await db.getAllAsync(
      `SELECT 
         p.*,
         v.nombre as variante_nombre,
         c.nombre as categoria_nombre
       FROM productos p
       JOIN variantes v ON p.variante_id = v.id
       JOIN categorias c ON v.categoria_id = c.id
       WHERE p.stock < 10
       ORDER BY p.stock ASC`,
    );

    return {
      totalVentas: totalVentasResult[0]?.count || 0,
      totalIngresos: totalVentasResult[0]?.total || 0,
      masVendidos,
      ventasPorDia,
      stockBajo,
    };
  } catch (error) {
    console.error("❌ Error en getEstadisticasVentas:", error);
    return {
      totalVentas: 0,
      totalIngresos: 0,
      masVendidos: [],
      ventasPorDia: [],
      stockBajo: [],
    };
  }
}

/**
 * Obtiene todos los productos con información de categoría y variante
 */
export async function getInventarioCompleto(): Promise<any[]> {
  try {
    const db = await getDatabase();
    const result = await db.getAllAsync(`
      SELECT 
        p.id,
        p.nombre,
        p.precio,
        p.stock,
        v.nombre as variante_nombre,
        c.nombre as categoria_nombre,
        c.id as categoria_id,
        v.id as variante_id
      FROM productos p
      JOIN variantes v ON p.variante_id = v.id
      JOIN categorias c ON v.categoria_id = c.id
      ORDER BY c.nombre, v.nombre, p.nombre
    `);
    return result;
  } catch (error) {
    console.error("❌ Error en getInventarioCompleto:", error);
    return [];
  }
}

/**
 * Obtiene productos con stock bajo (menos de 10 unidades)
 */
export async function getProductosStockBajo(
  limite: number = 10,
): Promise<any[]> {
  try {
    const db = await getDatabase();
    const result = await db.getAllAsync(
      `
      SELECT 
        p.id,
        p.nombre,
        p.precio,
        p.stock,
        v.nombre as variante_nombre,
        c.nombre as categoria_nombre
      FROM productos p
      JOIN variantes v ON p.variante_id = v.id
      JOIN categorias c ON v.categoria_id = c.id
      WHERE p.stock < ?
      ORDER BY p.stock ASC
    `,
      [limite],
    );
    return result;
  } catch (error) {
    console.error("❌ Error en getProductosStockBajo:", error);
    return [];
  }
}

/**
 * Actualiza el stock de un producto
 * @param productoId - ID del producto
 * @param cantidad - Cantidad a ajustar (positivo = agregar, negativo = quitar)
 * @param motivo - Razón del ajuste
 */
export async function ajustarStock(
  productoId: number,
  cantidad: number,
  motivo: string = "Ajuste manual",
): Promise<boolean> {
  const db = await getDatabase();

  try {
    // Verificar que el producto existe
    const producto = await getProductoById(productoId);
    if (!producto) {
      throw new Error("Producto no encontrado");
    }

    // Verificar que no quede stock negativo
    if (producto.stock + cantidad < 0) {
      throw new Error("No se puede reducir el stock por debajo de 0");
    }

    await db.execAsync("BEGIN TRANSACTION");

    // Actualizar stock
    await db.runAsync("UPDATE productos SET stock = stock + ? WHERE id = ?", [
      cantidad,
      productoId,
    ]);

    // Registrar movimiento
    const tipo = cantidad >= 0 ? "entrada" : "salida";
    const fecha = new Date().toISOString();

    await db.runAsync(
      `INSERT INTO movimientos_stock 
       (producto_id, tipo, cantidad, fecha) 
       VALUES (?, ?, ?, ?)`,
      [productoId, tipo, Math.abs(cantidad), fecha],
    );

    await db.execAsync("COMMIT");

    console.log(
      `✅ Stock ajustado: ${cantidad > 0 ? "+" : ""}${cantidad} unidades (${motivo})`,
    );
    return true;
  } catch (error) {
    await db.execAsync("ROLLBACK");
    console.error("❌ Error al ajustar stock:", error);
    throw error;
  }
}

/**
 * Obtiene el historial de movimientos de un producto específico
 */
export async function getHistorialProducto(productoId: number): Promise<any[]> {
  try {
    const db = await getDatabase();
    const result = await db.getAllAsync(
      `
      SELECT 
        ms.*,
        p.nombre as producto_nombre
      FROM movimientos_stock ms
      JOIN productos p ON ms.producto_id = p.id
      WHERE ms.producto_id = ?
      ORDER BY ms.fecha DESC
      LIMIT 50
    `,
      [productoId],
    );
    return result;
  } catch (error) {
    console.error("❌ Error en getHistorialProducto:", error);
    return [];
  }
}

// --- NUEVAS FUNCIONES PARA CREAR CATÁLOGO ---

/** Crea una nueva categoría */
export async function crearCategoria(nombre: string): Promise<number> {
  const db = await getDatabase();
  try {
    const result = await db.runAsync(
      "INSERT INTO categorias (nombre) VALUES (?)",
      [nombre],
    );
    console.log(
      `✅ Categoría "${nombre}" creada con ID: ${result.lastInsertRowId}`,
    );
    return result.lastInsertRowId;
  } catch (error) {
    console.error("❌ Error al crear categoría:", error);
    throw new Error(
      "No se pudo crear la categoría. ¿Quizás ya existe una con ese nombre?",
    );
  }
}

/** Crea una nueva subcategoría (variante) con o sin promoción */
export async function crearVariante(
  categoriaId: number,
  nombre: string,
  promoCantidad: number | null = null,
  promoPrecio: number | null = null,
): Promise<number> {
  const db = await getDatabase();
  try {
    const result = await db.runAsync(
      "INSERT INTO variantes (categoria_id, nombre, promo_cantidad, promo_precio) VALUES (?, ?, ?, ?)",
      [categoriaId, nombre, promoCantidad, promoPrecio],
    );
    console.log(
      `✅ Variante "${nombre}" creada con ID: ${result.lastInsertRowId}`,
    );
    return result.lastInsertRowId;
  } catch (error) {
    console.error("❌ Error al crear variante:", error);
    throw new Error("No se pudo crear la variante");
  }
}

export async function crearProducto(
  varianteId: number,
  nombre: string,
  precio: number,
  stock: number = 0,
): Promise<number> {
  const db = await getDatabase();
  try {
    // --- NUEVO: Bloqueo de versión gratuita ---
    const total = await db.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) as count FROM productos",
    );
    if (total && total.count >= 10) {
      throw new Error(
        "Límite alcanzado: La versión Gratis permite un máximo de 10 productos. Adquiere la versión Pro para inventario ilimitado.",
      );
    }
    // -----------------------------------------

    const result = await db.runAsync(
      "INSERT INTO productos (variante_id, nombre, precio, stock) VALUES (?, ?, ?, ?)",
      [varianteId, nombre, precio, stock],
    );
    return result.lastInsertRowId;
  } catch (error: any) {
    throw new Error(error.message || "No se pudo crear el producto");
  }
}

/** Actualiza el nombre y/o la promoción de una variante existente */
export async function actualizarVariante(
  varianteId: number,
  nombre: string,
  promoCantidad: number | null = null,
  promoPrecio: number | null = null,
): Promise<void> {
  const db = await getDatabase();
  try {
    await db.runAsync(
      `UPDATE variantes 
       SET nombre = ?, promo_cantidad = ?, promo_precio = ? 
       WHERE id = ?`,
      [nombre, promoCantidad, promoPrecio, varianteId],
    );
    console.log(`✅ Variante ID ${varianteId} actualizada`);
  } catch (error) {
    console.error("❌ Error al actualizar variante:", error);
    throw new Error("No se pudo actualizar la variante");
  }
}
