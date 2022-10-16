import React, { FC, Fragment } from 'react';

export interface ErrorMessagesProps {
    error: any;
    touched?: boolean;
}

export const ErrorMessages: FC<ErrorMessagesProps> = ({
    error,
    touched = true,
}) => {
    return (
        <Fragment>
            {!!error && touched && (
                <div className="invalid-feedback" style={{ display: 'block' }}>
                    {error}
                </div>
            )}
        </Fragment>
    );
};

export default ErrorMessages;
