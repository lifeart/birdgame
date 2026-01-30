// Input validation and sanitization

/**
 * Sanitize user input to prevent XSS (defense in depth)
 * @param {string} str - Input string
 * @param {number} maxLength - Maximum allowed length
 * @returns {string} Sanitized string
 */
function sanitizeString(str, maxLength = 50) {
    if (!str || typeof str !== 'string') return '';

    return str
        .replace(/<[^>]*>/g, '')
        .replace(/[<>"'&]/g, char => {
            const entities = {
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;',
                '&': '&amp;'
            };
            return entities[char] || char;
        })
        .trim()
        .substring(0, maxLength);
}

module.exports = {
    sanitizeString
};
