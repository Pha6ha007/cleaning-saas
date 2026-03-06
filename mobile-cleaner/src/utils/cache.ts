// mobile-cleaner/src/utils/cache.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_KEY = '@today_jobs_cache';

export async function cacheTodayJobs(jobs: any[]): Promise<void> {
  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(jobs));
  } catch (e) {
    console.warn('Failed to cache jobs', e);
  }
}

export async function getCachedTodayJobs(): Promise<any[] | null> {
  try {
    const data = await AsyncStorage.getItem(CACHE_KEY);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    console.warn('Failed to read cached jobs', e);
    return null;
  }
}
