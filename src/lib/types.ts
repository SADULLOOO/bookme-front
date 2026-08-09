export type MembershipRole = "owner" | "admin" | "staff" | "client";

export interface User {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  is_active: boolean;
  is_email_verified: boolean;
  is_platform_admin: boolean;
  created_at: string;
}

export interface PlatformUser {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  is_active: boolean;
  is_email_verified: boolean;
  is_platform_admin: boolean;
  created_at: string;
  deleted_at: string | null;
}

export interface PlatformTopBusiness {
  name: string;
  slug: string;
  business_type: string;
  average_rating: number;
  review_count: number;
}

export interface PlatformStats {
  total_users: number;
  total_businesses: number;
  total_owners: number;
  by_business_type: Record<string, number>;
  user_growth: { month: string; count: number }[];
  business_growth: { month: string; count: number }[];
  top_businesses: PlatformTopBusiness[];
}

export interface OrganizationWithRole {
  id: string;
  name: string;
  slug: string;
  business_type: string;
  timezone: string;
  contact_email: string;
  contact_phone: string | null;
  is_active: boolean;
  created_at: string;
  role: MembershipRole;
  staff_id: string | null;
}

export interface PublicOrganizationSummary {
  id: string;
  name: string;
  slug: string;
  business_type: string;
  location: string | null;
  average_rating: number | null;
  review_count: number;
}

export interface PublicOrganization {
  id: string;
  name: string;
  slug: string;
  business_type: string;
  timezone: string;
  contact_email: string;
  contact_phone: string | null;
  is_active: boolean;
  created_at: string;
}

export interface PublicBranch {
  id: string;
  organization_id: string;
  name: string;
  address: string | null;
  timezone: string;
  phone: string | null;
  is_active: boolean;
}

export interface PublicService {
  id: string;
  organization_id: string;
  branch_id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  duration_minutes: number;
  price: number;
  deposit_amount: number | null;
  is_active: boolean;
}

export interface PublicStaffService {
  id: string;
  name: string;
  duration_minutes: number;
  price: number;
  deposit_amount: number | null;
}

export interface PublicStaff {
  id: string;
  branch_id: string;
  title: string | null;
  bio: string | null;
  avatar_url: string | null;
  calendar_color: string | null;
  full_name: string;
  average_rating: number | null;
  review_count: number;
  services: PublicStaffService[];
}

export interface Branch {
  id: string;
  organization_id: string;
  name: string;
  address: string | null;
  timezone: string;
  phone: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Member {
  id: string;
  user_id: string;
  role: MembershipRole;
  is_active: boolean;
  full_name: string;
  email: string;
  joined_at: string;
}

export type ApplicationStatus = "pending" | "approved" | "rejected";

export interface StaffApplication {
  id: string;
  applicant_id: string;
  applicant_name: string;
  organization_id: string;
  organization_name: string;
  desired_title: string;
  cv_url: string | null;
  experience: string | null;
  status: ApplicationStatus;
  rejection_reason: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface BusinessApplication {
  id: string;
  applicant_id: string;
  applicant_name: string;
  business_name: string;
  business_type: string;
  contact_phone: string | null;
  cv_url: string | null;
  experience: string | null;
  status: ApplicationStatus;
  rejection_reason: string | null;
  created_organization_id: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface RatingSummary {
  average_rating: number | null;
  review_count: number;
}

export interface Review {
  id: string;
  booking_id: string;
  organization_id: string;
  staff_id: string;
  service_id: string;
  rating: number;
  comment: string | null;
  client_display_name: string;
  created_at: string;
}

export interface StaffMember extends PublicStaff {
  membership_id: string;
  email: string;
}

export interface Service {
  id: string;
  organization_id: string;
  branch_id: string | null;
  category_id: string | null;
  name: string;
  description: string | null;
  duration_minutes: number;
  price: number;
  currency: string;
  buffer_before_minutes: number;
  buffer_after_minutes: number;
  deposit_amount: number | null;
  is_active: boolean;
  created_at: string;
}

export interface StaffServiceLink {
  staff_id: string;
  service_id: string;
  price_override: number | null;
  duration_override_minutes: number | null;
}

export interface WorkingHours {
  id: string;
  staff_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

export type BookingStatus = "pending" | "confirmed" | "cancelled" | "completed" | "no_show";
export type DepositStatus = "not_required" | "pending" | "paid" | "failed" | "refunded";

export interface Booking {
  id: string;
  organization_id: string;
  branch_id: string;
  service_id: string;
  staff_id: string;
  client_id: string;
  series_id: string | null;
  start_time: string;
  end_time: string;
  status: BookingStatus;
  notes: string | null;
  cancellation_reason: string | null;
  cancelled_at: string | null;
  deposit_amount: number | null;
  deposit_currency: string | null;
  deposit_status: DepositStatus;
  created_at: string;
}

export interface MyBooking extends Booking {
  organization_name: string;
  organization_slug: string;
}

export interface AnalyticsOverview {
  from_date: string;
  to_date: string;
  total_bookings: number;
  completed_count: number;
  cancelled_count: number;
  no_show_count: number;
  no_show_rate: number;
  revenue: { currency: string; amount: number }[];
  busiest_hours: { hour: number; count: number }[];
  staff_utilization: { staff_id: string; staff_name: string; booking_count: number; total_minutes: number }[];
}

export interface ReviewListOut {
  summary: RatingSummary;
  reviews: Review[];
}

export type PhoneShareStatus = "pending" | "approved" | "declined";

export interface PhoneShareRequest {
  id: string;
  organization_id: string;
  staff_id: string;
  client_id: string;
  booking_id: string | null;
  status: PhoneShareStatus;
  responded_at: string | null;
  created_at: string;
}

export interface ClientPhone {
  client_id: string;
  phone: string | null;
}

export interface ChatConversation {
  id: string;
  // null for a platform-support thread — it isn't tied to any business.
  organization_id: string | null;
  organization_name: string;
  client_id: string;
  client_name: string;
  last_message_at: string | null;
  last_message_preview: string | null;
  unread_count: number;
}

export interface AiMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export type AiProvider = "groq" | "deepseek";

export interface ChatMessageListOut {
  conversation: ChatConversation;
  messages: ChatMessage[];
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_role: MembershipRole;
  sender_name: string;
  body: string;
  created_at: string;
  read_at: string | null;
}

export type NotificationKind =
  | "booking_created"
  | "booking_confirmed"
  | "booking_cancelled"
  | "booking_completed"
  | "new_message"
  | "waitlist_available"
  | "review_received"
  | "role_changed"
  | "staff_invited"
  | "phone_share_requested"
  | "phone_share_responded";

export interface UserNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string | null;
  title_key: string | null;
  body_key: string | null;
  params: Record<string, string> | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

export interface NotificationListOut {
  unread_count: number;
  notifications: UserNotification[];
}
