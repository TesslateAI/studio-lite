// Client-side authentication utilities

/**
 * Clear all authentication-related data from browser storage
 */
export function clearAuthStorage() {
    // Clear localStorage items
    const authKeys = [
        'activeChatId',
        'guestMessageCount',
        'lastUserId',
        'firebaseAuth',
        // Add any other auth-related keys here
    ];
    
    authKeys.forEach(key => {
        try {
            localStorage.removeItem(key);
        } catch (e) {
            console.warn(`Failed to remove ${key} from localStorage:`, e);
        }
    });
    
    // Clear sessionStorage items
    try {
        // Clear any Firebase-related items from sessionStorage
        const keysToRemove: string[] = [];
        for (let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i);
            if (key && (key.includes('firebase') || key.includes('auth'))) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach(key => sessionStorage.removeItem(key));
    } catch (e) {
        console.warn('Failed to clear sessionStorage:', e);
    }
}

/**
 * Reset guest user state
 */
export function resetGuestState() {
    localStorage.setItem('guestMessageCount', '0');
    localStorage.removeItem('activeChatId');
    localStorage.removeItem('lastUserId');
}

/**
 * Validate and fix guest message count
 */
export function validateGuestMessageCount(): number {
    const stored = localStorage.getItem('guestMessageCount');
    let count = 0;
    
    if (stored) {
        const parsed = parseInt(stored, 10);
        if (!isNaN(parsed) && parsed >= 0) {
            count = parsed;
        }
    }
    
    // Ensure it's stored correctly
    localStorage.setItem('guestMessageCount', count.toString());
    return count;
}

/**
 * Clear stale authentication state and cookies
 */
export async function clearStaleAuth() {
    try {
        // Clear browser storage
        clearAuthStorage();
        
        // Call API to clear server-side cookies
        await fetch('/api/auth/clear-state', {
            method: 'POST',
            credentials: 'include'
        });
        
        return true;
    } catch (error) {
        console.error('Failed to clear stale auth:', error);
        return false;
    }
}