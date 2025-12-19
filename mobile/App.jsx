import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { QueryClient, QueryClientProvider } from 'react-query';
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
import { ActivityIndicator, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useEffect, useState } from 'react';
import { getNotifications } from './services/notificationService';
import Tooltip from './components/Tooltip';
import { MaterialIcons } from '@expo/vector-icons';

const queryClient = new QueryClient();

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const MainTabs = () => {
  const { user, logout } = useAuth();
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
      screenOptions={({ navigation }) => ({
        headerShown: true,
        headerStyle: {
          backgroundColor: '#fff',
          elevation: 2,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        },
        headerTitleStyle: {
          fontWeight: 'bold',
          fontSize: 18,
        },
        headerRight: () => {
          const { logout } = useAuth();
          const handleLogout = async () => {
            await logout();
            // Navigation will automatically redirect to login due to auth state change
          };
          
          return (
            <View style={styles.headerRight}>
              <Tooltip text="My Profile">
                <TouchableOpacity
                  onPress={() => navigation.navigate('Profile')}
                  style={styles.profileButton}
                >
                  <Text style={styles.profileIcon}>👤</Text>
                </TouchableOpacity>
              </Tooltip>
              <Tooltip text="Notifications">
                <TouchableOpacity
                  onPress={() => navigation.navigate('Notifications')}
                  style={styles.notificationButton}
                >
                  <Text style={styles.notificationIcon}>🔔</Text>
                  {unreadCount > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              </Tooltip>
              <Tooltip text="Logout">
                <TouchableOpacity
                  onPress={handleLogout}
                  style={styles.logoutButton}
                >
                  <MaterialIcons name="logout" size={24} color="#333" />
                </TouchableOpacity>
              </Tooltip>
            </View>
          );
        },
        tabBarActiveTintColor: '#ef4444',
        tabBarInactiveTintColor: '#666',
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'Home',
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Tooltip text="Home">
              <Text style={{ fontSize: size, color }}>🏠</Text>
            </Tooltip>
          ),
        }}
      />
      <Tab.Screen
        name="Search"
        component={SearchScreen}
        options={{
          title: 'Search Profiles',
          tabBarLabel: 'Search',
          tabBarIcon: ({ color, size }) => (
            <Tooltip text="Search Profiles">
              <Text style={{ fontSize: size, color }}>🔍</Text>
            </Tooltip>
          ),
        }}
      />
      <Tab.Screen
        name="Chats"
        component={ChatsScreen}
        options={{
          title: 'Chats',
          tabBarLabel: 'Chats',
          tabBarIcon: ({ color, size }) => (
            <Tooltip text="Chats">
              <View style={{ position: 'relative' }}>
                <Text style={{ fontSize: size, color }}>💬</Text>
              </View>
            </Tooltip>
          ),
        }}
      />
      <Tab.Screen
        name="Interests"
        component={InterestsScreen}
        options={{
          title: 'Interests',
          tabBarLabel: 'Interests',
          tabBarIcon: ({ color, size }) => (
            <Tooltip text="Interests">
              <Text style={{ fontSize: size, color }}>💝</Text>
            </Tooltip>
          ),
        }}
      />
      <Tab.Screen
        name="Favorites"
        component={FavoritesScreen}
        options={{
          title: 'Favorites',
          tabBarLabel: 'Favorites',
          tabBarIcon: ({ color, size }) => (
            <Tooltip text="Favorites">
              <Text style={{ fontSize: size, color }}>⭐</Text>
            </Tooltip>
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
          <Stack.Screen 
            name="Profile" 
            component={ProfileScreen}
            options={{ title: 'My Profile' }}
          />
          <Stack.Screen 
            name="ProfileDetail" 
            component={ProfileDetailScreen}
            options={{ title: 'Profile Details' }}
          />
          <Stack.Screen 
            name="Notifications" 
            component={NotificationsScreen}
            options={{ title: 'Notifications' }}
          />
        </Stack.Navigator>
      ) : (
        <AuthStack />
      )}
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 5,
  },
  profileButton: {
    marginRight: 10,
    padding: 5,
  },
  profileIcon: {
    fontSize: 24,
  },
  notificationButton: {
    marginRight: 10,
    position: 'relative',
    padding: 5,
  },
  notificationIcon: {
    fontSize: 24,
  },
  logoutButton: {
    marginRight: 10,
    padding: 5,
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
    borderWidth: 2,
    borderColor: '#fff',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppNavigator />
      </AuthProvider>
    </QueryClientProvider>
  );
}

