"use client";
import VideoGrid from "./components/VideoGrid";
import Navigation from "./components/Navigation";
import Sidebar from "./components/Sidebar";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="flex pt-16">
        <Sidebar />
        <main className="flex-1 lg:ml-64">
          <div className="max-w-7xl mx-auto p-4">
            <VideoGrid />
          </div>
        </main>
      </div>
    </div>
  );
}
