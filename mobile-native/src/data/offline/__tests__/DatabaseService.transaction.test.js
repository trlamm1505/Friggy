/**
 * DatabaseService - transaction phải được SERIALIZE.
 *
 * ⚠️ BUG ĐÃ GẶP TRONG APP THẬT:
 *   `expo-sqlite` chỉ chịu được 1 transaction tại 1 thời điểm trên 1 connection.
 *   Khi 2 lần `withTransactionAsync` chạy chồng nhau -> "cannot start a
 *   transaction within a transaction". Tệ hơn: `catch` bên trong lại chạy
 *   ROLLBACK -> kéo đổ transaction ngoài -> "cannot commit - no transaction
 *   is active" -> cache ghi hỏng hoàn toàn.
 *
 *   Fix: `DatabaseService.withTransaction` dùng chuỗi promise để serialize.
 */

import { databaseService } from '../../storage/DatabaseService';
import { __resetFakeDb } from './helpers/fakeSqlite';

describe('DatabaseService - transaction', () => {
  beforeEach(async () => {
    __resetFakeDb();
    await databaseService.init();
  });

  it('2 transaction chạy SONG SONG -> không lỗi, cả 2 đều commit', async () => {
    const db = databaseService.db;

    const write = (id, name) =>
      databaseService.withTransaction(async (tx) => {
        // yield để 2 transaction có cơ hội chồng nhau nếu KHÔNG serialize.
        await new Promise((r) => setTimeout(r, 0));
        await tx.runAsync(
          `INSERT OR REPLACE INTO users (id, name) VALUES (?, ?);`,
          [id, name]
        );
      });

    await Promise.all([write('u1', 'Lâm'), write('u2', 'An')]);

    const rows = await db.getAllAsync(`SELECT * FROM users ORDER BY id ASC;`);
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.name)).toEqual(['Lâm', 'An']);
  });

  it('nhiều transaction chạy song song (10 lần) -> không lỗi, đủ dữ liệu', async () => {
    const db = databaseService.db;

    await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        databaseService.withTransaction(async (tx) => {
          await new Promise((r) => setTimeout(r, 0));
          await tx.runAsync(`INSERT OR REPLACE INTO users (id, name) VALUES (?, ?);`, [
            `u${i}`,
            `Người ${i}`,
          ]);
        })
      )
    );

    const rows = await db.getAllAsync(`SELECT * FROM users;`);
    expect(rows).toHaveLength(10);
  });

  it('1 transaction lỗi -> ROLLBACK dữ liệu, transaction khác VẪN commit', async () => {
    const db = databaseService.db;

    const failing = databaseService.withTransaction(async (tx) => {
      await tx.runAsync(`INSERT OR REPLACE INTO users (id, name) VALUES (?, ?);`, [
        'bad',
        'Lỗi',
      ]);
      throw new Error('Lỗi chủ đích');
    });

    const succeeding = databaseService.withTransaction(async (tx) => {
      await tx.runAsync(`INSERT OR REPLACE INTO users (id, name) VALUES (?, ?);`, [
        'good',
        'Tốt',
      ]);
    });

    await expect(failing).rejects.toThrow('Lỗi chủ đích');
    await expect(succeeding).resolves.toBeUndefined();

    const rows = await db.getAllAsync(`SELECT * FROM users ORDER BY id ASC;`);
    // Row 'bad' bị rollback, row 'good' vẫn còn.
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe('good');
  });

  it('transaction lỗi KHÔNG làm kẹt các transaction sau', async () => {
    const db = databaseService.db;

    await expect(
      databaseService.withTransaction(async () => {
        throw new Error('boom');
      })
    ).rejects.toThrow('boom');

    // Nếu chain bị "kẹt" bởi rejection chưa xử lý -> lệnh này sẽ throw.
    await databaseService.withTransaction(async (tx) => {
      await tx.runAsync(`INSERT OR REPLACE INTO users (id, name) VALUES (?, ?);`, [
        'after',
        'Sau',
      ]);
    });

    const rows = await db.getAllAsync(`SELECT * FROM users;`);
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe('after');
  });

  it('withTransaction trả về giá trị của task', async () => {
    const value = await databaseService.withTransaction(async () => 'ok');
    expect(value).toBe('ok');
  });
});
