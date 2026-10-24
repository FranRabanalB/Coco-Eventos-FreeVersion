// src/database/database.ts
import * as SQLite from 'expo-sqlite';


export async function initDatabase() {
  try {
    const db = await SQLite.openDatabaseAsync('coco_eventos.db');

    await db.execAsync(`
      PRAGMA journal_mode = WAL;

      CREATE TABLE IF NOT EXISTS categorias (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL UNIQUE
      );

      CREATE TABLE IF NOT EXISTS variantes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        categoria_id INTEGER NOT NULL,
        nombre TEXT NOT NULL,
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
        -- Nueva tabla: eventos
      CREATE TABLE IF NOT EXISTS eventos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        fecha_inicio TEXT NOT NULL,
        fecha_fin TEXT,
        estado TEXT DEFAULT 'activo',  -- 'activo', 'finalizado'
        total_ingresos INTEGER DEFAULT 0,
        total_ventas INTEGER DEFAULT 0
      );

      -- Modificar tabla ventas para relacionarla con eventos
      -- Agregar columna evento_id a ventas
      ALTER TABLE ventas ADD COLUMN evento_id INTEGER REFERENCES eventos(id);        
    `);

    // Insertar datos iniciales

    console.log('✅ Base de datos inicializada correctamente');
    return db;
  } catch (error) {
    console.error('Error al inicializar la base de datos:', error);
    throw error;
  }
}