import { orderAction } from '../../helpers/actions/order.action';
import { productAction } from '../../helpers/actions/product.action';
import { getTestUsers, TestUser } from '../../helpers/test-user.helper';
import { failMsg } from '../../helpers/api-client.helper';
import { RESPONSE } from '../../constants/respones';
import { EXPIRED_TOKEN } from '../../fixtures/user.fixture';

let U1: TestUser; // buyer có orders
let U2: TestUser; // seller
let U3: TestUser; // buyer chưa có order nào

const BASE_ADDRESS = {
  is_default: false,
  address_id: [7, 1],
  lat: 10.7769,
  lng: 106.7009,
  receiver_name: 'Nguyen Van A',
  phone: '0123456789',
  full_address: '123 Đường ABC, Quận 1',
  address_detail: 'Tầng 5',
};

const BASE_PRODUCT = {
  title: 'Sản phẩm test',
  price: 100000,
  description: 'Mô tả sản phẩm test',
  category_id: 1,
  variants: [
    {
      size: 'M',
      color: 'Đỏ',
      stock: 10,
      weight: 0.5,
    },
  ],
};

beforeAll(async () => {
  [U1, U2, U3] = getTestUsers();

  // U2 tạo địa chỉ và product
  const sellerAddressRes = await orderAction.addOrderAddress(U2.token, {
    ...BASE_ADDRESS,
    address: 'Kho hàng U2',
  });
  const shipFromId = sellerAddressRes.body.data.id;

  const productRes = await productAction.addProduct(U2.token, {
    ...BASE_PRODUCT,
    ship_from_id: shipFromId,
  });
  const productId = productRes.body.data.id;

  // U1 tạo địa chỉ nhận hàng
  const buyerAddressRes = await orderAction.addOrderAddress(U1.token, {
    ...BASE_ADDRESS,
    address: 'Nhà U1',
    is_default: true,
  });
  const addressId = buyerAddressRes.body.data.id;

  // U1 tạo 3 orders để test phân trang và filter
  await orderAction.createOrder(U1.token, {
    address_id: addressId,
    source: 'app',
    items: [{ product_id: productId, quantity: 1 }],
  });
  await orderAction.createOrder(U1.token, {
    address_id: addressId,
    source: 'app',
    items: [{ product_id: productId, quantity: 2 }],
  });
  await orderAction.createOrder(U1.token, {
    address_id: addressId,
    source: 'app',
    items: [{ product_id: productId, quantity: 3 }],
  });
});

// Kiểm tra kiểu dữ liệu của 1 item trong data
function expectItemShape(item: any) {
  expect(typeof item.id).toBe('number');
  expect(typeof item.state).toBe('string');
  expect(typeof item.total_price).toBe('number');
  expect(Array.isArray(item.items)).toBe(true);
}

