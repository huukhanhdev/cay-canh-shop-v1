const User = require("../models/User");

async function seedAdmin() {
  try {
    // Kiểm tra xem đã có user role admin chưa
    const adminExists = await User.findOne({ role: "admin" });

    if (!adminExists) {
      await User.create({
        fullName: "Administrator",
        email: "admin@caycanhshop.local",
        password: "123456",
        role: "admin",
        isVerified: true,
      });
      console.log("✅ Admin mặc định: admin@caycanhshop.local / 123456");
    } else {
      console.log("ℹ️ Admin đã tồn tại, bỏ qua seed user.");
    }
  } catch (err) {
    console.error("❌ Lỗi seed admin:", err);
  }
}

module.exports = { seedAdmin };
