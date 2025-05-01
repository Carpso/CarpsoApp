// src/app/profile/layout.tsx
import React from 'react';

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // This layout simply passes children through.
  // You could add profile-specific sidebars, headers, etc., here if needed later.
  return <>{children}</>;
}