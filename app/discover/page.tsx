"use client";

import React from 'react';
import ContentFilter from '@/app/components/ContentFilter';
import Layout from '@/app/components/Layout';

const DiscoverPage = () => {
  return (
    <Layout>
      <div className="py-6 px-4 md:px-6">
        <div className="max-w-screen-xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Discover</h1>
            <p className="text-gray-400">Explore music, vibes, and trending tracks from around the world</p>
          </div>
          
          <ContentFilter />
        </div>
      </div>
    </Layout>
  );
};

export default DiscoverPage; 