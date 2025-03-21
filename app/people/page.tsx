"use client";

import PeoplePage from '@/app/components/PeoplePage';
import PeopleLayout from './layout/PeopleLayout';

export default function People() {
  return (
    <PeopleLayout>
      <PeoplePage />
    </PeopleLayout>
  );
}