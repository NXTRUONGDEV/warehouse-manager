const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const multer = require('multer');
const path = require('path');

const ExcelJS = require('exceljs');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));


// ✅ Tăng giới hạn body lên 50MB (hoặc cao hơn nếu bạn upload ảnh base64)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));


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

// 📁 Cấu hình multer để lưu ảnh KHÔNG TRÙNG TÊN
const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${file.fieldname}_${uniqueSuffix}${ext}`);
  }
});

const upload = multer({ storage });

const axios = require('axios'); // Thêm axios
const bodyParser = require('body-parser'); // Thêm body-parser

// --- Cấu hình Gemini API ---
const GEMINI_API_KEY = 'AIzaSyBABTQRJprUeL2ovkHmkPKCyCO1uJaHPGU'; // Thay thế bằng API Key của bạn
// ĐÃ SỬA: Thay đổi mô hình từ 'gemini-pro' sang 'gemini-1.5-flash-latest'
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`;

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
// ✅ Lấy danh sách tài khoản (mới nhất lên đầu)
app.get('/api/users', (req, res) => {
  const sql = `
    SELECT id, name, email, role, created_at
    FROM users
    ORDER BY id DESC
  `;
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

app.get('/api/users/:id', (req, res) => {
  const userId = req.params.id;

  const query = 'SELECT * FROM users WHERE id = ?';
  db.query(query, [userId], (err, results) => {
    if (err) {
      console.error('Lỗi khi lấy người dùng:', err);
      return res.status(500).json({ message: 'Lỗi server' });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }

    res.json(results[0]);
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

// ========================== Đăng ký phiếu nhập hàng ==========================
// ✅ Backend: Thêm mã phiếu tự động và trả về cho frontend
app.post('/api/phieu-nhap', upload.any(), (req, res) => {
  const fields = req.body;
  const files = req.files;

  const {
    created_date,
    supplier_name,
    supplier_address,
    meeting_date,
    note,
    total_amount,
    email,
    representative_name,
    representative_email,
    representative_phone
  } = fields;

  if (!email) {
    return res.status(400).json({ message: '❌ Thiếu email người dùng' });
  }

  // ✅ Ưu tiên logo mới (file), nếu không có thì dùng logo_url cũ
  const logoFile = files.find(f => f.fieldname === 'logo');
  const logo_url = logoFile
    ? `http://localhost:3000/uploads/${logoFile.filename}`
    : fields.logo_url || null;

  let products = [];
  try {
    products = JSON.parse(fields.products || '[]');
  } catch {
    return res.status(400).json({ message: '❌ Dữ liệu sản phẩm không hợp lệ' });
  }

  // 🔍 Lấy thông tin người dùng
  db.query(`
    SELECT users.id, user_info.full_name 
    FROM users 
    LEFT JOIN user_info ON users.id = user_info.user_id 
    WHERE users.email = ?
  `, [email], (err, results) => {
    if (err || results.length === 0) {
      console.error('❌ Không tìm thấy người dùng:', err);
      return res.status(400).json({ message: '❌ Không tìm thấy người dùng từ email' });
    }

    const userId = results[0].id;
    const staffFullName = results[0].full_name || 'Chưa rõ';

    // ✅ Tạo phiếu nhập
    db.query(
      `INSERT INTO phieu_nhap_kho 
        (created_date, supplier_name, supplier_address, logo_url, user_id, total_amount,
         meeting_date, note,
         staff_account_name, staff_account_email, admin_account_email,
         representative_name, representative_email, representative_phone)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        created_date,
        supplier_name,
        supplier_address,
        logo_url,
        userId,
        total_amount,
        meeting_date || null,
        note || null,

        staffFullName,
        email,
        null,

        representative_name || null,
        representative_email || null,
        representative_phone || null
      ],
      (err, result) => {
        if (err) {
          console.error('❌ Lỗi tạo phiếu:', err);
          return res.status(500).json({ message: '❌ Lỗi khi tạo phiếu' });
        }

        const phieuId = result.insertId;
        const todayStr = new Date().toISOString().split("T")[0].replace(/-/g, '');
        const receipt_code = `PNK${todayStr}-${String(phieuId).padStart(3, '0')}`;

        db.query(`UPDATE phieu_nhap_kho SET receipt_code = ? WHERE id = ?`, [receipt_code, phieuId]);

        // 🧾 Lưu chi tiết từng sản phẩm
        products.forEach((item, i) => {
          const img = files.find(f => f.fieldname === `product_image_${i}`);
          const image_url = img
            ? `http://localhost:3000/uploads/${img.filename}`
            : item.image_url || null;

          db.query(
            `INSERT INTO phieu_nhap_kho_chi_tiet 
              (phieu_nhap_kho_id, item_no, image_url, product_name, product_type, product_code,
               unit, weight, area, manufacture_date, expiry_date, quantity, unit_price, total_price)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              phieuId,
              i + 1,
              image_url,
              item.product_name,
              item.product_type,
              item.product_code,
              item.unit,
              item.weight,
              item.area || 0,
              item.manufacture_date,
              item.expiry_date,
              item.quantity,
              item.unit_price,
              item.quantity * item.unit_price
            ]
          );
        });

        return res.json({ message: '✅ Tạo phiếu chuyển hàng thành công!', receipt_code });
      }
    );
  });
});



//trả hóa đơn
// 🔧 API: lấy tất cả phiếu (nhập + xuất) của 1 user
// 🔧 API lấy tất cả phiếu của user kèm products + user_info
app.get('/api/hoa-don/:userId', (req, res) => {
  const userId = req.params.userId;

  const nhapQuery = `
    SELECT pnk.*, 'Phiếu nhập kho' AS loai,
           ui.full_name, ui.phone, ui.date_of_birth
    FROM phieu_nhap_kho pnk
    JOIN user_info ui ON pnk.user_id = ui.user_id
    WHERE pnk.user_id = ?
  `;

  const xuatQuery = `
    SELECT pxk.*, 'Phiếu xuất kho' AS loai,
           ui.full_name, ui.phone, ui.date_of_birth
    FROM phieu_xuat_kho pxk
    JOIN user_info ui ON pxk.user_id = ui.user_id
    WHERE pxk.user_id = ?
  `;

  db.query(nhapQuery, [userId], (err1, nhapList) => {
    if (err1) {
      console.error('❌ Lỗi truy vấn phiếu nhập:', err1);
      return res.status(500).json({ message: 'Lỗi lấy phiếu nhập' });
    }

    Promise.all(
      nhapList.map((phieu) => {
        return new Promise((resolve, reject) => {
          db.query(
            `SELECT * FROM phieu_nhap_kho_chi_tiet WHERE phieu_nhap_kho_id = ?`,
            [phieu.id],
            (err, products) => {
              if (err) return reject(err);
              phieu.products = products;
              resolve(phieu);
            }
          );
        });
      })
    )
    .then((withDetails) => {
      db.query(xuatQuery, [userId], async (err2, xuatList) => {
        if (err2) {
          console.error('❌ Lỗi truy vấn phiếu xuất:', err2);
          return res.status(500).json({ message: 'Lỗi lấy phiếu xuất' });
        }

        try {
          const xuatWithDetails = await Promise.all(
            xuatList.map((pxk) => {
              return new Promise((resolve, reject) => {
                db.query(
                  `SELECT * FROM phieu_xuat_kho_chi_tiet WHERE phieu_xuat_kho_id = ?`,
                  [pxk.id],
                  (err, products) => {
                    if (err) return reject(err);
                    pxk.products = products;
                    pxk.payment = null; // bỏ thanh toán
                    resolve(pxk);
                  }
                );
              });
            })
          );

          const hoaDonTong = [...withDetails, ...xuatWithDetails].sort((a, b) => {
            const dateA = new Date(a.created_at || a.created_date);
            const dateB = new Date(b.created_at || b.created_date);
            return dateB - dateA || b.id - a.id;
          });

          res.json(hoaDonTong);
        } catch (error) {
          console.error('❌ Lỗi tổng hợp chi tiết phiếu xuất:', error);
          res.status(500).json({ message: 'Lỗi tổng hợp phiếu xuất' });
        }
      });
    })
    .catch((err) => {
      console.error('❌ Lỗi tổng hợp chi tiết phiếu nhập:', err);
      res.status(500).json({ message: 'Lỗi tổng hợp phiếu nhập' });
    });
  });
});


// 🔧 API: Lấy tất cả phiếu nhập kho kèm chi tiết sản phẩm
// GET tất cả phiếu nhập (có sản phẩm và user info)
// 🔧 API: Lấy tất cả phiếu nhập kho kèm chi tiết sản phẩm
// 🔧 API: Lấy tất cả phiếu nhập kho kèm chi tiết sản phẩm
app.get('/api/phieu-nhap', async (req, res) => {
  const query = `
    SELECT pnk.*, ui.full_name, ui.phone
    FROM phieu_nhap_kho pnk
    JOIN user_info ui ON pnk.user_id = ui.user_id
    ORDER BY pnk.created_date DESC, pnk.id DESC
  `;

  db.query(query, async (err, results) => {
    if (err) {
      console.error('❌ Lỗi truy vấn phiếu:', err);
      return res.status(500).json({ message: 'Lỗi lấy danh sách phiếu nhập' });
    }

    try {
      const withDetails = await Promise.all(
        results.map((phieu) => {
          return new Promise((resolve, reject) => {
            db.query(
              'SELECT * FROM phieu_nhap_kho_chi_tiet WHERE phieu_nhap_kho_id = ?',
              [phieu.id],
              (err, products) => {
                if (err) {
                  console.error('❌ Lỗi lấy chi tiết sản phẩm:', err);
                  return reject(err);
                }
                phieu.products = products;
                resolve(phieu);
              }
            );
          });
        })
      );

      return res.json(withDetails);
    } catch (err) {
      console.error('❌ Lỗi xử lý dữ liệu phiếu:', err);
      return res.status(500).json({ message: 'Lỗi xử lý chi tiết phiếu nhập' });
    }
  });
});


// PUT cập nhật tên và email nhân viên xử lý
app.put('/api/phieu-nhap/:id/staff-cap-nhat', (req, res) => {
  const { id } = req.params;
  const { staff_account_email, staff_account_name, note_staff, trang_thai } = req.body;

  const query = `
    UPDATE phieu_nhap_kho 
    SET 
      staff_account_email = ?, 
      staff_account_name = ?, 
      note_staff = ?, 
      trang_thai = ?
    WHERE id = ?
  `;

  db.query(query, [staff_account_email, staff_account_name, note_staff, trang_thai, id], (err) => {
    if (err) {
      console.error('Lỗi cập nhật thông tin nhân viên:', err);
      return res.status(500).json({ message: '❌ Lỗi cập nhật thông tin nhân viên' });
    }

    res.json({ message: '✅ Cập nhật thành công nhân viên và trạng thái phiếu' });
  });
});

app.put('/api/phieu-nhap/:id/admin-cap-nhat', (req, res) => {
  const { id } = req.params;
  const { trang_thai, note_admin, admin_account_email, admin_account_name } = req.body;

  const query = `
    UPDATE phieu_nhap_kho 
    SET trang_thai = ?, 
        note_admin = ?, 
        admin_account_email = ?, 
        admin_account_name = ?
    WHERE id = ?
  `;

  db.query(query, [trang_thai, note_admin, admin_account_email, admin_account_name, id], (err) => {
  if (err) {
    console.error('❌ Lỗi khi cập nhật phiếu:', err); // 👈 Thêm dòng này để debug
    return res.status(500).json({ message: 'Lỗi khi duyệt phiếu' });
  }
  res.json({ message: 'Duyệt thành công' });
});
});


// PUT để admin cập nhật trạng thái và nhập kho
// PUT: Cập nhật trạng thái "Hoàn tất nhập hàng"
app.put('/api/phieu-nhap/:id/hoan-tat', (req, res) => {
  const id = req.params.id;
  const { trang_thai } = req.body;

  // Kiểm tra đầu vào
  if (!trang_thai || typeof trang_thai !== 'string') {
    return res.status(400).json({ error: '⚠️ Thiếu hoặc sai định dạng trường "trang_thai"' });
  }

  const sql = 'UPDATE phieu_nhap_kho SET trang_thai = ? WHERE id = ?';

  db.query(sql, [trang_thai, id], (err, result) => {
    if (err) {
      console.error('❌ Lỗi SQL khi cập nhật phiếu:', err);
      return res.status(500).json({ error: '❌ Lỗi server khi cập nhật phiếu' });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: '⚠️ Không tìm thấy phiếu với ID đã cho' });
    }

    res.json({ message: '✅ Trạng thái phiếu đã được cập nhật thành công!' });
  });
});

// PUT cập nhật phiếu nhập
app.put('/api/phieu-nhap/:id', (req, res) => {
  const id = req.params.id;
  const {
    supplier_name, supplier_address, meeting_date,
    supplier_account_email, logo_url, note, note_admin, products
  } = req.body;

  // ========== Kiểm tra cơ bản ==========
  if (!supplier_name || !supplier_address || !meeting_date) {
    return res.status(400).json({ message: '⚠️ Vui lòng nhập đầy đủ tên NCC, địa chỉ và ngày hẹn.' });
  }

  if (!Array.isArray(products) || products.length === 0) {
    return res.status(400).json({ message: '⚠️ Danh sách sản phẩm không được để trống.' });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // ========== Kiểm tra sản phẩm ==========
  for (const sp of products) {
    const requiredFields = ['product_code', 'product_name', 'product_type', 'unit', 'quantity', 'unit_price', 'weight', 'area', 'manufacture_date', 'expiry_date'];
    for (let field of requiredFields) {
      if (!sp[field] || sp[field].toString().trim() === '') {
        return res.status(400).json({ message: `⚠️ Sản phẩm '${sp.product_name || sp.product_code}': thiếu trường '${field}'` });
      }
    }

    const numericFields = ['quantity', 'unit_price', 'weight', 'area'];
    for (let field of numericFields) {
      const val = parseFloat(sp[field]);
      if (isNaN(val) || val <= 0) {
        return res.status(400).json({ message: `⚠️ '${field}' của sản phẩm '${sp.product_name}' phải > 0.` });
      }
    }

    const nsx = new Date(sp.manufacture_date);
    const hsd = new Date(sp.expiry_date);

    if (isNaN(nsx) || isNaN(hsd)) {
      return res.status(400).json({ message: `⚠️ Ngày sản xuất hoặc hạn sử dụng không hợp lệ cho sản phẩm '${sp.product_name}'` });
    }

    if (nsx >= today) {
      return res.status(400).json({ message: `⚠️ Ngày sản xuất của '${sp.product_name}' phải trước hôm nay.` });
    }

    if (hsd <= today) {
      return res.status(400).json({ message: `⚠️ Hạn sử dụng của '${sp.product_name}' phải sau hôm nay.` });
    }

    if (nsx >= hsd) {
      return res.status(400).json({ message: `⚠️ NSX phải trước HSD với sản phẩm '${sp.product_name}'` });
    }
  }

  // ========== Cập nhật phiếu ==========
  const updatePhieuQuery = `
    UPDATE phieu_nhap_kho 
    SET supplier_name = ?, supplier_address = ?, meeting_date = ?, 
        supplier_account_email = ?, logo_url = ?, note = ?, note_admin = ?
    WHERE id = ?
  `;

  db.query(updatePhieuQuery, [
    supplier_name, supplier_address, meeting_date,
    supplier_account_email, logo_url, note, note_admin, id
  ], (err) => {
    if (err) return res.status(500).json({ message: '❌ Lỗi cập nhật phiếu' });

    // Xoá sản phẩm cũ
    const deleteOld = `DELETE FROM phieu_nhap_kho_chi_tiet WHERE phieu_nhap_kho_id = ?`;
    db.query(deleteOld, [id], (err) => {
      if (err) return res.status(500).json({ message: '❌ Lỗi xoá sản phẩm cũ' });

      // Chèn sản phẩm mới
      const insertQuery = `
        INSERT INTO phieu_nhap_kho_chi_tiet (
          phieu_nhap_kho_id, product_code, product_name, product_type, unit, 
          quantity, weight, area, manufacture_date, expiry_date, unit_price, total_price, image_url
        ) VALUES ?
      `;

      const values = products.map(sp => [
        id,
        sp.product_code,
        sp.product_name,
        sp.product_type,
        sp.unit,
        parseInt(sp.quantity),
        parseFloat(sp.weight),
        parseFloat(sp.area),
        sp.manufacture_date.split('T')[0],
        sp.expiry_date.split('T')[0],
        parseFloat(sp.unit_price),
        parseFloat(sp.unit_price) * parseFloat(sp.quantity),
        sp.image_url || ''
      ]);

      db.query(insertQuery, [values], (err) => {
        if (err) return res.status(500).json({ message: '❌ Lỗi cập nhật sản phẩm' });
        res.json({ message: '✅ Cập nhật thành công!' });
      });
    });
  });
});


//// ========================== Nhập hàng vào kho ==========================

// Kiểm tra mã sản phẩm
// ✅ Kiểm tra mã sản phẩm và cộng dồn số lượng, khối lượng, thành tiền
// API: /api/products-detail/check-ma/:code
app.get('/api/products-detail/check-ma/:code', (req, res) => {
  const code = req.params.code;

  db.query('SELECT * FROM products_detail WHERE product_code = ?', [code], (err, results) => {
    if (err) {
      console.error('❌ Lỗi truy vấn:', err);
      return res.status(500).json({ error: 'Lỗi server' });
    }

    if (results.length === 0) {
      return res.json({ exists: false });
    }

    const tong = results.reduce((acc, sp, index) => {
      const quantity = Number(sp.quantity) || 0;
      const weightPerUnit = Number(sp.weight_per_unit) || 0;
      const areaPerUnit = Number(sp.area_per_unit) || 0;
      const unitPrice = Number(sp.unit_price) || 0;

      acc.quantity += quantity;
      acc.total_weight += quantity * weightPerUnit;
      acc.total_area += quantity * areaPerUnit;
      acc.total_price += quantity * unitPrice;

      if (index === 0) {
        acc.product_code = sp.product_code;
        acc.product_name = sp.product_name;
        acc.product_type = sp.product_type;
        acc.unit = sp.unit;
        acc.unit_price = unitPrice;
        acc.weight_per_unit = weightPerUnit;
        acc.area_per_unit = areaPerUnit;
        acc.image_url = sp.image_url;
        acc.manufacture_date = sp.manufacture_date;
        acc.expiry_date = sp.expiry_date;
        acc.supplier_name = sp.supplier_name;
        acc.supplier_logo = sp.supplier_logo;
      }

      return acc;
    }, {
      quantity: 0,
      total_weight: 0,
      total_area: 0,
      total_price: 0
    });

    res.json({ exists: true, product: tong });
  });
});


// ✅ API POST để kiểm tra danh sách mã có trùng không
app.post('/api/products-detail/check-multiple', (req, res) => {
  const { ma_san_pham } = req.body;

  if (!Array.isArray(ma_san_pham) || ma_san_pham.length === 0) {
    return res.json({ duplicates: [] });
  }

  const placeholders = ma_san_pham.map(() => '?').join(',');
  db.query(`SELECT product_code FROM products_detail WHERE product_code IN (${placeholders})`,
    ma_san_pham,
    (err, results) => {
      if (err) return res.status(500).json({ error: 'Lỗi server' });
      const duplicates = results.map(r => r.product_code);
      res.json({ duplicates });
    });
});

// Lưu nhập kho (đã cập nhật thêm supplier_name, logo_url)
app.post('/api/nhap-kho', (req, res) => {
  const { danh_sach_san_pham } = req.body;

  if (!Array.isArray(danh_sach_san_pham) || danh_sach_san_pham.length === 0) {
    return res.status(400).json({ message: 'Không có sản phẩm để lưu' });
  }

  let processed = 0;
  const total = danh_sach_san_pham.length;

  for (let sp of danh_sach_san_pham) {
    const oldCode = sp.old_product_code || sp.product_code;

    // Nếu người dùng bật "Cập nhật thêm" thì cũng thêm mới
    insertNewProduct(sp, (errInsert) => {
      if (errInsert) {
        console.error('❌ Lỗi khi thêm sản phẩm:', errInsert);
        return res.status(500).json({ error: 'Lỗi khi thêm sản phẩm' });
      }

      processed++;
      if (processed === total) return res.json({ message: '📦 Nhập kho hoàn tất!' });
    });
  }

  // ✅ Hàm insert mới luôn dùng, không update số lượng nữa
  function insertNewProduct(sp, callback) {
    const oldCode = sp.old_product_code || sp.product_code;

    db.query(
      `INSERT INTO products_detail (
        product_code, product_name, product_type, image_url, unit,
        quantity, weight, area, manufacture_date, expiry_date,
        unit_price, total_price, khu_vuc_id,
        supplier_name, logo_url,
        old_product_code, receipt_code, location
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        sp.product_code, sp.product_name, sp.product_type, sp.image_url, sp.unit,
        sp.quantity, sp.weight, sp.area, sp.manufacture_date, sp.expiry_date,
        sp.unit_price, sp.total_price, sp.khu_vuc_id,
        sp.supplier_name, sp.logo_url,
        oldCode, sp.receipt_code, sp.location
      ],
      (errInsert) => callback(errInsert)
    );
  }
});


// ✅ API trả về tất cả dòng sản phẩm theo product_code (kèm khu vực và vị trí)
app.get('/api/products-detail/by-code/:code', (req, res) => {
  const productCode = req.params.code;

  const query = `
    SELECT 
      pd.id,
      pd.product_code,
      pd.old_product_code,
      pd.product_name,
      pd.product_type,
      pd.unit,
      pd.image_url,
      pd.weight_per_unit,
      pd.area_per_unit,
      pd.unit_price,
      pd.manufacture_date,
      pd.expiry_date,
      pd.supplier_name,
      pd.logo_url,
      pd.location,
      pd.khu_vuc_id,
      kv.ten_khu_vuc,

      -- Thông tin đại diện từ bảng phiếu nhập
      pnk.supplier_address,
      pnk.representative_name,
      pnk.representative_email,
      pnk.representative_phone

    FROM products_detail pd
    LEFT JOIN khu_vuc kv ON pd.khu_vuc_id = kv.id
    LEFT JOIN phieu_nhap_kho pnk ON pd.receipt_code = pnk.receipt_code

    WHERE pd.product_code = ?
    ORDER BY pd.location ASC
    LIMIT 1
  `;

  db.query(query, [productCode], (err, results) => {
    if (err) {
      console.error('❌ Lỗi truy vấn:', err);
      return res.status(500).json({ message: 'Lỗi truy vấn CSDL' });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
    }

    res.json(results[0]); // Trả về 1 sản phẩm (object) kèm thông tin đại diện
  });
});




//// ========================== Lấy danh sách sản phẩm , bộ lọc , thêm xóa sửa sản phẩm  ==========================
// Lấy danh sách sản phẩm theo mã phiếu nhập
app.get('/api/phieu-nhap/:id/san-pham', (req, res) => {
  const id = req.params.id;
  const query = `
    SELECT c.*, p.receipt_code, p.supplier_name
    FROM phieu_nhap_kho_chi_tiet c
    JOIN phieu_nhap_kho p ON c.phieu_nhap_kho_id = p.id
    WHERE c.phieu_nhap_kho_id = ?
  `;
  db.query(query, [id], (err, rows) => {
    if (err) {
      console.error('Lỗi khi lấy chi tiết phiếu:', err);
      return res.status(500).json({ error: 'Lỗi server' });
    }
    res.json(rows);
  });
});

// ✅ API xử lý upload ảnh
app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Không có file nào được tải lên.' });
  }

  // Trả về URL đầy đủ với domain backend (localhost:3000)
  const imageUrl = `http://localhost:3000/uploads/${req.file.filename}`;
  res.json({ imageUrl });
});

// API lấy danh sách khu vực
app.get('/api/khu-vuc', (req, res) => {
  db.query('SELECT * FROM khu_vuc ORDER BY id ASC', (err, rows) => {
    if (err) {
      console.error('Lỗi khi lấy khu vực:', err);
      return res.status(500).json({ message: 'Lỗi server' });
    }
    res.json(rows);
  });
});

// GET /api/products-detail/filter
app.get('/api/products-detail/filter', (req, res) => {
  const {
    keyword = '',
    product_type,
    khu_vuc_id,
    fromDate,
    toDate,
    minPrice,
    maxPrice
  } = req.query;

  let sql = `
    SELECT 
      pd.product_code,
      MAX(pd.product_name) AS product_name,
      MAX(pd.product_type) AS product_type,
      MAX(pd.image_url) AS image_url,
      MAX(pd.unit) AS unit,
      SUM(pd.quantity) AS quantity,
      SUM(pd.weight) AS weight,
      SUM(pd.area) AS area,
      MAX(pd.weight_per_unit) AS weight_per_unit,         -- ✅ thêm dòng này
      MAX(pd.manufacture_date) AS manufacture_date,
      MAX(pd.expiry_date) AS expiry_date,
      MAX(pd.unit_price) AS unit_price,
      SUM(pd.total_price) AS total_price,
      MAX(pd.khu_vuc_id) AS khu_vuc_id,
      MAX(kv.ten_khu_vuc) AS ten_khu_vuc,
      MAX(pd.supplier_name) AS supplier_name,
      MAX(pd.logo_url) AS logo_url,
      MAX(pd.import_date) AS import_date,
      MAX(pd.location) AS location,         -- ✅ THÊM DÒNG NÀY
      MAX(pd.id) AS id
    FROM products_detail pd
    JOIN khu_vuc kv ON pd.khu_vuc_id = kv.id
    WHERE 1 = 1
  `;

  const params = [];

  if (keyword) {
    const isNumeric = /^\d+$/.test(keyword);
    if (isNumeric) {
      sql += ` AND pd.product_code = ?`;
      params.push(keyword);
    } else {
      sql += ` AND (pd.product_code = ? OR pd.product_name LIKE ?)`;
      params.push(keyword, `%${keyword}%`);
    }
  }

  if (product_type) {
    sql += ` AND pd.product_type = ?`;
    params.push(product_type);
  }

  if (khu_vuc_id) {
    sql += ` AND pd.khu_vuc_id = ?`;
    params.push(khu_vuc_id);
  }

  if (fromDate) {
    sql += ` AND pd.import_date >= ?`;
    params.push(fromDate);
  }

  if (toDate) {
    sql += ` AND pd.import_date <= ?`;
    params.push(toDate);
  }

  if (minPrice) {
    sql += ` AND pd.total_price >= ?`;
    params.push(minPrice);
  }

  if (maxPrice) {
    sql += ` AND pd.total_price <= ?`;
    params.push(maxPrice);
  }

  // 👉 GROUP BY để gộp sản phẩm theo mã
  sql += `
    GROUP BY pd.product_code
    ORDER BY MAX(pd.import_date) DESC, MAX(pd.id) DESC
  `;

  db.query(sql, params, (err, results) => {
    if (err) {
      console.error('❌ Lỗi truy vấn:', err);
      return res.status(500).json({ message: 'Lỗi truy vấn', error: err });
    }
    res.json(results);
  });
});


//api lấy bộ lọc khu vực
app.get('/api/khu-vuc', (req, res) => {
  const sql = 'SELECT id, ten_khu_vuc FROM khu_vuc ORDER BY id ASC';
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ message: 'Lỗi truy vấn khu vực' });
    res.json(results);
  });
});

//api lấy bộ lọc theo loại
// GET /api/products-detail/types - Lấy danh sách loại hàng duy nhất
app.get('/api/products-detail/types', (req, res) => {
  const { khu_vuc_id } = req.query;

  let sql = `
    SELECT DISTINCT product_type 
    FROM products_detail 
    WHERE product_type IS NOT NULL
  `;
  const params = [];

  // Nếu có khu_vuc_id thì lọc theo khu
  if (khu_vuc_id) {
    sql += ` AND khu_vuc_id = ?`;
    params.push(khu_vuc_id);
  }

  sql += ` ORDER BY product_type ASC`;

  db.query(sql, params, (err, results) => {
    if (err) return res.status(500).json({ message: 'Lỗi truy vấn loại hàng', error: err });
    res.json(results.map(row => row.product_type));
  });
});

// Thêm sản phẩm trong quản lý sản phẩm
// Thêm sản phẩm trong quản lý sản phẩm
app.post('/api/products-detail', upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'logo', maxCount: 1 }
]), (req, res) => {
  const sp = req.body;

  // Chuẩn hóa đường dẫn ảnh
  const normalizePath = file =>
    file?.path ? `http://localhost:3000/uploads/${path.basename(file.path)}` : null;

  const image_url = normalizePath(req.files?.image?.[0]) || sp.image_url || 'http://localhost:3000/uploads/default.png';
  const logo_url = normalizePath(req.files?.logo?.[0]) || sp.logo_url || 'http://localhost:3000/uploads/logogpt.png';

  // ======= Kiểm tra dữ liệu hợp lệ =======
  const requiredFields = ['product_code', 'product_name', 'product_type', 'unit', 'quantity', 'unit_price', 'weight', 'area', 'manufacture_date', 'expiry_date'];
  for (let field of requiredFields) {
    if (!sp[field] || sp[field].toString().trim() === '') {
      return res.status(400).json({ error: `⚠️ Trường '${field}' không được để trống.` });
    }
  }

  const numericFields = ['quantity', 'unit_price', 'weight', 'area'];
  for (let field of numericFields) {
    const val = parseFloat(sp[field]);
    if (isNaN(val) || val <= 0) {
      return res.status(400).json({ error: `⚠️ '${field}' phải là số lớn hơn 0.` });
    }
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const nsx = new Date(sp.manufacture_date);
  const hsd = new Date(sp.expiry_date);

  if (isNaN(nsx) || isNaN(hsd)) {
    return res.status(400).json({ error: '⚠️ Ngày sản xuất hoặc hạn sử dụng không hợp lệ.' });
  }

  if (nsx >= today) {
    return res.status(400).json({ error: '⚠️ Ngày sản xuất phải trước ngày hôm nay.' });
  }

  if (hsd <= today) {
    return res.status(400).json({ error: '⚠️ Hạn sử dụng phải sau ngày hôm nay.' });
  }

  if (nsx >= hsd) {
    return res.status(400).json({ error: '⚠️ Ngày sản xuất phải trước hạn sử dụng.' });
  }

  // ======= Kiểm tra trùng mã sản phẩm =======
  const checkSql = 'SELECT COUNT(*) AS count FROM products_detail WHERE product_code = ?';
  db.query(checkSql, [sp.product_code], (checkErr, checkResult) => {
    if (checkErr) {
      console.error('❌ Lỗi kiểm tra trùng mã:', checkErr);
      return res.status(500).json({ error: 'Lỗi kiểm tra trùng mã sản phẩm' });
    }

    if (checkResult[0].count > 0) {
      return res.status(400).json({ error: '⚠️ Mã sản phẩm đã tồn tại, vui lòng dùng mã khác!' });
    }

    // ======= Chèn dữ liệu =======
    const total_price = parseFloat(sp.unit_price) * parseFloat(sp.quantity);

    const insertSql = `
      INSERT INTO products_detail (
        product_code, product_name, product_type, unit, quantity, weight, area,
        manufacture_date, expiry_date, unit_price, total_price,
        khu_vuc_id, supplier_name, image_url, logo_url
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      sp.product_code,
      sp.product_name,
      sp.product_type,
      sp.unit,
      parseInt(sp.quantity),
      parseFloat(sp.weight),
      parseFloat(sp.area),
      sp.manufacture_date.split('T')[0],
      sp.expiry_date.split('T')[0],
      parseFloat(sp.unit_price),
      total_price,
      sp.khu_vuc_id || null,
      sp.supplier_name || '',
      image_url,
      logo_url
    ];

    db.query(insertSql, params, (insertErr, result) => {
      if (insertErr) {
        console.error('❌ Lỗi thêm sản phẩm:', insertErr.sqlMessage);
        return res.status(500).json({ error: 'Lỗi thêm sản phẩm' });
      }
      res.json({ message: '✅ Thêm sản phẩm thành công!' });
    });
  });
});

// Xóa sản phẩm trong quản lý sản phẩm
// Xóa toàn bộ sản phẩm theo mã product_code
app.delete('/api/products-detail/xoa-theo-ma/:product_code', (req, res) => {
  const productCode = req.params.product_code;

  const sql = 'DELETE FROM products_detail WHERE product_code = ?';

  db.query(sql, [productCode], (err, result) => {
    if (err) {
      console.error('❌ Lỗi khi xoá sản phẩm theo mã:', err);
      return res.status(500).json({ error: 'Lỗi khi xoá sản phẩm theo mã' });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Không tìm thấy sản phẩm để xoá' });
    }

    res.json({ message: '✅ Đã xoá toàn bộ sản phẩm thành công!' });
  });
});


app.put('/api/products-detail/:id', upload.fields([
  { name: 'image' }, { name: 'logo' }
]), async (req, res) => {
  const id = req.params.id;
  const body = req.body;

  try {
    // Xử lý đường dẫn ảnh nếu có file mới
    let image_url = body.image_url || '';
    let logo_url = body.logo_url || '';

    if (req.files?.image?.[0]) {
      image_url = `/uploads/${req.files.image[0].filename}`;
    }

    if (req.files?.logo?.[0]) {
      logo_url = `/uploads/${req.files.logo[0].filename}`;
    }

    const sql = `
      UPDATE products_detail SET
        product_code = ?, product_name = ?, product_type = ?, unit = ?,
        manufacture_date = ?, expiry_date = ?,
        weight_per_unit = ?, area_per_unit = ?,
        location = ?, khu_vuc_id = ?, supplier_name = ?, receipt_code = ?,
        image_url = ?, logo_url = ?
      WHERE id = ?
    `;

    const values = [
      body.product_code, body.product_name, body.product_type, body.unit,
      body.manufacture_date, body.expiry_date,
      body.weight_per_unit, body.area_per_unit,
      body.location, body.khu_vuc_id, body.supplier_name, body.receipt_code,
      image_url, logo_url,
      id
    ];

    await db.promise().query(sql, values);

    res.json({ message: '✅ Cập nhật thông tin sản phẩm thành công (không ảnh hưởng số lượng).' });
  } catch (err) {
    console.error('❌ Lỗi cập nhật sản phẩm:', err);
    res.status(500).json({ error: '❌ Lỗi server khi cập nhật sản phẩm!' });
  }
});

// ========================== Phiếu xuất ==========================

//tạo phiếu xuất
app.post('/api/phieu-xuat', upload.any(), (req, res) => {
  try {
    const body = req.body;
    const products = JSON.parse(body.products || '[]');

    if (!body.receiver_name || !products.length) {
      return res.status(400).json({ error: '⚠️ Thiếu thông tin người nhận hoặc sản phẩm.' });
    }

    const total_amount = parseFloat(body.total_amount || 0);
    const total_weight = parseFloat(body.total_weight || 0);
    const created_date = body.created_date || new Date().toISOString().split('T')[0];

    // Tạo mã phiếu xuất
    const generateCode = () => {
      const now = new Date();
      const yyyyMMdd = now.toISOString().slice(0, 10).replace(/-/g, '');
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      return `PXK${yyyyMMdd}-${random}`;
    };
    const receipt_code = generateCode();

    // Xử lý file logo nếu có
    let logo_url = '';
    const logoFile = req.files?.find(f => f.fieldname === 'logo');
    if (logoFile) {
      const newName = `${Date.now()}_${logoFile.originalname}`;
      const newPath = path.join(__dirname, 'uploads', newName);
      fs.renameSync(logoFile.path, newPath);
      logo_url = `/uploads/${newName}`;
    }

    // Chuẩn bị câu lệnh SQL lưu phiếu xuất
    const sqlInsertPhieu = `
      INSERT INTO phieu_xuat_kho (
        receipt_code, created_date, receiver_name, receiver_address,
        logo_url, user_id, total_amount, total_weight,
        delivery_date,
        representative_name, representative_email, representative_phone,
        staff_account_name, staff_account_email,
        admin_account_name, admin_account_email,
        note
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      receipt_code,
      created_date,
      body.receiver_name,
      body.receiver_address || '',
      logo_url,
      parseInt(body.user_id || 0),
      total_amount,
      total_weight,
      body.delivery_date || null,
      body.representative_name || '',
      body.representative_email || '',
      body.representative_phone || '',
      body.staff_account_name || '',
      body.staff_account_email || '',
      body.admin_account_name || '',
      body.admin_account_email || '',
      body.note || ''
    ];

    db.query(sqlInsertPhieu, values, (err, result) => {
      if (err) {
        console.error('❌ Lỗi khi tạo phiếu xuất:', err);
        return res.status(500).json({ error: 'Không thể tạo phiếu xuất kho.' });
      }

      const phieu_xuat_kho_id = result.insertId;

      // Lưu chi tiết sản phẩm
      const sqlChiTiet = `
        INSERT INTO phieu_xuat_kho_chi_tiet (
          phieu_xuat_kho_id, item_no, image_url, product_name, product_type,
          product_code, unit, weight, weight_per_unit, manufacture_date, expiry_date,
          quantity, unit_price, total_price
        ) VALUES ?
      `;

      const chiTietValues = products.map((p, index) => [
        phieu_xuat_kho_id,
        index + 1,
        p.preview || '',
        p.product_name,
        p.product_type,
        p.product_code,
        p.unit,
        parseFloat(p.weight || 0),
        parseFloat(p.weight_per_unit || 0),
        p.manufacture_date.split('T')[0],
        p.expiry_date.split('T')[0],
        parseInt(p.quantity),
        parseFloat(p.unit_price),
        parseFloat(p.quantity) * parseFloat(p.unit_price),
      ]);

      db.query(sqlChiTiet, [chiTietValues], (err2) => {
        if (err2) {
          console.error('❌ Lỗi thêm chi tiết sản phẩm:', err2);
          return res.status(500).json({ error: 'Không thể lưu chi tiết phiếu xuất.' });
        }

        return res.json({ message: '✅ Phiếu xuất kho đã lưu thành công!', receipt_code });
      });
    });
  } catch (error) {
    console.error('❌ Lỗi xử lý:', error);
    return res.status(500).json({ error: 'Lỗi máy chủ khi tạo phiếu xuất.' });
  }
});

//gọi phiếu xuất
app.get('/api/phieu-xuat', (req, res) => {
  const sql = `SELECT * FROM phieu_xuat_kho ORDER BY created_date DESC`;
  db.query(sql, (err, rows) => {
    if (err) return res.status(500).json({ error: 'Lỗi khi truy vấn phiếu xuất' });
    res.json(rows);
  });
});

//lấy danh sách sản phẩm trong phiếu xuất
app.get('/api/phieu-xuat/:id/san-pham', (req, res) => {
  const id = req.params.id;
  const sql = `SELECT * FROM phieu_xuat_kho_chi_tiet WHERE phieu_xuat_kho_id = ?`;
  db.query(sql, [id], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Lỗi khi truy vấn chi tiết phiếu' });
    res.json(rows);
  });
});

