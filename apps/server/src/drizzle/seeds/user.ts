import { db } from "../db";
import { userTable } from "../schema/user";

export const seedUserData = async () => {
  const users = [
    {
      id: "d9d86a80-93e3-4f91-b8e7-d53a6d6f6220",
      keycloakUserId: "29b9d7cf-15ff-472f-adc0-07a64aa66d38",
      username: "demo",
      email: "demo@gmail.com",
      createdTime: new Date("2023-01-15T10:30:00Z"),
      updatedTime: new Date("2023-01-15T10:30:00Z"),
      deletedTime: null,
    },
    {
      id: "a1b2c3d4-e5f6-4a5b-8c9d-1e2f3a4b5c6d",
      keycloakUserId: "f7e6d5c4-b3a2-4321-9876-5a4b3c2d1e0f",
      username: "nguyenvan",
      email: "nguyenvan@example.com",
      createdTime: new Date("2023-01-15T10:30:00Z"),
      updatedTime: new Date("2023-01-15T10:30:00Z"),
      deletedTime: null,
    },
    {
      id: "b2c3d4e5-f6a7-5b6c-9d0e-2f3a4b5c6d7e",
      keycloakUserId: "e5d4c3b2-a1f0-4321-8765-4a3b2c1d0e9f",
      username: "tranthithanh",
      email: "tranthithanh@example.com",
      createdTime: new Date("2023-02-20T08:15:00Z"),
      updatedTime: new Date("2023-02-20T08:15:00Z"),
      deletedTime: null,
    },
    {
      id: "c3d4e5f6-a7b8-6c7d-0e1f-3a4b5c6d7e8f",
      keycloakUserId: "d4c3b2a1-9876-5432-1098-3a2b1c0d9e8f",
      username: "leduchoa",
      email: "leduchoa@example.com",
      createdTime: new Date("2023-03-10T14:45:00Z"),
      updatedTime: new Date("2023-03-10T14:45:00Z"),
      deletedTime: null,
    },
  ];

  await db.insert(userTable).values(users).onConflictDoNothing();
};
