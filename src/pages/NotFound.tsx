import { Link } from "react-router-dom";
export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center text-center px-6">
      <div>
        <div className="font-serif text-9xl text-foreground/10 font-bold select-none">404</div>
        <h1 className="font-serif text-3xl text-foreground mb-3 -mt-4">Сторінку не знайдено</h1>
        <p className="text-muted-foreground mb-8">Такої адреси не існує або вона була переміщена.</p>
        <Link to="/" className="inline-flex px-6 py-3 bg-accent text-white rounded-xl font-semibold hover:bg-accent/90 transition-colors">← На головну</Link>
      </div>
    </div>
  );
}
