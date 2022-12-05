import React, { useRef, useState, Fragment } from 'react';
import Button from './Button';
import Form from './Form';

export interface FileUploadProps {
    accept?: string;
    feedback: string;
    showButton?: boolean;
    placeHolder: string;
    onFileSelectSuccess: any;
    onFileSelectError: any;
    variant?: string;
    disabled?: boolean;
    maxFile?: string;
}
const FileUpload: React.FC<FileUploadProps> = React.forwardRef<
    HTMLElement,
    FileUploadProps
>(
    (
        {
            accept = '.jpg,.jpeg,.png,image/png,image/jpeg',
            feedback = '',
            showButton = true,
            placeHolder,
            onFileSelectSuccess,
            onFileSelectError,
            variant = 'outline-primary',
            disabled = false,
            maxFile = '5',
            ...props
        },
        ref
    ) => {
        const fileInput = useRef<HTMLInputElement | null>(null);
        let [filename, setFileName] = useState('Subir archivo');
        let [fileTmp, setFileTmp] = useState<File | null>(null);

        const filterBySize = (file: File | Blob) => {
            const total = (file.size / (1024 * 1024)).toString();
            const fileSize = parseFloat(total).toFixed(2);
            return fileSize > maxFile;
        };

        const validateFile = (value: string) => {
            const ext = accept.split(','); //accept
            return ext.some((el) => value.endsWith(el));
        };

        const handleFileChange = (
            event: React.ChangeEvent<HTMLInputElement>
        ) => {
            // handle validations

            if (
                typeof event.target.files != 'undefined' &&
                event.target.files
            ) {
                const file: File = event.target.files[0];

                if (event.target.value.length == 0) {
                    return false;
                }
                if (!validateFile(file.name)) {
                    onFileSelectError({
                        error: 'El formato es incorrecto',
                    });
                    return false;
                } else if (filterBySize(file)) {
                    onFileSelectError({
                        error: ' El tamaño del archivo no puede exceder más de 5 MB',
                    });
                    return false;
                } else {
                    setFileTmp(file);
                    setFileName(file.name);
                    onFileSelectSuccess(file);
                }
            } else {
                alert('Este navegador no es compatible con HTML5.');
            }
        };
        const handleClick = () => {
            /*Collecting node-element and performing click*/
            fileInput?.current?.click();
        };

        return (
            <Fragment>
                <Form.File
                    readOnly={disabled}
                    disabled={disabled}
                    {...props}
                    feedback={feedback}
                    ref={fileInput}
                    type="file"
                    accept={accept}
                    className={`${!fileTmp && 'button-file-empty'}`}
                    label={placeHolder && !fileTmp ? placeHolder : filename}
                    onChange={handleFileChange}
                    custom
                />
                <div className="upload-button">
                    {!disabled && (
                        <Button onClick={() => handleClick()} variant={variant}>
                            Buscar
                        </Button>
                    )}
                </div>
            </Fragment>
        );
    }
);

export default FileUpload;
