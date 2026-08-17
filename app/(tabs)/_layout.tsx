import { Tabs, Redirect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../../src/store/StoreContext';

function TabBarIcon({ name, color, size = 22 }: { name: React.ComponentProps<typeof Ionicons>['name']; color: string; size?: number }) {
  return <Ionicons name={name} size={size} color={color} />;
}

export default function TabsLayout() {
  const { state, isDark, themeColors } = useStore();

  if (!state.isLoggedIn) {
    return <Redirect href="/login" />;
  }

  const isAdmin = state.user?.role === 'admin';
  const alertCount = state.alerts.length;
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, Platform.OS === 'android' ? 16 : 8);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: isAdmin
          ? { display: 'none' } // Hide consumer tab bar for Admin
          : {
              backgroundColor: themeColors.tabBarBg,
              borderTopColor: themeColors.tabBarBorder,
              borderTopWidth: 1,
              height: 60 + bottomInset,
              paddingBottom: bottomInset,
              paddingTop: 8,
              shadowColor: '#000',
              shadowOpacity: isDark ? 0.3 : 0.05,
              shadowOffset: { width: 0, height: -2 },
              shadowRadius: 10,
              elevation: 8,
            },
        tabBarActiveTintColor: themeColors.tabBarActive,
        tabBarInactiveTintColor: themeColors.tabBarInactive,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
      }}
    >
      {/* Consumer Screens: Hidden when role is Admin */}
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name={focused ? 'home' : 'home-outline'} color={color} />
          ),
          href: !isAdmin ? '/(tabs)/dashboard' : null,
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: 'Analytics',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name={focused ? 'bar-chart' : 'bar-chart-outline'} color={color} />
          ),
          href: !isAdmin ? '/(tabs)/analytics' : null,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Devices',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name={focused ? 'hardware-chip' : 'hardware-chip-outline'} color={color} />
          ),
          href: !isAdmin ? '/(tabs)/settings' : null,
        }}
      />
      <Tabs.Screen
        name="alerts"
        options={{
          title: 'Alerts',
          tabBarIcon: ({ color, focused }) => (
            <View>
              <TabBarIcon name={focused ? 'notifications' : 'notifications-outline'} color={color} />
              {alertCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{alertCount > 9 ? '9+' : alertCount}</Text>
                </View>
              )}
            </View>
          ),
          href: !isAdmin ? '/(tabs)/alerts' : null,
        }}
      />
      <Tabs.Screen
        name="rag"
        options={{
          title: 'AI Insights',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name={focused ? 'sparkles' : 'sparkles-outline'} color={color} />
          ),
          href: !isAdmin ? '/(tabs)/rag' : null,
        }}
      />

      {/* Admin Screen: Visible only when role is Admin */}
      <Tabs.Screen
        name="admin"
        options={{
          title: 'Admin',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name={focused ? 'shield-checkmark' : 'shield-checkmark-outline'} color={color} />
          ),
          href: isAdmin ? '/(tabs)/admin' : null,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#fff',
  },
});
