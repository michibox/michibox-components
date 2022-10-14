import classNames from 'classnames';
import * as React from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    useButtonProps,
    ButtonProps as BaseButtonProps,
} from '@restart/ui/Button';
import { useBootstrapPrefix } from './ThemeProvider';
import { BsPrefixProps, BsPrefixRefForwardingComponent } from './helpers';
import { ButtonVariant } from './types';

const faAsterisk = {
    prefix: 'fal',
    iconName: 'asterisk',
    icon: [
        448,
        512,
        [10033, 61545],
        '2a',
        'M413.8 368.1C410.8 373.2 405.5 376 399.1 376c-2.766 0-5.562-.7187-8.125-2.219L240 284V464c0 8.844-7.156 16-15.1 16S208 472.8 208 464V284l-151.9 89.73C53.58 375.3 50.79 376 48.02 376c-5.469 0-10.8-2.812-13.8-7.859c-4.484-7.609-1.969-17.42 5.641-21.92L192.5 256L39.86 165.8c-7.609-4.5-10.12-14.31-5.641-21.92c4.531-7.578 14.31-10.06 21.92-5.641L208 227.1V48C208 39.16 215.2 32 224 32S240 39.16 240 48v179.1l151.9-89.73c7.641-4.422 17.42-1.938 21.92 5.641c4.484 7.609 1.969 17.42-5.641 21.92L255.5 256l152.7 90.22C415.7 350.7 418.3 360.5 413.8 368.1z',
    ],
};
export interface ButtonProps
    extends BaseButtonProps,
        Omit<BsPrefixProps, 'as'> {
    active?: boolean;
    variant?: ButtonVariant;
    size?: 'sm' | 'lg';
    icon?: string | object;
    loading?: boolean;
    label?: string;
}

export type CommonButtonProps = 'href' | 'size' | 'variant' | 'disabled';

const propTypes = {
    /**
     * @default 'btn'
     */
    bsPrefix: PropTypes.string,
    /**
     * @default 'label'
     */
    label: PropTypes.string,

    /**
     * One or more button variant combinations
     *
     * buttons may be one of a variety of visual variants such as:
     *
     * `'primary', 'secondary', 'success', 'danger', 'warning', 'info', 'dark', 'light', 'link'`
     *
     * as well as "outline" versions (prefixed by 'outline-*')
     *
     * `'outline-primary', 'outline-secondary', 'outline-success', 'outline-danger', 'outline-warning', 'outline-info', 'outline-dark', 'outline-light'`
     */
    variant: PropTypes.string,

    /**
     * Specifies a large or small button.
     *
     * @type ('sm'|'lg')
     */
    size: PropTypes.string,

    /**
     * Specifies class icon.
     *
     */
    icon: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),

    /** Manually set the visual state of the button to `:active` */
    active: PropTypes.bool,

    /** Manually set the visual state of the button to `:loading` */
    loading: PropTypes.bool,
    /**
     * Disables the Button, preventing mouse events,
     * even if the underlying component is an `<a>` element
     */
    disabled: PropTypes.bool,

    /** Providing a `href` will render an `<a>` element, _styled_ as a button. */
    href: PropTypes.string,

    /**
     * Defines HTML button type attribute.
     *
     * @default 'button'
     */
    type: PropTypes.oneOf(['button', 'reset', 'submit', null]),

    as: PropTypes.elementType,
};

const defaultProps = {
    variant: 'primary',
    active: false,
    disabled: false,
    loading: false,
};

export const Button: BsPrefixRefForwardingComponent<'button', ButtonProps> =
    React.forwardRef<HTMLButtonElement, ButtonProps>(
        (
            {
                as,
                bsPrefix,
                variant,
                size,
                loading,
                label,
                icon,
                children,
                active,
                className,
                ...props
            },
            ref
        ) => {
            const prefix = useBootstrapPrefix(bsPrefix, 'btn');
            const [buttonProps, { tagName }] = useButtonProps({
                tagName: as,
                ...props,
            });

            const Component = tagName as React.ElementType;

            if (loading) {
                props.disabled = true;
                icon = faAsterisk; /* 'fal fa-asterisk fa-spin'; traditional */
            }

            const getIcon = (valueIcon: any) => {
                if (typeof valueIcon === 'string') {
                    return <i className={valueIcon}></i>;
                }

                const classNameSpin = classNames(loading && 'fa-spin');

                return (
                    <FontAwesomeIcon
                        icon={valueIcon}
                        className={classNameSpin}
                    />
                );
            };

            return (
                <Component
                    {...buttonProps}
                    {...props}
                    ref={ref}
                    className={classNames(
                        className,
                        prefix,
                        active && 'active',
                        variant && `${prefix}-${variant}`,
                        size && `${prefix}-${size}`,
                        props.href && props.disabled && 'disabled',
                        loading && 'disabled'
                    )}
                >
                    {icon && getIcon(icon)} {label ? label : children}
                </Component>
            );
        }
    );

Button.displayName = 'Button';
Button.propTypes = propTypes;
Button.defaultProps = defaultProps;
export default Button;