/**
 * Nikki's Word Search Creator - User Interface Manager
 * Handles DOM rendering, grid display, word banks, and event bindings.
 */

import { generatePuzzle } from './engine.js';
import { parseTextToList, downloadFile } from './io.js';
import { savePuzzleProject, listSavedProjects, 
        exportProject, importProject,
        loadPuzzleProject, deleteSavedProject } from './storage.js';

let currentPuzzleState = null;
let showSolutionKey = false;

// --- PLAYABLE GRID SELECTION STATE ---
let isSelecting = false;
let selectionStartCell = null;
let selectedCellsCache = [];
let foundWords = new Set(); // Tracks successfully found words

/**
 * Sets up the fireworks animation for victory celebrations.
 */
import { Fireworks } from 'fireworks-js';

// Grab the container from the DOM
const container = document.getElementById('fireworks-container');

// Initialize the fireworks instance
const fireworks = new Fireworks(container, {
  autoresize: true,
  opacity: 0.5,
  acceleration: 1.05,
  friction: 0.97,
  gravity: 1.5,
  particles: 50,
  trace: 3,
  explosion: 5,
  sound: {
    enabled: false
  }
});

// Export or call this function when all words are found
export function triggerVictoryFireworks() {
    fireworks.start();

  // Automatically stop the animation after 4 seconds
  setTimeout(() => {
    fireworks.stop();
  }, 4000);
}

export function showVictoryModal() {
  const modal = document.getElementById('victory-modal');
  if (modal) {
    modal.classList.add('visible');
  }
}

/**
 * Initializes the UI event listeners and default layout.
 */
export function initUI() {
    const generateBtn = document.getElementById('generate-btn');
    const saveBtn = document.getElementById('save-btn');
    const exportTextBtn = document.getElementById('export-text-btn');
    const toggleSolutionBtn = document.getElementById('toggle-solution-btn');
    const wordInput = document.getElementById('word-input');
    const loadProjectsBtn = document.getElementById('load-projects-btn');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const modalOverlay = document.getElementById('projects-modal');
    const printBtn = document.getElementById('print-btn');

    if (printBtn) {
        printBtn.addEventListener('click', () => {
            window.print();
        });
    }

    if (loadProjectsBtn) {
        loadProjectsBtn.addEventListener('click', () => {
            openProjectsModal();
        });
    }

    if (closeModalBtn && modalOverlay) {
        closeModalBtn.addEventListener('click', () => {
            modalOverlay.style.display = 'none';
        });
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) {
                modalOverlay.style.display = 'none';
            }
        });
    }

    // Default sample words to get started immediately
    if (wordInput && !wordInput.value.trim()) {
        wordInput.value = "KITTENS\nPURPLE\nHEART\nDOLLIES\nBEARS\nSTICKS\nPONYTAIL\nDISNEY\nCARTOONS\nDANCING";
    }

    if (generateBtn) {
        generateBtn.addEventListener('click', handleGeneratePuzzle);
    }

    if (saveBtn) {
        saveBtn.addEventListener('click', handleSavePuzzle);
    }

    if (exportTextBtn) {
        exportTextBtn.addEventListener('click', handleExportWords);
    }

    if (toggleSolutionBtn) {
        toggleSolutionBtn.addEventListener('click', handleToggleSolution);
    }

    // Global mouseup listener to finalize selection even if released outside the grid container
    document.addEventListener('mouseup', handleSelectionEnd);
    document.addEventListener('touchend', handleSelectionEnd);

    // Auto-generate initial puzzle on load
    handleGeneratePuzzle();
}

/**
 * Generates a puzzle based on user input fields and renders it.
 */
function handleGeneratePuzzle() {
    const wordInput = document.getElementById('word-input');
    const titleInput = document.getElementById('puzzle-title');
    
    if (!wordInput) return;

    const rawText = wordInput.value;
    const words = parseTextToList(rawText);

    if (words.length === 0) {
        alert("Please enter at least one valid word.");
        return;
    }

    const puzzleData = generatePuzzle(words);
    if (!puzzleData) {
        alert("Could not generate puzzle with the provided words. Try adding more words or increasing grid size.");
        return;
    }

    currentPuzzleState = {
        title: titleInput ? titleInput.value : "Niki's Word Search",
        words,
        puzzleData
    };

    showSolutionKey = false;
    foundWords.clear(); // Reset found words on new puzzle generation
    renderPuzzle(currentPuzzleState);
}

