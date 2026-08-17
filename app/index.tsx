import { Redirect } from 'expo-router';
import { useStore } from '../src/store/StoreContext';

export default function Index() {
  const { state } = useStore();
  if (state.isLoggedIn) {
    return <Redirect href={state.user?.role === 'admin' ? '/(tabs)/admin' : '/(tabs)/dashboard'} />;
  }
  return <Redirect href="/login" />;
}
