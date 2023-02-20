import React, { FC, Fragment } from 'react';

export interface ReactionsProps {
    error: any;
    touched?: boolean;
}

export const Reactions: FC<ReactionsProps> = ({
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

export default Reactions;
