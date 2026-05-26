import { orderAction } from '../../helpers/actions/order.action';
import { productAction } from '../../helpers/actions/product.action';
import { getTestUsers, TestUser } from '../../helpers/test-user.helper';
import { failMsg } from '../../helpers/api-client.helper';
import { RESPONSE } from '../../constants/respones';
import { EXPIRED_TOKEN } from '../../fixtures/user.fixture';

let U1: TestUser; // buyer
let U2: TestUser; // seller
let U3: TestUser; // buyer khác

let orderId1: number;
let orderId2: number;
let orderIdProcessed: number;
let buyerIdStr: string; // Biến lưu buyer_id

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

  const buyerAddressRes = await orderAction.addOrderAddress(U1.token, {
    ...BASE_ADDRESS,
    address: 'Nhà U1',
    is_default: true,
  });
  const addressId = buyerAddressRes.body.data.id;

  const orderRes1 = await orderAction.createOrder(U1.token, {
    address_id: addressId,
    source: 'app',
    items: [{ product_id: productId, quantity: 1 }],
  });
  orderId1 = orderRes1.body.data.order_id || orderRes1.body.data.id;

  const orderRes2 = await orderAction.createOrder(U1.token, {
    address_id: addressId,
    source: 'app',
    items: [{ product_id: productId, quantity: 1 }],
  });
  orderId2 = orderRes2.body.data.order_id || orderRes2.body.data.id;

  const orderRes3 = await orderAction.createOrder(U1.token, {
    address_id: addressId,
    source: 'app',
    items: [{ product_id: productId, quantity: 1 }],
  });
  orderIdProcessed = orderRes3.body.data.order_id || orderRes3.body.data.id;

  buyerIdStr = String(U1.userId);

  await orderAction.setAcceptBuyer(U2.token, {
    purchase_id: String(orderIdProcessed),
    buyer_id: buyerIdStr,
    is_accept: 1,
  });
});

// Thành công
describe('Thành công', () => {
  it('TC01 — Có token Seller hợp lệ, chấp nhận đơn hàng pending — trả về đúng mã OK', async () => {
    const res = await orderAction.setAcceptBuyer(U2.token, {
      purchase_id: String(orderId1),
      buyer_id: buyerIdStr,
      is_accept: 1,
    });

    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(RESPONSE.OK.code);
    expect(res.body.message, failMsg(res)).toBe(RESPONSE.OK.message);
  });

  it('TC02 — Có token Seller hợp lệ, từ chối đơn hàng pending — trả về đúng mã OK', async () => {
    const res = await orderAction.setAcceptBuyer(U2.token, {
      purchase_id: String(orderId2),
      buyer_id: buyerIdStr,
      is_accept: 0,
    });

    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(RESPONSE.OK.code);
    expect(res.body.message, failMsg(res)).toBe(RESPONSE.OK.message);
  });
});

// Thất bại -> Thiếu tham số
describe('Thiếu tham số', () => {
  it('TC03 — Không có token — TOKEN_INVALID', async () => {
    const res = await orderAction.setAcceptBuyerRaw(null, {
      purchase_id: String(orderId1),
      buyer_id: buyerIdStr,
      is_accept: 1,
    });

    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(RESPONSE.TOKEN_INVALID.code);
    expect(res.body.data, failMsg(res)).toBeNull();
  });

  it('TC04 — Có token, thiếu hoàn toàn purchase_id trong body — PARAMETER_VALUE_INVALID', async () => {
    const res = await orderAction.setAcceptBuyerRaw(U2.token, {
      buyer_id: buyerIdStr,
      is_accept: 1,
    });

    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(
      RESPONSE.PARAMETER_VALUE_INVALID.code,
    );
    expect(res.body.data, failMsg(res)).toBeNull();
  });

  it('TC05 — Có token, thiếu hoàn toàn buyer_id trong body — PARAMETER_VALUE_INVALID', async () => {
    const res = await orderAction.setAcceptBuyerRaw(U2.token, {
      purchase_id: String(orderId1),
      is_accept: 1,
    });

    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(
      RESPONSE.PARAMETER_VALUE_INVALID.code,
    );
  });

  it('TC06 — Có token, thiếu hoàn toàn is_accept trong body — PARAMETER_VALUE_INVALID', async () => {
    const res = await orderAction.setAcceptBuyerRaw(U2.token, {
      purchase_id: String(orderId1),
      buyer_id: buyerIdStr,
    });

    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(
      RESPONSE.PARAMETER_VALUE_INVALID.code,
    );
  });
});

