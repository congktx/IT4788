import { orderAction } from '../../helpers/actions/order.action';
import { productAction } from '../../helpers/actions/product.action';
import { getTestUsers, TestUser } from '../../helpers/test-user.helper';
import { failMsg } from '../../helpers/api-client.helper';
import { RESPONSE } from '../../constants/respones';
import { EXPIRED_TOKEN } from '../../fixtures/user.fixture';

let U1: TestUser; // buyer có orders
let U2: TestUser; // seller
let U3: TestUser; // buyer chưa có order nào (dùng làm user xa lạ để test IDOR)

let validPurchaseId: number;

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

  // U1 tạo 1 đơn hàng để lấy ID test chi tiết đơn hàng
  const orderRes = await orderAction.createOrder(U1.token, {
    address_id: addressId,
    source: 'app',
    items: [{ product_id: productId, quantity: 1 }],
  });
  validPurchaseId = orderRes.body.data.order_id;
});

// Kiểm tra kiểu dữ liệu chi tiết của đơn hàng trả về
function expectPurchaseDetailShape(data: any) {
  expect(typeof data.id).toBe('number');
  expect(typeof data.state).toBe('string');
  expect(typeof data.total_price).toBe('number');
  expect(typeof data.ship_fee).toBe('number');
  expect(typeof data.final_price).toBe('number');
  expect(typeof data.note).toBe('string');
  expect(Array.isArray(data.items)).toBe(true);
  expect(typeof data.seller).toBe('object');
  expect(typeof data.buyer).toBe('object');
}

// Thành công
describe('Thành công', () => {
  it('TC01 — Có token hợp lệ, id hợp lệ và thuộc về mình — trả về đúng chi tiết đơn hàng', async () => {
    const res = await orderAction.getPurchase(U1.token, {
      id: String(validPurchaseId),
    });

    expect(res.status, failMsg(res)).toBe(201);
    expect(res.body.code, failMsg(res)).toBe(RESPONSE.OK.code);
    expect(res.body.message, failMsg(res)).toBe(RESPONSE.OK.message);
    expect(res.body.data.id, failMsg(res)).toBe(validPurchaseId);

    expectPurchaseDetailShape(res.body.data);
  });
});

