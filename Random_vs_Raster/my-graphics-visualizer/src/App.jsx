import React, { useState, useEffect, useRef, useCallback } from 'react';

// Define Particle class outside the component to avoid unnecessary re-creation and useCallback dependency issues
class Particle {
    constructor(ctx, width, height) {
        this.ctx = ctx;
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.size = Math.random() * 5 + 1;
        this.speedX = Math.random() * 1 - 0.5;
        this.speedY = Math.random() * 1 - 0.5;
        this.color = `rgba(150, 150, 150, ${Math.random() * 0.3 + 0.1})`;
        this.shape = Math.random() > 0.5 ? 'circle' : 'square';
    }

    update(width, height) {
        this.x += this.speedX;
        this.y += this.speedY;
        if (this.x < 0 || this.x > width) this.speedX *= -1;
        if (this.y < 0 || this.y > height) this.speedY *= -1;
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


// Main App component
const App = () => {
    // State for UI feedback and messages
    const [message, setMessage] = useState('');
    const [showMessage, setShowMessage] = useState(false);

    // State for pixel info display
    const [currentPixelInfo, setCurrentPixelInfo] = useState({ x: '--', y: '--', info: 'N/A' });

    // State for drawn lines (array of {x1, y1, x2, y2})
    const [drawnLines, setDrawnLines] = useState([]);
    // State for simulation controls
    const [simulationSpeed, setSimulationSpeed] = useState(50); // ms per step
    const [isSimulating, setIsSimulating] = useState(false);
    const [darkMode, setDarkMode] = useState(true); // Default to dark mode

    // Refs for canvases
    const inputCanvasRef = useRef(null);
    const rasterCanvasRef = useRef(null);
    const randomCanvasRef = useRef(null);
    const backgroundCanvasRef = useRef(null);

    // Refs for animation frame IDs and timeout IDs for cleanup
    const rasterAnimationFrameIdRef = useRef(null);
    const randomAnimationFrameIdRef = useRef(null);
    const backgroundAnimationFrameIdRef = useRef(null);
    const rasterTimeoutIdRef = useRef(null);
    const randomTimeoutIdRef = useRef(null);

    // Input drawing state
    const [isDrawing, setIsDrawing] = useState(false);
    const [startPoint, setStartPoint] = useState({ x: 0, y: 0 });
    const [currentLinePreview, setCurrentLinePreview] = useState(null);


    // --- Utility Functions ---

    // Function to show a custom message/alert
    const showCustomMessage = (msg) => {
        setMessage(msg);
        setShowMessage(true);
        setTimeout(() => setShowMessage(false), 3000);
    };

    /**
     * Draws a single pixel on a given canvas context.
     * @param {CanvasRenderingContext2D} ctx - The 2D rendering context.
     * @param {number} x - X coordinate.
     * @param {number} y - Y coordinate.
     * @param {string} color - Color of the pixel.
     * @param {number} size - Size of the pixel.
     */
    const drawPixel = useCallback((ctx, x, y, color, size = 2) => {
        // eslint-disable-next-line react-hooks/exhaustive-deps
        // The 'darkMode' dependency is necessary here as 'finalColor' depends on it.
        const finalColor = color || (darkMode ? '#cbd5e1' : 'black'); // Default pixel color for dark/light mode
        ctx.fillStyle = finalColor;
        ctx.fillRect(x, y, size, size);
    }, [darkMode]); // `darkMode` is a necessary dependency here.

    /**
     * Clears a specified canvas.
     * @param {HTMLCanvasElement} canvas - The canvas element to clear.
     */
    const clearCanvas = useCallback((canvas) => {
        if (!canvas) return;
        const ctx = canvas.getContext('2d'); // `ctx` is used immediately below
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }, []);

    /**
     * Resizes a canvas to match its display size.
     * @param {HTMLCanvasElement} canvas - The canvas element to resize.
     */
    const resizeCanvas = useCallback((canvas) => {
        if (!canvas) return;
        const displayWidth = canvas.clientWidth;
        const displayHeight = canvas.clientHeight;
        if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
            canvas.width = displayWidth;
            canvas.height = displayHeight;
            return true; // Indicate if resized
        }
        return false;
    }, []);

    // --- Input Canvas Drawing Logic ---

    const handleMouseDown = useCallback((e) => {
        const canvas = inputCanvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        setIsDrawing(true);
        setStartPoint({ x, y });
        setCurrentLinePreview({ x1: x, y1: y, x2: x, y2: y });
    }, []);

    const handleMouseMove = useCallback((e) => {
        if (!isDrawing) return;
        const canvas = inputCanvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        setCurrentLinePreview(prev => ({ ...prev, x2: x, y2: y }));

        // Redraw input canvas for preview
        const ctx = canvas.getContext('2d'); // `ctx` is used immediately below
        clearCanvas(canvas);
        // Redraw existing lines
        drawnLines.forEach(line => {
            ctx.beginPath();
            ctx.moveTo(line.x1, line.y1);
            ctx.lineTo(line.x2, line.y2);
            ctx.strokeStyle = darkMode ? '#a78bfa' : '#6366f1'; // Indigo 300 / 500
            ctx.lineWidth = 2;
            ctx.stroke();
        });
        // Draw current preview line
        if (currentLinePreview) {
            ctx.beginPath();
            ctx.moveTo(startPoint.x, startPoint.y);
            ctx.lineTo(x, y);
            ctx.strokeStyle = darkMode ? '#fde047' : '#eab308'; // Yellow 300 / 600
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]); // Dashed line for preview
            ctx.stroke();
            ctx.setLineDash([]); // Reset line dash
        }
    }, [isDrawing, startPoint, currentLinePreview, drawnLines, clearCanvas, darkMode]);

    const handleMouseUp = useCallback(() => {
        if (!isDrawing || !currentLinePreview) return;
        setIsDrawing(false);
        setDrawnLines(prevLines => [...prevLines, currentLinePreview]);
        setCurrentLinePreview(null);
        // Trigger simulation restart if already simulating
        if (isSimulating) {
            setIsSimulating(false); // Stop current simulation
            // A small delay to allow state update before restarting
            setTimeout(() => setIsSimulating(true), 100);
        }
    }, [isDrawing, currentLinePreview, isSimulating]);

    // Effect for input canvas setup and drawing existing lines
    useEffect(() => {
        const canvas = inputCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d'); // `ctx` is used immediately below
        resizeCanvas(canvas); // Initial resize

        clearCanvas(canvas);
        drawnLines.forEach(line => {
            ctx.beginPath();
            ctx.moveTo(line.x1, line.y1);
            ctx.lineTo(line.x2, line.y2);
            ctx.strokeStyle = darkMode ? '#a78bfa' : '#6366f1';
            ctx.lineWidth = 2;
            ctx.stroke();
        });
    }, [drawnLines, clearCanvas, resizeCanvas, darkMode]);

    // --- Raster Scan Simulation Logic ---
    const rasterDisplayData = useRef({
        buffer: [], // 2D array of pixel colors
        currentScanline: 0,
        currentPixelInScanline: 0,
        pixelsToDraw: [] // Pre-calculated pixels for the current frame
    });

    // Bresenham's Line Algorithm (reused from previous project)
    const bresenhamLinePixels = useCallback((x0, y0, x1, y1, canvasWidth, canvasHeight) => {
        const pixels = [];
        let dx = Math.abs(x1 - x0);
        let dy = Math.abs(y1 - y0);
        let sx = (x0 < x1) ? 1 : -1;
        let sy = (y0 < y1) ? 1 : -1;
        let err = dx - dy;

        let x = x0;
        let y = y0;

        while (true) {
            // Ensure pixel is within canvas bounds
            if (x >= 0 && x < canvasWidth && y >= 0 && y < canvasHeight) {
                pixels.push({ x: Math.round(x), y: Math.round(y) });
            }

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
        }
        return pixels;
    }, []);

    const initializeRasterBuffer = useCallback(() => {
        const canvas = rasterCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d'); // `ctx` is used immediately below
        resizeCanvas(canvas);
        clearCanvas(canvas);

        const width = canvas.width;
        const height = canvas.height;
        const buffer = Array(height).fill(null).map(() => Array(width).fill(darkMode ? '#1f2937' : '#f0f2f5')); // Fill with canvas background color

        // Populate buffer with drawn lines
        drawnLines.forEach(line => {
            const pixels = bresenhamLinePixels(line.x1, line.y1, line.x2, line.y2, width, height);
            pixels.forEach(p => {
                if (p.y >= 0 && p.y < height && p.x >= 0 && p.x < width) {
                    buffer[p.y][p.x] = darkMode ? '#cbd5e1' : 'black'; // Line color
                }
            });
        });
        rasterDisplayData.current.buffer = buffer;
        rasterDisplayData.current.currentScanline = 0;
        rasterDisplayData.current.currentPixelInScanline = 0;
        rasterDisplayData.current.pixelsToDraw = []; // Reset for new frame
    }, [drawnLines, clearCanvas, resizeCanvas, bresenhamLinePixels, darkMode]);

    const animateRasterDisplay = useCallback(() => {
        const canvas = rasterCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d'); // `ctx` is used immediately below
        const buffer = rasterDisplayData.current.buffer;
        const width = canvas.width;
        const height = canvas.height;

        if (!isSimulating || !buffer.length) {
            rasterAnimationFrameIdRef.current = null;
            return;
        }

        let currentScanline = rasterDisplayData.current.currentScanline;
        let currentPixelInScanline = rasterDisplayData.current.currentPixelInScanline;

        // Draw the current pixel
        if (currentScanline < height && currentPixelInScanline < width) {
            const pixelColor = buffer[currentScanline][currentPixelInScanline];
            drawPixel(ctx, currentPixelInScanline, currentScanline, pixelColor, 2);

            // Update currentPixelInfo for display
            setCurrentPixelInfo({ 
                x: currentPixelInScanline, 
                y: currentScanline, 
                info: `Scanline: ${currentScanline}, Pixel: ${currentPixelInScanline}` 
            });

            currentPixelInScanline++;
            if (currentPixelInScanline >= width) {
                currentPixelInScanline = 0;
                currentScanline++;
            }
        } else {
            // End of frame, reset for next refresh cycle
            currentScanline = 0;
            currentPixelInScanline = 0;
            clearCanvas(canvas); // Clear for next refresh
            setCurrentPixelInfo({ x: 'Done', y: 'Done', info: 'Raster refresh complete!' });
        }

        rasterDisplayData.current.currentScanline = currentScanline;
        rasterDisplayData.current.currentPixelInScanline = currentPixelInScanline;

        rasterTimeoutIdRef.current = setTimeout(() => {
            rasterAnimationFrameIdRef.current = requestAnimationFrame(animateRasterDisplay);
        }, simulationSpeed / (width * height) * 100); // Adjust speed for pixel-by-pixel drawing
    }, [isSimulating, simulationSpeed, drawPixel, clearCanvas, darkMode]);


    // Effect for Raster Display animation loop
    useEffect(() => {
        if (isSimulating) {
            initializeRasterBuffer(); // Re-initialize buffer when simulation starts or lines change
            if (rasterAnimationFrameIdRef.current) {
                cancelAnimationFrame(rasterAnimationFrameIdRef.current);
            }
            if (rasterTimeoutIdRef.current) {
                clearTimeout(rasterTimeoutIdRef.current);
            }
            rasterAnimationFrameIdRef.current = requestAnimationFrame(animateRasterDisplay);
        } else {
            if (rasterAnimationFrameIdRef.current) {
                cancelAnimationFrame(rasterAnimationFrameIdRef.current);
            }
            if (rasterTimeoutIdRef.current) {
                clearTimeout(rasterTimeoutIdRef.current);
            }
        }
        return () => {
            if (rasterAnimationFrameIdRef.current) {
                cancelAnimationFrame(rasterAnimationFrameIdRef.current);
            }
            if (rasterTimeoutIdRef.current) {
                clearTimeout(rasterTimeoutIdRef.current);
            }
        };
    }, [isSimulating, initializeRasterBuffer, animateRasterDisplay, drawnLines]); // Re-run if drawnLines change


    // --- Random Scan Simulation Logic ---
    const randomDisplayData = useRef({
        currentLineIndex: 0,
        currentSegmentProgress: 0, // For drawing line segments
        segmentLength: 10 // Number of pixels per segment
    });

    const animateRandomDisplay = useCallback(() => {
        const canvas = randomCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d'); // `ctx` is used immediately below
        resizeCanvas(canvas); // Ensure canvas is correctly sized

        if (!isSimulating || drawnLines.length === 0) {
            randomAnimationFrameIdRef.current = null;
            return;
        }

        // Clear canvas for random scan (simulating fast refresh/persistence)
        // We'll draw all lines in each frame, and fade them out if needed
        clearCanvas(canvas);

        // Draw all lines with a slight fade effect
        drawnLines.forEach(line => { // Removed 'index' as it's unused
            ctx.beginPath();
            ctx.moveTo(line.x1, line.y1);
            ctx.lineTo(line.x2, line.y2);
            ctx.strokeStyle = darkMode ? 'rgba(203, 213, 225, 0.8)' : 'rgba(0, 0, 0, 0.8)'; // Faded line color
            ctx.lineWidth = 2;
            ctx.stroke();
        });

        // Highlight the 'active' line being drawn
        let currentLineIndex = randomDisplayData.current.currentLineIndex;
        if (currentLineIndex < drawnLines.length) {
            const line = drawnLines[currentLineIndex];
            ctx.beginPath();
            ctx.moveTo(line.x1, line.y1);
            ctx.lineTo(line.x2, line.y2);
            ctx.strokeStyle = darkMode ? '#fde047' : '#eab308'; // Highlight color
            ctx.lineWidth = 3;
            ctx.stroke();

            // Update currentPixelInfo for display (simplified for random scan)
            setCurrentPixelInfo({ 
                x: `Line ${currentLineIndex + 1}`, 
                y: `(${line.x1},${line.y1}) to (${line.x2},${line.y2})`, 
                info: 'Tracing line segment' 
            });


            // Simulate beam moving to the next line
            currentLineIndex++;
            if (currentLineIndex >= drawnLines.length) {
                currentLineIndex = 0; // Loop back to the first line
                setCurrentPixelInfo({ x: 'Done', y: 'Done', info: 'Random scan refresh complete!' });
            }
        } else {
            currentLineIndex = 0; // Reset if all lines drawn
            setCurrentPixelInfo({ x: 'Done', y: 'Done', info: 'Random scan refresh complete!' });
        }

        randomDisplayData.current.currentLineIndex = currentLineIndex;

        randomTimeoutIdRef.current = setTimeout(() => {
            randomAnimationFrameIdRef.current = requestAnimationFrame(animateRandomDisplay);
        }, simulationSpeed * 2); // Random scan can be faster per line
    }, [isSimulating, drawnLines, simulationSpeed, clearCanvas, resizeCanvas, darkMode]);

    // Effect for Random Display animation loop
    useEffect(() => {
        if (isSimulating) {
            if (randomAnimationFrameIdRef.current) {
                cancelAnimationFrame(randomAnimationFrameIdRef.current);
            }
            if (randomTimeoutIdRef.current) {
                clearTimeout(randomTimeoutIdRef.current);
            }
            randomDisplayData.current.currentLineIndex = 0; // Reset index on start
            randomAnimationFrameIdRef.current = requestAnimationFrame(animateRandomDisplay);
        } else {
            if (randomAnimationFrameIdRef.current) {
                cancelAnimationFrame(randomAnimationFrameIdRef.current);
            }
            if (randomTimeoutIdRef.current) {
                clearTimeout(randomTimeoutIdRef.current);
            }
            clearCanvas(randomCanvasRef.current); // Clear random canvas when not simulating
        }
        return () => {
            if (randomAnimationFrameIdRef.current) {
                cancelAnimationFrame(randomAnimationFrameIdRef.current);
            }
            if (randomTimeoutIdRef.current) {
                clearTimeout(randomTimeoutIdRef.current);
            }
        };
    }, [isSimulating, drawnLines, animateRandomDisplay, clearCanvas]); // Re-run if drawnLines change


    // --- Background Animation (Floating Brushes) ---
    const particles = useRef([]);

    const animateBackground = useCallback(() => {
        const canvas = backgroundCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d'); // `ctx` is used immediately below
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (particles.current.length === 0) {
            for (let i = 0; i < 50; i++) {
                particles.current.push(new Particle(ctx, canvas.width, canvas.height));
            }
        }
        particles.current.forEach(particle => {
            particle.update(canvas.width, canvas.height);
            particle.draw();
        });
        backgroundAnimationFrameIdRef.current = requestAnimationFrame(animateBackground);
    }, []);

    useEffect(() => {
        animateBackground();
        window.addEventListener('resize', animateBackground);
        return () => {
            window.removeEventListener('resize', animateBackground);
            if (backgroundAnimationFrameIdRef.current) {
                cancelAnimationFrame(backgroundAnimationFrameIdRef.current);
            }
        };
    }, [animateBackground]);


    // --- Event Handlers for Controls ---

    const handleStartSimulation = () => {
        if (drawnLines.length === 0) {
            showCustomMessage("Please draw at least one line on the input canvas first!");
            return;
        }
        setIsSimulating(true);
    };

    const handlePauseSimulation = () => {
        setIsSimulating(false);
    };

    const handleClearAll = () => {
        setIsSimulating(false);
        setDrawnLines([]);
        clearCanvas(inputCanvasRef.current);
        clearCanvas(rasterCanvasRef.current);
        clearCanvas(randomCanvasRef.current);
        // Re-initialize raster buffer for next run
        rasterDisplayData.current.buffer = [];
        rasterDisplayData.current.currentScanline = 0;
        rasterDisplayData.current.currentPixelInScanline = 0;
        randomDisplayData.current.currentLineIndex = 0;
        setCurrentPixelInfo({ x: '--', y: '--', info: 'N/A' }); // Reset info display
    };

    const toggleDarkMode = () => {
        setDarkMode(prevMode => !prevMode);
        // Clear canvases to redraw with new theme colors immediately
        clearCanvas(inputCanvasRef.current);
        clearCanvas(rasterCanvasRef.current);
        clearCanvas(randomCanvasRef.current);
        // Re-trigger raster buffer initialization to update colors
        if (isSimulating) {
            initializeRasterBuffer();
        }
    };

    // --- Theme-dependent CSS Classes ---
    const themeBg = darkMode ? 'bg-gradient-to-br from-gray-900 to-black' : 'bg-gradient-to-br from-indigo-50 to-blue-100';
    const containerBg = darkMode ? 'bg-gray-800' : 'bg-white';
    const panelBg = darkMode ? 'bg-gray-700' : 'bg-gray-50';
    const textPrimary = darkMode ? 'text-gray-100' : 'text-gray-900';
    const textSecondary = darkMode ? 'text-gray-300' : 'text-gray-700';
    const textLabel = darkMode ? 'text-gray-400' : 'text-gray-600';
    const inputFieldBg = darkMode ? 'bg-gray-600 border-gray-500 text-gray-100' : 'bg-white border-gray-300 text-gray-800';
    const canvasBg = darkMode ? 'bg-gray-900 border-gray-600' : 'bg-blue-100 border-gray-300'; // Darker canvas in dark mode
    const infoPanelBg = darkMode ? 'bg-gray-700 border-teal-600 text-gray-200' : 'bg-blue-50 border-teal-500 text-blue-900';
    const infoText = darkMode ? 'text-gray-300' : 'text-gray-700';
    const infoHighlight = darkMode ? 'text-teal-400' : 'text-teal-700';
    const infoAlgoHighlight = darkMode ? 'text-indigo-400' : 'text-indigo-700';


    return (
        <div className={`min-h-screen relative overflow-hidden flex flex-col items-center p-4 sm:p-6 lg:p-10 font-inter ${themeBg}`}>
            {/* Background Canvas for Floating Brushes */}
            <canvas ref={backgroundCanvasRef} className="absolute inset-0 z-0"></canvas>

            {/* Main Content Container */}
            <div className={`container relative z-10 rounded-2xl shadow-xl p-6 sm:p-8 lg:p-12 flex flex-col lg:flex-row gap-8 lg:gap-12 w-full max-w-6xl ${containerBg} mt-8 mb-8`}>
                {/* Control Panel & Input Area */}
                <div className={`control-panel w-full lg:w-1/3 flex flex-col gap-6 p-6 rounded-xl shadow-md ${panelBg} items-center`}>
                    <div className="flex justify-between items-center mb-4 w-full">
                        <h2 className={`text-3xl font-extrabold ${textPrimary} text-center flex-grow`}>Display System Simulator 🚀</h2>
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

                    <p className={`text-center mb-4 ${textSecondary}`}>Draw lines on the canvas below to see how different display systems render them.</p>

                    {/* Input Canvas */}
                    <div className={`canvas-area w-full flex flex-col items-center justify-center p-2 rounded-xl shadow-inner ${panelBg}`}>
                        <h3 className={`text-xl font-semibold mb-2 ${textPrimary}`}>Input Drawing Area</h3>
                        <canvas
                            ref={inputCanvasRef}
                            width="400"
                            height="300"
                            className={`canvas-element ${canvasBg} cursor-crosshair`}
                            onMouseDown={handleMouseDown}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUp}
                            onMouseLeave={handleMouseUp} // End drawing if mouse leaves canvas
                        ></canvas>
                    </div>

                    {/* Simulation Controls */}
                    <div className="input-group w-full">
                        <label htmlFor="simulationSpeed" className={`block text-xl font-semibold ${textSecondary} mb-2`}>Simulation Speed (ms):</label>
                        <input
                            type="range"
                            id="simulationSpeed"
                            min="10"
                            max="500"
                            value={simulationSpeed}
                            onChange={(e) => setSimulationSpeed(parseInt(e.target.value))}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-500 transition-colors duration-200 ease-in-out"
                        />
                        <span className={`text-sm ${textLabel} mt-1 block text-right`}>{simulationSpeed} ms</span>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 mt-4 w-full">
                        <button
                            onClick={handleStartSimulation}
                            className={`btn btn-primary flex-1 ${isSimulating ? 'opacity-70 cursor-not-allowed' : ''}`}
                            disabled={isSimulating}
                        >
                            {isSimulating ? (
                                <span className="flex items-center justify-center">
                                    <svg className="animate-spin h-5 w-5 mr-3 text-white" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Simulating...
                                </span>
                            ) : (
                                'Start Simulation'
                            )}
                        </button>
                        <button onClick={handlePauseSimulation} className="btn btn-secondary flex-1" disabled={!isSimulating}>Pause</button>
                    </div>
                    <button onClick={handleClearAll} className="btn btn-danger mt-2 w-full">Clear All</button>

                    {/* Current Pixel Info (from previous project, can be adapted or removed) */}
                    <div className={`visualization-info mt-6 transition-all duration-300 ease-in-out transform hover:scale-[1.01] ${infoPanelBg} w-full`}>
                        <p className={infoText}><strong>Current Pixel:</strong> (<span className={`font-semibold ${infoHighlight}`}>{currentPixelInfo?.x || '--'}</span>, <span className={`font-semibold ${infoHighlight}`}>{currentPixelInfo?.y || '--'}</span>)</p>
                        <p className={infoText}><strong>Step Info:</strong> <span className={infoText}>{currentPixelInfo?.info || 'N/A'}</span></p>
                    </div>
                </div>

                {/* Display Canvases Area */}
                <div className={`display-canvases-area w-full lg:w-2/3 flex flex-col gap-8 p-4 rounded-xl shadow-inner ${panelBg}`}>
                    {/* Raster Scan Display */}
                    <div className={`canvas-area w-full flex flex-col items-center justify-center p-2 rounded-xl shadow-inner ${panelBg}`}>
                        <h3 className={`text-xl font-semibold mb-2 ${textPrimary}`}>Raster Scan Display</h3>
                        <canvas ref={rasterCanvasRef} width="500" height="400" className={`canvas-element ${canvasBg}`}></canvas>
                        <div className={`info-box mt-4 p-3 rounded-lg ${infoPanelBg} w-full text-sm`}>
                            <p className={infoText}><strong>Concept:</strong> Draws line-by-line, pixel-by-pixel, like a TV. Uses a Refresh Buffer (Framebuffer).</p>
                            <p className={infoText}><strong>Visualization:</strong> You'll see the screen being drawn from top-left to bottom-right, scanline by scanline.</p>
                        </div>
                    </div>

                    {/* Random Scan Display */}
                    <div className={`canvas-area w-full flex flex-col items-center justify-center p-2 rounded-xl shadow-inner ${panelBg}`}>
                        <h3 className={`text-xl font-semibold mb-2 ${textPrimary}`}>Random Scan Display (Vector Display)</h3>
                        <canvas ref={randomCanvasRef} width="500" height="400" className={`canvas-element ${canvasBg}`}></canvas>
                        <div className={`info-box mt-4 p-3 rounded-lg ${infoPanelBg} w-full text-sm`}>
                            <p className={infoText}><strong>Concept:</strong> Draws lines directly, like a plotter. Uses a Display File (Display List) of drawing commands.</p>
                            <p className={infoText}><strong>Visualization:</strong> You'll see the electron beam directly tracing each line, then jumping to the next.</p>
                        </div>
                    </div>
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
                    width: 100%; /* Make canvas responsive within its container */
                    height: auto; /* Maintain aspect ratio */
                    min-height: 300px; /* Minimum height for canvases */
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
                .visualization-info, .info-box {
                    border-left: 4px solid;
                    border-radius: 8px;
                    padding: 15px 20px;
                    font-size: 0.9rem;
                    margin-top: 20px;
                }
                .visualization-info p, .info-box p {
                    margin-bottom: 5px;
                }
                .form-radio {
                    -webkit-appearance: none;
                    -moz-appearance: none;
                    appearance: none;
                    border-radius: 50%;
                    border: 2px solid #a78bfa;
                    width: 1.25rem;
                    height: 1.25rem;
                    outline: none;
                    cursor: pointer;
                    display: inline-block;
                    position: relative;
                    vertical-align: middle;
                }
                .form-radio:checked {
                    background-color: #6366f1;
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