/**
 * Renders the puzzle grid and word bank to the DOM.
 */
function renderPuzzle(state) {
    const gridContainer = document.getElementById('puzzle-grid');
    const wordListContainer = document.getElementById('word-list');
    const puzzleTitleDisplay = document.getElementById('puzzle-title-display');

    if (!gridContainer || !wordListContainer) return;

    // Set Title
    if (puzzleTitleDisplay) {
        puzzleTitleDisplay.textContent = state.title;
        puzzleTitleDisplay.classList.add('grid-title');
    }

    // Determine which grid matrix to use (unsolved random fill vs solution key path)
    const gridToDisplay = showSolutionKey 
        ? state.puzzleData.solutionKeyGrid 
        : state.puzzleData.grid;

    const rows = state.puzzleData.rows;
    const cols = state.puzzleData.cols;

    // Build Grid HTML
    gridContainer.style.gridTemplateColumns = `repeat(${cols}, minmax(30px, 1fr))`;
    gridContainer.innerHTML = '';

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const cell = document.createElement('div');
            
            // 1. Assign base grid-cell class
            cell.className = 'grid-cell';
            
            // 2. Use the persistent theme stored in state instead of Math.random()
            const persistentTheme = state.puzzleData.themeGrid && state.puzzleData.themeGrid[r] && state.puzzleData.themeGrid[r][c] 
                ? state.puzzleData.themeGrid[r][c] 
                : CELL_THEMES[0] // Fallback safety
            cell.classList.add(persistentTheme);

            cell.textContent = gridToDisplay[r][c];
            
            // Store coordinates dataset attributes for selection tracking
            cell.dataset.row = r;
            cell.dataset.col = c;

            // --- Interactive Play Listeners ---
            cell.addEventListener('mousedown', (e) => handleSelectionStart(e, r, c));
            cell.addEventListener('mouseenter', () => handleSelectionOver(r, c));
            cell.addEventListener('touchstart', (e) => {
                e.preventDefault();
                handleSelectionStart(e, r, c);
            }, { passive: false });
            cell.addEventListener('touchmove', (e) => {
                e.preventDefault();
                const touch = e.touches[0];
                const target = document.elementFromPoint(touch.clientX, touch.clientY);
                if (target && target.classList.contains('grid-cell')) {
                    handleSelectionOver(parseInt(target.dataset.row), parseInt(target.dataset.col));
                }
            }, { passive: false });

            // Highlight solution cells if solution mode is active
            if (showSolutionKey) {
                const isPartOfWord = state.puzzleData.placements.some(p => 
                    p.coordinates.some(coord => coord.r === r && coord.c === c)
                );
                if (isPartOfWord) {
                    cell.classList.add('solution-highlight');
                }
            }

            // Keep found words highlighted on grid if already discovered
            if (!showSolutionKey) {
                const isFoundCell = Array.from(foundWords).some(word => {
                    const placement = state.puzzleData.placements.find(p => p.word === word);
                    return placement && placement.coordinates.some(coord => coord.r === r && coord.c === c);
                });
                if (isFoundCell) {
                    cell.classList.add('found');
                }
            }

            gridContainer.appendChild(cell);
        }
    }

    // Build Word Bank HTML
    wordListContainer.innerHTML = '';
    state.words.forEach(word => {
        const li = document.createElement('li');
        li.textContent = word;
        li.className = 'word-item'; // Ensure class name is present for strike-through styling
        
        // Check if word was successfully placed
        const isPlaced = state.puzzleData.placements.some(p => p.word === word);
        if (!isPlaced) {
            li.classList.add('unplaced-word');
            li.title = "Could not fit into grid";
        } else if (foundWords.has(word)) {
            li.classList.add('found-word'); // Strike-through styling when found
        }
        
        wordListContainer.appendChild(li);
    });
}



/**
 * Interactive play selection logic for the grid.
 * Users can click/touch and drag to select words.
 */

