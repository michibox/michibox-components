import React, { Fragment } from 'react';
import OriginSelect, { GroupBase, Props } from 'react-select';
import { components } from 'react-select';

const { Option } = components;
const IconOption = (props: any) => (
    <Option {...props}>
        {props.data.icon && (
            <i className={props.data.icon} style={{ marginRight: 10 }} />
        )}
        {props.data.label}
    </Option>
);

interface SingleValueProps {
    selectProps: any;
    data: any;
}
const SingleValue: React.FC<SingleValueProps> = ({ selectProps, data }) => {
    return (
        <div className="michibox-select" style={{ display: 'inline-flex' }}>
            {data.icon && (
                <i className={data.icon} style={{ marginRight: 10 }} />
            )}
            <span>{selectProps.getOptionLabel(data)}</span>
        </div>
    );
};

export interface SelectProps {
    isSearchable: boolean;
    isClearable: boolean;
    isDisabled: boolean;
    isLoading: boolean;
    isLogin: boolean;
    name?: string;
    onChange?: any;
    onBlur?: any;
    options: any;
    defaultValue: any;
    error?: any;
    touched?: any;
    backgroundColor?: any;

    value?: any;
    onInputChange?: (values: any) => void;
    loadingMessage?: () => void;
}

const Select = React.forwardRef<HTMLInputElement, SelectProps>(
    (
        {
            isSearchable = false,
            isClearable = false,
            isDisabled = false,
            isLoading = false,
            isLogin = false,
            backgroundColor = null,
            onInputChange,
            touched = true,
            loadingMessage = () => 'Buscando...',
            ...props
        }: SelectProps,
        ref
    ) => {
        const handleChange = (event: any, options: any) => {
            // this is going to call setFieldValue and manually update values.topcis
            if (props.name) {
                props.onChange({
                    name: props.name,
                    value: event ? event.value : null,
                    event: event || null,
                    options: options || null,
                });
            } else {
                props.onChange({
                    value: event ? event.value : null,
                    event: event || null,
                    options: options || null,
                });
            }
        };

        const handleBlur = () => {
            // this is going to call setFieldTouched and manually update touched.topcis
            if (props.onBlur) {
                props.onBlur(props.name, true);
            }
        };

        const customLoginStyles = {
            container: (base: any) => ({
                ...base,
                flex: 1,
            }),

            singleValue: (styles: any) => ({
                ...styles,
                color: 'white',
            }),

            option: (styles: any, state: any) => ({
                ...styles,
                color: state.isSelected ? '#000000' : 'black',
                backgroundColor: state.isSelected
                    ? '#ffffff'
                    : state.isFocused
                    ? 'rgba(188, 149, 92, 0.25)'
                    : 'white', // styles.backgroundColor,
                cursor: 'pointer',
            }),
            control: (styles: any, state: any) => ({
                ...styles,
                cursor: 'pointer',
                backgroundColor: backgroundColor || '#205044',
                border: '2px solid #BC955C',
                borderRadius: '4px',
                boxShadow: state.isFocused
                    ? '0 0 0 0.2rem rgba(188, 149, 92, 0.25)'
                    : 0, ///color contorno del control
                //borderColor: state.isFocused ? "#BC955C" : "#BC955C",
                '&:hover': {
                    borderColor: '#BC955C',
                },
                '&:focus': {},
            }),
        };
        const customStyles = {
            container: (base: any) => ({
                ...base,
                flex: 1,
            }),
            option: (styles: any, state: any) => ({
                ...styles,
                color: state.isSelected ? 'white' : 'black',
                backgroundColor: state.isSelected
                    ? '#BC955C'
                    : state.isFocused
                    ? 'rgba(188, 149, 92, 0.25)'
                    : 'white', //styles.backgroundColor,
                cursor: 'pointer',
            }),
            control: (styles: any, state: any) => ({
                ...styles,
                cursor: 'pointer',
                border: '1px solid #ced4da',
                borderRadius: '4px',
                boxShadow: state.isFocused
                    ? '0 0 0 0.2rem rgba(188, 149, 92, 0.25)'
                    : 0,
                borderColor: state.isFocused ? '#BC955C' : '#BC955C',
                '&:hover': {
                    borderColor: '#BC955C',
                },
                '&:focus': {},
            }),
            menuPortal: (base: any) => ({ ...base, zIndex: 9999 }),
        };

        const getRef = (refAlias: any) => {
            if (!ref) {
                return;
            } else {
                if (typeof ref === 'function') {
                    ref(refAlias);
                } else if (typeof ref === 'object') {
                    ref.current = refAlias;
                    if (refAlias) {
                        // @ts-ignore
                        ref.current.select = refAlias;
                    }
                } else {
                    // @ts-ignore
                    ref.current = refAlias;
                    // @ts-ignore
                    ref.current.select = refAlias;
                }
            }
        };

        return (
            <Fragment>
                <OriginSelect
                    {...props}
                    classNamePrefix="mySelect"
                    menuPortalTarget={document.body}
                    // @ts-ignore
                    ref={getRef}
                    placeholder="Seleccione"
                    noOptionsMessage={() => 'Sin datos'}
                    isSearchable={isSearchable}
                    value={props.options.find(
                        (obj: any) => obj.value == props.defaultValue
                    )}
                    defaultValue={props.options.find(
                        (obj: any) => obj.value == props.defaultValue
                    )}
                    isRtl={false}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    options={props.options}
                    styles={isLogin ? customLoginStyles : customStyles}
                    isDisabled={isDisabled}
                    isClearable={isClearable}
                    isLoading={isLoading}
                    loadingMessage={loadingMessage}
                    {...(!isLogin
                        ? { components: { SingleValue, Option: IconOption } }
                        : {})}
                />
                {!!props.error && touched && (
                    <div
                        className="invalid-feedback"
                        style={{ display: 'block' }}
                    >
                        {props.error}
                    </div>
                )}
            </Fragment>
        );
    }
);

export default Select;
