import { Suspense } from "react";
import ProfileClientComponent from "@/app/components/profile/ProfileClientComponent";

export default function Profile() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#1A1A2E] flex items-center justify-center">
      <div className="animate-pulse text-white text-lg">Loading profile...</div>
    </div>}>
      <ProfileClientComponent />
    </Suspense>
  );
}