/**
 * WordSearch Creator - State Storage Module
 * Manages saving, loading, and listing saved puzzle projects using localStorage.
 */
const STORAGE_PREFIX = 'wordsearch_project_';

/**
 * Saves a complete puzzle project state to localStorage.
 * @param {string} title - Puzzle title/name
 * @param {string[]} words - List of words included
 * @param {object} puzzleData - The output generated from generatePuzzle()
 * @returns {string} The unique storage key used
 */
export function savePuzzleProject(title, words, puzzleData) {
    const timestamp = new Date().toISOString();
    const safeTitle = (title && title.trim() !== '') ? title.trim() : `Untitled Puzzle - ${timestamp.slice(0, 10)}`;
    const projectId = STORAGE_PREFIX + Date.now();

    const projectData = {
        id: projectId,
        title: safeTitle,
        createdAt: timestamp,
        words,
        puzzleData
    };
    localStorage.setItem(projectId, JSON.stringify(projectData));
    return projectId;
}

/**
 * Loads a specific puzzle project by its storage key.
 * @param {string} projectId - Storage key
 * @returns {object|null} Project object or null if not found
 */
export function loadPuzzleProject(projectId) {
    const data = localStorage.getItem(projectId);
    if (!data) return null;
    try {
        return JSON.parse(data);
    } catch (e) {
        console.error("Failed to parse saved puzzle project:", e);
        return null;
    }
}

/**
 * Retrieves a summary list of all saved puzzle projects.
 * @returns {object[]} Array of project metadata { id, title, createdAt }
 */
export function listSavedProjects() {
    const projects = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(STORAGE_PREFIX)) {
            const project = loadPuzzleProject(key);
            if (project) {
                projects.push({
                    id: project.id,
                    title: project.title,
                    createdAt: project.createdAt
                });
            }
        }
    }
    // Sort descending by creation date (newest first)
    return projects.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

/**
 * Deletes a saved puzzle project from localStorage.
 * @param {string} projectId - Storage key
 */
export function deleteSavedProject(projectId) {
    localStorage.removeItem(projectId);
}

/**
 * Exports a locally stored puzzle project to a JSON file via file picker or download fallback.
 * @param {string} projectId - The ID of the saved project to export.
 */
export async function exportProject(projectId) {
    const project = loadPuzzleProject(projectId);
    
    if (!project) {
        console.error(`Export failed: Project with ID "${projectId}" not found.`);
        alert("Could not load project for export.");
        return;
    }

    try {
        const safeTitle = (project.title || 'word-search-puzzle').replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const jsonString = JSON.stringify(project, null, 4);

        if ('showSaveFilePicker' in window) {
            const handle = await window.showSaveFilePicker({
                suggestedName: `${safeTitle}.json`,
                types: [{
                    description: 'JSON Puzzle Files',
                    accept: { 'application/json': ['.json'] }
                }]
            });
            const writable = await handle.createWritable();
            await writable.write(jsonString);
            await writable.close();
        } else {
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${safeTitle}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
    } catch (err) {
        if (err.name !== 'AbortError') {
            console.error('Error exporting puzzle project:', err);
            alert('Failed to export puzzle file.');
        }
    }
}

/**
 * Opens a file picker to import a JSON puzzle file, parses its contents,
 * and saves it into local storage.
 * @returns {Object|null} The imported project data, or null if cancelled/failed.
 */
export async function importProject() {
    try {
        let puzzleData = null;

        if ('showOpenFilePicker' in window) {
            const [fileHandle] = await window.showOpenFilePicker({
                types: [{
                    description: 'JSON Puzzle Files',
                    accept: { 'application/json': ['.json'] }
                }],
                multiple: false
            });
            const file = await fileHandle.getFile();
            const text = await file.text();
            puzzleData = JSON.parse(text);
        } else {
            puzzleData = await new Promise((resolve, reject) => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.json';
                input.onchange = e => {
                    const file = e.target.files[0];
                    if (!file) return resolve(null);
                    const reader = new FileReader();
                    reader.onload = event => {
                        try {
                            resolve(JSON.parse(event.target.result));
                        } catch (err) {
                            reject(new Error('Invalid JSON file format.'));
                        }
                    };
                    reader.readAsText(file);
                };
                input.click();
            });
        }

        if (puzzleData) {
            // Handle optional wrapper structures if present
            const targetData = puzzleData.dataProject || puzzleData;
            
            if (!targetData.title || !targetData.words || !targetData.puzzleData) {
                throw new Error('The selected file is missing required puzzle data properties.');
            }

            // Save to local storage using the existing storage function
            const newId = savePuzzleProject(targetData.title, targetData.words, targetData.puzzleData);
            console.log(`Successfully imported and saved project with ID: ${newId}`);
            
            return { id: newId, ...targetData };
        }
        return null;
    } catch (err) {
        if (err.name !== 'AbortError') {
            console.error('Error importing puzzle file:', err);
            alert(`Import failed: ${err.message}`);
        }
        return null;
    }
}