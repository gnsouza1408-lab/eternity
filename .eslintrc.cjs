module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  settings: { react: { version: '18.2' } },
  plugins: ['react-refresh'],
  overrides: [
    // Funções serverless (/api) e scripts de manutenção rodam em Node, não no navegador.
    {
      files: ['api/**/*.js', 'scripts/**/*.js'],
      env: { node: true, browser: false },
    },
  ],
  rules: {
    // O projeto é JS puro e não usa a lib prop-types; validar props aqui seria só ruído.
    'react/prop-types': 'off',
    'react/jsx-no-target-blank': 'off',
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
  },
}
