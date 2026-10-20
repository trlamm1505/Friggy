import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '../presentation/theme/ThemeContext';
import { LanguageBridge } from '../shared/i18n/LanguageBridge';
import { ServiceProvider } from '../data/ServiceProvider';
import '../shared/i18n/i18n';

export const AppProviders = ({ children }) => {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <LanguageBridge>
          <ThemeProvider>
            <ServiceProvider>{children}</ServiceProvider>
          </ThemeProvider>
        </LanguageBridge>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};
