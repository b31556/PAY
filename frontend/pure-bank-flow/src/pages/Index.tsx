import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { isAuthenticated } from "@/lib/banking-api";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect based on authentication status
    if (isAuthenticated()) {
      navigate("/dashboard");
    } else {
      navigate("/login");
    }
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-banking-primary to-banking-secondary">
      <div className="text-center text-white">
        <h1 className="text-4xl font-bold mb-4">SecureBank</h1>
        <p className="text-xl opacity-90">Redirecting...</p>
      </div>
    </div>
  );
};

export default Index;
