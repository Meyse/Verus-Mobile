import { Buffer as BufferPolyfill } from 'buffer';

// Hermes can return a Uint8Array without Buffer methods from subarray.
if (!BufferPolyfill.isBuffer(BufferPolyfill.alloc(0).subarray(0))) {
  BufferPolyfill.prototype.subarray = function (start, end) {
    const view = Uint8Array.prototype.subarray.call(this, start, end);
    Object.setPrototypeOf(view, BufferPolyfill.prototype);
    return view;
  };
}

// Make Buffer available globally
global.Buffer = BufferPolyfill;

// (Optional) expose on globalThis for libs that reference globalThis.Buffer
if (typeof globalThis.Buffer === 'undefined') {
  globalThis.Buffer = BufferPolyfill;
}
