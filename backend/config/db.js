const mysql = require('mysql2');

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '111111',
  database: 'warehouse_db'
});

db.connect((err) => {
  if (err) {
    console.error('❌ Lỗi kết nối DB:', err);
    return;
  }
  console.log('✅ Đã kết nối MySQL');
});

module.exports = db;
