import React, { useState, useEffect } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Routes } from '../../shared/constants/routes';
import { InitialLoadingScreen } from '../screens/common/InitialLoadingScreen';
import { SplashScreen } from '../screens/auth/SplashScreen';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { ForgotPasswordScreen } from '../screens/auth/ForgotPasswordScreen';
import { MainScreens } from './MainScreens';
import { useAuthStore } from '../../shared/stores/useAuthStore';
import { OnboardingSurveyScreen } from '../screens/onboarding/OnboardingSurveyScreen';

const Stack = createNativeStackNavigator();

// Auth flow: Login, Register, ForgotPassword, Splash (entry marketing screen)
//
// KHÔNG có màn hình "Đăng nhập thành công" (LoginSuccessVideo):
//   Video không phát được trên Expo Go và đã gỡ. Đăng nhập xong ->
//   useAuthStore.login() set isAuthenticated -> RootNavigator tự chuyển
//   sang Onboarding/Main, không cần màn hình trung gian.
const AuthScreens = () => (
  <Stack.Navigator
    initialRouteName={Routes.Splash}
    screenOptions={{ headerShown: false, animation: 'slide_from_right' }}
  >
    <Stack.Screen name={Routes.Splash} component={SplashScreen} />
    <Stack.Screen name={Routes.Login} component={LoginScreen} />
    <Stack.Screen name={Routes.Register} component={RegisterScreen} />
    <Stack.Screen name={Routes.ForgotPassword} component={ForgotPasswordScreen} />
  </Stack.Navigator>
);

export const RootNavigator = () => {
  const [isLoading, setIsLoading] = useState(true);
  const { isAuthenticated, isOnboarded } = useAuthStore();

  useEffect(() => {
    const t = setTimeout(() => setIsLoading(false), 2000);
    return () => clearTimeout(t);
  }, []);

  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
      {isLoading ? (
        <Stack.Screen name={Routes.InitialLoading} component={InitialLoadingScreen} />
      ) : !isAuthenticated ? (
        <Stack.Screen name="AuthFlow" component={AuthScreens} />
      ) : !isOnboarded ? (
        <Stack.Screen name="OnboardingFlow" component={OnboardingSurveyScreen} />
      ) : (
        <Stack.Screen name="MainFlow" component={MainScreens} />
      )}
    </Stack.Navigator>
  );
};
