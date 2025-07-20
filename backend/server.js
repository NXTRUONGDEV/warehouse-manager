const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const multer = require('multer');
const path = require('path');

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

  const logoFile = files.find(f => f.fieldname === 'logo');
  const logo_url = logoFile ? `http://localhost:3000/uploads/${logoFile.filename}` : null;

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

    // ✅ Insert phiếu nhập
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

        // 🧾 Lưu chi tiết sản phẩm
        products.forEach((item, i) => {
          const img = files.find(f => f.fieldname === `product_image_${i}`);
          const image_url = img ? `http://localhost:3000/uploads/${img.filename}` : null;

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
app.get('/api/products-detail/check-ma/:code', (req, res) => {
  const code = req.params.code;

  db.query('SELECT * FROM products_detail WHERE product_code = ?', [code], (err, results) => {
    if (err) {
      console.error('❌ Lỗi truy vấn:', err);
      return res.status(500).json({ error: 'Lỗi server' });
    }

    if (results.length > 0) {
      res.json({ exists: true, product: results[0] });
    } else {
      res.json({ exists: false });
    }
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

  if (!danh_sach_san_pham || danh_sach_san_pham.length === 0) {
    return res.json({ message: 'Không có sản phẩm để lưu' });
  }

  let inserted = 0;
  const total = danh_sach_san_pham.length;

  for (let sp of danh_sach_san_pham) {
    const oldCode = sp.old_product_code || sp.product_code;

    db.query(
      `INSERT INTO products_detail (
        product_code, 
        product_name, 
        product_type, 
        image_url, 
        unit,
        quantity, 
        weight, 
        area, 
        manufacture_date, 
        expiry_date,
        unit_price, 
        total_price, 
        khu_vuc_id,
        supplier_name, 
        logo_url,
        old_product_code, 
        receipt_code,
        location   -- ✅ THÊM CỘT NÀY
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        sp.product_code,
        sp.product_name,
        sp.product_type,
        sp.image_url,
        sp.unit,
        sp.quantity,
        sp.weight,
        sp.area,
        sp.manufacture_date,
        sp.expiry_date,
        sp.unit_price,
        sp.total_price,
        sp.khu_vuc_id,
        sp.supplier_name,
        sp.logo_url,
        oldCode,
        sp.receipt_code,
        sp.location 
      ],
      (err, results) => {
        if (err) {
          console.error('❌ Lỗi khi lưu sản phẩm:', err.sqlMessage);
          return res.status(500).json({ error: 'Lỗi khi lưu sản phẩm vào kho' });
        }

        inserted++;
        if (inserted === total) {
          res.json({ message: '📦 Đã nhập hàng vào kho thành công!' });
        }
      }
    );
  }
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
      MAX(pd.manufacture_date) AS manufacture_date,
      MAX(pd.expiry_date) AS expiry_date,
      MAX(pd.unit_price) AS unit_price,
      SUM(pd.total_price) AS total_price,
      MAX(pd.khu_vuc_id) AS khu_vuc_id,
      MAX(kv.ten_khu_vuc) AS ten_khu_vuc,
      MAX(pd.supplier_name) AS supplier_name,
      MAX(pd.logo_url) AS logo_url,
      MAX(pd.import_date) AS import_date,
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
app.delete('/api/products-detail/:id', (req, res) => {
  const id = req.params.id;

  const sql = 'DELETE FROM products_detail WHERE id = ?';

  db.query(sql, [id], (err, result) => {
    if (err) {
      console.error('❌ Lỗi khi xoá sản phẩm:', err);
      return res.status(500).json({ error: 'Lỗi khi xoá sản phẩm' });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Không tìm thấy sản phẩm để xoá' });
    }
    res.json({ message: '✅ Xoá sản phẩm thành công!' });
  });
});

// Cập nhật sản phẩm trong quản lý sản phẩm
app.put('/api/products-detail/:id', upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'logo', maxCount: 1 }
]), (req, res) => {
  const id = req.params.id;
  const sp = req.body;

  const normalizePath = file => file?.path ? `http://localhost:3000/uploads/${path.basename(file.path)}` : null;
  const image_url = normalizePath(req.files?.image?.[0]) || sp.image_url;
  const logo_url = normalizePath(req.files?.logo?.[0]) || sp.logo_url;

  // === Kiểm tra trường bắt buộc ===
  const requiredFields = ['product_code', 'product_name', 'product_type', 'unit', 'quantity', 'unit_price', 'weight', 'area', 'manufacture_date', 'expiry_date'];
  for (let field of requiredFields) {
    if (!sp[field] || sp[field].toString().trim() === '') {
      return res.status(400).json({ error: `⚠️ Trường '${field}' không được để trống.` });
    }
  }

  // === Kiểm tra số dương ===
  const numericFields = ['quantity', 'unit_price', 'weight', 'area'];
  for (let field of numericFields) {
    const val = parseFloat(sp[field]);
    if (isNaN(val) || val <= 0) {
      return res.status(400).json({ error: `⚠️ '${field}' phải là số lớn hơn 0.` });
    }
  }

  // === Kiểm tra ngày ===
  const today = new Date();
  today.setHours(0, 0, 0, 0); // so sánh chính xác theo ngày

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

  // === Kiểm tra mã SP trùng với sản phẩm khác ===
  const checkSQL = `SELECT * FROM products_detail WHERE product_code = ? AND id != ?`;
  db.query(checkSQL, [sp.product_code, id], (checkErr, rows) => {
    if (checkErr) {
      console.error('❌ Lỗi kiểm tra mã:', checkErr);
      return res.status(500).json({ error: 'Lỗi kiểm tra mã sản phẩm' });
    }

    if (rows.length > 0) {
      return res.status(400).json({ error: '⚠️ Mã sản phẩm đã tồn tại!' });
    }

    // === Cập nhật sản phẩm ===
    const total_price = parseFloat(sp.unit_price) * parseFloat(sp.quantity);
    const sql = `
      UPDATE products_detail SET
        product_code = ?, product_name = ?, product_type = ?, unit = ?, quantity = ?,
        weight = ?, area = ?, manufacture_date = ?, expiry_date = ?, unit_price = ?,
        total_price = ?, khu_vuc_id = ?, location = ?, supplier_name = ?,
        image_url = ?, logo_url = ?
      WHERE id = ?
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
      sp.location || null,
      sp.supplier_name || '',
      image_url,
      logo_url,
      id
    ];

    db.query(sql, params, (err, result) => {
      if (err) {
        console.error('❌ Lỗi cập nhật sản phẩm:', err);
        return res.status(500).json({ error: 'Lỗi cập nhật sản phẩm' });
      }
      res.json({ message: '✅ Cập nhật thành công!' });
    });
  });
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
      'SELECT quantity FROM products_detail WHERE product_code = ?',
      [code]
    );

    if (!rows || rows.length === 0) {
      return res.json({ product_code: code, enough: false });
    }

    const quantityInStock = rows[0].quantity;
    const isEnough = quantityInStock >= parseInt(required);
    res.json({ product_code: code, enough: isEnough });

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
app.get('/api/products-detail/by-code/:code', (req, res) => {
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
      console.error('❌ Lỗi truy vấn /api/products-detail/by-code:', err);
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


// ========================== SERVER ==========================

app.listen(3000, () => {
  console.log('✅ Server chạy tại http://localhost:3000');
});



// ✅ Trả về danh sách sản phẩm số lượng sản phẩm đó nhập kho
// GET /api/products-detail/with-deducted
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
        SUM(pd.weight) AS weight,
        SUM(pd.area) AS area,
        MAX(pd.manufacture_date) AS manufacture_date,
        MAX(pd.expiry_date) AS expiry_date,
        MAX(pd.unit_price) AS unit_price,
        SUM(pd.total_price) AS total_price,
        MAX(pd.khu_vuc_id) AS khu_vuc_id,
        MAX(kv.ten_khu_vuc) AS ten_khu_vuc,
        MAX(pd.supplier_name) AS supplier_name,
        MAX(pd.logo_url) AS logo_url,
        MAX(pd.import_date) AS import_date,
        MAX(pd.id) AS id
      FROM products_detail pd
      JOIN khu_vuc kv ON pd.khu_vuc_id = kv.id
      GROUP BY pd.product_code
    `);

    const [logs] = await db.promise().query(`
      SELECT product_code, SUM(quantity_deducted) AS total_deducted
      FROM log_tru_hang
      GROUP BY product_code
    `);

    const logMap = {};
    logs.forEach(log => {
      logMap[log.product_code] = log.total_deducted;
    });

    const result = products.map(p => ({
      ...p,
      total_deducted: logMap[p.product_code] || 0
    }));

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi khi lấy dữ liệu tổng trừ hàng' });
  }
});
