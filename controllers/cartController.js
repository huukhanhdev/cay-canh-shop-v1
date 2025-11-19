const Cart = require('../models/Cart');
const Product = require('../models/Product');
const Order = require('../models/Order');
const User = require('../models/User');
const { locations, normalizeLocation } = require('../helpers/location');

function normalizeEmail(email = '') {
  return email.trim().toLowerCase();
}

async function getOrCreateCart(userID) {
  let cart = await Cart.findOne({ userID, isActive: true });
  if (!cart) {
    cart = new Cart({ userID, items: [], totalPrice: 0 });
  }
  return cart;
}

function ensureGuestCart(req) {
  if (!req.session.guestCart) {
    req.session.guestCart = { items: [], totalPrice: 0 };
  }
  return req.session.guestCart;
}

function recalc(cart) {
  cart.totalPrice = cart.items.reduce((sum, item) => sum + item.subTotal, 0);
}

function pickDefaultAddress(user) {
  if (!user?.shippingAddresses?.length) return null;
  return user.shippingAddresses.find((addr) => addr.isDefault) || user.shippingAddresses[0];
}

function buildPrefillFromUser(user) {
  const address = pickDefaultAddress(user) || {};
  const normalizedLocationInput = normalizeLocation(address.city || '', address.district || '');
  return {
    email: user?.email || '',
    fullName: address.fullName || user?.fullName || '',
    phone: address.phone || '',
    street: address.street || '',
    district: normalizedLocationInput.district || '',
    city: normalizedLocationInput.city || '',
    note: '',
  };
}

function buildPrefillFromBody(body = {}) {
  return {
    email: body.email || '',
    fullName: body.fullName || '',
    phone: body.phone || '',
    street: body.street || '',
    district: body.district || '',
    city: body.city || '',
    note: body.note || '',
  };
}

async function upsertDefaultAddress(userId, payload = {}) {
  if (!userId) return;
  try {
    const user = await User.findById(userId);
    if (!user) return;

    if (!Array.isArray(user.shippingAddresses) || user.shippingAddresses.length === 0) {
      user.shippingAddresses = [{ ...payload, isDefault: true }];
    } else {
      const target = user.shippingAddresses.find((addr) => addr.isDefault) || user.shippingAddresses[0];
      Object.assign(target, payload, { isDefault: true });
    }

    if (payload.fullName) {
      user.fullName = payload.fullName;
    }

    user.markModified('shippingAddresses');
    await user.save();
  } catch (err) {
    console.error('Update default address error:', err);
  }
}

async function ensureUserForGuestCheckout({ email, fullName, address }) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return null;

  let user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    user = new User({
      email: normalizedEmail,
      fullName: fullName.trim(),
      isVerified: true,
      role: 'customer',
      shippingAddresses: address ? [{ ...address, isDefault: true }] : [],
    });
  } else {
    if (fullName && fullName.trim()) user.fullName = fullName.trim();
    if (address) {
      if (!Array.isArray(user.shippingAddresses) || !user.shippingAddresses.length) {
        user.shippingAddresses = [{ ...address, isDefault: true }];
      } else {
        const target = user.shippingAddresses.find((a) => a.isDefault) || user.shippingAddresses[0];
        Object.assign(target, address, { isDefault: true });
      }
      user.markModified('shippingAddresses');
    }
    if (!user.isVerified) user.isVerified = true;
  }

  await user.save();
  return user;
}

function normalizeItemProductId(productId) {
  if (!productId) return '';
  if (typeof productId === 'string') return productId;
  if (productId.toString) return productId.toString();
  return `${productId}`;
}

function findVariant(product, variantId) {
  if (!variantId && product.variants?.length) {
    return product.variants[0];
  }
  return product.variants?.find((variant) => variant._id?.toString() === variantId) || null;
}

function buildVariantPayload(product, variantId) {
  const variant = findVariant(product, variantId);
  if (!variant) {
    return { variant: null, price: product.price, variantId: null };
  }
  return {
    variant,
    price: typeof variant.price === 'number' ? variant.price : product.price,
    variantId: variant._id ? variant._id.toString() : null,
  };
}

function cartItemMatches(item, productId, variantId) {
  return (
    normalizeItemProductId(item.productID) === productId &&
    (item.variantId || '') === (variantId || '')
  );
}

exports.viewCart = async (req, res) => {
  let cart;
  if (req.session?.user) {
    cart = await getOrCreateCart(req.session.user.id);
  } else {
    cart = ensureGuestCart(req);
  }

  res.render('cart/index', {
    title: 'Giỏ hàng',
    cart,
    message: req.query.msg || null,
  });
};

