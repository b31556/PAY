import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Home } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="w-full max-w-md p-8 bg-white rounded-xl shadow-lg text-center">
        <h1 className="text-7xl font-bold text-banking-primary mb-4">404</h1>
        <p className="text-3xl font-medium text-gray-700 mb-2">Hoppá!</p>
        <p className="text-lg text-gray-600 mb-8">A keresett oldal nem található</p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild variant="outline" className="gap-2">
            <Link to="/dashboard">
              <Home size={18} />
              Főoldalra
            </Link>
          </Button>
          <Button asChild className="gap-2">
            <Link to="javascript:history.back()">
              <ArrowLeft size={18} />
              Vissza
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
