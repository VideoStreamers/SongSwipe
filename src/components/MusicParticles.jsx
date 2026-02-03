import React, { useEffect, useRef } from 'react';

const MusicParticles = ({ color = '#1DB954' }) => {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        let width = canvas.width = window.innerWidth;
        let height = canvas.height = window.innerHeight;

        let particles = [];
        const particleCount = 25;

        const musicalNotes = ['♪', '♫', '♬', '♭', '♮', '♯'];

        class Particle {
            constructor() {
                this.reset();
            }

            reset() {
                this.x = Math.random() * width;
                this.y = Math.random() * height;
                this.vx = (Math.random() - 0.5) * 1;
                this.vy = (Math.random() - 0.5) * 1;
                this.size = Math.random() * 20 + 10;
                this.alpha = Math.random() * 0.3 + 0.1;
                this.type = Math.floor(Math.random() * 3); // 0: Circle, 1: Square, 2: Note
                this.note = musicalNotes[Math.floor(Math.random() * musicalNotes.length)];
                this.rotation = Math.random() * Math.PI * 2;
                this.rotationSpeed = (Math.random() - 0.5) * 0.02;
            }

            update() {
                this.x += this.vx;
                this.y += this.vy;
                this.rotation += this.rotationSpeed;

                if (this.x < -50) this.x = width + 50;
                if (this.x > width + 50) this.x = -50;
                if (this.y < -50) this.y = height + 50;
                if (this.y > height + 50) this.y = -50;
            }

            draw() {
                ctx.save();
                ctx.translate(this.x, this.y);
                ctx.rotate(this.rotation);
                ctx.globalAlpha = this.alpha;
                ctx.fillStyle = color;

                if (this.type === 0) {
                    ctx.beginPath();
                    ctx.arc(0, 0, this.size / 2, 0, Math.PI * 2);
                    ctx.fill();
                } else if (this.type === 1) {
                    ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
                } else {
                    ctx.font = `${this.size}px Arial`;
                    ctx.fillText(this.note, 0, 0);
                }
                ctx.restore();
            }
        }

        for (let i = 0; i < particleCount; i++) {
            particles.push(new Particle());
        }

        let animationId;
        const animate = () => {
            ctx.clearRect(0, 0, width, height);

            particles.forEach(p => {
                p.update();
                p.draw();
            });

            animationId = requestAnimationFrame(animate);
        };

        animate();

        const handleResize = () => {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
            particles.forEach(p => p.reset());
        };

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            cancelAnimationFrame(animationId);
        };
    }, [color]);

    return (
        <canvas
            ref={canvasRef}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                zIndex: 0
            }}
        />
    );
};

export default MusicParticles;
