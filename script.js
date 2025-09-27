// --- Event Listener to start the script once the DOM is loaded ---
document.addEventListener('DOMContentLoaded', () => {
    // --- Main Application Logic ---
    let cube = new RubiksCube();
    const display = document.getElementById('cube-display');
    const stepsContainer = document.getElementById('solution-steps');

    // Make functions globally accessible for HTML onclick attributes
    window.performMove = (move) => {
        const moveFunc = cube.getMoveFunction(move);
        if (moveFunc) {
            moveFunc.call(cube);
            renderCube();
        }
    };

    window.scrambleCube = () => {
        const moves = ['U', 'D', 'L', 'R', 'F', 'B', 'U_prime', 'D_prime', 'L_prime', 'R_prime', 'F_prime', 'B_prime'];
        let scrambleSequence = [];
        for (let i = 0; i < 20; i++) {
            const randomMove = moves[Math.floor(Math.random() * moves.length)];
            scrambleSequence.push(randomMove);
        }
        cube.move(scrambleSequence.join(' '));
        renderCube();
        stepsContainer.innerHTML = 'Cube is scrambled. Ready to solve.';
    };

    window.solveCube = () => {
        const scrambledCubeState = cube.clone(); // Save the starting state
        const solver = new Solver(scrambledCubeState);
        const solutionMoves = solver.solve();

        stepsContainer.innerHTML = '';
        
        // Display initial state
        const initialStepElem = document.createElement('div');
        initialStepElem.className = 'step';
        initialStepElem.innerHTML = `<div class="step-info">Start:</div>` + getCubeSvg(scrambledCubeState.getStateString());
        stepsContainer.appendChild(initialStepElem);

        let tempCube = scrambledCubeState.clone();
        if (solutionMoves[0] === "Already solved!" || solutionMoves[0].startsWith("Solver timed out")) {
             const stepElem = document.createElement('div');
             stepElem.className = 'step';
             stepElem.innerHTML = `<div class="step-info" style="min-width: 100%;">${solutionMoves[0]}</div>`;
             stepsContainer.appendChild(stepElem);
        } else {
            solutionMoves.forEach((move, index) => {
                tempCube.move(move);
                const stepElem = document.createElement('div');
                stepElem.className = 'step';
                stepElem.innerHTML = `<div class="step-info">${index + 1}. ${move.replace('_prime', "'")}</div>` + getCubeSvg(tempCube.getStateString());
                stepsContainer.appendChild(stepElem);
            });
        }
        
        // Set the main cube instance to the solved state
        cube = tempCube;
        renderCube();
    };

    function renderCube() {
        display.innerHTML = getCubeSvg(cube.getStateString());
    }

    // Initial render
    renderCube();
});


// --- Helper function to generate SVG for the cube display ---
function getCubeSvg(colors) {
    const colorMap = {
        'w': '#FFFFFF', 'y': '#FFFF00', 'g': '#008000', 'b': '#0000FF',
        'r': '#FF0000', 'o': '#FFA500', 'k': '#333333'
    };
    const facePositions = {
        'U': {x: 105, y: 5},
        'L': {x: 5, y: 105},
        'F': {x: 105, y: 105},
        'R': {x: 205, y: 105},
        'B': {x: 305, y: 105},
        'D': {x: 105, y: 205}
    };
    const faceOrder = ['U', 'L', 'F', 'R', 'B', 'D'];
    let svg = `<svg width="410" height="310" viewBox="0 0 410 310" xmlns="http://www.w3.org/2000/svg">`;
    
    for (let i = 0; i < 6; i++) {
        const face = faceOrder[i];
        const faceColors = colors.substring(i * 9, (i + 1) * 9);
        const {x, y} = facePositions[face];
        
        for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 3; col++) {
                const color = colorMap[faceColors[row * 3 + col]] || '#000000';
                svg += `<rect x="${x + col * 30}" y="${y + row * 30}" width="28" height="28" fill="${color}" stroke="black" stroke-width="1"/>`;
            }
        }
    }
    svg += '</svg>';
    return svg;
}


// --- Object-oriented representation of the Rubik's Cube ---
class RubiksCube {
    constructor() {
        this.reset();
    }

    // Initialize the cube to its solved state
    reset() {
        this.faces = {
            'U': Array(9).fill('w'), 'L': Array(9).fill('o'),
            'F': Array(9).fill('g'), 'R': Array(9).fill('r'),
            'B': Array(9).fill('b'), 'D': Array(9).fill('y')
        };
    }

    // Get the cube state as a single string for the SVG function
    getStateString() {
        return ['U', 'L', 'F', 'R', 'B', 'D'].map(face => this.faces[face].join('')).join('');
    }
    
    // Helper function to clone the cube state
    clone() {
        const newCube = new RubiksCube();
        newCube.faces = JSON.parse(JSON.stringify(this.faces));
        return newCube;
    }

    // Rotate a face clockwise
    rotateFaceCW(face) {
        const f = this.faces[face];
        const temp = [...f];
        f[0] = temp[6]; f[1] = temp[3]; f[2] = temp[0];
        f[3] = temp[7]; f[4] = temp[4]; f[5] = temp[1];
        f[6] = temp[8]; f[7] = temp[5]; f[8] = temp[2];
    }

