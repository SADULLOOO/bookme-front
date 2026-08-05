import { notFound } from "next/navigation";
import { OrgPageContent } from "@/components/booking/org-page-content";
import { API_URL } from "@/lib/api";
import { publicApiFetch } from "@/lib/api-server";
import type { PublicBranch, PublicOrganization, PublicService, PublicStaff, ReviewListOut } from "@/lib/types";

async function getOrg(slug: string): Promise<PublicOrganization | null> {
  const res = await fetch(`${API_URL}/public/organizations/${slug}`, { cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to load organization (${res.status})`);
  return res.json();
}

export default async function OrgPage({ params }: { params: Promise<{ org: string }> }) {
  const { org: slug } = await params;
  const org = await getOrg(slug);
  if (!org) notFound();

  const [branches, services, staff, reviewData] = await Promise.all([
    publicApiFetch<PublicBranch[]>(`/public/organizations/${slug}/branches`).catch(() => [] as PublicBranch[]),
    publicApiFetch<PublicService[]>(`/public/organizations/${slug}/services`).catch(() => [] as PublicService[]),
    publicApiFetch<PublicStaff[]>(`/public/organizations/${slug}/staff`).catch(() => [] as PublicStaff[]),
    publicApiFetch<ReviewListOut>(`/reviews/organization/${org.id}`).catch(() => null),
  ]);

  return <OrgPageContent org={org} branches={branches} services={services} staff={staff} reviewData={reviewData} />;
}
