import { jest } from '@jest/globals';
import { StorageService } from '../storage.js';
import { ProfileData } from '../../types/profile.js';

describe('StorageService', () => {
  let storage: StorageService;
  const mockProfile: ProfileData = {
    username: 'testuser',
    displayName: 'Test User',
    profileImageUrl: 'https://example.com/image.jpg',
    followersCount: 100,
    followingCount: 100,
    interactionTimestamp: Date.now(),
    interactionType: 'like'
  };

  beforeEach(() => {
    storage = new StorageService();
    jest.clearAllMocks();
    // Ensure each mock resolves immediately
    (chrome.storage.local.get as jest.Mock).mockImplementation((...args: any[]) => {
      const callback = args[args.length - 1];
      if (typeof callback === 'function') {
        callback({ profiles: {} });
      }
      return Promise.resolve();
    });
    (chrome.storage.local.set as jest.Mock).mockImplementation((...args: any[]) => {
      const callback = args[args.length - 1];
      if (typeof callback === 'function') {
        callback();
      }
      return Promise.resolve();
    });
    (chrome.storage.local.clear as jest.Mock).mockImplementation((callback?: any) => {
      if (typeof callback === 'function') {
        callback();
      }
      return Promise.resolve();
    });
  });

  describe('saveProfile', () => {
    it('should save profile data to storage', async () => {
      await storage.saveProfile(mockProfile);

      expect(chrome.storage.local.set).toHaveBeenCalledWith(
        expect.objectContaining({
          profiles: expect.objectContaining({
            [mockProfile.username]: expect.objectContaining({
              username: mockProfile.username,
              displayName: mockProfile.displayName
            })
          })
        }),
        expect.any(Function)
      );
    });

    it('should update existing profile data', async () => {
      const existingProfiles = {
        [mockProfile.username]: {
          ...mockProfile,
          interactionTimestamp: Date.now() - 1000
        }
      };

      (chrome.storage.local.get as jest.Mock).mockImplementationOnce((...args: any[]) => {
        const callback = args[args.length - 1];
        if (typeof callback === 'function') {
          callback({ profiles: existingProfiles });
        }
        return Promise.resolve();
      });

      await storage.saveProfile(mockProfile);

      expect(chrome.storage.local.set).toHaveBeenCalledWith(
        expect.objectContaining({
          profiles: expect.objectContaining({
            [mockProfile.username]: expect.objectContaining({
              interactionTimestamp: mockProfile.interactionTimestamp
            })
          })
        }),
        expect.any(Function)
      );
    });
  });

  describe('getProfile', () => {
    it('should retrieve profile data from storage', async () => {
      (chrome.storage.local.get as jest.Mock).mockImplementationOnce((...args: any[]) => {
        const callback = args[args.length - 1];
        if (typeof callback === 'function') {
          callback({
            profiles: {
              [mockProfile.username]: mockProfile
            }
          });
        }
        return Promise.resolve();
      });

      const result = await storage.getProfile(mockProfile.username);
      expect(result).toEqual(mockProfile);
    });

    it('should return null for non-existent profile', async () => {
      const result = await storage.getProfile('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('pruneOldProfiles', () => {
    it('should remove profiles older than retention period', async () => {
      const now = Date.now();
      const oldProfiles = {
        old: {
          ...mockProfile,
          username: 'old',
          interactionTimestamp: now - (31 * 24 * 60 * 60 * 1000) // 31 days old
        },
        recent: {
          ...mockProfile,
          username: 'recent',
          interactionTimestamp: now - (1 * 24 * 60 * 60 * 1000) // 1 day old
        }
      };

      (chrome.storage.local.get as jest.Mock).mockImplementationOnce((...args: any[]) => {
        const callback = args[args.length - 1];
        if (typeof callback === 'function') {
          callback({ profiles: oldProfiles });
        }
        return Promise.resolve();
      });

      await storage.pruneOldProfiles();

      expect(chrome.storage.local.set).toHaveBeenCalledWith(
        expect.objectContaining({
          profiles: expect.not.objectContaining({
            old: expect.anything()
          })
        }),
        expect.any(Function)
      );
    });
  });

  describe('clearStorage', () => {
    it('should clear all stored profiles', async () => {
      await storage.clearStorage();
      expect(chrome.storage.local.clear).toHaveBeenCalled();
    });
  });
}); 