import { InteractionType, NotificationType } from '../types/profile.js';
import type { ProfileData } from '../types/profile.js';

interface NotificationData {
  type: NotificationType;
  text: string;
  users?: ProfileData[];
}

type UserNotificationType = 'user_interaction' | 'multi_user';

interface UserProfileData extends Omit<ProfileData, 'notificationType'> {
  notificationType: UserNotificationType;
}

export class DOMExtractor {
  static readonly #SELECTORS = {
    CELL: '[data-testid="cellInnerDiv"]',
    NOTIFICATION: '[data-testid="notification"]',
    USER_NAME: '[data-testid="UserName"]',
    USER_AVATAR: '[data-testid="UserAvatar"]',
    TWEET_TEXT: '[data-testid="tweetText"]'
  } as const;

  static readonly #PATTERNS = {
    PINNED_POST: /new pinned post in/i,
    TRENDING: /trending in/i,
    COMMUNITY_POST: /new community post in/i,
    MULTI_USER: /new post notifications for/i,
    LIKE: /liked/i,
    REPLY: /replied/i,
    REPOST: /reposted/i,
    FOLLOW: /followed/i
  } as const;

  public extractProfileData(element: HTMLElement): ProfileData | null {
    try {
      // Skip if this is our warning element
      if (element.classList.contains('xbd-warning')) {
        return null;
      }

      // Find the notification cell
      const cell = element.closest(DOMExtractor.#SELECTORS.CELL);
      if (!(cell instanceof HTMLElement)) {
        return null;
      }

      // Log the cell's HTML for debugging
      console.debug('[XBot:DOM] Processing cell:', {
        html: cell.outerHTML,
        testIds: [...cell.querySelectorAll('[data-testid]')]
          .map(el => el.getAttribute('data-testid'))
      });

      // Determine notification type and handle accordingly
      const notificationData = this.#parseNotification(cell);
      if (!notificationData?.users?.length) {
        return null;
      }

      // Skip non-user notifications
      if (notificationData.type !== NotificationType.UserInteraction && 
          notificationData.type !== NotificationType.MultiUser) {
        console.debug('[XBot:DOM] Skipping non-user notification:', notificationData.type);
        return null;
      }

      // Convert UserProfileData to ProfileData
      const userProfile = notificationData.users[0];
      return {
        ...userProfile,
        notificationType: userProfile.notificationType === 'multi_user'
          ? NotificationType.MultiUser
          : NotificationType.UserInteraction
      };

    } catch (error) {
      console.error('[XBot:DOM] Error:', error);
      return null;
    }
  }

  #parseNotification(cell: HTMLElement): NotificationData | null {
    const text = cell.textContent?.toLowerCase() ?? '';

    // Check notification type
    if (DOMExtractor.#PATTERNS.PINNED_POST.test(text)) {
      return { type: NotificationType.PinnedPost, text };
    }
    if (DOMExtractor.#PATTERNS.TRENDING.test(text)) {
      return { type: NotificationType.Trending, text };
    }
    if (DOMExtractor.#PATTERNS.COMMUNITY_POST.test(text)) {
      return { type: NotificationType.CommunityPost, text };
    }

    // Find all user links
    const userLinks = [...cell.querySelectorAll('a[role="link"]')]
      .filter(link => {
        const href = link.getAttribute('href');
        return href?.startsWith('/') && !href.includes('/i/');
      });

    if (!userLinks.length) {
      console.debug('[XBot:DOM] No user links found');
      return null;
    }

    // Extract user data
    const users = userLinks
      .map(link => {
        const username = link.getAttribute('href')?.slice(1);
        if (!username) return null;

        const avatarContainer = cell.querySelector(`[data-testid="UserAvatar-Container-${username}"]`);
        if (!avatarContainer) return null;

        const profileImageUrl = this.#extractProfileImage(avatarContainer);
        if (!profileImageUrl) return null;

        const displayName = link.textContent?.trim() || username;
        const interactionType = this.#determineInteractionType(text);
        const isMultiUser = DOMExtractor.#PATTERNS.MULTI_USER.test(text);
        const notificationType = isMultiUser 
          ? 'multi_user' 
          : 'user_interaction';

        return {
          username,
          displayName,
          profileImageUrl,
          followersCount: 0,
          followingCount: 0,
          interactionTimestamp: Date.now(),
          interactionType,
          notificationType
        } satisfies UserProfileData;
      })
      .filter((user): user is UserProfileData => user !== null);

    if (!users.length) {
      return null;
    }

    return {
      type: DOMExtractor.#PATTERNS.MULTI_USER.test(text)
        ? NotificationType.MultiUser
        : NotificationType.UserInteraction,
      text,
      users
    };
  }

  #determineInteractionType(text: string): InteractionType {
    const { LIKE, REPLY, REPOST } = DOMExtractor.#PATTERNS;
    if (LIKE.test(text)) return InteractionType.Like;
    if (REPLY.test(text)) return InteractionType.Reply;
    if (REPOST.test(text)) return InteractionType.Repost;
    return InteractionType.Follow;
  }

  #extractProfileImage(container: Element): string | null {
    // Try to find img tag first
    const img = container.querySelector<HTMLImageElement>('img[src*="profile_images"]');
    if (img?.src) {
      return img.src;
    }

    // Fallback to background image
    const bgElements = container.querySelectorAll('[style*="background-image"]');
    for (const el of bgElements) {
      const style = window.getComputedStyle(el);
      const bgImage = style.backgroundImage;
      if (bgImage && bgImage !== 'none' && bgImage.includes('profile_images')) {
        return bgImage.replace(/^url\(['"](.+)['"]\)$/, '$1');
      }
    }

    return null;
  }
}
