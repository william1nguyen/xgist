import React from "react";
import { User } from "lucide-react";
import { Switch } from "../ui/Switch";

interface AIPresenterSectionProps {
  hasAIPresenter: boolean;
  onToggleAIPresenter: () => void;
}

export const AIPresenterSection: React.FC<AIPresenterSectionProps> = ({
  hasAIPresenter,
  onToggleAIPresenter,
}) => {
  return (
    <div>
      <h3 className="text-lg font-medium text-black mb-2 flex items-center">
        <User size={18} className="text-indigo-500 mr-2" />
        AI Presenter
      </h3>
      <p className="text-black mb-4 text-sm">
        Enable AI presenter to automatically generate a virtual host for this
        media
      </p>

      <div className="flex items-center">
        <Switch
          checked={hasAIPresenter}
          onCheckedChange={onToggleAIPresenter}
          className="mr-3"
        />
        <span className="text-black">
          {hasAIPresenter
            ? "AI Presenter is enabled"
            : "AI Presenter is disabled"}
        </span>
      </div>

      {hasAIPresenter && (
        <div className="mt-4 text-sm bg-indigo-50 border border-indigo-100 text-indigo-700 p-4 rounded">
          The AI presenter will be generated after saving changes. This process
          may take a few minutes.
        </div>
      )}
    </div>
  );
};
