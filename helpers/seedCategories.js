const Category = require("../models/Category");

async function seedCategories() {
  const categories = [
    { name: "Cây trong nhà", slug: "cay-trong-nha", productType: "indoor" },
    { name: "Cây ngoài trời", slug: "cay-ngoai-troi", productType: "outdoor" },
    { name: "Chậu cây", slug: "chau-cay", productType: "pot" },
  ];

  const subCategories = {
    "cay-trong-nha": [
      { name: "Cây cảnh mini", slug: "cay-canh-mini" },
      { name: "Cây cảnh văn phòng", slug: "cay-canh-van-phong" },
      { name: "Cây nhiệt đới", slug: "cay-nhiet-doi" },
      { name: "Cây thủy sinh", slug: "cay-thuy-sinh" },
    ],
    "cay-ngoai-troi": [
      { name: "Cây che phủ nền", slug: "cay-che-phu-nen" },
      { name: "Cây leo dàn", slug: "cay-leo-dan" },
      { name: "Cây tầm trung", slug: "cay-tam-trung" },
      { name: "Cây thân đốt", slug: "cay-than-dot" },
    ],
    "chau-cay": [
      { name: "Chậu đất nung", slug: "chau-dat-nung" },
      { name: "Chậu gốm sứ", slug: "chau-gom-su" },
      { name: "Kiểu chậu vuông", slug: "kieu-chau-vuong" },
    ],
  };

  const count = await Category.countDocuments();
  if (count > 0) {
    console.log("ℹ️ Category đã tồn tại, bỏ qua seed.");
    return;
  }

  console.log("🌱 Đang seed Category...");
  const parents = await Category.insertMany(categories);
  const map = {};
  parents.forEach((p) => (map[p.slug] = p._id));

  const typeMap = {
    "cay-trong-nha": "indoor",
    "cay-ngoai-troi": "outdoor",
    "chau-cay": "pot",
  };

  const children = [];
  for (const [slug, subs] of Object.entries(subCategories)) {
    subs.forEach((s) =>
      children.push({
        ...s,
        parentCategoryID: map[slug],
        productType: typeMap[slug] || "indoor",
      })
    );
  }

  await Category.insertMany(children);
  console.log("✅ Seed Category hoàn tất!");
}

module.exports = { seedCategories };
