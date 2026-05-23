import { orderAction } from '../../helpers/actions/order.action';
import { productAction } from '../../helpers/actions/product.action';
import { walletAction } from '../../helpers/actions/wallet.action';
import { getTestUsers, TestUser } from '../../helpers/test-user.helper';
import { failMsg } from '../../helpers/api-client.helper';
import { RESPONSE } from '../../constants/respones';
import { EXPIRED_TOKEN } from '../../fixtures/user.fixture';

let U1: TestUser;
let U2: TestUser;
let U3: TestUser;

let orderDeliveredId: number;
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
  orderDeliveredId = orderRes1.body.data.order_id || orderRes1.body.data.id;
  buyerIdStr = orderRes1.body.data.buyer_id || '21';

  await orderAction.setAcceptBuyer(U2.token, {
    purchase_id: String(orderDeliveredId),
    buyer_id: String(buyerIdStr),
    is_accept: 1,
  });

  await orderAction.sellerMarkAsShipped(U2.token, {
    purchase_id: String(orderDeliveredId),
    buyer_id: String(buyerIdStr),
  });

  await orderAction.buyerConfirmReceived(U1.token, {
    purchase_id: String(orderDeliveredId),
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
  it('TC01 — Có token Buyer hợp lệ, đơn hàng đang ở trạng thái DELIVERED — gửi yêu cầu hoàn tiền thành công và phải được cộng tiền vào ví', async () => {
    const balanceBeforeRes = await walletAction.getCurrentBalance(U1.token);
    const balanceBefore = Number(balanceBeforeRes.body.data?.balance || 0);

    const res = await orderAction.refundOrder(U1.token, {
      purchase_id: String(orderDeliveredId),
      reason: 'Sản phẩm bị lỗi vỡ màn hình',
    });

    expect(res.status, failMsg(res)).toBe(201);
    expect(res.body.code, failMsg(res)).toBe(RESPONSE.OK.code);
    expect(res.body.message, failMsg(res)).toBe(RESPONSE.OK.message);

    const balanceAfterRes = await walletAction.getCurrentBalance(U1.token);
    const balanceAfter = Number(balanceAfterRes.body.data?.balance || 0);

    expect(
      balanceAfter,
      `Bug nuốt tiền: Số dư ví không tăng sau khi hoàn tiền! Trước: ${balanceBefore}, Sau: ${balanceAfter}`,
    ).toBeGreaterThan(balanceBefore);
  });
});

