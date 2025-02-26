import React from "react";
import { ActivityItem } from "./ActivityItem";

export interface Activity {
  id: string | number;
  title: string;
  timestamp: string;
  icon: React.ReactNode;
  iconColor: "indigo" | "purple" | "green" | "blue" | "red";
}

interface ActivityListProps {
  activities: Activity[];
  title?: string;
}

export const ActivityList: React.FC<ActivityListProps> = ({
  activities,
  title,
}) => {
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
        <h4 className="font-medium text-gray-700">
          {title || "Recent Activity"}
        </h4>
      </div>
      <div className="p-4">
        <div className="space-y-4">
          {activities.map((activity) => (
            <ActivityItem
              key={activity.id}
              icon={activity.icon}
              iconColor={activity.iconColor}
              title={activity.title}
              timestamp={activity.timestamp}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
