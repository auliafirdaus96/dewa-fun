/**
 * vitest.config.ts
 * Vitest Configuration for Dewa.fun Agent Backend
 * 
 * Provides optimal test configuration with:
 * - ES module support
 * - Path aliases
 * - Coverage reporting
 * - Test environment setup
 */

import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  // Test configuration
  test: {
    // Global test timeout (ms)
    testTimeout: 30000,
    
    // Include test files
    include: [
      'tests/**/*.test.ts',
      'src/**/*.test.ts'
    ],
    
    // Exclude patterns
    exclude: [
      'node_modules',
      'dist',
      '.next',
      '.turbo'
    ],
    
    // Test environment
    environment: 'node',
    
    // Setup files to run before tests
    setupFiles: [],
    
    // Global test variables (describe, it, expect, etc.)
    globals: true,
    
    // Single-threaded execution for blockchain tests
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'src/**/*.ts',
      ],
      exclude: [
        'src/**/*.d.ts',
        'src/**/index.ts',
        'tests/**',
        '**/*.test.ts',
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 70,
        statements: 70,
      },
    },
    
    // Reporter output
    reporters: ['default'],
    
    // Output file for test results
    outputFile: undefined,
    
    // Silent mode (set to true to suppress console.log in tests)
    silent: false,
    
    // Restore mocks between tests
    restoreMocks: true,
    
    // Clear mocks between tests
    clearMocks: true,
    
    // Mock timers
    fakeTimers: {
      toFake: undefined,
    },
  },
  
  // Resolve path aliases
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@core': path.resolve(__dirname, './src/core'),
      '@agents': path.resolve(__dirname, './src/agents'),
      '@services': path.resolve(__dirname, './src/services'),
      '@tools': path.resolve(__dirname, './src/tools'),
      '@middleware': path.resolve(__dirname, './src/middleware'),
      '@routes': path.resolve(__dirname, './src/routes'),
      '@listeners': path.resolve(__dirname, './src/listeners'),
      '@graphs': path.resolve(__dirname, './src/graphs'),
      '@state': path.resolve(__dirname, './src/state'),
      '@utils': path.resolve(__dirname, './src/utils'),
    },
  },
  
  // Optimize dependencies for testing
  optimizeDeps: {
    include: ['@meteora-ag/dlmm'],
    exclude: ['@coral-xyz/anchor'],
  },
});
