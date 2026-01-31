// Test setup file for Vitest

import { vi, beforeEach, type Mock } from 'vitest';

// Mock localStorage for tests
interface LocalStorageMock {
    store: Record<string, string>;
    getItem: Mock<[key: string], string | null>;
    setItem: Mock<[key: string, value: string], void>;
    removeItem: Mock<[key: string], void>;
    clear: Mock<[], void>;
    readonly length: number;
    key: Mock<[index: number], string | null>;
}

const localStorageMock: LocalStorageMock = {
    store: {} as Record<string, string>,
    getItem: vi.fn((key: string): string | null => localStorageMock.store[key] || null),
    setItem: vi.fn((key: string, value: string): void => {
        localStorageMock.store[key] = value;
    }),
    removeItem: vi.fn((key: string): void => {
        delete localStorageMock.store[key];
    }),
    clear: vi.fn((): void => {
        localStorageMock.store = {};
    }),
    get length(): number {
        return Object.keys(localStorageMock.store).length;
    },
    key: vi.fn((index: number): string | null => {
        const keys = Object.keys(localStorageMock.store);
        return keys[index] || null;
    })
};

Object.defineProperty(globalThis, 'localStorage', {
    value: localStorageMock,
    writable: true
});

// Reset localStorage before each test
beforeEach(() => {
    localStorageMock.store = {};
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
    localStorageMock.clear.mockClear();
});

// Mock console.warn to prevent noise in tests
vi.spyOn(console, 'warn').mockImplementation(() => {});
