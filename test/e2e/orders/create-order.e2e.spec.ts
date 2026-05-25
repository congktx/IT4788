import { orderAction } from '../../helpers/actions/order.action';
import { productAction } from '../../helpers/actions/product.action';
import { getTestUsers, TestUser } from '../../helpers/test-user.helper';
import { failMsg } from '../../helpers/api-client.helper';
import { RESPONSE } from '../../constants/respones';
import { EXPIRED_TOKEN } from '../../fixtures/user.fixture';

let U1: TestUser; // buyer
let U2: TestUser; // seller
let U3: TestUser; // buyer khác

let productId: number;
let addressId: number; // địa chỉ của U1 (buyer)

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

  // U2 (seller) tạo địa chỉ → dùng làm ship_from_id
  const sellerAddressRes = await orderAction.addOrderAddress(U2.token, {
    ...BASE_ADDRESS,
    address: 'Kho hàng U2',
  });
  const shipFromId = sellerAddressRes.body.data.id;

  // U2 tạo product với ship_from_id
  const productRes = await productAction.addProduct(U2.token, {
    ...BASE_PRODUCT,
    ship_from_id: shipFromId,
  });
  productId = productRes.body.data.id;

  // U1 (buyer) tạo địa chỉ nhận hàng
  const buyerAddressRes = await orderAction.addOrderAddress(U1.token, {
    ...BASE_ADDRESS,
    address: 'Nhà U1',
    is_default: true,
  });
  addressId = buyerAddressRes.body.data.id;
});

// Thành công
describe('Thành công', () => {
  it('TC01 — Tạo order hợp lệ — trả về order_id và status PENDING', async () => {
    const res = await orderAction.createOrder(U1.token, {
      address_id: addressId,
      source: 'app',
      items: [{ product_id: productId, quantity: 1 }],
    });

    expect(res.status, failMsg(res)).toBe(201);
    expect(res.body.code, failMsg(res)).toBe(RESPONSE.OK.code);
    expect(res.body.message, failMsg(res)).toBe(RESPONSE.OK.message);

    // Kiểm tra kiểu dữ liệu
    expect(typeof res.body.data.order_id, failMsg(res)).toBe('number');
    expect(res.body.data.status, failMsg(res)).toBe('pending');
    expect(typeof res.body.data.total_price, failMsg(res)).toBe('string');
    expect(typeof res.body.data.shipping_fee, failMsg(res)).toBe('string');
  });

  it('TC02 — Tạo order với nhiều item cùng seller — thành công', async () => {
    // Tạo thêm product 2 từ U2
    const sellerAddressRes = await orderAction.addOrderAddress(U2.token, {
      ...BASE_ADDRESS,
      address: 'Kho hàng U2 thứ 2',
    });
    const productRes2 = await productAction.addProduct(U2.token, {
      ...BASE_PRODUCT,
      title: 'Sản phẩm test 2',
      ship_from_id: sellerAddressRes.body.data.id,
    });
    const productId2 = productRes2.body.data.id;

    const res = await orderAction.createOrder(U1.token, {
      address_id: addressId,
      source: 'app',
      items: [
        { product_id: productId, quantity: 1 },
        { product_id: productId2, quantity: 2 },
      ],
    });

    expect(res.status, failMsg(res)).toBe(201);
    expect(res.body.code, failMsg(res)).toBe(RESPONSE.OK.code);
    expect(res.body.message, failMsg(res)).toBe(RESPONSE.OK.message);
  });
});

