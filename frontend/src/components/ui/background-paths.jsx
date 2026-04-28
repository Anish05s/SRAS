import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

function FloatingPaths({ position }) {
    const paths = Array.from({ length: 36 }, (_, i) => ({
        id: i,
        d: `M-${380 - i * 5 * position} -${189 + i * 6}C-${
            380 - i * 5 * position
        } -${189 + i * 6} -${312 - i * 5 * position} ${216 - i * 6} ${
            152 - i * 5 * position
        } ${343 - i * 6}C${616 - i * 5 * position} ${470 - i * 6} ${
            684 - i * 5 * position
        } ${875 - i * 6} ${684 - i * 5 * position} ${875 - i * 6}`,
        color: `rgba(99,102,241,${0.05 + i * 0.02})`,
        width: 0.5 + i * 0.03,
    }));

    return (
        <div className="absolute inset-0 pointer-events-none">
            <svg
                className="w-full h-full text-indigo-500"
                viewBox="0 0 696 316"
                fill="none"
            >
                <title>Background Paths</title>
                {paths.map((path) => (
                    <motion.path
                        key={path.id}
                        d={path.d}
                        stroke="currentColor"
                        strokeWidth={path.width}
                        strokeOpacity={0.05 + path.id * 0.02}
                        initial={{ pathLength: 0.3, opacity: 0.2 }}
                        animate={{
                            pathLength: 1,
                            opacity: [0.1, 0.3, 0.1],
                            pathOffset: [0, 1, 0],
                        }}
                        transition={{
                            duration: 20 + Math.random() * 10,
                            repeat: Number.POSITIVE_INFINITY,
                            ease: "linear",
                        }}
                    />
                ))}
            </svg>
        </div>
    );
}

export function BackgroundPaths({ title = "Smart Resource Allocation", children }) {
    const words = title ? title.split(" ") : [];

    return (
        <div className="relative w-full min-h-screen flex items-center justify-center overflow-hidden py-12" style={{ background: 'var(--bg-primary)' }}>
            <div className="absolute inset-0">
                <FloatingPaths position={1} />
                <FloatingPaths position={-1} />
            </div>

            {/* Content Layer */}
            <div className="relative z-10 w-full flex flex-col items-center justify-center gap-8 py-12">
                {title && (
                    <motion.h1 
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 1 }}
                        className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tighter select-none"
                        style={{ 
                            fontFamily: 'Inter, sans-serif',
                            background: 'linear-gradient(to bottom, #fff 0%, #6366f1 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            filter: 'drop-shadow(0 0 20px rgba(99,102,241,0.2))'
                        }}
                    >
                        {title}
                    </motion.h1>
                )}
                
                <div className="w-full flex items-center justify-center">
                    {children}
                </div>
            </div>
        </div>
    );
}
