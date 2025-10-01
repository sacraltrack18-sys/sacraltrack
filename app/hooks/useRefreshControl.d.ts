export interface RefreshControlHook {
    isRefreshing: boolean;
    refreshState: 'idle' | 'pulling' | 'refreshing';
    onTouchStart: (e: TouchEvent) => void;
    onTouchMove: (e: TouchEvent) => void;
    onTouchEnd: () => void;
    onRefresh: (callback: () => Promise<void>) => Promise<void>;
}

export declare function useRefreshControl(): RefreshControlHook; 