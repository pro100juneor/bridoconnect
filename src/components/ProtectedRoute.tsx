import { Navigate } from "react-router-dom";
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};
export default ProtectedRoute;