// Thất bại -> Thiếu tham số
describe('Thiếu tham số', () => {
  it('TC02 — Không có token — TOKEN_INVALID', async () => {
    const res = await orderAction.refundOrderRaw(null, {
      purchase_id: String(orderDeliveredId),
    });

    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(RESPONSE.TOKEN_INVALID.code);
    expect(res.body.data, failMsg(res)).toBeNull();
  });

  it('TC03 — Có token, thiếu hoàn toàn purchase_id trong body — PARAMETER_VALUE_INVALID', async () => {
    const res = await orderAction.refundOrderRaw(U1.token, {
      reason: 'Thiếu mất id đơn hàng',
    });

    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(
      RESPONSE.PARAMETER_VALUE_INVALID.code,
    );
    expect(res.body.data, failMsg(res)).toBeNull();
  });

  it('TC04 — Có token, purchase_id là chuỗi rỗng ("") — PARAMETER_VALUE_INVALID', async () => {
    const res = await orderAction.refundOrderRaw(U1.token, {
      purchase_id: '',
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
    const res = await orderAction.refundOrderRaw(U1.token, {
      purchase_id: 'abc',
    });

    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(
      RESPONSE.PARAMETER_VALUE_INVALID.code,
    );
    expect(res.body.data, failMsg(res)).toBeNull();
  });

  it('TC06 — purchase_id mang giá trị âm (-1) — PARAMETER_VALUE_INVALID', async () => {
    const res = await orderAction.refundOrderRaw(U1.token, {
      purchase_id: '-1',
    });

    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(
      RESPONSE.PARAMETER_VALUE_INVALID.code,
    );
  });

  it('TC07 — purchase_id = 0 — PARAMETER_VALUE_INVALID', async () => {
    const res = await orderAction.refundOrderRaw(U1.token, {
      purchase_id: '0',
    });

    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(
      RESPONSE.PARAMETER_VALUE_INVALID.code,
    );
  });

  it('TC08 — purchase_id là số thập phân (33.5) — PARAMETER_VALUE_INVALID', async () => {
    const res = await orderAction.refundOrderRaw(U1.token, {
      purchase_id: '33.5',
    });

    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(
      RESPONSE.PARAMETER_VALUE_INVALID.code,
    );
  });

  it('TC09 — purchase_id là số vượt quá giới hạn an toàn lưu trữ — PARAMETER_VALUE_INVALID', async () => {
    const res = await orderAction.refundOrderRaw(U1.token, {
      purchase_id: '999999999999999999999999999',
    });

    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(
      RESPONSE.PARAMETER_VALUE_INVALID.code,
    );
  });

  it('TC10 — purchase_id chỉ chứa chuỗi khoảng trắng ("   ") — PARAMETER_VALUE_INVALID', async () => {
    const res = await orderAction.refundOrderRaw(U1.token, {
      purchase_id: '   ',
    });

    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(
      RESPONSE.PARAMETER_VALUE_INVALID.code,
    );
  });

  it('TC11 — purchase_id truyền vào dạng mảng dữ liệu ([33, 34]) — PARAMETER_VALUE_INVALID', async () => {
    const res = await orderAction.refundOrderRaw(U1.token, {
      purchase_id: [orderDeliveredId, 999],
    });

    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(
      RESPONSE.PARAMETER_VALUE_INVALID.code,
    );
  });

  it('TC12 — purchase_id hợp lệ nhưng đơn hàng không tồn tại trong DB (999999) — PARAMETER_VALUE_INVALID', async () => {
    const res = await orderAction.refundOrderRaw(U1.token, {
      purchase_id: '999999',
    });

    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(
      RESPONSE.PARAMETER_VALUE_INVALID.code,
    );
  });

  it('TC13 — Đơn hàng không ở trạng thái DELIVERED (đang PENDING), cố tình yêu cầu hoàn tiền — ACTION_DONE_PREVIOUSLY', async () => {
    const res = await orderAction.refundOrderRaw(U1.token, {
      purchase_id: String(orderPendingId),
    });

    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(
      RESPONSE.ACTION_DONE_PREVIOUSLY.code,
    );
  });

  it('TC14 — Tài khoản user khác thực hiện yêu cầu hoàn tiền trộm (Lỗi IDOR) — PARAMETER_VALUE_INVALID', async () => {
    const res = await orderAction.refundOrderRaw(U3.token, {
      purchase_id: String(orderDeliveredId),
    });

    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(
      RESPONSE.PARAMETER_VALUE_INVALID.code,
    );
  });
});

// Token không hợp lệ
describe('Token không hợp lệ', () => {
  it('TC15 — Token sai định dạng cấu trúc — TOKEN_INVALID', async () => {
    const res = await orderAction.refundOrderRaw('wrong.bearer.token', {
      purchase_id: String(orderDeliveredId),
    });

    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(RESPONSE.TOKEN_INVALID.code);
    expect(res.body.data, failMsg(res)).toBeNull();
  });

  it('TC16 — Token đã hết hạn sử dụng — TOKEN_INVALID', async () => {
    const res = await orderAction.refundOrderRaw(EXPIRED_TOKEN, {
      purchase_id: String(orderDeliveredId),
    });

    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(RESPONSE.TOKEN_INVALID.code);
    expect(res.body.data, failMsg(res)).toBeNull();
  });
});
