
const AnimatedBackground = () => {
    return (
        <div className="animated-background">
            <div
                className="gradient-orb orb-1"
                style={{ background: `radial-gradient(circle, var(--vibe-primary, #1DB954) 0%, transparent 70%)` }}
            />
            <div
                className="gradient-orb orb-2"
                style={{ background: `radial-gradient(circle, var(--vibe-secondary, #050505) 0%, transparent 70%)` }}
            />
            <div className="noise-overlay" />
        </div>
    );
};

export default AnimatedBackground;
