import "react-toastify/dist/ReactToastify.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import { LandingPage } from "./pages/LandingPage";
import { MainVideoPage } from "./pages/MainVideoPage";
import { CreateSummaryPage } from "./pages/CreateSummaryPage";
import { LibraryPage } from "./pages/LibraryPage";
import { TrendingPage } from "./pages/TrendingPage";
import { SettingsPage } from "./pages/SettingPage";
import { VideoDetailPage } from "./pages/VideoDetailPage";
import { GuidePage } from "./pages/GuidePage";
import { UploadVideoPage } from "./pages/UploadVideoPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/explore" element={<MainVideoPage />} />
        <Route path="/guide" element={<GuidePage />} />
        <Route path="/trending" element={<TrendingPage />} />
        <Route path="/summarize" element={<CreateSummaryPage />} />
        <Route path="/upload" element={<UploadVideoPage />} />
        <Route path="/library" element={<LibraryPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/videos/:id" element={<VideoDetailPage />} />
      </Routes>
      <ToastContainer />
    </BrowserRouter>
  );
}

export default App;
