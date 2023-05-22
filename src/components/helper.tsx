import * as CryptoJS from 'crypto-js';

export interface encryptProps {
    payload: string;
    key: string;
}

export const encrypt = ({ payload, key }: encryptProps): string =>
    CryptoJS.AES.encrypt(payload, CryptoJS.MD5(key).toString()).toString();

export interface decryptProps {
    encrypted: string;
    key: string;
}

export const decrypt = ({ encrypted, key }: decryptProps): string =>
    JSON.parse(
        CryptoJS.AES.decrypt(encrypted, CryptoJS.MD5(key).toString()).toString(
            CryptoJS.enc.Utf8
        )
    );
