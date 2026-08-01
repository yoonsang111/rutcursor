const baseUrl = 'http://localhost:3102/api';

const normalize = (value) => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
const arr = (value) => (Array.isArray(value) ? value : []);

const run = async () => {
  const [products, categories, locations] = await Promise.all([
    fetch(`${baseUrl}/products`).then((r) => r.json()),
    fetch(`${baseUrl}/categories`).then((r) => r.json()),
    fetch(`${baseUrl}/locations`).then((r) => r.json()),
  ]);

  const dupSig = new Map();
  for (const p of products) {
    const signature = [
      normalize(p.name),
      JSON.stringify(arr(p.categories).slice().sort()),
      JSON.stringify(arr(p.locations).slice().sort()),
      normalize(p.externalUrl1),
    ].join('|');
    dupSig.set(signature, (dupSig.get(signature) || 0) + 1);
  }

  const duplicateGroups = [...dupSig.values()].filter((n) => n > 1).length;
  const missingCategories = products.filter((p) => arr(p.categories).length === 0).length;
  const missingLocations = products.filter((p) => arr(p.locations).length === 0).length;
  const missingPrimaryLink = products.filter((p) => !String(p.externalUrl1 || '').trim()).length;
  const missingPrice = products.filter((p) => p.price === undefined && p.minPrice === undefined && p.salePrice === undefined).length;

  const report = {
    products: products.length,
    mainCategories: arr(categories.mainCategories).length,
    subCategories: arr(categories.subCategories).length,
    countries: arr(locations.countries).length,
    regions: arr(locations.regions).length,
    duplicateGroups,
    missingCategories,
    missingLocations,
    missingPrimaryLink,
    missingPrice,
  };

  console.log(JSON.stringify(report, null, 2));

  const hasCritical = report.mainCategories === 0 || report.countries === 0 || report.duplicateGroups > 0;
  if (hasCritical) process.exitCode = 2;
};

run().catch((error) => {
  console.error('[local-qa-audit] failed:', error);
  process.exit(1);
});
