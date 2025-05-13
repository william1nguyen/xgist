import React from "react";
import { useParams } from "react-router-dom";
import { ChevronLeft, Loader } from "lucide-react";
import { Layout } from "../components/layout/Layout";
import { useMediaData } from "../hooks/useMediaData";
import { useMediaHandlers } from "../hooks/useMediaHandler";
import { useMediaPlayerHandlers } from "../hooks/useMediaPlayHandler";
import { MediaPlayer } from "../components/edit-media/MediaPlayer";
import { MediaInfoSection } from "../components/edit-media/MediaInfoSection";
import { MediaEditTabs } from "../components/edit-media/MediaEditTab";
import { MediaEditActions } from "../components/edit-media/MediaEditAction";

export const MediaEditPage: React.FC = () => {
  const { mediaId } = useParams<{ mediaId: string }>();
  const { state, updateState, updateMediaData } = useMediaData(mediaId);
  const handlers = useMediaHandlers(
    mediaId,
    state,
    updateState,
    updateMediaData
  );
  const playerHandlers = useMediaPlayerHandlers(
    state,
    updateState,
    updateMediaData
  );

  return (
    <Layout activeItem="settings" title="Edit Media">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <button
            onClick={handlers.handleCancel}
            className="flex items-center text-sm text-indigo-600 hover:text-indigo-800"
          >
            <ChevronLeft size={16} className="mr-1" />
            Back
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-2xl font-bold text-black mb-2">
            {state.isLoading ? "Loading..." : state.mediaData.title}
          </h1>
          <p className="text-black mb-6">Edit and manage your media content</p>

          {state.isLoading ? (
            <div className="flex justify-center items-center py-16">
              <Loader size={32} className="animate-spin text-indigo-600" />
              <span className="ml-2 text-indigo-600">Loading...</span>
            </div>
          ) : (
            <>
              {state.error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
                  {state.error}
                </div>
              )}

              {state.successMessage && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-6">
                  {state.successMessage}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
                <div className="md:col-span-1">
                  <MediaPlayer
                    url={state.mediaData.url}
                    thumbnail={state.mediaData.thumbnail}
                    isPlaying={state.isPlaying}
                    isMuted={state.isMuted}
                    onTogglePlay={playerHandlers.handleTogglePlay}
                    onToggleMute={playerHandlers.handleToggleMute}
                    onFullscreen={playerHandlers.handleFullscreen}
                    onVideoRef={playerHandlers.handleVideoRef}
                  />
                  <MediaInfoSection
                    videoRef={playerHandlers.videoRef}
                    category={state.mediaData.category}
                    description={state.mediaData.description}
                  />
                </div>

                <div className="md:col-span-2">
                  <MediaEditTabs
                    activeTab={state.activeTab}
                    mediaData={state.mediaData}
                    state={state}
                    handlers={{ ...handlers, updateState }}
                    onTabChange={(value) => updateState({ activeTab: value })}
                    onSeekToTime={playerHandlers.handleSeekToTime}
                  />

                  <MediaEditActions
                    isSaving={state.isSaving}
                    onSave={handlers.handleSave}
                    onDelete={handlers.handleDelete}
                    onCancel={handlers.handleCancel}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
};
