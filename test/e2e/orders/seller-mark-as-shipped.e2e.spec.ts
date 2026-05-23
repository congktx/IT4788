import { orderAction } from '../../helpers/actions/order.action';
import { productAction } from '../../helpers/actions/product.action';
import { getTestUsers, TestUser } from '../../helpers/test-user.helper';
import { failMsg } from '../../helpers/api-client.helper';
import { RESPONSE } from '../../constants/respones';
import { EXPIRED_TOKEN } from '../../fixtures/user.fixture';

let U1: TestUser;
let U2: TestUser;
let U3: TestUser;

let orderConfirmedId: number;
let orderPendingId: number;
let buyerIdStr: string;

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
  orderConfirmedId = orderRes1.body.data.order_id || orderRes1.body.data.id;
  buyerIdStr = orderRes1.body.data.buyer_id || '21';

  await orderAction.setAcceptBuyer(U2.token, {
    purchase_id: String(orderConfirmedId),
    buyer_id: String(buyerIdStr),
    is_accept: 1,
  });

  const orderRes2 = await orderAction.createOrder(U1.token, {
    address_id: addressId,
    source: 'app',
    items: [{ product_id: productId, quantity: 1 }],
  });
  orderPendingId = orderRes2.body.data.order_id || orderRes2.body.data.id;
});

// Thành công
describe('Thành công', () => {
  it('TC01 — Có token Seller hợp lệ, đơn hàng đang ở trạng thái CONFIRMED — chuyển trạng thái sang SHIPPING thành công', async () => {
    const res = await orderAction.sellerMarkAsShipped(U2.token, {
      purchase_id: String(orderConfirmedId),
      buyer_id: buyerIdStr,
    });

    expect(res.status, failMsg(res)).toBe(201);
    expect(res.body.code, failMsg(res)).toBe(RESPONSE.OK.code);
    expect(res.body.message, failMsg(res)).toBe(RESPONSE.OK.message);
  });
});

// Thất bại -> Thiếu tham số
describe('Thiếu tham số', () => {
  it('TC02 — Không có token — TOKEN_INVALID', async () => {
    const res = await orderAction.sellerMarkAsShippedRaw(null, {
      purchase_id: String(orderConfirmedId),
      buyer_id: buyerIdStr,
    });

    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(RESPONSE.TOKEN_INVALID.code);
    expect(res.body.data, failMsg(res)).toBeNull();
  });

  it('TC03 — Có token, thiếu hoàn toàn purchase_id trong body — PARAMETER_VALUE_INVALID', async () => {
    const res = await orderAction.sellerMarkAsShippedRaw(U2.token, {
      buyer_id: buyerIdStr,
    });

    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(
      RESPONSE.PARAMETER_VALUE_INVALID.code,
    );
    expect(res.body.data, failMsg(res)).toBeNull();
  });

  it('TC04 — Có token, thiếu hoàn toàn buyer_id trong body — PARAMETER_VALUE_INVALID', async () => {
    const res = await orderAction.sellerMarkAsShippedRaw(U2.token, {
      purchase_id: String(orderConfirmedId),
    });

    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(
      RESPONSE.PARAMETER_VALUE_INVALID.code,
    );
    expect(res.body.data, failMsg(res)).toBeNull();
  });
});

