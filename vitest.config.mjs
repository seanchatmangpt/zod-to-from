import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Test file patterns
    include: [
      'test/**/*.test.mjs',
      'test/**/*.spec.mjs',
    ],
    
    // Test environment
    environment: 'node',
    
    // Test timeout
    testTimeout: 30_000,
    
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.mjs'],
      exclude: [
        'src/**/*.test.mjs',
        'src/**/*.spec.mjs',
        'test/**/*',
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },
    
    // Test organization
    testNamePattern: undefined,
    
    // Reporter configuration
    reporter: ['verbose'],
    
    // Output directory for test results
    outputFile: {
      json: './test-results/results.json',
    },
  },
});
