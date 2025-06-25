const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const bodyParser = require('body-parser');
const app = express();
app.use(cors());
app.use(bodyParser.json());

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '48194007', // chỉnh lại nếu có mật khẩu
  database: 'warehouse_db'
});

const JWT_SECRET = 'your_jwt_secret'; // để trong .env nếu cần bảo mật

// Đăng ký tài khoản
app.post('/api/register', async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Vui lòng nhập đầy đủ thông tin.' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const sql = 'INSERT INTO users (name, email, password) VALUES (?, ?, ?)';
    db.query(sql, [name, email, hashedPassword], (err, result) => {
      if (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          return res.status(409).json({ message: 'Email đã tồn tại!' });
        }
        console.error('Lỗi khi thêm người dùng:', err);
        return res.status(500).json({ message: 'Lỗi máy chủ khi thêm người dùng.' });
      }

      return res.status(200).json({ message: 'Đăng ký thành công!' });
    });
  } catch (error) {
    console.error('Lỗi xử lý đăng ký:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ.' });
  }
});


// Đăng nhập
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;

  // 1. Tìm user trong database
  db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
    if (err || results.length === 0) {
      return res.status(401).json({ message: 'Email không tồn tại' });
    }

    const user = results[0];

    // 2. So sánh mật khẩu
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Sai mật khẩu' });
    }

    // 3. Tạo JWT token có chứa ID và ROLE
    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '1h' });

    // ✅ 4. Gửi token và role về Angular client
    res.json({
      token,
      role: user.role // <== chỗ này quan trọng để Angular biết vai trò
    });
  });
});


app.listen(3000, () => console.log('Server running on port 3000'));
