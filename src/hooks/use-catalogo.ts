// src/hooks/use-catalogo.ts
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  getCategorias,
  getVariantesByCategoria,
  getProductosByVariante,
  Categoria,
  Variante,
  Producto,
} from '../database/queries';

export function useCatalogo() {
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [variantes, setVariantes] = useState<Variante[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<number | null>(null);
  const [varianteSeleccionada, setVarianteSeleccionada] = useState<number | null>(null);
  const [searchText, setSearchText] = useState('');

  const cargarCategorias = useCallback(async () => {
    try {
      const cats = await getCategorias();
      setCategorias(cats);
      if (cats.length > 0 && !categoriaSeleccionada) {
        setCategoriaSeleccionada(cats[0].id);
      } else if (categoriaSeleccionada) {
        await cargarVariantes(categoriaSeleccionada);
      } else {
        setCargando(false);
      }
    } catch (error) {
      console.error('Error al cargar categorías:', error);
      setCargando(false);
    }
  }, [categoriaSeleccionada]);

  const cargarVariantes = useCallback(async (categoriaId: number) => {
    try {
      const vars = await getVariantesByCategoria(categoriaId);
      setVariantes(vars);
      if (vars.length > 0) {
        setVarianteSeleccionada((prev) =>
          vars.some((v) => v.id === prev) ? prev : vars[0].id
        );
      } else {
        setVarianteSeleccionada(null);
        setProductos([]);
        setCargando(false);
      }
    } catch (error) {
      console.error('Error al cargar variantes:', error);
      setCargando(false);
    }
  }, []);

  const cargarProductos = useCallback(async (varianteId: number) => {
    try {
      setCargando(true);
      const prods = await getProductosByVariante(varianteId);
      setProductos(prods);
    } catch (error) {
      console.error('Error al cargar productos:', error);
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargarCategorias();
    }, [cargarCategorias])
  );

  useEffect(() => {
    if (categoriaSeleccionada) {
      cargarVariantes(categoriaSeleccionada);
    }
  }, [categoriaSeleccionada, cargarVariantes]);

  useEffect(() => {
    if (varianteSeleccionada) {
      cargarProductos(varianteSeleccionada);
    }
  }, [varianteSeleccionada, cargarProductos]);

  const recargarProductosActuales = useCallback(async () => {
    if (varianteSeleccionada) {
      setRefrescando(true);
      await cargarProductos(varianteSeleccionada);
    }
  }, [varianteSeleccionada, cargarProductos]);

  const productosFiltrados = useMemo(() => {
    return productos.filter((p) =>
      p.nombre.toLowerCase().includes(searchText.toLowerCase())
    );
  }, [productos, searchText]);

  return {
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
  };
}