// Thất bại -> Thiếu tham số
describe('Thiếu tham số', () => {
  it('TC03 — Không có token — TOKEN_INVALID', async () => {
    const res = await orderAction.createOrderRaw(null, {
      address_id: addressId,
      source: 'app',
      items: [{ product_id: productId, quantity: 1 }],
    });
    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(RESPONSE.TOKEN_INVALID.code);
    expect(res.body.message, failMsg(res)).toBe(RESPONSE.TOKEN_INVALID.message);
    expect(res.body.data, failMsg(res)).toBeNull();
  });

  it('TC04 — Thiếu address_id — PARAMETER_VALUE_INVALID', async () => {
    const res = await orderAction.createOrderRaw(U1.token, {
      source: 'app',
      items: [{ product_id: productId, quantity: 1 }],
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

  it('TC05 — Thiếu items — PARAMETER_VALUE_INVALID', async () => {
    const res = await orderAction.createOrderRaw(U1.token, {
      address_id: addressId,
      source: 'app',
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

  it('TC06 — items rỗng — PARAMETER_VALUE_INVALID', async () => {
    const res = await orderAction.createOrderRaw(U1.token, {
      address_id: addressId,
      source: 'app',
      items: [],
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

  it('TC07 — Thiếu source — PARAMETER_VALUE_INVALID', async () => {
    const res = await orderAction.createOrderRaw(U1.token, {
      address_id: addressId,
      items: [{ product_id: productId, quantity: 1 }],
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
  it('TC08 — address_id không tồn tại — PARAMETER_VALUE_INVALID', async () => {
    const res = await orderAction.createOrderRaw(U1.token, {
      address_id: 999999,
      source: 'app',
      items: [{ product_id: productId, quantity: 1 }],
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

  it('TC09 — address_id của user khác — PARAMETER_VALUE_INVALID', async () => {
    const u2AddressRes = await orderAction.addOrderAddress(U2.token, {
      ...BASE_ADDRESS,
      address: 'Nhà U2',
    });
    const u2AddressId = u2AddressRes.body.data.id;

    const res = await orderAction.createOrderRaw(U1.token, {
      address_id: u2AddressId,
      source: 'app',
      items: [{ product_id: productId, quantity: 1 }],
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

  it('TC10 — product_id không tồn tại — PRODUCT_NOT_EXISTED', async () => {
    const res = await orderAction.createOrderRaw(U1.token, {
      address_id: addressId,
      source: 'app',
      items: [{ product_id: 999999, quantity: 1 }],
    });
    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(RESPONSE.PRODUCT_NOT_EXISTED.code);
    expect(res.body.message, failMsg(res)).toBe(
      RESPONSE.PRODUCT_NOT_EXISTED.message,
    );
    expect(res.body.data, failMsg(res)).toBeNull();
  });

  it('TC11 — quantity = 0 — PARAMETER_VALUE_INVALID', async () => {
    const res = await orderAction.createOrderRaw(U1.token, {
      address_id: addressId,
      source: 'app',
      items: [{ product_id: productId, quantity: 0 }],
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

  it('TC12 — quantity âm (-1) — PARAMETER_VALUE_INVALID', async () => {
    const res = await orderAction.createOrderRaw(U1.token, {
      address_id: addressId,
      source: 'app',
      items: [{ product_id: productId, quantity: -1 }],
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

  it('TC13 — items chứa product từ nhiều seller khác nhau — PARAMETER_VALUE_INVALID', async () => {
    const u3AddressRes = await orderAction.addOrderAddress(U3.token, {
      ...BASE_ADDRESS,
      address: 'Kho hàng U3',
    });
    const u3ProductRes = await productAction.addProduct(U3.token, {
      ...BASE_PRODUCT,
      title: 'Sản phẩm U3',
      ship_from_id: u3AddressRes.body.data.id,
    });
    const u3ProductId = u3ProductRes.body.data.id;

    const res = await orderAction.createOrderRaw(U1.token, {
      address_id: addressId,
      source: 'app',
      items: [
        { product_id: productId, quantity: 1 }, // seller U2
        { product_id: u3ProductId, quantity: 1 }, // seller U3
      ],
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
  it('TC14 — Token sai định dạng — TOKEN_INVALID', async () => {
    const res = await orderAction.createOrderRaw('invalid.token.here', {
      address_id: addressId,
      source: 'app',
      items: [{ product_id: productId, quantity: 1 }],
    });
    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(RESPONSE.TOKEN_INVALID.code);
    expect(res.body.message, failMsg(res)).toBe(RESPONSE.TOKEN_INVALID.message);
    expect(res.body.data, failMsg(res)).toBeNull();
  });

  it('TC15 — Token hết hạn — TOKEN_INVALID', async () => {
    const res = await orderAction.createOrderRaw(EXPIRED_TOKEN, {
      address_id: addressId,
      source: 'app',
      items: [{ product_id: productId, quantity: 1 }],
    });
    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(RESPONSE.TOKEN_INVALID.code);
    expect(res.body.message, failMsg(res)).toBe(RESPONSE.TOKEN_INVALID.message);
    expect(res.body.data, failMsg(res)).toBeNull();
  });
});
