import { Link } from "react-router-dom";

const Logo = ({ light }: { light?: boolean }) => (
  <Link to="/" className="flex items-center gap-1 select-none">
    <span className={`font-serif font-bold text-xl ${light ? "text-white" : "text-foreground"}`}>
      Brido
    </span>
    <span className="font-serif font-bold text-xl text-accent">Connect</span>
  </Link>
);
export default Logo;
