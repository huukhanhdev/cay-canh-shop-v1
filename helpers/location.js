const locations = require('../data/locations');

function normalizeLocation(city = '', district = '') {
  const cityName = city.trim();
  const districtName = district.trim();
  const cityEntry = locations.find((item) => item.name === cityName);
  if (!cityEntry) {
    return { city: '', district: '' };
  }
  const districtValid = cityEntry.districts.includes(districtName) ? districtName : '';
  return {
    city: cityEntry.name,
    district: districtValid,
  };
}

module.exports = {
  locations,
  normalizeLocation,
};