// Thành công
describe('Thành công', () => {
  it('TC01 — Lấy danh sách purchases của U1 — trả về đúng data', async () => {
    const res = await orderAction.getListPurchases(U1.token, {
      index: 0,
      count: 10,
    });

    expect(res.status, failMsg(res)).toBe(201);
    expect(res.body.code, failMsg(res)).toBe(RESPONSE.OK.code);
    expect(res.body.message, failMsg(res)).toBe(RESPONSE.OK.message);
    expect(Array.isArray(res.body.data), failMsg(res)).toBe(true);
    expect(res.body.data.length, failMsg(res)).toBeGreaterThanOrEqual(3);

    expectItemShape(res.body.data[0]);
  });

  it('TC02 — Danh sách rỗng khi user chưa tạo order nào', async () => {
    const res = await orderAction.getListPurchases(U3.token, {
      index: 0,
      count: 10,
    });

    expect(res.status, failMsg(res)).toBe(201);
    expect(res.body.code, failMsg(res)).toBe(RESPONSE.OK.code);
    expect(res.body.message, failMsg(res)).toBe(RESPONSE.OK.message);
    expect(res.body.data, failMsg(res)).toEqual([]);
  });

  it('TC03 — Lọc theo state=pending — chỉ trả về order đang pending', async () => {
    const res = await orderAction.getListPurchases(U1.token, {
      index: 0,
      count: 10,
      state: 'pending',
    });

    expect(res.status, failMsg(res)).toBe(201);
    expect(res.body.code, failMsg(res)).toBe(RESPONSE.OK.code);
    expect(res.body.message, failMsg(res)).toBe(RESPONSE.OK.message);
    expect(Array.isArray(res.body.data), failMsg(res)).toBe(true);

    res.body.data.forEach((item: any) => {
      expect(item.state, failMsg(res)).toBe('pending');
    });
  });

  it('TC04 — Phân trang: index=0, count=1 — chỉ trả 1 item', async () => {
    const res = await orderAction.getListPurchases(U1.token, {
      index: 0,
      count: 1,
    });

    expect(res.status, failMsg(res)).toBe(201);
    expect(res.body.code, failMsg(res)).toBe(RESPONSE.OK.code);
    expect(res.body.message, failMsg(res)).toBe(RESPONSE.OK.message);
    expect(res.body.data.length, failMsg(res)).toBe(1);
  });

  it('TC05 — Phân trang: index=1 — bỏ qua item đầu tiên', async () => {
    const resAll = await orderAction.getListPurchases(U1.token, {
      index: 0,
      count: 10,
    });
    const totalCount = resAll.body.data.length;

    const res = await orderAction.getListPurchases(U1.token, {
      index: 1,
      count: 10,
    });

    expect(res.status, failMsg(res)).toBe(201);
    expect(res.body.code, failMsg(res)).toBe(RESPONSE.OK.code);
    expect(res.body.message, failMsg(res)).toBe(RESPONSE.OK.message);
    expect(res.body.data.length, failMsg(res)).toBe(totalCount - 1);
  });

  it('TC06 — index lớn hơn tổng số order — trả mảng rỗng', async () => {
    const res = await orderAction.getListPurchases(U1.token, {
      index: 999,
      count: 10,
    });

    expect(res.status, failMsg(res)).toBe(201);
    expect(res.body.code, failMsg(res)).toBe(RESPONSE.OK.code);
    expect(res.body.message, failMsg(res)).toBe(RESPONSE.OK.message);
    expect(res.body.data, failMsg(res)).toEqual([]);
  });
});

// Thất bại -> Thiếu tham số
describe('Thiếu tham số', () => {
  it('TC07 — Không có token — TOKEN_INVALID', async () => {
    const res = await orderAction.getListPurchasesRaw(null, {
      index: 0,
      count: 10,
    });

    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(RESPONSE.TOKEN_INVALID.code);
    expect(res.body.message, failMsg(res)).toBe(RESPONSE.TOKEN_INVALID.message);
    expect(res.body.data, failMsg(res)).toBeNull();
  });

  it('TC08 — Có token, thiếu index và count — PARAMETER_VALUE_INVALID', async () => {
    const res = await orderAction.getListPurchasesRaw(U1.token, {});

    expect(res.status, failMsg(res)).toBe(201);
    expect(res.body.code, failMsg(res)).toBe(
      RESPONSE.PARAMETER_VALUE_INVALID.code,
    );
    expect(res.body.message, failMsg(res)).toBe(
      RESPONSE.PARAMETER_VALUE_INVALID.message,
    );
    expect(res.body.data, failMsg(res)).toBeNull();
  });

  it('TC09 — Có token, thiếu index — PARAMETER_VALUE_INVALID', async () => {
    const res = await orderAction.getListPurchasesRaw(U1.token, {
      count: 10,
    });

    expect(res.status, failMsg(res)).toBe(201);
    expect(res.body.code, failMsg(res)).toBe(
      RESPONSE.PARAMETER_VALUE_INVALID.code,
    );
    expect(res.body.message, failMsg(res)).toBe(
      RESPONSE.PARAMETER_VALUE_INVALID.message,
    );
    expect(res.body.data, failMsg(res)).toBeNull();
  });

  it('TC10 — Có token, thiếu count — PARAMETER_VALUE_INVALID', async () => {
    const res = await orderAction.getListPurchasesRaw(U1.token, {
      index: 0,
    });

    expect(res.status, failMsg(res)).toBe(201);
    expect(res.body.code, failMsg(res)).toBe(
      RESPONSE.PARAMETER_VALUE_INVALID.code,
    );
    expect(res.body.message, failMsg(res)).toBe(
      RESPONSE.PARAMETER_VALUE_INVALID.message,
    );
    expect(res.body.data, failMsg(res)).toBeNull();
  });
});

