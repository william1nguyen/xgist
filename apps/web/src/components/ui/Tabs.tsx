import React from "react";

type TabsContextValue = {
  value: string;
  onValueChange: (value: string) => void;
};

const TabsContext = React.createContext<TabsContextValue>({
  value: "",
  onValueChange: () => {},
});

interface TabsProps {
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
  children: React.ReactNode;
}

export const Tabs: React.FC<TabsProps> = ({
  value,
  onValueChange,
  className = "",
  children,
}) => {
  return (
    <TabsContext.Provider value={{ value, onValueChange }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
};

interface TabsListProps {
  className?: string;
  children: React.ReactNode;
}

export const TabsList: React.FC<TabsListProps> = ({
  className = "",
  children,
}) => {
  return <div className={`flex space-x-1 ${className}`}>{children}</div>;
};

interface TabsTriggerProps {
  value: string;
  className?: string;
  children: React.ReactNode;
}

export const TabsTrigger: React.FC<TabsTriggerProps> = ({
  value,
  className = "",
  children,
}) => {
  const context = React.useContext(TabsContext);

  const isActive = context.value === value;

  return (
    <button
      className={`px-4 py-2 text-sm font-medium ${
        isActive
          ? "text-indigo-600 border-b-2 border-indigo-600"
          : "text-black hover:text-indigo-600 hover:border-b-2 hover:border-indigo-200"
      } ${className}`}
      onClick={() => context.onValueChange(value)}
      type="button"
    >
      {children}
    </button>
  );
};

interface TabsContentProps {
  value: string;
  className?: string;
  children: React.ReactNode;
}

export const TabsContent: React.FC<TabsContentProps> = ({
  value,
  className = "",
  children,
}) => {
  const context = React.useContext(TabsContext);

  if (context.value !== value) {
    return null;
  }

  return <div className={className}>{children}</div>;
};
