/**
 * Shared Mock Implementations
 * Reusable mocks for testing
 */

/**
 * Mock file system operations
 */
export const mockFs = {
  readFile: async (path) => {
    const mockFiles = {
      'test.json': '{"name": "John", "age": 30}',
      'test.csv': 'name,age\nJohn,30\nJane,25',
      'test.yaml': 'name: John\nage: 30',
      'test.xml': '<user><name>John</name><age>30</age></user>',
    };
    return mockFiles[path] || '';
  },
  writeFile: async (path, content) => {
    return { path, size: content.length };
  },
};

/**
 * Mock HTTP requests
 */
export const mockHttp = {
  get: async (url) => ({
    status: 200,
    headers: { 'content-type': 'application/json' },
    data: { name: 'John', age: 30 },
  }),
  post: async (url, data) => ({
    status: 201,
    headers: { 'content-type': 'application/json' },
    data: { id: '123', ...data },
  }),
};

/**
 * Mock adapter with configurable behavior
 */
export function createMockAdapter(options = {}) {
  const {
    parseResult = { data: { test: true }, metadata: {} },
    formatResult = { data: 'formatted', metadata: {} },
    supportsStreaming = false,
    isAI = false,
    shouldError = false,
  } = options;

  return {
    async parse(input, opts) {
      if (shouldError) throw new Error('Mock parse error');
      return parseResult;
    },
    async format(data, opts) {
      if (shouldError) throw new Error('Mock format error');
      return formatResult;
    },
    supportsStreaming,
    isAI,
    version: '1.0.0-mock',
  };
}

/**
 * Create streaming data generator
 */
export async function* mockStreamData(chunks) {
  for (const chunk of chunks) {
    yield chunk;
    // Simulate async delay
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

/**
 * Mock timer utilities
 */
export const mockTimer = {
  start: () => Date.now(),
  end: (start) => Date.now() - start,
  delay: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
};

/**
 * Mock validation errors
 */
export function createValidationError(path, message) {
  const error = new Error(message);
  error.name = 'ZodError';
  error.issues = [{ path, message }];
  return error;
}
