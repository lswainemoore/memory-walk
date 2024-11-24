// .eslintrc.js
export default {
  root: true,
  env: {
    browser: true,
    es2022: true,
  },
  extends: [
    '@eslint/js/recommended',
    'plugin:react-hooks/recommended',
  ],
  parserOptions: {
    ecmaVersion: 2023,
    sourceType: 'module'
  },
  rules: {
    // Similar to noUnusedLocals
    'no-unused-vars': ['error', { 
      vars: 'all',
      args: 'after-used',
      ignoreRestSiblings: true
    }],
    // Similar to noUnusedParameters
    'no-unused-params': 'error',
    // Similar to noFallthroughCasesInSwitch
    'no-fallthrough': 'error',
    // Additional recommended rules for React
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
  },
}