//admin cập nhật phản hồi cho phiếu nhập
app.put('/api/phieu-xuat/:id/admin-cap-nhat', (req, res) => {
  const id = req.params.id;
  const { trang_thai, note_admin, admin_account_name, admin_account_email } = req.body;

  const sql = `
    UPDATE phieu_xuat_kho
    SET trang_thai = ?, note_admin = ?, admin_account_name = ?, admin_account_email = ?
    WHERE id = ?
  `;
  db.query(sql, [trang_thai, note_admin, admin_account_name, admin_account_email, id], (err, result) => {
    if (err) {
      console.error('Lỗi khi cập nhật phiếu xuất:', err);
      return res.status(500).json({ message: 'Lỗi server' });
    }
    res.json({ message: 'Cập nhật thành công' });
  });
});

//kiểm tra đủ số lượng ko
app.get('/api/products-detail/check-available/:code/:required', async (req, res) => {
  const { code, required } = req.params;

  try {
    const [rows] = await db.promise().query(
      'SELECT SUM(quantity) AS total_quantity FROM products_detail WHERE product_code = ?',
      [code]
    );

    const quantityInStock = rows[0].total_quantity || 0;
    const isEnough = quantityInStock >= parseInt(required);

    res.json({
      product_code: code,
      enough: isEnough,
      available: quantityInStock,
      required: parseInt(required)
    });

  } catch (err) {
    console.error('❌ Lỗi truy vấn kiểm tra số lượng:', err);
    res.status(500).json({ error: 'Lỗi máy chủ' });
  }
});


