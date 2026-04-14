import { Link } from "react-router-dom";
const Logo = ({ light }: { light?: boolean }) => (
  <Link to="/" className={`font-serif font-bold text-xl ${light ? "text-white" : "text-foreground"}`}>
    Brido<span className="text-accent">Connect</span>
  </Link>
);
export default Logo;
