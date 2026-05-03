import { db } from "./db";

export async function createSession(guestId: string, level: string) {
  return db.session.create({
    data: { guestId, level },
  });
}

export async function updateSessionTitle(sessionId: string, title: string) {
  return db.session.update({
    where: { id: sessionId },
    data: { title },
  });
}

export async function getSessionsForGuest(guestId: string) {
  return db.session.findMany({
    where: { guestId },
    orderBy: { updatedAt: "desc" },
    take: 30,
    select: {
      id: true, title: true, level: true,
      createdAt: true, updatedAt: true,
      _count: { select: { messages: true } },
    },
  });
}

export async function getSessionWithMessages(sessionId: string, guestId: string) {
  return db.session.findFirst({
    where: { id: sessionId, guestId },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
    },
  });
}

export async function saveMessage(
  sessionId: string,
  role: "user" | "assistant",
  content: string,
  meta?: { prerequisites?: object[]; relatedConcepts?: object[] }
) {
  return db.message.create({
    data: {
      sessionId, role, content,
      prerequisites:    meta?.prerequisites    ? JSON.stringify(meta.prerequisites)    : null,
      relatedConcepts:  meta?.relatedConcepts  ? JSON.stringify(meta.relatedConcepts)  : null,
    },
  });
}

export async function trackConceptProgress(guestId: string, conceptIri: string, conceptLabel: string) {
  return db.conceptProgress.upsert({
    where:  { guestId_conceptIri: { guestId, conceptIri } },
    create: { guestId, conceptIri, conceptLabel },
    update: { seenCount: { increment: 1 }, lastSeenAt: new Date() },
  });
}

export async function getConceptProgress(guestId: string) {
  return db.conceptProgress.findMany({
    where:   { guestId },
    orderBy: { seenCount: "desc" },
    take:    20,
  });
}
