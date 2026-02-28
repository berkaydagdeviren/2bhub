import { getAuthUser } from "@/lib/auth";
import Link from "next/link";
import {
  Package,
  ShoppingCart,
  Building2,
  BarChart3,
  Users,
  Truck,
  Tag,
} from "lucide-react";

const MODULES = [
  {
    title: "Product Creation",
    description: "Add and manage your product catalog",
    icon: Package,
    href: "/dashboard/products",
    ready: true,
  },
  {
    title: "Retail Sales",
    description: "Process walk-in customer transactions",
    icon: ShoppingCart,
    href: "/dashboard/sales",
    ready: true,
  },
  {
    title: "B2B Sales",
    description: "Manage business-to-business orders",
    icon: Building2,
    href: "/dashboard/sales?mode=b2b",
    ready: true,
  },
  {
    title: "Brands",
    description: "Manage product brands & catalog",
    icon: Tag,
    href: "/dashboard/brands",
    ready: true,
  },
  {
    title: "Suppliers",
    description: "Supply chain & price tracking",
    icon: Truck,
    href: "/dashboard/suppliers",
    ready: true,
  },
    {
    title: "Firms",
    description: "B2B customer accounts & records",
    icon: Users,
    href: "/dashboard/firms",
    ready: true,
  },
  {
    title: "Reports",
    description: "Analytics, revenue & performance",
    icon: BarChart3,
    href: "/dashboard/reports",
    ready: false,
  },
];

export default async function DashboardPage() {
  const user = await getAuthUser();

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-light text-hub-primary leading-tight">
          Welcome back,{" "}
          <span className="font-semibold">{user?.username ?? "User"}</span>
        </h1>
        <p className="text-hub-secondary mt-2 text-[15px]">
          Your operational hub is ready.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {MODULES.map((mod) => {
  const Icon = mod.icon;

  const content = (
    <>
      <div className="flex items-start justify-between mb-4">
        <div className="w-12 h-12 rounded-xl bg-hub-accent/10 flex items-center justify-center group-hover:bg-hub-accent/[0.15] transition-colors duration-300">
          <Icon className="w-6 h-6 text-hub-accent" />
        </div>
        <span
          className={`text-[10px] font-semibold uppercase tracking-[0.15em] px-2.5 py-1 rounded-full ${
            mod.ready
              ? "text-hub-success bg-hub-success/10"
              : "text-hub-muted bg-hub-bg"
          }`}
        >
          {mod.ready ? "Active" : "Soon"}
        </span>
      </div>
      <h3 className="text-[15px] font-semibold text-hub-primary">
        {mod.title}
      </h3>
      <p className="text-sm text-hub-secondary mt-1 leading-relaxed">
        {mod.description}
      </p>
    </>
  );

  const className = `card p-6 transition-all duration-300 group ${
    mod.ready
      ? "hover:shadow-hub-md cursor-pointer hover:border-hub-accent/30"
      : "opacity-75"
  }`;

  return mod.ready ? (
    <Link key={mod.title} href={mod.href} className={className}>
      {content}
    </Link>
  ) : (
    <div key={mod.title} className={className}>
      {content}
    </div>
  );
})}
      </div>
    </div>
  );
}