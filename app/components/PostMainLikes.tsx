import { AiFillHeart } from "react-icons/ai";
import { FaShare, FaCommentDots, FaBuyNLarge, FaHeart } from "react-icons/fa";
import { useEffect, useState } from "react";
import { useUser } from "../context/user";
import { BiLoaderCircle } from "react-icons/bi";
import { useGeneralStore } from "../stores/general";
import { useRouter } from "next/navigation";
import { Comment, Like, PostMainLikesCompTypes } from "../types";
import useGetCommentsByPostId from "../hooks/useGetCommentsByPostId";
import useGetLikesByPostId from "../hooks/useGetLikesByPostId";
import useIsLiked from "../hooks/useIsLiked";
import useCreateLike from "../hooks/useCreateLike";
import useDeleteLike from "../hooks/useDeleteLike";
import { motion, AnimatePresence } from "framer-motion";

export default function PostMainLikes({ post }: PostMainLikesCompTypes) {
  let { setIsLoginOpen } = useGeneralStore();

  const router = useRouter();
  const contextUser = useUser();
  const [hasClickedLike, setHasClickedLike] = useState<boolean>(false);
  const [userLiked, setUserLiked] = useState<boolean>(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [likes, setLikes] = useState<Like[]>([]);
  const user = useUser();

  //Likes
  useEffect(() => {
    getAllLikesByPost();
    getAllCommentsByPost();
  }, [post]);

  useEffect(() => {
    hasUserLikedPost();
  }, [likes, contextUser]);

  const getAllCommentsByPost = async () => {
    let result = await useGetCommentsByPostId(post?.id);
    setComments(result);
  };

  const getAllLikesByPost = async () => {
    let result = await useGetLikesByPostId(post?.id);
    setLikes(result);
  };

  const hasUserLikedPost = () => {
    if (!contextUser) return;

    if (likes?.length < 1 || !contextUser?.user?.id) {
      setUserLiked(false);
      return;
    }
    let res = useIsLiked(contextUser?.user?.id, post?.id, likes);
    setUserLiked(res ? true : false);
  };

  const like = async () => {
    setHasClickedLike(true);
    await useCreateLike(contextUser?.user?.id || "", post?.id);
    await getAllLikesByPost();
    hasUserLikedPost();
    setHasClickedLike(false);
  };

  const unlike = async (id: string) => {
    setHasClickedLike(true);
    await useDeleteLike(id);
    await getAllLikesByPost();
    hasUserLikedPost();
    setHasClickedLike(false);
  };

  const likeOrUnlike = () => {
    if (!contextUser?.user?.id) {
      setIsLoginOpen(true);
      return;
    }

    let res = useIsLiked(contextUser?.user?.id, post?.id, likes);

    if (!res) {
      like();
    } else {
      likes.forEach((like: Like) => {
        if (
          contextUser?.user?.id == like?.user_id &&
          like?.post_id == post?.id
        ) {
          unlike(like?.id);
        }
      });
    }
  };

  return (
    <div id={`PostMainLikes-${post?.id}`} className="flex items-center gap-4">
      {/* Like Button */}
      <motion.button
        disabled={hasClickedLike}
        onClick={() => likeOrUnlike()}
        className="group flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-pink-500/30 transition-all duration-300 backdrop-blur-sm"
        whileHover={{ scale: 1.02, y: -1 }}
        whileTap={{ scale: 0.98 }}
      >
        <div className="relative">
          {!hasClickedLike ? (
            <motion.div
              animate={
                userLiked
                  ? {
                      scale: [1, 1.3, 1],
                      rotate: [0, 15, 0],
                    }
                  : {}
              }
              transition={{ duration: 0.6, type: "spring" }}
            >
              <FaHeart
                className={`text-lg transition-colors duration-300 ${
                  likes?.length > 0 && userLiked
                    ? "text-pink-500 drop-shadow-[0_0_8px_rgba(236,72,153,0.5)]"
                    : "text-white/70 group-hover:text-pink-400"
                }`}
              />
            </motion.div>
          ) : (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
              <BiLoaderCircle className="text-lg text-pink-400" />
            </motion.div>
          )}
        </div>
        <span
          className={`text-sm font-semibold transition-colors duration-300 ${
            likes?.length > 0 && userLiked
              ? "text-pink-400"
              : "text-white/80 group-hover:text-white"
          }`}
        >
          {likes?.length || 0}
        </span>
      </motion.button>

      {/* Comments Button */}
      <motion.button
        onClick={() =>
          router.push(`/post/${post?.id}/${post?.profile?.user_id}`)
        }
        className="group flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#20DDBB]/30 transition-all duration-300 backdrop-blur-sm"
        whileHover={{ scale: 1.02, y: -1 }}
        whileTap={{ scale: 0.98 }}
      >
        <FaCommentDots className="text-lg text-white/70 group-hover:text-[#20DDBB] transition-colors duration-300" />
        <span className="text-sm font-semibold text-white/80 group-hover:text-white transition-colors duration-300">
          {comments?.length || 0}
        </span>
      </motion.button>
    </div>
  );
}
