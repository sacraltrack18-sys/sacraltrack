import { useGetUserSoldTracks } from "@/app/hooks/useGetUserSoldTracks";

export default function SoldTracksCard() {
  const { soldTracks } = useGetUserSoldTracks();

  return (
    <div className="bg-[#272B43] rounded-2xl p-4 border border-white/[0.03] hover:border-white/[0.05] transition-all duration-300 hover:shadow-md">
      <h3 className="text-white font-bold mb-2">Sold Tracks</h3>
      <div className="flex items-center justify-between">
        <span className="text-[#838383] text-sm">Total Sold</span>
        <span className="text-white text-2xl font-bold">{soldTracks}</span>
      </div>
    </div>
  );
}
