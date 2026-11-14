import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeScreen } from '../screens/home/HomeScreen';
import { FridgeInventoryScreen } from '../screens/fridge/FridgeInventoryScreen';
import { AiChatScreen } from '../screens/ai/AiChatScreen';
import { UserProfileScreen } from '../screens/profile/UserProfileScreen';
import { CustomBottomNav } from '../components/navigation/CustomBottomNav';

const Stack = createNativeStackNavigator();

// Tabs content wrapper: dùng nội bộ để swap giữa các tab content
const TabsContent = () => {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {activeTab === 0 && <HomeScreen tabActive={true} />}
        {activeTab === 1 && (
          <FridgeInventoryScreen
            fridge={{
              id: 'family',
              name: 'Tủ lạnh',
              description: 'Tủ lạnh chính',
              totalItems: 0,
              expiringItems: 0,
              themeColor: '#006428',
            }}
            onRename={() => {}}
          />
        )}
        {activeTab === 3 && <AiChatScreen />}
        {activeTab === 4 && <UserProfileScreen />}
      </View>
      <CustomBottomNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
    </View>
  );
};

export const MainTabs = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs" component={TabsContent} />
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});
