import { LandingContent } from "@/components/landing/landing-content";
import { publicApiFetch } from "@/lib/api-server";
import type { PublicOrganizationSummary } from "@/lib/types";

async function getFeaturedBusinesses(): Promise<PublicOrganizationSummary[]> {
  try {
    return await publicApiFetch<PublicOrganizationSummary[]>("/public/organizations?limit=9");
  } catch {
    return [];
  }
}

export default async function LandingPage() {
  const businesses = await getFeaturedBusinesses();
  return <LandingContent businesses={businesses} />;
}
