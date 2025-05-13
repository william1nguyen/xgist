import React, { useState } from "react";
import { Save, X, Loader, User, Trash2 } from "lucide-react";
import { Button } from "../ui/Button";

interface MediaEditActionsProps {
  isSaving: boolean;
  onSave: () => void;
  onCancel: () => void;
  onDelete: () => void;
}

export const MediaEditActions: React.FC<MediaEditActionsProps> = ({
  isSaving,
  onSave,
  onCancel,
  onDelete,
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = () => {
    onDelete();
    setShowDeleteConfirm(false);
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
  };

  return (
    <>
      <div className="mt-8 flex justify-between">
        <div className="flex space-x-3">
          <Button
            variant="outline"
            onClick={handleDeleteClick}
            leftIcon={<Trash2 size={16} />}
            className="text-red-600 hover:text-red-700 border-red-600 hover:border-red-700"
          >
            Delete
          </Button>
        </div>

        <div className="flex space-x-3">
          <Button
            variant="outline"
            onClick={onCancel}
            leftIcon={<X size={16} />}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={onSave}
            disabled={isSaving}
            leftIcon={
              isSaving ? (
                <Loader size={16} className="animate-spin" />
              ) : (
                <Save size={16} />
              )
            }
          >
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-black mb-4">
              Delete Media
            </h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this media? This action cannot be
              undone.
            </p>
            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={handleCancelDelete}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleConfirmDelete}
                className="flex-1 bg-red-600 hover:bg-red-700"
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
