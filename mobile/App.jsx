import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import HomeScreen from './screens/HomeScreen';
import SearchScreen from './screens/SearchScreen';
import ProfileScreen from './screens/ProfileScreen';
import ProfileDetailScreen from './screens/ProfileDetailScreen';
import ChatsScreen from './screens/ChatsScreen';
import NotificationsScreen from './screens/NotificationsScreen';
import InterestsScreen from './screens/InterestsScreen';
import FavoritesScreen from './screens/FavoritesScreen';
import { ActivityIndicator, View, Text } from 'react-native';
import { useEffect, useState } from 'react';
import { getNotifications } from './services/notificationService';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const MainTabs = () => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (user) {
      const loadUnreadCount = async () => {
        try {
          const response = await getNotifications({ limit: 1, unreadOnly: true });
          setUnreadCount(response.unreadCount || 0);
        } catch (error) {
          // Silently fail
        }
      };
      loadUnreadCount();
      const interval = setInterval(loadUnreadCount, 10000);
      return () => clearInterval(interval);
    }
  }, [user]);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#ef4444',
        tabBarInactiveTintColor: '#666',
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => <Text style={{ fontSize: size, color }}>🏠</Text>,
        }}
      />
      <Tab.Screen
        name="Search"
        component={SearchScreen}
        options={{
          tabBarLabel: 'Search',
          tabBarIcon: ({ color, size }) => <Text style={{ fontSize: size, color }}>🔍</Text>,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => <Text style={{ fontSize: size, color }}>👤</Text>,
        }}
      />
      <Tab.Screen
        name="Chats"
        component={ChatsScreen}
        options={{
          tabBarLabel: 'Chats',
          tabBarIcon: ({ color, size }) => (
            <View style={{ position: 'relative' }}>
              <Text style={{ fontSize: size, color }}>💬</Text>
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Interests"
        component={InterestsScreen}
        options={{
          tabBarLabel: 'Interests',
          tabBarIcon: ({ color, size }) => <Text style={{ fontSize: size, color }}>💝</Text>,
        }}
      />
      <Tab.Screen
        name="Favorites"
        component={FavoritesScreen}
        options={{
          tabBarLabel: 'Favorites',
          tabBarIcon: ({ color, size }) => <Text style={{ fontSize: size, color }}>⭐</Text>,
        }}
      />
      <Tab.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{
          tabBarLabel: 'Notifications',
          tabBarIcon: ({ color, size }) => (
            <View style={{ position: 'relative' }}>
              <Text style={{ fontSize: size, color }}>🔔</Text>
              {unreadCount > 0 && (
                <View
                  style={{
                    position: 'absolute',
                    top: -5,
                    right: -8,
                    backgroundColor: '#ef4444',
                    borderRadius: 8,
                    minWidth: 16,
                    height: 16,
                    justifyContent: 'center',
                    alignItems: 'center',
                    paddingHorizontal: 4,
                  }}
                >
                  <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Text>
                </View>
              )}
            </View>
          ),
        }}
      />
    </Tab.Navigator>
  );
};

const AuthStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
};

const AppNavigator = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {user ? (
        <Stack.Navigator>
          <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
          <Stack.Screen name="ProfileDetail" component={ProfileDetailScreen} />
        </Stack.Navigator>
      ) : (
        <AuthStack />
      )}
    </NavigationContainer>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppNavigator />
    </AuthProvider>
  );
}

