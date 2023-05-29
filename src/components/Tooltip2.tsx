import React from 'react';
import classNames from 'classnames';
import TooltipPopoverWrapper, { propTypes } from './TooltipPopoverWrapper';

export interface ITooltipProps {
    placement?: string;
    autohide?: boolean;
    placementPrefix?: string;
    trigger?: string;
    popperClassName?: any;
    innerClassName?: any;
}

export const Tooltip2: React.FC<ITooltipProps> = ({
    placement = 'top',
    autohide = true,
    placementPrefix = 'bs-tooltip',
    trigger = 'hover focus',
    ...propsMain
}) => {
    const props = {
        placement,
        autohide,
        placementPrefix,
        trigger,
        ...propsMain,
    };
    const popperClasses = classNames('tooltip', 'show', props.popperClassName);

    const classes = classNames('tooltip-inner', props.innerClassName);

    return (
        <TooltipPopoverWrapper
            {...props}
            arrowClassName="tooltip-arrow"
            popperClassName={popperClasses}
            innerClassName={classes}
        />
    );
};

export default Tooltip2;
