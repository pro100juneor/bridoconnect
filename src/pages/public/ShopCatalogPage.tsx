import { Link } from "react-router-dom";
const Page = () => (
  <div className="max-w-4xl mx-auto px-6 py-20 text-center">
    <h1 className="font-serif text-4xl text-foreground mb-6">ShopCatalogPage</h1>
    <p className="text-muted-foreground mb-8">Ця сторінка скоро буде доступна.</p>
    <Link to="/" className="inline-flex px-6 py-3 bg-accent text-white rounded-xl font-semibold hover:bg-accent/90">← На головну</Link>
  </div>
);
export default Page;
