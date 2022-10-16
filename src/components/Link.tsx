import React, { FC } from 'react';

export interface LinkProps {
    href: string;
    target?: string;
    children: React.ReactNode;
}

export const Link: FC<LinkProps> = ({ href, children, ...props }) => {
    return (
        <a href={href} target={props?.target} {...props}>
            {children}
        </a>
    );
};
export default Link;