// Thất bại -> Sai kiểu hoặc giá trị tham số
describe('Sai kiểu hoặc giá trị tham số', () => {
  it('TC05 — purchase_id là chuỗi không phải số ("abc") — PARAMETER_VALUE_INVALID', async () => {
    const res = await orderAction.sellerMarkAsShippedRaw(U2.token, {
      purchase_id: 'abc',
      buyer_id: buyerIdStr,
    });

    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(
      RESPONSE.PARAMETER_VALUE_INVALID.code,
    );
  });

  it('TC06 — buyer_id là chuỗi không phải số ("abc") — PARAMETER_VALUE_INVALID', async () => {
    const res = await orderAction.sellerMarkAsShippedRaw(U2.token, {
      purchase_id: String(orderConfirmedId),
      buyer_id: 'abc',
    });

    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(
      RESPONSE.PARAMETER_VALUE_INVALID.code,
    );
  });

  it('TC07 — purchase_id mang giá trị âm (-1) — PARAMETER_VALUE_INVALID', async () => {
    const res = await orderAction.sellerMarkAsShippedRaw(U2.token, {
      purchase_id: '-1',
      buyer_id: buyerIdStr,
    });

    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(
      RESPONSE.PARAMETER_VALUE_INVALID.code,
    );
  });

  it('TC08 — buyer_id mang giá trị âm (-1) — PARAMETER_VALUE_INVALID', async () => {
    const res = await orderAction.sellerMarkAsShippedRaw(U2.token, {
      purchase_id: String(orderConfirmedId),
      buyer_id: '-1',
    });

    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(
      RESPONSE.PARAMETER_VALUE_INVALID.code,
    );
  });

  it('TC09 — purchase_id là số thập phân (33.5) — PARAMETER_VALUE_INVALID', async () => {
    const res = await orderAction.sellerMarkAsShippedRaw(U2.token, {
      purchase_id: '33.5',
      buyer_id: buyerIdStr,
    });

    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(
      RESPONSE.PARAMETER_VALUE_INVALID.code,
    );
  });

  it('TC10 — purchase_id là số vượt quá giới hạn an toàn lưu trữ — PARAMETER_VALUE_INVALID', async () => {
    const res = await orderAction.sellerMarkAsShippedRaw(U2.token, {
      purchase_id: '999999999999999999999999999',
      buyer_id: buyerIdStr,
    });

    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(
      RESPONSE.PARAMETER_VALUE_INVALID.code,
    );
  });

  it('TC11 — purchase_id chỉ chứa chuỗi khoảng trắng ("   ") — PARAMETER_VALUE_INVALID', async () => {
    const res = await orderAction.sellerMarkAsShippedRaw(U2.token, {
      purchase_id: '   ',
      buyer_id: buyerIdStr,
    });

    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(
      RESPONSE.PARAMETER_VALUE_INVALID.code,
    );
  });

  it('TC12 — purchase_id truyền vào dạng mảng dữ liệu ([33, 34]) — PARAMETER_VALUE_INVALID', async () => {
    const res = await orderAction.sellerMarkAsShippedRaw(U2.token, {
      purchase_id: [orderConfirmedId, 999],
      buyer_id: buyerIdStr,
    });

    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(
      RESPONSE.PARAMETER_VALUE_INVALID.code,
    );
  });

  it('TC13 — buyer_id hợp lệ nhưng người dùng không tồn tại (999999) — USER_NOT_EXIST', async () => {
    const res = await orderAction.sellerMarkAsShippedRaw(U2.token, {
      purchase_id: String(orderConfirmedId),
      buyer_id: '999999',
    });

    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(RESPONSE.USER_NOT_EXIST.code);
  });

  it('TC14 — Đơn hàng không ở trạng thái CONFIRMED (đang PENDING), cố tình báo đã giao — ACTION_DONE_PREVIOUSLY', async () => {
    const res = await orderAction.sellerMarkAsShippedRaw(U2.token, {
      purchase_id: String(orderPendingId),
      buyer_id: buyerIdStr,
    });

    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(
      RESPONSE.ACTION_DONE_PREVIOUSLY.code,
    );
  });

  it('TC15 — Tài khoản user không phải seller của đơn hàng thực hiện cập nhật (Lỗi IDOR) — PARAMETER_VALUE_INVALID', async () => {
    const res = await orderAction.sellerMarkAsShippedRaw(U3.token, {
      purchase_id: String(orderConfirmedId),
      buyer_id: buyerIdStr,
    });

    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(
      RESPONSE.PARAMETER_VALUE_INVALID.code,
    );
  });
});

// Token không hợp lệ
describe('Token không hợp lệ', () => {
  it('TC16 — Token sai định dạng cấu trúc — TOKEN_INVALID', async () => {
    const res = await orderAction.sellerMarkAsShippedRaw('wrong.bearer.token', {
      purchase_id: String(orderConfirmedId),
      buyer_id: buyerIdStr,
    });

    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(RESPONSE.TOKEN_INVALID.code);
    expect(res.body.data, failMsg(res)).toBeNull();
  });

  it('TC17 — Token đã hết hạn sử dụng — TOKEN_INVALID', async () => {
    const res = await orderAction.sellerMarkAsShippedRaw(EXPIRED_TOKEN, {
      purchase_id: String(orderConfirmedId),
      buyer_id: buyerIdStr,
    });

    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(RESPONSE.TOKEN_INVALID.code);
    expect(res.body.data, failMsg(res)).toBeNull();
  });
});
