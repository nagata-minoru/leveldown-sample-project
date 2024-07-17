const leveldown = require('leveldown');
const path = require('path');

// データベースの場所を指定
const dbPath = path.join(__dirname, 'mydb');

// データベースインスタンスを作成
const db = leveldown(dbPath);

// データベースを開く
db.open(err => {
  if (err) throw err;

  console.log('Database opened successfully');

  // データを追加
  db.put('key1', 'value1', err => {
    if (err) throw err;
    console.log('key1 added successfully');

    // データを取得
    db.get('key1', (err, value) => {
      if (err) throw err;
      console.log('key1 value:', value.toString());

      // 複数のデータを一括で追加
      db.batch([{ type: 'put', key: 'key2', value: 'value2' }, { type: 'put', key: 'key3', value: 'value3' }], err => {
        if (err) throw err;
        console.log('Key2 and Key3 added successfully');

        // イテレータを使用してすべてのデータを取得
        const iterator = db.iterator();
        function nextItem() {
          iterator.next((err, key, value) => {
            if (err) throw err;
            if (!key && !value) {
              // イテレーションが終了
              iterator.end(err => {
                if (err) throw err;
                console.log('All data retrieved successfully');
              });

              // key2 を削除
              db.del('key2', err => {
                if (err) throw err;
                console.log('key2 deleted successfully');

                // データベースを閉じる
                db.close(err => {
                  if (err) throw err;
                  console.log('Database closed successfully');
                })
              })
            } else {
              console.log('Key:', key.toString(), 'Value:', value.toString());
              nextItem(); // 次のアイテムを取得
            }
          })
        }
        nextItem(); // イテレーション開始
      });
    });
  })
});
