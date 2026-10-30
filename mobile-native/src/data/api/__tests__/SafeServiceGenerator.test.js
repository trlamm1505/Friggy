/**
 * SafeService.withFallback — test hành vi với ASYNC GENERATOR (Sprint B4).
 *
 * ⚠️ BUG CẦN KIỂM CHỨNG:
 *   `withFallback` bọc mọi method thành `async (...args) => { return await real[name](...) }`.
 *   Với `async function*` (generator), `await` KHÔNG await được từng chunk ->
 *   nó chờ generator KẾT THÚC rồi trả về object generator (không phải iterable
 *   lấy từng phần).
 *
 *   => `for await (const evt of services.recipeService.streamPlanProgress(...))`
 *      có thể ném TypeError: "... is not async iterable".
 *
 *   AI Chat KHÔNG bị vì `aiChatService` không nằm trong `ServiceProvider.defaultServices`
 *   -> không qua proxy -> UI đọc thẳng từ registry.
 */

import { withFallback } from '../SafeService';

/** Service thật giả lập: 1 async generator + 1 method thường. */
const makeReal = () => ({
  async* streamPlanProgress() {
    yield { event: 'chunk', data: 'a' };
    yield { event: 'done', data: { ok: true } };
  },
  async getItems() {
    return ['real'];
  },
});

const makeMock = () => ({
  async* streamPlanProgress() {
    yield { event: 'chunk', data: 'mock' };
  },
  async getItems() {
    return ['mock'];
  },
});

describe('withFallback — async generator', () => {
  it('streamPlanProgress trả về async iterable (để `for await` hoạt động)', () => {
    const proxy = withFallback(makeReal(), makeMock(), { label: 'test' });

    const stream = proxy.streamPlanProgress();

    // Phải là async iterable, KHÔNG phải Promise.
    expect(typeof stream[Symbol.asyncIterator]).toBe('function');
    expect(typeof stream.then).toBe('undefined');
  });

  it('for await đọc được TỪNG event qua proxy', async () => {
    const proxy = withFallback(makeReal(), makeMock(), { label: 'test' });

    const events = [];
    for await (const evt of proxy.streamPlanProgress()) {
      events.push(evt);
    }

    expect(events).toEqual([
      { event: 'chunk', data: 'a' },
      { event: 'done', data: { ok: true } },
    ]);
  });

  it('method thường vẫn hoạt động bình thường', async () => {
    const proxy = withFallback(makeReal(), makeMock(), { label: 'test' });

    await expect(proxy.getItems()).resolves.toEqual(['real']);
  });
});
