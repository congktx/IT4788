import { orderAction } from '../../helpers/actions/order.action';
import { productAction } from '../../helpers/actions/product.action';
import { getTestUsers, TestUser } from '../../helpers/test-user.helper';
import { failMsg } from '../../helpers/api-client.helper';
import { RESPONSE } from '../../constants/respones';
import { EXPIRED_TOKEN } from '../../fixtures/user.fixture';

let U1: TestUser; // buyer có orders
let U2: TestUser; // seller
let U3: TestUser; // buyer khác (dùng để test lấy trộm address_id hoặc xem trộm đơn)

let validOrderId: number;
let secondAddressId: number;
let strangerAddressId: number;

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

  // U1 tạo địa chỉ nhận hàng thứ nhất
  const buyerAddressRes = await orderAction.addOrderAddress(U1.token, {
    ...BASE_ADDRESS,
    address: 'Nhà chính U1',
    is_default: true,
  });
  const addressId = buyerAddressRes.body.data.id;

  // U1 tạo địa chỉ nhận hàng thứ hai để dùng cho việc edit_purchase
  const secondAddressRes = await orderAction.addOrderAddress(U1.token, {
    ...BASE_ADDRESS,
    address: 'Văn phòng U1',
    is_default: false,
  });
  secondAddressId = secondAddressRes.body.data.id;

  // U3 tạo địa chỉ nhận hàng (dùng để test bảo mật IDOR địa chỉ)
  const strangerAddressRes = await orderAction.addOrderAddress(U3.token, {
    ...BASE_ADDRESS,
    address: 'Nhà người lạ U3',
    is_default: true,
  });
  strangerAddressId = strangerAddressRes.body.data.id;

  // U1 tạo đơn hàng mẫu ở trạng thái mặc định (pending)
  const orderRes = await orderAction.createOrder(U1.token, {
    address_id: addressId,
    source: 'app',
    items: [{ product_id: productId, quantity: 1 }],
  });

  // Lưu ý sửa lỗi ông nói gà bà nói vịt từ endpoint trước: lấy đúng .order_id
  validOrderId = orderRes.body.data.order_id || orderRes.body.data.id;
});

// Thành công
describe('Thành công', () => {
  it('TC01 — Có token hợp lệ, chỉnh sửa note đơn hàng hợp lệ — trả về đúng data cập nhật', async () => {
    const res = await orderAction.editPurchase(U1.token, {
      id: String(validOrderId),
      note: 'Giao hàng giờ hành chính',
    });

    expect(res.status, failMsg(res)).toBe(201);
    expect(res.body.code, failMsg(res)).toBe(RESPONSE.OK.code);
    expect(res.body.message, failMsg(res)).toBe(RESPONSE.OK.message);
    expect(res.body.data.id, failMsg(res)).toBe(validOrderId);
    expect(res.body.data.note, failMsg(res)).toBe('Giao hàng giờ hành chính');
  });

  it('TC02 — Có token hợp lệ, thay đổi địa chỉ nhận hàng hợp lệ — trả về đúng địa chỉ mới', async () => {
    const res = await orderAction.editPurchase(U1.token, {
      id: String(validOrderId),
      address_id: String(secondAddressId),
    });

    expect(res.status, failMsg(res)).toBe(201);
    expect(res.body.code, failMsg(res)).toBe(RESPONSE.OK.code);
    expect(res.body.message, failMsg(res)).toBe(RESPONSE.OK.message);
    expect(res.body.data.address_id, failMsg(res)).toBe(secondAddressId);
  });
});

