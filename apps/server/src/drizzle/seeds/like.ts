import { db } from "../db";
import { videoLikeTable } from "../schema/video";

export const seedLikeData = async () => {
  const likes = [
    {
      id: "a7b8c9d0-e1f2-a3b4-c5d6-e7f8a9b0c1d2",
      userId: "a1b2c3d4-e5f6-4a5b-8c9d-1e2f3a4b5c6d",
      videoId: "e5f6a7b8-c9d0-8e1f-2a3b-4c5d6e7f8a9b",
      state: true,
    },
    {
      id: "b8c9d0e1-f2a3-b4c5-d6e7-f8a9b0c1d2e3",
      userId: "b2c3d4e5-f6a7-5b6c-9d0e-2f3a4b5c6d7e",
      videoId: "d4e5f6a7-b8c9-7d0e-1f2a-3b4c5d6e7f8a",
      state: true,
    },
    {
      id: "c9d0e1f2-a3b4-c5d6-e7f8-a9b0c1d2e3f4",
      userId: "c3d4e5f6-a7b8-6c7d-0e1f-3a4b5c6d7e8f",
      videoId: "d4e5f6a7-b8c9-7d0e-1f2a-3b4c5d6e7f8a",
      state: true,
    },
    {
      id: "d0e1f2a3-b4c5-d6e7-f8a9-b0c1d2e3f4a5",
      userId: "a1b2c3d4-e5f6-4a5b-8c9d-1e2f3a4b5c6d",
      videoId: "f6a7b8c9-d0e1-9f2a-3b4c-5d6e7f8a9b0c",
      state: true,
    },
    {
      id: "e1f2a3b4-c5d6-e7f8-a9b0-c1d2e3f4a5b6",
      userId: "b2c3d4e5-f6a7-5b6c-9d0e-2f3a4b5c6d7e",
      videoId: "f6a7b8c9-d0e1-9f2a-3b4c-5d6e7f8a9b0c",
      state: true,
    },
  ];

  await db.insert(videoLikeTable).values(likes).onConflictDoNothing();
};
