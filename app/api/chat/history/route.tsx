// app/api/chat/history/route.tsx

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { getUser } from '@/lib/db/queries';
import { chatSessions, chatMessages, NewChatMessage, ChatMessage } from '@/lib/db/schema';
import { eq, desc, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { Message } from '@/lib/messages'; // Import the client-side message type

// GET all chat sessions for the current user
export async function GET() {
    const user = await getUser();
    if (!user || user.isGuest) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Fetch the raw data from the database.
    const sessionsFromDb = await db.query.chatSessions.findMany({
        where: eq(chatSessions.userId, user.id),
        with: {
            messages: {
                orderBy: (messages, { asc }) => [asc(messages.createdAt)],
            },
        },
        orderBy: [desc(chatSessions.createdAt)],
    });

    // 2. Manually transform the data. Drizzle doesn't have a `transform` function
    //    in its relational queries, so we do it here in memory.
    const sessions = sessionsFromDb.map(session => ({
        ...session,
        messages: session.messages.map(dbMessage => ({
            ...dbMessage,
            content: dbMessage.content as Message,
        })),
    }));

    return NextResponse.json(sessions);
}

// Define a Zod schema that matches the client-side `Message` type.
// This ensures type safety for data coming from the client.
const messageSchema = z.custom<Message>();

const postBodySchema = z.object({
    id: z.string().uuid(), // Session ID
    title: z.string().min(1).max(100),
    selectedModelId: z.string().optional().nullable(),
    messages: z.array(messageSchema), // Expects an array of the full client-side Message objects
});

// POST to create or update a chat session and its messages
export async function POST(req: NextRequest) {
    const user = await getUser();
    if (!user || user.isGuest) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const validation = postBodySchema.safeParse(body);

    if (!validation.success) {
        return NextResponse.json({ error: 'Invalid request body', details: validation.error.flatten() }, { status: 400 });
    }

    const { id: sessionId, title, selectedModelId, messages: clientMessages } = validation.data;

    try {
        await db.transaction(async (tx) => {
            // 1. Upsert the chat session metadata.
            await tx.insert(chatSessions)
                .values({ id: sessionId, userId: user.id, title, selectedModelId, updatedAt: new Date() })
                .onConflictDoUpdate({
                    target: chatSessions.id,
                    set: { title, selectedModelId, updatedAt: new Date() },
                });

            // 2. Fetch existing message IDs from the database for this session.
            const existingMessages = await tx.query.chatMessages.findMany({
                where: eq(chatMessages.sessionId, sessionId),
                columns: { id: true, content: true } // Only fetch what's needed for the diff
            });

            // 3. Perform a diff to determine operations.
            const existingMessageMap = new Map(existingMessages.map(m => [m.id, m.content]));
            const clientMessageMap = new Map(clientMessages.map(m => [m.id, m]));

            const messagesToDelete = Array.from(existingMessageMap.keys()).filter(id => !clientMessageMap.has(id));
            const messagesToInsert: NewChatMessage[] = [];
            const messagesToUpdate: { id: string, content: Message, role: string }[] = [];

            for (const [id, clientMsg] of clientMessageMap.entries()) {
                const existingContent = existingMessageMap.get(id);
                if (!existingContent) {
                    messagesToInsert.push({ id, sessionId, role: clientMsg.role, content: clientMsg });
                } else if (JSON.stringify(existingContent) !== JSON.stringify(clientMsg)) {
                    messagesToUpdate.push({ id, role: clientMsg.role, content: clientMsg });
                }
            }

            // 4. Execute the batched database operations.
            if (messagesToDelete.length > 0) {
                await tx.delete(chatMessages).where(inArray(chatMessages.id, messagesToDelete));
            }

            if (messagesToInsert.length > 0) {
                await tx.insert(chatMessages).values(messagesToInsert);
            }

            if (messagesToUpdate.length > 0) {
                // This can be further optimized with a single CASE statement in raw SQL for very high throughput,
                // but Promise.all is sufficient and much cleaner for most applications.
                await Promise.all(messagesToUpdate.map(msg =>
                    tx.update(chatMessages)
                      .set({ role: msg.role, content: msg.content })
                      .where(eq(chatMessages.id, msg.id))
                ));
            }
        });

        return NextResponse.json({ success: true, sessionId }, { status: 201 });

    } catch (error) {
        console.error("Failed to save chat history:", error);
        return NextResponse.json({ error: "Failed to save chat history" }, { status: 500 });
    }
}

// DELETE a chat session and all its messages
export async function DELETE(req: NextRequest) {
    const user = await getUser();
    if (!user || user.isGuest) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
        return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    try {
        await db.transaction(async (tx) => {
            // First verify the session belongs to the current user
            const session = await tx.query.chatSessions.findFirst({
                where: eq(chatSessions.id, sessionId),
                columns: { userId: true }
            });

            if (!session || session.userId !== user.id) {
                throw new Error('Session not found or unauthorized');
            }

            // Delete all messages for this session
            await tx.delete(chatMessages).where(eq(chatMessages.sessionId, sessionId));
            
            // Delete the session itself
            await tx.delete(chatSessions).where(eq(chatSessions.id, sessionId));
        });

        return NextResponse.json({ success: true }, { status: 200 });

    } catch (error) {
        console.error("Failed to delete chat session:", error);
        return NextResponse.json({ error: "Failed to delete chat session" }, { status: 500 });
    }
}