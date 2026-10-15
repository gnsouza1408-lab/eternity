import React from 'react';
import { cn } from '../../lib/utils';

const Card = React.forwardRef(({ className, ...props }, ref) => {
    return (
        <div
            ref={ref}
            className={cn(
                "glass-card rounded-xl p-6 text-card-foreground",
                className
            )}
            {...props}
        />
    );
});
Card.displayName = "Card";

export { Card };
