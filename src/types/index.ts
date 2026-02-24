export interface User {
  id: string;
  username: string;
  display_name: string | null;
  role: "admin" | "employee";
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuthUser {
  id: string;
  username: string;
  role: string;
}

export interface AppSetting {
  id: string;
  key: string;
  value: Record<string, unknown>;
  updated_at: string;
  updated_by: string | null;
}

export interface CurrencyRates {
  usd_try: number;
  eur_try: number;
}

export interface Note {
  id: string;
  body: string;
  visibility: "self" | "global";
  reminder_date: string | null;
  is_resolved: boolean;
  resolved_by: string | null;
  resolved_at: string | null;
  created_by: string;
  created_by_username: string;
  created_at: string;
  updated_at: string;
}

export interface Brand {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  product_count?: number;
}

export interface Supplier {
  id: string;
  name: string;
  contact_info: string | null;
  vade_days: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  product_count?: number;
}

export interface Product {
  id: string;
  name: string;
  description: string | null;
  netsis_code: string | null;
  image_url: string | null;
  brand_id: string | null;
  current_supplier_id: string | null;
  currency: "TRY" | "USD" | "EUR";
  list_price: number;
  discount_percent: number;
  kdv_percent: number;
  profit_percent: number;
  has_price2: boolean;
  price2_label: string;
  list_price2: number;
  discount_percent2: number;
  qr_code: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Joined fields
  brand?: Brand;
  supplier?: Supplier;
  variations?: ProductVariation[];
  variation_groups?: VariationGroup[];
}

export interface ProductSupplier {
  id: string;
  product_id: string;
  supplier_id: string;
  list_price: number;
  discount_percent: number;
  notes: string | null;
  is_current: boolean;
  created_at: string;
  updated_at: string;
  supplier?: Supplier;
}

export interface ProductVariation {
  id: string;
  product_id: string;
  variation_label: string;
  has_custom_price: boolean;
  list_price: number | null;
  discount_percent: number | null;
  list_price2: number | null;
  discount_percent2: number | null;
  sku: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface VariationGroup {
  id: string;
  product_id: string;
  name: string;
  values: string[];
  sort_order: number;
  created_at: string;
}

export interface RetailSale {
  id: string;
  sale_number: number;
  employee_id: string;
  employee_username: string;
  subtotal: number;
  discount_amount: number;
  total: number;
  payment_method: "cash" | "card";
  status: "completed" | "returned" | "partially_returned";
  notes: string | null;
  created_at: string;
  updated_at: string;
  items?: RetailSaleItem[];
}

export interface RetailSaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  product_name: string;
  product_image: string | null;
  brand_name: string | null;
  variation_label: string | null;
  quantity: number;
  unit_price: number;
  price_type: "price1" | "price2";
  currency: string;
  exchange_rate: number;
  unit_price_try: number;
  line_total: number;
  returned_quantity: number;
  created_at: string;
}

export interface RetailSale {
  id: string;
  sale_number: number;
  employee_id: string;
  employee_username: string;
  subtotal: number;
  discount_amount: number;
  total: number;
  payment_method: "cash" | "card";
  status: "completed" | "returned" | "partially_returned";
  notes: string | null;
  created_at: string;
  updated_at: string;
  items?: RetailSaleItem[];
}

export interface RetailSaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  product_name: string;
  product_image: string | null;
  brand_name: string | null;
  variation_label: string | null;
  quantity: number;
  unit_price: number;
  price_type: "price1" | "price2";
  currency: string;
  exchange_rate: number;
  unit_price_try: number;
  line_total: number;
  returned_quantity: number;
  created_at: string;
}

export interface CartItem {
  id: string;
  product_id: string;
  product_name: string;
  product_image: string | null;
  brand_name: string | null;
  variation_label: string | null;
  quantity: number;
  unit_price: number;
  price_type: "price1" | "price2";
  currency: string;
  exchange_rate: number;
  unit_price_try: number;
  line_total: number;
}