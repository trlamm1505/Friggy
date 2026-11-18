import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Routes } from '../../shared/constants/routes';
import { MainTabs } from './MainTabs';
import { SelectInputMethodScreen } from '../screens/scan/SelectInputMethodScreen';
import { NotificationsScreen } from '../screens/notification/NotificationsScreen';
import { AllExpiredItemsScreen } from '../screens/fridge/AllExpiredItemsScreen';
import { AllAvailableItemsScreen } from '../screens/fridge/AllAvailableItemsScreen';
import { IngredientStatisticsScreen } from '../screens/recipe/IngredientStatisticsScreen';
import { NextWeekSuggestionsScreen } from '../screens/recipe/NextWeekSuggestionsScreen';
import { ShoppingReminderScreen } from '../screens/recipe/ShoppingReminderScreen';
import { PackageManagementScreen } from '../screens/subscription/PackageManagementScreen';
import { MyPackagesScreen } from '../screens/subscription/MyPackagesScreen';
import { RecipeDetailScreen } from '../screens/recipe/RecipeDetailScreen';
import { MyFridgesScreen } from '../screens/fridge/MyFridgesScreen';
import { ManualAddIngredientScreen } from '../screens/fridge/ManualAddIngredientScreen';
import { ScanFoodPhotoScreen } from '../screens/scan/ScanFoodPhotoScreen';
import { InDevelopmentScreen } from '../screens/scan/InDevelopmentScreen';
import { CameraPreviewScreen } from '../screens/scan/CameraPreviewScreen';
import { ScanHistoryScreen } from '../screens/scan/ScanHistoryScreen';
import { RecipeSuggestionsScreen } from '../screens/recipe/RecipeSuggestionsScreen';
import { PersonalInfoScreen } from '../screens/profile/PersonalInfoScreen';
import { UserPreferencesScreen } from '../screens/profile/UserPreferencesScreen';
import { UserAllergiesScreen } from '../screens/profile/UserAllergiesScreen';
import { FamilyManagementScreen } from '../screens/profile/FamilyManagementScreen';
import { ChangePasswordScreen } from '../screens/profile/ChangePasswordScreen';
import { AppSettingsScreen } from '../screens/profile/AppSettingsScreen';
import { PaymentHistoryScreen } from '../screens/profile/PaymentHistoryScreen';

const MainStack = createNativeStackNavigator();

export const MainScreens = () => (
  <MainStack.Navigator screenOptions={{ headerShown: false }}>
    <MainStack.Screen name={Routes.MainTabs} component={MainTabs} />
    <MainStack.Screen
      name={Routes.SelectInputMethod}
      component={SelectInputMethodScreen}
      options={{ presentation: 'transparentModal', animation: 'fade' }}
    />
    <MainStack.Screen name={Routes.Notifications} component={NotificationsScreen} />
    <MainStack.Screen name={Routes.AllExpiredItems} component={AllExpiredItemsScreen} />
    <MainStack.Screen name={Routes.AllAvailableItems} component={AllAvailableItemsScreen} />
    <MainStack.Screen name={Routes.IngredientStatistics} component={IngredientStatisticsScreen} />
    <MainStack.Screen name={Routes.NextWeekSuggestions} component={NextWeekSuggestionsScreen} />
    <MainStack.Screen name={Routes.ShoppingReminder} component={ShoppingReminderScreen} />
    <MainStack.Screen name={Routes.PackageManagement} component={PackageManagementScreen} />
    <MainStack.Screen name={Routes.MyPackages} component={MyPackagesScreen} />
    <MainStack.Screen name={Routes.RecipeDetail} component={RecipeDetailScreen} />
    <MainStack.Screen name={Routes.MyFridges} component={MyFridgesScreen} />
    <MainStack.Screen name={Routes.ManualAddIngredient} component={ManualAddIngredientScreen} />
    <MainStack.Screen name={Routes.ScanFoodPhoto} component={ScanFoodPhotoScreen} />
    {/* ⚠️ 2 luồng đang phát triển (19/11): "Quét hóa đơn" + "Quét mã vạch / QR".
        Nút ở `SelectInputMethodScreen` đã khoá, nhưng vẫn cần chặn ở route
        để tránh dead-end khi deep-link trực tiếp.
        KHI BẬT LẠI: đổi component về `ScanReceiptScreen` / `ScanBarcodeScreen`. */}
    <MainStack.Screen
      name={Routes.ScanReceipt}
      component={InDevelopmentScreen}
      initialParams={{ title: 'Quét hóa đơn' }}
    />
    <MainStack.Screen
      name={Routes.ScanBarcode}
      component={InDevelopmentScreen}
      initialParams={{ title: 'Quét mã vạch / QR' }}
    />
    <MainStack.Screen name={Routes.ScanResultReview} component={CameraPreviewScreen} />
    <MainStack.Screen name={Routes.ScanHistory} component={ScanHistoryScreen} />
    <MainStack.Screen name={Routes.RecipeSuggestions} component={RecipeSuggestionsScreen} />
    <MainStack.Screen name={Routes.PersonalInfo} component={PersonalInfoScreen} />
    <MainStack.Screen name={Routes.UserPreferences} component={UserPreferencesScreen} />
    <MainStack.Screen name={Routes.UserAllergies} component={UserAllergiesScreen} />
    <MainStack.Screen name={Routes.FamilyManagement} component={FamilyManagementScreen} />
    <MainStack.Screen name={Routes.ChangePassword} component={ChangePasswordScreen} />
    <MainStack.Screen name={Routes.AppSettings} component={AppSettingsScreen} />
    <MainStack.Screen name={Routes.PaymentHistory} component={PaymentHistoryScreen} />
  </MainStack.Navigator>
);
