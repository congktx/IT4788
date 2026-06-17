-- Truncate old data if needed
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE `categories`;
TRUNCATE TABLE `brands`;
SET FOREIGN_KEY_CHECKS = 1;

-- Insert Categories
INSERT INTO `categories` (`id`, `name`, `parent_id`, `sort`, `has_child`, `has_brand`, `has_size`, `require_weight`, `description`, `image_url`) VALUES
(1, 'Điện thoại & Máy tính bảng', 0, 1, 0, 1, 0, 1, 'Các sản phẩm điện thoại thông minh, máy tính bảng và phụ kiện di động.', 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=300'),
(2, 'Laptop & Máy tính văn phòng', 0, 2, 0, 1, 0, 1, 'Máy tính xách tay, linh kiện máy tính, màn hình và thiết bị văn phòng.', 'https://images.unsplash.com/photo-1496181130204-755241524eab?w=300'),
(3, 'Thời trang nam', 0, 3, 0, 0, 1, 0, 'Quần áo thời trang nam, phụ kiện thời trang nam, mũ nón nam.', 'https://images.unsplash.com/photo-1617137968427-85924c800a22?w=300'),
(4, 'Thời trang nữ', 0, 4, 0, 0, 1, 0, 'Đầm váy nữ, quần áo thời trang nữ, trang sức, túi xách nữ.', 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=300'),
(5, 'Giày dép & Thể thao', 0, 5, 0, 1, 1, 1, 'Giày thể thao, giày lười, giày tây và trang phục thể thao chuyên dụng.', 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=300'),
(6, 'Đồ gia dụng & Nhà cửa', 0, 6, 0, 1, 0, 1, 'Thiết bị điện gia dụng, nồi cơm điện, tủ lạnh, quạt và đồ nội thất.', 'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?w=300'),
(7, 'Sức khỏe & Sắc đẹp', 0, 7, 0, 1, 0, 0, 'Mỹ phẩm, chăm sóc da, thực phẩm chức năng và thiết bị chăm sóc sức khỏe.', 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=300');

-- Insert Brands
INSERT INTO `brands` (`id`, `name`, `logo_url`, `category_id`) VALUES
-- Brands for Category 1 (Phones)
(1, 'Apple', 'https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg', 1),
(2, 'Samsung', 'https://upload.wikimedia.org/wikipedia/commons/2/24/Samsung_Logo.svg', 1),
(3, 'Xiaomi', 'https://upload.wikimedia.org/wikipedia/commons/a/ae/Xiaomi_logo_%282021-%29.svg', 1),
(4, 'Oppo', 'https://upload.wikimedia.org/wikipedia/commons/2/23/OPPO_LOGO.svg', 1),

-- Brands for Category 2 (Laptops)
(5, 'Dell', 'https://upload.wikimedia.org/wikipedia/commons/1/18/Dell_logo_2016.svg', 2),
(6, 'HP', 'https://upload.wikimedia.org/wikipedia/commons/a/ad/HP_logo_2012.svg', 2),
(7, 'Asus', 'https://upload.wikimedia.org/wikipedia/commons/d/de/Asus_Logo.svg', 2),
(8, 'Lenovo', 'https://upload.wikimedia.org/wikipedia/commons/b/b8/Lenovo_logo_2015.svg', 2),

-- Brands for Category 5 (Shoes)
(9, 'Nike', 'https://upload.wikimedia.org/wikipedia/commons/a/a6/Logo_NIKE.svg', 5),
(10, 'Adidas', 'https://upload.wikimedia.org/wikipedia/commons/2/20/Adidas_Logo.svg', 5),
(11, 'Puma', 'https://upload.wikimedia.org/wikipedia/commons/8/88/Puma_Logo.svg', 5),

-- Brands for Category 6 (Home Appliances)
(12, 'Panasonic', 'https://upload.wikimedia.org/wikipedia/commons/7/7b/Panasonic_logo_%28blue%29.svg', 6),
(13, 'Philips', 'https://upload.wikimedia.org/wikipedia/commons/7/71/Philips_logo_new.svg', 6),
(14, 'Toshiba', 'https://upload.wikimedia.org/wikipedia/commons/b/b2/Toshiba_logo.svg', 6);
