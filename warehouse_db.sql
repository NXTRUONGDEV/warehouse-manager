CREATE DATABASE warehouse_db;
USE warehouse_db;

SHOW COLUMNS FROM phieu_xuat_kho;

-- Phần bảng cho tài khoản , thông tin tài khoản
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('user', 'admin', 'staff') DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE user_info (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  full_name VARCHAR(255),
  date_of_birth DATE,
  gender VARCHAR(10),
  address TEXT,
  phone VARCHAR(20),
  image_url TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

UPDATE users SET role = 'admin' WHERE id = 1;
UPDATE users SET role = 'staff' WHERE id = 2;

/*Trigger tự động nhập tên fullname lên name*/
DELIMITER //

-- Khi UPDATE user_info.full_name
CREATE TRIGGER sync_name_after_update
AFTER UPDATE ON user_info
FOR EACH ROW
BEGIN
  IF NEW.full_name <> OLD.full_name THEN
    UPDATE users SET name = NEW.full_name WHERE id = NEW.user_id;
  END IF;
END;
//

-- Khi INSERT user_info (hoặc INSERT ON DUPLICATE KEY UPDATE)
CREATE TRIGGER sync_name_after_insert
AFTER INSERT ON user_info
FOR EACH ROW
BEGIN
  UPDATE users SET name = NEW.full_name WHERE id = NEW.user_id;
END;
//

DELIMITER ;

select * from users;
select * from user_info;

DROP TABLE IF EXISTS user_info;
DROP TABLE IF EXISTS users;

-- Phần bảng cho phiếu nhập
CREATE TABLE phieu_nhap_kho (
  id INT AUTO_INCREMENT PRIMARY KEY,
  receipt_code VARCHAR(50) UNIQUE,
  created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  supplier_name VARCHAR(255) NOT NULL,
  logo_url TEXT,
  supplier_address TEXT,
  
   -- 👤 Đại diện khách hàng (nhà cung cấp)
  representative_name VARCHAR(100),
  representative_email VARCHAR(100),
  representative_phone VARCHAR(20),

  user_id INT NOT NULL,
  total_amount DECIMAL(15,2) DEFAULT 0,

  meeting_date DATE,
  
  staff_account_name VARCHAR(100),
  staff_account_email VARCHAR(100),
  admin_account_name VARCHAR(100),
  admin_account_email VARCHAR(100),

  note TEXT,
  note_admin TEXT,

  -- 🔁 Chỉ còn 3 trạng thái
  trang_thai ENUM(
    'Đã gửi phiếu',
    'Đã duyệt',
    'Đã nhập hàng vào kho'
  ) DEFAULT 'Đã gửi phiếu',
  
  da_xuat_hoa_don BOOLEAN DEFAULT false,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE phieu_nhap_kho_chi_tiet (
  id INT AUTO_INCREMENT PRIMARY KEY,
  phieu_nhap_kho_id INT NOT NULL,
  item_no INT,                            -- Số thứ tự dòng
  image_url TEXT,                         -- Hình ảnh sản phẩm
  product_name VARCHAR(255),             -- Tên sản phẩm
  product_type VARCHAR(100),             -- Loại sản phẩm (MỚI)
  product_code VARCHAR(100),             -- Mã sản phẩm (MỚI)
  unit VARCHAR(50),                      -- Đơn vị
  weight DECIMAL(10,2),                  -- Khối lượng
  area  FLOAT DEFAULT 0,				-- Diện tích
  manufacture_date DATE,                 -- Ngày sản xuất
  expiry_date DATE,                      -- Hạn sử dụng
  quantity INT,                          -- Số lượng
  unit_price DECIMAL(15,2),              -- Đơn giá
  total_price DECIMAL(15,2),             -- Thành tiền

  FOREIGN KEY (phieu_nhap_kho_id) REFERENCES phieu_nhap_kho(id) ON DELETE CASCADE
);

select * from phieu_nhap_kho ;
select * from phieu_nhap_kho_chi_tiet;

DROP TABLE IF EXISTS phieu_nhap_kho_chi_tiet;
DROP TABLE IF EXISTS phieu_nhap_kho;

-- Phần bảng phiếu xuất kho
CREATE TABLE phieu_xuat_kho (
  id INT AUTO_INCREMENT PRIMARY KEY,                     -- Mã ID tự tăng
  receipt_code VARCHAR(50) UNIQUE,                       -- Mã phiếu xuất (ví dụ: PXK20250703-001)
  created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  receiver_name VARCHAR(255) NOT NULL,                   -- Tên người nhận hàng
  receiver_address TEXT,                                 -- Địa chỉ nhận hàng
  logo_url TEXT,                                         -- Logo đơn vị nhận hàng (nếu có)

  user_id INT NOT NULL,                                  -- ID người tạo phiếu (liên kết bảng users)
  total_amount DECIMAL(15,2) DEFAULT 0,                  -- Tổng tiền phiếu xuất
  total_weight DECIMAL(15,2) DEFAULT 0,
  
  -- 👤 Đại diện khách hàng (nhà cung cấp)
  representative_name VARCHAR(100),
  representative_email VARCHAR(100),
  representative_phone VARCHAR(20),

  delivery_date DATE,                                    -- Ngày dự kiến giao hàng
  
  staff_account_name VARCHAR(100),
  staff_account_email VARCHAR(100),                     -- Email nhân viên xử lý
  admin_account_name VARCHAR(100),
  admin_account_email VARCHAR(100),                     -- Email quản lý duyệt

  note TEXT,                                             -- Ghi chú thêm
  note_admin TEXT,


	trang_thai ENUM(
    'Đã gửi phiếu', 
    'Đã duyệt', 
    'Đã xuất hàng khỏi kho'
  ) DEFAULT 'Đã gửi phiếu',                                -- Trạng thái phiếu
  
  da_xuat_hoa_don BOOLEAN DEFAULT false,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,              -- Ngày tạo phiếu

  FOREIGN KEY (user_id) REFERENCES users(id)             -- Liên kết với người dùng
);

CREATE TABLE phieu_xuat_kho_chi_tiet (
  id INT AUTO_INCREMENT PRIMARY KEY,                    -- ID chi tiết
  phieu_xuat_kho_id INT NOT NULL,                       -- ID phiếu xuất (liên kết)
  item_no INT,                                          -- Số thứ tự sản phẩm
  image_url TEXT,                                       -- Ảnh minh họa sản phẩm
  product_name VARCHAR(255),                            -- Tên sản phẩm
  product_type VARCHAR(100),                            -- Loại sản phẩm
  product_code VARCHAR(100),                            -- Mã sản phẩm
  unit VARCHAR(50),                                     -- Đơn vị (kg, thùng,...)
  weight_per_unit DECIMAL(10,2), 
  weight DECIMAL(10,2),                                 -- Khối lượng
  manufacture_date DATE,                                -- Ngày sản xuất
  expiry_date DATE,                                     -- Hạn sử dụng
  quantity INT,                                         -- Số lượng
  unit_price DECIMAL(15,2),                             -- Đơn giá
  total_price DECIMAL(15,2),                            -- Thành tiền = SL × Đơn giá
  

  FOREIGN KEY (phieu_xuat_kho_id) REFERENCES phieu_xuat_kho(id) ON DELETE CASCADE
);

UPDATE phieu_xuat_kho
SET trang_thai = 'Đã duyệt'
WHERE id = 1;

select * from phieu_xuat_kho ;
select * from phieu_xuat_kho_chi_tiet;

DROP TABLE IF EXISTS phieu_xuat_kho_chi_tiet;
DROP TABLE IF EXISTS phieu_xuat_kho;

CREATE OR REPLACE VIEW vw_hoa_don_tong_hop AS
SELECT
  'Phiếu nhập' AS loai_phieu,
  id,
  receipt_code,
  created_date,
  supplier_name AS doi_tac,
  total_amount,
  trang_thai,
  user_id
FROM phieu_nhap_kho
UNION
SELECT
  'Phiếu xuất' AS loai_phieu,
  id,
  receipt_code,
  created_date,
  receiver_name AS doi_tac,
  total_amount,
  trang_thai,
  user_id
FROM phieu_xuat_kho;



/*Bảng tổng quan kho , sức chứa*/
CREATE TABLE tong_suc_chua (
  id INT PRIMARY KEY,                     -- Luôn là 1
  tong_suc_chua_kg FLOAT,
  tong_da_dung_kg FLOAT,

  tong_suc_chua_m2 FLOAT,
  tong_da_dung_m2 FLOAT,

  cap_nhat_luc DATETIME
);

/*Bảng khu vực kho*/
CREATE TABLE khu_vuc (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ten_khu_vuc VARCHAR(100) UNIQUE NOT NULL,
  mo_ta TEXT,

  suc_chua_kg FLOAT DEFAULT 50000,       -- Sức chứa tối đa về khối lượng
  da_su_dung_kg FLOAT DEFAULT 0,         -- Đã sử dụng bao nhiêu kg

  suc_chua_m2 FLOAT DEFAULT 200,        -- Sức chứa tối đa về diện tích
  da_su_dung_m2 FLOAT DEFAULT 0          -- Đã sử dụng bao nhiêu m²
);

INSERT INTO khu_vuc (ten_khu_vuc, mo_ta)
VALUES 
('Đồ ăn & Đồ uống', 'Lưu trữ thực phẩm và đồ uống các loại'),
('Mỹ phẩm & chăm sóc cá nhân', 'Các sản phẩm mỹ phẩm, chăm sóc cá nhân'),
('Thời trang & giày dép', 'Sản phẩm thời trang, quần áo, giày dép'),
('Thiết bị điện tử', 'Các thiết bị công nghệ, điện tử'),
('Đồ dùng gia đình', 'Nồi niêu, nước lau nhà, nước rửa chén, vật dụng gia đình');


/*Bảng danh sách sản phẩm*/
CREATE TABLE products_detail (
  id INT AUTO_INCREMENT PRIMARY KEY,

  -- Thông tin cơ bản
  product_code VARCHAR(100) NOT NULL,         -- Mã sản phẩm
  old_product_code VARCHAR(100),              -- Mã cũ (nếu có chỉnh sửa)
  product_name VARCHAR(255) NOT NULL,         -- Tên sản phẩm
  product_type VARCHAR(255) NOT NULL,         -- Loại hàng hóa
  unit VARCHAR(50),                           -- Đơn vị tính (thùng, chai,...)
  image_url TEXT,                             -- Hình ảnh minh họa

  -- Số lượng & thuộc tính vật lý
  quantity INT DEFAULT 0,                     -- Số lượng
  weight FLOAT DEFAULT 0,                     -- Tổng khối lượng (kg)
  area FLOAT DEFAULT 0,                       -- Tổng diện tích (m²)
  weight_per_unit FLOAT DEFAULT 0,            -- Khối lượng mỗi đơn vị
  area_per_unit FLOAT DEFAULT 0,              -- Diện tích mỗi đơn vị

  -- Ngày tháng
  manufacture_date DATE,                      -- Ngày sản xuất
  expiry_date DATE,                           -- Hạn sử dụng
  import_date DATETIME DEFAULT CURRENT_TIMESTAMP, -- Ngày nhập

  -- Giá và thành tiền
  unit_price DECIMAL(15,2),                   -- Giá mỗi đơn vị
  total_price DECIMAL(15,2),                  -- Tổng giá

  -- Vị trí và kho
  location VARCHAR(20),                       -- Vị trí trong khu
  khu_vuc_id INT,                             -- Khu vực lưu trữ
  FOREIGN KEY (khu_vuc_id) REFERENCES khu_vuc(id),

  -- Thông tin đối tác / phiếu nhập
  receipt_code VARCHAR(100),                  -- Mã phiếu nhập
  supplier_name VARCHAR(255),                 -- Tên nhà cung cấp
  logo_url TEXT                               -- Logo nhà cung cấp
);

/*Trigger tự động tính weight_per_unit, area_per_unit*/
DELIMITER //

CREATE TRIGGER trg_products_detail_before_insert
BEFORE INSERT ON products_detail
FOR EACH ROW
BEGIN
  IF NEW.quantity > 0 THEN
    SET NEW.weight_per_unit = NEW.weight / NEW.quantity;
    SET NEW.area_per_unit = NEW.area / NEW.quantity;
  ELSE
    SET NEW.weight_per_unit = 0;
    SET NEW.area_per_unit = 0;
  END IF;
END;
//

DELIMITER ;

DROP TRIGGER IF EXISTS trg_set_location_before_insert;
/*Trigger tự động tăng location khi thêm hàng vào khu vực*/
DELIMITER //

CREATE TRIGGER trg_set_location_before_insert
BEFORE INSERT ON products_detail
FOR EACH ROW
BEGIN
  DECLARE max_num INT DEFAULT 0;
  DECLARE location_code_prefix VARCHAR(10);

  IF NEW.khu_vuc_id IS NOT NULL THEN
    -- Tính tiền tố KVx (ví dụ: KV1)
    SET location_code_prefix = CONCAT('KV', NEW.khu_vuc_id, '_L');

    -- Tìm số lớn nhất đã được gán trong khu đó (tách số cuối cùng từ location)
    SELECT IFNULL(
             MAX(CAST(SUBSTRING_INDEX(location, 'L', -1) AS UNSIGNED)), 0
           )
    INTO max_num
    FROM products_detail
    WHERE khu_vuc_id = NEW.khu_vuc_id;

    -- Gán location theo format: KVx_Lxxx
    SET NEW.location = CONCAT(location_code_prefix, LPAD(max_num + 1, 3, '0'));
  END IF;
END;
//

DELIMITER ;

select * from products_detail;
DROP TABLE IF EXISTS products_detail;

-- Tạo các view để xem 
/*Xem tổng sức chứa của kho, đã sử dụng , còn trống*/
CREATE OR REPLACE VIEW vw_tong_suc_chua_kho AS
SELECT
  SUM(suc_chua_kg) AS tong_suc_chua_kg,
  SUM(da_su_dung_kg) AS tong_da_dung_kg,
  SUM(suc_chua_kg) - SUM(da_su_dung_kg) AS suc_chua_kg_con_lai,
  SUM(suc_chua_m2) AS tong_suc_chua_m2,
  SUM(da_su_dung_m2) AS tong_da_dung_m2,
  SUM(suc_chua_m2) - SUM(da_su_dung_m2) AS suc_chua_m2_con_lai
FROM khu_vuc;


/*Thống kê tổng quan khu vực*/
CREATE OR REPLACE VIEW thong_ke_khu_vuc_tong_quan AS
SELECT 
    kv.id AS khu_vuc_id,
    kv.ten_khu_vuc,
    kv.mo_ta,
    kv.suc_chua_kg,
    kv.da_su_dung_kg,
    kv.suc_chua_m2,
    kv.da_su_dung_m2,
    COUNT(pd.id) AS so_san_pham,
    IFNULL(SUM(pd.quantity), 0) AS tong_so_luong,
    IFNULL(SUM(pd.weight), 0) AS tong_khoi_luong,
    IFNULL(SUM(pd.area), 0) AS tong_dien_tich
FROM khu_vuc kv
LEFT JOIN products_detail pd ON kv.id = pd.khu_vuc_id
GROUP BY kv.id
ORDER BY kv.id ASC;


/*Xem danh sách các sản phẩm trong khu*/
CREATE OR REPLACE VIEW danh_sach_san_pham_theo_khu_vuc AS
SELECT 
    pd.id AS product_id,
    pd.product_code,
    pd.product_name,
    pd.product_type,
    pd.quantity,
    pd.weight,
    pd.area,
    pd.unit_price,
    pd.total_price,
    pd.manufacture_date,
    pd.expiry_date,
    pd.import_date,
    kv.id AS khu_vuc_id,
    kv.ten_khu_vuc
FROM products_detail pd
JOIN khu_vuc kv ON pd.khu_vuc_id = kv.id
ORDER BY kv.id ASC, pd.import_date DESC;


SHOW TRIGGERS;
SHOW TRIGGERS LIKE 'user_info';
DROP TRIGGER IF EXISTS sync_name_from_fullname;

CREATE TABLE location_transfer_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_code VARCHAR(100),
  from_location VARCHAR(50),
  to_location VARCHAR(50),
  user_email VARCHAR(100),
  transfer_time DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE log_tru_hang (
  id INT PRIMARY KEY AUTO_INCREMENT,
  product_code VARCHAR(50),
  pallet_name VARCHAR(50),
  quantity_deducted INT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  phieu_xuat_id INT
);

drop table location_transfer_log;


