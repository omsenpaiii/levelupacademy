import { NextRequest, NextResponse } from "next/server";
import { head } from "@vercel/blob";
import { and, eq } from "drizzle-orm";
import { apiUser } from "@/lib/session";
import { assertAccess } from "@/lib/data";
import { db } from "@/lib/db";
import { files } from "@/lib/schema";
import { validUpload } from "@/lib/validation";
export async function POST(req: NextRequest) {
  try {
    if (req.headers.get("origin") !== req.nextUrl.origin)
      throw Error("Invalid request origin.");
    const u = await apiUser();
    const { url } = await req.json();
    const parsed = new URL(url);
    if (
      parsed.protocol !== "https:" ||
      !parsed.hostname.endsWith(".private.blob.vercel-storage.com")
    )
      throw Error("Invalid upload.");
    const blob = await head(url);
    const f = await db.query.files.findFirst({
      where: and(eq(files.ownerId, u.id), eq(files.pathname, blob.pathname)),
    });
    if (!f || !validUpload(f.title, blob.contentType, blob.size))
      throw Error("Invalid upload.");
    if (f.courseId) await assertAccess(u.id, f.courseId);
    await db
      .update(files)
      .set({ size: blob.size, contentType: blob.contentType })
      .where(eq(files.id, f.id));
    return NextResponse.json({ id: f.id });
  } catch {
    return NextResponse.json(
      {
        error: "We couldn’t confirm this upload. Try uploading the file again.",
      },
      { status: 400 },
    );
  }
}