exports.addItem = async (req, res) => {
  const { productId, quantity = 1, variantId = '' } = req.body;

  if (!productId) return res.redirect('/shop');

  try {
    const product = await Product.findById(productId);
    if (!product) return res.redirect('/shop');

    const qty = Math.max(1, Number(quantity) || 1);
    const { variant, price, variantId: resolvedVariantId } = buildVariantPayload(product, variantId);
    const productImg = Array.isArray(product.img) ? product.img[0] : product.img;
    const variantPayload = variant
      ? {
          variantName: variant.variantName,
          sku: variant.sku,
          color: variant.color,
          size: variant.size,
          material: variant.material,
          price: variant.price,
          variantImg: variant.variantImg || productImg,
        }
      : {};

    if (req.session?.user) {
      const cart = await getOrCreateCart(req.session.user.id);
      const existing = cart.items.find((item) =>
        cartItemMatches(item, productId, resolvedVariantId)
      );

      if (existing) {
        existing.quantity += qty;
        existing.price = price;
        existing.subTotal = existing.quantity * price;
      } else {
        cart.items.push({
          productID: product._id,
          productName: product.name,
          productImg,
          type: product.type,
          price,
          quantity: qty,
          subTotal: price * qty,
          variantId: resolvedVariantId,
          variant: variantPayload,
        });
      }

      recalc(cart);
      await cart.save();
    } else {
      const cart = ensureGuestCart(req);
      const existing = cart.items.find(
        (item) => item.productID === productId && (item.variantId || '') === (resolvedVariantId || '')
      );
      if (existing) {
        existing.quantity += qty;
        existing.price = price;
        existing.subTotal = existing.quantity * price;
      } else {
        cart.items.push({
          productID: product._id.toString(),
          productName: product.name,
          productImg,
          type: product.type,
          price,
          quantity: qty,
          subTotal: price * qty,
          variantId: resolvedVariantId,
          variant: variantPayload,
        });
      }
      recalc(cart);
    }

    res.redirect('/cart?msg=added');
  } catch (err) {
    console.error('Add cart error:', err);
    res.redirect('/shop');
  }
};

exports.updateItem = async (req, res) => {
  const { productId, quantity = 1, variantId = '' } = req.body;

  try {
    const qty = Math.max(0, Number(quantity) || 0);
    const normalizedVariantId = variantId || '';

    if (req.session?.user) {
      const cart = await getOrCreateCart(req.session.user.id);
      const item = cart.items.find((i) =>
        cartItemMatches(i, productId, normalizedVariantId)
      );
      if (!item) return res.redirect('/cart');

      if (qty === 0) {
        cart.items = cart.items.filter(
          (i) => !cartItemMatches(i, productId, normalizedVariantId)
        );
      } else {
        item.quantity = qty;
        item.subTotal = item.price * qty;
      }
      recalc(cart);
      await cart.save();
    } else {
      const cart = ensureGuestCart(req);
      const item = cart.items.find(
        (i) => i.productID === productId && (i.variantId || '') === normalizedVariantId
      );
      if (!item) return res.redirect('/cart');

      if (qty === 0) {
        cart.items = cart.items.filter(
          (i) => !(i.productID === productId && (i.variantId || '') === normalizedVariantId)
        );
      } else {
        item.quantity = qty;
        item.subTotal = item.price * qty;
      }
      recalc(cart);
    }

    res.redirect('/cart?msg=updated');
  } catch (err) {
    console.error('Update cart error:', err);
    res.redirect('/cart?msg=error');
  }
};

exports.getCheckout = async (req, res) => {
  const isLoggedIn = !!req.session?.user;
  const cart = isLoggedIn ? await getOrCreateCart(req.session.user.id) : ensureGuestCart(req);

  if (!cart.items.length) {
    return res.redirect('/cart?msg=empty');
  }

  let prefill;
  let savedAddresses = [];
  if (isLoggedIn) {
    const user = await User.findById(req.session.user.id).lean().catch(() => null);
    prefill = buildPrefillFromUser(user || {});
    savedAddresses = Array.isArray(user?.shippingAddresses) ? user.shippingAddresses : [];
  } else {
    prefill = buildPrefillFromBody(req.session.checkoutDraft || {});
  }

  res.render('checkout/index', {
    title: 'Thanh toán',
    cart,
    error: null,
    prefill,
    isLoggedIn,
    savedAddresses,
    locations,
  });
};

