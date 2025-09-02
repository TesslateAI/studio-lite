import { NextRequest, NextResponse } from 'next/server';
import { requireNonGuest } from '@/lib/auth/middleware';
import { db } from '@/lib/db/drizzle';
import { apiKeys } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import * as litellmApi from '@/lib/litellm/api';
import { nanoid } from 'nanoid';
import { sendApiKeyCreatedNotification } from '@/lib/discord/webhook';

// GET /api/keys - List all API keys for the user
export const GET = requireNonGuest(async (req) => {
    try {
        const userId = req.user!.id;
        
        const keys = await db
            .select({
                id: apiKeys.id,
                name: apiKeys.name,
                keyPrefix: apiKeys.keyPrefix,
                models: apiKeys.models,
                lastUsedAt: apiKeys.lastUsedAt,
                isActive: apiKeys.isActive,
                createdAt: apiKeys.createdAt,
            })
            .from(apiKeys)
            .where(and(
                eq(apiKeys.userId, userId),
                eq(apiKeys.isActive, true)
            ))
            .orderBy(desc(apiKeys.createdAt));
        
        return NextResponse.json({ keys });
    } catch (error) {
        console.error('Error fetching API keys:', error);
        return NextResponse.json(
            { error: 'Failed to fetch API keys' },
            { status: 500 }
        );
    }
});

// POST /api/keys - Create a new API key
export const POST = requireNonGuest(async (req) => {
    try {
        const userId = req.user!.id;
        const { name } = await req.json();
        
        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            return NextResponse.json(
                { error: 'Key name is required' },
                { status: 400 }
            );
        }
        
        // Check if user already has 5 keys
        const existingKeys = await db
            .select({ id: apiKeys.id })
            .from(apiKeys)
            .where(and(eq(apiKeys.userId, userId), eq(apiKeys.isActive, true)));
        
        if (existingKeys.length >= 5) {
            return NextResponse.json(
                { error: 'Maximum of 5 active API keys allowed per user' },
                { status: 400 }
            );
        }
        
        // Generate a unique key identifier
        const keyIdentifier = `tesslate_${nanoid(16)}`;
        
        // Create the key in LiteLLM with team assignment
        // Note: teams are assigned via the team_id parameter
        const litellmResponse = await litellmApi.generateKey({
            user_id: `api_${userId}`, // Prefix to distinguish API keys from chat keys
            models: [], // Empty because models are controlled by team
            rpm_limit: 100, // Reasonable rate limits for API usage
            tpm_limit: 100000,
            team_id: 'tesslate-api-key', // This assigns the key to your team with its model restrictions
            key_alias: keyIdentifier,
            duration: '365d', // 1 year expiration
            metadata: {
                user_id: userId,
                key_name: name.trim(),
                created_via: 'dashboard',
                type: 'api_key'
            }
        } as any);
        
        const newKey = litellmResponse.key;
        
        // Extract the first 8 chars for display (e.g., "sk-tes...")
        const keyPrefix = newKey.substring(0, 10) + '...';
        
        // Store the key in our database
        const [createdKey] = await db
            .insert(apiKeys)
            .values({
                userId,
                name: name.trim(),
                key: newKey,
                keyPrefix,
                team: 'tesslate-api-key',
                models: ['WEBGEN-SMALL', 'UIGEN-FX-SMALL'],
            })
            .returning({
                id: apiKeys.id,
                name: apiKeys.name,
                key: apiKeys.key,
                keyPrefix: apiKeys.keyPrefix,
                createdAt: apiKeys.createdAt,
            });
        
        // Send Discord notification
        if (req.user?.email) {
            sendApiKeyCreatedNotification(req.user.email, name.trim(), userId).catch(err => {
                console.error('Failed to send Discord notification:', err);
            });
        }

        // Return the key only once during creation
        return NextResponse.json({ 
            key: {
                ...createdKey,
                fullKey: newKey // Only returned during creation
            },
            message: 'API key created successfully. Please copy it now as it won\'t be shown again.'
        });
    } catch (error) {
        console.error('Error creating API key:', error);
        return NextResponse.json(
            { error: 'Failed to create API key' },
            { status: 500 }
        );
    }
});

// DELETE /api/keys - Delete an API key
export const DELETE = requireNonGuest(async (req) => {
    try {
        const userId = req.user!.id;
        const { searchParams } = new URL(req.url);
        const keyId = searchParams.get('id');
        
        console.log('Delete request for key:', { keyId, userId });
        
        if (!keyId) {
            return NextResponse.json(
                { error: 'Key ID is required' },
                { status: 400 }
            );
        }
        
        // Get the key to delete
        const [keyToDelete] = await db
            .select({ key: apiKeys.key })
            .from(apiKeys)
            .where(and(
                eq(apiKeys.id, keyId),
                eq(apiKeys.userId, userId)
            ))
            .limit(1);
        
        if (!keyToDelete) {
            console.log('Key not found in database:', { keyId, userId });
            return NextResponse.json(
                { error: 'API key not found' },
                { status: 404 }
            );
        }
        
        console.log('Found key to delete:', keyToDelete.key.substring(0, 10) + '...');
        
        // Delete from LiteLLM
        try {
            await litellmApi.deleteKey(keyToDelete.key);
        } catch (error) {
            console.error('Failed to delete key from LiteLLM:', error);
            // Continue anyway - the key might already be deleted
        }
        
        // Mark as inactive in our database (soft delete) and update timestamp
        const deleteResult = await db
            .update(apiKeys)
            .set({ 
                isActive: false,
                updatedAt: new Date()
            })
            .where(and(
                eq(apiKeys.id, keyId),
                eq(apiKeys.userId, userId)
            ))
            .returning({ id: apiKeys.id });
        
        if (deleteResult.length === 0) {
            console.error('Failed to update key status in database');
            return NextResponse.json(
                { error: 'Failed to delete API key' },
                { status: 500 }
            );
        }
        
        console.log('Successfully marked key as inactive:', keyId);
        return NextResponse.json({ message: 'API key deleted successfully' });
    } catch (error) {
        console.error('Error deleting API key:', error);
        return NextResponse.json(
            { error: 'Failed to delete API key' },
            { status: 500 }
        );
    }
});