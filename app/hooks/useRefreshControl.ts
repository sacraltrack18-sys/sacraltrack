import { useState, useCallback } from 'react';

export const useRefreshControl = () => {
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [pullStartY, setPullStartY] = useState(0);
    const [pullMoveY, setPullMoveY] = useState(0);
    const [refreshState, setRefreshState] = useState<'idle' | 'pulling' | 'refreshing'>('idle');

    const onTouchStart = useCallback((e: TouchEvent) => {
        setPullStartY(e.touches[0].clientY);
        setRefreshState('idle');
    }, []);

    const onTouchMove = useCallback((e: TouchEvent) => {
        setPullMoveY(e.touches[0].clientY);
        
        if (pullMoveY - pullStartY > 50) {
            setRefreshState('pulling');
        }
    }, [pullMoveY, pullStartY]);

    const onTouchEnd = useCallback(() => {
        if (refreshState === 'pulling') {
            setIsRefreshing(true);
            setRefreshState('refreshing');
        }
        setPullStartY(0);
        setPullMoveY(0);
    }, [refreshState]);

    const onRefresh = useCallback(async (callback: () => Promise<void>) => {
        if (isRefreshing) return;
        
        setIsRefreshing(true);
        try {
            await callback();
        } finally {
            setIsRefreshing(false);
            setRefreshState('idle');
        }
    }, [isRefreshing]);

    return {
        isRefreshing,
        refreshState,
        onTouchStart,
        onTouchMove,
        onTouchEnd,
        onRefresh
    };
}; 