exports.postCheckout = async (req, res) => {
  const isLoggedIn = !!req.session?.user;
  const cart = isLoggedIn ? await getOrCreateCart(req.session.user.id) : ensureGuestCart(req);

  if (!cart.items.length) {
    return res.redirect('/cart?msg=empty');
  }

  const savedAddresses = isLoggedIn
    ? (
        (await User.findById(req.session.user.id)
          .lean()
          .catch(() => null)) || { shippingAddresses: [] }
      ).shippingAddresses || []
    : [];

  const {
    email = '',
    fullName = '',
    phone = '',
    street = '',
    district = '',
    city = '',
    note = '',
  } = req.body;

  const sanitized = {
    email: email.trim(),
    fullName: fullName.trim(),
    phone: phone.trim(),
    street: street.trim(),
    district: district.trim(),
    city: city.trim(),
    note: note.trim(),
  };

  const normalizedLocationInput = normalizeLocation(sanitized.city, sanitized.district);
  const filledPayload = {
    ...sanitized,
    city: normalizedLocationInput.city,
    district: normalizedLocationInput.district,
  };

  if (
    !filledPayload.fullName ||
    !filledPayload.phone ||
    !filledPayload.street ||
    !filledPayload.district ||
    !filledPayload.city ||
    (!isLoggedIn && !normalizeEmail(filledPayload.email))
  ) {
    if (!isLoggedIn) req.session.checkoutDraft = filledPayload;
    return res.status(400).render('checkout/index', {
      title: 'Thanh toán',
      cart,
      error: 'Vui lòng nhập đầy đủ thông tin giao hàng.',
      prefill: buildPrefillFromBody(filledPayload),
      isLoggedIn,
      savedAddresses,
      locations,
    });
  }

  try {
    let userId = req.session?.user?.id;
    if (!isLoggedIn) {
      const guestUser = await ensureUserForGuestCheckout({
        email: filledPayload.email,
        fullName: filledPayload.fullName,
        address: {
          fullName: filledPayload.fullName,
          phone: filledPayload.phone,
          street: filledPayload.street,
          district: filledPayload.district,
          city: filledPayload.city,
        },
      });

      if (!guestUser) {
      return res.status(400).render('checkout/index', {
        title: 'Thanh toán',
        cart,
        error: 'Email không hợp lệ. Vui lòng kiểm tra lại.',
        prefill: buildPrefillFromBody(filledPayload),
        isLoggedIn,
        savedAddresses,
        locations,
      });
      }
      userId = guestUser._id.toString();
    }

    const pointEarned = Math.floor((cart.totalPrice || 0) / 10000);
    const order = new Order({
      userID: userId,
      address: {
        number: '',
        street: filledPayload.street,
        district: filledPayload.district,
        city: filledPayload.city,
      },
      items: cart.items.map((item) => ({
        productID: item.productID,
        productName: item.productName,
        price: item.price,
        quantity: item.quantity,
        subTotal: item.subTotal,
        variantId: item.variantId || null,
        variant: {
          variantName: item.variant?.variantName,
          sku: item.variant?.sku,
          color: item.variant?.color,
          size: item.variant?.size,
          material: item.variant?.material,
          price: item.variant?.price,
        },
      })),
      totalPrice: cart.totalPrice,
      pointEarned,
      note: filledPayload.note,
      status: 'pending',
    });

    await order.save();

    if (isLoggedIn) {
      cart.items = [];
      cart.totalPrice = 0;
      await cart.save();
      await upsertDefaultAddress(userId, {
        fullName: filledPayload.fullName,
        phone: filledPayload.phone,
        street: filledPayload.street,
        district: filledPayload.district,
        city: filledPayload.city,
      });
    } else {
      req.session.guestCart = { items: [], totalPrice: 0 };
      delete req.session.checkoutDraft;
    }

    res.redirect(`/checkout/success?order=${order._id}`);
  } catch (err) {
    console.error('Checkout error:', err);
    return res.status(500).render('checkout/index', {
      title: 'Thanh toán',
      cart,
      error: 'Không thể hoàn tất thanh toán. Vui lòng thử lại sau.',
      prefill: buildPrefillFromBody(filledPayload),
      isLoggedIn,
      savedAddresses,
      locations,
    });
  }
};

exports.checkoutSuccess = async (req, res) => {
  res.render('checkout/success', {
    title: 'Đặt hàng thành công',
    orderId: req.query.order || null,
  });
};
