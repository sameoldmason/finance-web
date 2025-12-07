import { useEffect, useState } from "react";
import { listProfiles } from "../lib/profiles";
import Welcome from "./Welcome";
import ChooseProfile from "./ChooseProfile";

// Decides what to show at "/"
export default function Landing() {
  const [hasProfiles, setHasProfiles] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      setHasProfiles(listProfiles().length > 0);
    } catch {
      setHasProfiles(false);
    }
  }, []);

  // brief mount - avoid flash while checking storage
  if (hasProfiles === null) return null;

  // If profiles exist, show profile picker; otherwise, show first-time Welcome
  return hasProfiles ? <ChooseProfile /> : <Welcome />;
}
