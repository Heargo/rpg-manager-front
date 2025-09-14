import { definePreset } from '@primeuix/themes';
import Nora from '@primeuix/themes/nora';

// theme color
//  --color-paper-0: #f9f6ef;
// --color-paper-50: #f1ecda;
//   --color-paper-100: #e5ddc0;
//   --color-paper-200: #cbc4aa;
//   --color-paper-300: #afa992;
//   --color-paper-400: #938e7b;
//   --color-paper-500: #797564;
//   --color-paper-600: #5f5c4f;
//   --color-paper-700: #47443a;
//   --color-paper-800: #323029;
//   --color-paper-900: #1d1c16;
//   --color-paper-950: #12110d;

export const PrimeNgRpgPreset = definePreset(Nora, {
  semantic: {
    primary: {
      50: '#fbe6e6',
      100: '#f8cdcd',
      200: '#f29494',
      300: '#ef5252',
      400: '#bc2a2a',
      500: '#7f1919',
      600: '#691313',
      700: '#560e0e',
      800: '#400808',
      900: '#2d0404',
      950: '#1f0202',
    },
    colorScheme: {
      light: {
        surface: {
          0: '#f9f6ef',
          50: '#f1ecda',
          100: '#e5ddc0',
          200: '#cbc4aa',
          300: '#afa992',
          400: '#938e7b',
          500: '#797564',
          600: '#5f5c4f',
          700: '#47443a',
          800: '#323029',
          900: '#1d1c16',
          950: '#12110d',
        },
      },
      dark: {
        surface: {
          0: '#12110d',
          50: '#1d1c16',
          100: '#323029',
          200: '#47443a',
          300: '#5f5c4f',
          400: '#797564',
          500: '#938e7b',
          600: '#afa992',
          700: '#cbc4aa',
          800: '#e5ddc0',
          900: '#f1ecda',
          950: '#f9f6ef',
        },
      },
    },
  },
});
