import React from 'react';
import { cn } from '../../lib/utils';
import { MotionConfig, motion } from 'framer-motion';

const Button = React.forwardRef(({ className, variant = 'primary', size = 'default', asChild = false, ...props }, ref) => {
    const Comp = asChild ? 'span' : 'button';

    const variants = {
        primary: "bg-rose-600 hover:bg-rose-500 text-white shadow-[0_0_20px_rgba(225,29,72,0.3)] hover:shadow-[0_0_30px_rgba(225,29,72,0.5)] border border-rose-500/50",
        secondary: "bg-white/5 hover:bg-white/10 text-white border border-white/10 hover:border-white/20",
        ghost: "bg-transparent hover:bg-white/5 text-gray-300 hover:text-white",
    };

    const sizes = {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-12 rounded-md px-8 text-lg",
        icon: "h-10 w-10",
    };

    return (
        <motion.button
            whileTap={{ scale: 0.95 }}
            className={cn(
                "inline-flex items-center justify-center rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-rose-500 disabled:pointer-events-none disabled:opacity-50",
                variants[variant],
                sizes[size],
                className
            )}
            ref={ref}
            {...props}
        />
    );
});
Button.displayName = "Button";

export { Button };
