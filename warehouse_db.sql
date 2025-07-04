CREATE DATABASE warehouse_db;
USE warehouse_db;

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('user', 'admin', 'staff') DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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

ALTER TABLE users
MODIFY createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE users
MODIFY updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

DESCRIBE users;

-- Chí Hào là admin
UPDATE users SET role = 'admin' WHERE id = 3;
UPDATE users SET role = 'admin' WHERE id = 4;
UPDATE users SET role = 'staff' WHERE id = 5;

select * from users;
select * from user_info ;



