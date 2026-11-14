import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLanguageStore } from '../stores/useLanguageStore';

export const LanguageBridge = ({ children }) => {
  const { i18n } = useTranslation();
  const { locale, initLocale } = useLanguageStore();

  useEffect(() => {
    initLocale();
  }, []);

  useEffect(() => {
    if (locale && i18n.language !== locale) {
      i18n.changeLanguage(locale);
    }
  }, [locale, i18n]);

  return children;
};
