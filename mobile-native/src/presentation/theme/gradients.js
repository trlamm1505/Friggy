// Mapping từ AppGradients trong app_theme.dart
export const AppGradients = {
  lightBackground: {
    colors: ['#FFFFFF', '#F5FCF4', '#C7EFC2', '#86D978', '#4CB93E'],
    locations: [0.0, 0.24, 0.42, 0.72, 1.0],
    start: { x: 0.5, y: 0 },
    end: { x: 0.5, y: 1 },
  },
  darkBackground: {
    colors: ['#0E1611', '#142017', '#1B2E21', '#1E3A25', '#162A1B'],
    locations: [0.0, 0.24, 0.42, 0.72, 1.0],
    start: { x: 0.5, y: 0 },
    end: { x: 0.5, y: 1 },
  },
  getBackground: (isDark) => (isDark ? AppGradients.darkBackground : AppGradients.lightBackground),
};
