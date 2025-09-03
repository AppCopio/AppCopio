/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  clearMocks: true,
  testMatch: ['**/test/**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.jest.json' }],
  },
  // Si de verdad necesitas quitar .js solo en imports relativos de TU código:
  // moduleNameMapper: { '^(\\.{1,2}/.*)\\.js$': '$1' },
};
