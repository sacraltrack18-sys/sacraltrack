import { VibeLike } from "../types";

const useIsVibeLiked = (userId: string, vibeId: string, likes: Array<VibeLike>) => {
    let res: VibeLike[] = []
    likes?.forEach((like) => {
        if (like.user_id == userId && like.vibe_id == vibeId) res.push(like)
    });                
    if (typeof res == undefined) return
    return res.length > 0
}

export default useIsVibeLiked
