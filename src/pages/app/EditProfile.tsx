import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";

const EditProfile = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "Користувач", city: "Берлін", country: "Німеччина",
    bio: "Хочу допомагати людям, які потребують підтримки.", phone: "+49 170 123 4567"
  });

  return (
    <div className="pb-8">
      <div className="flex items-center gap-3 px-4 pt-4 pb-4 border-b border-border">
        <button onClick={() => navigate(-1)}><ArrowLeft className="w-5 h-5 text-foreground" /></button>
        <h2 className="font-serif text-xl text-foreground flex-1">Редагувати профіль</h2>
        <button onClick={() => navigate("/app/profile")} className="text-xs text-accent font-semibold">Зберегти</button>
      </div>

      <div className="flex flex-col items-center py-6 border-b border-border">
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center text-3xl font-bold text-primary">
            BC
          </div>
          <button className="absolute -bottom-1 -right-1 w-8 h-8 bg-accent rounded-full flex items-center justify-center">
            <Camera className="w-4 h-4 text-white" />
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">Натисніть, щоб змінити фото</p>
      </div>

      <div className="px-4 py-4 space-y-4">
        {[
          { label: "Ім'я", key: "name", placeholder: "Ваше ім'я" },
          { label: "Місто", key: "city", placeholder: "Місто" },
          { label: "Країна", key: "country", placeholder: "Країна" },
          { label: "Телефон", key: "phone", placeholder: "+38 0..." },
        ].map(field => (
          <div key={field.key}>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">{field.label}</label>
            <input
              value={form[field.key as keyof typeof form]}
              onChange={e => setForm({...form, [field.key]: e.target.value})}
              placeholder={field.placeholder}
              className="w-full bg-secondary rounded-xl px-4 py-3 text-sm outline-none text-foreground"
            />
          </div>
        ))}
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Про себе</label>
          <textarea
            value={form.bio}
            onChange={e => setForm({...form, bio: e.target.value})}
            rows={3}
            className="w-full bg-secondary rounded-xl px-4 py-3 text-sm outline-none text-foreground resize-none"
          />
        </div>
        <Button className="w-full bg-accent hover:bg-accent/90 text-white" onClick={() => navigate("/app/profile")}>
          Зберегти зміни
        </Button>
      </div>
    </div>
  );
};
export default EditProfile;
