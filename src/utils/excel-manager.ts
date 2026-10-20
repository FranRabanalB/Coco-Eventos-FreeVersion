// src/utils/excel-manager.ts
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as XLSX from "xlsx";
import { getInventarioCompleto, getDetalleVentasParaExportar } from "../database/queries";


export interface FilaExcel {
  Categoria: string;
  Variante: string;
  Producto: string;
  Precio: number;
  Stock: number;
  PromoCantidad?: number;
  PromoPrecio?: number;
}

// Esta función puentea el bloqueo de Android usando la red interna del celular
const leerArchivoNativo = (uri: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload = () => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]); // Extraer solo el Base64 puro
      };
      reader.onerror = reject;
      reader.readAsDataURL(xhr.response);
    };
    xhr.onerror = reject;
    xhr.responseType = 'blob';
    xhr.open('GET', uri, true);
    xhr.send(null);
  });
};

export const importarExcel = async (): Promise<FilaExcel[] | null> => {
  try {
    const resultado = await DocumentPicker.getDocumentAsync({
      type: '*/*', // Permitir todos los archivos para evitar bugs de MIME type en Android
      copyToCacheDirectory: true, 
    });

    if (resultado.canceled) return null;

    const uri = resultado.assets[0].uri;
    let b64 = '';

    try {
      // Intento 1: Lector rápido de Expo
      b64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
    } catch (e) {
      // Intento 2 (Infalible): Si Android bloquea la caché, usamos el lector nativo XHR
      b64 = await leerArchivoNativo(uri);
    }

    // Convertimos a Excel
    const workbook = XLSX.read(b64, { type: 'base64' });
    const primeraHoja = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[primeraHoja];
    
    // Transformamos a JSON
    const datos = XLSX.utils.sheet_to_json<FilaExcel>(worksheet);
    return datos;
  } catch (error) {
    console.error('Error al leer el Excel:', error);
    throw new Error('No se pudo leer el archivo. Verifica que sea un Excel válido.');
  }
};

export const exportarInventarioAExcel = async () => {
  try {
    // 1. Obtener los datos frescos
    const inventario = await getInventarioCompleto();

    // 2. Formatear los datos
    const datosExcel = inventario.map((item) => ({
      Categoria: item.categoria_nombre,
      Variante: item.variante_nombre,
      Producto: item.nombre,
      Precio: item.precio,
      Stock: item.stock,
    }));

    // 3. Crear el libro de Excel
    const worksheet = XLSX.utils.json_to_sheet(datosExcel);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Inventario");

    // 4. Convertir a Base64
    const b64 = XLSX.write(workbook, { type: "base64" });
    const filename = `${FileSystem.documentDirectory}Inventario_CocoEventos.xlsx`;

    await FileSystem.writeAsStringAsync(filename, b64, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // 5. Compartir
    await Sharing.shareAsync(filename, {
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      dialogTitle: "Exportar Inventario",
    });
  } catch (error) {
    console.error("Error al exportar:", error);
    throw new Error("No se pudo generar el archivo Excel.");
  }
};

export const exportarVentasAExcel = async () => {
  try {
    const ventasDetalle = await getDetalleVentasParaExportar();

    const datosExcel = ventasDetalle.map((item) => {
      const fechaObj = new Date(item.Fecha);
      return {
        'ID Venta': item.VentaID,
        'Fecha': fechaObj.toLocaleDateString('es-ES'),
        'Hora': fechaObj.toLocaleTimeString('es-ES'),
        'Evento': item.Evento || 'Sin Evento',
        'Producto': item.Producto,
        'Cantidad': item.Cantidad,
        'Precio Unit.': item.PrecioUnitario,
        'Subtotal': item.Subtotal
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(datosExcel);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Reporte de Ventas");

    const b64 = XLSX.write(workbook, { type: "base64" });
    const filename = `${FileSystem.documentDirectory}Reporte_Ventas_CocoEventos.xlsx`;

    await FileSystem.writeAsStringAsync(filename, b64, {
      encoding: FileSystem.EncodingType.Base64,
    });

    await Sharing.shareAsync(filename, {
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      dialogTitle: "Exportar Reporte de Ventas",
    });
  } catch (error) {
    console.error("Error al exportar ventas:", error);
    throw new Error("No se pudo generar el reporte de ventas.");
  }
};

