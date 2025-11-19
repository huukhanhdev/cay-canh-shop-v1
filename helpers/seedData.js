const { seedAdmin } = require("./seedAdmin");
const { seedCategories } = require("./seedCategories");
const { seedProducts } = require("./seedProducts");
const { seedPotDetails } = require("./seedPotDetails");
const { seedPlantDetails } = require("./seedPlantDetails");

async function runAllSeeds() {
  await seedAdmin();
  await seedCategories();
  await seedProducts();
  await seedPotDetails();
  await seedPlantDetails();
  console.log("🌿 Hoàn tất seed dữ liệu!");
}

module.exports = runAllSeeds;
