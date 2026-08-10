/**
 * WordSearch Creator - Text Import & Export Module
 * Handles file reading, parsing text lists, and downloading/sharing configurations.
 */

import { sanitizeWords } from './engine.js';

/**
 * Parses raw text content (from a file upload or text area paste) into a sanitized word array.
 * @param {string} rawText - Raw multi-line or comma-separated text
 * @returns {string[]} Sanitized array of words
 */
export function parseTextToList(rawText) {
    return sanitizeWords(rawText);
}

/**
 * Triggers a browser download for text files (.txt or .json).
 * @param {string} content - Data payload string
 * @param {string} filename - Default download filename
 * @param {string} mimeType - MIME type (e.g., 'text/plain', 'application/json')
 */
export function downloadFile(content, filename, mimeType = 'text/plain') {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    
    document.body.appendChild(link);
    link.click();
    
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * Reads a user-uploaded text or JSON file via an HTML file input event.
 * @param {File} file - The file object from an <input type="file"> element
 * @returns {Promise<string>} Resolves with the file's text content
 */
export function readUploadedFile(file) {
    return new Promise((resolve, reject) => {
        if (!file) {
            reject(new Error("No file provided."));
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => resolve(event.target.result);
        reader.onerror = (error) => reject(error);
        reader.readAsText(file);
    });
}