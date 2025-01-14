import { NextResponse } from "next/server";
import { getSession } from "@auth0/nextjs-auth0";
import prisma from "@/lib/db";

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await prisma.user.findUnique({
      where: {
        id: session.user.sub,
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        bio: true,
        website: true,
      },
    });

    if (!profile) {
      const newProfile = await prisma.user.create({
        data: {
          id: session.user.sub,
          email: session.user.email || "",
          name: session.user.name,
          avatar: session.user.picture,
        },
      });

      return NextResponse.json(newProfile);
    }

    return NextResponse.json(profile);
  } catch (error) {
    console.error("Error fetching profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch profile" },
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

    const formData = await request.formData();
    const data = JSON.parse(formData.get("data") as string);
    const avatarFile = formData.get("avatar") as File | null;

    let avatarUrl = null;
    if (avatarFile) {
      avatarUrl = session.user.picture;
    }

    const updatedProfile = await prisma.user.upsert({
      where: {
        id: session.user.sub,
      },
      create: {
        id: session.user.sub,
        email: session.user.email || "",
        name: data.name,
        bio: data.bio,
        website: data.website,
        avatar: avatarUrl || session.user.picture,
      },
      update: {
        name: data.name,
        bio: data.bio,
        website: data.website,
        ...(avatarUrl && { avatar: avatarUrl }),
      },
    });

    return NextResponse.json(updatedProfile);
  } catch (error) {
    console.error("Error updating profile:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}
