/**
 * ServiceDebugCard
 *
 * Card nhỏ hiển thị trạng thái services + database.
 * Có thể gắn vào 1 screen nào đó để verify Sprint 1 hoạt động.
 *
 * Sau khi confirm Sprint 1 OK, có thể xóa component này.
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useServices } from '../../data/ServiceProvider';
import databaseService from '../../data/storage/DatabaseService';
import { useTheme } from '../theme/ThemeContext';
import { sp } from '../utils/responsive';

export const ServiceDebugCard = () => {
  const { isDark, colors } = useTheme();
  const services = useServices();
  const [dbStatus, setDbStatus] = useState('checking...');
  const [counts, setCounts] = useState({});
  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    checkDatabase();
  }, []);

  const checkDatabase = async () => {
    try {
      await databaseService.init();
      const tables = ['users', 'fridge_items', 'notifications', 'shopping_items', 'weekly_stats', 'allergies', 'family_members'];
      const result = {};
      for (const t of tables) {
        const r = await databaseService.queryOne(`SELECT COUNT(*) as count FROM ${t}`);
        result[t] = r.count;
      }
      setCounts(result);
      setDbStatus('connected');
    } catch (e) {
      setDbStatus('error: ' + e.message);
    }
  };

  const testServices = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const fridge = await services.fridgeService.getItems();
      const summary = await services.fridgeService.getSummary();
      const recipes = await services.recipeService.getRecipes();
      const stats = await services.recipeService.getWeeklyStats();
      const notifs = await services.notificationService.getNotifications();
      const profile = await services.userService.getProfile();
      const plan = await services.userService.getCurrentPlan();

      setTestResult({
        fridgeCount: fridge.length,
        summary,
        recipesCount: recipes.length,
        stats,
        notifsCount: notifs.length,
        profile: profile.name,
        plan: plan.displayName,
      });
    } catch (e) {
      setTestResult({ error: e.message });
    } finally {
      setTesting(false);
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark ? colors.darkSurface : colors.lightSurface,
          borderColor: isDark ? colors.darkCardBorder : colors.border,
        },
      ]}
    >
      <Text style={[styles.title, { color: isDark ? colors.darkTextPrimary : colors.textPrimary }]}>
        Sprint 1 Debug
      </Text>

      <Text style={[styles.label, { color: isDark ? colors.darkTextSecondary : colors.textSecondary }]}>
        Database: {dbStatus}
      </Text>

      {Object.keys(counts).length > 0 && (
        <View style={styles.countsBlock}>
          {Object.entries(counts).map(([t, c]) => (
            <Text
              key={t}
              style={[styles.countText, { color: isDark ? colors.darkTextPrimary : colors.textPrimary }]}
            >
              {t}: {c} rows
            </Text>
          ))}
        </View>
      )}

      <TouchableOpacity
        style={[styles.button, { backgroundColor: colors.primary }]}
        onPress={testServices}
        disabled={testing}
      >
        {testing ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Test Services</Text>
        )}
      </TouchableOpacity>

      {testResult && (
        <View style={styles.resultBlock}>
          {testResult.error ? (
            <Text style={[styles.resultText, { color: colors.error }]}>Error: {testResult.error}</Text>
          ) : (
            <>
              <Text style={[styles.resultText, { color: isDark ? colors.darkTextPrimary : colors.textPrimary }]}>
                Fridge items: {testResult.fridgeCount}
              </Text>
              <Text style={[styles.resultText, { color: isDark ? colors.darkTextPrimary : colors.textPrimary }]}>
                Summary: {testResult.summary.expiredCount} expired, {testResult.summary.availableCount} available
              </Text>
              <Text style={[styles.resultText, { color: isDark ? colors.darkTextPrimary : colors.textPrimary }]}>
                Recipes: {testResult.recipesCount}
              </Text>
              <Text style={[styles.resultText, { color: isDark ? colors.darkTextPrimary : colors.textPrimary }]}>
                Weekly total: {testResult.stats.total}
              </Text>
              <Text style={[styles.resultText, { color: isDark ? colors.darkTextPrimary : colors.textPrimary }]}>
                Notifications: {testResult.notifsCount}
              </Text>
              <Text style={[styles.resultText, { color: isDark ? colors.darkTextPrimary : colors.textPrimary }]}>
                Profile: {testResult.profile}
              </Text>
              <Text style={[styles.resultText, { color: isDark ? colors.darkTextPrimary : colors.textPrimary }]}>
                Plan: {testResult.plan}
              </Text>
            </>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    margin: sp(16),
    padding: sp(16),
    borderRadius: sp(12),
    borderWidth: 1,
  },
  title: {
    fontSize: sp(18),
    fontWeight: '800',
    marginBottom: sp(8),
  },
  label: {
    fontSize: sp(13),
    marginBottom: sp(8),
  },
  countsBlock: {
    marginBottom: sp(12),
  },
  countText: {
    fontSize: sp(12),
    marginVertical: sp(2),
  },
  button: {
    paddingVertical: sp(10),
    borderRadius: sp(8),
    alignItems: 'center',
    marginBottom: sp(12),
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: sp(14),
  },
  resultBlock: {
    gap: sp(4),
  },
  resultText: {
    fontSize: sp(12),
  },
});
