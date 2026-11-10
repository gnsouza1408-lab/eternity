import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Heart, Calendar, Clock, Music as MusicIcon } from 'lucide-react';
import { EmojiWaterfall } from '../components/EmojiWaterfall';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { supabase } from '../lib/supabaseClient';

const TimeBlock = ({ value, label }) => (
    <div className="flex flex-col items-center mx-2 md:mx-4">
        <span className="text-3xl md:text-5xl font-serif font-bold text-white mb-1 drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
            {String(value).padStart(2, '0')}
        </span>
        <span className="text-xs md:text-sm text-rose-200/80 uppercase tracking-widest">{label}</span>
    </div>
);

export default function Portal() {
    const { slug } = useParams();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [currentPhoto, setCurrentPhoto] = useState(0);
    const playerRef = useRef(null);
    const timerRef = useRef(null);

    const formatTime = (seconds) => {
        if (!seconds) return "0:00";
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };
    const [isStarted, setIsStarted] = useState(false);

    useEffect(() => {
        // Load data from Supabase
        const loadPortal = async () => {
            try {
                setLoading(true);
                // Função pública: devolve só campos públicos (sem e-mail) e só se pago
                const { data: rows, error } = await supabase.rpc('get_public_portal', { p_slug: slug });
                if (error) {
                    console.error("Error fetching portal:", error);
                }

                if (rows && rows.length) {
                    setData({ ...rows[0], status: 'paid' });
                } else if (!error) {
                    // Não pago ou inexistente: só o status, para mostrar "Aguardando Pagamento"
                    const { data: status } = await supabase.rpc('get_portal_status', { p_slug: slug });
                    if (status) setData({ status });
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };

        loadPortal();
    }, [slug]);

    useEffect(() => {
        if (!data?.date) return;

        const interval = setInterval(() => {
            // Append T00:00:00 to ensure we count from the start of that day in local time
            // If the input is YYYY-MM-DD, new Date() treats it as UTC, which might be day before in negative timezones.
            // Using replace(/-/g, '/') sometimes helps cross-browser or appending time.
            // Safest: Create date object parts
            const dateParts = data.date.split('-');
            let start;
            if (dateParts.length === 3) {
                start = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]).getTime();
            } else {
                start = new Date(data.date).getTime();
            }

            const now = new Date().getTime();
            const difference = now - start;

            if (difference > 0) {
                setTimeLeft({
                    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
                    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
                    minutes: Math.floor((difference / 1000 / 60) % 60),
                    seconds: Math.floor((difference / 1000) % 60),
                });
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [data]);

    // YouTube API Logic
    useEffect(() => {
        if (!data?.music) return;

        // Extract ID
        const getYoutubeId = (url) => {
            const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
            const match = url.match(regExp);
            return (match && match[2].length === 11) ? match[2] : null;
        };
        const videoId = getYoutubeId(data.music);

        if (videoId && isStarted) {
            // Load player
            const initPlayer = () => {
                playerRef.current = new window.YT.Player('youtube-player', {
                    height: '0',
                    width: '0',
                    videoId: videoId,
                    playerVars: {
                        'playsinline': 1,
                        'controls': 0,
                        'loop': 1,
                        'playlist': videoId
                    },
                    events: {
                        'onReady': (event) => {
                            event.target.playVideo();
                            setIsPlaying(true);
                            setDuration(event.target.getDuration());
                        },
                        'onStateChange': (event) => {
                            if (event.data === window.YT.PlayerState.PLAYING) {
                                setIsPlaying(true);
                                timerRef.current = setInterval(() => {
                                    setCurrentTime(playerRef.current.getCurrentTime());
                                }, 1000);
                            } else {
                                setIsPlaying(false);
                                clearInterval(timerRef.current);
                            }
                        }
                    }
                });
            };

            if (window.YT && window.YT.Player) {
                initPlayer();
            } else {
                const tag = document.createElement('script');
                tag.src = "https://www.youtube.com/iframe_api";
                const firstScriptTag = document.getElementsByTagName('script')[0];
                firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
                window.onYouTubeIframeAPIReady = initPlayer;
            }
        }
    }, [data, isStarted]);

    const togglePlay = () => {
        if (!playerRef.current) return;
        if (isPlaying) {
            playerRef.current.pauseVideo();
        } else {
            playerRef.current.playVideo();
        }
        setIsPlaying(!isPlaying);
    };

    useEffect(() => {
        // Photo slideshow
        if (!data?.photos?.length) return;
        const interval = setInterval(() => {
            setCurrentPhoto(prev => (prev + 1) % data.photos.length);
        }, 5000);
        return () => clearInterval(interval);
    }, [data?.photos]);


    const getYoutubeId = (url) => {
        if (!url) return null;
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    };

    const validVideoId = data?.music ? getYoutubeId(data.music) : null;

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-rose-500"></div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <h1 className="text-2xl mb-4">Portal não encontrado 💔</h1>
                    <p className="text-gray-400">Verifique o link ou crie um novo.</p>
                </div>
            </div>
        )
    }

    if (data.status !== 'paid') {
        return (
            <div className="flex items-center justify-center min-h-screen p-4">
                <div className="text-center max-w-md bg-white/5 p-8 rounded-2xl border border-white/10">
                    <div className="h-16 w-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-yellow-500/50">
                        <Clock className="h-8 w-8 text-yellow-500" />
                    </div>
                    <h1 className="text-2xl font-serif font-bold mb-2">Aguardando Pagamento</h1>
                    <p className="text-gray-400 mb-6">
                        Este portal ainda não foi ativado. Se você acabou de pagar, aguarde alguns instantes.
                    </p>
                    <p className="text-xs text-gray-500">
                        Dúvidas? Entre em contato com o suporte.
                    </p>
                </div>
            </div>
        )
    }



    if (!isStarted) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl">
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-center"
                >
                    <h1 className="font-serif text-3xl md:text-5xl mb-8">Bem-vindo ao nosso mundo</h1>
                    <Button
                        size="lg"
                        className="rounded-full px-12 py-8 text-xl animate-pulse"
                        onClick={() => setIsStarted(true)}
                    >
                        <Heart className="mr-3 fill-current" /> Entrar
                    </Button>
                </motion.div>
            </div>
        )
    }

    return (
        <div className="min-h-screen py-12 px-4 relative overflow-hidden flex flex-col items-center">
            {/* Background Elements */}
            <EmojiWaterfall selectedEmoji={data.emoji} />
            <div className="fixed inset-0 bg-gradient-to-t from-rose-900/10 via-transparent to-transparent pointer-events-none" />

            {/* Header */}
            <header className="text-center mb-16 relative z-10">
                <motion.div
                    initial={{ y: -50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 1 }}
                >
                    <h1 className="font-serif text-5xl md:text-7xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-white via-rose-100 to-white pb-2">
                        {data.title}
                    </h1>
                    <div className="inline-flex items-center gap-2 text-rose-300/80 bg-white/5 px-4 py-2 rounded-full backdrop-blur-sm border border-white/5">
                        <Calendar className="h-4 w-4" />
                        <span>Desde {new Date(data.date + 'T00:00:00').toLocaleDateString()}</span>
                    </div>
                </motion.div>
            </header>

            {/* Counter */}
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.8 }}
                className="mb-20 glass-card p-8 md:p-12 rounded-3xl border-rose-500/20 shadow-[0_0_100px_rgba(225,29,72,0.1)]"
            >
                <div className="flex flex-wrap justify-center gap-4 md:gap-8">
                    <TimeBlock value={timeLeft.days} label="Dias" />
                    <div className="text-4xl font-serif text-rose-500/50 mt-2">:</div>
                    <TimeBlock value={timeLeft.hours} label="Horas" />
                    <div className="text-4xl font-serif text-rose-500/50 mt-2">:</div>
                    <TimeBlock value={timeLeft.minutes} label="Min" />
                    <div className="text-4xl font-serif text-rose-500/50 mt-2">:</div>
                    <TimeBlock value={timeLeft.seconds} label="Seg" />
                </div>
                <p className="text-center mt-8 text-lg font-serif italic text-gray-300">"Juntos construindo nossa eternidade"</p>
            </motion.div>

            {/* Photos & Message */}
            <div className="grid md:grid-cols-2 gap-8 w-full max-w-5xl mx-auto mb-20">
                {/* Photo Frame */}
                <motion.div
                    initial={{ x: -50, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.8 }}
                    className="md:order-1"
                >
                    <div className="relative aspect-[4/5] w-full rounded-2xl overflow-hidden glass p-2 rotate-[-2deg] hover:rotate-0 transition-transform duration-500 shadow-2xl">
                        <AnimatePresence mode="wait">
                            {data.photos.length > 0 ? (
                                <motion.div
                                    key={currentPhoto}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 1 }}
                                    className="absolute inset-0 w-full h-full bg-black/50"
                                >
                                    {/* Blurred Background for ambiance */}
                                    <img
                                        src={data.photos[currentPhoto]}
                                        className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-50 scale-110"
                                        alt=""
                                    />

                                    {/* Main Image - Fully Visible */}
                                    <motion.img
                                        src={data.photos[currentPhoto]}
                                        initial={{ scale: 1.05 }}
                                        animate={{ scale: 1 }}
                                        transition={{ duration: 3, ease: "easeOut" }}
                                        className="relative w-full h-full object-contain z-10 will-change-transform"
                                        alt="Momentos"
                                    />
                                </motion.div>
                            ) : (
                                <div className="w-full h-full bg-white/5 flex items-center justify-center rounded-xl">
                                    <span className="text-gray-500">Sem fotos</span>
                                </div>
                            )}
                        </AnimatePresence>


                    </div>

                    {/* Integrated Music Player below photos */}
                    {validVideoId && (
                        <div className="mt-6 mx-4">
                            <div className="glass-card p-3 rounded-2xl flex items-center gap-4 bg-black/60 backdrop-blur-xl border-white/10 shadow-2xl relative overflow-hidden group">

                                {/* Blurred Background Ambient */}
                                <div
                                    className="absolute inset-0 opacity-20 bg-cover bg-center blur-xl pointer-events-none"
                                    style={{ backgroundImage: `url(https://img.youtube.com/vi/${validVideoId}/mqdefault.jpg)` }}
                                />

                                {/* Thumbnail */}
                                <div className="relative h-16 w-16 flex-shrink-0 rounded-lg overflow-hidden shadow-lg border border-white/10">
                                    <img
                                        src={`https://img.youtube.com/vi/${validVideoId}/mqdefault.jpg`}
                                        className="w-full h-full object-cover scale-110"
                                        alt="Music Cover"
                                    />
                                    <div className="absolute inset-0 bg-black/20" />
                                </div>

                                {/* Info & Progress */}
                                <div className="flex-1 min-w-0 flex flex-col justify-center gap-1 z-10">
                                    <div className="flex flex-col">
                                        <span className="text-white font-bold text-sm truncate leading-tight">
                                            {data.musicName || 'Nossa Música Especial'}
                                        </span>
                                        <span className="text-[10px] text-rose-300 uppercase tracking-widest font-bold opacity-80">
                                            Trilha Sonora
                                        </span>
                                    </div>

                                    {/* Progress Bar & Time */}
                                    <div className="flex flex-col gap-1 w-full max-w-[200px]">
                                        <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                                            <motion.div
                                                className="h-full bg-rose-500 rounded-full"
                                                animate={{ width: `${(currentTime / duration) * 100}%` }}
                                                transition={{ ease: "linear", duration: 0.5 }}
                                            />
                                        </div>
                                        <div className="flex justify-between text-[9px] text-gray-400 font-medium">
                                            <span>{formatTime(currentTime)}</span>
                                            <span>{formatTime(duration)}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Controls */}
                                <button
                                    onClick={togglePlay}
                                    className="h-12 w-12 bg-white rounded-full flex-shrink-0 flex items-center justify-center hover:scale-105 hover:bg-gray-200 transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)] active:scale-95 z-10"
                                >
                                    {isPlaying ?
                                        <Pause className="fill-black text-black h-5 w-5" /> :
                                        <Play className="fill-black text-black h-5 w-5 ml-1" />
                                    }
                                </button>
                            </div>
                        </div>
                    )}
                </motion.div>

                {/* Message */}
                <motion.div
                    initial={{ x: 50, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 1 }}
                    className="flex flex-col justify-center md:order-2"
                >
                    <Card className="p-10 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-3 opacity-20 group-hover:opacity-40 transition-opacity">
                            <Heart className="h-20 w-20 text-rose-500 rotate-12" />
                        </div>
                        <h3 className="font-serif text-2xl font-bold mb-6 flex items-center gap-3">
                            <span className="h-px flex-1 bg-white/20"></span>
                            <span className="text-rose-300">Declaração</span>
                            <span className="h-px flex-1 bg-white/20"></span>
                        </h3>
                        <p className="text-lg leading-loose font-serif text-gray-200 whitespace-pre-wrap">
                            {data.message}
                        </p>
                        <div className="mt-8 text-right">
                            <span className="font-dancing text-xl text-rose-400">Com amor, para sempre</span>
                        </div>
                    </Card>
                </motion.div>
            </div>

            <div id="youtube-player" className="hidden"></div>


        </div>
    );
}
