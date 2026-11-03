/**
 * ESLint flat config (ESLint 9)
 *
 * Thay thế cho `.eslintrc.js` cũ - ESLint 9 KHÔNG đọc .eslintrc.js nữa.
 * Tương đương với .eslintrc.js cũ:
 *   extends: ['expo']
 *   rules: { 'react/jsx-filename-extension': ['error', { extensions: ['.js','.jsx'] }] }
 */

const expoConfig = require('eslint-config-expo/flat');

module.exports = [
  {
    ignores: [
      'node_modules/**',
      '.expo/**',
      'dist/**',
      'web-build/**',
      'android/**',
      'ios/**',
      // Jest tự sinh coverage, không lint
      'coverage/**',
    ],
  },
  ...expoConfig,

  // Globals của Jest - không có block này thì mọi file test + jest.setup.js
  // báo lỗi `no-undef` cho describe/it/expect/jest.
  {
    files: [
      '**/__tests__/**/*.js',
      '**/__tests__/**/*.jsx',
      '**/__testUtils__/**/*.js',
      '**/*.test.js',
      '**/*.test.jsx',
      'jest.setup.js',
    ],
    languageOptions: {
      globals: {
        jest: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        // Test đọc file locale từ disk -> cần `__dirname` + `require`.
        __dirname: 'readonly',
        require: 'readonly',
        process: 'readonly',
      },
    },
  },

  {
    // Script Node (CommonJS) - cần globals `__dirname`, `require`, `process`.
    // Không có block này thì `no-undef` báo lỗi cho mọi file trong scripts/.
    files: ['scripts/**/*.js', '*.config.js', '*.config.cjs'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: {
        __dirname: 'readonly',
        __filename: 'readonly',
        require: 'readonly',
        module: 'writable',
        exports: 'writable',
        process: 'readonly',
        console: 'readonly',
        Buffer: 'readonly',
        __DEV__: 'readonly',
      },
    },
  },

  {
    files: ['**/*.js', '**/*.jsx'],
    rules: {
      'react/jsx-filename-extension': ['error', { extensions: ['.js', '.jsx'] }],

      // react-hooks/refs (React Compiler rules của eslint-plugin-react-hooks v7)
      // báo lỗi cho pattern chuẩn của React Native:
      //     const anim = useRef(new Animated.Value(0)).current;
      //     const width = anim.interpolate({...});
      // Đây là false-positive: RN Animated KHÔNG dùng React Compiler và
      // pattern này là idiom được khuyến nghị chính thức của React Native.
      // -> Tắt rule để lint phản ánh lỗi thật, không chìm trong noise.
      'react-hooks/refs': 'off',
    },
  },
];
