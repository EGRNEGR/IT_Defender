// @ts-check

export function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

export function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}\nExpected: ${expected}\nActual: ${actual}`);
  }
}

export async function runTests(definitions) {
  const results = [];
  for (const definition of definitions) {
    try {
      await definition.run();
      results.push({ name: definition.name, ok: true });
    } catch (error) {
      results.push({ name: definition.name, ok: false, error: String(error) });
    }
  }
  return results;
}
