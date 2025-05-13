import React from "react";

interface MediaCreatorProps {
  avatar: string;
  name: string;
}

export const MediaCreator: React.FC<MediaCreatorProps> = ({ avatar, name }) => {
  if (!name) return null;

  return (
    <div className="flex items-center">
      <div className="h-6 w-6 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-medium mr-2">
        {avatar}
      </div>
      <span className="text-sm text-gray-700 truncate">{name}</span>
    </div>
  );
};
