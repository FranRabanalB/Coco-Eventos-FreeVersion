# 🌸 COCO Eventos Free version

##  ¿Para qué sirve?
Hola hice proyecto para asistir a los eventos de la [@cocoloser ](https://cocoloser-esp.carrd.co/). Este es un proyecto que llevo pateando mucho tiempo. En resumen es un gestor de inventario y de ventas  al ser algo que uno siempre deja al final ayuda mucho para tener en cuenta que falta y que se vende realmente en un evento.

---

##  Funcionalidades Principales

###  1. Panel de Inicio (Dashboard)
* **Resumen en tiempo real:** Tarjetas con el total de ingresos acumulados, cantidad total de productos registrados y contador de ítems con stock crítico.
* **Alertas de Stock Bajo:** Aviso directo cuando existen productos con menos de 10 unidades disponibles.
* **Accesos Rápidos:** Botones directos hacia *Nueva Venta*, *Inventario*, *Catálogo* y *Reportes*.
* **Actividad Reciente:** Vista rápida de las últimas 5 ventas registradas con fecha, hora y monto.

###  2. Punto de Venta (`Nueva Venta`) y Promociones Automáticas
* **Navegación por Catálogo:** Filtros dinámicos por Categorías (ej. *Chapas, Stickers, Llaveros*) y Variantes/Subcategorías, además de buscador en tiempo real.
* **Control de Stock en Vivo:** Bloquea la selección de productos agotados (`Sin stock`) e impide agregar al carrito una cantidad mayor al stock disponible.

###  3. Gestión de Inventario
* **Visualización por Grilla:** Indicadores visuales de disponibilidad por colores (stock normal, stock bajo `< 10` y agotado `0`).
* **Ajuste Rápido de Stock:** Modal interactivo para **Agregar** (entradas de inventario) o **Quitar** (salidas/mermas) unidades de cualquier producto, registrando cada operación en el historial de movimientos.

###  4. Gestor de Catálogo Integrado (`Catálogo`)
Administración 100% desde la aplicación, sin depender de código externo:
* **Categorías:** Creación de nuevas familias de productos.
* **Variantes y Promociones:** Creación de subcategorías nuevas o edición de variantes existentes para activar.
* **Productos:** Registro de nuevos productos asignando categoría, variante, precio unitario y stock inicial.

###  5. Control por Eventos
* **Evento Activo:** Asocia todas las ventas nuevas al evento en curso, mostrando en tiempo real sus ingresos, cantidad de ventas y unidades vendidas.

###  6. Reportes y Estadísticas (`Ventas`)
* **Métricas Globales:** Total histórico de ingresos y número de transacciones realizadas.
* **Ranking de Productos Más Vendidos:** Top de productos ordenados por unidades vendidas e ingresos generados.
* **Historial de Transacciones:** Listado detallado de las últimas ventas con su ID, fecha, hora y total cobrado.

---

##  Tecnologías Utilizadas

* **Framework:** [React Native](https://reactnative.dev/) + [Expo](https://expo.dev/)
* **Navegación:** [Expo Router](https://docs.expo.dev/router/introduction/) (Navegación basada en archivos con `Stack` y `Tabs`)
* **Base de Datos Local (Offline-First):** `expo-sqlite` (SQLite con soporte relacional y modo WAL)
* **Lenguaje:** TypeScript
* **Estilos y UI:** `StyleSheet` personalizado con sistema de diseño en tonos pasteles (`Palette`), componentes reutilizables y tipografía redondeada **Nunito** (`@expo-google-fonts/nunito`) + iconos de `@expo/vector-icons` (`Ionicons`).

---

##  Arquitectura de Base de Datos (SQLite)

La aplicación funciona 100% sin conexión a internet mediante la base de datos local `coco_eventos.db`, compuesta por 7 tablas:
1. **`categorias`**: Familias principales de productos.
2. **`variantes`**: Subcategorías vinculadas a una categoría, con soporte para reglas de promoción (`promo_cantidad` y `promo_precio`).
3. **`productos`**: Ítems individuales con precio, stock actual y relación con su variante.
4. **`eventos`**: Registro de ferias/eventos activos y finalizados.
5. **`ventas`**: Cabecera de cada transacción vinculada a una fecha, total y `evento_id`.
6. **`detalle_ventas`**: Desglose de productos, cantidades y subtotales por cada venta.
7. **`movimientos_stock`**: Registro de auditoría de entradas y salidas de inventario.

---

##  Estructura del Proyecto

```text
src/
├── app/
│   ├── _layout.tsx               # Configuración raíz, SafeArea y carga de fuentes Nunito
│   ├── index.tsx                 # Redirección inicial hacia /tabs
│   └── tabs/
│       ├── _layout.tsx           # Barra de navegación inferior
│       ├── index.tsx             # Pantalla de Inicio (Dashboard)
│       ├── nueva-venta.tsx       # Punto de venta y carrito con promociones
│       ├── inventario.tsx        # Control y ajuste de stock
│       ├── gestionar-catalogo.tsx# Creación/edición de categorías, variantes, promos y productos
│       ├── eventos.tsx           # Administración de eventos activos y finalizados
│       └── ventas.tsx            # Reportes y ranking de productos más vendidos
├── components/
│   ├── app-header.tsx            # Encabezado unificado para todas las vistas
│   ├── app-text.tsx              # Componente tipográfico global con variantes Nunito
│   └── catalogo-filter.tsx       # Selector horizontal de categorías, variantes y buscador
├── constants/
│   └── theme.ts                  # Paleta de colores pasteles (Palette) y espaciados
├── database/
│   ├── index.ts                  # Inicialización de SQLite, creación de tablas y migraciones
│   ├── queries.ts                # Consultas SQL, lógica de negocio y cálculo de promociones
│   └── seed.ts                   # Datos iniciales del catálogo
└── hooks/
    └── use-catalogo.ts           # Hook personalizado para carga y filtrado de catálogo


``````

##  Actualizaciones a futuro 

* **Landing Page de Descarga:** (link:)
* **Importación y Exportación con Excel**  (esto hya esta diseñado pero para otra version)
* **Imágenes de Productos**  (esto solo por flojera no lo e hecho)

