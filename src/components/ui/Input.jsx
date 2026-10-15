import React from 'react';
import { cn } from '../../lib/utils';

const Input = React.forwardRef(({ className, type, ...props }, ref) => {
    return (
        <input
            type={type}
            className={cn(
                "flex h-10 w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:border-rose-500/50 focus:outline-none focus:ring-1 focus:ring-rose-500/50 disabled:cursor-not-allowed disabled:opacity-50 transition-all relative z-10",
                className
            )}
            ref={ref}
            {...props}
        />
    );
});
Input.displayName = "Input";

export { Input };