//trừ số lượng trong kho 
app.post('/api/phieu-xuat/xac-nhan-xuat-kho/:id', async (req, res) => {
  const id = req.params.id;

  try {
    // 1. Lấy chi tiết phiếu xuất
    const [chiTiet] = await db.promise().query(
      'SELECT product_code, quantity FROM phieu_xuat_kho_chi_tiet WHERE phieu_xuat_kho_id = ?',
      [id]
    );

    // 2. Kiểm tra tồn kho từng sản phẩm
    for (const sp of chiTiet) {
      const [rows] = await db.promise().query(
        'SELECT SUM(quantity) AS total FROM products_detail WHERE product_code = ?',
        [sp.product_code]
      );
      const total = rows[0]?.total || 0;
      if (total < sp.quantity) {
        return res.status(400).json({
          message: `❌ Không đủ số lượng sản phẩm: ${sp.product_code}`
        });
      }
    }

    // 3. Trừ hàng từ nhiều lô (ưu tiên ít số lượng trước, location tăng dần số)
    for (const sp of chiTiet) {
      let remaining = sp.quantity;

      const [lots] = await db.promise().query(
        `SELECT id, khu_vuc_id, location, quantity 
         FROM products_detail 
         WHERE product_code = ? AND quantity > 0 
         ORDER BY quantity ASC, khu_vuc_id ASC, CAST(SUBSTRING(location, 2) AS UNSIGNED) ASC`,
        [sp.product_code]
      );

      for (const lot of lots) {
        if (remaining <= 0) break;

        const deduct = Math.min(lot.quantity, remaining);

        // Trừ hàng trong kho
        await db.promise().query(
          'UPDATE products_detail SET quantity = quantity - ? WHERE id = ?',
          [deduct, lot.id]
        );

        // Ghi log trừ hàng
        const palletName = `KV${lot.khu_vuc_id}__${lot.location || '??'}`;
        await db.promise().query(
          `INSERT INTO log_tru_hang (product_code, pallet_name, quantity_deducted, phieu_xuat_id)
           VALUES (?, ?, ?, ?)`,
          [sp.product_code, palletName, deduct, id]
        );

        remaining -= deduct;
      }
    }

    // 4. Cập nhật trạng thái phiếu
    await db.promise().query(
      'UPDATE phieu_xuat_kho SET trang_thai = "Đã xuất hàng khỏi kho" WHERE id = ?',
      [id]
    );

    res.json({ message: '✔️ Xác nhận xuất kho thành công!' });
  } catch (err) {
    console.error('❌ Lỗi xác nhận xuất kho:', err);
    res.status(500).json({
      message: 'Lỗi hệ thống khi xác nhận xuất kho.',
      error: err.message || err
    });
  }
});


// ========================== Xuất hóa đơn  ==========================
//cập nhật đã xuất hóa đơn nhập
app.put('/api/phieu-nhap/:id/xuat-hoa-don', (req, res) => {
  const id = req.params.id;

  const sql = 'UPDATE phieu_nhap_kho SET da_xuat_hoa_don = 1 WHERE id = ?';

  db.query(sql, [id], (err, result) => {
    if (err) {
      console.error('❌ Lỗi khi cập nhật da_xuat_hoa_don:', err);
      return res.status(500).json({ error: 'Lỗi server khi cập nhật trạng thái hóa đơn.' });
    }

    res.json({ success: true, message: '✅ Đã cập nhật trạng thái xuất hóa đơn.' });
  });
});

// Cập nhật đã xuất hóa đơn xuất
app.put('/api/phieu-xuat/:id/xuat-hoa-don', (req, res) => {
  const id = req.params.id;

  const sql = 'UPDATE phieu_xuat_kho SET da_xuat_hoa_don = 1 WHERE id = ?';

  db.query(sql, [id], (err, result) => {
    if (err) {
      console.error('❌ Lỗi khi cập nhật da_xuat_hoa_don (phiếu xuất):', err);
      return res.status(500).json({ error: 'Lỗi server khi cập nhật trạng thái hóa đơn (phiếu xuất).' });
    }

    res.json({ success: true, message: '✅ Đã cập nhật trạng thái xuất hóa đơn (phiếu xuất).' });
  });
});


// ========================== Xem toàn bộ hóa đơn ==========================
//api lấy toàn bộ hóa đơn 
// 🔧 API: Lấy toàn bộ hóa đơn (phiếu nhập + xuất), chi tiết + người tạo
app.get('/api/hoa-don', (req, res) => {
  const nhapQuery = `
    SELECT pnk.*, 'Phiếu nhập kho' AS loai,
           ui.full_name, ui.phone, ui.date_of_birth
    FROM phieu_nhap_kho pnk
    JOIN user_info ui ON pnk.user_id = ui.user_id
  `;

  const xuatQuery = `
    SELECT pxk.*, 'Phiếu xuất kho' AS loai,
           ui.full_name, ui.phone, ui.date_of_birth
    FROM phieu_xuat_kho pxk
    JOIN user_info ui ON pxk.user_id = ui.user_id
  `;

  db.query(nhapQuery, async (err1, nhapList) => {
    if (err1) {
      console.error('❌ Lỗi truy vấn phiếu nhập:', err1);
      return res.status(500).json({ message: 'Lỗi lấy phiếu nhập' });
    }

    try {
      const nhapWithDetails = await Promise.all(
        nhapList.map((pnk) => {
          return new Promise((resolve, reject) => {
            db.query(
              `SELECT * FROM phieu_nhap_kho_chi_tiet WHERE phieu_nhap_kho_id = ?`,
              [pnk.id],
              (err, products) => {
                if (err) return reject(err);
                pnk.products = products;
                resolve(pnk);
              }
            );
          });
        })
      );

      db.query(xuatQuery, async (err2, xuatList) => {
        if (err2) {
          console.error('❌ Lỗi truy vấn phiếu xuất:', err2);
          return res.status(500).json({ message: 'Lỗi lấy phiếu xuất' });
        }

        try {
          const xuatWithDetails = await Promise.all(
            xuatList.map((pxk) => {
              return new Promise((resolve, reject) => {
                db.query(
                  `SELECT * FROM phieu_xuat_kho_chi_tiet WHERE phieu_xuat_kho_id = ?`,
                  [pxk.id],
                  (err, products) => {
                    if (err) return reject(err);
                    pxk.products = products;
                    pxk.payment = null; // bỏ thanh toán
                    resolve(pxk);
                  }
                );
              });
            })
          );

          const hoaDonTong = [...nhapWithDetails, ...xuatWithDetails].sort((a, b) => {
            const dateA = new Date(a.created_at || a.created_date);
            const dateB = new Date(b.created_at || b.created_date);
            return dateB - dateA || b.id - a.id;
          });

          res.json(hoaDonTong);
        } catch (error) {
          console.error('❌ Lỗi tổng hợp chi tiết phiếu xuất:', error);
          res.status(500).json({ message: 'Lỗi tổng hợp phiếu xuất' });
        }
      });
    } catch (err) {
      console.error('❌ Lỗi tổng hợp chi tiết phiếu nhập:', err);
      res.status(500).json({ message: 'Lỗi tổng hợp phiếu nhập' });
    }
  });
});


