const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Cho phép truy cập ảnh tĩnh
app.use('/uploads', express.static('uploads'));

// Kết nối CSDL
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '48194007', // đổi nếu cần
  database: 'warehouse_db'
});

// Secret key JWT
const JWT_SECRET = 'your_jwt_secret';

// 📁 Cấu hình multer để lưu ảnh
const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `avatar_${Date.now()}${ext}`);
  }
});
const upload = multer({ storage });


// ========================== AUTH ==========================

// ✅ API Đăng ký
app.post('/api/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ message: 'Vui lòng nhập đầy đủ thông tin.' });

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const sql = 'INSERT INTO users (name, email, password) VALUES (?, ?, ?)';
    db.query(sql, [name, email, hashedPassword], (err, result) => {
      if (err) {
        if (err.code === 'ER_DUP_ENTRY')
          return res.status(409).json({ message: 'Email đã tồn tại!' });
        return res.status(500).json({ message: 'Lỗi máy chủ khi thêm người dùng.' });
      }
      res.json({ message: 'Đăng ký thành công!' });
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi máy chủ.' });
  }
});

// ✅ API Đăng nhập
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
    if (err || results.length === 0)
      return res.status(401).json({ message: 'Email không tồn tại' });

    const user = results[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(401).json({ message: 'Sai mật khẩu' });

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '1h' });

    res.json({
      token,
      id: user.id,
      role: user.role,
      name: user.name,
      email: user.email
    });
  });
});


// ========================== USERS ==========================

// ✅ Lấy danh sách tài khoản
app.get('/api/users', (req, res) => {
  const sql = 'SELECT id, name, email, role, created_at FROM users ORDER BY id ASC';
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ message: 'Lỗi máy chủ' });
    res.json(results);
  });
});

// ✅ Thêm tài khoản (Admin)
app.post('/api/users', async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password || !role)
    return res.status(400).json({ message: 'Thiếu thông tin' });

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const sql = 'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)';
    db.query(sql, [name, email, hashedPassword, role], (err, result) => {
      if (err) {
        if (err.code === 'ER_DUP_ENTRY')
          return res.status(409).json({ message: 'Email đã tồn tại!' });
        return res.status(500).json({ message: 'Lỗi khi thêm tài khoản.' });
      }
      const newUser = { id: result.insertId, name, email, role };
      res.status(201).json({ message: 'Tạo tài khoản thành công!', user: newUser });
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi máy chủ.' });
  }
});

// ✅ Xóa tài khoản (cấm tự xóa mình)
app.delete('/api/users/:id', (req, res) => {
  const userIdToDelete = parseInt(req.params.id);
  const currentUserId = parseInt(req.body.currentUserId); // frontend gửi

  if (userIdToDelete === currentUserId)
    return res.status(403).json({ message: 'Không thể xoá tài khoản đang đăng nhập' });

  const sql = 'DELETE FROM users WHERE id = ?';
  db.query(sql, [userIdToDelete], (err) => {
    if (err) return res.status(500).json({ message: 'Lỗi khi xóa tài khoản' });
    res.json({ message: 'Đã xóa thành công' });
  });
});


// ========================== USER INFO ==========================

// ✅ Lấy thông tin user (nếu có)
app.get('/api/user-info/:id', (req, res) => {
  const sql = 'SELECT * FROM user_info WHERE user_id = ?';
  db.query(sql, [req.params.id], (err, results) => {
    if (err) return res.status(500).json({ message: 'Lỗi truy vấn' });
    if (results.length === 0) return res.json(null);
    res.json(results[0]);
  });
});

// ✅ Thêm / cập nhật thông tin user (có thể có ảnh)
app.post('/api/user-info', upload.single('avatar'), (req, res) => {
  const { user_id, full_name, date_of_birth, gender, address, phone } = req.body;
  const image_url = req.file ? `http://localhost:3000/uploads/${req.file.filename}` : null;

  const sql = `
    INSERT INTO user_info (user_id, full_name, date_of_birth, gender, address, phone, image_url)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      full_name = VALUES(full_name),
      date_of_birth = VALUES(date_of_birth),
      gender = VALUES(gender),
      address = VALUES(address),
      phone = VALUES(phone),
      image_url = IF(VALUES(image_url) IS NOT NULL, VALUES(image_url), image_url)
  `;

  db.query(sql, [user_id, full_name, date_of_birth, gender, address, phone, image_url], (err) => {
    if (err) {
      console.error('Lỗi SQL:', err);
      return res.status(500).json({ message: 'Lỗi khi lưu thông tin' });
    }
    res.json({ message: '✅ Lưu thông tin thành công' });
  });
});


// ========================== SERVER ==========================

app.listen(3000, () => {
  console.log('✅ Server chạy tại http://localhost:3000');
});