// Preload the audio files
const popSound = new Audio('./pop.mp3');
const yaySound = new Audio('./yay.mp3');

function onWordFound() {
  // Reset audio to the beginning in case it's played rapidly in succession
  popSound.currentTime = 0;
  popSound.play().catch(error => {
  });
}

function onWordVictory() {
  // Reset audio to the beginning in case it's played rapidly in succession
  triggerVictoryFireworks(); // Trigger fireworks on victory
  yaySound.currentTime = 0;
  yaySound.play().catch(error => {
  });
  // 2. Show the modal
  const modal = document.getElementById('victory-modal');
  if (modal) {
    modal.classList.add('visible');

    // 3. Automatically hide the modal after 4 seconds (4000 milliseconds)
    setTimeout(() => {
      modal.classList.remove('visible');
    }, 2000); 
  }
}

function handleSelectionStart(e, r, c) {
    if (showSolutionKey || !currentPuzzleState) return;
    isSelecting = true;
    selectionStartCell = { r, c };
    selectedCellsCache = [{ r, c }];
    updateVisualSelection();
}

function handleSelectionOver(r, c) {
    if (!isSelecting || !selectionStartCell) return;
    
    // Calculate straight-line trajectory (horizontal, vertical, or diagonal)
    const dr = r - selectionStartCell.r;
    const dc = c - selectionStartCell.c;
    
    const steps = Math.max(Math.abs(dr), Math.abs(dc));
    if (steps === 0) {
        selectedCellsCache = [selectionStartCell];
        updateVisualSelection();
        return;
    }

    const stepR = dr === 0 ? 0 : dr / steps;
    const stepC = dc === 0 ? 0 : dc / steps;

    // Validate that selection is strictly straight (horizontal, vertical, or 45-deg diagonal)
    if (Math.abs(stepR) !== 1 && stepR !== 0) return;
    if (Math.abs(stepC) !== 1 && stepC !== 0) return;

    const newCache = [];
    for (let i = 0; i <= steps; i++) {
        newCache.push({
            r: Math.round(selectionStartCell.r + (i * stepR)),
            c: Math.round(selectionStartCell.c + (i * stepC))
        });
    }
    selectedCellsCache = newCache;
    updateVisualSelection();
}

function handleSelectionEnd() {
    if (!isSelecting || !currentPuzzleState) return;
    isSelecting = false;

    // Find a placement whose coordinates match our selected cells cache exactly (forward or reverse)
    const matchedPlacement = currentPuzzleState.puzzleData.placements.find(p => {
        if (p.coordinates.length !== selectedCellsCache.length) return false;

        const matchesForward = p.coordinates.every((coord, idx) => 
            coord.r === selectedCellsCache[idx].r && coord.c === selectedCellsCache[idx].c
        );

        const matchesReverse = p.coordinates.every((coord, idx) => {
            const revIdx = p.coordinates.length - 1 - idx;
            return coord.r === selectedCellsCache[revIdx].r && coord.c === selectedCellsCache[revIdx].c;
        });

        return matchesForward || matchesReverse;
    });

    if (matchedPlacement && !foundWords.has(matchedPlacement.word)) {
        foundWords.add(matchedPlacement.word);
        
        updateVisualSelection(); // Highlight found word on grid
        onWordFound(); // Play pop sound effect

        // Check for complete victory
        const validPlacedWords = currentPuzzleState.puzzleData.placements.map(p => p.word);
        const allFound = validPlacedWords.every(w => foundWords.has(w));
        if (allFound) {
            triggerVictoryFireworks(); // Trigger victory
            showVictoryModal();
            onWordVictory(); // Play victory sound effect
        }
    }

    selectionStartCell = null;
    selectedCellsCache = [];
    renderPuzzle(currentPuzzleState);
}

function updateVisualSelection() {
    const gridContainer = document.getElementById('puzzle-grid');
    if (!gridContainer) return;

    const cells = gridContainer.querySelectorAll('.grid-cell');
    cells.forEach(cell => {
        const r = parseInt(cell.dataset.row);
        const c = parseInt(cell.dataset.col);
        const isSelected = selectedCellsCache.some(coord => coord.r === r && coord.c === c);
        
        if (isSelected) {
            cell.classList.add('selected');
        } else {
            cell.classList.remove('selected');
        }
    });
}

