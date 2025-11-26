import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { listProfiles } from "../lib/profiles";

// Decides where "/" should go
export default function Landing() {
  const [hasProfiles, setHasProfiles] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      setHasProfiles(listProfiles().length > 0);
    } catch {
      setHasProfiles(false);
    }
  }, []);

  if (hasProfiles === null) return null; // brief mount—no flash

  return hasProfiles ? <Navigate to="/profiles" replace /> : <Navigate to="/welcome" replace />;
}
