import '@testing-library/jest-dom'

// Polyfill DOMMatrix — required by pdfjs-dist (pdf-parse dependency).
// jsdom does not implement DOMMatrix; this minimal stub prevents the
// "DOMMatrix is not defined" error when the pdf-parse module is loaded
// during test suite setup, even with vi.mock() in place.
if (typeof globalThis.DOMMatrix === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(globalThis as any).DOMMatrix = class DOMMatrix {
    constructor(_init?: string | number[]) { void _init }
    a = 1; b = 0; c = 0; d = 1; e = 0; f = 0
    m11 = 1; m12 = 0; m13 = 0; m14 = 0
    m21 = 0; m22 = 1; m23 = 0; m24 = 0
    m31 = 0; m32 = 0; m33 = 1; m34 = 0
    m41 = 0; m42 = 0; m43 = 0; m44 = 1
    is2D = true; isIdentity = true
    multiply() { return this }
    translate() { return this }
    scale() { return this }
    rotate() { return this }
    inverse() { return this }
    toString() { return 'matrix(1, 0, 0, 1, 0, 0)' }
  }
}
