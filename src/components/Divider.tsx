import React, { FC } from 'react';

export interface DividerProps {}

export const Divider: FC<DividerProps> = () => {
    return <div style={{ padding: '0.02rem', backgroundColor: '#ececec' }} />;
};
export default Divider;
