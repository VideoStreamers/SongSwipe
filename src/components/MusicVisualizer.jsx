import React, { useEffect, useRef } from 'react';
import { audioManager } from '../services/audioManager';
import './MusicVisualizer.css';

const MusicVisualizer = ({ isActive, color }) => {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        let animationId;

        const render = () => {
            const data = audioManager.getFrequencyData(); // Uint8Array [0-255]
            const bufferLength = data.length;

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // BLURRY EDGES for the bars themselves (High performance cost, but good for aesthetic)
            ctx.filter = 'blur(12px)';
            ctx.globalCompositeOperation = 'screen'; // GLOW EFFECT

            // Calculate spacing based on increased FFT (256 bins -> ~128 usable)
            const barWidth = (canvas.width / bufferLength) * 2;
            let x = 0;

            for (let i = 0; i < bufferLength; i++) {
                // Scale value
                const value = data[i];
                const barHeight = (value / 255) * canvas.height * 0.9;

                // Determine Fill Color with Transparency
                let fillStyle;
                if (color) {
                    if (color.startsWith('rgb')) {
                        const base = color.replace('rgb', 'rgba').replace(')', '');
                        const gradient = ctx.createLinearGradient(0, canvas.height, 0, canvas.height - barHeight);
                        // LIGHTER / BRIGHTER OPACITY (0.3 -> 0.8)
                        gradient.addColorStop(0, `${base}, 0.3)`);
                        gradient.addColorStop(1, `${base}, 0.8)`);
                        fillStyle = gradient;
                    } else {
                        // Hex or other? Fallback
                        fillStyle = 'rgba(255, 255, 255, 0.4)';
                    }
                } else {
                    // Simple Green Tint Default
                    const gradient = ctx.createLinearGradient(0, canvas.height, 0, canvas.height - barHeight);
                    gradient.addColorStop(0, 'rgba(29, 185, 84, 0.3)');
                    gradient.addColorStop(1, 'rgba(29, 185, 84, 0.8)');
                    fillStyle = gradient;
                }

                ctx.fillStyle = fillStyle;

                if (isActive) {
                    ctx.beginPath();
                    // Draw rounded rect manually-ish or just rect
                    if (ctx.roundRect) ctx.roundRect(x, canvas.height - barHeight, barWidth, barHeight, 10);
                    else ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
                    ctx.fill();
                } else {
                    // Sleep mode: Tiny bars
                    ctx.fillStyle = 'rgba(255,255,255,0.05)';
                    ctx.fillRect(x, canvas.height - 4, barWidth, 4);
                }

                x += barWidth + 2;
            }

            animationId = requestAnimationFrame(render);
        };

        render();

        return () => {
            cancelAnimationFrame(animationId);
        };
    }, [isActive, color]); // Re-init if color changes

    // Handle Resize
    useEffect(() => {
        const handleResize = () => {
            if (canvasRef.current && containerRef.current) {
                canvasRef.current.width = containerRef.current.offsetWidth;
                canvasRef.current.height = containerRef.current.offsetHeight;
            }
        };
        window.addEventListener('resize', handleResize);
        handleResize();
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <div className="music-visualizer-container" ref={containerRef}>
            <canvas ref={canvasRef} className="visualizer-canvas" />
        </div>
    );
};

export default MusicVisualizer;