// ========================== Quản lý location ==========================
// 🧠 API: Lấy tổng quan kho
app.get('/api/kho/overview', (req, res) => {
  const query1 = `SELECT * FROM vw_tong_suc_chua_kho`;
  const query2 = `SELECT * FROM thong_ke_khu_vuc_tong_quan ORDER BY khu_vuc_id`;

  db.query(query1, (err1, result1) => {
    if (err1) {
      console.error('❌ Lỗi query view 1:', err1);
      return res.status(500).json({ message: 'Lỗi khi lấy tổng sức chứa kho', error: err1 });
    }

    db.query(query2, (err2, result2) => {
      if (err2) {
        console.error('❌ Lỗi query view 2:', err2);
        return res.status(500).json({ message: 'Lỗi khi lấy thống kê khu vực', error: err2 });
      }

      return res.json({
        overview: result1[0],
        areas: result2
      });
    });
  });
});

app.get('/api/kho/area/:khuvucId', (req, res) => {
  const khuId = parseInt(req.params.khuvucId);

  if (isNaN(khuId)) {
    console.warn('⚠️ khu_vuc_id không hợp lệ:', req.params.khuvucId);
    return res.status(400).json({ message: '❌ khu_vuc_id không hợp lệ!' });
  }

  const prefix = `KV${khuId}_L`;

  const sql = `
    SELECT 
      location, 
      SUM(quantity * weight_per_unit) AS total_weight,
      SUM(quantity * area_per_unit) AS total_area
    FROM products_detail
    WHERE khu_vuc_id = ?
    GROUP BY location
    ORDER BY location ASC
  `;

  db.query(sql, [khuId], (err, result) => {
    if (err) {
      console.error('❌ Lỗi truy vấn pallet:', err);
      return res.status(500).json({ message: 'Lỗi khi truy vấn pallet' });
    }

    const fullPallets = [];

    for (let i = 1; i <= 100; i++) {
      const code = prefix + String(i).padStart(3, '0');
      const found = result.find(r => r.location === code);

      fullPallets.push({
        name: code,
        weightUsed: found ? Math.round(found.total_weight || 0) : 0,
        areaUsed: found ? Number((found.total_area || 0).toFixed(1)) : 0
      });
    }

    res.json(fullPallets);
  });
});


// Lấy danh sách sản phẩm trong 1 pallet
app.get('/api/kho/pallet/:location', (req, res) => {
  const location = req.params.location;

  const sql1 = `
    SELECT * 
    FROM products_detail 
    WHERE location = ? AND quantity > 0
  `;

  db.query(sql1, [location], (err1, results1) => {
    if (err1 || results1.length === 0) {
      console.error('❌ Lỗi truy vấn pallet:', err1);
      return res.status(500).json({ message: 'Không tìm thấy pallet hoặc không còn sản phẩm nào' });
    }

    // Duyệt từng sản phẩm, tìm location khác tương ứng
    const promises = results1.map((product) => {
      return new Promise((resolve, reject) => {
        const sql2 = `
          SELECT location 
          FROM products_detail
          WHERE product_code = ? AND location != ? AND quantity > 0
          ORDER BY location ASC
        `;

        db.query(sql2, [product.product_code, location], (err2, locs) => {
          if (err2) return reject(err2);
          resolve({
            product,
            otherLocations: locs.map(l => l.location)
          });
        });
      });
    });

    Promise.all(promises)
      .then((finalList) => {
        res.json({ products: finalList });
      })
      .catch((err) => {
        console.error('❌ Lỗi truy vấn location:', err);
        res.status(500).json({ message: 'Lỗi khi truy vấn vị trí khác' });
      });
  });
});

// ✅ API mới: Trả về tất cả dòng sản phẩm theo product_code (không LIMIT)
app.get('/api/products-detail/all-by-code/:code', (req, res) => {
  const productCode = req.params.code;

  const query = `
    SELECT 
      pd.id,
      pd.product_code,
      pd.old_product_code,
      pd.product_name,
      pd.product_type,
      pd.unit,
      pd.image_url,
      pd.weight_per_unit,
      pd.area_per_unit,
      pd.unit_price,
      pd.manufacture_date,
      pd.expiry_date,
      pd.quantity,
      pd.location,
      pd.khu_vuc_id,
      kv.ten_khu_vuc,
      
      -- Thông tin NCC
      pd.supplier_name,
      pd.logo_url,

      -- Thông tin đại diện từ phiếu nhập
      pnk.supplier_address,
      pnk.representative_name,
      pnk.representative_email,
      pnk.representative_phone

    FROM products_detail pd
    LEFT JOIN khu_vuc kv ON pd.khu_vuc_id = kv.id
    LEFT JOIN phieu_nhap_kho pnk ON pd.receipt_code = pnk.receipt_code

    WHERE pd.product_code = ?
    ORDER BY pd.location ASC
  `;

  db.query(query, [productCode], (err, results) => {
    if (err) {
      console.error('❌ Lỗi truy vấn danh sách sản phẩm:', err);
      return res.status(500).json({ message: 'Lỗi truy vấn CSDL' });
    }

    res.json(results);
  });
});

// API: Kiểm tra số lượng tối đa có thể thêm tại location đó
app.get('/api/products-detail/kha-dung/:location/:productId', async (req, res) => {
  const { location, productId } = req.params;

  try {
    const [rows] = await db.promise().query(`
      SELECT 
        SUM(quantity * weight_per_unit) AS used_weight
      FROM products_detail
      WHERE location = ?
    `, [location]);

    const used = rows[0]?.used_weight || 0;
    const maxWeight = 500;

    // Lấy trọng lượng mỗi đơn vị của dòng sản phẩm cần cập nhật
    const [prodRows] = await db.promise().query(`
      SELECT weight_per_unit FROM products_detail WHERE id = ?
    `, [productId]);

    if (!prodRows.length) {
      return res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
    }

    const weightPerUnit = prodRows[0].weight_per_unit || 0;
    const remaining = Math.max(0, maxWeight - used);

    const maxQuantityCanAdd = weightPerUnit > 0 ? Math.floor(remaining / weightPerUnit) : 0;

    res.json({
      used_weight: used,
      remaining_weight: remaining,
      weight_per_unit: weightPerUnit,
      max_quantity_can_add: maxQuantityCanAdd
    });
  } catch (err) {
    console.error('❌ Lỗi khi tính khối lượng khả dụng:', err);
    res.status(500).json({ message: 'Lỗi máy chủ khi kiểm tra sức chứa' });
  }
});


