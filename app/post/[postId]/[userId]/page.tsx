{/* COMMENT SECTION HEAD */}

import { Suspense } from "react";
import PostClientComponent from "@/app/components/post/PostClientComponent";

export default function Post() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#1A1A2E] flex items-center justify-center">
      <div className="animate-pulse text-white text-lg">Loading post...</div>
    </div>}>
      <PostClientComponent />
    </Suspense>
  );
}
