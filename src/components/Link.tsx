import React from 'react';

export interface LinkProps {
    href: string;
    target?: string;
    children: React.ReactNode;
}

export const Link: React.FC<LinkProps> = React.forwardRef<
    HTMLAnchorElement,
    LinkProps
>(({ href, children, ...props }, ref) => {
    return (
        <a href={href} target={props?.target} {...props} ref={ref}>
            {children}
        </a>
    );
});
export default Link;
