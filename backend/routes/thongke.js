const express = require('express');
const router = express.Router();
const db = require('../config/db'); // bạn cần tạo file db.js export sẵn kết nối mysql

// ✅ Thống kê nhập/xuất theo THÁNG
router.get('/thang', (req, res) => {
  const sql = `
    SELECT 
  DATE_FORMAT(pnk.created_date, '%Y-%m') AS thang,
  'nhap' AS loai,
  SUM(ctnk.quantity) AS tong
FROM phieu_nhap_kho_chi_tiet ctnk
JOIN phieu_nhap_kho pnk ON ctnk.phieu_nhap_kho_id = pnk.id
GROUP BY thang

UNION

SELECT 
  DATE_FORMAT(pxk.created_date, '%Y-%m') AS thang,
  'xuat' AS loai,
  SUM(ctxk.quantity) AS tong
FROM phieu_xuat_kho_chi_tiet ctxk
JOIN phieu_xuat_kho pxk ON ctxk.phieu_xuat_kho_id = pxk.id
GROUP BY thang

ORDER BY thang;

  `;
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: err });
    res.json(results);
  });
});

// ✅ Thống kê theo NGÀY (nếu muốn)
router.get('/ngay', (req, res) => {
  const sql = `
   SELECT 
  DATE(pnk.created_date) AS ngay,
  'nhap' AS loai,
  SUM(ctnk.quantity) AS tong
FROM phieu_nhap_kho_chi_tiet ctnk
JOIN phieu_nhap_kho pnk ON ctnk.phieu_nhap_kho_id = pnk.id
GROUP BY ngay

UNION

SELECT 
  DATE(pxk.created_date) AS ngay,
  'xuat' AS loai,
  SUM(ctxk.quantity) AS tong
FROM phieu_xuat_kho_chi_tiet ctxk
JOIN phieu_xuat_kho pxk ON ctxk.phieu_xuat_kho_id = pxk.id
GROUP BY ngay

ORDER BY ngay;

  `;
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: err });
    res.json(results);
  });
});

module.exports = router;
