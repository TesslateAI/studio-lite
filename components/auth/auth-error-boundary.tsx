'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import { clearStaleAuth } from '@/lib/auth/auth-utils';

interface Props {
    children: React.ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

export class AuthErrorBoundary extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error): State {
        // Update state so the next render will show the fallback UI
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        // Log the error to console
        console.error('Auth Error Boundary caught:', error, errorInfo);
    }

    handleReset = async () => {
        // Clear all auth state
        await clearStaleAuth();
        // Reset the error boundary state
        this.setState({ hasError: false, error: undefined });
        // Reload the page to start fresh
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-1 flex-col items-center justify-center p-8 text-center h-screen">
                    <div className="p-4 rounded-full bg-yellow-100 text-yellow-600 mb-4">
                        <AlertTriangle className="h-8 w-8" />
                    </div>
                    <h1 className="text-2xl font-medium mb-3">Something went wrong</h1>
                    <p className="text-muted-foreground max-w-md mb-6">
                        We encountered an issue with authentication. This is usually temporary.
                    </p>
                    <div className="flex gap-3">
                        <Button onClick={this.handleReset} variant="outline">
                            Reset & Try Again
                        </Button>
                        <Button onClick={() => window.location.href = '/sign-up'}>
                            Sign Up
                        </Button>
                    </div>
                    {process.env.NODE_ENV === 'development' && this.state.error && (
                        <details className="mt-8 text-left max-w-2xl">
                            <summary className="cursor-pointer text-sm text-muted-foreground">
                                Error details (development only)
                            </summary>
                            <pre className="mt-2 text-xs bg-gray-100 p-4 rounded overflow-auto">
                                {this.state.error.toString()}
                                {'\n\n'}
                                {this.state.error.stack}
                            </pre>
                        </details>
                    )}
                </div>
            );
        }

        return this.props.children;
    }
}