export type UserRole = 'visitor' | 'exhibitor';

export type Exhibition = {
  id: string;
  name: string;
  description: string;
  location: string;
  start_date: string;
  end_date: string;
  image_url?: string;
};

export type Booth = {
  id: string;
  exhibition_id: string;
  company_name: string;
  description: string;
  logo_url?: string;
  booth_number: string;
  hall: string;
  tags: string[];
};

export type Product = {
  id: string;
  booth_id: string;
  name: string;
  description: string;
  category: string;
  image_url?: string;
};

export type SavedItem = {
  id: string;
  user_id: string;
  product_id?: string;
  booth_id?: string;
  note?: string;
  created_at: string;
};

export type UserProfile = {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  company_name?: string;
  avatar_url?: string;
};