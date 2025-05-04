// src/app/explore/page.tsx
import ExplorePageContent from '@/components/explore/ExplorePageContent';

// Keep this as a Server Component shell if no server-side logic is needed here.
// Or fetch initial data here if beneficial for SSR/SEO.
export default function ExplorePage() {
    return <ExplorePageContent />;
}