// ========================== chuyển vị trí , và lưu cập nhật ==========================
app.post('/api/kho/chuyen-pallet', (req, res) => {
  const { products, from, to, user_email } = req.body;

  if (!products?.length || !from || !to || !user_email)
    return res.status(400).json({ message: "Thiếu thông tin" });

  const updates = products.map(prod => {
    return new Promise((resolve, reject) => {
      const sql = `UPDATE products_detail SET location = ? WHERE id = ?`;
      db.query(sql, [to, prod.id], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  });

  Promise.all(updates)
    .then(() => {
      const logSql = `INSERT INTO location_transfer_log (product_code, from_location, to_location, user_email, transfer_time)
                      VALUES ?`;
      const values = products.map(p => [p.product_code, from, to, user_email, new Date()]);
      db.query(logSql, [values], (err2) => {
        if (err2) console.error('❌ Ghi log lỗi:', err2);
      });
      res.json({ message: "Chuyển hàng thành công" });
    })
    .catch(err => {
      console.error("❌ Lỗi chuyển:", err);
      res.status(500).json({ message: "Lỗi chuyển pallet" });
    });
});


// GET toàn bộ log theo email
app.get('/api/kho/transfer-log', (req, res) => {
  const email = req.query.email;
  db.query(
    'SELECT * FROM location_transfer_log WHERE user_email = ? ORDER BY transfer_time DESC',
    [email],
    (err, results) => {
      if (err) {
        console.error("❌ Lỗi truy vấn log:", err);
        return res.status(500).json({ message: 'Lỗi truy vấn log' });
      }
      res.json(results);
    }
  );
});



// ========================== Quản lý hàng tồn==========================

// API trả về toàn bộ chi tiết sản phẩm tồn kho
app.get('/api/products-detail', async (req, res) => {
  try {
    const [rows] = await db.promise().query(`
      SELECT 
        product_code, 
        product_name,
        product_type, 
        unit,
        SUM(quantity) AS total_quantity,
        weight_per_unit
      FROM products_detail
      GROUP BY product_code, product_name, product_type, unit, weight_per_unit
      ORDER BY product_code ASC
    `);

    res.json(rows);
  } catch (err) {
    console.error('❌ Lỗi truy vấn products_detail:', err);
    res.status(500).json({ message: 'Lỗi khi lấy dữ liệu sản phẩm tồn kho' });
  }
});

// API này sẽ trả về các lô hàng chi tiết theo product_code
// Trả về danh sách các lô hàng (vị trí, khu vực, số lượng...)
app.get('/api/products-detail/batch-list/:code', (req, res) => {
  const code = req.params.code;
  const sql = `
    SELECT location, quantity, import_date, kv.ten_khu_vuc
    FROM products_detail pd
    JOIN khu_vuc kv ON pd.khu_vuc_id = kv.id
    WHERE pd.product_code = ? AND pd.quantity > 0
    ORDER BY import_date DESC
  `;
  db.query(sql, [code], (err, rows) => {
    if (err) {
      console.error('❌ Lỗi truy vấn /batch-list:', err);
      return res.status(500).json({ message: 'Lỗi truy vấn', error: err });
    }
    res.json(rows);
  });
});



// API này sẽ trả về các lịch sử trừ hàng
// Cập nhật API để cắt chuỗi đúng phần location từ pallet_name
app.get('/api/log-tru-hang/:productCode', async (req, res) => {
  const code = req.params.productCode;

  try {
    const [rows] = await db.promise().query(
      `SELECT 
         lth.pallet_name, 
         lth.quantity_deducted, 
         lth.timestamp, 
         kv.ten_khu_vuc,
         kv.mo_ta,
         px.receipt_code
       FROM log_tru_hang lth
       LEFT JOIN products_detail pd 
         ON pd.product_code = lth.product_code 
         AND pd.location = SUBSTRING_INDEX(lth.pallet_name, '__', -1)
       LEFT JOIN khu_vuc kv ON kv.id = pd.khu_vuc_id
       LEFT JOIN phieu_xuat_kho px ON px.id = lth.phieu_xuat_id
       WHERE lth.product_code = ?
       ORDER BY lth.timestamp DESC`,
      [code]
    );

    const data = rows.map(row => ({
      // 👉 chỉ lấy phần sau dấu `__`
      pallet_name: row.pallet_name.includes('__')
        ? row.pallet_name.split('__')[1]
        : row.pallet_name,

      quantity_deducted: row.quantity_deducted,
      timestamp: row.timestamp,
      ten_khu_vuc: row.ten_khu_vuc || 'Không rõ',
      khu_vuc_mo_ta: row.mo_ta || 'Không rõ',
      receipt_code: row.receipt_code || 'Chưa có mã'
    }));

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '❌ Lỗi khi lấy log trừ hàng' });
  }
});


// ✅ Trả về danh sách sản phẩm số lượng sản phẩm đó nhập kho
// ✅ Trả về danh sách sản phẩm theo product_code, kèm is_checking nếu có lô đang kiểm
app.get('/api/products-detail/with-deducted', async (req, res) => {
  try {
    const [products] = await db.promise().query(`
      SELECT 
        pd.product_code,
        MAX(pd.product_name) AS product_name,
        MAX(pd.product_type) AS product_type,
        MAX(pd.image_url) AS image_url,
        MAX(pd.unit) AS unit,
        SUM(pd.quantity) AS quantity,
        MAX(pd.expiry_date) AS expiry_date,
        MAX(pd.manufacture_date) AS manufacture_date,  -- ✅ Thêm dòng này
        MAX(pd.unit_price) AS unit_price,
        MAX(pd.khu_vuc_id) AS khu_vuc_id,
        MAX(kv.ten_khu_vuc) AS ten_khu_vuc,
        MAX(pd.id) AS id,
        MAX(CASE WHEN pd.is_checking = 1 THEN 1 ELSE 0 END) AS is_checking,

        MAX(kkl.actual_quantity) AS soLuongThucTe,
        MAX(kkl.checked_by_email) AS emailNhanVien,
        MAX(kkl.ghi_chu) AS ghiChuKiemKe

      FROM products_detail pd
      JOIN khu_vuc kv ON pd.khu_vuc_id = kv.id
      LEFT JOIN (
        SELECT kk.*
        FROM kiem_ke_chi_tiet kk
        JOIN (
          SELECT product_detail_id, MAX(checked_at) AS max_checked_at
          FROM kiem_ke_chi_tiet
          WHERE checked_at IS NOT NULL
          GROUP BY product_detail_id
        ) latest ON latest.product_detail_id = kk.product_detail_id AND latest.max_checked_at = kk.checked_at
      ) kkl ON kkl.product_detail_id = pd.id
      GROUP BY pd.product_code
    `);

    const [logs] = await db.promise().query(`
      SELECT product_code, SUM(quantity_deducted) AS total_deducted
      FROM log_tru_hang
      GROUP BY product_code
    `);

    const [receiptCounts] = await db.promise().query(`
      SELECT 
        lh.product_code, 
        COUNT(DISTINCT px.receipt_code) AS total_receipts
      FROM log_tru_hang lh
      JOIN phieu_xuat_kho px ON lh.phieu_xuat_id = px.id
      GROUP BY lh.product_code
    `);

    const logMap = {}, receiptMap = {};
    logs.forEach(log => {
      logMap[log.product_code] = log.total_deducted;
    });
    receiptCounts.forEach(rc => {
      receiptMap[rc.product_code] = rc.total_receipts;
    });

    const result = products.map(p => ({
      ...p,
      total_deducted: logMap[p.product_code] || 0,
      total_receipts: receiptMap[p.product_code] || 0
    }));

    res.json(result);
  } catch (err) {
    console.error('❌ Lỗi lấy dữ liệu hàng tồn:', err);
    res.status(500).json({ message: 'Lỗi khi lấy dữ liệu hàng tồn' });
  }
});


// ========================== Quản lý nhà cung cấp ==========================
// 👉 Trả về danh sách tất cả khu vực có trong hệ thống (id + tên)
app.get('/api/khu-vuc', (req, res) => {
  db.query('SELECT id, ten_khu_vuc FROM khu_vuc', (err, result) => {
    if (err) return res.status(500).json({ error: 'Lỗi server' });
    res.json(result);
  });
});

// 👉 Trả về nhà cung cấp gần nhất cho sản phẩm có mã `product_code`
// 👉 Nếu truyền query `khu_vuc_id`, chỉ tìm trong khu vực đó
app.get('/api/suppliers/by-product/:product_code', (req, res) => {
  const code = req.params.product_code;
  const khuVucId = req.query.khu_vuc_id;

  let sql = `
    SELECT 
      phieu_nhap_kho.supplier_name, 
      phieu_nhap_kho.logo_url, 
      phieu_nhap_kho.representative_name, 
      phieu_nhap_kho.representative_email, 
      phieu_nhap_kho.representative_phone,
      products_detail.product_name,
      products_detail.product_code
    FROM products_detail
    LEFT JOIN phieu_nhap_kho 
      ON products_detail.receipt_code = phieu_nhap_kho.receipt_code
    WHERE products_detail.product_code = ?
  `;
  const params = [code];

  if (khuVucId) {
    sql += ' AND products_detail.khu_vuc_id = ?';
    params.push(khuVucId);
  }

  sql += ' ORDER BY products_detail.id DESC LIMIT 1';

  db.query(sql, params, (err, result) => {
    if (err) {
      console.error('❌ Lỗi truy vấn by-product:', err);
      return res.status(500).json({ error: 'Lỗi server' });
    }

    if (result.length === 0) {
      return res.json({ exists: false });
    }

    res.json({ exists: true, supplier: result[0] });
  });
});


// 👉 Trả về nhà cung cấp mới nhất trong khu vực (mỗi NCC duy nhất)
app.get('/api/suppliers/by-khu-vuc/:khuvuc_id', (req, res) => {
  const khuVucId = req.params.khuvuc_id;

  const sql = `
    SELECT 
      pnk.supplier_name,
      pnk.logo_url,
      pnk.representative_name,
      pnk.representative_email,
      pnk.representative_phone,
      MAX(pd.import_date) AS newest_import
    FROM products_detail pd
    JOIN phieu_nhap_kho pnk ON pd.receipt_code = pnk.receipt_code
    WHERE pd.khu_vuc_id = ?
      AND pnk.supplier_name IS NOT NULL
    GROUP BY 
      pnk.supplier_name,
      pnk.logo_url,
      pnk.representative_name,
      pnk.representative_email,
      pnk.representative_phone
    ORDER BY newest_import DESC
  `;

  db.query(sql, [khuVucId], (err, result) => {
    if (err) {
      console.error('❌ Lỗi truy vấn khu vực:', err);
      return res.status(500).json({ error: 'Lỗi server' });
    }
    res.json(result);
  });
});


// 👉 Trả về 10 nhà cung cấp có thời gian nhập hàng gần nhất (theo import_date)
app.get('/api/suppliers/recent', (req, res) => {
  const sql = `
    SELECT 
      phieu_nhap_kho.supplier_name,
      phieu_nhap_kho.logo_url,
      phieu_nhap_kho.representative_name,
      phieu_nhap_kho.representative_email,
      phieu_nhap_kho.representative_phone,
      MAX(products_detail.import_date) AS newest_import
    FROM products_detail
    JOIN phieu_nhap_kho 
      ON products_detail.receipt_code = phieu_nhap_kho.receipt_code
    GROUP BY 
      phieu_nhap_kho.supplier_name, 
      phieu_nhap_kho.logo_url, 
      phieu_nhap_kho.representative_name, 
      phieu_nhap_kho.representative_email, 
      phieu_nhap_kho.representative_phone
    ORDER BY newest_import DESC
    LIMIT 10
  `;

  db.query(sql, (err, result) => {
    if (err) {
      console.error('❌ Lỗi truy vấn recent suppliers:', err);
      return res.status(500).json({ error: 'Lỗi server' });
    }
    res.json(result);
  });
});

// 👉 Trả về:
//    - logo nhà cung cấp
//    - danh sách đại diện (không trùng)
//    - danh sách mã sản phẩm đã từng nhập
app.get('/api/suppliers/detail-by-name/:supplier_name', (req, res) => {
  const name = req.params.supplier_name;

  const sql = `
    SELECT 
      pnk.logo_url,
      pnk.representative_name,
      pnk.representative_email,
      pnk.representative_phone,
      pd.product_code,
      pd.product_name,
      pd.image_url,               -- ✅ thêm dòng này để lấy ảnh sản phẩm
      pd.import_date
    FROM products_detail pd
    JOIN phieu_nhap_kho pnk ON pd.receipt_code = pnk.receipt_code
    WHERE pnk.supplier_name = ?
    ORDER BY pd.import_date ASC
  `;

  db.query(sql, [name], (err, rows) => {
    if (err) {
      console.error('❌ Lỗi truy vấn chi tiết NCC:', err);
      return res.status(500).json({ error: 'Lỗi server' });
    }

    if (rows.length === 0) return res.json({ exists: false });

    const grouped = new Map();

    for (const row of rows) {
      const key = `${row.logo_url}_${row.import_date}`;

      if (!grouped.has(key)) {
        grouped.set(key, {
          logo_url: row.logo_url,
          import_date: row.import_date,
          dai_dien: [],
          san_pham: [],
          rep_set: new Set(),
          sp_set: new Set()
        });
      }

      const g = grouped.get(key);
      const repKey = `${row.representative_email}_${row.representative_phone}`;
      if (!g.rep_set.has(repKey)) {
        g.rep_set.add(repKey);
        g.dai_dien.push({
          name: row.representative_name,
          email: row.representative_email,
          phone: row.representative_phone
        });
      }

      const spKey = row.product_code;
      if (!g.sp_set.has(spKey)) {
        g.sp_set.add(spKey);
        g.san_pham.push({
          code: row.product_code,
          name: row.product_name,
          image_url: row.image_url  // ✅ thêm dòng này để trả ảnh về frontend
        });
      }
    }

    const danhSachNhap = Array.from(grouped.values()).map(g => ({
      logo_url: g.logo_url,
      import_date: g.import_date,
      dai_dien: g.dai_dien,
      san_pham: g.san_pham
    }));

    res.json({
      exists: true,
      supplier_name: name,
      lich_su_nhap: danhSachNhap
    });
  });
});




// 👉 Trả về nhà cung cấp gần nhất cho sản phẩm có tên giống `product_name`
// 👉 Nếu truyền query `khu_vuc_id`, chỉ tìm trong khu vực đó
app.get('/api/suppliers/by-product-name/:product_name', (req, res) => {
  const name = decodeURIComponent(req.params.product_name);
  const khuVucId = req.query.khu_vuc_id;

  let sql = `
    SELECT DISTINCT 
      pnk.supplier_name,
      pnk.logo_url
    FROM products_detail pd
    LEFT JOIN phieu_nhap_kho pnk ON pd.receipt_code = pnk.receipt_code
    WHERE pd.product_name LIKE ?
  `;
  const params = [`%${name}%`];

  if (khuVucId) {
    sql += ` AND pd.khu_vuc_id = ?`;
    params.push(khuVucId);
  }

  sql += ` ORDER BY pd.id DESC`;

  db.query(sql, params, (err, result) => {
    if (err) {
      console.error('❌ Lỗi truy vấn by-product-name:', err);
      return res.status(500).json({ error: 'Lỗi server' });
    }

    res.json(result); // Trả về danh sách logo NCC
  });
});


// ========================== Kiểm kê hàng hóa  ==========================
// ========================== API Cũ ==========================
// ✅ Tạo đợt kiểm kê (callback style)
// ✅ Tạo đợt kiểm kê (đã thêm cập nhật trạng thái is_checking)
app.post('/api/kiem-ke/create', (req, res) => {
  const { email, sanPhamIds } = req.body;

  if (!Array.isArray(sanPhamIds)) {
    return res.status(400).json({ success: false, message: 'Dữ liệu không hợp lệ' });
  }

  // ✅ Nếu gửi mảng rỗng → huỷ toàn bộ kiểm kê
  if (sanPhamIds.length === 0) {
    db.query('UPDATE products_detail SET is_checking = 0', (err) => {
      if (err) {
        console.error('❌ Lỗi huỷ kiểm kê:', err);
        return res.status(500).json({ success: false, message: 'Lỗi huỷ kiểm kê' });
      }
      return res.json({ success: true, message: 'Đã huỷ toàn bộ kiểm kê.' });
    });
    return;
  }

  // ✅ Nếu có danh sách → tạo đợt kiểm kê
  db.query('INSERT INTO kiem_ke_dot (created_by_email) VALUES (?)', [email], (err, result) => {
    if (err) {
      console.error('❌ Lỗi tạo đợt kiểm kê:', err);
      return res.status(500).json({ success: false });
    }

    const dotId = result.insertId;
    const values = sanPhamIds.map(id => [dotId, id]);

    db.query('INSERT INTO kiem_ke_chi_tiet (dot_id, product_detail_id) VALUES ?', [values], (err2) => {
      if (err2) {
        console.error('❌ Lỗi tạo chi tiết kiểm kê:', err2);
        return res.status(500).json({ success: false });
      }

      const placeholders = sanPhamIds.map(() => '?').join(',');
      const updateSql = `UPDATE products_detail SET is_checking = 1 WHERE id IN (${placeholders})`;

      db.query(updateSql, sanPhamIds, (err3) => {
        if (err3) {
          console.error('❌ Lỗi cập nhật is_checking:', err3);
          return res.status(500).json({ success: false });
        }

        res.json({ success: true, dotId });
      });
    });
  });
});

// ✅ API: Lấy danh sách sản phẩm kiểm kê và gộp theo mã sản phẩm
// ✅ API: Lấy danh sách sản phẩm kiểm kê và gộp theo mã sản phẩm
app.get('/api/kiem-ke/dot/:dotId', (req, res) => {
  const { dotId } = req.params;

  const sql = `
    SELECT 
    sp.product_code,
    MIN(sp.product_name) AS product_name,
    SUM(sp.quantity) AS total_quantity,
    MIN(sp.image_url) AS image_url,
    GROUP_CONCAT(DISTINCT kv.ten_khu_vuc SEPARATOR ', ') AS ten_khu_vuc,
    MIN(kkct.actual_quantity) AS actual_quantity,
    MIN(kkct.ghi_chu) AS ghi_chu,
    MIN(kkct.checked_by_email) AS checked_by_email, -- thêm dòng này
    GROUP_CONCAT(kkct.product_detail_id) AS product_detail_ids
  FROM kiem_ke_chi_tiet kkct
  JOIN products_detail sp ON kkct.product_detail_id = sp.id
  JOIN khu_vuc kv ON sp.khu_vuc_id = kv.id
  WHERE kkct.dot_id = ?
    AND sp.is_checking = 1
  GROUP BY sp.product_code
  `;

  db.query(sql, [dotId], async (err, rows) => {
    if (err) {
      console.error('❌ Lỗi lấy danh sách kiểm kê:', err);
      return res.status(500).json({ error: 'Lỗi server' });
    }

    try {
      for (const row of rows) {
        // 🔍 Lấy toàn bộ các pallet chứa mã sản phẩm
        const [pallets] = await db.promise().query(`
          SELECT location, quantity
          FROM products_detail
          WHERE product_code = ?
        `, [row.product_code]);

        // Gán vào object
        row.pallets = pallets;

        // ✅ Tính tổng lại từ tất cả các pallet
        row.total_quantity = pallets.reduce((sum, p) => sum + (p.quantity || 0), 0);
      }

      res.json(rows);
    } catch (e) {
      console.error('❌ Lỗi khi xử lý pallets:', e);
      res.status(500).json({ error: 'Lỗi khi xử lý dữ liệu pallet' });
    }
  });
});

// API: Lấy tất cả product_detail.id từ danh sách product_code
app.post('/api/products-detail/by-codes', (req, res) => {
  const { productCodes } = req.body;

  if (!Array.isArray(productCodes) || productCodes.length === 0) {
    return res.status(400).json({ error: 'Danh sách mã sản phẩm không hợp lệ' });
  }

  const placeholders = productCodes.map(() => '?').join(',');
  const sql = `SELECT id, product_code FROM products_detail WHERE product_code IN (${placeholders})`;

  db.query(sql, productCodes, (err, rows) => {
    if (err) {
      console.error('❌ Lỗi truy vấn product_detail:', err);
      return res.status(500).json({ error: 'Lỗi server' });
    }

    res.json(rows); // Trả về danh sách id và product_code tương ứng
  });
});

// ✅ Hủy trạng thái kiểm kê cho các sản phẩm bị bỏ chọn
app.post('/api/kiem-ke/unmark', async (req, res) => {
  const { productIds } = req.body;
  try {
    await db.query('UPDATE products_detail SET is_checking = 0 WHERE id IN (?)', [productIds]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Lỗi server khi unmark sản phẩm.' });
  }
});


// ✅ Nhận kết quả kiểm kê
app.post('/api/kiem-ke/submit', (req, res) => {
  const { dot_id, email, data } = req.body;

  if (!Array.isArray(data)) {
    return res.status(400).json({ error: 'Dữ liệu không hợp lệ' });
  }

  let completed = 0;
  let hasError = false;

  if (data.length === 0) return res.json({ success: true });

  data.forEach(item => {
    const sql = `
      UPDATE kiem_ke_chi_tiet
      SET actual_quantity = ?, ghi_chu = ?, checked_by_email = ?, checked_at = NOW()
      WHERE dot_id = ? AND product_detail_id = ?
    `;
    const params = [item.actual_quantity, item.ghi_chu, email, dot_id, item.product_detail_id];

    db.query(sql, params, (err) => {
      if (err && !hasError) {
        hasError = true;
        console.error('❌ Lỗi cập nhật kiểm kê:', err);
        return res.status(500).json({ error: 'Lỗi server' });
      }

      completed++;
      if (completed === data.length && !hasError) {
        res.json({ success: true });
      }
    });
  });
});

// ========================== API Mới ==========================
// 1. Tạo đợt kiểm kê: ma_dot tự động, ten_dot người dùng nhập
app.post('/api/kiem-ke/tao-dot', (req, res) => {
  const { ten_dot, created_by_email } = req.body;
  if (!ten_dot || !created_by_email) {
    return res.status(400).json({ success: false, message: 'Thiếu tên đợt hoặc email.' });
  }

  const today = new Date();
  const dateForCode = `${String(today.getDate()).padStart(2, '0')}${String(today.getMonth() + 1).padStart(2, '0')}${today.getFullYear()}`;

  const findSql = `
    SELECT ma_dot FROM kiem_ke_dot 
    WHERE DATE(created_at) = CURDATE()
    ORDER BY id DESC LIMIT 1
  `;

  db.query(findSql, [], (err, rows) => {
    if (err) return res.status(500).json({ success: false, message: 'DB error.' });

    let next = 1;
    if (rows.length > 0) {
      const current = rows[0].ma_dot;
      const numberPart = parseInt(current.split('_')[0].replace('KK', ''));
      if (!isNaN(numberPart)) next = numberPart + 1;
    }

    const ma_dot = `KK${String(next).padStart(3, '0')}_${dateForCode}`;
    const insertSql = `
      INSERT INTO kiem_ke_dot (ma_dot, ten_dot, created_by_email)
      VALUES (?, ?, ?)
    `;

    db.query(insertSql, [ma_dot, ten_dot, created_by_email], (err2, insertResult) => {
      if (err2) return res.status(500).json({ success: false, message: 'Không thể tạo đợt.' });

      db.query(`SELECT * FROM kiem_ke_dot WHERE id = ?`, [insertResult.insertId], (err3, rows2) => {
        if (err3 || !rows2.length) return res.status(500).json({ success: false, message: 'Lỗi sau khi tạo đợt.' });

        const dot = rows2[0];
        res.json({
          success: true,
          dotId: dot.id,
          ma_dot: dot.ma_dot,
          ten_dot: dot.ten_dot,
          created_at: dot.created_at
        });
      });
    });
  });
});


// 2. Gán sản phẩm vào đợt kiểm kê (theo id hoặc theo product_code)
app.post('/api/kiem-ke/gan-san-pham-vao-dot', (req, res) => {
  const { dot_id, product_detail_ids = [], product_codes = [] } = req.body;

  if (!dot_id || (!Array.isArray(product_detail_ids) && !Array.isArray(product_codes))) {
    return res.status(400).json({ success: false, message: 'Thiếu dot_id hoặc danh sách sản phẩm.' });
  }

  // Hàm thực hiện insert
  const insertChiTiet = (ids) => {
    if (ids.length === 0) {
      return res.status(400).json({ success: false, message: 'Không có sản phẩm nào để gán.' });
    }

    const values = ids.map(id => [dot_id, id]);
    const sql = `INSERT INTO kiem_ke_chi_tiet (dot_id, product_detail_id)
                 VALUES ? ON DUPLICATE KEY UPDATE dot_id = VALUES(dot_id)`;

    db.query(sql, [values], (err, result) => {
      if (err) return res.status(500).json({ success: false, message: 'Lỗi khi gán sản phẩm.' });
      res.json({
        success: true,
        message: `✅ Đã gán thành công ${ids.length} pallet vào đợt kiểm kê.`,
        total_gan: ids.length
      });
    });
  };

  // Trường hợp gán theo ID trực tiếp
  if (product_detail_ids.length > 0) {
    insertChiTiet(product_detail_ids);
  }
  // Trường hợp gán theo mã sản phẩm → lấy toàn bộ pallet có product_code tương ứng
  else if (product_codes.length > 0) {
    const placeholders = product_codes.map(() => '?').join(',');
    const sqlGet = `SELECT id FROM products_detail WHERE product_code IN (${placeholders})`;

    db.query(sqlGet, product_codes, (err, rows) => {
      if (err) return res.status(500).json({ success: false, message: 'Lỗi truy vấn sản phẩm.' });
      const ids = rows.map(r => r.id);
      insertChiTiet(ids);
    });
  } else {
    res.status(400).json({ success: false, message: 'Không có dữ liệu hợp lệ để xử lý.' });
  }
});

// 3. Lấy danh sách sản phẩm của 1 đợt kiểm kê
app.get('/api/kiem-ke/dot/:dotId/san-pham', (req, res) => {
  const { dotId } = req.params;

  const sql = `
    SELECT 
      pd.product_code,
      MAX(pd.product_name) AS product_name,
      MAX(pd.image_url) AS image_url,
      MAX(kv.ten_khu_vuc) AS ten_khu_vuc,
      SUM(pd.quantity) AS system_quantity,
      SUM(IFNULL(kkct.actual_quantity, 0)) AS actual_quantity,
      GROUP_CONCAT(kkct.checked_by_email SEPARATOR ', ') AS checked_by_email_list,
      GROUP_CONCAT(kkct.ghi_chu SEPARATOR '; ') AS ghi_chu,
      GROUP_CONCAT(kkct.id) AS kiem_ke_chi_tiet_ids,
      MAX(pd.unit_price) AS unit_price
    FROM kiem_ke_chi_tiet kkct
    JOIN products_detail pd ON kkct.product_detail_id = pd.id
    JOIN khu_vuc kv ON pd.khu_vuc_id = kv.id
    WHERE kkct.dot_id = ?
    GROUP BY pd.product_code
    ORDER BY pd.product_code DESC
  `;

  db.query(sql, [dotId], (err, rows) => {
    if (err) {
      console.error('❌ Lỗi lấy sản phẩm kiểm kê:', err);
      return res.status(500).json({ success: false, message: 'Lỗi truy vấn' });
    }

    const formatted = rows.map(row => ({
      ...row,
      checked_by_email: row.checked_by_email_list?.split(',')[0] || null,
      actual_quantity: Number(row.actual_quantity) || null,
      system_quantity: Number(row.system_quantity) || 0,
      kiem_ke_chi_tiet_id: (row.kiem_ke_chi_tiet_ids || '').split(',')[0] || null, // để cập nhật một dòng
      ghi_chu: row.ghi_chu?.split('; ')[0] || '' // ✅ thêm dòng này
    }));

    res.json({ success: true, data: formatted });
  });
});


// 4. Cập nhật kết quả kiểm kê
app.post('/api/kiem-ke/cap-nhat-chi-tiet', (req, res) => {
  const { kiem_ke_chi_tiet_id, actual_quantity, ghi_chu, checked_by_email } = req.body;

  if (!kiem_ke_chi_tiet_id || actual_quantity === undefined || !checked_by_email) {
    return res.status(400).json({ success: false, message: 'Thiếu dữ liệu.' });
  }

  const sql = `
    UPDATE kiem_ke_chi_tiet
    SET actual_quantity = ?, ghi_chu = ?, checked_by_email = ?, checked_at = NOW()
    WHERE id = ?;
  `;

  db.query(sql, [actual_quantity, ghi_chu, checked_by_email, kiem_ke_chi_tiet_id], (err, result) => {
    if (err) return res.status(500).json({ success: false, message: 'Lỗi cập nhật kết quả kiểm kê.' });
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy bản ghi.' });
    }
    res.json({ success: true, message: 'Đã cập nhật kết quả kiểm kê.' });
  });
});

// 5. Lấy danh sách các đợt kiểm kê đã kết thúc
app.get('/api/kiem-ke/danh-sach-dot', (req, res) => {
  const sql = `
    SELECT id, ma_dot, ten_dot, created_at, created_by_email
    FROM kiem_ke_dot
    WHERE status = 'da_ket_thuc'
    ORDER BY created_at DESC
  `;

  db.query(sql, (err, rows) => {
    if (err) {
      console.error('❌ Lỗi lấy danh sách đợt:', err);
      return res.status(500).json({ success: false, message: 'Lỗi lấy danh sách đợt.' });
    }

    res.json({ success: true, data: rows });
  });
});

// Lấy đợt kiểm kê đang hoạt động
app.get('/api/kiem-ke/dot-dang-kiem', (req, res) => {
  const sql = `
    SELECT id, ma_dot, ten_dot, created_at, created_by_email
    FROM kiem_ke_dot
    WHERE status = 'dang_kiem'
    ORDER BY created_at DESC
    LIMIT 1
  `;
  db.query(sql, (err, rows) => {
    if (err) return res.status(500).json({ success: false });
    if (rows.length === 0) {
      return res.json({ success: true, data: null });
    }
    res.json({ success: true, data: rows[0] });
  });
});

// 6. Báo cáo chi tiết 1 đợt kiểm kê
app.get('/api/kiem-ke/bao-cao-dot/:dotId', (req, res) => {
  const { dotId } = req.params;
  const sql = `
    SELECT
      kkct.id AS kiem_ke_chi_tiet_id,
      pd.product_code,
      pd.product_name,
      pd.image_url, -- ✅ Thêm dòng này
      pd.unit_price,
      pd.quantity AS system_quantity,
      kkct.actual_quantity,
      kkct.ghi_chu,
      kkct.checked_by_email,
      kkct.checked_at,
      kv.ten_khu_vuc
    FROM kiem_ke_chi_tiet kkct
    JOIN products_detail pd ON kkct.product_detail_id = pd.id
    JOIN khu_vuc kv ON pd.khu_vuc_id = kv.id
    WHERE kkct.dot_id = ?;
  `;

  db.query(sql, [dotId], (err, rows) => {
    if (err) return res.status(500).json({ success: false, message: 'Lỗi lấy báo cáo.' });
    res.json({ success: true, data: rows });
  });
});

// 7. Reset kết quả kiểm kê của một sản phẩm (Admin dùng khi bấm "Đếm lại")
app.post('/api/kiem-ke/reset-san-pham', (req, res) => {
  const { product_code, dot_id } = req.body;

  if (!product_code || !dot_id) {
    return res.status(400).json({ success: false, message: 'Thiếu mã sản phẩm hoặc đợt kiểm kê.' });
  }

  // Tìm tất cả product_detail_id theo product_code
  const sqlGetIds = `
    SELECT kkct.id
    FROM kiem_ke_chi_tiet kkct
    JOIN products_detail pd ON kkct.product_detail_id = pd.id
    WHERE pd.product_code = ? AND kkct.dot_id = ?
  `;

  db.query(sqlGetIds, [product_code, dot_id], (err, rows) => {
    if (err) {
      console.error('❌ Lỗi truy vấn:', err);
      return res.status(500).json({ success: false, message: 'Lỗi truy vấn sản phẩm kiểm kê.' });
    }

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy dữ liệu kiểm kê cần reset.' });
    }

    const ids = rows.map(r => r.id);
    const placeholders = ids.map(() => '?').join(',');

    const sqlReset = `
      UPDATE kiem_ke_chi_tiet
      SET actual_quantity = NULL,
          ghi_chu = '',
          checked_by_email = NULL,
          checked_at = NULL
      WHERE id IN (${placeholders})
    `;

    db.query(sqlReset, ids, (err2, result) => {
      if (err2) {
        console.error('❌ Lỗi cập nhật:', err2);
        return res.status(500).json({ success: false, message: 'Lỗi reset dữ liệu kiểm kê.' });
      }

      res.json({ success: true, message: `Đã reset ${result.affectedRows} bản ghi kiểm kê.` });
    });
  });
});

