import React, { useState, useEffect, useRef, useCallback } from 'react';

// Main App component
const App = () => {
    // State variables for algorithm selection, coordinates, animation, and UI feedback
    const [currentAlgorithm, setCurrentAlgorithm] = useState('dda');
    const [coords, setCoords] = useState({ x0: 50, y0: 50, x1: 200, y1: 150, cx: 250, cy: 250, radius: 100 });
    const [animationDelay, setAnimationDelay] = useState(50);
    const [pixelData, setPixelData] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isAnimating, setIsAnimating] = useState(false);
    const [currentPixelInfo, setCurrentPixelInfo] = useState({ x: '--', y: '--', info: 'N/A' });
    const [message, setMessage] = useState('');
    const [showMessage, setShowMessage] = useState(false);
    const [darkMode, setDarkMode] = useState(true); // Default to dark mode

    // Ref for the main graphics canvas element
    const graphicsCanvasRef = useRef(null);
    // Ref for the background animation canvas element
    const backgroundCanvasRef = useRef(null);

    // Refs for animation frame IDs and timeout IDs for cleanup
    const graphicsAnimationFrameIdRef = useRef(null);
    const graphicsTimeoutIdRef = useRef(null);
    const backgroundAnimationFrameIdRef = useRef(null);

    // Function to show a custom message/alert
    const showCustomMessage = (msg) => {
        setMessage(msg);
        setShowMessage(true);
        // Automatically hide the message after 3 seconds
        setTimeout(() => setShowMessage(false), 3000);
    };

    // --- Canvas Setup and Utility Functions for Graphics Canvas ---

    /**
     * Draws a single pixel on the graphics canvas.
     * @param {CanvasRenderingContext2D} ctx - The 2D rendering context of the canvas.
     * @param {number} x - X coordinate of the pixel.
     * @param {number} y - Y coordinate of the pixel.
     * @param {string} color - Color of the pixel (default: black).
     * @param {number} size - Size of the pixel (default: 2).
     */
    const drawPixel = useCallback((ctx, x, y, color, size = 2) => {
        // Determine default color based on dark mode if not explicitly provided
        const finalColor = color || (darkMode ? '#cbd5e1' : 'black'); // Default pixel color for dark/light mode
        ctx.fillStyle = finalColor;
        ctx.fillRect(x, y, size, size);
    }, [darkMode]); // Depend on darkMode to update default color

    /**
     * Clears the entire graphics canvas and resets animation state.
     * @param {boolean} resetAll - If true, also resets input values and algorithm selection.
     */
    const clearGraphicsCanvas = useCallback((resetAll = false) => {
        const canvas = graphicsCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setPixelData([]);
        setCurrentIndex(0);
        setIsAnimating(false);
        setCurrentPixelInfo({ x: '--', y: '--', info: 'N/A' });

        // Cancel any ongoing graphics animation frame or timeout
        if (graphicsAnimationFrameIdRef.current) {
            cancelAnimationFrame(graphicsAnimationFrameIdRef.current);
            graphicsAnimationFrameIdRef.current = null;
        }
        if (graphicsTimeoutIdRef.current) {
            clearTimeout(graphicsTimeoutIdRef.current);
            graphicsTimeoutIdRef.current = null;
        }

        if (resetAll) {
            setCoords({ x0: 50, y0: 50, x1: 200, y1: 150, cx: 250, cy: 250, radius: 100 });
            setCurrentAlgorithm('dda');
            setAnimationDelay(50);
        }
    }, [drawPixel]);

    /**
     * Adjusts graphics canvas dimensions for high DPI screens and responsiveness.
     */
    const resizeGraphicsCanvas = useCallback(() => {
        const canvas = graphicsCanvasRef.current;
        if (!canvas) return;
        const displayWidth = canvas.clientWidth;
        const displayHeight = canvas.clientHeight;

        if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
            canvas.width = displayWidth;
            canvas.height = displayHeight;
            clearGraphicsCanvas(); // Clear and redraw if resized
        }
    }, [clearGraphicsCanvas]);

    // Effect for initial graphics canvas setup and resize listener
    useEffect(() => {
        resizeGraphicsCanvas();
        window.addEventListener('resize', resizeGraphicsCanvas);
        return () => {
            window.removeEventListener('resize', resizeGraphicsCanvas);
            // Cleanup on unmount
            if (graphicsAnimationFrameIdRef.current) {
                cancelAnimationFrame(graphicsAnimationFrameIdRef.current);
            }
            if (graphicsTimeoutIdRef.current) {
                clearTimeout(graphicsTimeoutIdRef.current);
            }
        };
    }, [resizeGraphicsCanvas]);

    // --- Algorithm Implementations (Scan Conversion) ---

    /**
     * DDA Line Algorithm.
     * @param {number} x0 - Start X coordinate.
     * @param {number} y0 - Start Y coordinate.
     * @param {number} x1 - End X coordinate.
     * @param {number} y1 - End Y coordinate.
     * @returns {Array} - Array of pixel data.
     */
    const ddaLine = useCallback((x0, y0, x1, y1) => {
        const pixels = [];
        let dx = x1 - x0;
        let dy = y1 - y0;
        let steps;

        if (Math.abs(dx) > Math.abs(dy)) {
            steps = Math.abs(dx);
        } else {
            steps = Math.abs(dy);
        }

        let xIncrement = dx / steps;
        let yIncrement = dy / steps;

        let x = x0;
        let y = y0;

        for (let i = 0; i <= steps; i++) {
            pixels.push({
                x: Math.round(x),
                y: Math.round(y),
                info: `Step ${i}: x=${x.toFixed(2)}, y=${y.toFixed(2)}`
            });
            x += xIncrement;
            y += yIncrement;
        }
        return pixels;
    }, []);

    /**
     * Bresenham's Line Algorithm.
     * @param {number} x0 - Start X coordinate.
     * @param {number} y0 - Start Y coordinate.
     * @param {number} x1 - End X coordinate.
     * @param {number} y1 - End Y coordinate.
     * @returns {Array} - Array of pixel data.
     */
    const bresenhamLine = useCallback((x0, y0, x1, y1) => {
        const pixels = [];
        let dx = Math.abs(x1 - x0);
        let dy = Math.abs(y1 - y0);
        let sx = (x0 < x1) ? 1 : -1;
        let sy = (y0 < y1) ? 1 : -1;
        let err = dx - dy;

        let x = x0;
        let y = y0;
        let i = 0;

        while (true) {
            pixels.push({
                x: x,
                y: y,
                info: `Step ${i}: Pixel(${x}, ${y}), Error=${err}`
            });

            if (x === x1 && y === y1) break;

            let e2 = 2 * err;
            if (e2 > -dy) {
                err -= dy;
                x += sx;
            }
            if (e2 < dx) {
                err += dx;
                y += sy;
            }
            i++;
        }
        return pixels;
    }, []);

    /**
     * Midpoint Circle Algorithm.
     * @param {number} cx - Center X coordinate.
     * @param {number} cy - Center Y coordinate.
     * @param {number} r - Radius of the circle.
     * @returns {Array} - Array of pixel data.
     */
    const midpointCircle = useCallback((cx, cy, r) => {
        const pixels = [];
        let x = 0;
        let y = r;
        let p = 1 - r; // Initial decision parameter

        // Helper to draw all 8 octants
        const drawCirclePoints = (px, py, info) => {
            pixels.push({ x: cx + px, y: cy + py, info: info });
            pixels.push({ x: cx + py, y: cy + px, info: info });
            pixels.push({ x: cx - px, y: cy + py, info: info });
            pixels.push({ x: cx - py, y: cy + px, info: info });
            pixels.push({ x: cx - px, y: cy - py, info: info });
            pixels.push({ x: cx - py, y: cy - px, info: info });
            pixels.push({ x: cx + px, y: cy - py, info: info });
            pixels.push({ x: cx + py, y: cy - px, info: info });
        };

        let i = 0;
        drawCirclePoints(x, y, `Initial: x=${x}, y=${y}, p=${p}`);

        while (x < y) {
            x++;
            if (p < 0) {
                p = p + 2 * x + 1;
            } else {
                y--;
                p = p + 2 * x + 1 - 2 * y;
            }
            i++;
            drawCirclePoints(x, y, `Step ${i}: x=${x}, y=${y}, p=${p}`);
        }
        return pixels;
    }, []);

    // --- Visualization Animation Loop for Graphics Canvas ---

    /**
     * The main animation loop for step-by-step visualization on the graphics canvas.
     */
    const animateGraphicsVisualization = useCallback(() => {
        const canvas = graphicsCanvasRef.current;
        const ctx = canvas.getContext('2d');

        if (currentIndex < pixelData.length) {
            const pixel = pixelData[currentIndex];

            // Draw the previous pixel in normal color
            if (currentIndex > 0) {
                const prevPixel = pixelData[currentIndex - 1];
                drawPixel(ctx, prevPixel.x, prevPixel.y, darkMode ? '#cbd5e1' : 'black', 2); // Adjust color for dark mode
            }

            // Draw the current pixel highlighted
            drawPixel(ctx, pixel.x, pixel.y, '#ef4444', 4); // Red and slightly larger
            setCurrentPixelInfo({ x: pixel.x, y: pixel.y, info: pixel.info });

            setCurrentIndex(prevIndex => prevIndex + 1);

            // Use setTimeout for controlled delay, then requestAnimationFrame for smooth drawing
            graphicsTimeoutIdRef.current = setTimeout(() => {
                graphicsAnimationFrameIdRef.current = requestAnimationFrame(animateGraphicsVisualization);
            }, animationDelay);
        } else {
            // Animation finished, draw the last pixel normally
            if (pixelData.length > 0) {
                const lastPixel = pixelData[pixelData.length - 1];
                drawPixel(ctx, lastPixel.x, lastPixel.y, darkMode ? '#cbd5e1' : 'black', 2); // Adjust color for dark mode
            }
            setCurrentPixelInfo({ x: 'Done', y: 'Done', info: 'Algorithm complete!' });
            setIsAnimating(false);
            graphicsAnimationFrameIdRef.current = null;
            graphicsTimeoutIdRef.current = null;
        }
    }, [currentIndex, pixelData, animationDelay, drawPixel, darkMode]);

    // Effect to start/stop graphics animation when pixelData or isAnimating changes
    useEffect(() => {
        if (isAnimating && pixelData.length > 0) {
            graphicsAnimationFrameIdRef.current = requestAnimationFrame(animateGraphicsVisualization);
        } else {
            if (graphicsAnimationFrameIdRef.current) {
                cancelAnimationFrame(graphicsAnimationFrameIdRef.current);
            }
            if (graphicsTimeoutIdRef.current) {
                clearTimeout(graphicsTimeoutIdRef.current);
            }
        }
        // Cleanup on unmount or when dependencies change
        return () => {
            if (graphicsAnimationFrameIdRef.current) {
                cancelAnimationFrame(graphicsAnimationFrameIdRef.current);
            }
            if (graphicsTimeoutIdRef.current) {
                clearTimeout(graphicsTimeoutIdRef.current);
            }
        };
    }, [isAnimating, pixelData, animateGraphicsVisualization]);

    // --- Background Animation (Floating Brushes) ---

    const particles = useRef([]); // Use ref to store particles to avoid re-creation on re-renders

    /**
     * Particle class for background animation.
     */
    class Particle {
        constructor(ctx, width, height) {
            this.ctx = ctx;
            this.x = Math.random() * width;
            this.y = Math.random() * height;
            this.size = Math.random() * 5 + 1; // Size between 1 and 6
            this.speedX = Math.random() * 1 - 0.5; // Speed between -0.5 and 0.5
            this.speedY = Math.random() * 1 - 0.5; // Speed between -0.5 and 0.5
            this.color = `rgba(150, 150, 150, ${Math.random() * 0.3 + 0.1})`; // Faint gray/white
            this.shape = Math.random() > 0.5 ? 'circle' : 'square'; // Random shape
        }

        update(width, height) {
            this.x += this.speedX;
            this.y += this.speedY;

            // Wrap around if out of bounds
            if (this.x < 0 || this.x > width) this.speedX *= -1; // Bounce off horizontal edges
            if (this.y < 0 || this.y > height) this.speedY *= -1; // Bounce off vertical edges

            // Optionally, reset position if it goes too far
            if (this.x < -this.size || this.x > width + this.size || this.y < -this.size || this.y > height + this.size) {
                this.x = Math.random() * width;
                this.y = Math.random() * height;
            }
        }

        draw() {
            this.ctx.fillStyle = this.color;
            if (this.shape === 'circle') {
                this.ctx.beginPath();
                this.ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                this.ctx.fill();
            } else {
                this.ctx.fillRect(this.x, this.y, this.size, this.size);
            }
        }
    }

    /**
     * Animates the background canvas with floating particles.
     */
    const animateBackground = useCallback(() => {
        const canvas = backgroundCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        // Adjust canvas size for responsiveness
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear the background canvas

        // Create particles if not already created
        if (particles.current.length === 0) {
            for (let i = 0; i < 50; i++) { // Number of particles
                particles.current.push(new Particle(ctx, canvas.width, canvas.height));
            }
        }

        particles.current.forEach(particle => {
            particle.update(canvas.width, canvas.height);
            particle.draw();
        });

        backgroundAnimationFrameIdRef.current = requestAnimationFrame(animateBackground);
    }, []);

    // Effect for background canvas animation
    useEffect(() => {
        animateBackground(); // Start background animation
        window.addEventListener('resize', animateBackground); // Re-animate on resize
        return () => {
            window.removeEventListener('resize', animateBackground);
            if (backgroundAnimationFrameIdRef.current) {
                cancelAnimationFrame(backgroundAnimationFrameIdRef.current);
            }
        };
    }, [animateBackground]);


    // --- Event Handlers ---

    const handleAlgorithmChange = (event) => {
        setCurrentAlgorithm(event.target.value);
        clearGraphicsCanvas(); // Clear canvas when algorithm changes
    };

    const handleCoordChange = (event) => {
        const { id, value } = event.target;
        setCoords(prev => ({ ...prev, [id]: parseInt(value) || 0 }));
    };

    const handleAnimationSpeedChange = (event) => {
        setAnimationDelay(parseInt(event.target.value));
    };

    const handleStartVisualization = () => {
        clearGraphicsCanvas(); // Ensure canvas is clear before new visualization
        setCurrentIndex(0); // Reset index for new animation

        const { x0, y0, x1, y1, cx, cy, radius } = coords;
        let generatedPixels = [];

        // Validate inputs and execute algorithm
        try {
            if (currentAlgorithm === 'dda' || currentAlgorithm === 'bresenham') {
                if (isNaN(x0) || isNaN(y0) || isNaN(x1) || isNaN(y1)) {
                    throw new Error("Please enter valid numeric coordinates for lines.");
                }
                generatedPixels = currentAlgorithm === 'dda' ? ddaLine(x0, y0, x1, y1) : bresenhamLine(x0, y0, x1, y1);
            } else if (currentAlgorithm === 'midpointCircle') {
                if (isNaN(cx) || isNaN(cy) || isNaN(radius)) {
                    throw new Error("Please enter valid numeric coordinates and radius for circle.");
                }
                if (radius <= 0) {
                    throw new Error("Radius must be a positive number.");
                }
                generatedPixels = midpointCircle(cx, cy, radius);
            }
        } catch (error) {
            showCustomMessage(error.message);
            setIsAnimating(false);
            return;
        }

        if (generatedPixels.length > 0) {
            setPixelData(generatedPixels);
            setIsAnimating(true);
        } else {
            showCustomMessage('No pixels generated. Check inputs.');
            setIsAnimating(false);
        }
    };

    const handleClearCanvas = () => {
        clearGraphicsCanvas();
    };

    const handleResetView = () => {
        clearGraphicsCanvas(true); // Clear and reset all inputs
    };

    // Toggle dark mode
    const toggleDarkMode = () => {
        setDarkMode(prevMode => !prevMode);
    };

    // --- Render Logic ---

    // Determine which input fields to show
    const showLineInputs = currentAlgorithm === 'dda' || currentAlgorithm === 'bresenham';
    const showCircleInputs = currentAlgorithm === 'midpointCircle';

    // Base classes for theme
    const themeBg = darkMode ? 'bg-gradient-to-br from-gray-900 to-black' : 'bg-gradient-to-br from-indigo-50 to-blue-100';
    const containerBg = darkMode ? 'bg-gray-800' : 'bg-white';
    const panelBg = darkMode ? 'bg-gray-700' : 'bg-gray-50';
    const textPrimary = darkMode ? 'text-gray-100' : 'text-gray-900';
    const textSecondary = darkMode ? 'text-gray-300' : 'text-gray-700';
    const textLabel = darkMode ? 'text-gray-400' : 'text-gray-600';
    const inputFieldBg = darkMode ? 'bg-gray-600 border-gray-500 text-gray-100' : 'bg-white border-gray-300 text-gray-800';
    // Adjusted canvasBg for better contrast
    const canvasBg = darkMode ? 'bg-gray-900 border-gray-600' : 'bg-blue-100 border-gray-300'; // Darker canvas in dark mode
    const infoPanelBg = darkMode ? 'bg-gray-700 border-teal-600 text-gray-200' : 'bg-blue-50 border-teal-500 text-blue-900';
    const infoText = darkMode ? 'text-gray-300' : 'text-gray-700';
    const infoHighlight = darkMode ? 'text-teal-400' : 'text-teal-700';
    const infoAlgoHighlight = darkMode ? 'text-indigo-400' : 'text-indigo-700';


    return (
        // Changed items-center to items-start to push content to the top
        <div className={`min-h-screen relative overflow-hidden flex items-start justify-center p-4 sm:p-6 lg:p-10 font-inter ${themeBg}`}>
            {/* Background Canvas for Floating Brushes */}
            <canvas ref={backgroundCanvasRef} className="absolute inset-0 z-0"></canvas>

            {/* Main Content Container */}
            <div className={`container relative z-10 rounded-2xl shadow-xl p-6 sm:p-8 lg:p-12 flex flex-col lg:flex-row gap-8 lg:gap-12 w-full max-w-6xl ${containerBg}`}>
                {/* Control Panel */}
                {/* Added items-center to control-panel to center its direct children horizontally */}
                <div className={`control-panel w-full lg:w-1/3 flex flex-col gap-6 p-6 rounded-xl shadow-md ${panelBg} items-center`}>
                    <div className="flex justify-between items-center mb-4 w-full"> {/* Ensure toggle button is aligned */}
                        <h2 className={`text-3xl font-extrabold ${textPrimary} text-center flex-grow`}>Algorithm Controls ✨</h2> {/* flex-grow to take available space */}
                        {/* Dark Mode Toggle */}
                        <button
                            onClick={toggleDarkMode}
                            className="p-2 rounded-full bg-gray-600 hover:bg-gray-500 transition-colors duration-200"
                            title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
                        >
                            {darkMode ? (
                                <svg className="w-6 h-6 text-yellow-300" fill="currentColor" viewBox="0 0 20 20"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"></path></svg>
                            ) : (
                                <svg className="w-6 h-6 text-yellow-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 4a1 1 0 011 1v1a1 1 0 11-2 0V7a1 1 0 011-1zm-4 8a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zm-4-4a1 1 0 011 1v1a1 1 0 11-2 0V7a1 1 0 011-1zm10-4a1 1 0 011 1v1a1 1 0 11-2 0V7a1 1 0 011-1zM6 10a4 4 0 118 0 4 4 0 01-8 0zm1.5-3.5a.5.5 0 00-1 0v1a.5.5 0 001 0v-1z" clipRule="evenodd"></path></svg>
                            )}
                        </button>
                    </div>


                    {/* Algorithm Selection */}
                    {/* Removed mx-auto max-w-sm from direct children, relying on parent's items-center */}
                    <div className="radio-group flex flex-col gap-3 w-full">
                        <label className={`block text-xl font-semibold ${textSecondary} mb-2`}>Select Algorithm:</label>
                        {['dda', 'bresenham', 'midpointCircle'].map((algo) => (
                            <div key={algo} className="flex items-center">
                                <input
                                    type="radio"
                                    id={algo}
                                    name="algorithm"
                                    value={algo}
                                    checked={currentAlgorithm === algo}
                                    onChange={handleAlgorithmChange}
                                    className="form-radio text-indigo-600 h-5 w-5 transition duration-200 ease-in-out"
                                />
                                <label htmlFor={algo} className={`ml-3 text-lg font-medium ${textPrimary} cursor-pointer`}>
                                    {algo === 'dda' ? 'DDA Line' : algo === 'bresenham' ? "Bresenham's Line" : 'Midpoint Circle'}
                                </label>
                            </div>
                        ))}
                    </div>

                    {/* Coordinate Inputs */}
                    {showLineInputs && (
                        // Removed mx-auto max-w-sm
                        <div className="grid grid-cols-2 gap-4 transition-all duration-300 ease-in-out w-full">
                            <div className="input-group">
                                <label htmlFor="x0" className={`text-md font-semibold ${textLabel}`}>X0:</label>
                                <input type="number" id="x0" value={coords.x0} onChange={handleCoordChange} className={`input-field ${inputFieldBg}`} />
                            </div>
                            <div className="input-group">
                                <label htmlFor="y0" className={`text-md font-semibold ${textLabel}`}>Y0:</label>
                                <input type="number" id="y0" value={coords.y0} onChange={handleCoordChange} className={`input-field ${inputFieldBg}`} />
                            </div>
                            <div className="input-group">
                                <label htmlFor="x1" className={`text-md font-semibold ${textLabel}`}>X1:</label>
                                <input type="number" id="x1" value={coords.x1} onChange={handleCoordChange} className={`input-field ${inputFieldBg}`} />
                            </div>
                            <div className="input-group">
                                <label htmlFor="y1" className={`text-md font-semibold ${textLabel}`}>Y1:</label>
                                <input type="number" id="y1" value={coords.y1} onChange={handleCoordChange} className={`input-field ${inputFieldBg}`} />
                            </div>
                        </div>
                    )}

                    {showCircleInputs && (
                        // Removed mx-auto max-w-sm
                        <div className="grid grid-cols-2 gap-4 transition-all duration-300 ease-in-out w-full">
                            <div className="input-group">
                                <label htmlFor="cx" className={`text-md font-semibold ${textLabel}`}>Center X:</label>
                                <input type="number" id="cx" value={coords.cx} onChange={handleCoordChange} className={`input-field ${inputFieldBg}`} />
                            </div>
                            <div className="input-group">
                                <label htmlFor="cy" className={`text-md font-semibold ${textLabel}`}>Center Y:</label>
                                <input type="number" id="cy" value={coords.cy} onChange={handleCoordChange} className={`input-field ${inputFieldBg}`} />
                            </div>
                            <div className="input-group col-span-2">
                                <label htmlFor="radius" className={`text-md font-semibold ${textLabel}`}>Radius:</label>
                                <input type="number" id="radius" value={coords.radius} onChange={handleCoordChange} className={`input-field ${inputFieldBg}`} />
                            </div>
                        </div>
                    )}

                    {/* Speed Control */}
                    {/* Removed mx-auto max-w-sm */}
                    <div className="input-group w-full">
                        <label htmlFor="animationSpeed" className={`block text-xl font-semibold ${textSecondary} mb-2`}>Animation Speed (ms):</label>
                        <input
                            type="range"
                            id="animationSpeed"
                            min="10"
                            max="500"
                            value={animationDelay}
                            onChange={handleAnimationSpeedChange}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-500 transition-colors duration-200 ease-in-out"
                        />
                        <span className={`text-sm ${textLabel} mt-1 block text-right`}>{animationDelay} ms</span>
                    </div>

                    {/* Action Buttons */}
                    {/* Removed mx-auto max-w-sm */}
                    <div className="flex flex-col sm:flex-row gap-4 mt-4 w-full">
                        <button
                            onClick={handleStartVisualization}
                            className={`btn btn-primary flex-1 ${isAnimating ? 'opacity-70 cursor-not-allowed' : ''}`}
                            disabled={isAnimating}
                        >
                            {isAnimating ? (
                                <span className="flex items-center justify-center">
                                    <svg className="animate-spin h-5 w-5 mr-3 text-white" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Visualizing...
                                </span>
                            ) : (
                                'Start Visualization'
                            )}
                        </button>
                        <button onClick={handleClearCanvas} className="btn btn-secondary flex-1">Clear Canvas</button>
                    </div>
                    <button onClick={handleResetView} className="btn btn-danger mt-2 w-full">Reset View</button> {/* Removed mx-auto max-w-sm */}

                    {/* Visualization Info Display */}
                    {/* Removed mx-auto max-w-sm */}
                    <div className={`visualization-info mt-6 transition-all duration-300 ease-in-out transform hover:scale-[1.01] ${infoPanelBg} w-full`}>
                        <p className={infoText}><strong>Current Algorithm:</strong> <span className={`font-semibold ${infoAlgoHighlight}`}>{currentAlgorithm === 'dda' ? 'DDA Line' : currentAlgorithm === 'bresenham' ? "Bresenham's Line" : 'Midpoint Circle'}</span></p>
                        <p className={infoText}><strong>Current Pixel:</strong> (<span className={`font-semibold ${infoHighlight}`}>{currentPixelInfo.x}</span>, <span className={`font-semibold ${infoHighlight}`}>{currentPixelInfo.y}</span>)</p>
                        <p className={infoText}><strong>Step Info:</strong> <span className={infoText}>{currentPixelInfo.info}</span></p>
                    </div>
                </div>

                {/* Canvas Area */}
                <div className={`canvas-area w-full lg:w-2/3 flex flex-col items-center justify-center p-4 rounded-xl shadow-inner ${panelBg}`}>
                    <canvas ref={graphicsCanvasRef} width="500" height="500" className={`canvas-element ${canvasBg}`}></canvas>
                </div>
            </div>

            {/* Custom Message Box */}
            {showMessage && (
                <div className="fixed bottom-8 right-8 bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-bounce-in transition-all duration-300 ease-out">
                    {message}
                </div>
            )}

            {/* Global Styles for React components using Tailwind */}
            <style>{`
                .font-inter {
                    font-family: 'Inter', sans-serif;
                }
                .container {
                    display: flex;
                    flex-direction: column;
                    gap: 2rem; /* Equivalent to gap-8 */
                }
                @media (min-width: 1024px) {
                    .container {
                        flex-direction: row;
                }
                }
                .canvas-element {
                    border-radius: 12px;
                    width: 100%;
                    height: auto; /* Maintain aspect ratio */
                    min-height: 400px; /* Minimum height for canvas */
                    box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.06); /* Inner shadow */
                }
                .input-field {
                    border-width: 1px;
                    border-radius: 8px;
                    padding: 10px 12px;
                    width: 100%;
                    margin-top: 6px;
                    font-size: 0.95rem;
                    transition: border-color 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
                }
                .input-field:focus {
                    outline: none;
                    border-color: #6366f1;
                    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
                }
                .btn {
                    padding: 12px 20px;
                    border-radius: 10px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s ease-in-out;
                    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
                    display: flex; /* For centering content like spin icon */
                    align-items: center;
                    justify-content: center;
                }
                .btn-primary {
                    background-color: #6366f1;
                    color: white;
                }
                .btn-primary:hover:not(:disabled) {
                    background-color: #4f46e5;
                    box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
                    transform: translateY(-2px);
                }
                .btn-secondary {
                    background-color: #e2e8f0;
                    color: #475569;
                }
                .btn-secondary:hover:not(:disabled) {
                    background-color: #cbd5e1;
                    box-shadow: 0 6px 12px rgba(0, 0, 0, 0.08);
                    transform: translateY(-2px);
                }
                .btn-danger {
                    background-color: #ef4444;
                    color: white;
                }
                .btn-danger:hover:not(:disabled) {
                    background-color: #dc2626;
                    box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
                    transform: translateY(-2px);
                }
                .visualization-info {
                    border-left: 4px solid;
                    border-radius: 8px;
                    padding: 15px 20px;
                    font-size: 0.9rem;
                    margin-top: 20px;
                }
                .visualization-info p {
                    margin-bottom: 5px;
                }
                .form-radio {
                    /* Custom styling for radio buttons */
                    -webkit-appearance: none;
                    -moz-appearance: none;
                    appearance: none;
                    border-radius: 50%;
                    border: 2px solid #a78bfa; /* Indigo 300 */
                    width: 1.25rem;
                    height: 1.25rem;
                    outline: none;
                    cursor: pointer;
                    display: inline-block;
                    position: relative;
                    vertical-align: middle;
                }
                .form-radio:checked {
                    background-color: #6366f1; /* Indigo 500 */
                    border-color: #6366f1;
                }
                .form-radio:checked::after {
                    content: '';
                    display: block;
                    width: 0.5rem;
                    height: 0.5rem;
                    border-radius: 50%;
                    background: white;
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                }
                /* Animation for message box */
                @keyframes bounceIn {
                    0% { transform: scale(0.5); opacity: 0; }
                    80% { transform: scale(1.1); opacity: 1; }
                    100% { transform: scale(1); }
                }
                .animate-bounce-in {
                    animation: bounceIn 0.3s ease-out forwards;
                }
            `}</style>
        </div>
    );
};

export default App;
