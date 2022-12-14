import PropTypes from 'prop-types';
import * as React from 'react';
import classNames from 'classnames';

export type CloseButtonVariant = 'white' | string;

export interface CloseButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: CloseButtonVariant;
}

const propTypes = {
  /** An accessible label indicating the relevant information about the Close Button. */
  'aria-label': PropTypes.string,

  /** A callback fired after the Close Button is clicked. */
  onClick: PropTypes.func,

  /**
   * Render different color variant for the button.
   *
   * Omitting this will render the default dark color.
   */
  variant: PropTypes.oneOf<CloseButtonVariant>(['white']),
};

const defaultProps = {
  'aria-label': 'Close',
};

const CloseButton = React.forwardRef<HTMLButtonElement, CloseButtonProps>(
  ({ className, variant, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      className={classNames(
        'btn-close',
        variant && `btn-close-${variant}`,
        className,
      )}
      {...props}
    />
  ),
);

CloseButton.displayName = 'CloseButton';
CloseButton.propTypes = propTypes;
CloseButton.defaultProps = defaultProps;

export default CloseButton;
