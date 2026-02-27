// dubai-control/src/pages/Signup.tsx

import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

export default function Signup() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Redirect to login page - the Create account tab is available there
    // Preserve any query parameters (like ?trial=standard)
    const searchParams = new URLSearchParams(location.search);
    const queryString = searchParams.toString();
    navigate(queryString ? `/? ${queryString}` : "/", { replace: true });
  }, [navigate, location.search]);

  // Show nothing while redirecting
  return null;
}
