import { AuthErrorBoundary } from '@/components/auth/auth-error-boundary';

export default function ChatLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <AuthErrorBoundary>
            {children}
        </AuthErrorBoundary>
    );
}