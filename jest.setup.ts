import '@testing-library/jest-dom';

// Optional: silence new-JSX-transform warning during tests
const warn = console.warn;
beforeAll(() => {
  jest.spyOn(console, 'warn').mockImplementation((...args: any[]) => {
    const msg = String(args[0] ?? '');
    if (msg.includes('outdated JSX transform')) return;
    warn(...args);
  });
});
afterAll(() => {
  (console.warn as jest.Mock).mockRestore();
});
