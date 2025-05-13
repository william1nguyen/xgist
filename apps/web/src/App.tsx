import "react-toastify/dist/ReactToastify.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import { LandingPage } from "./pages/LandingPage";
import { CreateSummaryPage } from "./pages/CreateSummaryPage";
import { LibraryPage } from "./pages/LibraryPage";
import { VideoDetailPage } from "./pages/VideoDetailPage";
import { GuidePage } from "./pages/GuidePage";
import { VideoEditPage } from "./pages/VideoEditPage";
import { PresentationPage } from "./pages/PresentationPage";
import { AuthGate } from "./components/security/AuthGate";
import { UploadMediaPage } from "./pages/UploadMediaPage";
import { MediaEditPage } from "./pages/MediaEditPage";
import { MainPage } from "./pages/MainPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/explore" element={<MainPage />} />
        <Route path="/guide" element={<GuidePage />} />
        <Route path="/summarize" element={<CreateSummaryPage />} />
        <Route path="/upload" element={<UploadMediaPage />} />
        <Route path="/library" element={<LibraryPage />} />
        <Route path="/media/:mediaId" element={<MediaEditPage />} />
        <Route path="/videos/:id" element={<VideoDetailPage />} />
        <Route
          path="/edit/:videoId"
          element={
            <AuthGate>
              <VideoEditPage />
            </AuthGate>
          }
        />
        <Route
          path="media/:mediaId/create-presenter"
          element={
            <AuthGate>
              <PresentationPage />
            </AuthGate>
          }
        />
      </Routes>
      <ToastContainer />
    </BrowserRouter>
  );
}

export default App;