// Thất bại -> Thiếu tham số
describe('Thiếu tham số', () => {
  it('TC02 — Không có token — TOKEN_INVALID', async () => {
    const res = await orderAction.getPurchaseRaw(null, {
      id: String(validPurchaseId),
    });

    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(RESPONSE.TOKEN_INVALID.code);
    expect(res.body.message, failMsg(res)).toBe(RESPONSE.TOKEN_INVALID.message);
    expect(res.body.data, failMsg(res)).toBeNull();
  });

  it('TC03 — Có token, thiếu hoàn toàn đối tượng id trong body — PARAMETER_VALUE_INVALID', async () => {
    const res = await orderAction.getPurchaseRaw(U1.token, {});

    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(
      RESPONSE.PARAMETER_VALUE_INVALID.code,
    );
    expect(res.body.message, failMsg(res)).toBe(
      RESPONSE.PARAMETER_VALUE_INVALID.message,
    );
    expect(res.body.data, failMsg(res)).toBeNull();
  });

  it('TC04 — Có token, id là chuỗi rỗng ("") — PARAMETER_VALUE_INVALID', async () => {
    const res = await orderAction.getPurchaseRaw(U1.token, {
      id: '',
    });

    expect(res.status, failMsg(res)).toBe(200);
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
  it('TC05 — id là chuỗi không phải số ("abc") — PARAMETER_VALUE_INVALID', async () => {
    const res = await orderAction.getPurchaseRaw(U1.token, {
      id: 'abc',
    });

    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(
      RESPONSE.PARAMETER_VALUE_INVALID.code,
    );
    expect(res.body.message, failMsg(res)).toBe(
      RESPONSE.PARAMETER_VALUE_INVALID.message,
    );
    expect(res.body.data, failMsg(res)).toBeNull();
  });

  it('TC06 — id âm (-1) — PARAMETER_VALUE_INVALID', async () => {
    const res = await orderAction.getPurchaseRaw(U1.token, {
      id: '-1',
    });

    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(
      RESPONSE.PARAMETER_VALUE_INVALID.code,
    );
    expect(res.body.message, failMsg(res)).toBe(
      RESPONSE.PARAMETER_VALUE_INVALID.message,
    );
    expect(res.body.data, failMsg(res)).toBeNull();
  });

  it('TC07 — id = 0 — PARAMETER_VALUE_INVALID', async () => {
    const res = await orderAction.getPurchaseRaw(U1.token, {
      id: '0',
    });

    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(
      RESPONSE.PARAMETER_VALUE_INVALID.code,
    );
    expect(res.body.message, failMsg(res)).toBe(
      RESPONSE.PARAMETER_VALUE_INVALID.message,
    );
    expect(res.body.data, failMsg(res)).toBeNull();
  });

  it('TC08 — id là số thập phân (30.5) — PARAMETER_VALUE_INVALID', async () => {
    const res = await orderAction.getPurchaseRaw(U1.token, {
      id: '30.5',
    });

    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(
      RESPONSE.PARAMETER_VALUE_INVALID.code,
    );
    expect(res.body.message, failMsg(res)).toBe(
      RESPONSE.PARAMETER_VALUE_INVALID.message,
    );
    expect(res.body.data, failMsg(res)).toBeNull();
  });

  it('TC09 — id là số vượt quá giới hạn an toàn lưu trữ — PARAMETER_VALUE_INVALID', async () => {
    const res = await orderAction.getPurchaseRaw(U1.token, {
      id: '999999999999999999999999999',
    });

    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(
      RESPONSE.PARAMETER_VALUE_INVALID.code,
    );
    expect(res.body.message, failMsg(res)).toBe(
      RESPONSE.PARAMETER_VALUE_INVALID.message,
    );
    expect(res.body.data, failMsg(res)).toBeNull();
  });

  it('TC10 — id chỉ chứa chuỗi khoảng trắng ("   ") — PARAMETER_VALUE_INVALID', async () => {
    const res = await orderAction.getPurchaseRaw(U1.token, {
      id: '   ',
    });

    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(
      RESPONSE.PARAMETER_VALUE_INVALID.code,
    );
    expect(res.body.message, failMsg(res)).toBe(
      RESPONSE.PARAMETER_VALUE_INVALID.message,
    );
    expect(res.body.data, failMsg(res)).toBeNull();
  });

  it('TC11 — id truyền vào dạng mảng dữ liệu ([30, 31]) — PARAMETER_VALUE_INVALID', async () => {
    const res = await orderAction.getPurchaseRaw(U1.token, {
      id: [30, 31],
    });

    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(
      RESPONSE.PARAMETER_VALUE_INVALID.code,
    );
    expect(res.body.message, failMsg(res)).toBe(
      RESPONSE.PARAMETER_VALUE_INVALID.message,
    );
    expect(res.body.data, failMsg(res)).toBeNull();
  });

  it('TC12 — id hợp lệ nhưng đơn hàng không tồn tại trong DB (999999) — PARAMETER_VALUE_INVALID', async () => {
    const res = await orderAction.getPurchaseRaw(U1.token, {
      id: '999999',
    });

    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(
      RESPONSE.PARAMETER_VALUE_INVALID.code,
    );
    expect(res.body.message, failMsg(res)).toBe(
      RESPONSE.PARAMETER_VALUE_INVALID.message,
    );
    expect(res.body.data, failMsg(res)).toBeNull();
  });

  it('TC13 — Tài khoản user khác xem trộm đơn hàng sở hữu bởi U1 (Lỗi IDOR) — PARAMETER_VALUE_INVALID', async () => {
    const res = await orderAction.getPurchaseRaw(U3.token, {
      id: String(validPurchaseId),
    });

    expect(res.status, failMsg(res)).toBe(200);
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
  it('TC14 — Token sai định dạng cấu trúc — TOKEN_INVALID', async () => {
    const res = await orderAction.getPurchaseRaw('wrong.bearer.token', {
      id: String(validPurchaseId),
    });

    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(RESPONSE.TOKEN_INVALID.code);
    expect(res.body.message, failMsg(res)).toBe(RESPONSE.TOKEN_INVALID.message);
    expect(res.body.data, failMsg(res)).toBeNull();
  });

  it('TC15 — Token đã hết hạn sử dụng — TOKEN_INVALID', async () => {
    const res = await orderAction.getPurchaseRaw(EXPIRED_TOKEN, {
      id: String(validPurchaseId),
    });

    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(RESPONSE.TOKEN_INVALID.code);
    expect(res.body.message, failMsg(res)).toBe(RESPONSE.TOKEN_INVALID.message);
    expect(res.body.data, failMsg(res)).toBeNull();
  });
});
