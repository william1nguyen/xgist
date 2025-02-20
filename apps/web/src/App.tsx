import { BrowserRouter, Routes, Route } from "react-router-dom";
import { MainPage } from "./pages/MainPage";
import { UploadPage } from "./pages/UploadPage";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="" element={<MainPage />} />
        <Route path="/upload" element={<UploadPage />} />
      </Routes>
      <ToastContainer />
    </BrowserRouter>
  );
}

export default App;