// Xóa dòng kiểm kê 
app.post('/api/kiem-ke/xoa-san-pham-khoi-dot', (req, res) => {
  const { product_code, dot_id } = req.body;
  if (!product_code || !dot_id) {
    return res.status(400).json({ success: false, message: 'Thiếu dữ liệu.' });
  }

  const sql = `
    DELETE kkct FROM kiem_ke_chi_tiet kkct
    JOIN products_detail pd ON kkct.product_detail_id = pd.id
    WHERE pd.product_code = ? AND kkct.dot_id = ?
  `;

  db.query(sql, [product_code, dot_id], (err, result) => {
    if (err) {
      console.error('❌ Lỗi xóa:', err);
      return res.status(500).json({ success: false, message: 'Lỗi khi xóa sản phẩm khỏi đợt.' });
    }

    res.json({ success: true, message: `Đã xóa ${result.affectedRows} dòng khỏi đợt kiểm kê.` });
  });
});

// Xóa tất cả dòng kiểm kê 
app.post('/api/kiem-ke/xoa-nhieu-san-pham', (req, res) => {
  let { dot_id, product_codes } = req.body;
  dot_id = parseInt(dot_id);

  if (!dot_id || !Array.isArray(product_codes) || product_codes.length === 0) {
    return res.status(400).json({ success: false, message: 'Thiếu dữ liệu hoặc danh sách rỗng.' });
  }

  const placeholders = product_codes.map(() => '?').join(',');
  const sql = `
    DELETE kkct FROM kiem_ke_chi_tiet kkct
    JOIN products_detail pd ON kkct.product_detail_id = pd.id
    WHERE pd.product_code IN (${placeholders}) AND kkct.dot_id = ?
  `;

  db.query(sql, [...product_codes, dot_id], (err, result) => {
    if (err) {
      console.error('❌ Lỗi xóa nhiều sản phẩm:', err);
      return res.status(500).json({ success: false, message: 'Lỗi khi xóa sản phẩm hàng loạt.' });
    }

    res.json({ success: true, deletedCount: result.affectedRows });
  });
});


// ✅ API hủy toàn bộ đợt kiểm kê
app.delete('/api/kiem-ke/huy-dot/:dotId', (req, res) => {
  const dotId = parseInt(req.params.dotId);
  if (!dotId) {
    return res.status(400).json({ success: false, message: 'Thiếu dotId để hủy.' });
  }

  const deleteChiTietSql = `DELETE FROM kiem_ke_chi_tiet WHERE dot_id = ?`;
  const deleteDotSql = `DELETE FROM kiem_ke_dot WHERE id = ?`;

  // Bắt đầu bằng xóa các chi tiết
  db.query(deleteChiTietSql, [dotId], (err1, result1) => {
    if (err1) {
      console.error('❌ Lỗi khi xoá chi tiết kiểm kê:', err1);
      return res.status(500).json({ success: false, message: 'Không thể xoá chi tiết kiểm kê.' });
    }

    // Sau đó xóa đợt chính
    db.query(deleteDotSql, [dotId], (err2, result2) => {
      if (err2) {
        console.error('❌ Lỗi khi xoá đợt kiểm kê:', err2);
        return res.status(500).json({ success: false, message: 'Không thể xoá đợt kiểm kê.' });
      }

      res.json({ success: true, message: '✅ Đã huỷ đợt kiểm kê.' });
    });
  });
});

// ✅ API hủy toàn bộ đợt kiểm kê
app.delete('/api/kiem-ke/huy-dot/:dotId', (req, res) => {
  const dotId = parseInt(req.params.dotId);
  if (!dotId) {
    return res.status(400).json({ success: false, message: 'Thiếu dotId để hủy.' });
  }

  const deleteChiTietSql = `DELETE FROM kiem_ke_chi_tiet WHERE dot_id = ?`;
  const deleteDotSql = `DELETE FROM kiem_ke_dot WHERE id = ?`;

  // Bắt đầu bằng xóa các chi tiết
  db.query(deleteChiTietSql, [dotId], (err1, result1) => {
    if (err1) {
      console.error('❌ Lỗi khi xoá chi tiết kiểm kê:', err1);
      return res.status(500).json({ success: false, message: 'Không thể xoá chi tiết kiểm kê.' });
    }

    // Sau đó xóa đợt chính
    db.query(deleteDotSql, [dotId], (err2, result2) => {
      if (err2) {
        console.error('❌ Lỗi khi xoá đợt kiểm kê:', err2);
        return res.status(500).json({ success: false, message: 'Không thể xoá đợt kiểm kê.' });
      }

      res.json({ success: true, message: '✅ Đã huỷ đợt kiểm kê.' });
    });
  });
});

// dấu chấm chan cho nhân viên chưa kiểm 
app.get('/api/kiem-ke/chua-kiem', (req, res) => {
  db.query(`
    SELECT COUNT(*) AS chua_kiem_count
    FROM kiem_ke_chi_tiet
    WHERE actual_quantity IS NULL
  `, (err, results) => {
    if (err) return res.status(500).json({ message: 'Lỗi truy vấn' });
    res.json({ count: results[0].chua_kiem_count });
  });
});

// Kết thúc đợt kiểm kê (cập nhật trạng thái)
app.put('/api/kiem-ke/dot/:id/ket-thuc', (req, res) => {
  const dotId = req.params.id;

  const sql = `UPDATE kiem_ke_dot SET status = 'da_ket_thuc' WHERE id = ?`;

  db.query(sql, [dotId], (err, result) => {
    if (err) {
      console.error('❌ Lỗi cập nhật trạng thái đợt:', err);
      return res.status(500).json({ success: false, message: 'Lỗi server' });
    }

    res.json({ success: true, message: 'Đã cập nhật trạng thái đợt thành công' });
  });
});

