import { create } from 'zustand';

interface DownloadsStore {
  showPaidPosts: boolean;
  toggleShowPaidPosts: () => void;
  activatePaidPosts: () => void;
  hidePostUser: boolean;
  toggleHidePostUser: () => void;
  showPurchases: boolean;
  toggleShowPurchases: () => void;
  setShowPurchases: (value: boolean) => void;
}

const useDownloadsStore = create<DownloadsStore>((set) => ({
  showPaidPosts: false,
  hidePostUser: false,
  showPurchases: false,
  toggleShowPaidPosts: () => set((state) => ({ 
    showPaidPosts: !state.showPaidPosts, 
    hidePostUser: !state.showPaidPosts // Toggle both states together
  })),
  activatePaidPosts: () => set({ showPaidPosts: true, hidePostUser: true }),
  toggleHidePostUser: () => set((state) => ({ hidePostUser: !state.hidePostUser })),
  toggleShowPurchases: () => set((state) => ({ showPurchases: !state.showPurchases })),
  setShowPurchases: (value: boolean) => set({ showPurchases: value }),
}));

export default useDownloadsStore;
