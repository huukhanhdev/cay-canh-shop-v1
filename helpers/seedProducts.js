const Product = require("../models/Product");
const Category = require("../models/Category");

const BRAND_BY_TYPE = {
  indoor: "Leafy Corner",
  outdoor: "Evergreen Estates",
  pot: "Terracotta Studio",
};

function toTitle(tag = "") {
  return tag
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function buildTags(category, productName = "") {
  const tags = new Set();
  if (category?.name) tags.add(category.name);
  if (category?.slug) tags.add(toTitle(category.slug));
  if (productName) {
    productName
      .split(" ")
      .slice(0, 3)
      .forEach((part) => tags.add(part));
  }
  if (category?.productType === "pot") {
    tags.add("Chậu trang trí");
  } else {
    tags.add("Cây nội thất");
  }
  return Array.from(tags).filter(Boolean);
}

function createVariants(product, category) {
  if (Array.isArray(product.variants) && product.variants.length >= 2) {
    return product.variants.map((variant, index) => ({
      variantName: variant.variantName || `Phiên bản ${index + 1}`,
      sku: variant.sku || `${product.slug}-VAR${index + 1}`,
      color: variant.color || (category?.productType === "pot" ? "Ghi" : "Xanh"),
      size: variant.size || "M",
      material: variant.material || (category?.productType === "pot" ? "Gốm" : "Thiên nhiên"),
      price: variant.price || product.price,
      stock: typeof variant.stock === "number" ? variant.stock : 20,
      variantImg: variant.variantImg || (product.img && product.img[index]) || product.img?.[0],
    }));
  }

  const images = Array.isArray(product.img) && product.img.length
    ? product.img
    : ["/images/default-plant.jpg"];
  const basePrice = Math.max(product.price || 120000, 60000);
  const stockBase = product.inStock && product.inStock > 0 ? product.inStock : 24;
  const firstStock = Math.max(8, Math.floor(stockBase / 2));
  const secondStock = Math.max(8, stockBase - firstStock);

  return [
    {
      variantName: "Phiên bản tiêu chuẩn",
      sku: `${product.slug}-STD`,
      price: Math.max(50000, Math.round(basePrice * 0.9)),
      stock: firstStock,
      color: category?.productType === "pot" ? "Trắng" : "Xanh lá",
      size: "Nhỏ",
      material: category?.productType === "pot" ? "Gốm sứ" : "Thiên nhiên",
      variantImg: images[0],
    },
    {
      variantName: "Phiên bản cao cấp",
      sku: `${product.slug}-PRE`,
      price: basePrice,
      stock: secondStock,
      color: category?.productType === "pot" ? "Ghi" : "Xanh đậm",
      size: "Lớn",
      material: category?.productType === "pot" ? "Xi măng" : "Thiên nhiên",
      variantImg: images[1] || images[0],
    },
  ];
}

async function seedProducts() {
  const count = await Product.countDocuments();
  if (count > 0) {
    console.log("ℹ️ Product đã tồn tại, bỏ qua seed.");
    return;
  }

  console.log("🌱 Đang seed Product...");

  const categories = await Category.find({});
  if (categories.length === 0) {
    console.log("⚠️ Chưa có Category, hãy seed Category trước!");
    return;
  }

  const findCategory = (slug) => categories.find((c) => c.slug === slug);
  const findCat = (slug) => findCategory(slug)?._id;

  const products = [
    // 🌿 CÂY TRONG NHÀ
    // -- CÂY CẢNH MINI
    {
      name: "Cây dưa hấu 'Watermelon' để bàn chậu cú mèo",
      slug: "cay-dua-hau-watermelon-de-ban-chau-cu-meo",
      img: [
        "/uploads/cay-trong-nha/cay-canh-mini/cay-dua-hau-watermelon-de-ban-chau-cu-meo-1.jpg",
        "/uploads/cay-trong-nha/cay-canh-mini/cay-dua-hau-watermelon-de-ban-chau-cu-meo-1.jpg",
        "/uploads/cay-trong-nha/cay-canh-mini/cay-dua-hau-watermelon-de-ban-chau-cu-meo-1.jpg",
      ],
      type: "plant",
      price: 180000,
      description:
        "Cây dưa hấu có kích thước nhỏ gọn, là hình bầu dục, tán lá sọc xanh sẫm và thân màu đỏ. Chính là kiểu lá sọc xanh tựa như cây dưa hấu nên chúng được đặt tên là cây dưa hấu 'Watermelon'. Tuy những chiếc lá khá mỏng manh, nhưng nó lại có sức sống rất khỏe, dễ chăm sóc.",
      categoryID: findCat("cay-canh-mini"),
      inStock: 20,
    },
    {
      name: "Cây hồng môn nhỏ để bàn chậu sứ",
      slug: "cay-hong-mon-nho-de-ban-chau-su",
      img: [
        "/uploads/cay-trong-nha/cay-canh-mini/cay-hong-mon-nho-de-ban-chau-su-1.jpg",
        "/uploads/cay-trong-nha/cay-canh-mini/cay-hong-mon-nho-de-ban-chau-su-2.jpg",
        "/uploads/cay-trong-nha/cay-canh-mini/cay-hong-mon-nho-de-ban-chau-su-3.jpg",
      ],
      type: "plant",
      price: 240000,
      description:
        "Cây hồng môn được biết tới là một loại cây cảnh mang lại điều tốt lành, có thể giúp điều hòa khí phong thủy trong nhà, có khả năng thu hút những dòng khí tích cực và làm tiêu bớt dòng khí tiêu cực cho môi trường xung quanh, trồng cây hồng môn trong nhà sẽ giúp không gian sống trở nên hài hòa và bình yên hơn.",
      categoryID: findCat("cay-canh-mini"),
      inStock: 15,
    },
    {
      name: "Cây may mắn hình trái tim chậu sứ",
      slug: "cay-may-man-hinh-trai-tim-chau-su",
      img: [
        "/uploads/cay-trong-nha/cay-canh-mini/cay-may-man-hinh-trai-tim-chau-su-1.jpg",
        "/uploads/cay-trong-nha/cay-canh-mini/cay-may-man-hinh-trai-tim-chau-su-2.jpg",
        "/uploads/cay-trong-nha/cay-canh-mini/cay-may-man-hinh-trai-tim-chau-su-3.jpg",
      ],
      type: "plant",
      price: 240000,
      description:
        "Cây cỏ may mắn là một loại cây đặc biệt, được ươm từ những hạt thanh long và tạo hình bởi bàn tay khéo léo của người nghệ nhân. Trên những quả cầu màu xanh xanh là hàng vạn cây non được ươm trổ trông rất bắt mắt và độc đáo. Chúng được xem là biểu tượng cho tình yêu, hy vọng và sự may mắn nên thường được lựa chọn để làm quà tặng vào dịp đặc biệt.",
      categoryID: findCat("cay-canh-mini"),
      inStock: 25,
    },
    {
      name: "Cây tùng bách tán tiểu cảnh để bàn chậu sứ",
      slug: "cay-tung-bach-tan-tieu-canh-de-ban-chau-su",
      img: [
        "/uploads/cay-trong-nha/cay-canh-mini/cay-tung-bach-tan-tieu-canh-de-ban-chau-su-1.jpg",
        "/uploads/cay-trong-nha/cay-canh-mini/cay-tung-bach-tan-tieu-canh-de-ban-chau-su-2.jpg",
        "/uploads/cay-trong-nha/cay-canh-mini/cay-tung-bach-tan-tieu-canh-de-ban-chau-su-3.jpg",
      ],
      type: "plant",
      price: 420000,
      description:
        "Cây tùng bách tán sở hữu kiểu dáng vô cùng độc đáo với những chiếc lá thuôn nhọn, bóng mượt và có màu xanh đậm, chúng mọc dọc theo cành đều đặn đúng theo hình xương cá.",
      categoryID: findCat("cay-canh-mini"),
      inStock: 30,
    },

    // 🌿 CÂY TRONG NHÀ
    // -- CÂY CẢNH VĂN PHÒNG
    {
      name: "Cây kim ngân ba thân để bàn chậu sứ gấu BearBrick",
      slug: "cay-kim-ngan-ba-than-de-ban-chau-su-gau-bearbrick",
      img: [
        "/uploads/cay-trong-nha/cay-canh-van-phong/cay-kim-ngan-ba-than-de-ban-chau-su-gau-bearbrick-1.jpg",
        "/uploads/cay-trong-nha/cay-canh-van-phong/cay-kim-ngan-ba-than-de-ban-chau-su-gau-bearbrick-2.jpg",
      ],
      type: "plant",
      price: 280000,
      description:
        "Cây Kim Ngân là loại cây cảnh trong nhà được trồng phổ biến trên khắp thế giới, nó có sức ảnh hưởng tới mức mà hầu như ai cũng tin rằng khi trồng có thể mang lại nhiều may mắn trong cuộc sống, công việc hoặc làm ăn.",
      categoryID: findCat("cay-canh-van-phong"),
      inStock: 30,
    },
    {
      name: "Cây lưỡi hổ Bantel Sensation chậu ươm",
      slug: "cay-luoi-ho-bantel-sensation-chau-uom",
      img: [
        "/uploads/cay-trong-nha/cay-canh-van-phong/cay-luoi-ho-bantel-sensation-chau-uom-1.jpg",
        "/uploads/cay-trong-nha/cay-canh-van-phong/cay-luoi-ho-bantel-sensation-chau-uom-2.jpg",
      ],
      type: "plant",
      price: 160000,
      description:
        "Lưỡi hổ Thái xanh mini là dòng lưỡi hổ nhỏ để bàn, có chiều cao tối đa khoảng 20cm, không có nhiều vằn như những loại lưỡi hổ khác, nhưng nó lại sở hữu bộ lá màu xanh đậm ấn tượng, mang lại nét 'cứng cáp' tự nhiên cho không gian. Chúng rất thích hợp để trên bàn làm việc, kệ trang trí hoặc làm quà tặng.",
      categoryID: findCat("cay-canh-van-phong"),
      inStock: 30,
    },
    {
      name: "Cây phát tài bộ 5 Cây thiết mộc lan",
      slug: "cay-phat-tai-bo-5-cay-thiet-moc-lan",
      img: [
        "/uploads/cay-trong-nha/cay-canh-van-phong/cay-phat-tai-bo-5-cay-thiet-moc-lan-1.jpg",
        "/uploads/cay-trong-nha/cay-canh-van-phong/cay-phat-tai-bo-5-cay-thiet-moc-lan-2.jpg",
      ],
      type: "plant",
      price: 750000,
      description:
        "Cây phát tài bộ còn được biết đến với tên gọi khác là cây thiết mộc lan. Loài cây nội thất được đánh giá là đem lại nhiều sinh khí, may mắn và thịnh vượng cho gia chủ, nhất là khi cây nở hoa là dấu hiệu tiền tài đang đến với bạn. Hơn nữa, nếu bạn đặt cây theo hướng Đông hay Đông Nam của ngôi nhà thì sẽ đem tới nhiều may mắn bởi cây là đại diện cho hành Mộc.",
      categoryID: findCat("cay-canh-van-phong"),
      inStock: 30,
    },
    {
      name: "Cây tùng bồng lai tiểu cảnh chậu sứ thổ cẩm",
      slug: "cay-tung-bong-lai-tieu-canh-chau-su-tho-cam",
      img: [
        "/uploads/cay-trong-nha/cay-canh-van-phong/cay-tung-bong-lai-tieu-canh-chau-su-tho-cam-1.jpg",
        "/uploads/cay-trong-nha/cay-canh-van-phong/cay-tung-bong-lai-tieu-canh-chau-su-tho-cam-2.jpg",
      ],
      type: "plant",
      price: 500000,
      description:
        "Cây Tùng Bông Lai là một loài cây mang vẻ đẹp trang nhã, với tán lá dầy xanh mướt trông giống như những đám mây và có kích thước nhỏ gọn nên rất thích hợp để bàn làm việc. Chúng là loài cây dễ trồng nên không cần phải tốn công chăm sóc, tuy nhiên cần đặt tại nơi có nhiều ánh sáng.\n *Giá bao gồm chậu, đĩa lót và sỏi rải mặt",
      categoryID: findCat("cay-canh-van-phong"),
      inStock: 30,
    },

    // 🌿 CÂY TRONG NHÀ
    // -- CÂY NHIỆT ĐỚI
    {
      name: "Cây cau nga mi cao 150-160cm chậu xi măng trắng",
      slug: "cay-cau-nga-mi-cao-150-160cm-chau-xi-mang-trang",
      img: [
        "/uploads/cay-trong-nha/cay-nhiet-doi/cay-cau-nga-mi-cao-150-160cm-chau-xi-mang-trang-1.jpg",
        "/uploads/cay-trong-nha/cay-nhiet-doi/cay-cau-nga-mi-cao-150-160cm-chau-xi-mang-trang-2.jpg",
      ],
      type: "plant",
      price: 1850000,
      description:
        "Cau Nga Mi là một loại cây cảnh nội thất có kích thước tương đối lớn, nhưng không quá chiếm diện tích, mang một vẻ đẹp tự nhiên giúp tạo cảm giác thư thái và thoải mái. Với bộ lá xum xuê, xanh mát và dạng rũ giúp tạo cho không gian nội thất thêm phần sang trọng, duyên dáng và vô cùng ấn tượng.",
      categoryID: findCat("cay-nhiet-doi"),
      inStock: 30,
    },
    {
      name: "Cây đuôi công sọc Calathea Sanderiana chậu gốm sứ",
      slug: "cay-duoi-cong-soc-calathea-sanderiana-chau-gom-su",
      img: [
        "/uploads/cay-trong-nha/cay-nhiet-doi/cay-duoi-cong-soc-calathea-sanderiana-chau-gom-su-1.jpg",
        "/uploads/cay-trong-nha/cay-nhiet-doi/cay-duoi-cong-soc-calathea-sanderiana-chau-gom-su-2.jpg",
      ],
      type: "plant",
      price: 230000,
      description:
        "Calathea ornata Sanderiana là loài thực vật thân thảo, có lá hình thuôn tròn, sọc trắng xanh. Loài này rất dễ sống, thường được trồng để trang trí trong nhà, thanh lọc không khí và mang ý nghĩa đem lại may mắn, thành công và thịnh vượng.",
      categoryID: findCat("cay-nhiet-doi"),
      inStock: 30,
    },
    {
      name: "Cây huyết dụ 'Mocha Latte' chậu ươm",
      slug: "cay-huyet-du-mocha-latte-chau-uom",
      img: [
        "/uploads/cay-trong-nha/cay-nhiet-doi/cay-huyet-du-mocha-latte-chau-uom-1.jpg",
        "/uploads/cay-trong-nha/cay-nhiet-doi/cay-huyet-du-mocha-latte-chau-uom-2.jpg",
      ],
      type: "plant",
      price: 120000,
      description:
        "Cây phất dụ 'Mocha Latte' là loại cây có bộ lá sặc sỡ như một tách ‘Mocha Latte’, rất thích để trồng trang trí nội thất. Với sức sống cực kỳ mãnh liệt, loại cây sẽ là một sự lựa chọn tuyệt vời dành cho những “người lưới”. Vẻ đẹp độc đáo của cây phất dụ 'bảy sắc' chắc chắn sẽ rất hút mắt những vị khách tới thăm nhà bạn.",
      categoryID: findCat("cay-nhiet-doi"),
      inStock: 30,
    },
    {
      name: "Cây tróc bạc hồng 'Neon Robusta' chậu đất nung",
      slug: "cay-troc-bac-hong-neon-robusta-chau-dat-nung",
      img: [
        "/uploads/cay-trong-nha/cay-nhiet-doi/cay-troc-bac-hong-neon-robusta-chau-dat-nung-1.jpg",
        "/uploads/cay-trong-nha/cay-nhiet-doi/cay-troc-bac-hong-neon-robusta-chau-dat-nung-2.jpg",
      ],
      type: "plant",
      price: 240000,
      description:
        "Tróc bạc hồng là loại cây có thể phát triển tốt ngay cả trong điều kiện thiếu sáng, do đó bạn sẽ không phải quá lo lắng khi trồng chúng trong nhà. Loài cây này cũng có sức sống rất khỏe mạnh, phát triển nhanh và ít cần phải chăm sóc. Cây phát triển theo dạng dây leo, hình dáng lá như mũi tên nên có tên gọi 'Arrowhead Plant' trong tiếng Anh.",
      categoryID: findCat("cay-nhiet-doi"),
      inStock: 30,
    },

    // 🌿 CÂY TRONG NHÀ
    // -- CÂY THỦY SINH
    {
      name: "Cây kim ngân thủy sinh một thân cổ thụ để bàn",
      slug: "cay-kim-ngan-thuy-sinh-mot-than-co-thu-de-ban",
      img: [
        "/uploads/cay-trong-nha/cay-thuy-sinh/cay-kim-ngan-thuy-sinh-mot-than-co-thu-de-ban-1.jpg",
        "/uploads/cay-trong-nha/cay-thuy-sinh/cay-kim-ngan-thuy-sinh-mot-than-co-thu-de-ban-2.jpg",
      ],
      type: "plant",
      price: 250000,
      description:
        "Cây Kim Ngân (Pachira aquatica) là dòng cây nội thất được ưu chuộng và phổ biến nhất trên thế giới, nó được biết đến là loại cây phong thủy giúp mang lại những điều tốt lành, vận may và tiền tài tới cho gia chủ.",
      categoryID: findCat("cay-thuy-sinh"),
      inStock: 30,
    },
    {
      name: "Cây lưỡi hổ xanh mini 'Black Gold' thủy sinh",
      slug: "cay-luoi-ho-xanh-mini-black-gold-thuy-sinh",
      img: [
        "/uploads/cay-trong-nha/cay-thuy-sinh/cay-luoi-ho-xanh-mini-black-gold-thuy-sinh-1.jpg",
        "/uploads/cay-trong-nha/cay-thuy-sinh/cay-luoi-ho-xanh-mini-black-gold-thuy-sinh-2.jpg",
      ],
      type: "plant",
      price: 220000,
      description:
        "Lưỡi hổ Thái xanh mini là dòng lưỡi hổ nhỏ để bàn, có chiều cao tối đa khoảng 20cm, không có nhiều vằn như những loại lưỡi hổ khác, nhưng nó lại sở hữu bộ lá màu xanh đậm ấn tượng, mang lại nét 'cứng cáp' tự nhiên cho không gian. Chúng rất thích hợp để trên bàn làm việc, kệ trang trí hoặc làm quà tặng.",
      categoryID: findCat("cay-thuy-sinh"),
      inStock: 30,
    },
    {
      name: "Cây phát tài viền vàng 'Dorado' thủy sinh",
      slug: "cay-phat-tai-vien-vang-dorado-thuy-sinh",
      img: [
        "/uploads/cay-trong-nha/cay-thuy-sinh/cay-phat-tai-vien-vang-dorado-thuy-sinh-1.jpg",
        "/uploads/cay-trong-nha/cay-thuy-sinh/cay-phat-tai-vien-vang-dorado-thuy-sinh-2.jpg",
      ],
      type: "plant",
      price: 220000,
      description:
        "Phát tài viền vàng là loại cây trồng trong nhà dễ chăm sóc, với sức sống bền bỉ và khả năng chịu râm mát cực kì tốt. Loại cây này có bộ lá màu xanh đậm, viền lá màu vàng và dáng cuộn tròn tỏa ra xung quanh, giúp mang lại màu xanh cho không gian sống. Đồng thời đây là loại cây có khả năng thanh lọc không khí rất hiệu quả.",
      categoryID: findCat("cay-thuy-sinh"),
      inStock: 30,
    },
    {
      name: "Cây vạn lộc son 'Red Star' thủy sinh",
      slug: "cay-van-loc-son-red-star-thuy-sinh",
      img: [
        "/uploads/cay-trong-nha/cay-thuy-sinh/cay-van-loc-son-red-star-thuy-sinh-1.jpg",
        "/uploads/cay-trong-nha/cay-thuy-sinh/cay-van-loc-son-red-star-thuy-sinh-2.jpg",
      ],
      type: "plant",
      price: 240000,
      description:
        "Cô tòng đuôi lươn sở hữu bộ lá nhiều màu sắc rực rỡ, cùng những đường viền hoa văn độc đáo, chúngthường được trồng trang trí cho bồn hoa, ban công hoặc trước hiên nhà. Loại cây này đôi lúc được trồng trong nhà, nhưng đòi hỏi phải trồng nơi có nhiều ánh sáng, gần cửa sổ.",
      categoryID: findCat("cay-thuy-sinh"),
      inStock: 30,
    },

    // 🌳 CÂY NGOÀI TRỜI
    // CÂY CHE PHỦ NỀN
    {
      name: "Cây bạch trinh biển chậu ươm nhỏ",
      slug: "cay-bach-trinh-bien-chau-uom-nho",
      img: [
        "/uploads/cay-ngoai-troi/cay-che-phu-nen/cay-bach-trinh-bien-chau-uom-nho.jpg",
      ],
      type: "plant",
      price: 15000,
      description:
        "Cây bạch trinh biển là loài cây có sức sống mạnh liệt, liên tục phát triển nhánh mới, ra hoa trắng xinh quanh năm và sống lâu năm nên thường được chọn để trồng tạo cảnh quan xanh mát.",
      categoryID: findCat("cay-che-phu-nen"),
      inStock: 10,
    },
    {
      name: "Cây Cúc Tần Ấn Độ Vernonia elliptica",
      slug: "cay-cuc-tan-an-do",
      img: [
        "/uploads/cay-ngoai-troi/cay-che-phu-nen/cay-cuc-tan-an-do-1.jpg",
        "/uploads/cay-ngoai-troi/cay-che-phu-nen/cay-cuc-tan-an-do-2.jpg",
      ],
      type: "plant",
      price: 90000,
      description:
        "Cúc Tần Ấn Độ là loại cây dây leo thân mềm có sức sống mạnh mẽ, phát triển nhanh và ít sâu bệnh. Rất thích hợp để trồng tạo cảnh quan trên ban công, sân thượng, cao tầng… Với tác dụng như tấm màn che tự nhiên, tô điểm cho ngôi nhà thêm xanh tươi, mát mẻ và trong lành hơn.",
      categoryID: findCat("cay-che-phu-nen"),
      inStock: 20,
    },
    {
      name: "Cây mai chỉ thiên nhỏ chậu ươm",
      slug: "cay-mai-chi-thien",
      img: [
        "/uploads/cay-ngoai-troi/cay-che-phu-nen/cay-mai-chi-thien.jpg",
      ],
      type: "plant",
      price: 40000,
      description:
        "Cây thường xuân có bộ lá xanh tươi tốt, hình dáng ấn tượng giúp mang lại không gian xanh mát. Đây là dòng cây dễ chăm đang là 'trend' được nhiều người lựa chọn trồng trang trí vườn rất đẹp.",
      categoryID: findCat("cay-che-phu-nen"),
      inStock: 40,
    },

    // 🌳 CÂY NGOÀI TRỜI
    // CÂY LEO DÀN
    {
      name: "Cây chanh bắc chậu ươm",
      slug: "cay-chanh-bac-chau-uom",
      img: [
        "/uploads/cay-ngoai-troi/cay-leo-dan/cay-chanh-bac-chau-uom-1.jpg",
        "/uploads/cay-ngoai-troi/cay-leo-dan/cay-chanh-bac-chau-uom-2.jpg",
      ],
      type: "plant",
      price: 140000,
      description:
        "Cây chanh bắc có quả không lớn, nhưng lại rất sai quả và lá được sử dụng làm gia vị quen thuộc trong gia đình Việt. Cây chanh bắc rất được ưa chuông để trồng sân vườn, sân thượng và ban công.",
      categoryID: findCat("cay-leo-dan"),
      inStock: 10,
    },
    {
      name: "Cây hoa hồng leo Soeur Emmanuelle chậu đá mài",
      slug: "cay-hoa-hong-leo-soeur-emmanuelle-chau-da-mai",
      img: [
        "/uploads/cay-ngoai-troi/cay-leo-dan/cay-hoa-hong-leo-soeur-emmanuelle-chau-da-mai-1.jpg",
        "/uploads/cay-ngoai-troi/cay-leo-dan/cay-hoa-hong-leo-soeur-emmanuelle-chau-da-mai-2.jpg",
      ],
      type: "plant",
      price: 800000,
      description:
        "Cây hoa hồng Soeur Emmanuelle phù hợp trồng tô điểm vòm cổng, cổng rào, tô điểm khuôn viên nhà, trang trí sân vườn, ban công, sân thượng,….Hoa to, màu hồng cánh sen hay tím cà đẹp mắt cùng hương thơm nồng nàn quyến rũ mang đến cho không gian sự tươi mới, sinh động và cực kỳ cuốn hút.",
      categoryID: findCat("cay-leo-dan"),
      inStock: 10,
    },
    {
      name: "Cây hoa lan hoàng dương chậu ươm",
      slug: "cay-hoa-lan-hoang-duong-chau-uom",
      img: [
        "/uploads/cay-ngoai-troi/cay-leo-dan/cay-hoa-lan-hoang-duong-chau-uom-1.jpg",
        "/uploads/cay-ngoai-troi/cay-leo-dan/cay-hoa-lan-hoang-duong-chau-uom-2.jpg",
      ],
      type: "plant",
      price: 180000,
      description:
        "Cây hoa lan hoàng dương là dòng cây thân leo, có hoa màu vàng rực rỡ, buông rủ như những tầm rèm vàng đẹp mắt. Chúng thường được trồng để phủ xanh không gian giống, thích hợp cho việc trồng trong chậu treo hoặc trồng bồn trên ban công.",
      categoryID: findCat("cay-leo-dan"),
      inStock: 10,
    },
    {
      name: "Cây nho thân gỗ 12 vụ chậu ươm",
      slug: "cay-nho-than-go-12-vu-chau-uom",
      img: [
        "/uploads/cay-ngoai-troi/cay-leo-dan/cay-nho-than-go-12-vu-chau-uom-1.jpg",
        "/uploads/cay-ngoai-troi/cay-leo-dan/cay-nho-than-go-12-vu-chau-uom-2.jpg",
      ],
      type: "plant",
      price: 250000,
      description:
        "Nho thân gỗ có trái màu đỏ, vị ngọt thanh mát, nhiều nước. Có thể dùng ăn sống hoặc dùng làm mứt hoặc để lên men làm rượu, còn trái khô có thể dùng để chữa bệnh hen và tiêu chảy.",
      categoryID: findCat("cay-leo-dan"),
      inStock: 10,
    },

    // 🌳 CÂY NGOÀI TRỜI
    // CÂY TẦM TRUNG
    {
      name: "Cây Bò Cạp Vàng",
      slug: "cay-bo-cap-vang",
      img: [
        "/uploads/cay-ngoai-troi/cay-tam-trung/cay-bo-cap-vang-1.jpg",
        "/uploads/cay-ngoai-troi/cay-tam-trung/cay-bo-cap-vang-2.jpg",
      ],
      type: "plant",
      price: 4500000,
      description:
        "Bò cạp vàng còn có tên là Muồng hoàng hậu, Hoa lồng đèn, Bò cạp nước, muồng hoàng yến, cây Osaka vàng, Mai dây, Cây xuân muộn, Mai nở muộn, thuộc phân họ Vang của họ Đậu (Fabaceae). Loài hoa này có nguồn gốc từ miền nam châu Á. Đây là loài cây trung tính; thiên về ưa sáng; mọc nhanh; chịu hạn tốt; cây con ưa bóng nhẹ.",
      categoryID: findCat("cay-tam-trung"),
      inStock: 10,
    },
    {
      name: "Cây Chuông Vàng",
      slug: "cay-chuong-vang",
      img: [
        "/uploads/cay-ngoai-troi/cay-tam-trung/cay-chuong-vang-1.jpg",
        "/uploads/cay-ngoai-troi/cay-tam-trung/cay-chuong-vang-2.jpg",
      ],
      type: "plant",
      price: 1800000,
      description:
        "Cây chuông vàng hay còn gọi là cây huỳnh liên là loại cây bông hoa lớn có thể làm cây che nắng, vừa là cây tạo cảnh quan đẹp, thường được trồng ở các công viên, vỉa hè, khuôn viên biệt thự,đường phố không gian công cộng khác ….",
      categoryID: findCat("cay-tam-trung"),
      inStock: 10,
    },
    {
      name: "Cây Hải đường chậu sứ trắng có họa tiết Camellia amplexicaulis",
      slug: "cay-hai-duong-chau-su-trang-co-hoa-tiet-camellia-amplexicaulis",
      img: [
        "/uploads/cay-ngoai-troi/cay-tam-trung/cay-hai-duong-chau-su-trang-co-hoa-tiet-camellia-amplexicaulis-1.jpg",
        "/uploads/cay-ngoai-troi/cay-tam-trung/cay-hai-duong-chau-su-trang-co-hoa-tiet-camellia-amplexicaulis-2.jpg",
      ],
      type: "plant",
      price: 1050000,
      description:
        "Hàng năm, cứ dịp tết đến xuân sang, cây hoa hải đường lại được nhiều gia đình lựa chọn đặt ở vị trí trang trọng của nhà mình. Mỗi bông hoa đỏ thắm, rực rỡ và tươi tắn như chào đón mùa xuân và hứa hẹn một năm mới nhiều điều may mắn, an lành",
      categoryID: findCat("cay-tam-trung"),
      inStock: 10,
    },
    {
      name: "Cây Kèn Hồng",
      slug: "cay-ken-hong",
      img: [
        "/uploads/cay-ngoai-troi/cay-tam-trung/cay-ken-hong-1.jpg",
        "/uploads/cay-ngoai-troi/cay-tam-trung/cay-ken-hong-2.jpg",
      ],
      type: "plant",
      price: 1050000,
      description:
        "Cây Kèn Hồng (hay còn gọi là cây Chuông Hồng) là một loài cây thân gỗ, hoa đẹp, thường được trồng làm cây cảnh quan, cây bóng mát ở các khu đô thị và đường phố.",
      categoryID: findCat("cay-tam-trung"),
      inStock: 10,
    },

    // 🌳 CÂY NGOÀI TRỜI
    // CÂY THÂN ĐỐT
    {
      name: "Cây tre vàng Bambusa vulgaris",
      slug: "cay-tre-vang-bambusa-vulgaris",
      img: [
        "/uploads/cay-ngoai-troi/cay-than-dot/cay-tre-vang-bambusa-vulgaris-1.jpg",
        "/uploads/cay-ngoai-troi/cay-than-dot/cay-tre-vang-bambusa-vulgaris-2.jpg",
      ],
      type: "plant",
      price: 120000,
      description:
        "Tre Vàng là một loại cây ngoại cảnh được trồng thành khóm để trang trí sân vườn, hàng rào, sát tường hoặc dọc lối đi vào nhà giúp tạo không gian xanh mát, tô điểm thêm cho ngôi nhà và mang những ý nghĩa tốt đẹp trong phong thủy.",
      categoryID: findCat("cay-than-dot"),
      inStock: 10,
    },
    {
      name: "Cây trúc cần câu Phyllostachys aurea",
      slug: "cay-truc-can-cau-phyllostachys-aurea",
      img: [
        "/uploads/cay-ngoai-troi/cay-than-dot/cay-truc-can-cau-phyllostachys-aurea-1.jpg",
        "/uploads/cay-ngoai-troi/cay-than-dot/cay-truc-can-cau-phyllostachys-aurea-2.jpg",
      ],
      type: "plant",
      price: 150000,
      description:
        "Trúc Cần Câu là một loại cây ngoại cảnh được trồng thành khóm để trang trí sân vườn, hàng rào, sát tường hoặc dọc lối đi vào nhà giúp tạo không gian xanh mát, tô điểm thêm cho ngôi nhà và mang những ý nghĩa tốt đẹp trong phong thủy.",
      categoryID: findCat("cay-than-dot"),
      inStock: 10,
    },
    {
      name: "Cây Trúc Quân Tử Bambusa multiplex",
      slug: "cay-truc-quan-tu",
      img: [
        "/uploads/cay-ngoai-troi/cay-than-dot/cay-truc-quan-tu-1.jpg",
        "/uploads/cay-ngoai-troi/cay-than-dot/cay-truc-quan-tu-2.jpg",
      ],
      type: "plant",
      price: 160000,
      description:
        "Trúc Quân Tử là một loại cây ngoại cảnh được trồng thành khóm để trang trí sân vườn, hàng rào, sát tường hoặc dọc lối đi vào nhà giúp tạo không gian xanh mát, tô điểm thêm cho ngôi nhà và mang những ý nghĩa tốt đẹp trong phong thủy.",
      categoryID: findCat("cay-than-dot"),
      inStock: 10,
    },

    // 🪴 CHẬU CÂY (có variants)
    // CHẬU ĐẤT NUNG
    {
      name: "Chậu đất nung tròn bầu họa tiết hoa cúc",
      slug: "chau-dat-nung-tron-bau-hoa-tiet-hoa-cuc",
      img: [
        "/uploads/chau-cay/chau-dat-nung/chau-dat-nung-tron-bau-hoa-tiet-hoa-cuc-1.jpg",
      ],
      type: "pot",
      price: 60000,
      description:
        "*Ghi chú: Sản phẩm là hàng thủ công mỹ nghệ nên không thể hoàn hảo tuyệt đối, thông số kích thước có thể sai sót 5% đến 10%",
      categoryID: findCat("chau-dat-nung"),
      variants: [
        {
          variantName: "16x13",
          size: "16x13",
          stock: 10,
          price: 60000,
          variantImg:
            "/uploads/chau-cay/chau-dat-nung/chau-dat-nung-tron-bau-hoa-tiet-hoa-cuc-2.jpg",
        },
        {
          variantName: "19x16",
          size: "19x16",
          stock: 15,
          price: 120000,
          variantImg:
            "/uploads/chau-cay/chau-dat-nung/chau-dat-nung-tron-bau-hoa-tiet-hoa-cuc-4.jpg",
        },
        {
          variantName: "32x25",
          size: "32x25",
          stock: 5,
          price: 180000,
          variantImg:
            "/uploads/chau-cay/chau-dat-nung/chau-dat-nung-tron-bau-hoa-tiet-hoa-cuc-3.jpg",
        },
      ],
    },
    {
      name: "Chậu đất nung trụ đứng trơn",
      slug: "chau-dat-nung-tru-dung-tron",
      img: [
        "/uploads/chau-cay/chau-dat-nung/chau-dat-nung-tru-dung-tron-1.jpg",
        "/uploads/chau-cay/chau-dat-nung/chau-dat-nung-tru-dung-tron-2.jpg",
      ],
      type: "pot",
      price: 20000,
      description:
        "*Ghi chú: Sản phẩm là hàng thủ công mỹ nghệ nên không thể hoàn hảo tuyệt đối, thông số kích thước có thể sai sót 5% đến 10%",
      categoryID: findCat("chau-dat-nung"),
      variants: [
        {
          variantName: "11x11",
          size: "11x11",
          stock: 10,
          price: 20000,
          variantImg:
            "/uploads/chau-cay/chau-dat-nung/chau-dat-nung-tru-dung-tron-2.jpg",
        },
        {
          variantName: "15x15",
          size: "15x15",
          stock: 20,
          price: 35000,
          variantImg:
            "/uploads/chau-cay/chau-dat-nung/chau-dat-nung-tru-dung-tron-2.jpg",
        },
        {
          variantName: "20x20",
          size: "20x20",
          stock: 5,
          price: 85000,
          variantImg:
            "/uploads/chau-cay/chau-dat-nung/chau-dat-nung-tru-dung-tron-2.jpg",
        },
        {
          variantName: "25x25",
          size: "25x25",
          stock: 15,
          price: 125000,
          variantImg:
            "/uploads/chau-cay/chau-dat-nung/chau-dat-nung-tru-dung-tron-2.jpg",
        },
      ],
    },
    {
      name: "Chậu đất nung trụ tròn họa tiết thổ cẩm",
      slug: "chau-dat-nung-tru-tron-hoa-tiet-tho-cam",
      img: [
        "/uploads/chau-cay/chau-dat-nung/chau-dat-nung-tru-tron-hoa-tiet-tho-cam-1.jpg",
        "/uploads/chau-cay/chau-dat-nung/chau-dat-nung-tru-tron-hoa-tiet-tho-cam-2.jpg",
        "/uploads/chau-cay/chau-dat-nung/chau-dat-nung-tru-tron-hoa-tiet-tho-cam-3.jpg",
      ],
      type: "pot",
      price: 85000,
      description:
        "*Ghi chú: Sản phẩm là hàng thủ công mỹ nghệ nên không thể hoàn hảo tuyệt đối, thông số kích thước có thể sai sót 5% đến 10%",
      categoryID: findCat("chau-dat-nung"),
      variants: [
        {
          variantName: "18x15",
          size: "18x15",
          stock: 50,
          price: 85000,
          variantImg:
            "/uploads/chau-cay/chau-dat-nung/chau-dat-nung-tru-tron-hoa-tiet-tho-cam-3.jpg",
        },
        {
          variantName: "25x20",
          size: "25x20",
          stock: 25,
          price: 145000,
          variantImg:
            "/uploads/chau-cay/chau-dat-nung/chau-dat-nung-tru-tron-hoa-tiet-tho-cam-1.jpg",
        },
      ],
    },
    {
      name: "Chậu đất nung wax xám họa tiết hoa",
      slug: "chau-dat-nung-wax-xam-hoa-tiet-hoa",
      img: [
        "/uploads/chau-cay/chau-dat-nung/chau-dat-nung-wax-xam-hoa-tiet-hoa-1.jpg",
        "/uploads/chau-cay/chau-dat-nung/chau-dat-nung-wax-xam-hoa-tiet-hoa-2.jpg",
        "/uploads/chau-cay/chau-dat-nung/chau-dat-nung-wax-xam-hoa-tiet-hoa-3.jpg",
        "/uploads/chau-cay/chau-dat-nung/chau-dat-nung-wax-xam-hoa-tiet-hoa-3.jpg",
      ],
      type: "pot",
      price: 60000,
      description:
        "*Ghi chú: Sản phẩm là hàng thủ công mỹ nghệ nên không thể hoàn hảo tuyệt đối, thông số kích thước có thể sai sót 5% đến 10%",
      categoryID: findCat("chau-dat-nung"),
      variants: [
        {
          variantName: "18x18x12",
          size: "18x18x12",
          stock: 18,
          price: 60000,
          variantImg:
            "/uploads/chau-cay/chau-dat-nung/chau-dat-nung-wax-xam-hoa-tiet-hoa-1.jpg",
        },
        {
          variantName: "23x23x15",
          size: "23x23x15",
          stock: 30,
          price: 100000,
          variantImg:
            "/uploads/chau-cay/chau-dat-nung/chau-dat-nung-wax-xam-hoa-tiet-hoa-3.jpg",
        },
        {
          variantName: "30x30x20",
          size: "30x30x20",
          stock: 6,
          price: 180000,
          variantImg:
            "/uploads/chau-cay/chau-dat-nung/chau-dat-nung-wax-xam-hoa-tiet-hoa-2.jpg",
        },
      ],
    },

    // 🪴 CHẬU CÂY (có variants)
    // CHẬU GỐM SỨ
    {
      name: "Chậu gốm sứ hình khối vân gợn sóng màu trắng",
      slug: "chau-gom-su-hinh-khoi-van-gon-song-mau-trang",
      img: [
        "/uploads/chau-cay/chau-gom-su/chau-gom-su-hinh-khoi-van-gon-song-mau-trang-1.jpg",
        "/uploads/chau-cay/chau-gom-su/chau-gom-su-hinh-khoi-van-gon-song-mau-trang-2.jpg",
        "/uploads/chau-cay/chau-gom-su/chau-gom-su-hinh-khoi-van-gon-song-mau-trang-3.jpg",
        "/uploads/chau-cay/chau-gom-su/chau-gom-su-hinh-khoi-van-gon-song-mau-trang-4.jpg",
      ],
      type: "pot",
      price: 80000,
      description:
        "*Ghi chú: Sản phẩm là hàng thủ công mỹ nghệ nên không thể hoàn hảo tuyệt đối, thông số kích thước có thể sai sót 5% đến 10%",
      categoryID: findCat("chau-gom-su"),
      variants: [
        {
          variantName: "15x15",
          size: "15x15",
          stock: 12,
          price: 80000,
          variantImg:
            "/uploads/chau-cay/chau-gom-su/chau-gom-su-hinh-khoi-van-gon-song-mau-trang-4.jpg",
        },
        {
          variantName: "20x20",
          size: "20x20",
          stock: 15,
          price: 120000,
          variantImg:
            "/uploads/chau-cay/chau-gom-su/chau-gom-su-hinh-khoi-van-gon-song-mau-trang-3.jpg",
        },
        {
          variantName: "25x25",
          size: "25x25",
          stock: 5,
          price: 150000,
          variantImg:
            "/uploads/chau-cay/chau-gom-su/chau-gom-su-hinh-khoi-van-gon-song-mau-trang-1.jpg",
        },
      ],
    },
    {
      name: "Chậu gốm sứ hình trụ họa tiết Geometric",
      slug: "chau-gom-su-hinh-tru-hoa-tiet-geometric",
      img: [
        "/uploads/chau-cay/chau-gom-su/chau-gom-su-hinh-tru-hoa-tiet-geometric-1.jpg",
        "/uploads/chau-cay/chau-gom-su/chau-gom-su-hinh-tru-hoa-tiet-geometric-2.jpg",
        "/uploads/chau-cay/chau-gom-su/chau-gom-su-hinh-tru-hoa-tiet-geometric-3.jpg",
        "/uploads/chau-cay/chau-gom-su/chau-gom-su-hinh-tru-hoa-tiet-geometric-4.jpg",
      ],
      type: "pot",
      price: 80000,
      description:
        "Chậu gốm sứ hình trụ mang vẻ đẹp nổi bật bởi những đường nét hình học thú vị, chặt chẽ và thống nhất. Nét đẹp mang phong cách Geometric của chậu gốm sẽ là điểm nhấn tuyệt vời cho không gian sống, và là một 'ngôi nhà' xinh xẻo cho 'chiếc cây' xanh xanh của bạn.",
      categoryID: findCat("chau-gom-su"),
      variants: [
        {
          variantName: "13x13",
          size: "13x13",
          stock: 12,
          price: 80000,
          variantImg:
            "/uploads/chau-cay/chau-gom-su/chau-gom-su-hinh-tru-hoa-tiet-geometric-4.jpg",
        },
        {
          variantName: "20x18",
          size: "20x18",
          stock: 15,
          price: 120000,
          variantImg:
            "/uploads/chau-cay/chau-gom-su/chau-gom-su-hinh-tru-hoa-tiet-geometric-3.jpg",
        },
        {
          variantName: "25x24",
          size: "25x24",
          stock: 5,
          price: 180000,
          variantImg:
            "/uploads/chau-cay/chau-gom-su/chau-gom-su-hinh-tru-hoa-tiet-geometric-2.jpg",
        },
      ],
    },
    {
      name: "Chậu gốm sứ họa tiết lá Monstera có dĩa",
      slug: "chau-gom-su-hoa-tiet-la-monstera-co-dia",
      img: [
        "/uploads/chau-cay/chau-gom-su/chau-gom-su-hoa-tiet-la-monstera-co-dia-1.jpg",
        "/uploads/chau-cay/chau-gom-su/chau-gom-su-hoa-tiet-la-monstera-co-dia-2.jpg",
        "/uploads/chau-cay/chau-gom-su/chau-gom-su-hoa-tiet-la-monstera-co-dia-3.jpg",
        "/uploads/chau-cay/chau-gom-su/chau-gom-su-hoa-tiet-la-monstera-co-dia-4.jpg",
      ],
      type: "pot",
      price: 20000,
      description:
        "*Ghi chú: Sản phẩm là hàng thủ công mỹ nghệ nên không thể hoàn hảo tuyệt đối, thông số kích thước có thể sai sót 5% đến 10%",
      categoryID: findCat("chau-gom-su"),
      variants: [
        {
          variantName: "11x10",
          size: "11x10",
          stock: 12,
          price: 20000,
          variantImg:
            "/uploads/chau-cay/chau-gom-su/chau-gom-su-hoa-tiet-la-monstera-co-dia-4.jpg",
        },
        {
          variantName: "14x13",
          size: "14x13",
          stock: 15,
          price: 40000,
          variantImg:
            "/uploads/chau-cay/chau-gom-su/chau-gom-su-hoa-tiet-la-monstera-co-dia-3.jpg",
        },
        {
          variantName: "17x16",
          size: "17x16",
          stock: 5,
          price: 60000,
          variantImg:
            "/uploads/chau-cay/chau-gom-su/chau-gom-su-hoa-tiet-la-monstera-co-dia-2.jpg",
        },
      ],
    },

    // 🪴 CHẬU CÂY (có variants)
    // KIỂU CHẬU VUÔNG
    {
      name: "Chậu Xi Măng Đá Mài Hình Vuông Trụ",
      slug: "chau-xi-mang-da-mai-hinh-vuong-tru",
      img: [
        "/uploads/chau-cay/kieu-chau-vuong/chau-xi-mang-da-mai-hinh-vuong-tru-1.jpg",
        "/uploads/chau-cay/kieu-chau-vuong/chau-xi-mang-da-mai-hinh-vuong-tru-2.jpg",
      ],
      type: "pot",
      price: 370000,
      description:
        "*Ghi chú: Sản phẩm là hàng thủ công mỹ nghệ nên không thể hoàn hảo tuyệt đối, thông số kích thước có thể sai sót 5% đến 10%",
      categoryID: findCat("kieu-chau-vuong"),
      variants: [
        {
          variantName: "25x50",
          size: "25x50",
          stock: 12,
          price: 370000,
          variantImg:
            "/uploads/chau-cay/kieu-chau-vuong/chau-xi-mang-da-mai-hinh-vuong-tru-2.jpg",
        },
        {
          variantName: "30x50",
          size: "30x50",
          stock: 15,
          price: 420000,
          variantImg:
            "/uploads/chau-cay/kieu-chau-vuong/chau-xi-mang-da-mai-hinh-vuong-tru-2.jpg",
        },
        {
          variantName: "30x60",
          size: "30x60",
          stock: 5,
          price: 480000,
          variantImg:
            "/uploads/chau-cay/kieu-chau-vuong/chau-xi-mang-da-mai-hinh-vuong-tru-2.jpg",
        },
      ],
    },
    {
      name: "Chậu Xi Măng Đá Mài Trụ Vuông Vát Đáy",
      slug: "chau-xi-mang-da-mai-tru-vuong-vat-day",
      img: [
        "/uploads/chau-cay/kieu-chau-vuong/chau-xi-mang-da-mai-tru-vuong-vat-day-1.jpg",
        "/uploads/chau-cay/kieu-chau-vuong/chau-xi-mang-da-mai-tru-vuong-vat-day-2.jpg",
      ],
      type: "pot",
      price: 460000,
      description:
        "*Ghi chú: Sản phẩm là hàng thủ công mỹ nghệ nên không thể hoàn hảo tuyệt đối, thông số kích thước có thể sai sót 5% đến 10%",
      categoryID: findCat("kieu-chau-vuong"),
      variants: [
        {
          variantName: "28x45",
          size: "28x45",
          stock: 12,
          price: 460000,
          variantImg:
            "/uploads/chau-cay/kieu-chau-vuong/chau-xi-mang-da-mai-tru-vuong-vat-day-2.jpg",
        },
        {
          variantName: "32x55",
          size: "32x55",
          stock: 15,
          price: 550000,
          variantImg:
            "/uploads/chau-cay/kieu-chau-vuong/chau-xi-mang-da-mai-tru-vuong-vat-day-2.jpg",
        },
        {
          variantName: "36x45",
          size: "36x45",
          stock: 5,
          price: 620000,
          variantImg:
            "/uploads/chau-cay/kieu-chau-vuong/chau-xi-mang-da-mai-tru-vuong-vat-day-2.jpg",
        },
      ],
    },
    {
      name: "Chậu Xi Măng Đá Mài Vuông",
      slug: "chau-xi-mang-da-mai-vuong",
      img: [
        "/uploads/chau-cay/kieu-chau-vuong/chau-xi-mang-da-mai-vuong-1.jpg",
        "/uploads/chau-cay/kieu-chau-vuong/chau-xi-mang-da-mai-vuong-2.jpg",
      ],
      type: "pot",
      price: 140000,
      description:
        "*Ghi chú: Sản phẩm là hàng thủ công mỹ nghệ nên không thể hoàn hảo tuyệt đối, thông số kích thước có thể sai sót 5% đến 10%",
      categoryID: findCat("kieu-chau-vuong"),
      variants: [
        {
          variantName: "20x20",
          size: "20x20",
          stock: 12,
          price: 140000,
          variantImg:
            "/uploads/chau-cay/kieu-chau-vuong/chau-xi-mang-da-mai-vuong-2.jpg",
        },
        {
          variantName: "25x25",
          size: "25x25",
          stock: 15,
          price: 175000,
          variantImg:
            "/uploads/chau-cay/kieu-chau-vuong/chau-xi-mang-da-mai-vuong-2.jpg",
        },
        {
          variantName: "30x30",
          size: "30x30",
          stock: 5,
          price: 220000,
          variantImg:
            "/uploads/chau-cay/kieu-chau-vuong/chau-xi-mang-da-mai-vuong-2.jpg",
        },
      ],
    },
  ];

  const categoryMapById = categories.reduce((acc, cat) => {
    acc[cat._id.toString()] = cat;
    return acc;
  }, {});

  const normalizedProducts = products
    .map((product) => {
      const category = categoryMapById[product.categoryID?.toString()];
      if (!category) {
        console.warn(`⚠️ Không tìm thấy category cho sản phẩm "${product.name}".`);
        return null;
      }

      const productType = category.productType || "indoor";
      const variants = createVariants(product, category);
      const brand = BRAND_BY_TYPE[productType] || "Cây Cảnh Shop";

      return {
        ...product,
        type: productType,
        categoryID: category._id,
        brand,
        tags: buildTags(category, product.name),
        variants,
        price: variants[variants.length - 1].price,
        inStock: variants.reduce((sum, v) => sum + (v.stock || 0), 0),
      };
    })
    .filter(Boolean);

  if (!normalizedProducts.length) {
    console.log("⚠️ Không có sản phẩm hợp lệ để seed.");
    return;
  }

  await Product.insertMany(normalizedProducts);
  console.log(`✅ Seed ${normalizedProducts.length} sản phẩm hoàn tất!`);
}

module.exports = { seedProducts };
