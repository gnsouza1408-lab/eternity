import React from 'react';

export function Background() {
    return (
        <>
            <div className="fixed inset-0 z-[-2] bg-dark" />
            <div className="stardust-bg" />

            {/* Orbs: camada que recorta, para as bolhas nunca aumentarem a largura da página */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-rose-900/20 rounded-full blur-[120px] animate-pulse-slow" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-rose-600/10 rounded-full blur-[150px] animate-pulse-slow" style={{ animationDelay: '1.5s' }} />
            </div>
        </>
    );
}
