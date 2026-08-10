/**
 * WordSearch Creator - Core Generator Engine
 * Handles word sanitization, grid sizing, placement algorithms, and matrix filling.
 */

// Available directions: [rowDelta, colDelta, name]
const DIRECTIONS = [
    [0, 1, 'RIGHT'],
    [0, -1, 'LEFT'],
    [1, 0, 'DOWN'],
    [-1, 0, 'UP'],
    [1, 1, 'DOWN_RIGHT'],
    [-1, -1, 'UP_LEFT'],
    [1, -1, 'DOWN_LEFT'],
    [-1, 1, 'UP_RIGHT']
];

/**
 * Sanitizes and prepares the raw word list.
 * Converts to uppercase, strips special characters/spaces, removes duplicates and empty strings.
 * @param {string[]|string} rawWords - Array of words or raw text input
 * @returns {string[]} Cleaned array of valid uppercase words
 */
export function sanitizeWords(rawWords) {
    let wordArray = Array.isArray(rawWords) 
        ? rawWords 
        : rawWords.split(/[\r\n,]+/).map(w => w.trim());

    const cleaned = wordArray
        .map(word => word.toUpperCase().replace(/[^A-Z]/g, ''))
        .filter(word => word.length > 0);

    // Remove duplicates
    return [...new Set(cleaned)];
}

/**
 * Automatically determines optimal puzzle grid dimensions.
 * @param {string[]} words - Cleaned array of words
 * @returns {object} { rows, cols }
 */
export function calculateGridSize(words) {
    if (!words || words.length === 0) return { rows: 10, cols: 10 };

    const maxWordLength = Math.max(...words.map(w => w.length));
    // Provide enough room for the longest word plus a safety buffer
    const baseSize = Math.max(maxWordLength + 2, 10);
    
    // Scale slightly if there are many words
    const scaleFactor = Math.min(Math.floor(words.length / 5), 4);
    const finalSize = baseSize + scaleFactor;

    return { rows: finalSize, cols: finalSize };
}

/**
 * Generates the word search puzzle grid and solution key.
 * @param {string[]} inputWords - List of words to place
 * @param {number} customRows - Optional custom grid size rows
 * @param {number} customCols - Optional custom grid size cols
 * @returns {object|null} Puzzle object containing grid, solution, and placed words
 */
export function generatePuzzle(inputWords, customRows = null, customCols = null) {
    const words = sanitizeWords(inputWords);
    if (words.length === 0) return null;

    // Sort words descending by length for better placement success rates
    words.sort((a, b) => b.length - a.length);

    const { rows, cols } = (customRows && customCols) 
        ? { rows: customRows, cols: customCols } 
        : calculateGridSize(words);

    // Initialize empty grid matrix (2D array filled with empty strings '')
    let grid = Array.from({ length: utilsPad(rows) }, () => Array(cols).fill(''));
    let placements = [];
    let unplacedWords = [];

    for (const word of words) {
        let placed = false;
        let attempts = 0;
        const maxAttempts = 150;

        while (!placed && attempts < maxAttempts) {
            attempts++;
            const direction = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
            const [dRow, dCol] = direction;

            // Random starting point
            const startRow = Math.floor(Math.random() * rows);
            const startCol = Math.floor(Math.random() * cols);

            if (canPlaceWord(grid, word, startRow, startCol, dRow, dCol, rows, cols)) {
                const coordinates = executePlacement(grid, word, startRow, startCol, dRow, dCol);
                placements.push({
                    word,
                    coordinates // Array of {r, c} for solution tracking
                });
                placed = true;
            }
        }

        if (!placed) {
            unplacedWords.push(word);
        }
    }

    // Create the solution key grid snapshot before filling empty spaces
    const solutionKeyGrid = grid.map(row => [...row]);

    // Fill remaining empty cells with random uppercase letters (A-Z)
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (grid[r][c] === '') {
                grid[r][c] = alphabet[Math.floor(Math.random() * alphabet.length)];
            }
        }
    }

    const CELL_THEMES = [
    'theme-pink',
    'theme-blue',
    'theme-yellow',
    'theme-mint',
    'theme-lavender',
    'theme-peach'
    ];

    // Example when creating puzzleData:
    const themeGrid = Array.from({ length: rows }, () => 
        Array.from({ length: cols }, () => CELL_THEMES[Math.floor(Math.random() * CELL_THEMES.length)])
    );

    return {
        rows,
        cols,
        grid,          // Fully filled puzzle grid for display/play
        solutionKeyGrid, // Clean grid tracking exact word paths
        placements,    // Successfully placed words and coordinate paths
        unplacedWords,   // Words that couldn't fit (if any)
        themeGrid
    };
}

/**
 * Helper to validate dimensions safely
 */
function utilsPad(val) {
    return Math.max(val, 5);
}

/**
 * Checks if a word can fit into the grid at the specified position and direction.
 */
function canPlaceWord(grid, word, startRow, startCol, dRow, dCol, rows, cols) {
    const len = word.length;
    const endRow = startRow + (len - 1) * dRow;
    const endCol = startCol + (len - 1) * dCol;

    // Check bounds
    if (endRow < 0 || endRow >= rows || endCol < 0 || endCol >= cols) {
        return false;
    }

    // Check letter collisions
    for (let i = 0; i < len; i++) {
        const currRow = startRow + i * dRow;
        const currCol = startCol + i * dCol;
        const existingLetter = grid[currRow][currCol];

        if (existingLetter !== '' && existingLetter !== word[i]) {
            return false; // Conflict with another word
        }
    }

    return true;
}

/**
 * Places the word onto the grid and records coordinates.
 */
function executePlacement(grid, word, startRow, startCol, dRow, dCol) {
    const coordinates = [];
    for (let i = 0; i < word.length; i++) {
        const currRow = startRow + i * dRow;
        const currCol = startCol + i * dCol;
        grid[currRow][currCol] = word[i];
        coordinates.push({ r: currRow, c: currCol });
    }
    return coordinates;
}