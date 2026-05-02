import React, { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import apiClient from "../../services/apiClient";
import { consumeSavedAuthRedirect } from "../../utils/authRedirect";

const GoogleCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const token = searchParams.get("token");

  useEffect(() => {
    const finalizeGoogleLogin = async () => {
      try {
        let authPayload;

        if (token) {
          const response = await apiClient.get("/auth/me", {
            headers: { Authorization: `Bearer ${token}` }
          });

          authPayload = {
            token,
            user: response.data?.user
          };
        } else {
          const response = await apiClient.get("/auth/google/session");
          authPayload = response.data;
        }

        const user = authPayload?.user;
        const resolvedToken = authPayload?.token;

        if (!user || !resolvedToken) {
          navigate("/login", { replace: true });
          return;
        }

        login(user, resolvedToken);

        if (user.isAdmin) {
          navigate("/admin/dashboard", { replace: true });
          return;
        }

        const redirect = consumeSavedAuthRedirect();
        if (redirect?.to) {
          navigate(redirect.to, { replace: true, state: redirect.state });
          return;
        }

        navigate("/", { replace: true });
      } catch (error) {
        navigate("/login", { replace: true });
      }
    };

    finalizeGoogleLogin();
  }, [token, login, navigate]);

  return (
    <div className="flex justify-center items-center h-screen">
      <div className="text-xl">Processing Login...</div>
    </div>
  );
};

export default GoogleCallback;
