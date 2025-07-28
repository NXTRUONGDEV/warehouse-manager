-- MySQL dump 10.13  Distrib 8.0.40, for Win64 (x86_64)
--
-- Host: localhost    Database: warehouse_db
-- ------------------------------------------------------
-- Server version	8.0.35

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Temporary view structure for view `danh_sach_san_pham_theo_khu_vuc`
--

DROP TABLE IF EXISTS `danh_sach_san_pham_theo_khu_vuc`;
/*!50001 DROP VIEW IF EXISTS `danh_sach_san_pham_theo_khu_vuc`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `danh_sach_san_pham_theo_khu_vuc` AS SELECT 
 1 AS `product_id`,
 1 AS `product_code`,
 1 AS `product_name`,
 1 AS `product_type`,
 1 AS `quantity`,
 1 AS `weight`,
 1 AS `area`,
 1 AS `unit_price`,
 1 AS `total_price`,
 1 AS `manufacture_date`,
 1 AS `expiry_date`,
 1 AS `import_date`,
 1 AS `khu_vuc_id`,
 1 AS `ten_khu_vuc`*/;
SET character_set_client = @saved_cs_client;

--
-- Table structure for table `khu_vuc`
--

DROP TABLE IF EXISTS `khu_vuc`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `khu_vuc` (
  `id` int NOT NULL AUTO_INCREMENT,
  `ten_khu_vuc` varchar(100) NOT NULL,
  `mo_ta` text,
  `suc_chua_kg` float DEFAULT '100000',
  `da_su_dung_kg` float DEFAULT '0',
  `suc_chua_m2` float DEFAULT '1000',
  `da_su_dung_m2` float DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `ten_khu_vuc` (`ten_khu_vuc`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `khu_vuc`
--

LOCK TABLES `khu_vuc` WRITE;
/*!40000 ALTER TABLE `khu_vuc` DISABLE KEYS */;
INSERT INTO `khu_vuc` VALUES (1,'Đồ ăn & Đồ uống','Lưu trữ thực phẩm và đồ uống các loại',100000,0,1000,0),(2,'Mỹ phẩm & chăm sóc cá nhân','Các sản phẩm mỹ phẩm, chăm sóc cá nhân',100000,0,1000,0),(3,'Thời trang & giày dép','Sản phẩm thời trang, quần áo, giày dép',100000,0,1000,0),(4,'Thiết bị điện tử','Các thiết bị công nghệ, điện tử',100000,0,1000,0),(5,'Vật liệu xây dựng','Gạch, xi măng, sơn, vật liệu thô',100000,0,1000,0),(6,'Đồ dùng gia đình','Nồi niêu, nước lau nhà, nước rửa chén, vật dụng gia đình',100000,0,1000,0);
/*!40000 ALTER TABLE `khu_vuc` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payment_fake_transactions`
--

DROP TABLE IF EXISTS `payment_fake_transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payment_fake_transactions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `phieu_xuat_kho_id` int NOT NULL,
  `payment_method` varchar(50) DEFAULT NULL,
  `transaction_code` varchar(100) DEFAULT NULL,
  `status` enum('Thành công','Thất bại') DEFAULT 'Thành công',
  `payment_time` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `transaction_code` (`transaction_code`),
  KEY `phieu_xuat_kho_id` (`phieu_xuat_kho_id`),
  CONSTRAINT `payment_fake_transactions_ibfk_1` FOREIGN KEY (`phieu_xuat_kho_id`) REFERENCES `phieu_xuat_kho` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payment_fake_transactions`
--

LOCK TABLES `payment_fake_transactions` WRITE;
/*!40000 ALTER TABLE `payment_fake_transactions` DISABLE KEYS */;
/*!40000 ALTER TABLE `payment_fake_transactions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `phieu_nhap_kho`
--

DROP TABLE IF EXISTS `phieu_nhap_kho`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `phieu_nhap_kho` (
  `id` int NOT NULL AUTO_INCREMENT,
  `receipt_code` varchar(50) DEFAULT NULL,
  `created_date` date DEFAULT (curdate()),
  `supplier_name` varchar(255) NOT NULL,
  `logo_url` text,
  `supplier_address` text,
  `user_id` int NOT NULL,
  `total_amount` decimal(15,2) DEFAULT '0.00',
  `meeting_date` date DEFAULT NULL,
  `supplier_account_email` varchar(100) DEFAULT NULL,
  `staff_account_name` varchar(100) DEFAULT NULL,
  `staff_account_email` varchar(100) DEFAULT NULL,
  `admin_account_name` varchar(100) DEFAULT NULL,
  `admin_account_email` varchar(100) DEFAULT NULL,
  `note` text,
  `note_staff` text,
  `note_admin` text,
  `trang_thai` enum('Đã đăng ký','Đã tạo phiếu - đợi duyệt','Đã duyệt - hẹn gặp','Hoàn tất nhập hàng') DEFAULT 'Đã đăng ký',
  PRIMARY KEY (`id`),
  UNIQUE KEY `receipt_code` (`receipt_code`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `phieu_nhap_kho_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `phieu_nhap_kho`
--

LOCK TABLES `phieu_nhap_kho` WRITE;
/*!40000 ALTER TABLE `phieu_nhap_kho` DISABLE KEYS */;
INSERT INTO `phieu_nhap_kho` VALUES (1,'PNK20250713-001','2025-07-13','Sữa vilamilk','http://localhost:3000/uploads/logo_1752423559887-939177630.png','vinamilk',1,750000000.00,'2025-07-14','users@mail.com','Nguyễn Xuân Trường','admin@mail.com','Nguyễn Xuân Trường','admin@mail.com','Nhập ngày 13/7 đã đủ số lượng','','','Hoàn tất nhập hàng'),(2,'PNK20250726-002','2025-07-26','MaxNguyenx','http://localhost:3000/uploads/logo_1753545153976-822249636.jfif','vinamilk',1,703500.00,'2025-07-27',NULL,'Nguyễn Xuân Trường','users@mail.com',NULL,NULL,'đa',NULL,NULL,'Đã đăng ký'),(3,'PNK20250727-003','2025-07-27','MaxNguyenx','http://localhost:3000/uploads/logo_1753597481335-117441549.jpg','vinamilk',1,8000000.00,'2025-07-27',NULL,'Nguyễn Xuân Trường','users@mail.com',NULL,NULL,NULL,NULL,NULL,'Đã đăng ký'),(4,'PNK20250727-004','2025-07-27','MaxNguyenx','http://localhost:3000/uploads/logo_1753598346981-742663191.jpg','vinamilk',1,106626520.00,NULL,NULL,'Nguyễn Xuân Trường','users@mail.com',NULL,NULL,NULL,NULL,NULL,'Đã đăng ký');
/*!40000 ALTER TABLE `phieu_nhap_kho` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `phieu_nhap_kho_chi_tiet`
--

DROP TABLE IF EXISTS `phieu_nhap_kho_chi_tiet`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `phieu_nhap_kho_chi_tiet` (
  `id` int NOT NULL AUTO_INCREMENT,
  `phieu_nhap_kho_id` int NOT NULL,
  `item_no` int DEFAULT NULL,
  `image_url` text,
  `product_name` varchar(255) DEFAULT NULL,
  `product_type` varchar(100) DEFAULT NULL,
  `product_code` varchar(100) DEFAULT NULL,
  `unit` varchar(50) DEFAULT NULL,
  `weight` decimal(10,2) DEFAULT NULL,
  `area` float DEFAULT '0',
  `manufacture_date` date DEFAULT NULL,
  `expiry_date` date DEFAULT NULL,
  `quantity` int DEFAULT NULL,
  `unit_price` decimal(15,2) DEFAULT NULL,
  `total_price` decimal(15,2) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `phieu_nhap_kho_id` (`phieu_nhap_kho_id`),
  CONSTRAINT `phieu_nhap_kho_chi_tiet_ibfk_1` FOREIGN KEY (`phieu_nhap_kho_id`) REFERENCES `phieu_nhap_kho` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `phieu_nhap_kho_chi_tiet`
--

LOCK TABLES `phieu_nhap_kho_chi_tiet` WRITE;
/*!40000 ALTER TABLE `phieu_nhap_kho_chi_tiet` DISABLE KEYS */;
INSERT INTO `phieu_nhap_kho_chi_tiet` VALUES (1,1,1,'http://localhost:3000/uploads/product_image_0_1752423559887-431061944.jpg','Sữa vina','sữa','Vnnad','Thùng',3200.00,25,'2025-07-03','2025-10-12',5000,150000.00,750000000.00),(2,2,1,'http://localhost:3000/uploads/product_image_0_1753545153978-213499908.jpg','sdfg','sd','22d','aa',600.00,2.4,'2025-07-24','2025-11-21',300,2345.00,703500.00),(3,3,1,'http://localhost:3000/uploads/product_image_0_1753597481337-760280701.jpg','Test1','Sữa','Test1','Chai',400.00,1.6,'2025-07-26','2025-10-05',400,20000.00,8000000.00),(4,4,1,'http://localhost:3000/uploads/product_image_0_1753598346982-185843268.jpg','s','s','s','s',455.00,1.82,'2025-07-26','2025-10-04',455,234344.00,106626520.00);
/*!40000 ALTER TABLE `phieu_nhap_kho_chi_tiet` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `phieu_xuat_kho`
--

DROP TABLE IF EXISTS `phieu_xuat_kho`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `phieu_xuat_kho` (
  `id` int NOT NULL AUTO_INCREMENT,
  `receipt_code` varchar(50) DEFAULT NULL,
  `created_date` date DEFAULT (curdate()),
  `receiver_name` varchar(255) NOT NULL,
  `receiver_address` text,
  `logo_url` text,
  `user_id` int NOT NULL,
  `total_amount` decimal(15,2) DEFAULT '0.00',
  `total_weight` decimal(15,2) DEFAULT '0.00',
  `delivery_date` date DEFAULT NULL,
  `receiver_account_email` varchar(100) DEFAULT NULL,
  `staff_account_name` varchar(100) DEFAULT NULL,
  `staff_account_email` varchar(100) DEFAULT NULL,
  `admin_account_name` varchar(100) DEFAULT NULL,
  `admin_account_email` varchar(100) DEFAULT NULL,
  `note` text,
  `note_staff` text,
  `note_admin` text,
  `trang_thai` enum('Chờ xác nhận','Đã xuất hàng khỏi kho') DEFAULT 'Chờ xác nhận',
  `representative_name` varchar(255) DEFAULT NULL,
  `representative_email` varchar(255) DEFAULT NULL,
  `representative_phone` varchar(50) DEFAULT NULL,
  `quantity` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `receipt_code` (`receipt_code`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `phieu_xuat_kho_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=30 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `phieu_xuat_kho`
--

LOCK TABLES `phieu_xuat_kho` WRITE;
/*!40000 ALTER TABLE `phieu_xuat_kho` DISABLE KEYS */;
INSERT INTO `phieu_xuat_kho` VALUES (17,'PXK20250721-772','2025-07-21','Nguyễn Xuân Trườngas2','Nguyễn Xuân Trường','',1,3000000.00,12.88,'2025-07-21',NULL,'Nguyễn Xuân Trường','users@mail.com','','','8h25',NULL,NULL,'Đã xuất hàng khỏi kho','qqqq','user1@mail.com','0968488778',20),(18,'PXK20250721-409','2025-07-21','Nguyễn Xuân Trườngas','Nguyễn Xuân Trường','',1,1500000.00,1.08,'2025-07-21',NULL,'Nguyễn Xuân Trường','users@mail.com','','','8h27',NULL,NULL,'Đã xuất hàng khỏi kho','qqqq','user1@mail.com','0968488778',50),(19,'PXK20250721-943','2025-07-21','Nguyễn Xuân Trườngas2','Nguyễn Xuân Trường','',1,9200000.00,20.01,'2025-07-21',NULL,'Nguyễn Xuân Trường','users@mail.com','','','Xuất bán lẻ cho khách hàng',NULL,NULL,'Đã xuất hàng khỏi kho','qqqq','nguyentruong09333@gmail.com','0968488778',50),(20,'PXK20250721-582','2025-07-21','Nguyễn Xuân Trườngas','Nguyễn Xuân Trường','',1,6375000.00,12.81,'2025-07-21',NULL,'Nguyễn Xuân Trường','users@mail.com','','','Xuất lên kệ',NULL,NULL,'Đã xuất hàng khỏi kho','qqqq','user1@mail.com','0968488778',34),(21,'PXK20250721-652','2025-07-21','Nguyễn Xuân Trườngas','Nguyễn Xuân Trường','',1,69400000.00,66.08,'2025-07-21',NULL,'Nguyễn Xuân Trường','users@mail.com','','','9h59',NULL,NULL,'Đã xuất hàng khỏi kho','qqqq','user1@mail.com','0968488778',100),(23,'PXK20250722-978','2025-07-22','Nguyễn Xuân Trường','Nguyễn Xuân Trường','',7,29750000.00,65.63,'2025-07-22',NULL,'Nguyễn Văn An','user4@mail.com','','','3',NULL,NULL,'Đã xuất hàng khỏi kho','','user1@mail.com','0968488778',68),(24,'PXK20250722-786','2025-07-22','Nguyễn Xuân Trường','Nguyễn Xuân Trường','',4,17450000.00,26.81,'2025-07-22',NULL,'Nguyễn Văn An','user1@mail.com','','','4',NULL,NULL,'Chờ xác nhận','','','',50),(25,'PXK20250722-523','2025-07-22','Nguyễn Xuân Trườngas','Nguyễn Xuân Trường','',5,16435000.00,0.83,'2025-07-22',NULL,'gsdgsg','user2@mail.com','','','2',NULL,NULL,'Chờ xác nhận','qqqq','user1@mail.com','0968488778',90),(26,'PXK20250726-832','2025-07-26','Nguyễn Xuân Trường','Nguyễn Xuân Trường','',1,1035000.00,0.85,'2025-07-28',NULL,'Nguyễn Xuân Trường','users@mail.com','','','xuastas 27',NULL,NULL,'Đã xuất hàng khỏi kho','','user1@mail.com','0968488778',2),(27,'PXK20250726-180','2025-07-26','Nguyễn Xuân Trườngas','Nguyễn Xuân Trường','',1,200000.00,0.00,'2025-07-26',NULL,'Nguyễn Xuân Trường','users@mail.com','','','top1vn',NULL,NULL,'Chờ xác nhận','qqqq','user1@mail.com','0968488778',4),(28,'PXK20250727-108','2025-07-27','Nguyễn Xuân Trường','Nguyễn Xuân Trường','',1,99000.00,0.00,'2025-07-27',NULL,'Nguyễn Xuân Trường','users@mail.com','','','xuất 11h20-',NULL,NULL,'Đã xuất hàng khỏi kho','','user1@mail.com','0968488778',2),(29,'PXK20250727-095','2025-07-27','Nguyễn Xuân Trườngas','Nguyễn Xuân Trường','',1,9550000.00,18.00,'2025-07-27',NULL,'Nguyễn Xuân Trường','users@mail.com','','','bnnh',NULL,NULL,'Đã xuất hàng khỏi kho','qqqq','user1@mail.com','0968488778',60);
/*!40000 ALTER TABLE `phieu_xuat_kho` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `phieu_xuat_kho_chi_tiet`
--

DROP TABLE IF EXISTS `phieu_xuat_kho_chi_tiet`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `phieu_xuat_kho_chi_tiet` (
  `id` int NOT NULL AUTO_INCREMENT,
  `phieu_xuat_kho_id` int NOT NULL,
  `item_no` int DEFAULT NULL,
  `image_url` text,
  `product_name` varchar(255) DEFAULT NULL,
  `product_type` varchar(100) DEFAULT NULL,
  `product_code` varchar(100) DEFAULT NULL,
  `unit` varchar(50) DEFAULT NULL,
  `weight_per_unit` decimal(10,2) DEFAULT NULL,
  `weight` decimal(10,2) DEFAULT NULL,
  `manufacture_date` date DEFAULT NULL,
  `expiry_date` date DEFAULT NULL,
  `quantity` int DEFAULT NULL,
  `unit_price` decimal(15,2) DEFAULT NULL,
  `total_price` decimal(15,2) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `phieu_xuat_kho_id` (`phieu_xuat_kho_id`),
  CONSTRAINT `phieu_xuat_kho_chi_tiet_ibfk_1` FOREIGN KEY (`phieu_xuat_kho_id`) REFERENCES `phieu_xuat_kho` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=44 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `phieu_xuat_kho_chi_tiet`
--

LOCK TABLES `phieu_xuat_kho_chi_tiet` WRITE;
/*!40000 ALTER TABLE `phieu_xuat_kho_chi_tiet` DISABLE KEYS */;
INSERT INTO `phieu_xuat_kho_chi_tiet` VALUES (18,17,1,'http://localhost:3000/uploads/image_1752671494137-99871193.jpg','Sữa vina','sữa','Vnnad','Thùng',0.64,12.88,'2025-06-30','2025-10-09',20,150000.00,3000000.00),(19,18,1,'http://localhost:3000/uploads/image_1752671505918-709673822.jpg','tẩy trang','mỹ phẩm','adgh4656','chai',0.02,1.08,'2018-02-08','2026-10-31',50,30000.00,1500000.00),(20,19,1,'http://localhost:3000/uploads/image_1752671494137-99871193.jpg','Sữa vina','sữa','Vnnad','Thùng',0.66,19.93,'2025-06-30','2025-10-09',30,150000.00,4500000.00),(21,19,2,'http://localhost:3000/uploads/image_1753108952011-375275430.jpg','Sữa THtruemilk','Sữa','THMILK','Thùng',0.00,0.08,'2025-07-17','2026-11-19',20,235000.00,4700000.00),(22,20,1,'http://localhost:3000/uploads/image_1753108952011-375275430.jpg','Sữa THtruemilk','Sữa','THMILK','Thùng',0.00,0.06,'2025-07-17','2026-11-19',15,235000.00,3525000.00),(23,20,2,'http://localhost:3000/uploads/image_1752671494137-99871193.jpg','Sữa vina','sữa','Vnnad','Thùng',0.67,12.75,'2025-06-30','2025-10-09',19,150000.00,2850000.00),(24,21,1,'http://localhost:3000/uploads/image_1753108952011-375275430.jpg','Sữa THtruemilk','Sữa','THMILK','Thùng',0.00,0.17,'2025-07-17','2026-11-19',40,235000.00,9400000.00),(25,21,2,'http://localhost:3000/uploads/image_1752671518211-945579573.jpg','abcs','nc','abc','1000',1.10,65.92,'2025-07-02','2025-08-06',60,1000000.00,60000000.00),(27,23,1,'http://localhost:3000/uploads/image_1752671518211-945579573.jpg','abcs','nc','abc','1000',1.53,35.18,'2025-07-02','2025-08-06',23,1000000.00,23000000.00),(28,23,2,'http://localhost:3000/uploads/image_1752671494137-99871193.jpg','Sữa vina','sữa','Vnnad','Thùng',0.68,30.45,'2025-06-30','2025-10-09',45,150000.00,6750000.00),(29,24,1,'http://localhost:3000/uploads/image_1752671494137-99871193.jpg','Sữa vina','sữa','Vnnad','Thùng',0.68,8.12,'2025-06-30','2025-10-09',12,150000.00,1800000.00),(30,24,2,'http://localhost:3000/uploads/image_1753108952011-375275430.jpg','Sữa THtruemilk','Sữa','THMILK','Thùng',0.00,0.06,'2025-07-17','2026-11-19',14,235000.00,3290000.00),(31,24,3,'http://localhost:3000/uploads/image_1752671505918-709673822.jpg','tẩy trang','mỹ phẩm','adgh4656','chai',0.02,0.27,'2018-02-08','2026-10-31',12,30000.00,360000.00),(32,24,4,'http://localhost:3000/uploads/image_1752671518211-945579573.jpg','abcs','nc','abc','1000',1.53,18.35,'2025-07-02','2025-08-06',12,1000000.00,12000000.00),(33,25,1,'http://localhost:3000/uploads/image_1753108952011-375275430.jpg','Sữa THtruemilk','Sữa','THMILK','Thùng',0.00,0.30,'2025-07-17','2026-11-19',67,235000.00,15745000.00),(34,25,2,'http://localhost:3000/uploads/image_1752671505918-709673822.jpg','tẩy trang','mỹ phẩm','adgh4656','chai',0.02,0.53,'2018-02-08','2026-10-31',23,30000.00,690000.00),(35,26,1,'http://localhost:3000/uploads/image_1753108952011-375275430.jpg','Sữa THtruemilk','Sữa','THMILK','Thùng',0.00,0.00,'2025-07-17','2026-11-19',1,235000.00,235000.00),(36,26,2,'uploads/ensure.jpg','Sữa Ensure Gold 850g','sữa','P019','lon',0.85,0.85,'2025-04-30','2026-04-30',1,800000.00,800000.00),(37,27,1,'uploads/rejoice.jpg','Dầu gội Rejoice 600ml','dầu gội','P014','chai',0.00,0.00,'2025-05-31','2026-05-31',3,49000.00,147000.00),(38,27,2,'uploads/romano.jpg','Sữa tắm Romano 650ml','sữa tắm','P017','chai',0.00,0.00,'2025-05-14','2026-05-14',1,53000.00,53000.00),(39,28,1,'uploads/sunsilk.jpg','Dầu gội Sunsilk 700ml','dầu gội','P018','chai',0.00,0.00,'2025-06-09','2026-06-09',1,46000.00,46000.00),(40,28,2,'uploads/romano.jpg','Sữa tắm Romano 650ml','sữa tắm','P017','chai',0.00,0.00,'2025-05-14','2026-05-14',1,53000.00,53000.00),(41,29,1,'uploads/darlie.jpg','Kem đánh răng Darlie 200g','kem đánh răng','P016','tuýp',0.00,0.00,'2025-05-31','2027-05-31',30,22000.00,660000.00),(42,29,2,'uploads/meiji.jpg','Sữa Meiji 900g','sữa','P015','lon',0.90,18.00,'2025-06-30','2026-06-30',20,420000.00,8400000.00),(43,29,3,'uploads/rejoice.jpg','Dầu gội Rejoice 600ml','dầu gội','P014','chai',0.00,0.00,'2025-05-31','2026-05-31',10,49000.00,490000.00);
/*!40000 ALTER TABLE `phieu_xuat_kho_chi_tiet` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `products_detail`
--

DROP TABLE IF EXISTS `products_detail`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `products_detail` (
  `id` int NOT NULL AUTO_INCREMENT,
  `product_code` varchar(100) NOT NULL,
  `old_product_code` varchar(100) DEFAULT NULL,
  `product_name` varchar(255) NOT NULL,
  `product_type` varchar(255) NOT NULL,
  `unit` varchar(50) DEFAULT NULL,
  `image_url` text,
  `quantity` int DEFAULT '0',
  `weight` float DEFAULT '0',
  `area` float DEFAULT '0',
  `weight_per_unit` float DEFAULT '0',
  `area_per_unit` float DEFAULT '0',
  `manufacture_date` date DEFAULT NULL,
  `expiry_date` date DEFAULT NULL,
  `import_date` datetime DEFAULT CURRENT_TIMESTAMP,
  `unit_price` decimal(15,2) DEFAULT NULL,
  `total_price` decimal(15,2) DEFAULT NULL,
  `location` varchar(20) DEFAULT NULL,
  `khu_vuc_id` int DEFAULT NULL,
  `receipt_code` varchar(100) DEFAULT NULL,
  `supplier_name` varchar(255) DEFAULT NULL,
  `logo_url` text,
  PRIMARY KEY (`id`),
  KEY `khu_vuc_id` (`khu_vuc_id`),
  CONSTRAINT `products_detail_ibfk_1` FOREIGN KEY (`khu_vuc_id`) REFERENCES `khu_vuc` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=25 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `products_detail`
--

LOCK TABLES `products_detail` WRITE;
/*!40000 ALTER TABLE `products_detail` DISABLE KEYS */;
INSERT INTO `products_detail` VALUES (1,'abc',NULL,'abcs','nc','Chai','http://localhost:3000/uploads/image_1752671518211-945579573.jpg',33,234,12,0,0,'2025-06-30','2025-08-04','2025-07-13 20:34:29',1000000.00,56000000.00,NULL,1,NULL,'T&H Warehouse Manager','http://localhost:3000/uploads/logogpt.png'),(2,'adgh4656',NULL,'tẩy trang','mỹ phẩm','chai','http://localhost:3000/uploads/image_1752671505918-709673822.jpg',918,21,12,0,0,'2018-02-09','2026-11-01','2025-07-13 20:50:02',30000.00,30000000.00,NULL,2,NULL,'oreal','http://localhost:3000/uploads/logogpt.png'),(3,'Vnnad','Vnnad','Sữa vina','sữa','Thùng','http://localhost:3000/uploads/image_1752671494137-99871193.jpg',4684,3200,25,0,0,'2025-07-01','2025-10-10','2025-07-13 23:21:44',150000.00,750000000.00,NULL,1,'PNK20250713-001','Sữa vilamilk','http://localhost:3000/uploads/logo_1752423559887-939177630.png'),(4,'THMILK',NULL,'Sữa THtruemilk','Sữa','Thùng','http://localhost:3000/uploads/image_1753108952011-375275430.jpg',894,4,2,0,0,'2025-07-18','2026-11-20','2025-07-21 21:42:00',235000.00,235000000.00,NULL,1,NULL,'T&H Warehouse Manager','http://localhost:3000/uploads/logogpt.png'),(5,'P001',NULL,'Sữa Vinamilk 1L','sữa','hộp','uploads/milk1.jpg',100,100,NULL,1,NULL,'2025-06-01','2026-06-01','2025-07-25 00:00:00',30000.00,3000000.00,'Kệ A1',1,'RC001','Vinamilk','uploads/vinamilk.png'),(6,'P002',NULL,'Kem đánh răng Colgate 200g','kem đánh răng','tuýp','uploads/colgate.jpg',200,NULL,NULL,NULL,NULL,'2025-05-10','2027-05-10','2025-07-20 00:00:00',20000.00,4000000.00,'Kệ A2',2,'RC002','Colgate','uploads/colgate.png'),(7,'P003',NULL,'Sữa tắm Dove 500ml','sữa tắm','chai','uploads/dove.jpg',150,NULL,NULL,NULL,NULL,'2025-04-15','2026-04-15','2025-07-18 00:00:00',45000.00,6750000.00,'Kệ B1',1,'RC003','Dove','uploads/dove.png'),(8,'P004',NULL,'Dầu gội Clear Men 650ml','dầu gội','chai','uploads/clear.jpg',120,NULL,NULL,NULL,NULL,'2025-03-20','2026-03-20','2025-07-19 00:00:00',55000.00,6600000.00,'Kệ B2',1,'RC004','Unilever','uploads/unilever.png'),(9,'P005',NULL,'Sữa TH True Milk 1L','sữa','hộp','uploads/th.jpg',80,80,NULL,1,NULL,'2025-06-15','2026-06-15','2025-07-21 00:00:00',32000.00,2560000.00,'Kệ A1',1,'RC005','TH Milk','uploads/thmilk.png'),(10,'P006',NULL,'Kem đánh răng P/S Trẻ em','kem đánh răng','tuýp','uploads/ps.jpg',100,NULL,NULL,NULL,NULL,'2025-05-25','2027-05-25','2025-07-22 00:00:00',18000.00,1800000.00,'Kệ A2',2,'RC006','P/S','uploads/ps.png'),(11,'P007',NULL,'Sữa tắm Hazeline nghệ 700ml','sữa tắm','chai','uploads/hazeline.jpg',90,NULL,NULL,NULL,NULL,'2025-06-10','2026-06-10','2025-07-23 00:00:00',42000.00,3780000.00,'Kệ B1',1,'RC007','Hazeline','uploads/hazeline.png'),(12,'P008',NULL,'Dầu gội H&S Bạc Hà 850ml','dầu gội','chai','uploads/hs.jpg',110,NULL,NULL,NULL,NULL,'2025-04-30','2026-04-30','2025-07-24 00:00:00',60000.00,6600000.00,'Kệ B2',1,'RC008','P&G','uploads/pg.png'),(13,'P009',NULL,'Sữa đậu nành Fami 200ml','sữa','hộp','uploads/fami.jpg',300,60,NULL,0.2,NULL,'2025-07-01','2026-01-01','2025-07-25 00:00:00',8000.00,2400000.00,'Kệ A1',1,'RC009','Vinasoy','uploads/vinasoy.png'),(14,'P010',NULL,'Kem đánh răng Sensodyne 100g','kem đánh răng','tuýp','uploads/sensodyne.jpg',70,NULL,NULL,NULL,NULL,'2025-06-05','2027-06-05','2025-07-25 00:00:00',45000.00,3150000.00,'Kệ A2',2,'RC010','Sensodyne','uploads/sensodyne.png'),(15,'P011',NULL,'Sữa Cô Gái Hà Lan 180ml','sữa','hộp','uploads/dutchlady.jpg',180,36,NULL,0.2,NULL,'2025-05-01','2026-05-01','2025-07-25 00:00:00',9000.00,1620000.00,'Kệ A1',1,'RC011','FrieslandCampina','uploads/dutchlady.png'),(16,'P012',NULL,'Kem đánh răng Closeup 150g','kem đánh răng','tuýp','uploads/closeup.jpg',90,NULL,NULL,NULL,NULL,'2025-06-01','2027-06-01','2025-07-25 00:00:00',21000.00,1890000.00,'Kệ A2',2,'RC012','Unilever','uploads/closeup.png'),(17,'P013',NULL,'Sữa tắm Lifebuoy 850ml','sữa tắm','chai','uploads/lifebuoy.jpg',130,NULL,NULL,NULL,NULL,'2025-04-01','2026-04-01','2025-07-25 00:00:00',47000.00,6110000.00,'Kệ B1',1,'RC013','Unilever','uploads/lifebuoy.png'),(18,'P014',NULL,'Dầu gội Rejoice 600ml','dầu gội','chai','uploads/rejoice.jpg',130,NULL,NULL,NULL,NULL,'2025-06-01','2026-06-01','2025-07-25 00:00:00',49000.00,6860000.00,'Kệ B2',1,'RC014','P&G','uploads/rejoice.png'),(19,'P015',NULL,'Sữa Meiji 900g','sữa','lon','uploads/meiji.jpg',40,54,NULL,0.9,NULL,'2025-07-01','2026-07-01','2025-07-25 00:00:00',420000.00,25200000.00,'Kệ A1',1,'RC015','Meiji','uploads/meiji.png'),(20,'P016',NULL,'Kem đánh răng Darlie 200g','kem đánh răng','tuýp','uploads/darlie.jpg',55,NULL,NULL,NULL,NULL,'2025-06-01','2027-06-01','2025-07-25 00:00:00',22000.00,1870000.00,'Kệ A2',2,'RC016','Darlie','uploads/darlie.png'),(21,'P017',NULL,'Sữa tắm Romano 650ml','sữa tắm','chai','uploads/romano.jpg',94,NULL,NULL,NULL,NULL,'2025-05-15','2026-05-15','2025-07-25 00:00:00',53000.00,5035000.00,'Kệ B1',1,'RC017','Romano','uploads/romano.png'),(22,'P018',NULL,'Dầu gội Sunsilk 700ml','dầu gội','chai','uploads/sunsilk.jpg',99,NULL,NULL,NULL,NULL,'2025-06-10','2026-06-10','2025-07-25 00:00:00',46000.00,4600000.00,'Kệ B2',1,'RC018','Unilever','uploads/sunsilk.png'),(23,'P019',NULL,'Sữa Ensure Gold 850g','sữa','lon','uploads/ensure.jpg',49,42.5,NULL,0.85,NULL,'2025-05-01','2026-05-01','2025-07-25 00:00:00',800000.00,40000000.00,'Kệ A1',1,'RC019','Abbott','uploads/ensure.png'),(24,'P020',NULL,'Kem đánh răng Bamboo Charcoal','kem đánh răng','tuýp','uploads/charcoal.jpg',60,NULL,NULL,NULL,NULL,'2025-06-15','2027-06-15','2025-07-25 00:00:00',25000.00,1500000.00,'Kệ A2',2,'RC020','NatureFresh','uploads/charcoal.png');
/*!40000 ALTER TABLE `products_detail` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Temporary view structure for view `thong_ke_khu_vuc_tong_quan`
--

DROP TABLE IF EXISTS `thong_ke_khu_vuc_tong_quan`;
/*!50001 DROP VIEW IF EXISTS `thong_ke_khu_vuc_tong_quan`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `thong_ke_khu_vuc_tong_quan` AS SELECT 
 1 AS `khu_vuc_id`,
 1 AS `ten_khu_vuc`,
 1 AS `mo_ta`,
 1 AS `suc_chua_kg`,
 1 AS `da_su_dung_kg`,
 1 AS `suc_chua_m2`,
 1 AS `da_su_dung_m2`,
 1 AS `so_san_pham`,
 1 AS `tong_so_luong`,
 1 AS `tong_khoi_luong`,
 1 AS `tong_dien_tich`*/;
SET character_set_client = @saved_cs_client;

--
-- Table structure for table `tong_suc_chua`
--

DROP TABLE IF EXISTS `tong_suc_chua`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tong_suc_chua` (
  `id` int NOT NULL,
  `tong_suc_chua_kg` float DEFAULT NULL,
  `tong_da_dung_kg` float DEFAULT NULL,
  `tong_suc_chua_m2` float DEFAULT NULL,
  `tong_da_dung_m2` float DEFAULT NULL,
  `cap_nhat_luc` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tong_suc_chua`
--

LOCK TABLES `tong_suc_chua` WRITE;
/*!40000 ALTER TABLE `tong_suc_chua` DISABLE KEYS */;
/*!40000 ALTER TABLE `tong_suc_chua` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_info`
--

DROP TABLE IF EXISTS `user_info`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_info` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `full_name` varchar(255) DEFAULT NULL,
  `date_of_birth` date DEFAULT NULL,
  `gender` varchar(10) DEFAULT NULL,
  `address` text,
  `phone` varchar(20) DEFAULT NULL,
  `image_url` text,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_id` (`user_id`),
  CONSTRAINT `user_info_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_info`
--

LOCK TABLES `user_info` WRITE;
/*!40000 ALTER TABLE `user_info` DISABLE KEYS */;
INSERT INTO `user_info` VALUES (1,2,'Nguyễn Xuân Trường','2001-11-29','Nam','154/20 tổ 36 kp2 ,An Phú Đông Q12 TPHCM','0968488778','http://localhost:3000/uploads/avatar_1752911188710-634211869.jpg'),(2,1,'Nguyễn Xuân Trường','2001-11-29','Nam','154/20 tổ 36 kp2 ,An Phú Đông Q12 TPHCM','0968488778','http://localhost:3000/uploads/avatar_1752416957933-197655636.jpg'),(5,7,'Nguyễn Văn An','2004-05-22','Nam','','1213432423',NULL),(6,4,'Nguyễn Văn An','2004-04-23','Nam','234','3423423423',NULL),(7,5,'gsdgsg','2003-04-23','Nam','','123213123',NULL);
/*!40000 ALTER TABLE `user_info` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('user','admin','staff') DEFAULT 'user',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'Nguyễn Hải Mây','users@mail.com','$2b$10$5ZBdX02HWGvedlXcbtwZIuhK5bv5cWv1IjkPeM0/OpJv7/iSG6H5W','staff','2025-07-13 13:22:10','2025-07-22 16:07:40'),(2,'Nguyễn Xuân Trường','admin@mail.com','$2b$10$8uKQSRWlB1iepxNMwRAgqev4zeOC.7Vhbs/HYNBMmZE6gDO2S.zsK','admin','2025-07-13 13:23:04','2025-07-13 13:23:13'),(3,'Trần Chí Hào','nguyentruong09333@gmail.com','$2b$10$Zs.n9oufB2UKi6Ie19vzNONgSPceG/DAFaL52SVEQNdcVg.RLTL.m','staff','2025-07-21 08:32:34','2025-07-22 16:07:40'),(4,'Nguyễn Văn An','user1@mail.com','$2b$10$XZiFFUpJ/e9ub/I7YMlM2.aRJNhDutAWS8meB0MGA/Qw.pZXu2NLe','staff','2025-07-22 16:04:06','2025-07-22 16:08:49'),(5,'Trần Thị Mai','user2@mail.com','$2b$10$B2SDdS9jd2wKpo1mVVnylOGrPkvHCocTs53tRdD4gHr4pjk8sV4wu','staff','2025-07-22 16:04:39','2025-07-22 16:08:56'),(6,'Lê Hoàng Phúc','user3@mail.com','$2b$10$LaOT5k2FKPna86WNCXuw..DgMDTOoeL0qZE3h3bpXcQigEaL4W1Dq','staff','2025-07-22 16:05:07','2025-07-22 16:09:03'),(7,'Phạm Ngọc Huyền','user4@mail.com','$2b$10$TRSgU7mJRIbX5P04FUiIpuZGxwA4BBkCMlfmxlM1imLgANpm1H7tm','staff','2025-07-22 16:05:27','2025-07-22 16:09:08'),(9,'Võ Minh Quân','user5@mail.com','$2b$10$zyf5El.kxLuqqn5kscMkD.aEQCreB55SEsEsXyLIX4n/uHTwwTTNu','staff','2025-07-22 16:05:50','2025-07-22 16:09:21');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Temporary view structure for view `vw_hoa_don_tong_hop`
--

DROP TABLE IF EXISTS `vw_hoa_don_tong_hop`;
/*!50001 DROP VIEW IF EXISTS `vw_hoa_don_tong_hop`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `vw_hoa_don_tong_hop` AS SELECT 
 1 AS `loai_phieu`,
 1 AS `id`,
 1 AS `receipt_code`,
 1 AS `created_date`,
 1 AS `doi_tac`,
 1 AS `total_amount`,
 1 AS `trang_thai`,
 1 AS `user_id`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `vw_tong_suc_chua_kho`
--

DROP TABLE IF EXISTS `vw_tong_suc_chua_kho`;
/*!50001 DROP VIEW IF EXISTS `vw_tong_suc_chua_kho`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `vw_tong_suc_chua_kho` AS SELECT 
 1 AS `tong_suc_chua_kg`,
 1 AS `tong_da_dung_kg`,
 1 AS `suc_chua_kg_con_lai`,
 1 AS `tong_suc_chua_m2`,
 1 AS `tong_da_dung_m2`,
 1 AS `suc_chua_m2_con_lai`*/;
SET character_set_client = @saved_cs_client;

--
-- Final view structure for view `danh_sach_san_pham_theo_khu_vuc`
--

/*!50001 DROP VIEW IF EXISTS `danh_sach_san_pham_theo_khu_vuc`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `danh_sach_san_pham_theo_khu_vuc` AS select `pd`.`id` AS `product_id`,`pd`.`product_code` AS `product_code`,`pd`.`product_name` AS `product_name`,`pd`.`product_type` AS `product_type`,`pd`.`quantity` AS `quantity`,`pd`.`weight` AS `weight`,`pd`.`area` AS `area`,`pd`.`unit_price` AS `unit_price`,`pd`.`total_price` AS `total_price`,`pd`.`manufacture_date` AS `manufacture_date`,`pd`.`expiry_date` AS `expiry_date`,`pd`.`import_date` AS `import_date`,`kv`.`id` AS `khu_vuc_id`,`kv`.`ten_khu_vuc` AS `ten_khu_vuc` from (`products_detail` `pd` join `khu_vuc` `kv` on((`pd`.`khu_vuc_id` = `kv`.`id`))) order by `kv`.`id`,`pd`.`import_date` desc */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `thong_ke_khu_vuc_tong_quan`
--

/*!50001 DROP VIEW IF EXISTS `thong_ke_khu_vuc_tong_quan`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `thong_ke_khu_vuc_tong_quan` AS select `kv`.`id` AS `khu_vuc_id`,`kv`.`ten_khu_vuc` AS `ten_khu_vuc`,`kv`.`mo_ta` AS `mo_ta`,`kv`.`suc_chua_kg` AS `suc_chua_kg`,`kv`.`da_su_dung_kg` AS `da_su_dung_kg`,`kv`.`suc_chua_m2` AS `suc_chua_m2`,`kv`.`da_su_dung_m2` AS `da_su_dung_m2`,count(`pd`.`id`) AS `so_san_pham`,ifnull(sum(`pd`.`quantity`),0) AS `tong_so_luong`,ifnull(sum(`pd`.`weight`),0) AS `tong_khoi_luong`,ifnull(sum(`pd`.`area`),0) AS `tong_dien_tich` from (`khu_vuc` `kv` left join `products_detail` `pd` on((`kv`.`id` = `pd`.`khu_vuc_id`))) group by `kv`.`id` order by `kv`.`id` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vw_hoa_don_tong_hop`
--

/*!50001 DROP VIEW IF EXISTS `vw_hoa_don_tong_hop`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `vw_hoa_don_tong_hop` AS select 'Phiếu nhập' AS `loai_phieu`,`phieu_nhap_kho`.`id` AS `id`,`phieu_nhap_kho`.`receipt_code` AS `receipt_code`,`phieu_nhap_kho`.`created_date` AS `created_date`,`phieu_nhap_kho`.`supplier_name` AS `doi_tac`,`phieu_nhap_kho`.`total_amount` AS `total_amount`,`phieu_nhap_kho`.`trang_thai` AS `trang_thai`,`phieu_nhap_kho`.`user_id` AS `user_id` from `phieu_nhap_kho` union select 'Phiếu xuất' AS `loai_phieu`,`phieu_xuat_kho`.`id` AS `id`,`phieu_xuat_kho`.`receipt_code` AS `receipt_code`,`phieu_xuat_kho`.`created_date` AS `created_date`,`phieu_xuat_kho`.`receiver_name` AS `doi_tac`,`phieu_xuat_kho`.`total_amount` AS `total_amount`,`phieu_xuat_kho`.`trang_thai` AS `trang_thai`,`phieu_xuat_kho`.`user_id` AS `user_id` from `phieu_xuat_kho` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vw_tong_suc_chua_kho`
--

/*!50001 DROP VIEW IF EXISTS `vw_tong_suc_chua_kho`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `vw_tong_suc_chua_kho` AS select sum(`khu_vuc`.`suc_chua_kg`) AS `tong_suc_chua_kg`,sum(`khu_vuc`.`da_su_dung_kg`) AS `tong_da_dung_kg`,(sum(`khu_vuc`.`suc_chua_kg`) - sum(`khu_vuc`.`da_su_dung_kg`)) AS `suc_chua_kg_con_lai`,sum(`khu_vuc`.`suc_chua_m2`) AS `tong_suc_chua_m2`,sum(`khu_vuc`.`da_su_dung_m2`) AS `tong_da_dung_m2`,(sum(`khu_vuc`.`suc_chua_m2`) - sum(`khu_vuc`.`da_su_dung_m2`)) AS `suc_chua_m2_con_lai` from `khu_vuc` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-07-28 20:23:41
