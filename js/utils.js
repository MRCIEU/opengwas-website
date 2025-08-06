export function parseUnicodeString(str) {
    return str.replace(/<U\+([0-9A-Fa-f]{4,6})>/g, function (match, group1) {
        const codePoint = parseInt(group1, 16);
        return String.fromCodePoint(codePoint);
    });
}
