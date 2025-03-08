// Mock console methods
global.console = {
  ...console,
  debug: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  group: jest.fn(),
  groupEnd: jest.fn(),
  time: jest.fn(),
  timeEnd: jest.fn(),
  info: jest.fn()
}

// Mock window methods
global.window = {
  ...global.window,
  setInterval: jest.fn()
} as any

export {}