// ========================== Dashboard ==========================
//Api Tổng phiếu nhập xuất kho
app.get('/api/tong-phieu-nhap-xuat', (req, res) => {
  const sql = `
    SELECT 
      (SELECT COUNT(*) FROM phieu_nhap_kho) AS tong_phieu_nhap,
      (SELECT COUNT(*) FROM phieu_xuat_kho) AS tong_phieu_xuat
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error('❌ Lỗi truy vấn tổng phiếu nhập xuất:', err);
      return res.status(500).json({ message: 'Lỗi truy vấn tổng phiếu nhập xuất' });
    }
    res.json(results[0]);
  });
});

// Sản phẩm sắp hết tronng kho
app.get('/api/products-detail/sap-het', (req, res) => {
  const sql = `
    SELECT * FROM products_detail 
    WHERE quantity <= 100 
    ORDER BY quantity ASC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error('❌ Lỗi truy vấn sản phẩm sắp hết:', err);
      return res.status(500).json({ message: 'Lỗi truy vấn sản phẩm sắp hết' });
    }
    res.json(results);
  });
});

// Sản phẩm sắp hết hạn
app.get('/api/products-detail/sap-het-han', (req, res) => {
  const today = new Date().toISOString().split('T')[0]; // Lấy ngày hiện tại theo định dạng YYYY-MM-DD
  const sql = `
    SELECT * FROM products_detail 
    WHERE expiry_date IS NOT NULL
    AND expiry_date <= DATE_ADD(CURDATE(), INTERVAL 7 DAY)
    ORDER BY expiry_date ASC
  `;

  db.query(sql, [today], (err, results) => {
    if (err) {
      console.error('❌ Lỗi truy vấn sản phẩm sắp hết hạn:', err);
      return res.status(500).json({ message: 'Lỗi truy vấn sản phẩm sắp hết hạn' });
    }
    res.json(results);
  });
});

// Vị trí còn trống
app.get('/api/vi-tri-con-trong', (req, res) => {
  const sql = `
    SELECT 
      FLOOR(SUM(kv.suc_chua_kg - IFNULL(pd_sum.weight_used, 0)) / 500) AS tong_vi_tri_con_trong
    FROM khu_vuc kv
    LEFT JOIN (
      SELECT khu_vuc_id, SUM(weight) AS weight_used
      FROM products_detail
      GROUP BY khu_vuc_id
    ) pd_sum ON kv.id = pd_sum.khu_vuc_id
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error('Lỗi truy vấn:', err);
      return res.status(500).json({ error: 'Lỗi server' });
    }

    // results là mảng kết quả, lấy phần tử đầu tiên
    const totalFreePositions = results[0]?.tong_vi_tri_con_trong ?? 0;
    res.json({ totalFreePositions });
  });
});

// Thống kê nhập/xuất theo ngày hoặc tháng
app.get('/api/thong-ke', (req, res) => {
  const type = req.query.type === 'ngay' ? 'ngay' : 'thang'; // mặc định là 'thang'
  const dateFormat = type === 'ngay' ? '%Y-%m-%d' : '%Y-%m';

  const sql = `
    SELECT 
      DATE_FORMAT(pnk.created_date, '${dateFormat}') AS label,
      'nhap' AS loai,
      SUM(ctnk.quantity) AS tong
    FROM phieu_nhap_kho_chi_tiet ctnk
    JOIN phieu_nhap_kho pnk ON ctnk.phieu_nhap_kho_id = pnk.id
    GROUP BY label

    UNION

    SELECT 
      DATE_FORMAT(pxk.created_date, '${dateFormat}') AS label,
      'xuat' AS loai,
      SUM(ctxk.quantity) AS tong
    FROM phieu_xuat_kho_chi_tiet ctxk
    JOIN phieu_xuat_kho pxk ON ctxk.phieu_xuat_kho_id = pxk.id
    GROUP BY label

    ORDER BY label ASC;
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error('❌ Lỗi truy vấn thống kê:', err);
      return res.status(500).json({ message: 'Lỗi truy vấn thống kê' });
    }
    res.json(results);
  });
});

