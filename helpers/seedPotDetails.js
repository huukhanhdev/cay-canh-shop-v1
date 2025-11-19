const Product = require("../models/Product");
const PotDetail = require("../models/PotDetail");

const potDetails = [
  {
    slug: "chau-dat-nung-tron-bau-hoa-tiet-hoa-cuc",
    material: "Đất nung sơn",
    pattern: "Hoa cúc",
    dimension: "32x25 / 19x16 / 16x13 cm(DxC)",
    color: "Xanh",
  },
  {
    slug: "chau-dat-nung-tru-dung-tron",
    material: "Đất nung",
    pattern: "Trơn",
    dimension: "11x11cm / 15x15cm / x 20x20cm / 25x25cm",
    color: "Kem đất",
  },
  {
    slug: "chau-dat-nung-tru-tron-hoa-tiet-tho-cam",
    material: "Đất nung",
    pattern: "Thổ cẩm",
    dimension: "25x20cm / 18x15cm",
    color: "Nâu đất, trắng",
  },
  {
    slug: "chau-dat-nung-wax-xam-hoa-tiet-hoa",
    material: "Đất nung sơn",
    pattern: "Hoa trang trí",
    dimension: "30x30x20 / 20x20x15 / 18x18x12 cm",
    color: "Xám xanh",
  },
  {
    slug: "chau-gom-su-hinh-khoi-van-gon-song-mau-trang",
    material: "Gốm sứ",
    pattern: "Gân sóng",
    dimension: "15x15cm / 20x20 / 25x25 (DxC)",
    color: "Trắng",
  },
  {
    slug: "chau-gom-su-hinh-tru-hoa-tiet-geometric",
    material: "Gốm sứ",
    pattern: "Geometric",
    dimension: "13x13 / 20x18 / 25x24 cm (DxC)",
    color: "Trắng",
  },
  {
    slug: "chau-gom-su-hoa-tiet-la-monstera-co-dia",
    material: "Gốm sứ",
    pattern: "Lá Monstera",
    dimension: "11x10 / 14x13 / 17x16cm (DxC)",
    color: "Trắng",
  },
  {
    slug: "chau-xi-mang-da-mai-hinh-vuong-tru",
    material: "Xi măng, đá cẩm thạch",
    pattern: "Bề mặt nhám tự nhiên",
    dimension: "25x50 / 30x50 / 30x60",
    color: "Xám xi măng",
  },
  {
    slug: "chau-xi-mang-da-mai-tru-vuong-vat-day",
    material: "Xi măng, đá cẩm thạch",
    pattern: "Bề mặt nhám tự nhiên",
    dimension: "28x45 / 32x55 / 36x45",
    color: "Đen",
  },
  {
    slug: "chau-xi-mang-da-mai-vuong",
    material: "Xi măng, đá cẩm thạch",
    pattern: "Bề mặt nhám tự nhiên",
    dimension: "20x20 / 25x25 / 30x30",
    color: "Đen",
  },
];

async function seedPotDetails() {
  try {
    for (const detail of potDetails) {
      const product = await Product.findOne({ slug: detail.slug });
      if (!product) {
        console.warn(`⚠️ Không tìm thấy sản phẩm với slug: ${detail.slug}`);
        continue;
      }

      // Kiểm tra nếu đã tồn tại pot detail thì bỏ qua
      const exists = await PotDetail.findOne({ productID: product._id });
      if (exists) {
        console.log(`⏩ Đã tồn tại pot detail cho: ${product.name}`);
        continue;
      }

      await PotDetail.create({
        productID: product._id,
        material: detail.material,
        pattern: detail.pattern,
        dimension: detail.dimension,
        color: detail.color,
      });
    }
    console.log("🎉 Seed PotDetail hoàn tất!");
  } catch (err) {
    console.error("❌ Lỗi seed PlantDetail:", err);
  }
}

module.exports = { seedPotDetails };
