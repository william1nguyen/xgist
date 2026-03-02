import "react-toastify/dist/ReactToastify.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ToastContainer } from "react-toastify";

import { CreateSummaryPage } from "./pages/CreateSummaryPage";
import { GuidePage } from "./pages/GuidePage";
import { LandingPage } from "./pages/LandingPage";
import { LibraryPage } from "./pages/LibraryPage";
import { MainVideoPage } from "./pages/MainVideoPage";
import { SettingsPage } from "./pages/SettingPage";
import { TrendingPage } from "./pages/TrendingPage";
import { VideoDetailPage } from "./pages/VideoDetailPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/explore" element={<MainVideoPage />} />
        <Route path="/guide" element={<GuidePage />} />
        <Route path="/trending" element={<TrendingPage />} />
        <Route path="/summarize" element={<CreateSummaryPage />} />
        <Route path="/library" element={<LibraryPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/videos/:id" element={<VideoDetailPage />} />
      </Routes>
      <ToastContainer />
    </BrowserRouter>
  );
}

export default App;
