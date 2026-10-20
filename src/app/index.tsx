import { Redirect } from 'expo-router';

export default function Index() {
  // Redirige automáticamente a la pantalla principal dentro de tu carpeta tabs
  return <Redirect href="/tabs" />;
}