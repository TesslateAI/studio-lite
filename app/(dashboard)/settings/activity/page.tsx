import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Settings,
  LogOut,
  UserPlus,
  Lock,
  UserCog,
  AlertCircle,
  UserMinus,
  Mail,
  CheckCircle,
  type LucideIcon,
} from 'lucide-react';
import { ActivityType } from '@/lib/db/schema'; // Assuming ActivityType is exported from your schema
import { getActivityLogs } from '@/lib/db/queries';

// Define the type for an activity log entry based on what getActivityLogs returns
interface ActivityLogEntry {
  id: number;
  action: string; // This will be cast to ActivityType
  timestamp: string | Date; // Drizzle might return string, so be flexible
  ipAddress: string | null;
  userName: string | null;
}

const iconMap: Record<string, LucideIcon> = { // Use string for keys if action is string initially
  [ActivityType.SIGN_UP]: UserPlus,
  [ActivityType.SIGN_IN]: UserCog,
  [ActivityType.SIGN_OUT]: LogOut,
  [ActivityType.UPDATE_PASSWORD]: Lock,
  [ActivityType.DELETE_ACCOUNT]: UserMinus,
  [ActivityType.UPDATE_ACCOUNT]: Settings,
  [ActivityType.CREATE_TEAM]: UserPlus, // Keep these if they are still valid ActivityType enum values
  [ActivityType.REMOVE_TEAM_MEMBER]: UserMinus,
  [ActivityType.INVITE_TEAM_MEMBER]: Mail,
  [ActivityType.ACCEPT_INVITATION]: CheckCircle,
};

function getRelativeTime(dateInput: string | Date): string {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600)
    return `${Math.floor(diffInSeconds / 60)} minutes ago`;
  if (diffInSeconds < 86400)
    return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  if (diffInSeconds < 604800)
    return `${Math.floor(diffInSeconds / 86400)} days ago`;
  return date.toLocaleDateString();
}

function formatAction(action: ActivityType): string {
  switch (action) {
    case ActivityType.SIGN_UP:
      return 'You signed up';
    case ActivityType.SIGN_IN:
      return 'You signed in';
    case ActivityType.SIGN_OUT:
      return 'You signed out';
    case ActivityType.UPDATE_PASSWORD:
      return 'You changed your password';
    case ActivityType.DELETE_ACCOUNT:
      return 'You deleted your account';
    case ActivityType.UPDATE_ACCOUNT:
      return 'You updated your account';
    // The following team-related actions might be from an older schema version.
    // If they are no longer in your ActivityType enum, remove them or update them.
    case ActivityType.CREATE_TEAM:
      return 'You created a new team';
    case ActivityType.REMOVE_TEAM_MEMBER:
      return 'You removed a team member';
    case ActivityType.INVITE_TEAM_MEMBER:
      return 'You invited a team member';
    case ActivityType.ACCEPT_INVITATION:
      return 'You accepted an invitation';
    default:
      // This handles any string value that doesn't match an enum member.
      // You can make it more specific if needed.
      const knownAction = action as string;
      return `Action: ${knownAction.replace(/_/g, ' ').toLowerCase()}`;
  }
}

export default async function ActivityPage() {
  // getActivityLogs should ideally return Promise<ActivityLogEntry[]>
  const logs: ActivityLogEntry[] = await getActivityLogs() as ActivityLogEntry[];

  return (
    <section className="flex-1 p-4 lg:p-8">
      <h1 className="text-lg lg:text-2xl font-medium text-gray-900 mb-6">
        Activity Log
      </h1>
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length > 0 ? (
            <ul className="space-y-4">
              {logs.map((log: ActivityLogEntry) => { // Explicitly type 'log' here
                // Ensure log.action is treated as a key of ActivityType for iconMap
                const actionKey = log.action as ActivityType;
                const Icon = iconMap[actionKey] || Settings; // Fallback icon
                const formattedAction = formatAction(actionKey);

                return (
                  <li key={log.id} className="flex items-center space-x-4">
                    <div className="bg-whiterounded-full p-2"> {/* Typo: bg-white rounded-full ? */}
                      <Icon className="w-5 h-5 text-black-600" /> {/* text-gray-600 or similar? */}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {formattedAction}
                        {log.userName && ` (User: ${log.userName})`} {/* Display userName if available */}
                        {log.ipAddress && ` from IP ${log.ipAddress}`}
                      </p>
                      <p className="text-xs text-gray-500">
                        {getRelativeTime(log.timestamp)}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="flex flex-col items-center justify-center text-center py-12">
              <AlertCircle className="h-12 w-12 text-[#5E62FF] mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No activity yet
              </h3>
              <p className="text-sm text-gray-500 max-w-sm">
                When you perform actions like signing in or updating your
                account, they'll appear here.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}