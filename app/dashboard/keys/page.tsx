'use client';

import { useState, useEffect } from 'react';
import { PageLayout } from '@/components/layout/page-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
    Dialog, 
    DialogContent, 
    DialogDescription, 
    DialogFooter, 
    DialogHeader, 
    DialogTitle,
    DialogTrigger 
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { 
    Key, 
    Plus, 
    Copy, 
    Trash2, 
    AlertTriangle,
    Code2,
    Calendar,
    Activity,
    Shield
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import useSWR, { mutate } from 'swr';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface ApiKey {
    id: string;
    name: string;
    keyPrefix: string;
    models: string[];
    lastUsedAt: string | null;
    isActive: boolean;
    createdAt: string;
    fullKey?: string; // Only present when first created
}

export default function ApiKeysPage() {
    const [isCreating, setIsCreating] = useState(false);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const [newKeyName, setNewKeyName] = useState('');
    const [showNewKeyDialog, setShowNewKeyDialog] = useState(false);
    const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);
    const [copiedKey, setCopiedKey] = useState<string | null>(null);

    const { data, error, isLoading } = useSWR<{ keys: ApiKey[] }>('/api/keys', fetcher);
    const { data: userData } = useSWR('/api/user', fetcher);

    const isGuest = userData?.isGuest;
    const keys = data?.keys || [];

    const handleCreateKey = async () => {
        if (!newKeyName.trim()) {
            toast.error('Please enter a name for your API key');
            return;
        }

        setIsCreating(true);
        try {
            const response = await fetch('/api/keys', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newKeyName }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to create API key');
            }

            const result = await response.json();
            setNewlyCreatedKey(result.key.fullKey);
            setShowNewKeyDialog(false);
            
            // Refresh the keys list
            mutate('/api/keys');
            
            toast.success('API key created successfully!');
        } catch (error) {
            console.error('Error creating API key:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to create API key');
        } finally {
            setIsCreating(false);
            setNewKeyName('');
        }
    };

    const handleDeleteKey = async (keyId: string) => {
        if (!confirm('Are you sure you want to delete this API key? This action cannot be undone.')) {
            return;
        }
        
        setIsDeleting(keyId);
        try {
            const response = await fetch(`/api/keys?id=${keyId}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                throw new Error(errorData.error || 'Failed to delete API key');
            }

            // Refresh the keys list
            await mutate('/api/keys');
            toast.success('API key deleted successfully');
        } catch (error) {
            console.error('Error deleting API key:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to delete API key');
        } finally {
            setIsDeleting(null);
        }
    };

    const copyToClipboard = async (text: string, keyId?: string) => {
        try {
            await navigator.clipboard.writeText(text);
            if (keyId) {
                setCopiedKey(keyId);
                setTimeout(() => setCopiedKey(null), 2000);
            }
            toast.success('Copied to clipboard!');
        } catch (error) {
            toast.error('Failed to copy to clipboard');
        }
    };

    if (isGuest) {
        return (
            <PageLayout 
                title="API Keys"
                description="Manage your API keys for programmatic access"
                showBackButton={false}
                isGuest={true}
            >
                <div className="flex flex-col items-center justify-center min-h-[50vh]">
                    <Shield className="h-16 w-16 text-muted-foreground mb-4" />
                    <h1 className="text-2xl font-medium mb-2">API Keys Require an Account</h1>
                    <p className="text-muted-foreground text-center max-w-md mb-6">
                        Sign up for a free account to create and manage API keys for programmatic access to our models.
                    </p>
                    <Button onClick={() => window.location.href = '/sign-up'}>
                        Sign Up for Free
                    </Button>
                </div>
            </PageLayout>
        );
    }

    const createKeyButton = (
        <Dialog open={showNewKeyDialog} onOpenChange={setShowNewKeyDialog}>
            <DialogTrigger asChild>
                <Button disabled={keys.length >= 5}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create API Key
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Create New API Key</DialogTitle>
                    <DialogDescription>
                        Give your API key a name to help you remember what it's for.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="name">Key Name</Label>
                        <Input
                            id="name"
                            placeholder="e.g., Production App, Development, Testing"
                            value={newKeyName}
                            onChange={(e) => setNewKeyName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !isCreating) {
                                    handleCreateKey();
                                }
                            }}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setShowNewKeyDialog(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleCreateKey} disabled={isCreating}>
                        {isCreating ? 'Creating...' : 'Create Key'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );

    return (
        <PageLayout 
            title="API Keys"
            description="Manage your API keys for programmatic access to Tesslate models"
            showBackButton={false}
            actions={createKeyButton}
        >
            <div className="space-y-6">

                {/* Info Card */}
                <Card className="mb-8 border-blue-200 bg-blue-50/50">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-blue-900">
                            <Code2 className="h-5 w-5" />
                            Using Your API Keys
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3 text-sm text-blue-800">
                            <p>Your API keys work with any OpenAI-compatible client. Use them to:</p>
                            <ul className="list-disc list-inside space-y-1 ml-4">
                                <li>Access <code className="bg-blue-100 px-1 rounded">WEBGEN-SMALL</code> and <code className="bg-blue-100 px-1 rounded">UIGEN-FX-SMALL</code> models</li>
                                <li>Build applications with our UI generation models</li>
                                <li>Integrate with existing OpenAI SDKs and tools</li>
                            </ul>
                            <div className="mt-4 p-3 bg-white/80 rounded-md">
                                <p className="font-medium mb-2">Quick Start:</p>
                                <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
{`from openai import OpenAI

client = OpenAI(
    api_key="YOUR_API_KEY",
    base_url="https://apin.tesslate.com/v1"
)

response = client.chat.completions.create(
    model="WEBGEN-SMALL",
    messages=[{"role": "user", "content": "Create a login form"}]
)`}
                                </pre>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Your API Keys section header */}
                <div>
                    <h2 className="text-xl font-semibold mb-4">Your API Keys</h2>
                </div>

                {/* Newly Created Key Alert */}
                {newlyCreatedKey && (
                    <Card className="mb-6 border-green-200 bg-green-50">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-green-900">
                                <Key className="h-5 w-5" />
                                Your New API Key
                            </CardTitle>
                            <CardDescription className="text-green-700">
                                Save this key now - it won't be shown again!
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-2">
                                <Input 
                                    value={newlyCreatedKey} 
                                    readOnly 
                                    className="font-mono text-sm"
                                />
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => copyToClipboard(newlyCreatedKey)}
                                >
                                    <Copy className="h-4 w-4" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Keys List */}
                {isLoading ? (
                    <div className="text-center py-12">
                        <p className="text-muted-foreground">Loading API keys...</p>
                    </div>
                ) : keys.length === 0 ? (
                    <Card>
                        <CardContent className="flex flex-col items-center justify-center py-12">
                            <Key className="h-12 w-12 text-muted-foreground mb-4" />
                            <p className="text-lg font-medium mb-2">No API keys yet</p>
                            <p className="text-muted-foreground text-center max-w-md">
                                Create your first API key to start using Tesslate models programmatically.
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-4">
                        {keys.map((key) => (
                            <Card key={key.id}>
                                <CardContent className="flex items-center justify-between p-6">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="font-semibold">{key.name}</h3>
                                            <code className="text-sm bg-muted px-2 py-1 rounded">
                                                {key.keyPrefix}
                                            </code>
                                        </div>
                                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                            <span className="flex items-center gap-1">
                                                <Calendar className="h-3 w-3" />
                                                Created {formatDistanceToNow(new Date(key.createdAt), { addSuffix: true })}
                                            </span>
                                            {key.lastUsedAt && (
                                                <span className="flex items-center gap-1">
                                                    <Activity className="h-3 w-3" />
                                                    Last used {formatDistanceToNow(new Date(key.lastUsedAt), { addSuffix: true })}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex gap-2 mt-2">
                                            {key.models.map((model) => (
                                                <span key={model} className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                                                    {model}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {copiedKey === key.id && (
                                            <span className="text-sm text-green-600">Copied!</span>
                                        )}
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => handleDeleteKey(key.id)}
                                            disabled={isDeleting === key.id}
                                        >
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}

                {/* Usage Limits */}
                {keys.length >= 5 && (
                    <Card className="mt-6 border-yellow-200 bg-yellow-50/50">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-yellow-900">
                                <AlertTriangle className="h-5 w-5" />
                                API Key Limit Reached
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-yellow-800">
                                You've reached the maximum of 5 API keys. Delete an existing key to create a new one.
                            </p>
                        </CardContent>
                    </Card>
                )}
            </div>
        </PageLayout>
    );
}