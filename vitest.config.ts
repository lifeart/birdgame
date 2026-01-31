import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        environment: 'jsdom',
        include: ['tests/unit/**/*.test.ts', 'tests/unit/**/*.test.js'],
        exclude: ['node_modules', 'dist'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            include: ['public/js/**/*.ts', 'server/**/*.js', 'shared/**/*.js'],
            exclude: ['**/*.d.ts', '**/types.ts']
        },
        setupFiles: ['tests/setup.ts']
    },
    resolve: {
        alias: {
            '@': '/public/js',
            '@server': '/server',
            '@shared': '/shared'
        }
    }
});
