import { describe, it, expect } from 'vitest';

// Import the validation module (CommonJS)
const { sanitizeString } = require('../../server/validation');

describe('validation', () => {
    describe('sanitizeString', () => {
        it('returns empty string for null input', () => {
            expect(sanitizeString(null)).toBe('');
        });

        it('returns empty string for undefined input', () => {
            expect(sanitizeString(undefined)).toBe('');
        });

        it('returns empty string for non-string input', () => {
            expect(sanitizeString(123)).toBe('');
            expect(sanitizeString({})).toBe('');
            expect(sanitizeString([])).toBe('');
        });

        it('trims whitespace', () => {
            expect(sanitizeString('  hello  ')).toBe('hello');
        });

        it('strips HTML tags', () => {
            expect(sanitizeString('<script>alert("xss")</script>')).toBe('alert(&quot;xss&quot;)');
            expect(sanitizeString('<b>bold</b>')).toBe('bold');
        });

        it('escapes dangerous characters', () => {
            expect(sanitizeString('<')).toBe('&lt;');
            expect(sanitizeString('>')).toBe('&gt;');
            expect(sanitizeString('"')).toBe('&quot;');
            expect(sanitizeString("'")).toBe('&#39;');
            expect(sanitizeString('&')).toBe('&amp;');
        });

        it('truncates to maxLength', () => {
            const longString = 'a'.repeat(100);
            expect(sanitizeString(longString, 10).length).toBe(10);
        });

        it('uses default maxLength of 50', () => {
            const longString = 'a'.repeat(100);
            expect(sanitizeString(longString).length).toBe(50);
        });

        it('handles normal text correctly', () => {
            expect(sanitizeString('Hello World')).toBe('Hello World');
            expect(sanitizeString('Player123')).toBe('Player123');
        });

        it('handles mixed content', () => {
            const input = '  <b>Hello</b> "World" & \'Friends\'  ';
            const result = sanitizeString(input);
            expect(result).not.toContain('<');
            expect(result).not.toContain('>');
            expect(result).not.toContain('"');
            expect(result).not.toContain("'");
            expect(result).toContain('Hello');
            expect(result).toContain('World');
        });

        it('handles unicode characters', () => {
            expect(sanitizeString('Привет 🐦')).toBe('Привет 🐦');
        });

        it('handles empty string', () => {
            expect(sanitizeString('')).toBe('');
        });

        it('handles whitespace-only string', () => {
            expect(sanitizeString('   ')).toBe('');
        });
    });
});
