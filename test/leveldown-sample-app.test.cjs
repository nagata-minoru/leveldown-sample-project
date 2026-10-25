const { test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { execFile } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { promisify } = require('node:util');
const leveldown = require('leveldown');

const execFileAsync = promisify(execFile);
const projectRoot = path.join(__dirname, '..');
const appSource = path.join(projectRoot, 'leveldown-sample-app.cjs');

let workDir;
let appPath;

// プロジェクトの mydb を汚さないよう、一時ディレクトリにスクリプトを複製して実行する
beforeEach(() => {
  workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'leveldown-sample-'));
  appPath = path.join(workDir, 'leveldown-sample-app.cjs');
  fs.copyFileSync(appSource, appPath);
});

afterEach(() => {
  fs.rmSync(workDir, { recursive: true, force: true });
});

const runApp = async () => {
  const { stdout } = await execFileAsync(process.execPath, [appPath], {
    env: { ...process.env, NODE_PATH: path.join(projectRoot, 'node_modules') },
  });
  return stdout.trim().split('\n');
};

const readAll = (dbPath) => new Promise((resolve, reject) => {
  const db = leveldown(dbPath);
  db.open(err => {
    if (err) return reject(err);
    const entries = [];
    const iterator = db.iterator({ keyAsBuffer: false, valueAsBuffer: false });
    const next = () => {
      iterator.next((err, key, value) => {
        if (err) return reject(err);
        if (key === undefined) {
          iterator.end(err => {
            if (err) return reject(err);
            db.close(err => (err ? reject(err) : resolve(entries)));
          });
          return;
        }
        entries.push([key, value]);
        next();
      });
    };
    next();
  });
});

test('各操作の結果がコンソールに出力される', async () => {
  const lines = await runApp();

  // 開く・追加・取得・一括追加・走査までは順番どおりに出力される
  assert.deepEqual(lines.slice(0, 7), [
    'Database opened successfully',
    'key1 added successfully',
    'key1 value: value1',
    'Key2 and Key3 added successfully',
    'Key: key1 Value: value1',
    'Key: key2 Value: value2',
    'Key: key3 Value: value3',
  ]);

  // イテレータの終了と key2 の削除は並行して走るので、順序は問わない
  assert.deepEqual(lines.slice(7).sort(), [
    'All data retrieved successfully',
    'Database closed successfully',
    'key2 deleted successfully',
  ]);
});

test('実行後のデータベースには key1 と key3 だけが残る', async () => {
  await runApp();

  const entries = await readAll(path.join(workDir, 'mydb'));
  assert.deepEqual(entries, [
    ['key1', 'value1'],
    ['key3', 'value3'],
  ]);
});
