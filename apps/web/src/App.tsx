import "react-toastify/dist/ReactToastify.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import { LandingPage } from "./pages/LandingPage";
import { MainVideoPage } from "./pages/MainVideoPage";

import { LibraryPage } from "./pages/LibraryPage";
import { TrendingPage } from "./pages/TrendingPage";
import { SettingsPage } from "./pages/SettingPage";
import { VideoDetailPage } from "./pages/VideoDetailPage";
import { GuidePage } from "./pages/GuidePage";
import { UploadVideoPage } from "./pages/UploadVideoPage";
import { VideoEditPage } from "./pages/VideoEditPage";
import { CreatePresenterPage } from "./pages/CreatePresenterPage";
import { SummaryPage } from "./pages/SummaryPage";
import { PresenterDetailPage } from "./pages/PresenterDetail";
import { BookmarkedPage } from "./pages/BookmarkedPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/explore" element={<MainVideoPage />} />
        <Route path="/guide" element={<GuidePage />} />
        <Route path="/trending" element={<TrendingPage />} />
        <Route path="/summarize" element={<SummaryPage />} />
        <Route path="/upload" element={<UploadVideoPage />} />
        <Route path="/library" element={<LibraryPage />} />
        <Route path="/bookmark" element={<BookmarkedPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/videos/:id" element={<VideoDetailPage />} />
        <Route path="/videos/edit/:videoId" element={<VideoEditPage />} />
        <Route
          path="/videos/:videoId/create-presenter"
          element={<CreatePresenterPage />}
        />
        <Route
          path="/presenters/:presenterId"
          element={<PresenterDetailPage />}
        />
      </Routes>
      <ToastContainer />
    </BrowserRouter>
  );
}

export default App;
