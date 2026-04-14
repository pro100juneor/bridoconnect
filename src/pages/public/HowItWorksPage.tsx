import { Link } from "react-router-dom";
const Page = () => (
  <div className="max-w-4xl mx-auto px-6 py-20 text-center">
    <h1 className="font-serif text-4xl text-foreground mb-4">HowItWorks</h1>
    <p className="text-muted-foreground mb-8">Сторінка в розробці.</p>
    <Link to="/" className="inline-flex px-6 py-3 bg-accent text-white rounded-xl font-semibold">← На головну</Link>
  </div>
);
export default Page;
