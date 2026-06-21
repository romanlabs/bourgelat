import '@testing-library/jest-dom'

// jsdom doesn't implement canvas — provide a minimal stub
HTMLCanvasElement.prototype.getContext = () => ({
  fillStyle: '',
  strokeStyle: '',
  lineWidth: 1,
  lineCap: 'butt',
  lineJoin: 'miter',
  globalAlpha: 1,
  fillRect: () => {},
  clearRect: () => {},
  beginPath: () => {},
  moveTo: () => {},
  lineTo: () => {},
  quadraticCurveTo: () => {},
  arc: () => {},
  fill: () => {},
  stroke: () => {},
  save: () => {},
  restore: () => {},
  createLinearGradient: () => ({ addColorStop: () => {} }),
  createRadialGradient: () => ({ addColorStop: () => {} }),
})

// jsdom doesn't implement matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
})

// jsdom doesn't implement IntersectionObserver
global.IntersectionObserver = class {
  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
}

// jsdom doesn't implement ResizeObserver
global.ResizeObserver = class {
  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
}

// jsdom doesn't implement elementsFromPoint
document.elementsFromPoint = () => []

// suppress jsdom's unimplemented scrollTo warning
window.scrollTo = () => {}