// Thất bại -> Sai kiểu hoặc giá trị tham số
describe('Sai kiểu hoặc giá trị tham số', () => {
  it('TC11 — index âm (-1) — PARAMETER_VALUE_INVALID', async () => {
    const res = await orderAction.getListPurchasesRaw(U1.token, {
      index: -1,
      count: 10,
    });

    expect(res.status, failMsg(res)).toBe(201);
    expect(res.body.code, failMsg(res)).toBe(
      RESPONSE.PARAMETER_VALUE_INVALID.code,
    );
    expect(res.body.message, failMsg(res)).toBe(
      RESPONSE.PARAMETER_VALUE_INVALID.message,
    );
    expect(res.body.data, failMsg(res)).toBeNull();
  });

  it('TC12 — count = 0 — PARAMETER_VALUE_INVALID', async () => {
    const res = await orderAction.getListPurchasesRaw(U1.token, {
      index: 0,
      count: 0,
    });

    expect(res.status, failMsg(res)).toBe(201);
    expect(res.body.code, failMsg(res)).toBe(
      RESPONSE.PARAMETER_VALUE_INVALID.code,
    );
    expect(res.body.message, failMsg(res)).toBe(
      RESPONSE.PARAMETER_VALUE_INVALID.message,
    );
    expect(res.body.data, failMsg(res)).toBeNull();
  });

  it('TC13 — index là chuỗi không phải số ("abc") — PARAMETER_VALUE_INVALID', async () => {
    const res = await orderAction.getListPurchasesRaw(U1.token, {
      index: 'abc',
      count: 10,
    });

    expect(res.status, failMsg(res)).toBe(201);
    expect(res.body.code, failMsg(res)).toBe(
      RESPONSE.PARAMETER_VALUE_INVALID.code,
    );
    expect(res.body.message, failMsg(res)).toBe(
      RESPONSE.PARAMETER_VALUE_INVALID.message,
    );
    expect(res.body.data, failMsg(res)).toBeNull();
  });

  it('TC14 — count là chuỗi không phải số ("abc") — PARAMETER_VALUE_INVALID', async () => {
    const res = await orderAction.getListPurchasesRaw(U1.token, {
      index: 0,
      count: 'abc',
    });

    expect(res.status, failMsg(res)).toBe(201);
    expect(res.body.code, failMsg(res)).toBe(
      RESPONSE.PARAMETER_VALUE_INVALID.code,
    );
    expect(res.body.message, failMsg(res)).toBe(
      RESPONSE.PARAMETER_VALUE_INVALID.message,
    );
    expect(res.body.data, failMsg(res)).toBeNull();
  });
});

// Thất bại -> Token không hợp lệ
describe('Token không hợp lệ', () => {
  it('TC15 — Token sai định dạng — TOKEN_INVALID', async () => {
    const res = await orderAction.getListPurchasesRaw('invalid.token.here', {
      index: 0,
      count: 10,
    });

    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(RESPONSE.TOKEN_INVALID.code);
    expect(res.body.message, failMsg(res)).toBe(RESPONSE.TOKEN_INVALID.message);
    expect(res.body.data, failMsg(res)).toBeNull();
  });

  it('TC16 — Token hết hạn — TOKEN_INVALID', async () => {
    const res = await orderAction.getListPurchasesRaw(EXPIRED_TOKEN, {
      index: 0,
      count: 10,
    });

    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(RESPONSE.TOKEN_INVALID.code);
    expect(res.body.message, failMsg(res)).toBe(RESPONSE.TOKEN_INVALID.message);
    expect(res.body.data, failMsg(res)).toBeNull();
  });
});
