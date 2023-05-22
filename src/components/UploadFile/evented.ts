// @flow

import { extend } from './util';
type Listener = (arg0: Object) => any;
type Listeners = { [_: string]: Array<Listener> };

function _addEventListener(
    type: string,
    listener: Listener,
    listenerList: Listeners
) {
    const listenerExists =
        listenerList[type] && listenerList[type].indexOf(listener) !== -1;
    if (!listenerExists) {
        listenerList[type] = listenerList[type] || [];
        listenerList[type].push(listener);
    }
}
function _removeEventListener(
    type: string,
    listener: Listener,
    listenerList: Listeners
) {
    if (listenerList && listenerList[type]) {
        const index = listenerList[type].indexOf(listener);
        if (index !== -1) {
            listenerList[type].splice(index, 1);
        }
    }
}
export class Event {
    type: any;
    constructor(type: string, data: Object = {}) {
        extend(this, data);
        this.type = type;
    }
}

interface ErrorLike {
    message: string;
}
export class ErrorEvent extends Event {
     // @ts-ignore
    error: ErrorLike;

    constructor(error: ErrorLike, data: Object = {}) {
        super('error', extend({ error }, data));
    }
}

export class Evented {
    _listeners: any;
    _oneTimeListeners: any;
    _eventedParent: any;
    _eventedParentData:  () => any;
   /*  private _eventedParentData: () => void; */

    /*  _listeners: Listeners;
    _oneTimeListeners: Listeners;
    _eventedParent: ?Evented;
    _eventedParentData: ?(Object | () => Object);
 */

    constructor() {
        this._listeners = null;
        this._oneTimeListeners = null;
        this._eventedParent = null;
        this._eventedParentData = () => {};
    }

    on(type: any, listener: Listener): this {
        this._listeners = this._listeners || {};
        _addEventListener(type, listener, this._listeners);

        return this;
    }

    off(type: any, listener: Listener): this {
        _removeEventListener(type, listener, this._listeners);
        _removeEventListener(type, listener, this._oneTimeListeners);

        return this;
    }

    once(type: any, listener?: Listener): this | Promise<any> {
        if (!listener) {
            return new Promise((resolve) => this.once(type, resolve));
        }

        this._oneTimeListeners = this._oneTimeListeners || {};
        _addEventListener(type, listener, this._oneTimeListeners);

        return this;
    }

    fire(event: any, properties?: Object): this {
        if (typeof event === 'string') {
            event = new Event(event, properties || {});
        }

        const type = event.type;

        if (this.listens(type)) {
            // Object.defineProperty(event, 'target', {writable: false, value: myObj});
            /*    (event: any).target = this; */
            event.target = this;

            // make sure adding or removing listeners inside other listeners won't cause an infinite loop
            const listeners =
                this._listeners && this._listeners[type]
                    ? this._listeners[type].slice()
                    : [];

            for (const listener of listeners) {
                listener.call(this, event);
            }

            const oneTimeListeners =
                this._oneTimeListeners && this._oneTimeListeners[type]
                    ? this._oneTimeListeners[type].slice()
                    : [];
            for (const listener of oneTimeListeners) {
                _removeEventListener(type, listener, this._oneTimeListeners);
                listener.call(this, event);
            }

            const parent = this._eventedParent;
            if (parent) {
                extend(
                    event,
                    typeof this._eventedParentData === 'function'
                        ? this._eventedParentData()
                        : this._eventedParentData
                );
                parent.fire(event);
            }

            // To ensure that no error events are dropped, print them to the
            // console if they have no listeners.
        } else if (event instanceof ErrorEvent) {
            console.error(event.error);
        }

        return this;
    }

    listens(type: string): boolean {
        return !!(
            (this._listeners &&
                this._listeners[type] &&
                this._listeners[type].length > 0) ||
            (this._oneTimeListeners &&
                this._oneTimeListeners[type] &&
                this._oneTimeListeners[type].length > 0) ||
            (this._eventedParent && this._eventedParent.listens(type))
        );
    }

    setEventedParent(parent?: Evented, data?: any): this {
        this._eventedParent = parent;
        this._eventedParentData = data;

        return this;
    }
}
