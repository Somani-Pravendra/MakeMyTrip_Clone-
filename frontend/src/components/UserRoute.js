import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { buildAuthRedirect } from "../utils/authRedirect";

const UserRoute = ({ children }) => {
  const location = useLocation();
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    const authRedirect = buildAuthRedirect(
      `${location.pathname}${location.search}${location.hash}`,
      location.state ?? null
    );

    return <Navigate to="/login" replace state={{ authRedirect }} />;
  }

  return children;
};

export default UserRoute;
