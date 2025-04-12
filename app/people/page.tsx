"use client";

import React, { useEffect } from 'react';
import PeoplePage from '@/app/components/PeoplePage';
import PeopleLayout from './layout/PeopleLayout';

export default function People() {
  useEffect(() => {
    return () => {
      console.log('People page component unmounted');
    };
  }, []);

  return (
    <PeopleLayout>
      <PeoplePage />
    </PeopleLayout>
  );
}