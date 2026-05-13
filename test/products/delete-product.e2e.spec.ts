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
import { Province } from '../../src/modules/orders/entities/province.entity';
import { Ward } from '../../src/modules/orders/entities/ward.entity';
import { User } from '../../src/modules/users/entities/user.entity';
import { Not } from 'typeorm';
import { JwtService } from '@nestjs/jwt';

describe('Products - Delete Product (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let tokenUserA: string;
  let tokenUserB: string;
  let productIdA: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    dataSource = app.get<DataSource>(DataSource);

    // 1. Setup User A (Chủ sản phẩm)
    const contextPath = path.join(__dirname, '..', 'auth', 'test-context.json');
    const context = JSON.parse(fs.readFileSync(contextPath, 'utf-8'));
    const loginARes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ phone_number: context.phone_number, password: context.password });
    tokenUserA = loginARes.body.data.token;
    const userIdA = loginARes.body.data.id;

    // 2. Setup User B (Kẻ đi xóa trộm) - Lấy từ DB để không tạo rác
    const userRepo = dataSource.getRepository(User);
    let userB = await userRepo.findOne({ where: { id: Not(userIdA) } });

    if (!userB) {
      userB = await userRepo.save({
        phone_number: '0977777777',
        password: 'hashedpassword',
        role: 'soldier',
        username: 'user_b_delete',
        uuid: 'user-b-delete-uuid'
      });
    }

    const jwtService = app.get<JwtService>(JwtService);
    tokenUserB = await jwtService.signAsync({
      sub: userB.id,
      username: userB.username,
      role: userB.role,
    });

    // 3. Chuẩn bị Category & Address cho User A
    const categoryRepo = dataSource.getRepository(Category);
    const addressRepo = dataSource.getRepository(Address);
    const provinceRepo = dataSource.getRepository(Province);
    const wardRepo = dataSource.getRepository(Ward);

    let category = await categoryRepo.findOne({ where: {} });
    if (!category) category = await categoryRepo.save({ name: 'Dien tu' });
    const validCategoryId = category.id;

    let address = await addressRepo.findOne({ where: { user_id: userIdA } });
    if (!address) {
      let province = await provinceRepo.findOne({ where: {} });
      if (!province) province = await provinceRepo.save({ name: 'Ha Noi' });
      let ward = await wardRepo.findOne({ where: { provinces_id: province.id } });
      if (!ward) ward = await wardRepo.save({ name: 'Ward Test', provinces_id: province.id });

      address = await addressRepo.save({
        user_id: userIdA, ward_id: ward.id, address_name: 'Home',
        address_detail: '123 St', lat: 0, lng: 0, receiver_name: 'Test',
        phone: context.phone_number, full_address: 'Full Address'
      });
    }
    const validShipFromId = address.id;

    // 4. Tạo sản phẩm của User A
    const productRes = await request(app.getHttpServer())
      .post('/api/add_product')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({
        title: 'Sản phẩm của User A',
        price: 1000, price_discount: 900, description: 'Mô tả',
        category_id: validCategoryId, ship_from_id: validShipFromId,
        variants: [{ size: 'M', color: 'Red', stock: 10, weight: 1 }]
      });

    productIdA = productRes.body.data?.id;
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) {
      await dataSource.destroy();
    }
    await app.close();
  });

  it('TC-01: (Thất bại) - User B cố tình xóa sản phẩm của User A', async () => {
    const res = await request(app.getHttpServer())
      .delete(`/api/delete/${productIdA}`)
      .set('Authorization', `Bearer ${tokenUserB}`);

    expect(res.body.code).toBe('1009'); // NOT_ACCESS
    expect(res.body.message).toBe('Not access.');
  });

  it('TC-02: (Thất bại) - Xóa sản phẩm không tồn tại', async () => {
    const res = await request(app.getHttpServer())
      .delete('/api/delete/999999')
      .set('Authorization', `Bearer ${tokenUserA}`);

    expect(res.body.code).toBe('9992'); // PRODUCT_NOT_EXISTED
    expect(res.body.message).toBe('Product is not existed.');
  });

  it('TC-03: (Thất bại) - Không gửi Token', async () => {
    const res = await request(app.getHttpServer())
      .delete(`/api/delete/${productIdA}`);

    expect(res.body.code).toBe('9998'); // TOKEN_INVALID
  });

  it('TC-04: (Thành công) - User A xóa đúng sản phẩm của mình', async () => {
    const res = await request(app.getHttpServer())
      .delete(`/api/delete/${productIdA}`)
      .set('Authorization', `Bearer ${tokenUserA}`);

    expect(res.body.code).toBe('1000');
    expect(res.body.message).toBe('OK.');

    // Kiểm tra lại qua API lấy chi tiết sản phẩm
    const checkRes = await request(app.getHttpServer())
      .post('/api/get_products')
      .send({ id: productIdA });

    expect(checkRes.body.code).toBe('9992');
  });
  //
});