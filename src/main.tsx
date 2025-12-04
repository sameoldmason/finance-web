import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./ThemeProvider";
import { ActiveProfileProvider } from "./ActiveProfileContext";
import { ToastProvider } from "./ToastContext";
import "./index.css";

// Routes
import Landing from "./routes/Landing";
import Welcome from "./routes/Welcome";
import CreateProfile from "./routes/CreateProfile";
import ChooseProfile from "./routes/ChooseProfile";
import UnlockProfile from "./routes/UnlockProfile";
import Dashboard from "./routes/Dashboard";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider>
      <ToastProvider>
        <ActiveProfileProvider>
          <BrowserRouter>
            <Routes>
              {/* Auto-redirect depending on profiles */}
              <Route path="/" element={<Landing />} />

              {/* First-time setup */}
              <Route path="/welcome" element={<Welcome />} />
              <Route path="/profiles/new" element={<CreateProfile />} />

              {/* Profile management */}
              <Route path="/profiles" element={<ChooseProfile />} />
              <Route path="/profiles/:id/unlock" element={<UnlockProfile />} />

              {/* Dashboard */}
              <Route path="/dashboard" element={<Dashboard />} />
            </Routes>
          </BrowserRouter>
        </ActiveProfileProvider>
      </ToastProvider>
    </ThemeProvider>
  </React.StrictMode>
);