/**
 * Toggles solution overlay view.
 */
function handleToggleSolution() {
    if (!currentPuzzleState) return;
    showSolutionKey = !showSolutionKey;
    renderPuzzle(currentPuzzleState);
}

/**
 * Saves current puzzle state using storage module.
 */
function handleSavePuzzle() {
    if (!currentPuzzleState) return;
    const key = savePuzzleProject(currentPuzzleState.title, currentPuzzleState.words, currentPuzzleState.puzzleData);
    alert(`Puzzle successfully saved to browser storage! (ID: ${key})`);
}

/**
 * Exports active word list as text file.
 */
function handleExportWords() {
    const wordInput = document.getElementById('word-input');
    if (!wordInput) return;
    downloadFile(wordInput.value, 'wordsearch-words.txt', 'text/plain');
}

/**
 * Opens the saved projects modal and populates the list.
 */
function openProjectsModal() {
    const modalOverlay = document.getElementById('projects-modal');
    const listContainer = document.getElementById('saved-projects-list');
    if (!modalOverlay || !listContainer) return;

    // 1. Populate the saved projects list (no longer overwriting the import button)
    const projects = listSavedProjects();
    listContainer.innerHTML = '';

    if (projects.length === 0) {
        listContainer.innerHTML = '<li style="text-align: center; color: #64748b; padding: 1rem;">No saved puzzle projects found.</li>';
    } else {
        projects.forEach(proj => {
            const li = document.createElement('li');
            li.className = 'project-item';
            
            const dateStr = new Date(proj.createdAt).toLocaleDateString(undefined, {
                year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
            });

            li.innerHTML = `
                <div class="project-info">
                    <h4>${proj.title}</h4>
                    <span>Saved: ${dateStr}</span>
                </div>
                <div class="project-actions">
                    <button class="btn-sm btn-export" data-id="${proj.id}">Export</button>
                    <button class="btn-sm btn-load" data-id="${proj.id}">Load</button>
                    <button class="btn-sm btn-delete" data-id="${proj.id}">Delete</button>
                </div>
            `;
            listContainer.appendChild(li);
        });

        // Bind export button clicks
        listContainer.querySelectorAll('.btn-export').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.getAttribute('data-id');
                exportProject(id);
            });
        });

        // Bind load button clicks
        listContainer.querySelectorAll('.btn-load').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.getAttribute('data-id');
                loadAndDisplayProject(id);
                modalOverlay.style.display = 'none';
            });
        });

        // Bind delete button clicks
        listContainer.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.getAttribute('data-id');
                if (confirm("Are you sure you want to delete this saved puzzle?")) {
                    deleteSavedProject(id);
                    openProjectsModal(); // Refresh modal list
                }
            });
        });
    }

    // 2. Bind the permanent Import button (outside the dynamic list loop)
    const importBtn = document.getElementById('modal-import-btn');
    if (importBtn) {
        // Clone to prevent stacking event listeners on repeated modal opens
        const newImportBtn = importBtn.cloneNode(true);
        importBtn.parentNode.replaceChild(newImportBtn, importBtn);

        newImportBtn.addEventListener('click', async () => {
            const imported = await importProject();
            if (imported) {
                openProjectsModal(); // Refresh list to show the newly imported project
                alert(`Successfully imported "${imported.title}"!`);
            }
        });
    }

    modalOverlay.style.display = 'flex';
}

/**
 * Loads a project by ID and populates the UI inputs and puzzle view.
 */
function loadAndDisplayProject(projectId) {
    const project = loadPuzzleProject(projectId);
    if (!project) {
        alert("Could not load project.");
        return;
    }

    const titleInput = document.getElementById('puzzle-title');
    const wordInput = document.getElementById('word-input');

    if (titleInput) titleInput.value = project.title;
    if (wordInput) wordInput.value = project.words.join('\n');

    currentPuzzleState = {
        title: project.title,
        words: project.words,
        puzzleData: project.puzzleData
    };

    showSolutionKey = false;
    foundWords.clear();
    renderPuzzle(currentPuzzleState);
}