    // Execute a move sequence from a string (e.g., "R U R'")
    move(sequence) {
        const moves = sequence.split(' ');
        for (const move of moves) {
            const op = this.getMoveFunction(move);
            if (op) op.call(this);
        }
    }

    // Returns the appropriate move function based on string name
    getMoveFunction(move) {
        const moveMap = {
            'U': this.U, 'U_prime': this.U_prime,
            'D': this.D, 'D_prime': this.D_prime,
            'L': this.L, 'L_prime': this.L_prime,
            'R': this.R, 'R_prime': this.R_prime,
            'F': this.F, 'F_prime': this.F_prime,
            'B': this.B, 'B_prime': this.B_prime
        };
        return moveMap[move];
    }
    
    // --- Define all 12 basic moves ---
    
    U() {
        this.rotateFaceCW('U');
        const { F, R, B, L } = this.faces;
        const temp = [F[0], F[1], F[2]];
        [F[0], F[1], F[2]] = [R[0], R[1], R[2]];
        [R[0], R[1], R[2]] = [B[0], B[1], B[2]];
        [B[0], B[1], B[2]] = [L[0], L[1], L[2]];
        [L[0], L[1], L[2]] = temp;
    }
    U_prime() { this.U(); this.U(); this.U(); }

    D() {
        this.rotateFaceCW('D');
        const { F, R, B, L } = this.faces;
        const temp = [F[6], F[7], F[8]];
        [F[6], F[7], F[8]] = [L[6], L[7], L[8]];
        [L[6], L[7], L[8]] = [B[6], B[7], B[8]];
        [B[6], B[7], B[8]] = [R[6], R[7], R[8]];
        [R[6], R[7], R[8]] = temp;
    }
    D_prime() { this.D(); this.D(); this.D(); }

    L() {
        this.rotateFaceCW('L');
        const { U, F, D, B } = this.faces;
        const temp = [U[0], U[3], U[6]];
        [U[0], U[3], U[6]] = [B[8], B[5], B[2]];
        [B[8], B[5], B[2]] = [D[0], D[3], D[6]];
        [D[0], D[3], D[6]] = [F[0], F[3], F[6]];
        [F[0], F[3], F[6]] = temp;
    }
    L_prime() { this.L(); this.L(); this.L(); }

    R() {
        this.rotateFaceCW('R');
        const { U, F, D, B } = this.faces;
        const temp = [U[2], U[5], U[8]];
        [U[2], U[5], U[8]] = [F[2], F[5], F[8]];
        [F[2], F[5], F[8]] = [D[2], D[5], D[8]];
        [D[2], D[5], D[8]] = [B[6], B[3], B[0]];
        [B[6], B[3], B[0]] = temp;
    }
    R_prime() { this.R(); this.R(); this.R(); }

    F() {
        this.rotateFaceCW('F');
        const { U, L, D, R } = this.faces;
        const temp = [U[6], U[7], U[8]];
        [U[6], U[7], U[8]] = [L[8], L[5], L[2]];
        [L[8], L[5], L[2]] = [D[2], D[1], D[0]];
        [D[2], D[1], D[0]] = [R[0], R[3], R[6]];
        [R[0], R[3], R[6]] = temp;
    }
    F_prime() { this.F(); this.F(); this.F(); }

    B() {
        this.rotateFaceCW('B');
        const { U, L, D, R } = this.faces;
        const temp = [U[0], U[1], U[2]];
        [U[0], U[1], U[2]] = [R[2], R[5], R[8]];
        [R[2], R[5], R[8]] = [D[8], D[7], D[6]];
        [D[8], D[7], D[6]] = [L[6], L[3], L[0]];
        [L[6], L[3], L[0]] = temp;
    }
    B_prime() { this.B(); this.B(); this.B(); }
}


// --- The Solver algorithm ---
class Solver {
    constructor(cube) {
        this.cube = cube;
        this.solution = [];
    }

    // A basic layer-by-layer solver
    solve() {
        this.solution = []; // Reset solution
        
        // --- Breadth-First Search (BFS) Solver ---
        const startState = this.cube.getStateString();
        const solvedState = new RubiksCube().getStateString();

        if (startState === solvedState) {
            return ["Already solved!"];
        }

        const queue = [{ cube: this.cube.clone(), path: [] }];
        const visited = new Set([startState]);
        const moves = ['U', 'D', 'L', 'R', 'F', 'B', 'U_prime', 'D_prime', 'L_prime', 'R_prime', 'F_prime', 'B_prime'];

        while (queue.length > 0) {
            const { cube, path } = queue.shift();

            // Limit search depth for performance. Increase for harder scrambles, but it will be much slower.
            if (path.length > 7) continue; 

            for (const move of moves) {
                const nextCube = cube.clone();
                nextCube.move(move);
                const nextState = nextCube.getStateString();
                
                if (nextState === solvedState) {
                    this.solution = [...path, move];
                    return this.solution;
                }

                if (!visited.has(nextState)) {
                    visited.add(nextState);
                    queue.push({ cube: nextCube, path: [...path, move] });
                }
            }
        }
        
        return ["Solver timed out (search depth exceeded). Try a simpler scramble."];
    }
}