// Thất bại -> Thiếu tham số
describe('Thiếu tham số', () => {
  it('TC03 — Không có token — TOKEN_INVALID', async () => {
    const res = await orderAction.editPurchaseRaw(null, {
      id: String(validOrderId),
      note: 'Test no token',
    });

    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(RESPONSE.TOKEN_INVALID.code);
    expect(res.body.message, failMsg(res)).toBe(RESPONSE.TOKEN_INVALID.message);
    expect(res.body.data, failMsg(res)).toBeNull();
  });

  it('TC04 — Có token, thiếu hoàn toàn đối tượng id trong body — PARAMETER_VALUE_INVALID', async () => {
    const res = await orderAction.editPurchaseRaw(U1.token, {
      note: 'Thiếu tham số id',
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

  it('TC05 — Có token, id là chuỗi rỗng ("") — PARAMETER_VALUE_INVALID', async () => {
    const res = await orderAction.editPurchaseRaw(U1.token, {
      id: '',
      note: 'Id chuỗi rỗng',
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
  it('TC06 — id là chuỗi không phải số ("abc") — PARAMETER_VALUE_INVALID', async () => {
    const res = await orderAction.editPurchaseRaw(U1.token, {
      id: 'abc',
      note: 'Id chữ abc',
    });

    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(
      RESPONSE.PARAMETER_VALUE_INVALID.code,
    );
    expect(res.body.data, failMsg(res)).toBeNull();
  });

  it('TC07 — id âm (-1) — PARAMETER_VALUE_INVALID', async () => {
    const res = await orderAction.editPurchaseRaw(U1.token, {
      id: '-1',
    });

    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(
      RESPONSE.PARAMETER_VALUE_INVALID.code,
    );
    expect(res.body.data, failMsg(res)).toBeNull();
  });

  it('TC08 — id = 0 — PARAMETER_VALUE_INVALID', async () => {
    const res = await orderAction.editPurchaseRaw(U1.token, {
      id: '0',
    });

    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(
      RESPONSE.PARAMETER_VALUE_INVALID.code,
    );
    expect(res.body.data, failMsg(res)).toBeNull();
  });

  it('TC09 — id là số thập phân (33.5) — PARAMETER_VALUE_INVALID', async () => {
    const res = await orderAction.editPurchaseRaw(U1.token, {
      id: '33.5',
    });

    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(
      RESPONSE.PARAMETER_VALUE_INVALID.code,
    );
    expect(res.body.data, failMsg(res)).toBeNull();
  });

  it('TC10 — id là số vượt quá giới hạn an toàn lưu trữ — PARAMETER_VALUE_INVALID', async () => {
    const res = await orderAction.editPurchaseRaw(U1.token, {
      id: '999999999999999999999999999',
    });

    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(
      RESPONSE.PARAMETER_VALUE_INVALID.code,
    );
  });

  it('TC11 — id chỉ chứa chuỗi khoảng trắng ("   ") — PARAMETER_VALUE_INVALID', async () => {
    const res = await orderAction.editPurchaseRaw(U1.token, {
      id: '   ',
    });

    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(
      RESPONSE.PARAMETER_VALUE_INVALID.code,
    );
  });

  it('TC12 — id truyền vào dạng mảng dữ liệu ([33, 34]) — PARAMETER_VALUE_INVALID', async () => {
    const res = await orderAction.editPurchaseRaw(U1.token, {
      id: [validOrderId, 999],
    });

    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(
      RESPONSE.PARAMETER_VALUE_INVALID.code,
    );
  });

  it('TC13 — address_id là chuỗi không phải số ("abc") — PARAMETER_VALUE_INVALID', async () => {
    const res = await orderAction.editPurchaseRaw(U1.token, {
      id: String(validOrderId),
      address_id: 'abc',
    });

    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(
      RESPONSE.PARAMETER_VALUE_INVALID.code,
    );
  });

  it('TC14 — address_id mang giá trị âm (-1) — PARAMETER_VALUE_INVALID', async () => {
    const res = await orderAction.editPurchaseRaw(U1.token, {
      id: String(validOrderId),
      address_id: '-1',
    });

    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(
      RESPONSE.PARAMETER_VALUE_INVALID.code,
    );
  });

  it('TC15 — id đúng định dạng nhưng đơn hàng không tồn tại (999999) — PARAMETER_VALUE_INVALID', async () => {
    const res = await orderAction.editPurchaseRaw(U1.token, {
      id: '999999',
      note: 'Đơn hàng ảo',
    });

    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(
      RESPONSE.PARAMETER_VALUE_INVALID.code,
    );
  });

  it('TC16 — Tài khoản user khác chỉnh sửa trộm đơn hàng của U1 (Lỗi IDOR) — PARAMETER_VALUE_INVALID', async () => {
    const res = await orderAction.editPurchaseRaw(U3.token, {
      id: String(validOrderId),
      note: 'Hacker sửa note',
    });

    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(
      RESPONSE.PARAMETER_VALUE_INVALID.code,
    );
  });

  it('TC17 — Sử dụng address_id thuộc quyền sở hữu của người khác (Lỗi IDOR địa chỉ) — PARAMETER_VALUE_INVALID', async () => {
    const res = await orderAction.editPurchaseRaw(U1.token, {
      id: String(validOrderId),
      address_id: String(strangerAddressId), // Gửi địa chỉ của U3
    });

    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(
      RESPONSE.PARAMETER_VALUE_INVALID.code,
    );
  });
});

// Thất bại -> Token không hợp lệ
describe('Token không hợp lệ', () => {
  it('TC18 — Token sai định dạng cấu trúc — TOKEN_INVALID', async () => {
    const res = await orderAction.editPurchaseRaw('wrong.bearer.token', {
      id: String(validOrderId),
    });

    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(RESPONSE.TOKEN_INVALID.code);
    expect(res.body.data, failMsg(res)).toBeNull();
  });

  it('TC19 — Token đã hết hạn sử dụng — TOKEN_INVALID', async () => {
    const res = await orderAction.getPurchaseRaw(EXPIRED_TOKEN, {
      id: String(validOrderId),
    });

    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(RESPONSE.TOKEN_INVALID.code);
    expect(res.body.data, failMsg(res)).toBeNull();
  });
});
