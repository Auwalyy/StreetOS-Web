import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuthStore } from '../store/authStore';
import { colors, typography } from '../theme';

// Auth Screens
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import NewBusinessScreen from '../screens/auth/NewBusinessScreen';

// Main Screens
import DashboardScreen from '../screens/dashboard/DashboardScreen';
import TransactionsScreen from '../screens/transactions/TransactionsScreen';
import AddTransactionScreen from '../screens/transactions/AddTransactionScreen';
import InventoryScreen from '../screens/inventory/InventoryScreen';
import CustomersScreen from '../screens/customers/CustomersScreen';
import CustomerDetailScreen from '../screens/customers/CustomerDetailScreen';
import DebtsScreen from '../screens/debts/DebtsScreen';
import AnalyticsScreen from '../screens/analytics/AnalyticsScreen';
import SavingsScreen from '../screens/savings/SavingsScreen';
import AIAdvisorScreen from '../screens/ai/AIAdvisorScreen';
import MoreScreen from '../screens/more/MoreScreen';
import ProfileScreen from '../screens/more/ProfileScreen';
import EmployeesScreen from '../screens/more/EmployeesScreen';
import SuppliersScreen from '../screens/more/SuppliersScreen';
import CommunityScreen from '../screens/more/CommunityScreen';
import AdasheScreen from '../screens/more/AdasheScreen';
import NotificationsScreen from '../screens/more/NotificationsScreen';
import MarketScreen from '../screens/more/MarketScreen';
import POSScreen from '../screens/pos/POSScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const TAB_ICONS = {
  Dashboard: '🏠',
  POS: '⚡',
  Inventory: '📦',
  Debts: '📒',
  Analytics: '📊',
  AI: '🤖',
  More: '☰',
};

function TabBar({ state, descriptors, navigation }) {
  return (
    <View style={styles.tabBar}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;
        const icon = TAB_ICONS[route.name] || '●';
        const label = route.name;

        return (
          <TouchableOpacity
            key={route.key}
            onPress={() => {
              if (!isFocused) navigation.navigate(route.name);
            }}
            activeOpacity={0.7}
            style={styles.tabItem}
          >
            <View style={[styles.tabIconWrap, isFocused && styles.tabIconWrapActive]}>
              <Text style={styles.tabIcon}>{icon}</Text>
            </View>
            <Text style={[styles.tabLabel, isFocused && styles.tabLabelActive]}>
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="POS" component={POSScreen} />
      <Tab.Screen name="Inventory" component={InventoryScreen} />
      <Tab.Screen name="Debts" component={DebtsScreen} />
      <Tab.Screen name="Analytics" component={AnalyticsScreen} />
      <Tab.Screen name="AI" component={AIAdvisorScreen} />
      <Tab.Screen name="More" component={MoreScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { token, currentBusiness } = useAuthStore();

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        {!token ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        ) : !currentBusiness ? (
          <Stack.Screen name="NewBusiness" component={NewBusinessScreen} />
        ) : (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen name="AddTransaction" component={AddTransactionScreen} options={{ presentation: 'modal' }} />
            <Stack.Screen name="POS" component={POSScreen} />
            <Stack.Screen name="CustomerDetail" component={CustomerDetailScreen} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
            <Stack.Screen name="Employees" component={EmployeesScreen} />
            <Stack.Screen name="Suppliers" component={SuppliersScreen} />
            <Stack.Screen name="Community" component={CommunityScreen} />
            <Stack.Screen name="Adashe" component={AdasheScreen} />
            <Stack.Screen name="Notifications" component={NotificationsScreen} />
            <Stack.Screen name="Savings" component={SavingsScreen} />
            <Stack.Screen name="Market" component={MarketScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.gray100,
    paddingBottom: 20,
    paddingTop: 8,
    paddingHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 10,
  },
  tabItem: { flex: 1, alignItems: 'center', gap: 2 },
  tabIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  tabIconWrapActive: { backgroundColor: colors.primaryBg },
  tabIcon: { fontSize: 18 },
  tabLabel: { fontSize: 10, color: colors.gray400, fontWeight: '500' },
  tabLabelActive: { color: colors.primary, fontWeight: '700' },
});
