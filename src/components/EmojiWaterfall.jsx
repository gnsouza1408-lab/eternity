import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

const EMOJIS = ['❤️', '💖', '🌹', '✨', '💕', '🥰', '😍'];

const Particle = ({ emoji, delay, duration, left }) => {
    return (
        <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{
                y: '110vh',
                opacity: [0, 1, 1, 0],
                rotate: [0, 360],
            }}
            transition={{
                duration: duration,
                delay: delay,
                repeat: Infinity,
                ease: "linear"
            }}
            style={{
                position: 'fixed',
                left: `${left}%`,
                top: 0,
                fontSize: Math.random() > 0.5 ? '1.5rem' : '1rem',
                zIndex: -1,
                pointerEvents: 'none',
            }}
        >
            {emoji}
        </motion.div>
    );
};

export function EmojiWaterfall({ selectedEmoji = '❤️' }) {
    const [particles, setParticles] = useState([]);

    useEffect(() => {
        // Generate static particles config
        const count = 40;
        const newParticles = Array.from({ length: count }).map((_, i) => ({
            id: i,
            emoji: selectedEmoji === 'all'
                ? EMOJIS[Math.floor(Math.random() * EMOJIS.length)]
                : selectedEmoji,
            delay: Math.random() * 20, // 0-20s delay
            duration: 10 + Math.random() * 20, // 10-30s duration
            left: Math.random() * 92, // 0-92% da largura (o emoji não pode passar da borda)
        }));
        setParticles(newParticles);
    }, [selectedEmoji]);

    return (
        <>
            {particles.map((p) => (
                <Particle key={p.id} {...p} />
            ))}
        </>
    );
}
