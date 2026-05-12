import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '../../src/common/validation.pipe';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { DataSource } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';

import { Category } from '../../src/modules/products/entities/category.entity';
import { Address } from '../../src/modules/orders/entities/address.entity';
import { Brand } from '../../src/modules/products/entities/brand.entity';
import { Province } from '../../src/modules/orders/entities/province.entity';
import { Ward } from '../../src/modules/orders/entities/ward.entity';
import { Product } from '../../src/modules/products/entities/product.entity';
import { User } from '../../src/modules/users/entities/user.entity';
import { Not } from 'typeorm';
import { JwtService } from '@nestjs/jwt';

describe('Products - Edit Product (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let accessToken: string;
  let otherUserToken: string;
  let validCategoryId: number;
  let validShipFromId: number;
  let validBrandId: number;
  let myProductId: number;
  let otherProductId: number;

  beforeAll(async () => {
    const contextPath = path.join(__dirname, '..', 'auth', 'test-context.json');
    if (!fs.existsSync(contextPath)) {
      throw new Error('File test-context.json không tồn tại!');
    }
    const context = JSON.parse(fs.readFileSync(contextPath, 'utf-8'));

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    dataSource = app.get<DataSource>(DataSource);

    // 1. Login User chính
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ phone_number: context.phone_number, password: context.password });
    accessToken = loginRes.body.data?.token;

    // 2. Lấy User phụ từ DB (để test quyền sở hữu, không tạo rác bằng API)
    const userRepo = dataSource.getRepository(User);
    let otherUser = await userRepo.findOne({ where: { id: Not(loginRes.body.data?.id) } });
    
    if (!otherUser) {
      otherUser = await userRepo.save({
        phone_number: '0988888888',
        password: 'hashedpassword',
        role: 'soldier',
        username: 'otheruser_edit',
        uuid: 'otheruser-edit-uuid'
      });
    }

    const jwtService = app.get<JwtService>(JwtService);
    otherUserToken = await jwtService.signAsync({
      sub: otherUser.id,
      username: otherUser.username,
      role: otherUser.role,
    });

    // 3. Chuẩn bị dữ liệu nền (Category, Brand, Address)
    const categoryRepo = dataSource.getRepository(Category);
    const brandRepo = dataSource.getRepository(Brand);
    const provinceRepo = dataSource.getRepository(Province);
    const wardRepo = dataSource.getRepository(Ward);
    const addressRepo = dataSource.getRepository(Address);

    let category = await categoryRepo.findOne({ where: {} });
    if (!category) category = await categoryRepo.save({ name: 'Dien tu', description: 'Test' });
    validCategoryId = category.id;

    let brand = await brandRepo.findOne({ where: {} });
    if (!brand) brand = await brandRepo.save({ name: 'Apple' });
    validBrandId = brand.id;

    let province = await provinceRepo.findOne({ where: {} });
    if (!province) province = await provinceRepo.save({ name: 'Ha Noi' });
    let ward = await wardRepo.findOne({ where: { provinces_id: province.id } });
    if (!ward) ward = await wardRepo.save({ name: 'Dich Vong Hau', provinces_id: province.id });

    const userId = loginRes.body.data?.id;
    let address = await addressRepo.save({
      user_id: userId,
      ward_id: ward.id,
      address_name: 'Home',
      address_detail: '123 Test',
      lat: 0, lng: 0, receiver_name: 'Test', phone: '0123456789', full_address: 'Full'
    });
    validShipFromId = address.id;

    // Tạo địa chỉ cho User phụ (other user)
    const otherUserId = otherUser.id;
    const otherAddress = await addressRepo.save({
      user_id: otherUserId,
      ward_id: ward.id,
      address_name: 'Other Home',
      address_detail: '456 Other St',
      lat: 0, lng: 0, receiver_name: 'Other', phone: otherUser.phone_number, full_address: 'Other Full'
    });
    const otherShipFromId = otherAddress.id;

    // 4. Tạo sản phẩm của User chính
    const myProdRes = await request(app.getHttpServer())
      .post('/api/add_product')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: 'Sản phẩm của tôi',
        price: 1000,
        price_discount: 900,
        description: 'Mô tả gốc',
        category_id: validCategoryId,
        ship_from_id: validShipFromId,
        variants: [{ size: 'M', color: 'Red', stock: 10, weight: 1 }]
      });
    myProductId = myProdRes.body.data?.id;

    // 5. Tạo sản phẩm của User phụ
    const otherProdRes = await request(app.getHttpServer())
      .post('/api/add_product')
      .set('Authorization', `Bearer ${otherUserToken}`)
      .send({
        title: 'Sản phẩm người khác',
        price: 5000,
        price_discount: 4500,
        description: 'Đừng sửa của tôi',
        category_id: validCategoryId,
        ship_from_id: otherShipFromId,
        variants: [{ size: 'L', color: 'Blue', stock: 5, weight: 2 }]
      });
    otherProductId = otherProdRes.body.data?.id;
  }, 60000);

  afterAll(async () => {
    await app.close();
  });

  //TEST CASES 

  it('TC-01: (Thành công) - Chỉnh sửa toàn bộ thông tin sản phẩm', async () => {
    const updateData = {
      title: 'Sản phẩm đã đổi tên',
      price: 2000,
      price_discount: 1500,
      description: 'Mô tả đã được cập nhật',
      category_id: validCategoryId,
      ship_from_id: validShipFromId,
      variants: [{ size: 'L', color: 'Green', stock: 50, weight: 1.5 }]
    };

    const res = await request(app.getHttpServer())
      .patch(`/api/update/${myProductId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send(updateData);

    expect(res.body.code).toBe('1000');
    expect(res.body.message).toBe('OK.');
    expect(res.body.data.title).toBe(updateData.title);
    expect(String(res.body.data.price)).toBe(String(updateData.price));
    expect(res.body.data.variants).toHaveLength(1);
    expect(res.body.data.variants[0].size).toBe('L');
  });

  it('TC-02: (Thành công) - Cập nhật một phần (chỉ đổi giá)', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/update/${myProductId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ price: 9999 });

    expect(res.body.code).toBe('1000');
    expect(res.body.message).toBe('OK.');
    expect(String(res.body.data.price)).toBe('9999');
    // Tiêu đề cũ từ TC-01 phải còn nguyên
    expect(res.body.data.title).toBe('Sản phẩm đã đổi tên');
  });

  it('TC-03: (Thất bại) - Sửa sản phẩm không tồn tại', async () => {
    const res = await request(app.getHttpServer())
      .patch('/api/update/999999')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: 'Ghost' });

    expect(res.body.code).toBe('9992'); // PRODUCT_NOT_EXISTED
    expect(res.body.message).toBe('Product is not existed.');
  });

  it('TC-04: (Thất bại) - Sửa sản phẩm của người khác (Check NOT_ACCESS)', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/update/${otherProductId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: 'Tôi đang hack bạn' });

    expect(res.body.code).toBe('1009'); // NOT_ACCESS
    expect(res.body.message).toBe('Not access.');
  });

  it('TC-05: (Thất bại) - Variants không hợp lệ (stock âm)', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/update/${myProductId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        variants: [{ size: 'S', color: 'Black', stock: -1, weight: 1 }]
      });

    expect(res.body.code).toBe('1004'); // PARAMETER_VALUE_INVALID
    expect(res.body.message).toBe('Parameter value is invalid.');
  });

  it('TC-06: (Thành công) - Thêm và xóa ảnh', async () => {
    // Giả sử ban đầu sản phẩm có ảnh
    await dataSource.getRepository(Product).update(myProductId, {
      image_urls: ['img1.jpg', 'img2.jpg']
    });

    const res = await request(app.getHttpServer())
      .patch(`/api/update/${myProductId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        image_urls: ['img1.jpg', 'img2.jpg', 'img3.jpg'],
        image_urls_del: ['img1.jpg']
      });

    expect(res.body.code).toBe('1000');
    expect(res.body.message).toBe('OK.');
    expect(res.body.data.image_urls).toContain('img2.jpg');
    expect(res.body.data.image_urls).toContain('img3.jpg');
    expect(res.body.data.image_urls).not.toContain('img1.jpg');
  });
});
