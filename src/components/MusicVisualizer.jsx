import React, { useEffect, useRef } from 'react';
import { audioManager } from '../services/audioManager';
import './MusicVisualizer.css';

const MusicVisualizer = ({ isActive }) => {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const animationIdRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        let animationId;

        const render = () => {
            if (!isActive) {
                // If paused, just draw a low constant hum or fade out
                // For now, we stop updating to save battery, or we can animate a slow "breathing" line
                // But let's keep it simple: just stop drawing new frames but keep the last one (or clear)
                // Actually, user wants "animates up/down", so even when paused maybe it should sleep?
                // Let's keep loop running but check isActive inside to decide WHAT to draw
            }

            const data = audioManager.getFrequencyData(); // Uint8Array [0-255]
            const bufferLength = data.length; // 32

            // Clear
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Draw Bars
            const barWidth = (canvas.width / bufferLength) * 2.5;
            let x = 0;

            for (let i = 0; i < bufferLength; i++) {
                const barHeight = (data[i] / 255) * canvas.height; // Scale to height

                // Color: Use CSS variable or static gradient
                // We'll use a gradient based on height
                const gradient = ctx.createLinearGradient(0, canvas.height, 0, canvas.height - barHeight);
                gradient.addColorStop(0, 'rgba(29, 185, 84, 0.2)'); // Dark Green base
                gradient.addColorStop(1, 'rgba(29, 185, 84, 0.8)'); // Bright Green top

                ctx.fillStyle = gradient;

                // Rounded top? 
                // Simple rect for performance
                if (isActive) {
                    ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
                } else {
                    // "Sleeping" state visual
                    ctx.fillStyle = 'rgba(255,255,255,0.05)';
                    ctx.fillRect(x, canvas.height - 5, barWidth, 5);
                }

                x += barWidth + 2;
            }

            animationId = requestAnimationFrame(render);
        };

        // Initialize Audio Context (user interaction required normally, but we call init on Play)
        // audioManager.init(); 

        render();

        return () => {
            cancelAnimationFrame(animationId);
        };
    }, [isActive]);

    // Handle Resize
    useEffect(() => {
        const handleResize = () => {
            if (canvasRef.current && containerRef.current) {
                canvasRef.current.width = containerRef.current.offsetWidth;
                canvasRef.current.height = containerRef.current.offsetHeight;
            }
        };
        window.addEventListener('resize', handleResize);
        handleResize(); // Initial size
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <div className="music-visualizer-container" ref={containerRef}>
            <canvas ref={canvasRef} className="visualizer-canvas" />
        </div>
    );
};

export default MusicVisualizer;
