import React from 'react';
import { motion } from 'framer-motion';
import './MusicVisualizer.css';

const MusicVisualizer = ({ isActive, tempo = 120 }) => {
    // Generate 20 bars
    const bars = Array.from({ length: 20 });

    // Convert tempo to animation duration (approx)
    // 120 BPM = 0.5s beat. 
    const duration = 60 / tempo;

    return (
        <div className="music-visualizer-container">
            <div className="visualizer-content">
                {bars.map((_, i) => (
                    <motion.div
                        key={i}
                        className="eq-bar"
                        animate={isActive ? {
                            height: [20, Math.random() * 150 + 50, 20],
                            opacity: [0.3, 0.6, 0.3]
                        } : {
                            height: 20,
                            opacity: 0.1
                        }}
                        transition={{
                            repeat: Infinity,
                            duration: duration + (Math.random() * 0.2), // Randomize slightly so they aren't robotic
                            ease: "easeInOut",
                            delay: i * 0.05
                        }}
                    />
                ))}
            </div>
        </div>
    );
};

export default MusicVisualizer;