// Thất bại -> Sai kiểu hoặc giá trị tham số
describe('Sai kiểu hoặc giá trị tham số', () => {
  it('TC07 — purchase_id là chuỗi không phải số ("abc") — PARAMETER_VALUE_INVALID', async () => {
    const res = await orderAction.setAcceptBuyerRaw(U2.token, {
      purchase_id: 'abc',
      buyer_id: buyerIdStr,
      is_accept: 1,
    });

    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(
      RESPONSE.PARAMETER_VALUE_INVALID.code,
    );
  });

  it('TC08 — buyer_id là chuỗi không phải số ("abc") — PARAMETER_VALUE_INVALID', async () => {
    const res = await orderAction.setAcceptBuyerRaw(U2.token, {
      purchase_id: String(orderId1),
      buyer_id: 'abc',
      is_accept: 1,
    });

    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(
      RESPONSE.PARAMETER_VALUE_INVALID.code,
    );
  });

  it('TC09 — purchase_id mang giá trị âm (-1) — PARAMETER_VALUE_INVALID', async () => {
    const res = await orderAction.setAcceptBuyerRaw(U2.token, {
      purchase_id: '-1',
      buyer_id: buyerIdStr,
      is_accept: 1,
    });

    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(
      RESPONSE.PARAMETER_VALUE_INVALID.code,
    );
  });

  it('TC10 — buyer_id mang giá trị âm (-1) — PARAMETER_VALUE_INVALID', async () => {
    const res = await orderAction.setAcceptBuyerRaw(U2.token, {
      purchase_id: String(orderId1),
      buyer_id: '-1',
      is_accept: 1,
    });

    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(
      RESPONSE.PARAMETER_VALUE_INVALID.code,
    );
  });

  it('TC11 — is_accept mang giá trị sai quy định (số 2) — PARAMETER_VALUE_INVALID', async () => {
    const res = await orderAction.setAcceptBuyerRaw(U2.token, {
      purchase_id: String(orderId1),
      buyer_id: buyerIdStr,
      is_accept: 2,
    });

    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(
      RESPONSE.PARAMETER_VALUE_INVALID.code,
    );
  });

  it('TC12 — buyer_id hợp lệ nhưng người dùng không tồn tại (999999) — USER_NOT_EXIST', async () => {
    const res = await orderAction.setAcceptBuyerRaw(U2.token, {
      purchase_id: String(orderId1),
      buyer_id: '999999',
      is_accept: 1,
    });

    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(RESPONSE.USER_NOT_EXIST.code);
  });

  it('TC13 — Đơn hàng đã được duyệt trước đó, cố tình gọi lại lần nữa — ACTION_DONE_PREVIOUSLY', async () => {
    const res = await orderAction.setAcceptBuyerRaw(U2.token, {
      purchase_id: String(orderIdProcessed),
      buyer_id: buyerIdStr,
      is_accept: 1,
    });

    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(
      RESPONSE.ACTION_DONE_PREVIOUSLY.code,
    );
  });

  it('TC14 — Tài khoản user không phải seller của đơn hàng thực hiện duyệt đơn (Lỗi IDOR) — PARAMETER_VALUE_INVALID', async () => {
    const res = await orderAction.setAcceptBuyerRaw(U3.token, {
      purchase_id: String(orderId1),
      buyer_id: buyerIdStr,
      is_accept: 1,
    });

    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(
      RESPONSE.PARAMETER_VALUE_INVALID.code,
    );
  });
});

// Thất bại -> Token không hợp lệ
describe('Token không hợp lệ', () => {
  it('TC15 — Token sai định dạng cấu trúc — TOKEN_INVALID', async () => {
    const res = await orderAction.setAcceptBuyerRaw('wrong.bearer.token', {
      purchase_id: String(orderId1),
      buyer_id: buyerIdStr,
      is_accept: 1,
    });

    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(RESPONSE.TOKEN_INVALID.code);
    expect(res.body.data, failMsg(res)).toBeNull();
  });

  it('TC16 — Token đã hết hạn sử dụng — TOKEN_INVALID', async () => {
    const res = await orderAction.setAcceptBuyerRaw(EXPIRED_TOKEN, {
      purchase_id: String(orderId1),
      buyer_id: buyerIdStr,
      is_accept: 1,
    });

    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(RESPONSE.TOKEN_INVALID.code);
    expect(res.body.data, failMsg(res)).toBeNull();
  });
});
