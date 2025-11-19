// seedPlantDetails.js
const Product = require("../models/Product");
const PlantDetail = require("../models/PlantDetail");

// 🌱 Dữ liệu chi tiết cây cảnh
const plantDetails = [
  // 🌿 CÂY CẢNH MINI
  {
    matchSlug: "cay-dua-hau-watermelon-de-ban-chau-cu-meo",
    height: "20-30cm",
    difficulty: "Dễ chăm",
    lightRequirement: "Ánh sáng gián tiếp",
    waterDemand: "2-3 lần/tuần",
  },
  {
    matchSlug: "cay-hong-mon-nho-de-ban-chau-su",
    height: "25-35cm",
    difficulty: "Trung bình",
    lightRequirement: "Ánh sáng nhẹ",
    waterDemand: "2-3 lần/tuần",
  },
  {
    matchSlug: "cay-may-man-hinh-trai-tim-chau-su",
    height: "10-15cm",
    difficulty: "Rất dễ",
    lightRequirement: "Ánh sáng yếu",
    waterDemand: "1-2 lần/tuần",
  },
  {
    matchSlug: "cay-tung-bach-tan-tieu-canh-de-ban-chau-su",
    height: "25-40cm",
    difficulty: "Trung bình",
    lightRequirement: "Ánh sáng mạnh gián tiếp",
    waterDemand: "3 lần/tuần",
  },

  // 🌿 CÂY CẢNH VĂN PHÒNG
  {
    matchSlug: "cay-kim-ngan-ba-than-de-ban-chau-su-gau-bearbrick",
    height: "35-60cm",
    difficulty: "Dễ chăm",
    lightRequirement: "Ánh sáng gián tiếp hoặc tự nhiên",
    waterDemand: "2 lần/tuần",
  },
  {
    matchSlug: "cay-luoi-ho-bantel-sensation-chau-uom",
    height: "20-25cm",
    difficulty: "Rất dễ",
    lightRequirement: "Ánh sáng mạnh hoặc yếu đều sống tốt",
    waterDemand: "1 lần/tuần",
  },
  {
    matchSlug: "cay-phat-tai-bo-5-cay-thiet-moc-lan",
    height: "80-120cm",
    difficulty: "Dễ chăm",
    lightRequirement: "Ánh sáng gián tiếp",
    waterDemand: "2-3 lần/tuần",
  },
  {
    matchSlug: "cay-tung-bong-lai-tieu-canh-chau-su-tho-cam",
    height: "30-40cm",
    difficulty: "Trung bình",
    lightRequirement: "Ánh sáng mạnh",
    waterDemand: "3-4 lần/tuần",
  },

  // 🌿 CÂY NHIỆT ĐỚI
  {
    matchSlug: "cay-cau-nga-mi-cao-150-160cm-chau-xi-mang-trang",
    height: "150-160cm",
    difficulty: "Trung bình",
    lightRequirement: "Ánh sáng tán xạ",
    waterDemand: "2-3 lần/tuần",
  },
  {
    matchSlug: "cay-duoi-cong-soc-calathea-sanderiana-chau-gom-su",
    height: "25-35cm",
    difficulty: "Trung bình",
    lightRequirement: "Ánh sáng yếu đến trung bình",
    waterDemand: "2-3 lần/tuần",
  },
  {
    matchSlug: "cay-huyet-du-mocha-latte-chau-uom",
    height: "30-50cm",
    difficulty: "Dễ chăm",
    lightRequirement: "Ánh sáng tán xạ",
    waterDemand: "2-3 lần/tuần",
  },
  {
    matchSlug: "cay-troc-bac-hong-neon-robusta-chau-dat-nung",
    height: "25-40cm",
    difficulty: "Rất dễ",
    lightRequirement: "Ánh sáng nhẹ",
    waterDemand: "1-2 lần/tuần",
  },

  // 🌿 CÂY THỦY SINH
  {
    matchSlug: "cay-kim-ngan-thuy-sinh-mot-than-co-thu-de-ban",
    height: "30-40cm",
    difficulty: "Dễ chăm",
    lightRequirement: "Ánh sáng gián tiếp",
    waterDemand: "Thay nước mỗi 7-10 ngày",
  },
  {
    matchSlug: "cay-luoi-ho-xanh-mini-black-gold-thuy-sinh",
    height: "20-25cm",
    difficulty: "Rất dễ",
    lightRequirement: "Ánh sáng yếu",
    waterDemand: "Thay nước mỗi 10-14 ngày",
  },
  {
    matchSlug: "cay-phat-tai-vien-vang-dorado-thuy-sinh",
    height: "25-30cm",
    difficulty: "Dễ chăm",
    lightRequirement: "Ánh sáng gián tiếp",
    waterDemand: "Thay nước mỗi 10 ngày",
  },
  {
    matchSlug: "cay-van-loc-son-red-star-thuy-sinh",
    height: "25-35cm",
    difficulty: "Trung bình",
    lightRequirement: "Ánh sáng tán xạ",
    waterDemand: "Thay nước mỗi 7 ngày",
  },

  // 🌳 NGOÀI TRỜI – CÂY CHE PHỦ NỀN
  {
    matchSlug: "cay-bach-trinh-bien-chau-uom-nho",
    height: "20-30cm",
    difficulty: "Rất dễ",
    lightRequirement: "Ánh sáng mạnh",
    waterDemand: "3-4 lần/tuần",
  },
  {
    matchSlug: "cay-cuc-tan-an-do",
    height: "80-100cm",
    difficulty: "Dễ chăm",
    lightRequirement: "Ánh sáng trực tiếp",
    waterDemand: "3-4 lần/tuần",
  },
  {
    matchSlug: "cay-mai-chi-thien",
    height: "25-40cm",
    difficulty: "Trung bình",
    lightRequirement: "Ánh sáng mạnh",
    waterDemand: "2-3 lần/tuần",
  },

  // 🌳 NGOÀI TRỜI – CÂY LEO DÀN
  {
    matchSlug: "cay-chanh-bac-chau-uom",
    height: "120-150cm",
    difficulty: "Trung bình",
    lightRequirement: "Ánh sáng mạnh",
    waterDemand: "3-4 lần/tuần",
  },
  {
    matchSlug: "cay-hoa-hong-leo-soeur-emmanuelle-chau-da-mai",
    height: "100-150cm",
    difficulty: "Trung bình",
    lightRequirement: "Ánh sáng trực tiếp",
    waterDemand: "3-4 lần/tuần",
  },
  {
    matchSlug: "cay-hoa-lan-hoang-duong-chau-uom",
    height: "80-100cm",
    difficulty: "Dễ chăm",
    lightRequirement: "Ánh sáng mạnh",
    waterDemand: "2-3 lần/tuần",
  },
  {
    matchSlug: "cay-nho-than-go-12-vu-chau-uom",
    height: "120-150cm",
    difficulty: "Trung bình",
    lightRequirement: "Ánh sáng mạnh",
    waterDemand: "3 lần/tuần",
  },

  // 🌳 NGOÀI TRỜI – CÂY TẦM TRUNG
  {
    matchSlug: "cay-bo-cap-vang",
    height: "300-500cm",
    difficulty: "Trung bình",
    lightRequirement: "Ánh sáng trực tiếp",
    waterDemand: "2-3 lần/tuần",
  },
  {
    matchSlug: "cay-chuong-vang",
    height: "250-400cm",
    difficulty: "Trung bình",
    lightRequirement: "Ánh sáng mạnh",
    waterDemand: "3 lần/tuần",
  },
  {
    matchSlug: "cay-hai-duong-chau-su-trang-co-hoa-tiet-camellia-amplexicaulis",
    height: "100-120cm",
    difficulty: "Trung bình",
    lightRequirement: "Ánh sáng trung bình",
    waterDemand: "2-3 lần/tuần",
  },
  {
    matchSlug: "cay-ken-hong",
    height: "250-350cm",
    difficulty: "Trung bình",
    lightRequirement: "Ánh sáng mạnh",
    waterDemand: "3 lần/tuần",
  },

  // 🌳 NGOÀI TRỜI – CÂY THÂN ĐỐT
  {
    matchSlug: "cay-tre-vang-bambusa-vulgaris",
    height: "300-600cm",
    difficulty: "Dễ chăm",
    lightRequirement: "Ánh sáng mạnh",
    waterDemand: "2-3 lần/tuần",
  },
  {
    matchSlug: "cay-truc-can-cau-phyllostachys-aurea",
    height: "250-400cm",
    difficulty: "Dễ chăm",
    lightRequirement: "Ánh sáng mạnh",
    waterDemand: "3 lần/tuần",
  },
  {
    matchSlug: "cay-truc-quan-tu",
    height: "300-500cm",
    difficulty: "Dễ chăm",
    lightRequirement: "Ánh sáng mạnh",
    waterDemand: "3 lần/tuần",
  },
];

async function seedPlantDetails() {
  try {
    for (const detail of plantDetails) {
      const product = await Product.findOne({ slug: detail.matchSlug });
      if (!product) {
        console.warn(
          `⚠️ Không tìm thấy sản phẩm với slug: ${detail.matchSlug}`
        );
        continue;
      }

      // Kiểm tra nếu đã tồn tại plant detail thì bỏ qua
      const exists = await PlantDetail.findOne({ productID: product._id });
      if (exists) {
        console.log(`⏩ Đã tồn tại plant detail cho: ${product.name}`);
        continue;
      }

      await PlantDetail.create({
        productID: product._id,
        height: detail.height,
        difficulty: detail.difficulty,
        lightRequirement: detail.lightRequirement,
        waterDemand: detail.waterDemand,
      });
    }

    console.log("🎉 Seed PlantDetail hoàn tất!");
  } catch (err) {
    console.error("❌ Lỗi seed PlantDetail:", err);
  }
}

module.exports = { seedPlantDetails };
