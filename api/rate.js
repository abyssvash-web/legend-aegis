const { PACKAGES, getRate } = require('./_shared');
module.exports = async (req, res) => {
  const { rate, live } = await getRate();
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
  res.status(200).json({ rate, live, packages: Object.entries(PACKAGES).map(([id, p]) => ({ id, ...p })) });
};
