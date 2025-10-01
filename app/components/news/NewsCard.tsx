import React, { useState } from "react";
import { NewsItem } from "@/app/stores/newsStore";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Portal from "../ui/Portal";
import { useUser } from "@/app/context/user";
import { database, ID, Query, Permission } from "@/libs/AppWriteClient";
import { toast } from "react-hot-toast";
import useGetNewsLikes from "@/app/hooks/useGetNewsLikes";
import Link from "next/link";
import {
  FaTwitter,
  FaFacebook,
  FaTelegram,
  FaVk
} from 'react-icons/fa';
import { DocumentDuplicateIcon } from "@heroicons/react/24/outline";
import {
  recordFailedImageRequest,
  fixAppwriteImageUrl,
  getAppwriteImageUrl,
} from "@/app/utils/appwriteImageUrl";

interface NewsCardProps {
  news: NewsItem;
  navigateOnClick?: boolean; // Default to false, only navigate if explicitly set to true
}

const NewsCard: React.FC<NewsCardProps> = ({
  news,
  navigateOnClick = false,
}) => {
  // Handle potential undefined values
  const title = news.name || "Untitled News";
  const description = news.description || "No description available";
  const { img_url, author, likes: initialLikes, created, $id } = news;

  // User context for authentication
  const { user } = useUser() || {};

  // States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(initialLikes || 0);
  const [isLikeProcessing, setIsLikeProcessing] = useState(false);
  const [isModalLoading, setIsModalLoading] = useState(true); // Add loading state for modal content
  const [isShareModalOpen, setIsShareModalOpen] = useState(false); // State for share modal

  // Format date
  const formattedDate = created
    ? new Date(created).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "Unknown date";

  // Placeholder image if img_url is missing
  const fallbackImageUrl = "/images/placeholders/news-placeholder.svg";
  const rawImageUrl = img_url || fallbackImageUrl;

  // Debug logging
  console.log(`[NEWS-IMAGE] News ID: ${$id}, img_url: ${img_url}, rawImageUrl: ${rawImageUrl}`);

  // Try to get proper Appwrite image URL first, then fix if needed
  let imageUrl = rawImageUrl;
  if (img_url && !img_url.startsWith('http') && !img_url.startsWith('/')) {
    // This looks like a file ID, use getAppwriteImageUrl
    imageUrl = getAppwriteImageUrl(img_url, fallbackImageUrl);
    console.log(`[NEWS-IMAGE] Generated Appwrite URL: ${imageUrl}`);
  } else {
    // This is already a URL, just fix it if needed
    imageUrl = fixAppwriteImageUrl(rawImageUrl, fallbackImageUrl);
    console.log(`[NEWS-IMAGE] Fixed existing URL: ${imageUrl}`);
  }

  // Load likes data when component mounts
  React.useEffect(() => {
    if ($id) {
      loadLikesData();
    }
  }, [$id]);

  // Check if user has liked this news when user changes
  React.useEffect(() => {
    if (user && $id) {
      checkUserLike();
    }
  }, [user, $id]);

  // Function to load current likes data
  const loadLikesData = async () => {
    try {
      const likesData = await useGetNewsLikes($id);
      setLikeCount(likesData.likesCount);
    } catch (error) {
      console.error("Error loading likes data:", error);
    }
  };

  // Function to check if user has liked this post
  const checkUserLike = async () => {
    if (!user?.id) return;

    const dbId = process.env.NEXT_PUBLIC_DATABASE_ID;
    const collectionId = process.env.NEXT_PUBLIC_COLLECTION_ID_NEWS_LIKE || '67db665e002906c5c567';

    try {
      // Check if user has already liked this news using centralized database client
      const response = await database.listDocuments(
        dbId as string,
        collectionId as string,
        [
          Query.equal("user_id", user.id as string),
          Query.equal("news_id", $id),
        ],
      );

      if (response.documents.length > 0) {
        setIsLiked(true);
      }
    } catch (error: any) {
      console.error("Error checking like status:", error);
    }
  };

  // Function to handle like/unlike
  const handleLike = async () => {
    if (!user) {
      toast.error("Please log in to like news", {
        style: {
          border: "1px solid #713200",
          padding: "16px",
          color: "#713200",
        },
        iconTheme: {
          primary: "#713200",
          secondary: "#FFFAEE",
        },
      });
      return;
    }

    if (isLikeProcessing) return;

    setIsLikeProcessing(true);

    const dbId = process.env.NEXT_PUBLIC_DATABASE_ID;
    const collectionId = process.env.NEXT_PUBLIC_COLLECTION_ID_NEWS_LIKE || '67db665e002906c5c567';

    // Debug information
    console.log("Using database ID:", dbId);
    console.log("Using collection ID:", collectionId);
    console.log("Current user ID:", user.id);

    try {
      if (!isLiked) {
        // Add like using centralized database client
        await database.createDocument(
          dbId as string,
          collectionId as string,
          ID.unique(),
          {
            post_id: $id,
            user_id: user.id,
            news_id: $id,
            created_at: new Date().toISOString(),
          },
          // Use permission to ensure document can be created by the current user
          // and read by the current user
          [
            Permission.read("user:" + user.id),
            Permission.update("user:" + user.id),
            Permission.delete("user:" + user.id),
          ],
        );

        // Update local state
        setLikeCount((prev) => prev + 1);
        setIsLiked(true);

        // Update the news document with new like count
        try {
          await database.updateDocument(
            dbId as string,
            process.env.NEXT_PUBLIC_COLLECTION_ID_NEWS as string,
            $id,
            {
              likes: likeCount + 1
            }
          );
        } catch (updateError) {
          console.warn("Failed to update news like count:", updateError);
        }

        toast.success("Added to liked news!");
      } else {
        // Remove like using centralized database client
        const response = await database.listDocuments(
          dbId as string,
          collectionId as string,
          [
            Query.equal("user_id", user.id as string),
            Query.equal("news_id", $id),
          ],
        );

        if (response.documents.length > 0) {
          await database.deleteDocument(
            dbId as string,
            collectionId as string,
            response.documents[0].$id,
          );
        }

        // Update local state
        setLikeCount((prev) => prev - 1);
        setIsLiked(false);

        // Update the news document with new like count
        try {
          await database.updateDocument(
            dbId as string,
            process.env.NEXT_PUBLIC_COLLECTION_ID_NEWS as string,
            $id,
            {
              likes: Math.max(0, likeCount - 1) // Ensure likes don't go below 0
            }
          );
        } catch (updateError) {
          console.warn("Failed to update news like count:", updateError);
        }

        toast.success("Removed from liked news");
      }
    } catch (error: any) {
      console.error("Error liking/unliking news:", error);

      // More detailed error message to help with debugging
      if (
        error.message &&
        error.message.includes(
          "Collection with the requested ID could not be found",
        )
      ) {
        toast.error(
          "The news likes collection does not exist. Please create it in your Appwrite dashboard with ID: " +
            collectionId,
        );
      } else if (error.message && error.message.includes("not authorized")) {
        toast.error(
          "У коллекции неправильные настройки прав доступа. Пожалуйста, настройте разрешения в панели Appwrite.",
        );
        console.error(
          "Правка для администратора: В коллекции news_like нужно настроить разрешения для создания документов пользователями.",
        );
      } else {
        toast.error(`Error: ${error.message || "Unknown error occurred"}`);
      }
    } finally {
      setIsLikeProcessing(false);
    }
  };

  // Function to handle share
  const handleShare = () => {
    setIsShareModalOpen(true);
  };

  // Fallback share method (copy to clipboard)
  const fallbackShare = async () => {
    try {
      const url = `${window.location.origin}/news/${$id}`;
      await navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard!', {
        icon: '🔗',
        style: {
          borderRadius: '10px',
          background: '#333',
          color: '#fff',
        },
      });
    } catch (err) {
      console.error('Error copying link:', err);
      toast.error('Could not copy link', {
        duration: 3000,
        style: {
          background: '#333',
          color: '#fff',
          borderRadius: '10px'
        }
      });
    }
    setIsShareModalOpen(false);
  };

  // Function to share in specific social network
  const shareToSocialMedia = (network: string) => {
    const url = encodeURIComponent(`${window.location.origin}/news/${$id}`);
    const titleEncoded = encodeURIComponent(title);
    const descriptionEncoded = encodeURIComponent(
      description.substring(0, 100) + "...",
    );
    let shareUrl = "";

    switch (network) {
      case "facebook":
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
        break;
      case "twitter":
        shareUrl = `https://twitter.com/intent/tweet?url=${url}&text=${titleEncoded}`;
        break;
      case "telegram":
        shareUrl = `https://t.me/share/url?url=${url}&text=${titleEncoded}`;
        break;
      case "whatsapp":
        shareUrl = `https://api.whatsapp.com/send?text=${titleEncoded}%20${url}`;
        break;
      case "linkedin":
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${url}`;
        break;
      case "vk":
        shareUrl = `https://vk.com/share.php?url=${url}&title=${titleEncoded}&description=${descriptionEncoded}`;
        break;
      default:
        fallbackShare();
        return;
    }

    window.open(shareUrl, "_blank", "noopener,noreferrer");
    setIsShareModalOpen(false);
    toast.success(
      `Shared to ${network.charAt(0).toUpperCase() + network.slice(1)}`,
    );
  };

  // Function to handle card click
  const handleCardClick = (e?: React.MouseEvent) => {
    // Allow middle-click and ctrl+click to open in new tab
    if (e && (e.ctrlKey || e.metaKey || e.button === 1)) {
      window.open(`/news/${$id}`, '_blank');
      return;
    }

    if (navigateOnClick) {
      // Use client-side navigation to the individual news page
      window.location.href = `/news/${$id}`;
    } else {
      // Open the modal
      setIsModalOpen(true);
      // Simulate loading (for demonstration)
      setIsModalLoading(true);
      setTimeout(() => {
        setIsModalLoading(false);
      }, 1000);
    }
  };

  // Generate structured data for SEO
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    "headline": title,
    "description": description,
    "image": img_url ? getAppwriteImageUrl(img_url) : "/default-news-image.jpg",
    "datePublished": created,
    "dateModified": created,
    "author": {
      "@type": "Person",
      "name": author || "SacralTrack News"
    },
    "publisher": {
      "@type": "Organization",
      "name": "SacralTrack",
      "logo": {
        "@type": "ImageObject",
        "url": "/logo.png"
      }
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": `https://sacraltrack.com/news/${$id}`
    },
    "interactionStatistic": {
      "@type": "InteractionCounter",
      "interactionType": "https://schema.org/LikeAction",
      "userInteractionCount": likeCount
    }
  };

  return (
    <>
      {/* Structured Data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <motion.article
        className="bg-[#1E2136] rounded-xl overflow-hidden shadow-lg mb-6 w-full transition-all duration-300 hover:shadow-purple-500/20 cursor-pointer"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        whileHover={{ y: -5 }}
        onClick={(e) => handleCardClick(e)}
        itemScope
        itemType="https://schema.org/NewsArticle"
        role="article"
        aria-label={`News article: ${title}`}
      >
        <div className="relative overflow-hidden h-48">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#1E2136]/70 z-10" />

          {/* Image with fallback */}
          <div className="relative h-full w-full bg-[#272B43]">
            <Image
              src={imageUrl}
              alt={`${title} - SacralTrack News`}
              fill
              style={{ objectFit: "cover" }}
              className="transition-transform duration-700 hover:scale-110"
              onError={(e) => {
                console.error(`[NEWS-IMAGE] Failed to load image: ${imageUrl} for news ${$id}`);

                // Check if max retries reached
                const shouldUseDefaultImage = recordFailedImageRequest(imageUrl);

                // Always use fallback image on error to prevent infinite retries
                (e.target as HTMLImageElement).src = fallbackImageUrl;
                console.log(`[NEWS-IMAGE] Using fallback image: ${fallbackImageUrl}`);
              }}
              priority
              itemProp="image"
              loading="eager"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />

            {/* Likes indicator */}
            <div
              className="absolute top-4 right-4 z-20 flex items-center bg-purple-600/80 px-2 py-1 rounded-full backdrop-blur-sm"
              onClick={(e) => e.stopPropagation()}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 text-white"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  d="M10 12.585l-4.243-4.242a3 3 0 114.243-4.243 3 3 0 014.243 4.243L10 12.586z"
                  fillRule="evenodd"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-white ml-1 text-xs">{likeCount}</span>
            </div>
          </div>
        </div>

        <div className="px-5 py-4">
          <div className="flex items-center mb-2 text-xs text-gray-400">
            <span>{formattedDate}</span>
            {author && (
              <>
                <span className="mx-2">•</span>
                <span>{author}</span>
              </>
            )}
          </div>

          <h3
            className="text-white font-bold text-lg mb-2 line-clamp-2 leading-tight"
            itemProp="headline"
          >
            {title}
          </h3>

          <p
            className="text-gray-300 text-sm mb-4 line-clamp-2"
            itemProp="description"
          >
            {description}
          </p>

          {/* Hidden SEO metadata */}
          <meta itemProp="datePublished" content={created} />
          <meta itemProp="dateModified" content={created} />
          <div itemProp="author" itemScope itemType="https://schema.org/Person" style={{ display: 'none' }}>
            <meta itemProp="name" content={author || "SacralTrack News"} />
          </div>
          <div itemProp="publisher" itemScope itemType="https://schema.org/Organization" style={{ display: 'none' }}>
            <meta itemProp="name" content="SacralTrack" />
            <div itemProp="logo" itemScope itemType="https://schema.org/ImageObject">
              <meta itemProp="url" content="/logo.png" />
            </div>
          </div>

          <div
            className="flex items-center justify-between"
            onClick={(e) => e.stopPropagation()}
          >
            <motion.button
              className="bg-white/10 hover:bg-white/20 text-white text-sm font-medium py-2 px-4 rounded-lg flex items-center shadow-lg backdrop-blur-md border border-white/20 glass-effect transition-all duration-300"
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.97 }}
              onClick={(e) => {
                e.stopPropagation();
                setIsModalOpen(true);
                setIsModalLoading(true);
                setTimeout(() => setIsModalLoading(false), 1000);
              }}
            >
              Read more
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 ml-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M14 5l7 7m0 0l-7 7m7-7H3"
                />
              </svg>
            </motion.button>

            <div className="flex space-x-2">
              <motion.button
                className={`flex items-center justify-center p-2 rounded-full shadow-lg backdrop-blur-md border border-white/10 glass-effect transition-all duration-300 ${isLiked ? "bg-purple-500/80 text-white" : "bg-white/10 text-gray-400 hover:text-white hover:bg-purple-500/30"}`}
                whileHover={{ scale: 1.13 }}
                whileTap={{ scale: 0.93 }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleLike();
                }}
                disabled={isLikeProcessing}
              >
                {isLikeProcessing ? (
                  <div className="w-5 h-5 border-2 border-gray-300 border-t-purple-500 rounded-full animate-spin" />
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 mr-1"
                    fill={isLiked ? "currentColor" : "none"}
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={isLiked ? 0 : 2}
                      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                    />
                  </svg>
                )}
              </motion.button>

              <motion.button
                className="flex items-center justify-center p-2 rounded-full bg-white/10 text-gray-400 hover:text-white hover:bg-purple-500/30 shadow-lg backdrop-blur-md border border-white/10 glass-effect transition-all duration-300"
                whileHover={{ scale: 1.13 }}
                whileTap={{ scale: 0.93 }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleShare();
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                  />
                </svg>
              </motion.button>
            </div>
          </div>
        </div>
      </motion.article>

      {/* News reading modal */}
      <Portal>
        <AnimatePresence>
          {isModalOpen && (
          <motion.div
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto"
            style={{ paddingTop: '50px' }}
            onClick={() => setIsModalOpen(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-gradient-to-br from-[#1E2136] to-[#2A2F4A] rounded-2xl w-full max-w-4xl max-h-[calc(90vh-50px)] overflow-hidden shadow-2xl border border-purple-500/20"
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
            >
              <div className="relative h-64 sm:h-96">
                <Image
                  src={imageUrl}
                  alt={title}
                  fill
                  style={{ objectFit: "cover" }}
                  className="w-full"
                  onError={(e) => {
                    console.error(`[NEWS-IMAGE] Failed to load modal image: ${imageUrl} for news ${$id}`);

                    // Check if max retries reached
                    const shouldUseDefaultImage = recordFailedImageRequest(imageUrl);

                    // Always use fallback image on error to prevent infinite retries
                    (e.target as HTMLImageElement).src = fallbackImageUrl;
                    console.log(`[NEWS-IMAGE] Using fallback image in modal: ${fallbackImageUrl}`);
                  }}
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#1E2136]/90" />

                <button
                  className="absolute top-4 right-4 bg-black/50 p-2 rounded-full text-white hover:bg-black/70 backdrop-blur-sm transition-all"
                  onClick={() => setIsModalOpen(false)}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>

                <div className="absolute bottom-6 left-6 right-6">
                  <h1
                    className="text-white font-bold text-2xl md:text-3xl mb-2 drop-shadow-lg"
                    itemProp="headline"
                  >
                    {title}
                  </h1>
                  <div className="flex items-center text-sm text-gray-200">
                    <span>{formattedDate}</span>
                    {author && (
                      <>
                        <span className="mx-2">•</span>
                        <span>{author}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-6 overflow-y-auto max-h-[calc(90vh-24rem)]">
                {isModalLoading ? (
                  <div className="animate-pulse space-y-4">
                    {/* Description placeholder */}
                    <div className="h-4 bg-[#272B43] rounded w-full"></div>
                    <div className="h-4 bg-[#272B43] rounded w-5/6"></div>
                    <div className="h-4 bg-[#272B43] rounded w-full"></div>
                    <div className="h-4 bg-[#272B43] rounded w-4/5"></div>

                    {/* More content placeholder */}
                    <div className="h-4 bg-[#272B43] rounded w-full mt-8"></div>
                    <div className="h-4 bg-[#272B43] rounded w-5/6"></div>
                    <div className="h-4 bg-[#272B43] rounded w-full"></div>

                    {/* Footer placeholder */}
                    <div className="mt-8 pt-6 border-t border-gray-700 flex justify-between items-center">
                      <div className="h-8 bg-[#272B43] rounded w-20"></div>
                      <div className="h-8 bg-[#272B43] rounded w-20"></div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="text-gray-300 space-y-4">
                      <p>{description}</p>

                      {/* If there's more content in the news, display it here */}
                      {/* For now, duplicate description as placeholder */}
                      <p>{description}</p>
                      <p>{description}</p>
                    </div>

                    <div className="mt-8 pt-6 border-t border-gray-700 flex justify-between items-center">
                      <motion.button
                        className={`flex items-center ${isLiked ? "text-purple-400" : "text-gray-400 hover:text-white"} transition-all`}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleLike}
                        disabled={isLikeProcessing}
                      >
                        {isLikeProcessing ? (
                          <div className="w-5 h-5 mr-2 border-2 border-gray-300 border-t-purple-500 rounded-full animate-spin" />
                        ) : (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5 mr-1"
                            fill={isLiked ? "currentColor" : "none"}
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={isLiked ? 0 : 2}
                              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                            />
                          </svg>
                        )}
                        {isLiked ? "Liked" : "Like"}
                      </motion.button>

                      <motion.button
                        className="text-gray-400 hover:text-white flex items-center transition-all"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleShare}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5 mr-1"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                          />
                        </svg>
                        Share
                      </motion.button>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
          )}
        </AnimatePresence>
      </Portal>

      {/* Share Modal */}
      <Portal>
        <AnimatePresence>
          {isShareModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            style={{ paddingTop: '50px' }}
            onClick={() => setIsShareModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-gradient-to-br from-[#24183D] to-[#0F172A] rounded-2xl w-full max-w-md max-h-[calc(90vh-50px)] overflow-y-auto p-6 shadow-xl border border-white/10"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-white">Share this News</h2>
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setIsShareModalOpen(false)}
                  className="p-1 rounded-full hover:bg-white/10 transition-colors"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </motion.button>
              </div>

              <div className="mb-6 bg-black/20 rounded-xl p-3 border border-white/5 flex items-center space-x-3">
                <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                  <Image
                    src={imageUrl}
                    alt={title || 'News preview'}
                    className="object-cover w-full h-full"
                    width={64}
                    height={64}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-white font-medium text-sm mb-1 truncate">
                    {title}
                  </h4>
                  <p className="text-gray-400 text-xs truncate">
                    {description?.substring(0, 60)}...
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => shareToSocialMedia('vk')}
                  className="flex flex-col items-center p-4 rounded-xl bg-[#4C75A3]/10 hover:bg-[#4C75A3]/20 border border-[#4C75A3]/30 transition-all"
                >
                  <FaVk className="text-[#4C75A3] text-2xl mb-2" />
                  <span className="text-white text-sm font-medium">VK</span>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => shareToSocialMedia('telegram')}
                  className="flex flex-col items-center p-4 rounded-xl bg-[#0088cc]/10 hover:bg-[#0088cc]/20 border border-[#0088cc]/30 transition-all"
                >
                  <FaTelegram className="text-[#0088cc] text-2xl mb-2" />
                  <span className="text-white text-sm font-medium">Telegram</span>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => shareToSocialMedia('twitter')}
                  className="flex flex-col items-center p-4 rounded-xl bg-[#1DA1F2]/10 hover:bg-[#1DA1F2]/20 border border-[#1DA1F2]/30 transition-all"
                >
                  <FaTwitter className="text-[#1DA1F2] text-2xl mb-2" />
                  <span className="text-white text-sm font-medium">Twitter</span>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => shareToSocialMedia('facebook')}
                  className="flex flex-col items-center p-4 rounded-xl bg-[#4267B2]/10 hover:bg-[#4267B2]/20 border border-[#4267B2]/30 transition-all"
                >
                  <FaFacebook className="text-[#4267B2] text-2xl mb-2" />
                  <span className="text-white text-sm font-medium">Facebook</span>
                </motion.button>
              </div>

              {/* Copy link button */}
              <motion.button
                whileHover={{ scale: 1.03, backgroundColor: 'rgba(32, 221, 187, 0.9)' }}
                whileTap={{ scale: 0.97 }}
                onClick={fallbackShare}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#20DDBB] to-[#20DDBB]/90 text-white font-medium shadow-lg shadow-[#20DDBB]/20 flex items-center justify-center"
              >
                <DocumentDuplicateIcon className="w-5 h-5 mr-2" />
                Copy Link to Clipboard
              </motion.button>

            </motion.div>
          </motion.div>
          )}
        </AnimatePresence>
      </Portal>
    </>
  );
};

export default NewsCard;
