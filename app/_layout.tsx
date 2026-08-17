import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StoreProvider } from '../src/store/StoreContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StoreProvider>
        <StatusBar style="dark" backgroundColor="#EDF5F1" />
        <Stack screenOptions={{ headerShown: false }} />
      </StoreProvider>
    </SafeAreaProvider>
  );
}
