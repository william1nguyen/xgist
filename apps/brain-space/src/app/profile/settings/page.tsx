"use client";

import { useState, useEffect } from "react";
import { useUser } from "@auth0/nextjs-auth0/client";
import SettingsLayout from "@/app/settings/SettingsLayout";
import { ToggleSwitch } from "@/app/components/common/ToggleSwitch";
import { DeleteConfirmModal } from "@/app/components/common/DeleteConfirmModal";

interface UserSettings {
  emailNotif: boolean;
  commentNotif: boolean;
  likeNotif: boolean;
  mentionNotif: boolean;
  profileVisible: boolean;
  showEmail: boolean;
}

export default function SettingsPage() {
  const { user } = useUser();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<UserSettings | null>(null);

  // Fetch settings on component mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch("/api/settings");
        if (!response.ok) throw new Error("Failed to fetch settings");
        const data = await response.json();
        setSettings(data);
      } catch (error) {
        console.error("Error fetching settings:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleSettingToggle = async (key: keyof UserSettings) => {
    if (!settings) return;

    // Optimistic update
    setSettings((prev) => (prev ? { ...prev, [key]: !prev[key] } : null));

    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          notifications: {
            email: key === "emailNotif" ? !settings[key] : settings.emailNotif,
            comments:
              key === "commentNotif" ? !settings[key] : settings.commentNotif,
            likes: key === "likeNotif" ? !settings[key] : settings.likeNotif,
            mentions:
              key === "mentionNotif" ? !settings[key] : settings.mentionNotif,
          },
          privacy: {
            profileVisible:
              key === "profileVisible"
                ? !settings[key]
                : settings.profileVisible,
            showEmail:
              key === "showEmail" ? !settings[key] : settings.showEmail,
          },
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update settings");
        // Revert optimistic update on error
        setSettings(settings);
      }
    } catch (error) {
      console.error("Error updating settings:", error);
      // Revert optimistic update on error
      setSettings(settings);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      const response = await fetch("/api/profile", {
        method: "DELETE",
      });

      if (response.ok) {
        // Redirect to logout
        window.location.href = "/api/auth/logout";
      }
    } catch (error) {
      console.error("Error deleting account:", error);
    }
  };

  if (loading) {
    return (
      <SettingsLayout>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 bg-gray-200 rounded"></div>
          ))}
        </div>
      </SettingsLayout>
    );
  }

  if (!settings) {
    return (
      <SettingsLayout>
        <div>Failed to load settings</div>
      </SettingsLayout>
    );
  }

  return (
    <SettingsLayout>
      <div className="space-y-8">
        <section className="space-y-4">
          <h3 className="text-lg font-medium">Thông báo</h3>
          <ToggleSwitch
            checked={settings.emailNotif}
            onChange={() => handleSettingToggle("emailNotif")}
            label="Email thông báo"
          />
          <ToggleSwitch
            checked={settings.commentNotif}
            onChange={() => handleSettingToggle("commentNotif")}
            label="Bình luận mới"
          />
          <ToggleSwitch
            checked={settings.likeNotif}
            onChange={() => handleSettingToggle("likeNotif")}
            label="Lượt thích mới"
          />
          <ToggleSwitch
            checked={settings.mentionNotif}
            onChange={() => handleSettingToggle("mentionNotif")}
            label="Được nhắc đến"
          />
        </section>

        <section className="space-y-4">
          <h3 className="text-lg font-medium">Quyền riêng tư</h3>
          <ToggleSwitch
            checked={settings.profileVisible}
            onChange={() => handleSettingToggle("profileVisible")}
            label="Hiển thị trang cá nhân"
          />
          <ToggleSwitch
            checked={settings.showEmail}
            onChange={() => handleSettingToggle("showEmail")}
            label="Hiển thị email"
          />
        </section>

        <section className="space-y-4">
          <h3 className="text-lg font-medium">Tài khoản</h3>
          <div className="pt-4 border-t border-gray-200">
            <button
              onClick={() => setShowDeleteModal(true)}
              className="text-red-600 hover:text-red-700"
            >
              Xóa tài khoản
            </button>
          </div>
        </section>
      </div>

      <DeleteConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteAccount}
        title="Xóa tài khoản"
        message="Bạn có chắc chắn muốn xóa tài khoản? Hành động này không thể hoàn tác."
      />
    </SettingsLayout>
  );
}
