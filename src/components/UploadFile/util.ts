/**
 * Given a destination object and optionally many source objects,
 * copy all properties from the source objects into the destination.
 * The last source object given overrides properties from previous
 * source objects.
 *
 * @param dest destination object
 * @param sources sources from which properties are pulled
 * @private
 */

export function extend(dest: any, ...sources: any[]): Object {
    for (const src of sources) {
        for (const k in src) {
            dest[k] = src[k];
        }
    }
    return dest;
}

/**
 * Given an array of member function names as strings, replace all of them
 * with bound versions that will always refer to `context` as `this`. This
 * is useful for classes where otherwise event bindings would reassign
 * `this` to the evented object or some other value: this lets you ensure
 * the `this` value always.
 *
 * @param fns list of member function names
 * @param context the context value
 * @example
 * function MyClass() {
 *   bindAll(['ontimer'], this);
 *   this.name = 'Tom';
 * }
 * MyClass.prototype.ontimer = function() {
 *   alert(this.name);
 * };
 * var myClass = new MyClass();
 * setTimeout(myClass.ontimer, 100);
 * @private
 */

export function bindAll(fns: Array<string>, context: any): void {
    fns.forEach((fn) => {
        if (!context[fn]) {
            return;
        }
        context[fn] = context[fn].bind(context);
    });
}

const MESSAGES = {
    error500: 'Existió un error al ejecutar la acción.',
};



export const getErrorMessage = (error: any) => {
    console.log('error:', error);

    let msg = MESSAGES.error500;

    if (
        error?.response?.data?.errors &&
        typeof error?.response?.data?.errors === 'object' &&
        (error?.response?.status === 422 || error?.response?.status === 400)
    ) {
        const errors = error?.response?.data?.errors;

        try {
            let label = '';
            let keyAlias = 0;
            let keyAliasTotal = 0;

            Object.keys(errors).forEach((key) => {
                errors[key].forEach(() => {
                    // eslint-disable-next-line no-plusplus
                    keyAliasTotal++;
                });
            });
            Object.keys(errors).forEach((key) => {
                errors[key].forEach((item: any) => {
                    // eslint-disable-next-line no-plusplus
                    keyAlias++;
                    // eslint-disable-next-line no-nested-ternary
                    label += `${
                        keyAlias > 1 && keyAlias <= keyAliasTotal
                            ? ', '
                            : keyAlias === 1
                            ? ''
                            : ''
                    }${item}${keyAlias === keyAliasTotal ? '' : ''}`;
                });
            });

            msg = label;
        } catch (serverErros) {
            console.log('error try:', serverErros);
        }
    } else if (
        error?.response?.data?.message &&
        error?.response?.status !== 500
    ) {
        msg = error.response.data.message;

        if (typeof msg === 'object') {
            try {
                const errors = msg;

                let label = '';
                let keyAlias = 0;
                let keyAliasTotal = 0;

                Object.keys(errors).forEach((key) => {
                    // @ts-ignore
                    errors?.[key]?.forEach(() => {
                        // eslint-disable-next-line no-plusplus
                        keyAliasTotal++;
                    });
                });
                Object.keys(errors).forEach((key) => {
                    // @ts-ignore
                    errors?.[key]?.forEach((item: any) => {
                        // eslint-disable-next-line no-plusplus
                        keyAlias++;
                        // eslint-disable-next-line no-nested-ternary
                        label += `${
                            // eslint-disable-next-line no-nested-ternary
                            keyAlias > 1 && keyAlias <= keyAliasTotal
                                ? ', '
                                : keyAlias === 1
                                ? ''
                                : ''
                        }${item}${keyAlias === keyAliasTotal ? '' : ''}`;
                    });
                });

                msg = label;
            } catch (errorServer) {
                console.log('error try:', errorServer);
            }
        }
    }

    if (typeof error === 'string') {
        msg = error;
    }

    return msg;
};
