"use client"

const pageTranslations = {
    welcome: "Welcome to Sacral Track",
    subtitle: "Discover and share amazing music",
    trending: "Trending Tracks",
    newReleases: "New Releases",
    topArtists: "Top Artists",
    exploreMore: "Explore More",
    uploadTrack: "Upload Your Track",
    startListening: "Start Listening",
};

export default function HomePage() {
    const translations = pageTranslations;

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#2E2469] to-[#351E43]">
            <main className="container mx-auto px-4 py-8">
                <section className="text-center mb-12">
                    <h1 className="text-4xl font-bold mb-4">
                        {translations.welcome}
                    </h1>
                    <p className="text-xl text-gray-300">
                        {translations.subtitle}
                    </p>
                </section>

                <section className="mb-12">
                    <h2 className="text-2xl font-semibold mb-6">
                        {translations.trending}
                    </h2>
                    {/* Trending tracks content */}
                </section>

                <section className="mb-12">
                    <h2 className="text-2xl font-semibold mb-6">
                        {translations.newReleases}
                    </h2>
                    {/* New releases content */}
                </section>

                <section className="mb-12">
                    <h2 className="text-2xl font-semibold mb-6">
                        {translations.topArtists}
                    </h2>
                    {/* Top artists content */}
                </section>

                <div className="flex justify-center gap-4">
                    <button className="bg-[#20DDBB] text-black px-6 py-3 rounded-full hover:bg-[#1CB99D] transition-colors">
                        {translations.uploadTrack}
                    </button>
                    <button className="bg-[#3E83F7] text-white px-6 py-3 rounded-full hover:bg-[#5492FA] transition-colors">
                        {translations.startListening}
                    </button>
                </div>
            </main>
        </div>
    );
} 