// API app.khu_vuc_suc_chua trả về dữ liệu sức chứa kho theo khu vực
app.get('/api/khu_vuc_suc_chua', (req, res) => {
  const sql = `
    SELECT 
      kv.id AS khu_vuc_id,
      kv.ten_khu_vuc,
      kv.suc_chua_kg,
      IFNULL(SUM(pd.weight), 0) AS da_su_dung_kg
    FROM khu_vuc kv
    LEFT JOIN products_detail pd ON kv.id = pd.khu_vuc_id
    GROUP BY kv.id;
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error('Lỗi khi lấy dữ liệu sức chứa kho theo khu vực:', err);
      return res.status(500).json({ error: 'Lỗi máy chủ' });
    }

    // Vì bạn muốn max của biểu đồ là 50,000 kg
    const maxCapacity = 50000;

    // Tính tổng dùng, tổng sức chứa không dùng ở đây, chỉ để tính % tổng thôi nếu cần
    const tongSucChua = maxCapacity * results.length; // tổng max = 50000 * số khu vực
    const tongDaDung = results.reduce((sum, row) => sum + (row.da_su_dung_kg || 0), 0);

    const totalUsedPercent = tongSucChua > 0 ? Math.round((tongDaDung / tongSucChua) * 100) : 0;

    res.json({
      totalUsedPercent,
      data: results
    });
  });
});

// 📌 API tính doanh thu
app.get('/api/doanh_thu', (req, res) => {
  // SQL lấy 7 phiếu nhập + xuất mới nhất
  const sqlPhieu = `
    SELECT receipt_code, created_date, total_amount, 'nhap' AS type
    FROM phieu_nhap_kho
    UNION ALL
    SELECT receipt_code, created_date, total_amount, 'xuat' AS type
    FROM phieu_xuat_kho
    ORDER BY created_date DESC
    LIMIT 7
  `;

  // SQL tính tổng nhập
  const sqlTongNhap = `SELECT COALESCE(SUM(total_amount), 0) AS tong_nhap FROM phieu_nhap_kho`;

  // SQL tính tổng xuất
  const sqlTongXuat = `SELECT COALESCE(SUM(total_amount), 0) AS tong_xuat FROM phieu_xuat_kho`;

  // Thực hiện 3 truy vấn song song, hoặc tuần tự
  db.query(sqlPhieu, (err, phieuResults) => {
    if (err) {
      console.error('❌ Lỗi truy vấn phiếu:', err);
      return res.status(500).json({ error: 'Lỗi truy vấn phiếu' });
    }

    db.query(sqlTongNhap, (err, tongNhapResult) => {
      if (err) {
        console.error('❌ Lỗi truy vấn tổng nhập:', err);
        return res.status(500).json({ error: 'Lỗi truy vấn tổng nhập' });
      }

      db.query(sqlTongXuat, (err, tongXuatResult) => {
        if (err) {
          console.error('❌ Lỗi truy vấn tổng xuất:', err);
          return res.status(500).json({ error: 'Lỗi truy vấn tổng xuất' });
        }

        const tongNhap = parseFloat(tongNhapResult[0]?.tong_nhap || 0);
        const tongXuat = parseFloat(tongXuatResult[0]?.tong_xuat || 0);
        const doanhThu = tongXuat - tongNhap;

        res.json({
          phieu: phieuResults,
          tongNhap,
          tongXuat,
          doanhThu
        });
      });
    });
  });
});


// 📌 Lấy danh sách nhà cung cấp (logo + tên + địa chỉ)
app.get('/api/nha_cung_cap', async (req, res) => {
  try {
    const [rows] = await db.promise().execute(`
      SELECT p1.supplier_name, p1.logo_url, p1.supplier_address, COUNT(p2.id) AS tong_phieu
      FROM phieu_nhap_kho p1
      INNER JOIN (
          SELECT supplier_name, MAX(created_date) AS max_date
          FROM phieu_nhap_kho
          GROUP BY supplier_name
      ) latest ON p1.supplier_name = latest.supplier_name 
               AND p1.created_date = latest.max_date
      LEFT JOIN phieu_nhap_kho p2 ON p2.supplier_name = p1.supplier_name
      GROUP BY p1.supplier_name, p1.logo_url, p1.supplier_address
      ORDER BY p1.supplier_name ASC
    `);

    res.json(rows);
  } catch (err) {
    console.error("❌ Lỗi lấy danh sách nhà cung cấp:", err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// 📌 Lịch sử kiểm kê
app.get('/api/kiem_ke_lich_su', async (req, res) => {
  try {
    const [rows] = await db.promise().execute(`
      SELECT 
        kk.id,
        kk.ma_dot,
        kk.ten_dot,
        kk.created_at,
        kk.created_by_email,
        kk.status,
        COUNT(kct.id) AS so_san_pham
      FROM kiem_ke_dot kk
      LEFT JOIN kiem_ke_chi_tiet kct ON kk.id = kct.dot_id
      GROUP BY kk.id, kk.ma_dot, kk.ten_dot, kk.created_at, kk.created_by_email, kk.status
      ORDER BY kk.created_at DESC
    `);

    res.json(rows);
  } catch (err) {
    console.error('❌ Lỗi lấy lịch sử kiểm kê:', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// --- API Route để tạo tóm tắt bằng AI Gemini ---
app.post('/api/ai-summary', async (req, res) => {
  const data = req.body;

  try {
    const prompt = `
    Đây là dữ liệu thống kê kho hàng:\n${JSON.stringify(data, null, 2)}\n
    Hãy viết một đoạn tóm tắt dài hơn khoảng 100 chữ, chi tiết, rõ ràng và dễ hiểu, nêu bật các điểm quan trọng, xu hướng và cảnh báo nếu có.
    Sử dụng ngôn ngữ trang trọng, chuyên nghiệp và mạch lạc.
    `;

    const response = await axios.post(GEMINI_API_URL, {
      "contents": [
        {
          "parts": [
            {
              "text": prompt
            }
          ]
        }
      ]
    });

    const summary = response.data.candidates?.[0]?.content?.parts?.[0]?.text || 'Không thể tạo tóm tắt.';

    res.json({ summary });

  } catch (error) {
    console.error('Lỗi khi gọi AI Gemini:', error.response?.data || error.message);
    res.status(500).json({ error: 'Lỗi khi gọi AI Gemini' });
  }
});


// ========================== Lịch sử kiểm kê ==========================
// API xuất Excel cho 1 đợt kiểm kê
app.get('/api/xuat-excel/kiem-ke/:dotId', async (req, res) => {
    const { dotId } = req.params;

    // 1. Lấy thông tin đợt kiểm kê
    const dotQuery = `SELECT ma_dot, ten_dot, created_at, created_by_email FROM kiem_ke_dot WHERE id = ?`;
    db.query(dotQuery, [dotId], (err, dotRows) => {
        if (err || dotRows.length === 0) {
            console.error('❌ Lỗi truy vấn thông tin đợt kiểm kê:', err);
            return res.status(500).json({ success: false, message: 'Không tìm thấy thông tin đợt kiểm kê hoặc lỗi truy vấn.' });
        }

        const dot = dotRows[0];

        // 2. Truy vấn chi tiết sản phẩm đã kiểm kê
        const sql = `
            SELECT
                pd.product_code,
                pd.product_name,
                pd.image_url,
                kv.ten_khu_vuc,
                pd.unit_price,
                pd.quantity AS system_quantity,
                kkct.actual_quantity,
                kkct.checked_by_email,
                kkct.checked_at,
                kkct.ghi_chu  -- ✅ thêm dòng này
            FROM kiem_ke_chi_tiet kkct
            JOIN products_detail pd ON kkct.product_detail_id = pd.id
            JOIN khu_vuc kv ON pd.khu_vuc_id = kv.id
            WHERE kkct.dot_id = ?
        `;

        db.query(sql, [dotId], async (err2, rows) => {
            if (err2) {
                console.error('❌ Lỗi truy vấn dữ liệu chi tiết sản phẩm:', err2);
                return res.status(500).json({ success: false, message: 'Lỗi truy vấn chi tiết sản phẩm kiểm kê.' });
            }

            try {
                // Khởi tạo Workbook và Worksheet của ExcelJS
                const workbook = new ExcelJS.Workbook();
                const sheet = workbook.addWorksheet('Báo cáo kiểm kê');

                // --- Cấu hình chung cho Workbook ---
                workbook.creator = 'Hệ thống quản lý kho';
                workbook.lastModifiedBy = 'Hệ thống quản lý kho';
                workbook.created = new Date();
                workbook.modified = new Date();

                let currentRow = 1; // Biến theo dõi dòng hiện tại trong Excel

                // --- 1. Tiêu đề chính của báo cáo ---
                sheet.mergeCells(`A${currentRow}:J${currentRow}`);
                const titleCell = sheet.getCell(`A${currentRow}`);
                titleCell.value = 'BÁO CÁO KIỂM KÊ KHO';
                titleCell.font = { name: 'Times New Roman', size: 28, bold: true, color: { argb: 'FF000080' } };
                titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
                titleCell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFDDEBF7' }
                };
                titleCell.border = {
                    top: { style: 'medium' }, left: { style: 'medium' },
                    bottom: { style: 'medium' }, right: { style: 'medium' }
                };
                sheet.getRow(currentRow).height = 45;
                currentRow++;

                // Dòng trống sau tiêu đề
                sheet.addRow([]);
                sheet.getRow(currentRow).height = 5;
                currentRow++;

                // --- 2. Thông tin đợt kiểm kê (Mã kiểm hàng & Tên đợt kiểm) ---
                const infoLabelStyle = { font: { bold: true, color: { argb: 'FF333333' }, size: 12 } };
                const infoValueStyle = { font: { color: { argb: 'FF000000' }, size: 12 } };

                // Mã đợt kiểm kê - Nổi bật hơn
                sheet.mergeCells(`A${currentRow}:J${currentRow}`);
                const maDotCell = sheet.getCell(`A${currentRow}`);
                maDotCell.value = `Mã đợt kiểm kê: ${dot.ma_dot}`;
                maDotCell.font = { name: 'Times New Roman', size: 16, bold: true, color: { argb: 'FF1F4E79' } };
                maDotCell.alignment = { vertical: 'middle', horizontal: 'center' };
                maDotCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
                maDotCell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
                sheet.getRow(currentRow).height = 30;
                currentRow++;

                // Tên đợt kiểm (to và nổi bật nhất)
                sheet.mergeCells(`A${currentRow}:J${currentRow}`);
                const dotNameCell = sheet.getCell(`A${currentRow}`);
                dotNameCell.value = `Tên đợt kiểm: ${dot.ten_dot}`;
                dotNameCell.font = { name: 'Times New Roman', size: 20, bold: true, color: { argb: 'FF1F4E79' } };
                dotNameCell.alignment = { vertical: 'middle', horizontal: 'center' };
                dotNameCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEBF1DE' } };
                dotNameCell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
                sheet.getRow(currentRow).height = 35;
                currentRow++;

                // Ngày tạo báo cáo
                const rowNgayTao = sheet.addRow(['Ngày tạo báo cáo:', new Date(dot.created_at).toLocaleString('vi-VN')]);
                rowNgayTao.getCell('A').style = infoLabelStyle;
                rowNgayTao.getCell('B').style = infoValueStyle;
                currentRow++;

                // Người tạo báo cáo
                const rowNguoiTao = sheet.addRow(['Người tạo báo cáo:', dot.created_by_email]);
                rowNguoiTao.getCell('A').style = infoLabelStyle;
                rowNguoiTao.getCell('B').style = infoValueStyle;
                currentRow++;

                sheet.addRow([]); // Dòng trống trước bảng chi tiết
                sheet.getRow(currentRow).height = 10;
                currentRow++;

                // --- 3. Header chi tiết sản phẩm ---
                const tableHeaderRow = currentRow; // Lưu dòng hiện tại để đóng băng header sau này

                // 1. Cấu trúc cột
                sheet.columns = [
                  { header: 'STT', key: 'stt', width: 20 },
                  { header: 'Mã SP', key: 'product_code', width: 18 },
                  { header: 'Tên SP', key: 'product_name', width: 35 },
                  { header: 'Khu vực', key: 'ten_khu_vuc', width: 20 },
                  { header: 'Giá SP (VND)', key: 'unit_price', width: 18 },
                  { header: 'Tồn hệ thống', key: 'system_quantity', width: 18 },
                  { header: 'Thực tế', key: 'actual_quantity', width: 18 },
                  { header: 'Tình trạng', key: 'chenh_lech', width: 18 },
                  { header: 'Người kiểm', key: 'checked_by_email', width: 28 },
                  { header: 'Thời gian kiểm', key: 'checked_at', width: 25 }
                ];

                // 2. Tạo dòng tiêu đề thật (thủ công)
                const headers = sheet.columns.map(c => c.header); // Lấy danh sách header
                sheet.addRow(headers); // Thêm dòng header vào sheet
                currentRow++; // Tăng dòng hiện tại vì vừa thêm dòng header

                // 3. Styling cho dòng tiêu đề
                const headerRow = sheet.getRow(currentRow - 1); // Dòng vừa thêm là dòng header
                headerRow.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } }; // Chữ trắng
                headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
                headerRow.fill = {
                  type: 'pattern',
                  pattern: 'solid',
                  fgColor: { argb: 'FF4472C4' } // Nền xanh đậm
                };
                headerRow.height = 25;

                // 4. Thêm border cho các ô tiêu đề
                headerRow.eachCell({ includeEmpty: true }, (cell) => {
                  cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                  };
                });

                // --- 4. Thêm dữ liệu chi tiết sản phẩm và định dạng ---
                let totalActualQuantity = 0;
                let totalSystemQuantity = 0;
                let totalDifference = 0;
                let productsWithDiscrepancyCount = 0;

                rows.forEach((row, index) => {
                    const chenh_lech = row.actual_quantity != null
                        ? row.actual_quantity - row.system_quantity
                        : null;

                    if (chenh_lech !== null && chenh_lech !== 0) {
                        productsWithDiscrepancyCount++;
                    }

                    const dataRow = sheet.addRow({
                        stt: index + 1,
                        product_code: row.product_code,
                        product_name: row.product_name,
                        ten_khu_vuc: row.ten_khu_vuc,
                        unit_price: row.unit_price,
                        system_quantity: row.system_quantity,
                        actual_quantity: row.actual_quantity,
                        chenh_lech: chenh_lech, // Vẫn dùng biến này cho giá trị, chỉ đổi tên cột hiển thị
                        checked_by_email: row.checked_by_email,
                        checked_at: row.checked_at ? new Date(row.checked_at).toLocaleString('vi-VN') : '',
                    });

                    if (index % 2 === 0) {
                        dataRow.fill = {
                            type: 'pattern',
                            pattern: 'solid',
                            fgColor: { argb: 'FFF2F2F2' }
                        };
                    }

                    dataRow.eachCell({ includeEmpty: true }, (cell) => {
                        cell.border = {
                            top: { style: 'thin' }, left: { style: 'thin' },
                            bottom: { style: 'thin' }, right: { style: 'thin' }
                        };
                        cell.alignment = { vertical: 'middle', horizontal: 'left' };
                    });

                    dataRow.getCell('unit_price').numFmt = '#,##0.00';
                    dataRow.getCell('system_quantity').numFmt = '#,##0';
                    dataRow.getCell('actual_quantity').numFmt = '#,##0';
                    dataRow.getCell('chenh_lech').numFmt = '#,##0';

                    const diffCell = dataRow.getCell('chenh_lech');

                    if (chenh_lech === null || row.actual_quantity === null) {
                        diffCell.value = 'Chưa kiểm';
                        diffCell.font = { italic: true, color: { argb: 'FF808080' } };
                    } else if (chenh_lech < 0) {
                        diffCell.value = `Thiếu ${Math.abs(chenh_lech)}`;
                        diffCell.font = { color: { argb: 'FFFF0000' }, bold: true };
                    } else if (chenh_lech > 0) {
                        diffCell.value = `Dư ${chenh_lech}`;
                        diffCell.font = { color: { argb: 'FFFFA500' }, bold: true };
                    } else {
                        diffCell.value = 'Đủ';
                        diffCell.font = { color: { argb: 'FF00B050' }, bold: true }; // Màu xanh lá
                    }


                    totalSystemQuantity += row.system_quantity || 0;
                    totalActualQuantity += row.actual_quantity || 0;
                    totalDifference += chenh_lech || 0;
                });

                // --- 5. Phần tổng kết chi tiết hơn ---
                const summaryLabelStyle = {
                    font: { bold: true, size: 12, color: { argb: 'FF333333' } },
                    alignment: { vertical: 'middle', horizontal: 'right' }
                };
                const summaryValueStyle = {
                    font: { bold: true, size: 12, color: { argb: 'FF1F4E79' } },
                    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } },
                    border: { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } },
                    alignment: { vertical: 'middle', horizontal: 'center' }
                };

                sheet.addRow([]);
                sheet.addRow([]);
                currentRow += 2;

                const rowTotalProducts = sheet.addRow(['', '', '', '', 'Tổng số sản phẩm đã kiểm kê:', '', rows.length, '', '', '']);
                rowTotalProducts.height = 25;
                rowTotalProducts.getCell('E').style = summaryLabelStyle;
                rowTotalProducts.getCell('G').style = { ...summaryValueStyle, numFmt: '#,##0' };
                sheet.mergeCells(rowTotalProducts.getCell('E').address, rowTotalProducts.getCell('F').address);
                sheet.mergeCells(rowTotalProducts.getCell('G').address, rowTotalProducts.getCell('J').address);

                const rowProductsWithDiscrepancy = sheet.addRow(['', '', '', '', 'Tổng số sản phẩm có chênh lệch:', '', productsWithDiscrepancyCount, '', '', '']);
                rowProductsWithDiscrepancy.height = 25;
                rowProductsWithDiscrepancy.getCell('E').style = summaryLabelStyle;
                rowProductsWithDiscrepancy.getCell('G').style = { ...summaryValueStyle, numFmt: '#,##0' };
                sheet.mergeCells(rowProductsWithDiscrepancy.getCell('E').address, rowProductsWithDiscrepancy.getCell('F').address);
                sheet.mergeCells(rowProductsWithDiscrepancy.getCell('G').address, rowProductsWithDiscrepancy.getCell('J').address);

                const rowSystemTotal = sheet.addRow(['', '', '', '', 'Tổng số lượng tồn hệ thống:', '', totalSystemQuantity, '', '', '']);
                rowSystemTotal.height = 25;
                rowSystemTotal.getCell('E').style = summaryLabelStyle;
                rowSystemTotal.getCell('G').style = { ...summaryValueStyle, numFmt: '#,##0' };
                sheet.mergeCells(rowSystemTotal.getCell('E').address, rowSystemTotal.getCell('F').address);
                sheet.mergeCells(rowSystemTotal.getCell('G').address, rowSystemTotal.getCell('J').address);

                const rowActualTotal = sheet.addRow(['', '', '', '', 'Tổng số lượng thực tế kiểm:', '', totalActualQuantity, '', '', '']);
                rowActualTotal.height = 25;
                rowActualTotal.getCell('E').style = summaryLabelStyle;
                rowActualTotal.getCell('G').style = { ...summaryValueStyle, numFmt: '#,##0' };
                sheet.mergeCells(rowActualTotal.getCell('E').address, rowActualTotal.getCell('F').address);
                sheet.mergeCells(rowActualTotal.getCell('G').address, rowActualTotal.getCell('J').address);

                const rowDifferenceTotal = sheet.addRow(['', '', '', '', 'Tổng số lượng chênh lệch:', '', totalDifference, '', '', '']);
                rowDifferenceTotal.height = 25;
                rowDifferenceTotal.getCell('E').style = summaryLabelStyle;
                rowDifferenceTotal.getCell('G').style = { ...summaryValueStyle, numFmt: '#,##0' };
                sheet.mergeCells(rowDifferenceTotal.getCell('E').address, rowDifferenceTotal.getCell('F').address);
                sheet.mergeCells(rowDifferenceTotal.getCell('G').address, rowDifferenceTotal.getCell('J').address);


                // --- 6. Đóng băng tiêu đề ---
                //sheet.views = [{ state: 'frozen', ySplit: tableHeaderRow }];

                // --- 7. Xuất file ---
                res.setHeader(
                    'Content-Type',
                    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                );
                res.setHeader(
                    'Content-Disposition',
                    `attachment; filename=bao-cao-kiem-ke-${dot.ma_dot}.xlsx`
                );

                await workbook.xlsx.write(res);
                res.end();
            } catch (e) {
                console.error('❌ Lỗi trong quá trình tạo file Excel:', e);
                res.status(500).json({ success: false, message: 'Lỗi trong quá trình tạo file Excel.' });
            }
        });
    });
});


// ========================== cập nhật sản phẩm theo lô==========================

// ✅ API kiểm tra số lượng tối đa có thể tăng thêm ở 1 dòng sản phẩm tại 1 location
app.get('/api/products-detail/kha-dung/:location/:id', (req, res) => {
  const location = req.params.location;
  const id = req.params.id;

  // Truy vấn lấy toàn bộ sản phẩm cùng location
  db.query(`SELECT id, quantity, weight_per_unit FROM products_detail WHERE location = ?`, [location], (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: '❌ Lỗi truy vấn sản phẩm tại vị trí này' });
    }

    let totalWeight = 0;
    let currentProductWeightPerUnit = 0;
    let currentProductOldQuantity = 0;

    for (const row of rows) {
        if (row.id == id) {
            currentProductWeightPerUnit = row.weight_per_unit;
            currentProductOldQuantity = row.quantity;
        }
        totalWeight += row.quantity * row.weight_per_unit;
    }
    
    if (currentProductWeightPerUnit === 0) {
      return res.status(404).json({ error: '⚠️ Không tìm thấy sản phẩm đang cập nhật' });
    }

    const maxWeight = 500;
    
    // Tổng khối lượng hiện tại của tất cả các sản phẩm ở vị trí này ngoại trừ sản phẩm đang được cập nhật
    const weightOfOtherProducts = totalWeight - (currentProductOldQuantity * currentProductWeightPerUnit);
    
    const remainingWeight = maxWeight - weightOfOtherProducts;
    
    const max_quantity_can_add = Math.floor(remainingWeight / currentProductWeightPerUnit);
    
    res.json({ max_quantity_can_add });
  });
});

const KHOI_LUONG_PALLET_MAX = 500;

app.put('/api/products-detail/update-quantity/:id', async (req, res) => {
  const id = req.params.id;
  const quantity = parseInt(req.body.quantity);

  console.log('📦 Dữ liệu nhận được:', req.body);

  if (isNaN(quantity) || quantity < 0) {
    return res.status(400).json({ message: '❌ Số lượng không hợp lệ!' });
  }

  try {
    // 1. Lấy thông tin sản phẩm hiện tại
    const [rows] = await db.promise().query(
      `SELECT product_code, location, weight_per_unit, unit_price, area_per_unit, quantity 
       FROM products_detail WHERE id = ?`,
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: '❌ Không tìm thấy sản phẩm!' });
    }

    const { product_code, location, weight_per_unit, unit_price, area_per_unit, quantity: oldQuantity } = rows[0];
    const newWeight = quantity * weight_per_unit;

    // 2. Nếu số lượng tăng thì kiểm tra giới hạn khối lượng
    if (quantity > oldQuantity) {
      const [sumRows] = await db.promise().query(
        `SELECT SUM(quantity * weight_per_unit) AS total_other_weight 
         FROM products_detail WHERE location = ? AND id != ?`,
        [location, id]
      );
      const totalOthers = sumRows[0]?.total_other_weight || 0;
      const totalAfter = totalOthers + newWeight;

      if (totalAfter > KHOI_LUONG_PALLET_MAX) {
        const remaining = Math.max(0, KHOI_LUONG_PALLET_MAX - totalOthers);
        const max_quantity_can_add = Math.floor(remaining / weight_per_unit);
        return res.status(400).json({
          message: `❌ Tổng khối lượng vượt quá 500kg tại ${location}.`,
          max_quantity_can_add,
          remaining_weight: remaining
        });
      }
    }

    // 3. Cập nhật dòng sản phẩm
    const total_price = quantity * unit_price;
    await db.promise().query(
      `UPDATE products_detail SET 
         quantity = ?, 
         weight = ?, 
         area = ?, 
         total_price = ?
       WHERE id = ?`,
      [quantity, newWeight, quantity * area_per_unit, total_price, id]
    );

    // 4. Tính tổng các dòng cùng mã sản phẩm
    const [allRows] = await db.promise().query(
      `SELECT quantity, weight_per_unit FROM products_detail WHERE product_code = ?`,
      [product_code]
    );

    const total_quantity = allRows.reduce((sum, r) => sum + r.quantity, 0);
    const total_weight = allRows.reduce((sum, r) => sum + (r.quantity * r.weight_per_unit), 0);
    const total_area = total_weight * (5 / 500); // Giả định tỉ lệ diện tích theo khối lượng

    // 5. Cập nhật lại các dòng cùng product_code
    await db.promise().query(
      `UPDATE products_detail 
       SET total_quantity = ?, total_weight = ?, total_area = ?
       WHERE product_code = ?`,
      [total_quantity, total_weight, total_area, product_code]
    );

    return res.json({
      message: '✅ Số lượng đã được cập nhật!',
      total_quantity,
      total_weight,
      total_area
    });

  } catch (err) {
    console.error('❌ Lỗi cập nhật:', err);
    return res.status(500).json({ message: '❌ Lỗi server khi cập nhật!' });
  }
});

// ========================== Hủy phiếu ==========================

app.put('/api/phieu-nhap-kho/:id/huy', (req, res) => {
  const id = req.params.id;

  // Câu SQL update trạng thái phiếu sang 'Đã hủy'
  const sql = 'UPDATE phieu_nhap_kho SET trang_thai = ? WHERE id = ?';

  db.query(sql, ['Đã hủy', id], (err, result) => {
    if (err) {
      console.error('Lỗi khi cập nhật trạng thái hủy phiếu:', err);
      return res.status(500).json({ error: 'Lỗi server khi hủy phiếu' });
    }

    if (result.affectedRows === 0) {
      // Không tìm thấy phiếu có id tương ứng
      return res.status(404).json({ error: 'Không tìm thấy phiếu để hủy' });
    }

    // Thành công
    res.json({ message: 'Hủy phiếu thành công' });
  });
});

app.put('/api/phieu-xuat-kho/:id/huy', (req, res) => {
  const id = req.params.id;
  const sql = 'UPDATE phieu_xuat_kho SET trang_thai = ? WHERE id = ?';

  db.query(sql, ['Đã hủy', id], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Lỗi server khi hủy phiếu' });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Không tìm thấy phiếu để hủy' });
    }
    res.json({ message: 'Hủy phiếu thành công' });
  });
});



// ========================== SERVER ==========================

app.listen(3000, () => {
  console.log('✅ Server chạy tại http://localhost:3000');
});











