import { useNavigate } from "react-router-dom";
const Page = () => {
  const navigate = useNavigate();
  return (
    <div className="px-4 py-8 text-center">
      <h2 className="font-serif text-2xl text-foreground mb-4">DealHistory</h2>
      <p className="text-muted-foreground mb-4">Сторінка в розробці.</p>
      <button onClick={() => navigate(-1)} className="px-4 py-2 bg-accent text-white rounded-lg text-sm">← Назад</button>
    </div>
  );
};
export default Page;
