// Discord webhook utility for sending notifications

const DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/1408128939372711998/rS4jXYZJ7wRPGqfuJrxE3pr5gwFwYcvfI55RX8c3Rxa6A96HxQG9BTf6W_5VfvIps1wx';

interface DiscordEmbed {
  title?: string;
  description?: string;
  color?: number;
  fields?: Array<{ name: string; value: string; inline?: boolean }>;
  timestamp?: string;
  footer?: { text: string };
}

interface DiscordWebhookPayload {
  content?: string;
  embeds?: DiscordEmbed[];
  username?: string;
  avatar_url?: string;
}

/**
 * Send a notification to Discord when a user logs in
 */
export async function sendLoginNotification(
  email: string | null,
  userId: string,
  isNewUser: boolean = false,
  isGuest: boolean = false
) {
  try {
    const timestamp = new Date().toISOString();
    
    // Create a nice embed for the login notification
    const embed: DiscordEmbed = {
      title: isNewUser ? '🎉 New User Signup!' : '👋 User Login',
      description: isGuest 
        ? 'A guest user has joined the platform'
        : `${email || 'Unknown user'} has ${isNewUser ? 'signed up' : 'logged in'}`,
      color: isNewUser ? 0x00ff00 : 0x3498db, // Green for new users, blue for existing
      fields: [
        {
          name: 'User Type',
          value: isGuest ? 'Guest' : 'Registered',
          inline: true,
        },
        {
          name: 'User ID',
          value: `\`${userId.substring(0, 8)}...\``,
          inline: true,
        },
      ],
      timestamp,
      footer: {
        text: 'Tesslate Studio',
      },
    };

    if (email && !isGuest) {
      embed.fields?.push({
        name: 'Email',
        value: email,
        inline: false,
      });
    }

    const payload: DiscordWebhookPayload = {
      username: 'Tesslate Auth',
      embeds: [embed],
    };

    const response = await fetch(DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error('Discord webhook failed:', response.status, response.statusText);
    } else {
      console.log('Discord notification sent successfully');
    }
  } catch (error) {
    // Don't throw errors for webhook failures - we don't want to break login flow
    console.error('Error sending Discord notification:', error);
  }
}

/**
 * Send a notification when a new API key is created
 */
export async function sendApiKeyCreatedNotification(
  email: string,
  keyName: string,
  userId: string
) {
  try {
    const embed: DiscordEmbed = {
      title: '🔑 API Key Created',
      description: `${email} has created a new API key`,
      color: 0x9b59b6, // Purple
      fields: [
        {
          name: 'Key Name',
          value: keyName,
          inline: true,
        },
        {
          name: 'User ID',
          value: `\`${userId.substring(0, 8)}...\``,
          inline: true,
        },
      ],
      timestamp: new Date().toISOString(),
      footer: {
        text: 'Tesslate API',
      },
    };

    const payload: DiscordWebhookPayload = {
      username: 'Tesslate API',
      embeds: [embed],
    };

    await fetch(DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.error('Error sending API key notification:', error);
  }
}