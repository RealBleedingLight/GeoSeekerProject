export async function load({ fetch }) {
  const [countriesRes, categoriesRes] = await Promise.all([
    fetch('/api/countries'),
    fetch('/api/categories')
  ]);

  return {
    countries: await countriesRes.json(),
    categories: await categoriesRes.json()
  };
}
