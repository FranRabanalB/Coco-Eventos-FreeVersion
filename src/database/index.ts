// src/database/index.ts
import * as SQLite from 'expo-sqlite';


let dbInstance: SQLite.SQLiteDatabase | null = null;
let isInitializing = false;
let initializationPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  // Si ya está inicializada, devolverla
  if (dbInstance) {
    return dbInstance;
  }

  // Si está en proceso de inicialización, esperar
  if (isInitializing && initializationPromise) {
    return initializationPromise;
  }

  // Iniciar inicialización
  isInitializing = true;
  initializationPromise = initializeDatabase();

  try {
    dbInstance = await initializationPromise;
    return dbInstance;
  } finally {
    isInitializing = false;
    initializationPromise = null;
  }
}

async function initializeDatabase(): Promise<SQLite.SQLiteDatabase> {
  try {
    console.log('📱 Inicializando base de datos...');
    
    const db = await SQLite.openDatabaseAsync('coco_eventos.db');
    
    // Verificar que la base de datos está abierta
    if (!db) {
      throw new Error('No se pudo abrir la base de datos');
    }

    console.log('✅ Base de datos abierta');

    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS categorias (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL UNIQUE
      );

      CREATE TABLE IF NOT EXISTS variantes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        categoria_id INTEGER NOT NULL,
        nombre TEXT NOT NULL,
        promo_cantidad INTEGER,
        promo_precio INTEGER,
        FOREIGN KEY (categoria_id) REFERENCES categorias(id)
      );

      CREATE TABLE IF NOT EXISTS productos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        variante_id INTEGER NOT NULL,
        nombre TEXT NOT NULL,
        precio INTEGER NOT NULL,
        stock INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (variante_id) REFERENCES variantes(id)
      );

      CREATE TABLE IF NOT EXISTS ventas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fecha TEXT NOT NULL,
        total INTEGER NOT NULL
      );

      -- NUEVA TABLA: eventos
      CREATE TABLE IF NOT EXISTS eventos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        fecha_inicio TEXT NOT NULL,
        fecha_fin TEXT,
        estado TEXT DEFAULT 'activo',
        total_ingresos INTEGER DEFAULT 0,
        total_ventas INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS detalle_ventas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        venta_id INTEGER NOT NULL,
        producto_id INTEGER NOT NULL,
        cantidad INTEGER NOT NULL,
        precio_unitario INTEGER NOT NULL,
        subtotal INTEGER NOT NULL,
        FOREIGN KEY (venta_id) REFERENCES ventas(id),
        FOREIGN KEY (producto_id) REFERENCES productos(id)
      );

      CREATE TABLE IF NOT EXISTS movimientos_stock (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        producto_id INTEGER NOT NULL,
        tipo TEXT NOT NULL,
        cantidad INTEGER NOT NULL,
        fecha TEXT NOT NULL,
        FOREIGN KEY (producto_id) REFERENCES productos(id)
      );
    `);

    // Verificar si existe la columna evento_id en ventas (migración)
    try {
      await db.execAsync(`
        ALTER TABLE ventas ADD COLUMN evento_id INTEGER REFERENCES eventos(id);
      `);
      console.log('✅ Migración: evento_id agregado a ventas');
    } catch (e) {
      // La columna ya existe, ignorar error
    }

    // --- MIGRACIÓN PARA PROMOCIONES EN VARIANTES ---
    try {
      await db.execAsync(`ALTER TABLE variantes ADD COLUMN promo_cantidad INTEGER;`);
      console.log('✅ Migración: promo_cantidad agregada a variantes');
    } catch (e) {}

    try {
      await db.execAsync(`ALTER TABLE variantes ADD COLUMN promo_precio INTEGER;`);
      console.log('✅ Migración: promo_precio agregada a variantes');
    } catch (e) {}

    // Crear evento inicial si no existe
    await crearEventoInicial(db);

    console.log('✅ Tablas creadas/verificadas');
    console.log('✅ Base de datos inicializada correctamente');
    return db;
  } catch (error) {
    console.error('❌ Error al inicializar la base de datos:', error);
    throw error;
  }
}

async function crearEventoInicial(db: SQLite.SQLiteDatabase) {
  try {
    const eventos = await db.getAllAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM eventos'
    );
    if (eventos[0].count === 0) {
      const fecha = new Date().toISOString();
      await db.runAsync(
        `INSERT INTO eventos (nombre, fecha_inicio, estado) 
         VALUES (?, ?, ?)`,
        ['Evento Actual', fecha, 'activo']
      );
      console.log('✅ Evento inicial creado');
    }
  } catch (error) {
    console.error('❌ Error al crear evento inicial:', error);
  }
}

export async function closeDatabase() {
  if (dbInstance) {
    try {
      await dbInstance.closeAsync();
      dbInstance = null;
      console.log('✅ Base de datos cerrada');
    } catch (error) {
      console.error('❌ Error al cerrar la base de datos:', error);
    }
  }
}

// Función para verificar si la base de datos está lista
export async function isDatabaseReady(): Promise<boolean> {
  try {
    const db = await getDatabase();
    return db !== null;
  } catch {
    return false;
  }
}

export const getDetalleVentasParaExportar = async () => {
  const db = await getDatabase();
  return await db.getAllAsync<any>(`
    SELECT 
      v.id as VentaID,
      v.fecha as Fecha,
      e.nombre as Evento,
      p.nombre as Producto,
      dv.cantidad as Cantidad,
      dv.precio_unitario as PrecioUnitario,
      dv.subtotal as Subtotal
    FROM ventas v
    LEFT JOIN eventos e ON v.evento_id = e.id
    JOIN detalle_ventas dv ON v.id = dv.venta_id
    JOIN productos p ON dv.producto_id = p.id
    ORDER BY v.fecha DESC
  `);
};