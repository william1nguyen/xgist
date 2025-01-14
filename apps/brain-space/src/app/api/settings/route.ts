import { NextResponse } from "next/server";
import { getSession } from "@auth0/nextjs-auth0";
import prisma from "@/lib/db";

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get or create user settings
    const settings = await prisma.userSettings.upsert({
      where: {
        userId: session.user.sub,
      },
      create: {
        userId: session.user.sub,
        emailNotif: true,
        commentNotif: true,
        likeNotif: true,
        mentionNotif: true,
        profileVisible: true,
        showEmail: false,
      },
      update: {},
    });

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Error fetching settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await request.json();

    const updatedSettings = await prisma.userSettings.update({
      where: {
        userId: session.user.sub,
      },
      data: {
        emailNotif: data.notifications.email,
        commentNotif: data.notifications.comments,
        likeNotif: data.notifications.likes,
        mentionNotif: data.notifications.mentions,
        profileVisible: data.privacy.profileVisible,
        showEmail: data.privacy.showEmail,
      },
    });

    return NextResponse.json(updatedSettings);
  } catch (error) {
    console.error("Error updating settings:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}
