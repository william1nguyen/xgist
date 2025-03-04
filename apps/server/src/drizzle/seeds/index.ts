import { closeDb } from "../db";
import { seedBookmarkData } from "./bookmark";
import { seedLikeData } from "./like";
import { seedUserData } from "./user";
import { seedVideoData } from "./video";

export const seedData = async () => {
  await seedUserData();
  await seedVideoData();
  await seedLikeData();
  await seedBookmarkData();
  await closeDb();
};

await seedData();
