
class AbortError extends Error {
    name = 'AbortError';
    message = 'Aborted';
}
class AbortSignal extends EventTarget {
    aborted = false;
}

class AbortController {
    signal = new AbortSignal();

    abort = () => {
        const event = new CustomEvent('abort');

        this.signal.dispatchEvent(event);
        this.signal.aborted = true;
    };
}

export { AbortError, AbortController };
