import test from 'node:test';
import assert from 'node:assert/strict';
import { HealthController } from '../src/health/health.controller.js';

void test('health returns ok', () => {
  const controller = new HealthController(
    { ping: () => Promise.resolve() } as never,
    { ping: () => Promise.resolve() } as never,
  );

  assert.deepEqual(controller.health(), { status: 'ok' });
});
