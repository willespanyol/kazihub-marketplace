import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Link, useNavigate, useParams } from "react-router-dom";
import { Search, ShieldCheck, CreditCard, Users, Star, ArrowRight, Bell, Heart, MessageCircle } from "lucide-react";
import { categories } from "./data/categories";
import { services } from "./data/services";
import { useAuth } from "./context/AuthContext";
import { supabase } from "./lib/supabaseClient";
async function sendNotification({ userId, type, title, message, link }) {
  if (!userId) return;

  const { error } = await supabase.rpc("create_notification", {
    target_user_id: userId,
    notification_type: type,
    notification_title: title,
    notification_message: message,
    notification_link: link || null,
  });

  if (error) {
    console.error("Notification error:", error.message);
  }
}
function Header() {
  const { user, profile, signOut } = useAuth();
const [notifications, setNotifications] = useState([]);
const [notificationsOpen, setNotificationsOpen] = useState(false);
const [loadingNotifications, setLoadingNotifications] = useState(false);
  let dashboardLink = "/buyer-dashboard";

  if (profile?.role === "seller") {
    dashboardLink = "/seller-dashboard";
  }

  if (profile?.role === "admin") {
    dashboardLink = "/admin";
  }
async function fetchNotifications() {
  if (!user) {
    setNotifications([]);
    return;
  }

  setLoadingNotifications(true);

  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10);

  if (!error) {
    setNotifications(data || []);
  }

  setLoadingNotifications(false);
}

useEffect(() => {
  fetchNotifications();
}, [user]);

async function markNotificationRead(notification) {
  if (!notification || notification.is_read) return;

  await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notification.id);

  await fetchNotifications();
}

async function markAllNotificationsRead() {
  if (!user) return;

  await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", user.id)
    .eq("is_read", false);

  await fetchNotifications();
}

const unreadNotificationCount = notifications.filter(
  (notification) => !notification.is_read
).length;
  async function handleLogout() {
    await signOut();
    window.location.href = "/";
  }

  return (
    <header className="sticky top-0 z-50 border-b bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
        <Link to="/" className="text-2xl font-bold text-primary">
          KaziHub
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium text-slate-700 md:flex">
          <Link to="/services">Browse Services</Link>
          <Link to="/categories/engineering-and-architecture">Categories</Link>
          <Link to="/project-requests">Project Requests</Link>
          <Link to="/messages" className="inline-flex items-center gap-1">
            <MessageCircle size={16} /> Messages
          </Link>
          <Link to="/support">Support</Link>
          <Link to="/seller-dashboard">Sell Services</Link>
          {profile?.role === "admin" && <Link to="/admin">Admin</Link>}
        </nav>

        <div className="flex items-center gap-3">
          {user ? (
            <>
            <div className="relative">
  <button
    onClick={() => {
      setNotificationsOpen((current) => !current);
      fetchNotifications();
    }}
    className="relative rounded-full bg-slate-100 p-2 text-slate-700"
    aria-label="Notifications"
  >
    <Bell size={18} />

    {unreadNotificationCount > 0 && (
      <span className="absolute -right-1 -top-1 rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
        {unreadNotificationCount}
      </span>
    )}
  </button>

  {notificationsOpen && (
    <div className="absolute right-0 mt-3 w-80 overflow-hidden rounded-2xl border bg-white shadow-lg">
      <div className="flex items-center justify-between border-b p-4">
        <p className="font-bold">Notifications</p>

        <button
          onClick={markAllNotificationsRead}
          className="text-xs font-semibold text-primary"
        >
          Mark all read
        </button>
      </div>

      {loadingNotifications ? (
        <p className="p-4 text-sm text-muted">Loading...</p>
      ) : notifications.length === 0 ? (
        <p className="p-4 text-sm text-muted">No notifications yet.</p>
      ) : (
        <div className="max-h-96 overflow-y-auto">
          {notifications.map((notification) => (
            <Link
              key={notification.id}
              to={notification.link || dashboardLink}
              onClick={async () => {
                await markNotificationRead(notification);
                setNotificationsOpen(false);
              }}
              className={`block border-b p-4 text-sm hover:bg-slate-50 ${
                notification.is_read ? "bg-white" : "bg-teal-50"
              }`}
            >
              <p className="font-semibold">{notification.title}</p>
              <p className="mt-1 line-clamp-2 text-muted">
                {notification.message}
              </p>
              <p className="mt-2 text-xs text-slate-400">
                {new Date(notification.created_at).toLocaleString()}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )}
</div>
              <Link to={dashboardLink} className="text-sm font-semibold text-slate-700">
                Dashboard
              </Link>

              <button
                onClick={handleLogout}
                className="rounded-full bg-slate-100 px-5 py-2 text-sm font-semibold text-slate-700"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-sm font-semibold text-slate-700">
                Login
              </Link>

              <Link
                to="/signup"
                className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white"
              >
                Join
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function isSuspended(profile) {
  return profile?.account_status === "suspended";
}

function AccountStatusBanner() {
  const { profile } = useAuth();

  if (!profile || profile.account_status !== "suspended") {
    return null;
  }

  return (
    <div className="border-b border-red-200 bg-red-50 px-5 py-3 text-sm text-red-700">
      <div className="mx-auto max-w-7xl">
        <strong>Your account is suspended.</strong>{" "}
        You can browse the platform, but you cannot create offers, place orders, send messages, upload files, or request payouts.
        {profile.suspended_reason && (
          <span> Reason: {profile.suspended_reason}</span>
        )}
      </div>
    </div>
  );
}

function HomePage() {
  const [pageCategories, setPageCategories] = useState(categories);

  useEffect(() => {
    async function fetchPageCategories() {
      const { data, error } = await supabase
        .from("marketplace_categories")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (!error && data?.length) {
        setPageCategories(data);
      }
    }

    fetchPageCategories();
  }, []);

  return (
    <main>
      <section className="bg-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-20 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="mb-4 inline-flex rounded-full bg-teal-50 px-4 py-2 text-sm font-semibold text-primary">
              Engineering-first freelance marketplace
            </p>

            <h1 className="text-4xl font-bold tracking-tight text-dark md:text-6xl">
              Hire trusted experts for any professional service.
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-8 text-muted">
              KaziHub connects buyers with verified sellers offering engineering,
              design, tech, creative, business, and AI services. Start with a fixed
              Service Offer or post a Project Request.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/services"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 font-semibold text-white"
              >
                Browse Services <ArrowRight size={18} />
              </Link>
              <Link
                to="/signup"
                className="inline-flex items-center justify-center rounded-full border border-slate-300 px-6 py-3 font-semibold text-slate-800"
              >
                Become a Seller
              </Link>
            </div>
          </div>

          <div className="rounded-3xl bg-slate-100 p-5">
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3 rounded-2xl border p-4">
                <Search className="text-primary" />
                <input
                  className="w-full outline-none"
                  placeholder="Search structural design, logo design, AI automation..."
                />
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {services.map((service) => (
                  <div key={service.id} className="rounded-2xl border bg-white p-4">
                    <img
                      src={service.image}
                      alt={service.title}
                      className="h-32 w-full rounded-xl object-cover"
                    />
                    <p className="mt-3 text-xs font-semibold text-primary">
                      {service.category}
                    </p>
                    <h3 className="mt-1 font-semibold">{service.title}</h3>
                    <p className="mt-2 text-sm text-muted">From ${service.price}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16">
        <div className="grid gap-5 md:grid-cols-3">
          <FeatureCard
            icon={<ShieldCheck />}
            title="Instant live services"
            text="Every Service Offer goes live immediately after submission."
          />
          <FeatureCard
            icon={<CreditCard />}
            title="Payments from day one"
            text="Buyer payments, platform commission, and seller payouts are built into the system."
          />
          <FeatureCard
            icon={<Users />}
            title="Buyer and seller accounts"
            text="Users choose their role during signup, keeping dashboards simple and clear."
          />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-20">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="text-3xl font-bold">Popular categories</h2>
            <p className="mt-2 text-muted">
              Engineering is prioritised, but the platform supports all major freelance services.
            </p>
          </div>
          <Link to="/services" className="hidden font-semibold text-primary md:block">
            View all
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {pageCategories.slice(0, 8).map((category) => (
            <Link
              key={category.name}
              to={`/categories/${category.slug || slugify(category.name)}`}
              className="rounded-2xl border bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
            >
              <h3 className="font-bold">{category.name}</h3>
              <p className="mt-2 text-sm leading-6 text-muted">{category.description}</p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}

function FeatureCard({ icon, title, text }) {
  return (
    <div className="rounded-3xl border bg-white p-6 shadow-sm">
      <div className="mb-4 inline-flex rounded-2xl bg-teal-50 p-3 text-primary">
        {icon}
      </div>
      <h3 className="text-lg font-bold">{title}</h3>
      <p className="mt-2 leading-7 text-muted">{text}</p>
    </div>
  );
}

function ServicesPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [approvedOffers, setApprovedOffers] = useState([]);
  const [loadingOffers, setLoadingOffers] = useState(true);
  const [errorText, setErrorText] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All categories");
  const [pageCategories, setPageCategories] = useState(categories);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [maxDeliveryDays, setMaxDeliveryDays] = useState("");
  const [sortBy, setSortBy] = useState("recommended");
  const [savedServiceIds, setSavedServiceIds] = useState([]);

  async function fetchSavedServices() {
    if (!user) {
      setSavedServiceIds([]);
      return;
    }

    const { data, error } = await supabase
      .from("saved_services")
      .select("service_offer_id")
      .eq("buyer_id", user.id);

    if (!error) {
      setSavedServiceIds((data || []).map((saved) => saved.service_offer_id));
    } else {
      setSavedServiceIds([]);
    }
  }

  useEffect(() => {
    fetchSavedServices();
  }, [user]);

  async function toggleSaveService(serviceOfferId) {
    if (!user) {
      navigate("/login");
      return;
    }

    if (profile?.role === "seller") {
      alert("Seller accounts cannot save services.");
      return;
    }

    const alreadySaved = savedServiceIds.includes(serviceOfferId);

    if (alreadySaved) {
      const { error } = await supabase
        .from("saved_services")
        .delete()
        .match({ buyer_id: user.id, service_offer_id: serviceOfferId });

      if (!error) {
        setSavedServiceIds((current) => current.filter((id) => id !== serviceOfferId));
      }

      return;
    }

    const { error } = await supabase.from("saved_services").insert({
      buyer_id: user.id,
      service_offer_id: serviceOfferId,
    });

    if (!error) {
      setSavedServiceIds((current) => [...current, serviceOfferId]);
    }
  }

  useEffect(() => {
    async function fetchApprovedOffers() {
      setLoadingOffers(true);
      setErrorText("");

      const { data, error } = await supabase
        .from("service_offers")
        .select("*")
        .eq("status", "approved")
        .order("created_at", { ascending: false });

      if (error) {
        const { data: fallbackData, error: fallbackError } = await supabase
          .from("service_offers")
          .select("*")
          .eq("status", "approved")
          .order("created_at", { ascending: false });

        if (fallbackError) {
          setErrorText(fallbackError.message);
          setApprovedOffers([]);
        } else {
          setApprovedOffers(fallbackData || []);
        }
      } else {
        setApprovedOffers(data || []);
      }

      setLoadingOffers(false);
    }

    fetchApprovedOffers();
  }, []);

  useEffect(() => {
    async function fetchPageCategories() {
      const { data, error } = await supabase
        .from("marketplace_categories")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (!error && data?.length) {
        setPageCategories(data);
      }
    }

    fetchPageCategories();
  }, []);

  const filteredOffers = approvedOffers
    .filter((offer) => {
      const normalizedSearch = searchTerm.trim().toLowerCase();
      const matchesSearch = normalizedSearch
        ? [offer.title, offer.description, offer.category]
            .filter(Boolean)
            .some((field) => field.toLowerCase().includes(normalizedSearch))
        : true;

      const matchesCategory =
        selectedCategory === "All categories" || offer.category === selectedCategory;

      const price = Number(offer.basic_price) || 0;
      const matchesMinPrice = minPrice ? price >= Number(minPrice) : true;
      const matchesMaxPrice = maxPrice ? price <= Number(maxPrice) : true;
      const matchesDelivery = maxDeliveryDays
        ? Number(offer.delivery_days) <= Number(maxDeliveryDays)
        : true;

      return matchesSearch && matchesCategory && matchesMinPrice && matchesMaxPrice && matchesDelivery;
    })
    .sort((a, b) => {
      if (sortBy === "lowest_price") {
        return Number(a.basic_price || 0) - Number(b.basic_price || 0);
      }
      if (sortBy === "highest_price") {
        return Number(b.basic_price || 0) - Number(a.basic_price || 0);
      }
      if (sortBy === "fastest_delivery") {
        return Number(a.delivery_days || 0) - Number(b.delivery_days || 0);
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  return (
    <main className="mx-auto max-w-7xl px-5 py-12">
      <div className="mb-8">
        <h1 className="text-4xl font-bold">Browse Services</h1>
        <p className="mt-3 text-muted">
          Find approved Service Offers from sellers across engineering, tech, design, business, and AI.
        </p>
      </div>

      <div className="mb-8 grid gap-4 rounded-3xl border bg-white p-5 md:grid-cols-4">
        <input
          className="rounded-xl border px-4 py-3 outline-none md:col-span-2"
          placeholder="Search services..."
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
        />

        <select
          className="rounded-xl border px-4 py-3 outline-none"
          value={selectedCategory}
          onChange={(event) => setSelectedCategory(event.target.value)}
        >
          <option>All categories</option>
          {pageCategories.map((category) => (
            <option key={category.name}>{category.name}</option>
          ))}
        </select>

        <select
          className="rounded-xl border px-4 py-3 outline-none"
          value={sortBy}
          onChange={(event) => setSortBy(event.target.value)}
        >
          <option value="recommended">Recommended</option>
          <option value="lowest_price">Lowest price</option>
          <option value="highest_price">Highest price</option>
          <option value="fastest_delivery">Fastest delivery</option>
        </select>
      </div>

      <div className="mb-8 grid gap-4 rounded-3xl border bg-white p-5 md:grid-cols-5">
        <input
          className="rounded-xl border px-4 py-3 outline-none"
          type="number"
          min="0"
          placeholder="Min price"
          value={minPrice}
          onChange={(event) => setMinPrice(event.target.value)}
        />

        <input
          className="rounded-xl border px-4 py-3 outline-none"
          type="number"
          min="0"
          placeholder="Max price"
          value={maxPrice}
          onChange={(event) => setMaxPrice(event.target.value)}
        />

        <input
          className="rounded-xl border px-4 py-3 outline-none"
          type="number"
          min="0"
          placeholder="Max delivery days"
          value={maxDeliveryDays}
          onChange={(event) => setMaxDeliveryDays(event.target.value)}
        />

        <button
          type="button"
          onClick={() => {
            setSearchTerm("");
            setSelectedCategory("All categories");
            setMinPrice("");
            setMaxPrice("");
            setMaxDeliveryDays("");
            setSortBy("recommended");
          }}
          className="rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Clear Filters
        </button>
      </div>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-600">
          Showing {filteredOffers.length} of {approvedOffers.length} approved services
        </p>
      </div>

      {errorText && (
        <p className="mb-6 rounded-xl bg-red-50 p-4 text-sm font-medium text-red-700">
          {errorText}
        </p>
      )}

      {loadingOffers ? (
        <p className="text-muted">Loading approved Service Offers...</p>
      ) : approvedOffers.length === 0 ? (
        <div className="rounded-3xl border bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-bold">No approved services yet</h2>
          <p className="mt-2 text-muted">
            Once admin approves seller Service Offers, they will appear here.
          </p>
        </div>
      ) : filteredOffers.length === 0 ? (
        <div className="rounded-3xl border bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-bold">No services match your filters.</h2>
          <p className="mt-2 text-muted">
            Adjust your search or filter criteria to find more services.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {filteredOffers.map((offer) => (
            <div
              key={offer.id}
              className="overflow-hidden rounded-3xl border bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md"
            >
              <Link to={`/services/${offer.id}`} className="block">
                <img
                  src={
                    offer.image_url ||
                    "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=900&q=80"
                  }
                  alt={offer.title}
                  className="h-44 w-full object-cover"
                />

                <div className="p-5 relative">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      toggleSaveService(offer.id);
                    }}
                    className="absolute right-5 top-5 rounded-full bg-white p-2 shadow-sm transition hover:bg-red-50"
                    aria-label={savedServiceIds.includes(offer.id) ? "Remove saved service" : "Save service"}
                  >
                    <Heart
                      size={20}
                      className={
                        savedServiceIds.includes(offer.id)
                          ? "fill-red-500 text-red-500"
                          : "text-slate-400"
                      }
                    />
                  </button>

                  <p className="text-xs font-semibold text-primary">{offer.category}</p>
                  <h3 className="mt-2 min-h-12 font-bold">{offer.title}</h3>

                  {offer.profiles?.full_name && (
                    <div className="mt-3 flex items-center gap-2 text-sm text-slate-600">
                      {offer.profiles.profile_image_url && (
                        <img
                          src={offer.profiles.profile_image_url}
                          alt={offer.profiles.full_name}
                          className="h-6 w-6 rounded-full object-cover"
                        />
                      )}
                      <span className="font-semibold">{offer.profiles.full_name}</span>
                      {offer.profiles.is_verified && (
                        <span className="rounded-full bg-green-50 px-2 py-1 text-xs font-semibold text-green-700">
                          Verified
                        </span>
                      )}
                    </div>
                  )}

                  <p className="mt-3 text-sm text-muted">
                    Delivery: {offer.delivery_days} days
                  </p>
                </div>
              </Link>

              <div className="px-5 pb-5">
                <Link
                  to={`/sellers/${offer.seller_id}`}
                  className="mt-2 inline-block text-sm font-semibold text-primary"
                  onClick={(event) => event.stopPropagation()}
                >
                  View Seller
                </Link>

                <div className="mt-4 flex items-center justify-between">
                  <span className="flex items-center gap-1 text-sm font-semibold">
                    <Star size={16} className="fill-yellow-400 text-yellow-400" />
                    New
                  </span>

                  <span className="font-bold">
                    From {offer.currency} {Number(offer.basic_price).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getCategoryFromSlug(slug) {
  return categories.find((category) => slugify(category.name) === slug);
}

function CategoryPage() {
  const { slug } = useParams();
  const [pageCategories, setPageCategories] = useState(categories);
  const [category, setCategory] = useState(getCategoryFromSlug(slug));
  const [offers, setOffers] = useState([]);
  const [loadingOffers, setLoadingOffers] = useState(true);
  const [errorText, setErrorText] = useState("");

  useEffect(() => {
    async function fetchPageCategories() {
      const { data, error } = await supabase
        .from("marketplace_categories")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (!error && data?.length) {
        setPageCategories(data);
        const found = data.find((item) => item.slug === slug);
        setCategory(found || getCategoryFromSlug(slug));
      }
    }

    fetchPageCategories();
  }, [slug]);

  useEffect(() => {
    async function fetchCategoryOffers() {
      if (!category) {
        setOffers([]);
        setLoadingOffers(false);
        return;
      }

      setLoadingOffers(true);
      setErrorText("");

      const { data, error } = await supabase
        .from("service_offers")
        .select("*")
        .eq("status", "approved")
        .eq("category", category.name)
        .order("created_at", { ascending: false });

      if (error) {
        setErrorText(error.message);
        setOffers([]);
      } else {
        setOffers(data || []);
      }

      setLoadingOffers(false);
    }

    fetchCategoryOffers();
  }, [category]);

  if (!category) {
    return (
      <main className="mx-auto max-w-7xl px-5 py-12">
        <div className="rounded-3xl border bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-bold">Category Not Found</h1>
          <p className="mt-3 text-muted">
            The category you are looking for does not exist.
          </p>
          <Link
            to="/services"
            className="mt-6 inline-block rounded-full bg-primary px-6 py-3 font-semibold text-white"
          >
            Browse Services
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-5 py-12">
      <section className="rounded-3xl border bg-white p-8 shadow-sm">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-semibold text-primary">Category</p>
            <h1 className="mt-2 text-4xl font-bold">{category.name}</h1>
            <p className="mt-3 max-w-2xl leading-8 text-muted">
              {category.description}
            </p>
          </div>

          <div className="rounded-2xl bg-slate-50 p-5 text-center">
            <p className="text-sm font-semibold text-muted">Approved Services</p>
            <p className="mt-3 text-3xl font-bold">{offers.length}</p>
          </div>
        </div>
      </section>

      {errorText && (
        <p className="mt-6 rounded-xl bg-red-50 p-4 text-sm font-medium text-red-700">
          {errorText}
        </p>
      )}

      {loadingOffers ? (
        <p className="mt-6 text-muted">Loading category services...</p>
      ) : offers.length === 0 ? (
        <div className="mt-8 rounded-3xl border bg-white p-8 shadow-sm">
          <p className="font-semibold">No approved services found in this category.</p>
          <p className="mt-2 text-sm text-muted">
            Check back later or browse other categories.
          </p>
        </div>
      ) : (
        <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {offers.map((offer) => (
            <div
              key={offer.id}
              className="overflow-hidden rounded-3xl border bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md"
            >
              <Link to={`/services/${offer.id}`} className="block">
                <img
                  src={
                    offer.image_url ||
                    "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=900&q=80"
                  }
                  alt={offer.title}
                  className="h-44 w-full object-cover"
                />

                <div className="p-5">
                  <p className="text-xs font-semibold text-primary">{offer.category}</p>
                  <h3 className="mt-2 min-h-12 font-bold">{offer.title}</h3>
                  <p className="mt-3 text-sm text-muted">
                    Delivery: {offer.delivery_days} days
                  </p>
                  <p className="mt-4 font-bold">
                    From {offer.currency} {Number(offer.basic_price).toFixed(2)}
                  </p>
                </div>
              </Link>

              <div className="px-5 pb-5">
                <Link
                  to={`/sellers/${offer.seller_id}`}
                  className="mt-2 inline-block text-sm font-semibold text-primary"
                  onClick={(event) => event.stopPropagation()}
                >
                  View Seller
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

function ServiceDetailsPage() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { id } = useParams();

  const [offer, setOffer] = useState(null);
  const [loadingOffer, setLoadingOffer] = useState(true);
  const [errorText, setErrorText] = useState("");
  const [orderError, setOrderError] = useState("");
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [packages, setPackages] = useState([]);
  const [selectedPackageTier, setSelectedPackageTier] = useState("basic");
  const [isServiceSaved, setIsServiceSaved] = useState(false);
  const [savingService, setSavingService] = useState(false);
  const [contactLoading, setContactLoading] = useState(false);
  const [serviceMedia, setServiceMedia] = useState([]);
  const [serviceFaqs, setServiceFaqs] = useState([]);
  const [selectedGalleryImage, setSelectedGalleryImage] = useState("");
  const [serviceReviews, setServiceReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [sellerProfile, setSellerProfile] = useState(null);

  async function handleBuySelectedPackage() {
    if (!user) {
      navigate("/login");
      return;
    }

    if (!offer) {
      setOrderError("Service Offer could not be loaded.");
      return;
    }

    if (profile?.role === "seller") {
      setOrderError("Seller accounts cannot buy Service Offers. Please use a buyer account.");
      return;
    }

    if (isSuspended(profile)) {
      setOrderError("Your account is suspended. This action is not allowed.");
      return;
    }

    const packageToBuy =
      selectedPackage || {
        title: "Basic",
        description: offer.description,
        price: offer.basic_price,
        currency: offer.currency || "USD",
        delivery_days: offer.delivery_days,
        revisions: offer.revisions,
      };

    setCreatingOrder(true);
    setOrderError("");

    const price = Number(packageToBuy.price);
    const platformFee = price * 0.2;
    const sellerPayout = price * 0.8;

    const { data: createdOrder, error } = await supabase
      .from("orders")
      .insert({
        buyer_id: user.id,
        seller_id: offer.seller_id,
        source: "service_offer",
        service_offer_id: offer.id,
        custom_offer_id: null,
        project_request_id: null,
        title: `${offer.title} - ${packageToBuy.title}`,
        description: packageToBuy.description || offer.description,
        price,
        currency: packageToBuy.currency || offer.currency || "USD",
        platform_fee: platformFee,
        seller_payout: sellerPayout,
        delivery_days: Number(packageToBuy.delivery_days),
        revisions: Number(packageToBuy.revisions),
        status: "payment_pending",
        payment_status: "unpaid",
        payment_method: "Remitly to M-Pesa",
        payout_status: "not_available",
      })
      .select()
      .single();

    if (error) {
      setOrderError(error.message);
      setCreatingOrder(false);
      return;
    }
await sendNotification({
  userId: offer.seller_id,
  type: "new_order",
  title: "New Service Offer order",
  message: "A buyer ordered one of your Service Offer packages. The order is waiting for payment verification.",
  link: `/orders/${createdOrder.id}`,
});
    navigate(`/orders/${createdOrder.id}`);
  }

  async function handleContactSeller() {
    if (!user) {
      navigate("/login");
      return;
    }

    if (!offer) return;

    if (profile?.role === "seller") {
      setOrderError("Seller accounts cannot contact sellers as buyers. Please use a buyer account.");
      return;
    }

    if (user.id === offer.seller_id) {
      setOrderError("You cannot message yourself about your own service.");
      return;
    }

    setContactLoading(true);
    setOrderError("");

    const subject = offer.title;

    const { data: existingConversation } = await supabase
      .from("direct_conversations")
      .select("*")
      .eq("buyer_id", user.id)
      .eq("seller_id", offer.seller_id)
      .eq("service_offer_id", offer.id)
      .maybeSingle();

    if (existingConversation) {
      setContactLoading(false);
      navigate(`/messages/${existingConversation.id}`);
      return;
    }

    const { data: createdConversation, error: conversationError } = await supabase
      .from("direct_conversations")
      .insert({
        buyer_id: user.id,
        seller_id: offer.seller_id,
        service_offer_id: offer.id,
        subject,
      })
      .select()
      .single();

    if (conversationError) {
      setOrderError(conversationError.message);
      setContactLoading(false);
      return;
    }

    await sendNotification({
      userId: offer.seller_id,
      type: "new_conversation",
      title: "New buyer message",
      message: "A buyer started a conversation about one of your services.",
      link: `/messages/${createdConversation.id}`,
    });

    setContactLoading(false);
    navigate(`/messages/${createdConversation.id}`);
  }

  async function fetchOffer() {
    setLoadingOffer(true);
    setErrorText("");

    const { data: offerData, error: offerError } = await supabase
      .from("service_offers")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (offerError) {
      setErrorText(offerError.message);
      setOffer(null);
      setPackages([]);
      setServiceMedia([]);
      setServiceFaqs([]);
      setSellerProfile(null);
      setServiceReviews([]);
      setLoadingReviews(false);
      setLoadingOffer(false);
      return;
    }

    if (!offerData) {
      setErrorText("Service not found.");
      setOffer(null);
      setPackages([]);
      setServiceMedia([]);
      setServiceFaqs([]);
      setSellerProfile(null);
      setServiceReviews([]);
      setLoadingReviews(false);
      setLoadingOffer(false);
      return;
    }

    setOffer(offerData);

    const { data: packageData } = await supabase
      .from("service_offer_packages")
      .select("*")
      .eq("service_offer_id", id)
      .order("price", { ascending: true });

    setPackages(packageData || []);

    const { data: mediaData } = await supabase
      .from("service_offer_media")
      .select("*")
      .eq("service_offer_id", id)
      .order("display_order", { ascending: true });

    const imageMedia = (mediaData || []).filter((m) => m.media_type === "image");
    const fallbackImage =
      "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=1200&q=80";

    setServiceMedia(mediaData || []);
    setSelectedGalleryImage(
      imageMedia[0]?.media_url || offerData?.image_url || fallbackImage
    );

    const { data: faqData } = await supabase
      .from("service_offer_faqs")
      .select("*")
      .eq("service_offer_id", id)
      .order("display_order", { ascending: true });

    setServiceFaqs(faqData || []);

    if (offerData.seller_id) {
      const { data: sellerData } = await supabase
        .from("profiles")
        .select("id, full_name, is_verified, headline, country, profile_image_url")
        .eq("id", offerData.seller_id)
        .maybeSingle();

      setSellerProfile(sellerData || null);
    } else {
      setSellerProfile(null);
    }

    const { data: reviewData, error: reviewError } = await supabase
      .from("reviews")
      .select("*")
      .eq("service_offer_id", id)
      .order("created_at", { ascending: false });

    setServiceReviews(!reviewError && reviewData ? reviewData : []);
    setLoadingReviews(false);
    setLoadingOffer(false);
  }

  async function fetchIsServiceSaved() {
    if (!user || !id) {
      setIsServiceSaved(false);
      return;
    }

    const { data, error } = await supabase
      .from("saved_services")
      .select("id")
      .eq("buyer_id", user.id)
      .eq("service_offer_id", id)
      .maybeSingle();

    setIsServiceSaved(!error && Boolean(data));
  }

  async function handleToggleSaveService() {
    if (!user) {
      navigate("/login");
      return;
    }

    if (profile?.role === "seller") {
      setOrderError("Seller accounts cannot save services.");
      return;
    }

    if (!offer?.id) {
      setOrderError("Service information is unavailable.");
      return;
    }

    setSavingService(true);
    setOrderError("");

    if (isServiceSaved) {
      const { error } = await supabase
        .from("saved_services")
        .delete()
        .match({ buyer_id: user.id, service_offer_id: offer.id });

      if (!error) {
        setIsServiceSaved(false);
      }
    } else {
      const { error } = await supabase.from("saved_services").insert({
        buyer_id: user.id,
        service_offer_id: offer.id,
      });

      if (!error) {
        setIsServiceSaved(true);
      }
    }

    setSavingService(false);
  }

  useEffect(() => {
    if (id) {
      fetchOffer();
    }
  }, [id]);

  useEffect(() => {
    fetchIsServiceSaved();
  }, [user, id]);

  const selectedPackage =
    packages.find((packageItem) => packageItem.tier === selectedPackageTier) ||
    packages[0];

  const fallbackImage =
    "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=1200&q=80";

  const galleryImageUrls = [
    ...serviceMedia
      .filter((media) => media.media_type === "image")
      .map((media) => media.media_url),
    offer?.image_url,
  ].filter(Boolean);

  if (galleryImageUrls.length === 0) {
    galleryImageUrls.push(fallbackImage);
  }

  const featuredImage = selectedGalleryImage || galleryImageUrls[0];

  if (loadingOffer) {
    return (
      <main className="mx-auto max-w-5xl px-5 py-16">
        <p className="text-muted">Loading service...</p>
      </main>
    );
  }

  if (errorText || !offer) {
    return (
      <main className="mx-auto max-w-3xl px-5 py-16">
        <div className="rounded-3xl border bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-bold">Service Not Available</h1>
          <p className="mt-3 text-muted">
            {errorText || "This service may not exist or may no longer be available."}
          </p>
        </div>
      </main>
    );
  }

  const displayPrice = selectedPackage?.price ?? offer.basic_price;
  const displayDelivery = selectedPackage?.delivery_days ?? offer.delivery_days;
  const displayRevisions = selectedPackage?.revisions ?? offer.revisions;
  const displayTitle = selectedPackage?.title || offer.title;
  const displayDescription = selectedPackage?.description || offer.description;

  return (
    <main className="mx-auto max-w-7xl px-5 py-10">
      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <section>
          <p className="font-semibold text-primary">{offer.category}</p>
          <h1 className="mt-2 text-4xl font-bold">{offer.title}</h1>

          <div className="mt-4 flex flex-wrap items-center gap-4 rounded-3xl border bg-slate-50 p-5 text-sm text-slate-700">
            {sellerProfile?.profile_image_url ? (
              <img
                src={sellerProfile.profile_image_url}
                alt={sellerProfile.full_name}
                className="h-12 w-12 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-lg font-bold text-white">
                {sellerProfile?.full_name?.charAt(0) || "S"}
              </div>
            )}
            <div className="min-w-0">
              <p className="font-semibold text-slate-900">{sellerProfile?.full_name || "Seller"}</p>
              {sellerProfile?.headline ? (
                <p className="text-sm text-slate-600">{sellerProfile.headline}</p>
              ) : sellerProfile?.country ? (
                <p className="text-sm text-slate-600">{sellerProfile.country}</p>
              ) : null}
            </div>
            {sellerProfile?.is_verified ? (
              <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                Verified Seller
              </span>
            ) : null}
          </div>

          <div className="mt-8 rounded-3xl border bg-white p-4 shadow-sm">
            <img
              src={featuredImage}
              alt={offer.title}
              className="h-[450px] w-full rounded-[28px] object-cover"
            />

            <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
              {(galleryImageUrls.length > 0 ? galleryImageUrls : [featuredImage]).map((imageUrl, index) => (
                <button
                  key={`${imageUrl}-${index}`}
                  type="button"
                  onClick={() => setSelectedGalleryImage(imageUrl)}
                  className={`shrink-0 rounded-3xl border p-1 transition ${
                    selectedGalleryImage === imageUrl || (!selectedGalleryImage && index === 0)
                      ? "border-primary bg-teal-50"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <img
                    src={imageUrl}
                    alt={`${offer.title} preview ${index + 1}`}
                    className="h-20 w-32 rounded-2xl object-cover"
                  />
                </button>
              ))}
            </div>
          </div>

          {serviceMedia.find((m) => m.media_type === "video") && (
            <div className="mt-8 rounded-3xl border bg-white p-6">
              <h2 className="text-2xl font-bold">Service Video</h2>
              <a
                href={serviceMedia.find((m) => m.media_type === "video")?.media_url}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-block rounded-full bg-primary px-6 py-3 font-semibold text-white"
              >
                Open Service Video
              </a>
            </div>
          )}

          <div className="mt-8 rounded-3xl border bg-white p-6">
            <h2 className="text-2xl font-bold">About this Service Offer</h2>
            <p className="mt-4 leading-8 text-muted">
              {offer.description || "No description was provided for this service."}
            </p>
          </div>

          {offer.tags && (
            <div className="mt-8 rounded-3xl border bg-white p-6">
              <h2 className="text-2xl font-bold">Tags</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {offer.tags.split(",").map((tag, index) => (
                  <span key={index} className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
                    {tag.trim()}
                  </span>
                ))}
              </div>
            </div>
          )}

          {serviceFaqs.length > 0 && (
            <div className="mt-8 rounded-3xl border bg-white p-6">
              <h2 className="text-2xl font-bold">Frequently Asked Questions</h2>
              <div className="mt-6 grid gap-4">
                {serviceFaqs.map((faq) => (
                  <div key={faq.id} className="rounded-2xl bg-slate-50 p-5">
                    <h3 className="font-bold text-slate-800">{faq.question}</h3>
                    <p className="mt-3 leading-7 text-slate-700">{faq.answer}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8 rounded-3xl border bg-white p-6">
            <h2 className="text-2xl font-bold">Buyer Reviews</h2>
            <p className="mt-2 text-muted">Reviews from buyers who ordered this service.</p>

            {loadingReviews ? (
              <p className="mt-6 text-muted">Loading reviews...</p>
            ) : serviceReviews.length === 0 ? (
              <div className="mt-6 rounded-2xl bg-slate-50 p-6">
                <p className="font-semibold">No reviews yet.</p>
                <p className="mt-2 text-sm text-muted">Reviews will appear after buyers complete the service.</p>
              </div>
            ) : (
              <div className="mt-6 grid gap-4">
                {serviceReviews.slice(0, 4).map((review) => (
                  <div key={review.id} className="rounded-2xl border bg-slate-50 p-5">
                    <div className="flex items-center justify-between gap-4">
                      <p className="font-semibold">{review.rating} / 5</p>
                      <p className="text-sm text-slate-400">{new Date(review.created_at).toLocaleDateString()}</p>
                    </div>
                    <p className="mt-3 text-sm leading-7 text-slate-700">
                      {review.comment || "No written comment provided."}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <aside className="lg:sticky lg:top-24 h-fit rounded-3xl border bg-white p-6 shadow-sm">
          <div className="flex gap-3 overflow-x-auto pb-3">
            {[
              { tier: "basic", label: "Basic" },
              { tier: "standard", label: "Standard" },
              { tier: "premium", label: "Premium" },
            ].map((option) => {
              const isSelected = selectedPackageTier === option.tier;
              return (
                <button
                  key={option.tier}
                  type="button"
                  onClick={() => setSelectedPackageTier(option.tier)}
                  className={`rounded-3xl border px-4 py-3 text-sm font-semibold transition ${
                    isSelected ? "border-primary bg-teal-50 text-slate-900" : "border-slate-200 bg-white text-slate-700"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>

          <div className="rounded-3xl border bg-slate-50 p-6">
            <h2 className="text-2xl font-bold">{displayTitle}</h2>
            <p className="mt-3 text-sm text-slate-600">{displayDescription || "Select a package to view details."}</p>

            <div className="mt-6 space-y-4 text-sm text-slate-700">
              <div className="flex items-center justify-between rounded-2xl bg-white p-4">
                <span>Price</span>
                <strong>{offer.currency} {Number(displayPrice).toFixed(2)}</strong>
              </div>

              <div className="flex items-center justify-between rounded-2xl bg-white p-4">
                <span>Delivery</span>
                <strong>{displayDelivery} days</strong>
              </div>

              <div className="flex items-center justify-between rounded-2xl bg-white p-4">
                <span>Revisions</span>
                <strong>{displayRevisions}</strong>
              </div>
            </div>

            {orderError && (
              <p className="mt-4 rounded-xl bg-red-50 p-4 text-sm font-medium text-red-700">
                {orderError}
              </p>
            )}

            <button
              type="button"
              onClick={handleBuySelectedPackage}
              disabled={creatingOrder || isSuspended(profile)}
              className="mt-6 w-full rounded-full bg-primary px-6 py-3 text-center font-semibold text-white disabled:opacity-60"
            >
              {creatingOrder ? "Creating Order..." : "Continue to Payment"}
            </button>

            <p className="mt-3 text-sm leading-6 text-slate-600">
              You will choose your preferred transfer method and submit your payment reference on the next page. Work starts after admin confirms payment.
            </p>

            <button
              type="button"
              onClick={handleContactSeller}
              disabled={contactLoading}
              className="mt-6 w-full rounded-full border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-700 disabled:opacity-60"
            >
              {contactLoading ? "Opening Messages..." : "Message Seller"}
            </button>

            <button
              type="button"
              onClick={handleToggleSaveService}
              disabled={savingService || isSuspended(profile)}
              className="mt-3 w-full rounded-full border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-700 disabled:opacity-60"
            >
              {savingService
                ? "Saving..."
                : isServiceSaved
                ? "Remove from Saved"
                : "Save Service"}
            </button>
          </div>
        </aside>
      </div>
    </main>
  );
}

function SignupPage() {
  const navigate = useNavigate();
  const { signUp } = useAuth();

  const [role, setRole] = useState("buyer");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [errorText, setErrorText] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();

    setLoading(true);
    setMessage("");
    setErrorText("");

    try {
      const data = await signUp({
        fullName,
        email,
        password,
        role,
      });

      if (data.session) {
        navigate(role === "seller" ? "/seller-dashboard" : "/buyer-dashboard");
      } else {
        setMessage("Account created. Check your email to confirm your account, then login.");
      }
    } catch (error) {
      setErrorText(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-5 py-16">
      <form onSubmit={handleSubmit} className="rounded-3xl border bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-bold">Create your KaziHub account</h1>
        <p className="mt-2 text-muted">Choose whether you are joining as a buyer or seller.</p>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <button
            type="button"
            onClick={() => setRole("buyer")}
            className={`rounded-2xl border p-6 text-left ${
              role === "buyer" ? "border-primary bg-teal-50" : "hover:border-primary"
            }`}
          >
            <h2 className="text-xl font-bold">I am a Buyer</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              Hire sellers, place orders, post Project Requests, and manage deliveries.
            </p>
          </button>

          <button
            type="button"
            onClick={() => setRole("seller")}
            className={`rounded-2xl border p-6 text-left ${
              role === "seller" ? "border-primary bg-teal-50" : "hover:border-primary"
            }`}
          >
            <h2 className="text-xl font-bold">I am a Seller</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              Create up to 10 Service Offers, receive orders, deliver work, and get paid.
            </p>
          </button>
        </div>

        <div className="mt-8 grid gap-4">
          <input
            className="rounded-xl border px-4 py-3 outline-none"
            placeholder="Full name"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            required
          />

          <input
            className="rounded-xl border px-4 py-3 outline-none"
            placeholder="Email address"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />

          <input
            className="rounded-xl border px-4 py-3 outline-none"
            placeholder="Password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={6}
          />

          {message && (
            <p className="rounded-xl bg-green-50 p-4 text-sm font-medium text-green-700">
              {message}
            </p>
          )}

          {errorText && (
            <p className="rounded-xl bg-red-50 p-4 text-sm font-medium text-red-700">
              {errorText}
            </p>
          )}

          <button
            disabled={loading}
            className="rounded-full bg-primary px-6 py-3 font-semibold text-white disabled:opacity-60"
          >
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </div>
      </form>
    </main>
  );
}

function LoginPage() {
  const navigate = useNavigate();
  const { signIn } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();

    setLoading(true);
    setErrorText("");

    try {
      const result = await signIn({ email, password });
      const role = result.profile?.role;

      if (role === "seller") {
        navigate("/seller-dashboard");
      } else if (role === "admin") {
        navigate("/admin");
      } else {
        navigate("/buyer-dashboard");
      }
    } catch (error) {
      setErrorText(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-md px-5 py-16">
      <form onSubmit={handleSubmit} className="rounded-3xl border bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-bold">Login</h1>
        <p className="mt-2 text-muted">Access your buyer or seller dashboard.</p>

        <div className="mt-8 grid gap-4">
          <input
            className="rounded-xl border px-4 py-3 outline-none"
            placeholder="Email address"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />

          <input
            className="rounded-xl border px-4 py-3 outline-none"
            placeholder="Password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />

          {errorText && (
            <p className="rounded-xl bg-red-50 p-4 text-sm font-medium text-red-700">
              {errorText}
            </p>
          )}

          <button
            disabled={loading}
            className="rounded-full bg-primary px-6 py-3 font-semibold text-white disabled:opacity-60"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </div>
      </form>
    </main>
  );
}

function SellerDashboardPage() {
  const { user, profile } = useAuth();

  const [myOffers, setMyOffers] = useState([]);
  const [loadingOffers, setLoadingOffers] = useState(true);
  const [errorText, setErrorText] = useState("");

  const [myCustomOffers, setMyCustomOffers] = useState([]);
  const [loadingCustomOffers, setLoadingCustomOffers] = useState(true);

  const [sellerOrders, setSellerOrders] = useState([]);
  const [loadingSellerOrders, setLoadingSellerOrders] = useState(true);

  const [sellerPayoutOrders, setSellerPayoutOrders] = useState([]);
  const [loadingSellerPayouts, setLoadingSellerPayouts] = useState(true);

  const [sellerReviews, setSellerReviews] = useState([]);
  const [loadingSellerReviews, setLoadingSellerReviews] = useState(true);

  const [sellerVerification, setSellerVerification] = useState(null);
  const [loadingVerification, setLoadingVerification] = useState(true);
  const [verificationLegalName, setVerificationLegalName] = useState("");
  const [verificationCountry, setVerificationCountry] = useState("Kenya");
  const [verificationDocumentType, setVerificationDocumentType] = useState("National ID");
  const [verificationDocumentFile, setVerificationDocumentFile] = useState(null);
  const [verificationBusinessFile, setVerificationBusinessFile] = useState(null);
  const [submittingVerification, setSubmittingVerification] = useState(false);
  const [verificationMessage, setVerificationMessage] = useState("");
  const [verificationError, setVerificationError] = useState("");

  const [profileHeadline, setProfileHeadline] = useState("");
  const [profileBio, setProfileBio] = useState("");
  const [profileCountry, setProfileCountry] = useState("");
  const [profileSkills, setProfileSkills] = useState("");
  const [profileLanguages, setProfileLanguages] = useState("");
  const [profileWebsiteUrl, setProfileWebsiteUrl] = useState("");
  const [profileImageFile, setProfileImageFile] = useState(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [profileError, setProfileError] = useState("");

  const [serviceDrafts, setServiceDrafts] = useState([]);
  const [loadingServiceDrafts, setLoadingServiceDrafts] = useState(true);

  const [serviceAnalytics, setServiceAnalytics] = useState([]);
  const [loadingServiceAnalytics, setLoadingServiceAnalytics] = useState(true);

  useEffect(() => {
    if (profile) {
      setProfileHeadline(profile.headline || "");
      setProfileBio(profile.bio || "");
      setProfileCountry(profile.country || "");
      setProfileSkills(profile.skills || "");
      setProfileLanguages(profile.languages || "");
      setProfileWebsiteUrl(profile.website_url || "");
    }
  }, [profile]);

  async function fetchServiceAnalytics(currentOffers) {
    if (!user || !currentOffers || currentOffers.length === 0) {
      setServiceAnalytics([]);
      setLoadingServiceAnalytics(false);
      return;
    }

    setLoadingServiceAnalytics(true);

    const analyticsRows = [];

    for (const offer of currentOffers) {
      const { count: viewCount } = await supabase
        .from("service_offer_views")
        .select("id", { count: "exact", head: true })
        .eq("service_offer_id", offer.id);

      const { count: saveCount } = await supabase
        .from("saved_services")
        .select("id", { count: "exact", head: true })
        .eq("service_offer_id", offer.id);

      const { data: orderRows } = await supabase
        .from("orders")
        .select("id, price, seller_payout, currency, status, payment_status")
        .eq("service_offer_id", offer.id);

      const orders = orderRows || [];

      analyticsRows.push({
        offer,
        viewCount: viewCount || 0,
        saveCount: saveCount || 0,
        orderCount: orders.length,
        activeOrders: orders.filter((order) => order.status === "active").length,
        completedOrders: orders.filter((order) => order.status === "completed").length,
        pendingPaymentOrders: orders.filter((order) => order.status === "payment_pending").length,
        totalRevenueUsd: orders
          .filter((order) => order.currency === "USD")
          .reduce((total, order) => total + Number(order.price || 0), 0),
        totalPayoutUsd: orders
          .filter((order) => order.currency === "USD")
          .reduce((total, order) => total + Number(order.seller_payout || 0), 0),
      });
    }

    setServiceAnalytics(analyticsRows);
    setLoadingServiceAnalytics(false);
  }

  async function fetchMyOffers() {
    if (!user) {
      setLoadingOffers(false);
      setLoadingServiceAnalytics(false);
      return;
    }

    const { data, error } = await supabase
      .from("service_offers")
      .select("*")
      .eq("seller_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      setErrorText(error.message);
      setMyOffers([]);
      setServiceAnalytics([]);
    } else {
      setMyOffers(data || []);
      await fetchServiceAnalytics(data || []);
    }

    setLoadingOffers(false);
  }

  async function fetchMyCustomOffers() {
    if (!user) {
      setLoadingCustomOffers(false);
      return;
    }

    const { data, error } = await supabase
      .from("custom_offers")
      .select("*")
      .eq("seller_id", user.id)
      .order("created_at", { ascending: false });

    if (!error) {
      setMyCustomOffers(data || []);
    }

    setLoadingCustomOffers(false);
  }

  async function fetchSellerOrders() {
    if (!user) {
      setLoadingSellerOrders(false);
      return;
    }

    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("seller_id", user.id)
      .order("created_at", { ascending: false });

    if (!error) {
      setSellerOrders(data || []);
    }

    setLoadingSellerOrders(false);
  }

  async function fetchSellerPayoutOrders() {
    if (!user) {
      setLoadingSellerPayouts(false);
      return;
    }

    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("seller_id", user.id)
      .eq("status", "completed")
      .order("updated_at", { ascending: false });

    if (!error) {
      setSellerPayoutOrders(data || []);
    }

    setLoadingSellerPayouts(false);
  }

  async function fetchSellerReviews() {
    if (!user) {
      setLoadingSellerReviews(false);
      return;
    }

    const { data, error } = await supabase
      .from("reviews")
      .select("*")
      .eq("seller_id", user.id)
      .order("created_at", { ascending: false });

    if (!error) {
      setSellerReviews(data || []);
    }

    setLoadingSellerReviews(false);
  }

  async function fetchSellerVerification() {
    if (!user) {
      setLoadingVerification(false);
      return;
    }

    const { data, error } = await supabase
      .from("seller_verifications")
      .select("*")
      .eq("seller_id", user.id)
      .order("submitted_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error) {
      setSellerVerification(data || null);
    }

    setLoadingVerification(false);
  }

  async function fetchServiceDrafts() {
    if (!user) {
      setLoadingServiceDrafts(false);
      return;
    }

    setLoadingServiceDrafts(true);

    const { data, error } = await supabase
      .from("service_offer_drafts")
      .select("*")
      .eq("seller_id", user.id)
      .order("updated_at", { ascending: false });

    if (!error) {
      setServiceDrafts(data || []);
    }

    setLoadingServiceDrafts(false);
  }

  useEffect(() => {
    fetchMyOffers();
    fetchMyCustomOffers();
    fetchSellerOrders();
    fetchSellerPayoutOrders();
    fetchSellerReviews();
    fetchSellerVerification();
    fetchServiceDrafts();
  }, [user]);

  async function deleteServiceDraft(draftId) {
    const confirmed = window.confirm("Delete this draft?");

    if (!confirmed) return;

    const { error } = await supabase
      .from("service_offer_drafts")
      .delete()
      .eq("id", draftId);

    if (!error) {
      await fetchServiceDrafts();
    }
  }

  async function handleSubmitVerification(event) {
    event.preventDefault();

    if (!user) return;

    if (profile?.account_status === "suspended") {
      setVerificationError("Your account is suspended. This action is not allowed.");
      return;
    }

    if (!verificationDocumentFile) {
      setVerificationError("Please upload an identity document.");
      return;
    }

    setSubmittingVerification(true);
    setVerificationMessage("");
    setVerificationError("");

    const safeDocumentName = verificationDocumentFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const documentPath = `${user.id}/${Date.now()}-document-${safeDocumentName}`;

    const { error: documentUploadError } = await supabase.storage
      .from("seller-verification-files")
      .upload(documentPath, verificationDocumentFile);

    if (documentUploadError) {
      setVerificationError(documentUploadError.message);
      setSubmittingVerification(false);
      return;
    }

    let businessPath = null;

    if (verificationBusinessFile) {
      const safeBusinessName = verificationBusinessFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      businessPath = `${user.id}/${Date.now()}-business-${safeBusinessName}`;

      const { error: businessUploadError } = await supabase.storage
        .from("seller-verification-files")
        .upload(businessPath, verificationBusinessFile);

      if (businessUploadError) {
        setVerificationError(businessUploadError.message);
        setSubmittingVerification(false);
        return;
      }
    }

    const { error: insertError } = await supabase.from("seller_verifications").insert({
      seller_id: user.id,
      legal_name: verificationLegalName,
      country: verificationCountry,
      document_type: verificationDocumentType,
      document_file_path: documentPath,
      business_file_path: businessPath,
      status: "pending",
    });

    if (insertError) {
      setVerificationError(insertError.message);
      setSubmittingVerification(false);
      return;
    }

    setVerificationLegalName("");
    setVerificationCountry("Kenya");
    setVerificationDocumentType("National ID");
    setVerificationDocumentFile(null);
    setVerificationBusinessFile(null);
    setVerificationMessage("Verification request submitted. Admin will review your documents.");
    await fetchSellerVerification();
    setSubmittingVerification(false);
  }

  async function handleSaveSellerProfile(event) {
    event.preventDefault();

    if (!user) return;

    if (profile?.account_status === "suspended") {
      setProfileError("Your account is suspended. This action is not allowed.");
      return;
    }

    setSavingProfile(true);
    setProfileMessage("");
    setProfileError("");

    let profileImageUrl = profile?.profile_image_url || null;

    if (profileImageFile) {
      const safeFileName = profileImageFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const filePath = `${user.id}/${Date.now()}-${safeFileName}`;

      const { error: uploadError } = await supabase.storage
        .from("profile-images")
        .upload(filePath, profileImageFile);

      if (uploadError) {
        setProfileError(uploadError.message);
        setSavingProfile(false);
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from("profile-images")
        .getPublicUrl(filePath);

      profileImageUrl = publicUrlData.publicUrl;
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        headline: profileHeadline.trim() || null,
        bio: profileBio.trim() || null,
        country: profileCountry.trim() || null,
        skills: profileSkills.trim() || null,
        languages: profileLanguages.trim() || null,
        website_url: profileWebsiteUrl.trim() || null,
        profile_image_url: profileImageUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (error) {
      setProfileError(error.message);
      setSavingProfile(false);
      return;
    }

    setProfileImageFile(null);
    setProfileMessage("Seller profile updated successfully. Refresh the page if the latest profile does not appear immediately.");
    setSavingProfile(false);
  }

  const averageSellerRating =
    sellerReviews.length > 0
      ? (
          sellerReviews.reduce((total, review) => total + Number(review.rating || 0), 0) /
          sellerReviews.length
        ).toFixed(1)
      : "0.0";

  const pendingPayoutUsd = sellerPayoutOrders
    .filter((order) => order.payout_status !== "paid" && order.currency === "USD")
    .reduce((total, order) => total + Number(order.seller_payout || 0), 0)
    .toFixed(2);

  if (!user) {
    return (
      <main className="mx-auto max-w-3xl px-5 py-16">
        <div className="rounded-3xl border bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-bold">Seller Dashboard</h1>
          <p className="mt-3 text-muted">Please login as a seller to access this page.</p>
          <Link
            to="/login"
            className="mt-6 inline-block rounded-full bg-primary px-6 py-3 font-semibold text-white"
          >
            Login
          </Link>
        </div>
      </main>
    );
  }

  if (profile && profile.role !== "seller" && profile.role !== "admin") {
    return (
      <main className="mx-auto max-w-3xl px-5 py-16">
        <div className="rounded-3xl border bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-bold">Seller Access Required</h1>
          <p className="mt-3 text-muted">
            This dashboard is only available to seller accounts.
          </p>
        </div>
      </main>
    );
  }

  return (
    <DashboardShell title="Seller Dashboard">
      <div className="grid gap-5 md:grid-cols-4">
        <Stat title="Service Offers" value={`${myOffers.length} / 10`} />
        <Stat title="Active Orders" value={sellerOrders.filter((order) => order.status === "active").length} />
        <Stat title="Pending Payout" value={`$${pendingPayoutUsd}`} />
        <Stat title="Seller Rating" value={`${averageSellerRating} / 5`} />
      </div>

      {errorText && (
        <p className="mt-6 rounded-xl bg-red-50 p-4 text-sm font-medium text-red-700">
          {errorText}
        </p>
      )}

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          to="/messages"
          className="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold"
        >
          Open Messages
        </Link>

        <Link
          to="/support"
          className="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold"
        >
          Contact Support
        </Link>
      </div>

      <div className="mt-8 rounded-3xl border bg-white p-6">
        <h2 className="text-xl font-bold">Seller Verification</h2>
        <p className="mt-2 text-muted">
          Verification helps buyers trust sellers. It becomes required after your first order, but you can verify earlier.
        </p>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl bg-slate-50 p-5">
            <p className="text-sm font-semibold text-muted">Verified</p>
            <p className="mt-2 text-2xl font-bold">{profile?.is_verified ? "Yes" : "No"}</p>
          </div>

          <div className="rounded-2xl bg-slate-50 p-5">
            <p className="text-sm font-semibold text-muted">Verification Required</p>
            <p className="mt-2 text-2xl font-bold">{profile?.verification_required ? "Yes" : "No"}</p>
          </div>

          <div className="rounded-2xl bg-slate-50 p-5">
            <p className="text-sm font-semibold text-muted">Latest Request</p>
            <p className="mt-2 text-2xl font-bold capitalize">{sellerVerification?.status || "none"}</p>
          </div>
        </div>

        {verificationMessage && (
          <p className="mt-5 rounded-xl bg-green-50 p-4 text-sm font-medium text-green-700">
            {verificationMessage}
          </p>
        )}

        {verificationError && (
          <p className="mt-5 rounded-xl bg-red-50 p-4 text-sm font-medium text-red-700">
            {verificationError}
          </p>
        )}

        {loadingVerification ? (
          <p className="mt-6 text-muted">Loading verification status...</p>
        ) : profile?.is_verified ? (
          <div className="mt-6 rounded-2xl bg-green-50 p-5">
            <p className="font-semibold text-green-700">Your seller account is verified.</p>
          </div>
        ) : sellerVerification?.status === "pending" ? (
          <div className="mt-6 rounded-2xl bg-yellow-50 p-5">
            <p className="font-semibold text-yellow-700">
              Your verification request is under admin review.
            </p>
            <p className="mt-2 text-sm text-yellow-700">
              Submitted: {new Date(sellerVerification.submitted_at).toLocaleString()}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmitVerification} className="mt-6 grid gap-4 rounded-2xl bg-slate-50 p-5">
            {sellerVerification?.status === "rejected" && (
              <div className="rounded-xl bg-red-50 p-4 text-sm font-medium text-red-700">
                Previous verification was rejected.
                {sellerVerification.admin_note && (
                  <p className="mt-2">Reason: {sellerVerification.admin_note}</p>
                )}
              </div>
            )}

            <input
              className="rounded-xl border bg-white px-4 py-3 outline-none"
              placeholder="Legal name"
              value={verificationLegalName}
              onChange={(event) => setVerificationLegalName(event.target.value)}
              required
            />

            <div className="grid gap-4 md:grid-cols-2">
              <input
                className="rounded-xl border bg-white px-4 py-3 outline-none"
                placeholder="Country"
                value={verificationCountry}
                onChange={(event) => setVerificationCountry(event.target.value)}
                required
              />

              <select
                className="rounded-xl border bg-white px-4 py-3 outline-none"
                value={verificationDocumentType}
                onChange={(event) => setVerificationDocumentType(event.target.value)}
                required
              >
                <option value="National ID">National ID</option>
                <option value="Passport">Passport</option>
                <option value="Driving Licence">Driving Licence</option>
                <option value="Business Registration">Business Registration</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <p className="mb-2 text-sm font-semibold">Identity document</p>
              <input
                className="w-full rounded-xl border bg-white px-4 py-3 outline-none"
                type="file"
                onChange={(event) => setVerificationDocumentFile(event.target.files?.[0] || null)}
                required
              />
            </div>

            <div>
              <p className="mb-2 text-sm font-semibold">Optional business proof</p>
              <input
                className="w-full rounded-xl border bg-white px-4 py-3 outline-none"
                type="file"
                onChange={(event) => setVerificationBusinessFile(event.target.files?.[0] || null)}
              />
            </div>

            <button
              disabled={submittingVerification}
              className="rounded-full bg-primary px-6 py-3 font-semibold text-white disabled:opacity-60"
            >
              {submittingVerification ? "Submitting..." : "Submit Verification"}
            </button>
          </form>
        )}
      </div>

      <div className="mt-8 rounded-3xl border bg-white p-6">
        <h2 className="text-xl font-bold">Edit Seller Profile</h2>
        <p className="mt-2 text-muted">
          This information appears on your public seller profile page.
        </p>

        {profileMessage && (
          <p className="mt-5 rounded-xl bg-green-50 p-4 text-sm font-medium text-green-700">
            {profileMessage}
          </p>
        )}

        {profileError && (
          <p className="mt-5 rounded-xl bg-red-50 p-4 text-sm font-medium text-red-700">
            {profileError}
          </p>
        )}

        <form onSubmit={handleSaveSellerProfile} className="mt-6 grid gap-4 rounded-2xl bg-slate-50 p-5">
          <div className="flex flex-col gap-5 md:flex-row md:items-center">
            {profile?.profile_image_url ? (
              <img
                src={profile.profile_image_url}
                alt="Seller profile"
                className="h-24 w-24 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white text-2xl font-bold text-primary">
                {profile?.full_name?.charAt(0) || "S"}
              </div>
            )}

            <div className="flex-1">
              <p className="mb-2 text-sm font-semibold">Profile image</p>
              <input
                className="w-full rounded-xl border bg-white px-4 py-3 outline-none"
                type="file"
                accept="image/*"
                onChange={(event) => setProfileImageFile(event.target.files?.[0] || null)}
              />
            </div>
          </div>

          <input
            className="rounded-xl border bg-white px-4 py-3 outline-none"
            placeholder="Professional headline"
            value={profileHeadline}
            onChange={(event) => setProfileHeadline(event.target.value)}
          />

          <textarea
            className="min-h-32 rounded-xl border bg-white px-4 py-3 outline-none"
            placeholder="Seller bio"
            value={profileBio}
            onChange={(event) => setProfileBio(event.target.value)}
          />

          <div className="grid gap-4 md:grid-cols-2">
            <input
              className="rounded-xl border bg-white px-4 py-3 outline-none"
              placeholder="Country"
              value={profileCountry}
              onChange={(event) => setProfileCountry(event.target.value)}
            />

            <input
              className="rounded-xl border bg-white px-4 py-3 outline-none"
              placeholder="Languages"
              value={profileLanguages}
              onChange={(event) => setProfileLanguages(event.target.value)}
            />
          </div>

          <textarea
            className="min-h-24 rounded-xl border bg-white px-4 py-3 outline-none"
            placeholder="Skills"
            value={profileSkills}
            onChange={(event) => setProfileSkills(event.target.value)}
          />

          <input
            className="rounded-xl border bg-white px-4 py-3 outline-none"
            placeholder="Website or portfolio URL"
            value={profileWebsiteUrl}
            onChange={(event) => setProfileWebsiteUrl(event.target.value)}
          />

          <button
            disabled={savingProfile}
            className="rounded-full bg-primary px-6 py-3 font-semibold text-white disabled:opacity-60"
          >
            {savingProfile ? "Saving..." : "Save Seller Profile"}
          </button>
        </form>
      </div>

      <div className="mt-8 rounded-3xl border bg-white p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-bold">Service Drafts</h2>
            <p className="mt-2 text-muted">
              Save incomplete Service Offers and finish them later.
            </p>
          </div>

          <Link
            to="/create-service"
            className="rounded-full bg-primary px-6 py-3 text-center font-semibold text-white"
          >
            Create New Service
          </Link>
        </div>

        {loadingServiceDrafts ? (
          <p className="mt-6 text-muted">Loading drafts...</p>
        ) : serviceDrafts.length === 0 ? (
          <div className="mt-6 rounded-2xl bg-slate-50 p-6">
            <p className="font-semibold">No drafts yet.</p>
            <p className="mt-2 text-sm text-muted">
              Start creating a Service Offer and click Save Draft before submitting.
            </p>
          </div>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[700px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b bg-slate-50">
                  <th className="p-4">Draft Name</th>
                  <th className="p-4">Last Updated</th>
                  <th className="p-4">Actions</th>
                </tr>
              </thead>

              <tbody>
                {serviceDrafts.map((draft) => (
                  <tr key={draft.id} className="border-b">
                    <td className="p-4 font-semibold">{draft.draft_name}</td>

                    <td className="p-4">
                      {draft.updated_at
                        ? new Date(draft.updated_at).toLocaleString()
                        : "Not available"}
                    </td>

                    <td className="p-4">
                      <div className="flex flex-wrap gap-2">
                        <Link
                          to={`/service-drafts/${draft.id}`}
                          className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white"
                        >
                          Continue Editing
                        </Link>

                        <button
                          onClick={() => deleteServiceDraft(draft.id)}
                          className="rounded-full border border-red-200 px-4 py-2 text-xs font-semibold text-red-700"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-8 rounded-3xl border bg-white p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-bold">Your Service Offers</h2>
            <p className="mt-2 text-muted">
              Your Service Offers go live immediately after submission. You can edit them anytime.
            </p>
            <p className="mt-2 text-sm text-muted">
              Each Service Offer can include Basic, Standard, and Premium packages.
            </p>
            <p className="mt-2 text-sm text-muted">
              Services with gallery images, videos, FAQs, and SEO tags usually perform better.
            </p>
          </div>

          {myOffers.length < 10 ? (
            <Link
              to="/create-service"
              className="rounded-full bg-primary px-6 py-3 text-center font-semibold text-white"
            >
              Create New Service Offer
            </Link>
          ) : (
            <span className="rounded-full bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-700">
              Limit reached
            </span>
          )}
        </div>

        {loadingOffers ? (
          <p className="mt-6 text-muted">Loading your Service Offers...</p>
        ) : myOffers.length === 0 ? (
          <div className="mt-6 rounded-2xl bg-slate-50 p-6">
            <p className="font-semibold">No Service Offers yet.</p>
            <p className="mt-2 text-sm text-muted">
              Create your first Service Offer and it will go live immediately after submission.
            </p>
          </div>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b bg-slate-50">
                  <th className="p-4">Title</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Starting Price</th>
                  <th className="p-4">Delivery</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Action</th>
                </tr>
              </thead>

              <tbody>
                {myOffers.map((offer) => (
                  <tr key={offer.id} className="border-b align-top">
                    <td className="p-4 font-semibold">
                      {offer.title}
                      {offer.admin_review_note && (
                        <p className="mt-2 rounded-xl bg-yellow-50 p-3 text-xs font-medium text-yellow-700">
                          Admin note: {offer.admin_review_note}
                        </p>
                      )}
                    </td>

                    <td className="p-4">{offer.category}</td>

                    <td className="p-4">
                      {offer.currency} {Number(offer.basic_price).toFixed(2)}
                    </td>

                    <td className="p-4">{offer.delivery_days} days</td>

                    <td className="p-4">
                      <span className="rounded-full bg-yellow-50 px-3 py-1 text-xs font-semibold text-yellow-700">
                        {offer.status.replace("_", " ")}
                      </span>
                    </td>

                    <td className="p-4">
                      <div className="flex flex-wrap gap-2">
                        <Link
                          to={`/edit-service/${offer.id}`}
                          className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold"
                        >
                          Edit
                        </Link>

                        {offer.status === "approved" && (
                          <Link
                            to={`/services/${offer.id}`}
                            className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white"
                          >
                            View
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-8 rounded-3xl border bg-white p-6">
        <h2 className="text-xl font-bold">Service Offer Analytics</h2>
        <p className="mt-2 text-muted">
          Track views, saves, direct orders, completed orders, and revenue from your Service Offers.
        </p>

        {loadingServiceAnalytics ? (
          <p className="mt-6 text-muted">Loading service analytics...</p>
        ) : serviceAnalytics.length === 0 ? (
          <div className="mt-6 rounded-2xl bg-slate-50 p-6">
            <p className="font-semibold">No analytics yet.</p>
          </div>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[1000px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b bg-slate-50">
                  <th className="p-4">Service Offer</th>
                  <th className="p-4">Views</th>
                  <th className="p-4">Saves</th>
                  <th className="p-4">Orders</th>
                  <th className="p-4">Active</th>
                  <th className="p-4">Completed</th>
                  <th className="p-4">Pending Payment</th>
                  <th className="p-4">Revenue USD</th>
                  <th className="p-4">Payout USD</th>
                </tr>
              </thead>

              <tbody>
                {serviceAnalytics.map((analytics) => (
                  <tr key={analytics.offer.id} className="border-b align-top">
                    <td className="p-4">
                      <p className="font-semibold">{analytics.offer.title}</p>
                      <Link
                        to={`/services/${analytics.offer.id}`}
                        className="mt-2 inline-block text-xs font-semibold text-primary"
                      >
                        View Service
                      </Link>
                    </td>
                    <td className="p-4">{analytics.viewCount}</td>
                    <td className="p-4">{analytics.saveCount}</td>
                    <td className="p-4">{analytics.orderCount}</td>
                    <td className="p-4">{analytics.activeOrders}</td>
                    <td className="p-4">{analytics.completedOrders}</td>
                    <td className="p-4">{analytics.pendingPaymentOrders}</td>
                    <td className="p-4">${analytics.totalRevenueUsd.toFixed(2)}</td>
                    <td className="p-4">${analytics.totalPayoutUsd.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-8 rounded-3xl border bg-white p-6">
        <h2 className="text-xl font-bold">Your Custom Offers</h2>
        <p className="mt-2 text-muted">
          These are offers you sent to buyer Project Requests.
        </p>

        {loadingCustomOffers ? (
          <p className="mt-6 text-muted">Loading Custom Offers...</p>
        ) : myCustomOffers.length === 0 ? (
          <div className="mt-6 rounded-2xl bg-slate-50 p-6">
            <p className="font-semibold">No Custom Offers yet.</p>
            <p className="mt-2 text-sm text-muted">
              Go to Project Requests and send an offer to a buyer request.
            </p>
          </div>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[700px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b bg-slate-50">
                  <th className="p-4">Message</th>
                  <th className="p-4">Price</th>
                  <th className="p-4">Delivery</th>
                  <th className="p-4">Revisions</th>
                  <th className="p-4">Status</th>
                </tr>
              </thead>

              <tbody>
                {myCustomOffers.map((offer) => (
                  <tr key={offer.id} className="border-b align-top">
                    <td className="p-4 max-w-md">
                      <p className="line-clamp-2">{offer.message}</p>
                    </td>
                    <td className="p-4">{offer.currency} {Number(offer.price).toFixed(2)}</td>
                    <td className="p-4">{offer.delivery_days} days</td>
                    <td className="p-4">{offer.revisions}</td>
                    <td className="p-4">
                      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                        {offer.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-8 rounded-3xl border bg-white p-6">
        <h2 className="text-xl font-bold">Your Orders</h2>
        <p className="mt-2 text-muted">
          These are active and completed orders assigned to you.
        </p>
        <p className="mt-2 text-sm text-muted">
          Open each order to review buyer requirements before starting work.
        </p>

        {loadingSellerOrders ? (
          <p className="mt-6 text-muted">Loading Orders...</p>
        ) : sellerOrders.length === 0 ? (
          <div className="mt-6 rounded-2xl bg-slate-50 p-6">
            <p className="font-semibold">No orders yet.</p>
            <p className="mt-2 text-sm text-muted">
              Orders will appear here after buyers accept your Custom Offers or buy your Service Offers.
            </p>
          </div>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b bg-slate-50">
                  <th className="p-4">Order</th>
                  <th className="p-4">Price</th>
                  <th className="p-4">Your Payout</th>
                  <th className="p-4">Delivery</th>
                  <th className="p-4">Revisions</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Action</th>
                </tr>
              </thead>

              <tbody>
                {sellerOrders.map((order) => (
                  <tr key={order.id} className="border-b align-top">
                    <td className="p-4 font-semibold">{order.title}</td>
                    <td className="p-4">{order.currency} {Number(order.price).toFixed(2)}</td>
                    <td className="p-4">{order.currency} {Number(order.seller_payout).toFixed(2)}</td>
                    <td className="p-4">{order.delivery_days} days</td>
                    <td className="p-4">{order.revisions}</td>
                    <td className="p-4">
                      <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                        {order.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <Link
                        to={`/orders/${order.id}`}
                        className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white"
                      >
                        View Order
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-8 rounded-3xl border bg-white p-6">
        <h2 className="text-xl font-bold">Payout Tracking</h2>
        <p className="mt-2 text-muted">
          Completed orders become payout-eligible. Open an order to request payout.
        </p>

        {loadingSellerPayouts ? (
          <p className="mt-6 text-muted">Loading payout records...</p>
        ) : sellerPayoutOrders.length === 0 ? (
          <div className="mt-6 rounded-2xl bg-slate-50 p-6">
            <p className="font-semibold">No payout records yet.</p>
            <p className="mt-2 text-sm text-muted">
              Completed orders will appear here for payout tracking.
            </p>
          </div>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b bg-slate-50">
                  <th className="p-4">Order</th>
                  <th className="p-4">Payout</th>
                  <th className="p-4">Payout Status</th>
                  <th className="p-4">Requested</th>
                  <th className="p-4">Paid</th>
                  <th className="p-4">Action</th>
                </tr>
              </thead>

              <tbody>
                {sellerPayoutOrders.map((order) => {
                  let payoutStatusDisplay = order.payout_status || "not_available";
                  if (order.payout_status === "waiting_period" && order.payout_available_at) {
                    payoutStatusDisplay = `Available on ${new Date(order.payout_available_at).toLocaleDateString()}`;
                  } else if (order.payout_status === "waiting_period") {
                    payoutStatusDisplay = "Waiting period";
                  } else if (order.payout_status === "available") {
                    payoutStatusDisplay = "Available";
                  }

                  return (
                    <tr key={order.id} className="border-b align-top">
                    <td className="p-4 font-semibold">{order.title}</td>
                    <td className="p-4">{order.currency} {Number(order.seller_payout).toFixed(2)}</td>
                    <td className="p-4">
                      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                        {payoutStatusDisplay}
                      </span>
                    </td>
                    <td className="p-4">
                      {order.payout_requested_at ? new Date(order.payout_requested_at).toLocaleString() : "Not requested"}
                    </td>
                    <td className="p-4">
                      {order.payout_paid_at ? new Date(order.payout_paid_at).toLocaleString() : "Not paid"}
                    </td>
                    <td className="p-4">
                      <Link
                        to={`/orders/${order.id}`}
                        className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white"
                      >
                        View Order
                      </Link>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-8 rounded-3xl border bg-white p-6">
        <h2 className="text-xl font-bold">Reviews and Ratings</h2>
        <p className="mt-2 text-muted">
          Reviews from buyers after completed orders.
        </p>

        {loadingSellerReviews ? (
          <p className="mt-6 text-muted">Loading reviews...</p>
        ) : sellerReviews.length === 0 ? (
          <div className="mt-6 rounded-2xl bg-slate-50 p-6">
            <p className="font-semibold">No reviews yet.</p>
            <p className="mt-2 text-sm text-muted">
              Buyer reviews will appear here after completed paid orders.
            </p>
          </div>
        ) : (
          <div className="mt-6 grid gap-4">
            {sellerReviews.map((review) => (
              <article key={review.id} className="rounded-2xl border p-5">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <p className="text-lg font-bold">{review.rating} / 5 stars</p>
                  <p className="text-sm text-slate-400">
                    {new Date(review.created_at).toLocaleString()}
                  </p>
                </div>

                <p className="mt-3 whitespace-pre-line leading-7 text-muted">
                  {review.comment || "No written comment was provided."}
                </p>

                <Link
                  to={`/orders/${review.order_id}`}
                  className="mt-4 inline-block rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white"
                >
                  View Order
                </Link>
              </article>
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}

function BuyerDashboardPage() {
  const { user, profile } = useAuth();

  const [myRequests, setMyRequests] = useState([]);
  const [incomingOffers, setIncomingOffers] = useState([]);
  const [loadingDashboard, setLoadingDashboard] = useState(true);
  const [myOrders, setMyOrders] = useState([]);
  const [savedServices, setSavedServices] = useState([]);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [message, setMessage] = useState("");
  const [errorText, setErrorText] = useState("");

  async function fetchBuyerDashboard() {
    if (!user) {
      setLoadingDashboard(false);
      return;
    }

    setLoadingDashboard(true);
    setErrorText("");

    const { data: requestsData, error: requestsError } = await supabase
      .from("project_requests")
      .select("*")
      .eq("buyer_id", user.id)
      .order("created_at", { ascending: false });

    const { data: offersData, error: offersError } = await supabase
      .from("custom_offers")
      .select("*")
      .eq("buyer_id", user.id)
      .order("created_at", { ascending: false });
const { data: ordersData, error: ordersError } = await supabase
  .from("orders")
  .select("*")
  .eq("buyer_id", user.id)
  .order("created_at", { ascending: false });

    const { data: savedData, error: savedError } = await supabase
      .from("saved_services")
      .select("id, created_at, service_offers(*)")
      .eq("buyer_id", user.id)
      .order("created_at", { ascending: false });

    if (requestsError) {
      setErrorText(requestsError.message);
      setMyRequests([]);
    } else {
      setMyRequests(requestsData || []);
    }

    if (offersError) {
      setErrorText(offersError.message);
      setIncomingOffers([]);
    } else {
      setIncomingOffers(offersData || []);
    }

    if (ordersError) {
      setErrorText(ordersError.message);
      setMyOrders([]);
    } else {
      setMyOrders(ordersData || []);
    }

    if (savedError) {
      setErrorText(savedError.message);
      setSavedServices([]);
    } else {
      setSavedServices(savedData || []);
    }

    setLoadingDashboard(false);
  }

  useEffect(() => {
    fetchBuyerDashboard();
  }, [user]);

  async function acceptOffer(offer) {
  if (isSuspended(profile)) {
    setErrorText("Your account is suspended. This action is not allowed.");
    return;
  }
  setActionLoadingId(offer.id);
  setMessage("");
  setErrorText("");

  const relatedRequest = myRequests.find(
    (request) => request.id === offer.project_request_id
  );

  const platformFee = Number(offer.price) * 0.2;
  const sellerPayout = Number(offer.price) * 0.8;

  const { data: createdOrder, error: orderError } = await supabase
  .from("orders")
  .insert({
    buyer_id: offer.buyer_id,
    seller_id: offer.seller_id,
    source: "custom_offer",
    custom_offer_id: offer.id,
    project_request_id: offer.project_request_id,
    title: relatedRequest?.title || "Custom Offer Order",
    description: offer.message,
    price: Number(offer.price),
    currency: offer.currency,
    platform_fee: platformFee,
    seller_payout: sellerPayout,
    delivery_days: Number(offer.delivery_days),
    revisions: Number(offer.revisions),
    status: "payment_pending",
    payment_status: "unpaid",
    payment_method: "Remitly to M-Pesa",
  })
  .select()
  .single();

  if (orderError) {
    setErrorText(orderError.message);
    setActionLoadingId(null);
    return;
  }

  const { error: acceptError } = await supabase
    .from("custom_offers")
    .update({
      status: "accepted",
      updated_at: new Date().toISOString(),
    })
    .eq("id", offer.id);

  if (acceptError) {
    setErrorText(acceptError.message);
    setActionLoadingId(null);
    return;
  }

  const { error: requestError } = await supabase
    .from("project_requests")
    .update({
      status: "assigned",
      updated_at: new Date().toISOString(),
    })
    .eq("id", offer.project_request_id);

  if (requestError) {
    setErrorText(requestError.message);
    setActionLoadingId(null);
    return;
  }

  await supabase
    .from("custom_offers")
    .update({
      status: "rejected",
      updated_at: new Date().toISOString(),
    })
    .eq("project_request_id", offer.project_request_id)
    .neq("id", offer.id)
    .eq("status", "submitted");
await sendNotification({
  userId: offer.seller_id,
  type: "new_order",
  title: "New order created",
  message: "A buyer accepted your Custom Offer. The order is waiting for payment verification.",
  link: `/orders/${createdOrder.id}`,
});
  setMessage("Custom Offer accepted. A payment-pending order has been created. Please complete payment to activate the order.");
  await fetchBuyerDashboard();
  setActionLoadingId(null);
}

  async function rejectOffer(offerId) {
    if (isSuspended(profile)) {
      setErrorText("Your account is suspended. This action is not allowed.");
      return;
    }

    setActionLoadingId(offerId);
    setMessage("");
    setErrorText("");

    const { error } = await supabase
      .from("custom_offers")
      .update({
        status: "rejected",
        updated_at: new Date().toISOString(),
      })
      .eq("id", offerId);

    if (error) {
      setErrorText(error.message);
      setActionLoadingId(null);
      return;
    }

    setMessage("Custom Offer rejected.");
    await fetchBuyerDashboard();
    setActionLoadingId(null);
  }

  if (!user) {
    return (
      <main className="mx-auto max-w-3xl px-5 py-16">
        <div className="rounded-3xl border bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-bold">Buyer Dashboard</h1>
          <p className="mt-3 text-muted">Please login to manage your Project Requests and Custom Offers.</p>
          <Link
            to="/login"
            className="mt-6 inline-block rounded-full bg-primary px-6 py-3 font-semibold text-white"
          >
            Login
          </Link>
        </div>
      </main>
    );
  }

  return (
    <DashboardShell title="Buyer Dashboard">
      <div className="grid gap-5 md:grid-cols-4">
        <Stat title="Project Requests" value={myRequests.length} />
        <Stat title="Incoming Offers" value={incomingOffers.length} />
        <Stat title="Active Orders" value={myOrders.filter((order) => order.status === "active").length} />
        <Stat title="Saved Services" value={savedServices.length} />
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <Link
          to="/messages"
          className="inline-flex items-center rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white"
        >
          Open Messages
        </Link>
        <Link
          to="/support"
          className="inline-flex items-center rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold"
        >
          Contact Support
        </Link>
      </div>

      {message && (
        <p className="mt-6 rounded-xl bg-green-50 p-4 text-sm font-medium text-green-700">
          {message}
        </p>
      )}

      {errorText && (
        <p className="mt-6 rounded-xl bg-red-50 p-4 text-sm font-medium text-red-700">
          {errorText}
        </p>
      )}

      {loadingDashboard ? (
        <p className="mt-8 text-muted">Loading Buyer Dashboard...</p>
      ) : (
        <>
          <div className="mt-8 rounded-3xl border bg-white p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-bold">Your Project Requests</h2>
                <p className="mt-2 text-muted">
                  These are the custom requests you posted for sellers to respond to.
                </p>
              </div>

              <Link
                to="/project-requests"
                className="rounded-full bg-primary px-6 py-3 text-center font-semibold text-white"
              >
                Post New Request
              </Link>
            </div>

            {myRequests.length === 0 ? (
              <div className="mt-6 rounded-2xl bg-slate-50 p-6">
                <p className="font-semibold">No Project Requests yet.</p>
                <p className="mt-2 text-sm text-muted">
                  Post a request so sellers can send Custom Offers.
                </p>
              </div>
            ) : (
              <div className="mt-6 overflow-x-auto">
                <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b bg-slate-50">
                      <th className="p-4">Title</th>
                      <th className="p-4">Category</th>
                      <th className="p-4">Budget</th>
                      <th className="p-4">Deadline</th>
                      <th className="p-4">Status</th>
                    </tr>
                  </thead>

                  <tbody>
                    {myRequests.map((request) => (
                      <tr key={request.id} className="border-b align-top">
                        <td className="p-4 font-semibold">{request.title}</td>
                        <td className="p-4">{request.category}</td>
                        <td className="p-4">
                          {request.budget_min || request.budget_max
                            ? `${request.currency} ${request.budget_min || "0"} - ${request.budget_max || "Open"}`
                            : "Not specified"}
                        </td>
                        <td className="p-4">{request.deadline_date || "Not specified"}</td>
                        <td className="p-4">
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                            {request.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="mt-8 rounded-3xl border bg-white p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-bold">Saved Services</h2>
                <p className="mt-2 text-muted">
                  Quickly return to services you saved for later.
                </p>
              </div>
            </div>

            {savedServices.length === 0 ? (
              <div className="mt-6 rounded-2xl bg-slate-50 p-6">
                <p className="font-semibold">No saved services yet.</p>
                <p className="mt-2 text-sm text-muted">
                  Browse services and save the ones you want to revisit later.
                </p>
              </div>
            ) : (
              <div className="mt-6 grid gap-5">
                {savedServices.map((saved) => {
                  const offer = saved.service_offers;

                  return (
                    <article key={saved.id} className="rounded-2xl border p-5">
                      <div className="grid gap-5 md:grid-cols-[120px_1fr]">
                        <img
                          src={
                            offer?.image_url ||
                            "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=900&q=80"
                          }
                          alt={offer?.title || "Saved service"}
                          className="h-28 w-full rounded-3xl object-cover"
                        />

                        <div className="space-y-3">
                          <div>
                            <p className="text-xs font-semibold text-primary">{offer?.category}</p>
                            <h3 className="mt-1 text-lg font-bold">{offer?.title || "Service"}</h3>
                          </div>

                          <div className="grid gap-2 sm:grid-cols-2">
                            <p className="text-sm text-slate-700">
                              <strong>Price:</strong> {offer?.currency} {Number(offer?.basic_price || 0).toFixed(2)}
                            </p>
                            <p className="text-sm text-slate-700">
                              <strong>Delivery:</strong> {offer?.delivery_days || "-"} days
                            </p>
                          </div>

                          <div className="flex flex-wrap gap-3">
                            <Link
                              to={`/services/${offer?.id}`}
                              className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white"
                            >
                              View Service
                            </Link>

                            <Link
                              to={`/sellers/${offer?.seller_id}`}
                              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
                            >
                              View Seller
                            </Link>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-8 rounded-3xl border bg-white p-6">
            <h2 className="text-xl font-bold">Incoming Custom Offers</h2>
            <p className="mt-2 text-muted">
              Review offers sent by sellers. Accepting an offer assigns the Project Request.
            </p>

            {incomingOffers.length === 0 ? (
              <div className="mt-6 rounded-2xl bg-slate-50 p-6">
                <p className="font-semibold">No Custom Offers yet.</p>
                <p className="mt-2 text-sm text-muted">
                  Seller offers will appear here after they respond to your Project Requests.
                </p>
              </div>
            ) : (
              <div className="mt-6 grid gap-5">
                {incomingOffers.map((offer) => {
                  const relatedRequest = myRequests.find(
                    (request) => request.id === offer.project_request_id
                  );

                  return (
                    <article key={offer.id} className="rounded-2xl border p-5">
                      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div>
                          <p className="text-xs font-semibold text-primary">
                            {relatedRequest?.title || "Project Request"}
                          </p>

                          <h3 className="mt-1 text-lg font-bold">
                            {offer.currency} {Number(offer.price).toFixed(2)}
                          </h3>

                          <p className="mt-2 whitespace-pre-line text-sm leading-6 text-muted">
                            {offer.message}
                          </p>

                          <div className="mt-4 grid gap-2 text-sm text-slate-700 md:grid-cols-3">
                            <p>
                              <strong>Delivery:</strong> {offer.delivery_days} days
                            </p>
                            <p>
                              <strong>Revisions:</strong> {offer.revisions}
                            </p>
                            <p>
                              <strong>Status:</strong> {offer.status}
                            </p>
                          </div>
                        </div>

                        <div className="flex min-w-44 flex-col gap-3">
                          {offer.status === "submitted" ? (
                            <>
                              <button
                                onClick={() => acceptOffer(offer)}
                                disabled={actionLoadingId === offer.id || isSuspended(profile)}
                                className="rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
                              >
                                {actionLoadingId === offer.id ? "Working..." : "Accept Offer"}
                              </button>

                              <button
                                onClick={() => rejectOffer(offer.id)}
                                disabled={actionLoadingId === offer.id || isSuspended(profile)}
                                className="rounded-full border border-red-200 px-5 py-3 text-sm font-semibold text-red-700 disabled:opacity-60"
                              >
                                Reject
                              </button>
                            </>
                          ) : (
                            <span className="rounded-full bg-slate-100 px-5 py-3 text-center text-sm font-semibold text-slate-700">
                              {offer.status}
                            </span>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
          <div className="mt-8 rounded-3xl border bg-white p-6">
  <h2 className="text-xl font-bold">Your Orders</h2>
  <p className="mt-2 text-muted">
    These are orders created after accepting Custom Offers or buying Service Offers.
  </p>

  {myOrders.length === 0 ? (
    <div className="mt-6 rounded-2xl bg-slate-50 p-6">
      <p className="font-semibold">No orders yet.</p>
      <p className="mt-2 text-sm text-muted">
        Accept a Custom Offer to create your first order.
      </p>
    </div>
  ) : (
    <div className="mt-6 overflow-x-auto">
      <table className="w-full min-w-[800px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b bg-slate-50">
            <th className="p-4">Order</th>
            <th className="p-4">Price</th>
            <th className="p-4">Platform Fee</th>
            <th className="p-4">Seller Payout</th>
            <th className="p-4">Delivery</th>
            <th className="p-4">Status</th>
          </tr>
        </thead>

        <tbody>
          {myOrders.map((order) => (
            <tr key={order.id} className="border-b align-top">
              <td className="p-4 font-semibold">{order.title}</td>

              <td className="p-4">
                {order.currency} {Number(order.price).toFixed(2)}
              </td>

              <td className="p-4">
                {order.currency} {Number(order.platform_fee).toFixed(2)}
              </td>

              <td className="p-4">
                {order.currency} {Number(order.seller_payout).toFixed(2)}
              </td>

              <td className="p-4">{order.delivery_days} days</td>

              <td className="p-4">
                <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                  {order.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )}
</div>
        </>
      )}
    </DashboardShell>
  );
}

function AdminPage() {
  const { user, profile } = useAuth();

  const [pendingOffers, setPendingOffers] = useState([]);
  const [loadingOffers, setLoadingOffers] = useState(false);
  const [pendingPayments, setPendingPayments] = useState([]);
  const [loadingPayments, setLoadingPayments] = useState(true);
  const [pendingPayouts, setPendingPayouts] = useState([]);
  const [loadingPayouts, setLoadingPayouts] = useState(true);
  const [pendingVerifications, setPendingVerifications] = useState([]);
  const [loadingVerifications, setLoadingVerifications] = useState(true);
  const [adminUsers, setAdminUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [adminCategories, setAdminCategories] = useState([]);
  const [adminDisputes, setAdminDisputes] = useState([]);
  const [loadingDisputes, setLoadingDisputes] = useState(true);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [supportTickets, setSupportTickets] = useState([]);
  const [loadingSupportTickets, setLoadingSupportTickets] = useState(true);
  const [categoryName, setCategoryName] = useState("");
  const [categorySlug, setCategorySlug] = useState("");
  const [categoryDescription, setCategoryDescription] = useState("");
  const [categoryOrder, setCategoryOrder] = useState("100");
  const [savingCategory, setSavingCategory] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState(null);

async function fetchPendingOffers() {
  if (!user || profile?.role !== "admin") {
    setLoadingOffers(false);
    return;
  }

  setLoadingOffers(true);
  setErrorText("");

  const { data, error } = await supabase
    .from("service_offers")
    .select("*")
    .in("status", ["pending_review"])
    .order("created_at", { ascending: false });

  if (error) {
    setErrorText(error.message);
    setPendingOffers([]);
  } else {
    setPendingOffers(data || []);
  }

  setLoadingOffers(false);
}

  async function fetchPendingPayments() {
    if (!user || profile?.role !== "admin") {
      setLoadingPayments(false);
      return;
    }

    setLoadingPayments(true);

    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("payment_status", "payment_submitted")
      .order("payment_submitted_at", { ascending: false });

    if (!error) {
      setPendingPayments(data || []);
    }

    setLoadingPayments(false);
  }

  async function fetchPendingPayouts() {
    if (!user || profile?.role !== "admin") {
      setLoadingPayouts(false);
      return;
    }

    setLoadingPayouts(true);

    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("payout_status", "requested")
      .order("payout_requested_at", { ascending: false });

    if (!error) {
      setPendingPayouts(data || []);
    }

    setLoadingPayouts(false);
  }

  async function fetchPendingVerifications() {
    if (!user || profile?.role !== "admin") {
      setLoadingVerifications(false);
      return;
    }

    setLoadingVerifications(true);

    const { data, error } = await supabase
      .from("seller_verifications")
      .select("*")
      .eq("status", "pending")
      .order("submitted_at", { ascending: false });

    if (!error) {
      setPendingVerifications(data || []);
    }

    setLoadingVerifications(false);
  }

  function makeSlugFromName(name) {
    return name
      .toLowerCase()
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  async function fetchAdminCategories() {
    if (!user || profile?.role !== "admin") {
      setLoadingCategories(false);
      return;
    }

    setLoadingCategories(true);

    const { data, error } = await supabase
      .from("marketplace_categories")
      .select("*")
      .order("display_order", { ascending: true });

    if (!error) {
      setAdminCategories(data || []);
    }

    setLoadingCategories(false);
  }

  async function fetchAdminUsers() {
    if (!user || profile?.role !== "admin") {
      setLoadingUsers(false);
      return;
    }

    setLoadingUsers(true);

    const { data, error } = await supabase
      .from("profiles")
      .select(
        "id, full_name, role, is_verified, verification_required, account_status, suspended_reason, suspended_at, suspended_by, created_at, headline, country"
      )
      .order("created_at", { ascending: false });

    if (!error) {
      setAdminUsers(data || []);
    }

    setLoadingUsers(false);
  }

  async function fetchAdminDisputes() {
    if (!user || profile?.role !== "admin") {
      setLoadingDisputes(false);
      return;
    }

    setLoadingDisputes(true);

    const { data, error } = await supabase
      .from("order_disputes")
      .select("*")
      .in("status", ["open", "under_review"])
      .order("opened_at", { ascending: false });

    if (!error) {
      setAdminDisputes(data || []);
    }

    setLoadingDisputes(false);
  }

  async function fetchSupportTickets() {
    if (!user || profile?.role !== "admin") {
      setLoadingSupportTickets(false);
      return;
    }

    setLoadingSupportTickets(true);

    const { data, error } = await supabase
      .from("support_tickets")
      .select("*")
      .in("status", ["open", "in_progress"])
      .order("created_at", { ascending: false });

    if (!error) {
      setSupportTickets(data || []);
    }

    setLoadingSupportTickets(false);
  }

  async function markSupportInProgress(ticket) {
    setActionLoadingId(ticket.id);
    setErrorText("");

    const { error } = await supabase
      .from("support_tickets")
      .update({
        status: "in_progress",
        updated_at: new Date().toISOString(),
      })
      .eq("id", ticket.id);

    if (error) {
      setErrorText(error.message);
    } else {
      await fetchSupportTickets();
    }

    setActionLoadingId(null);
  }

  async function resolveSupportTicket(ticket) {
    const response = window.prompt("Enter admin response:");

    if (!response) return;

    setActionLoadingId(ticket.id);
    setErrorText("");

    const { error } = await supabase
      .from("support_tickets")
      .update({
        status: "resolved",
        admin_response: response,
        resolved_by: user.id,
        resolved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", ticket.id);

    if (error) {
      setErrorText(error.message);
      setActionLoadingId(null);
      return;
    }

    await sendNotification({
      userId: ticket.user_id,
      type: "support_resolved",
      title: "Support ticket resolved",
      message: "Admin responded to your support ticket.",
      link: "/support",
    });

    await fetchSupportTickets();
    setActionLoadingId(null);
  }

  async function closeSupportTicket(ticket) {
    const response = window.prompt("Optional closing note:");

    setActionLoadingId(ticket.id);
    setErrorText("");

    const { error } = await supabase
      .from("support_tickets")
      .update({
        status: "closed",
        admin_response: response || ticket.admin_response || null,
        resolved_by: user.id,
        resolved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", ticket.id);

    if (error) {
      setErrorText(error.message);
      setActionLoadingId(null);
      return;
    }

    await sendNotification({
      userId: ticket.user_id,
      type: "support_closed",
      title: "Support ticket closed",
      message: "Your support ticket has been closed.",
      link: "/support",
    });

    await fetchSupportTickets();
    setActionLoadingId(null);
  }

  useEffect(() => {
    if (!user || !profile?.role) return;

    if (profile.role !== "admin") {
      setLoadingOffers(false);
      return;
    }

    fetchPendingOffers();

    if (typeof fetchPendingPayments === "function") fetchPendingPayments();
    if (typeof fetchPendingPayouts === "function") fetchPendingPayouts();
    if (typeof fetchPendingVerifications === "function") fetchPendingVerifications();
    if (typeof fetchAdminDisputes === "function") fetchAdminDisputes();
    if (typeof fetchSupportTickets === "function") fetchSupportTickets();
    if (typeof fetchAdminCategories === "function") fetchAdminCategories();
    if (typeof fetchAdminUsers === "function") fetchAdminUsers();
  }, [user?.id, profile?.role]);

async function approveServiceOffer(offer) {
  setActionLoadingId(offer.id);
  setErrorText("");

  const { error } = await supabase
    .from("service_offers")
    .update({
      status: "approved",
      admin_review_note: null,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", offer.id);

  if (error) {
    setErrorText(error.message);
  } else {
    await sendNotification({
      userId: offer.seller_id,
      type: "service_approved",
      title: "Service Offer approved",
      message: "Your Service Offer has been approved and is now public.",
      link: `/services/${offer.id}`,
    });

    await fetchPendingOffers();
  }

  setActionLoadingId(null);
}

async function rejectServiceOffer(offer) {
  const note = window.prompt("Enter rejection note for the seller:");

  if (!note) return;

  setActionLoadingId(offer.id);
  setErrorText("");

  const { error } = await supabase
    .from("service_offers")
    .update({
      status: "rejected",
      admin_review_note: note,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", offer.id);

  if (error) {
    setErrorText(error.message);
  } else {
    await sendNotification({
      userId: offer.seller_id,
      type: "service_rejected",
      title: "Service Offer needs changes",
      message: `Your Service Offer was rejected. Note: ${note}`,
      link: `/edit-service/${offer.id}`,
    });

    await fetchPendingOffers();
  }

  setActionLoadingId(null);
}

async function markPayoutPaid(order) {
  const reference = window.prompt("Enter payout reference or transaction code:");

  if (!reference) return;

  setActionLoadingId(order.id);
  setErrorText("");

  const { error } = await supabase
    .from("orders")
    .update({
      payout_status: "paid",
      payout_reference: reference,
      payout_rejection_reason: null,
      payout_paid_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", order.id);

  if (error) {
    setErrorText(error.message);
  } else {
    await sendNotification({
      userId: order.seller_id,
      type: "payout_paid",
      title: "Payout marked as paid",
      message: "Admin marked your seller payout as paid.",
      link: `/orders/${order.id}`,
    });

    await fetchPendingPayouts();
  }

  setActionLoadingId(null);
}

async function rejectPayout(order) {
  const reason = window.prompt("Enter payout rejection reason:");

  if (!reason) return;

  setActionLoadingId(order.id);
  setErrorText("");

  const { error } = await supabase
    .from("orders")
    .update({
      payout_status: "available",
      payout_rejection_reason: reason,
      updated_at: new Date().toISOString(),
    })
    .eq("id", order.id);

  if (error) {
    setErrorText(error.message);
  } else {
    await sendNotification({
      userId: order.seller_id,
      type: "payout_rejected",
      title: "Payout request rejected",
      message: `Your payout request was rejected. Reason: ${reason}`,
      link: `/orders/${order.id}`,
    });

    await fetchPendingPayouts();
  }

  setActionLoadingId(null);
}

  async function openVerificationFile(filePath) {
    setErrorText("");

    const { data, error } = await supabase.storage
      .from("seller-verification-files")
      .createSignedUrl(filePath, 60);

    if (error) {
      setErrorText(error.message);
      return;
    }

    window.open(data.signedUrl, "_blank");
  }

  async function approveSellerVerification(verification) {
    setActionLoadingId(verification.id);
    setErrorText("");

    const { error: verificationError } = await supabase
      .from("seller_verifications")
      .update({
        status: "approved",
        admin_note: null,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", verification.id);

    if (verificationError) {
      setErrorText(verificationError.message);
      setActionLoadingId(null);
      return;
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        is_verified: true,
        verification_required: false,
      })
      .eq("id", verification.seller_id);

    if (profileError) {
      setErrorText(profileError.message);
      setActionLoadingId(null);
      return;
    }

await sendNotification({
  userId: verification.seller_id,
  type: "verification_approved",
  title: "Seller verification approved",
  message: "Your seller account has been verified.",
  link: "/seller-dashboard",
});

await fetchPendingVerifications();
setActionLoadingId(null);
  }

async function rejectSellerVerification(verification) {
  const reason = window.prompt("Enter verification rejection reason:");

  if (!reason) return;

  setActionLoadingId(verification.id);
  setErrorText("");

  const { error } = await supabase
    .from("seller_verifications")
    .update({
      status: "rejected",
      admin_note: reason,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", verification.id);

  if (error) {
    setErrorText(error.message);
  } else {
    await sendNotification({
      userId: verification.seller_id,
      type: "verification_rejected",
      title: "Seller verification rejected",
      message: `Your verification was rejected. Reason: ${reason}`,
      link: "/seller-dashboard",
    });

    await fetchPendingVerifications();
  }

  setActionLoadingId(null);
}

async function verifyPayment(order) {
  setActionLoadingId(order.id);
  setErrorText("");

  const { error } = await supabase
    .from("orders")
    .update({
      status: "active",
      payment_status: "paid",
      payment_verified_at: new Date().toISOString(),
      paid_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", order.id);

  if (error) {
    setErrorText(error.message);
  } else {
    await sendNotification({
      userId: order.buyer_id,
      type: "payment_verified",
      title: "Payment verified",
      message: "Your payment has been verified and the order is now active.",
      link: `/orders/${order.id}`,
    });

    await sendNotification({
      userId: order.seller_id,
      type: "order_active",
      title: "Order is active",
      message: "Payment has been verified. You can now begin work.",
      link: `/orders/${order.id}`,
    });

    await fetchPendingPayments();
  }

  setActionLoadingId(null);
}

async function rejectPayment(order) {
  const reason = window.prompt("Enter payment rejection reason:");

  if (!reason) return;

  setActionLoadingId(order.id);
  setErrorText("");

  const { error } = await supabase
    .from("orders")
    .update({
      payment_status: "payment_rejected",
      payment_rejection_reason: reason,
      updated_at: new Date().toISOString(),
    })
    .eq("id", order.id);

  if (error) {
    setErrorText(error.message);
  } else {
    await sendNotification({
      userId: order.buyer_id,
      type: "payment_rejected",
      title: "Payment rejected",
      message: `Your payment reference was rejected. Reason: ${reason}`,
      link: `/orders/${order.id}`,
    });

    await fetchPendingPayments();
  }

  setActionLoadingId(null);
}

async function markDisputeUnderReview(dispute) {
  setActionLoadingId(dispute.id);
  setErrorText("");

  const { error } = await supabase
    .from("order_disputes")
    .update({
      status: "under_review",
      updated_at: new Date().toISOString(),
    })
    .eq("id", dispute.id);

  if (error) {
    setErrorText(error.message);
  } else {
    await fetchAdminDisputes();
  }

  setActionLoadingId(null);
}

async function resolveDispute(dispute) {
  const decision = window.prompt("Enter admin decision or resolution note:");

  if (!decision) return;

  setActionLoadingId(dispute.id);
  setErrorText("");

  const { error } = await supabase
    .from("order_disputes")
    .update({
      status: "resolved",
      admin_decision: decision,
      resolved_by: user.id,
      resolved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", dispute.id);

  if (error) {
    setErrorText(error.message);
    setActionLoadingId(null);
    return;
  }

  await sendNotification({
    userId: dispute.buyer_id,
    type: "dispute_resolved",
    title: "Dispute resolved",
    message: "Admin has resolved a dispute on your order.",
    link: `/orders/${dispute.order_id}`,
  });

  await sendNotification({
    userId: dispute.seller_id,
    type: "dispute_resolved",
    title: "Dispute resolved",
    message: "Admin has resolved a dispute on your order.",
    link: `/orders/${dispute.order_id}`,
  });

  await fetchAdminDisputes();
  setActionLoadingId(null);
}

async function rejectDispute(dispute) {
  const decision = window.prompt("Enter rejection reason:");

  if (!decision) return;

  setActionLoadingId(dispute.id);
  setErrorText("");

  const { error } = await supabase
    .from("order_disputes")
    .update({
      status: "rejected",
      admin_decision: decision,
      resolved_by: user.id,
      resolved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", dispute.id);

  if (error) {
    setErrorText(error.message);
    setActionLoadingId(null);
    return;
  }

  await supabase
    .from("orders")
    .update({
      status: "active",
      updated_at: new Date().toISOString(),
    })
    .eq("id", dispute.order_id);

  await sendNotification({
    userId: dispute.buyer_id,
    type: "dispute_rejected",
    title: "Dispute rejected",
    message: "Admin rejected a dispute or cancellation request on your order.",
    link: `/orders/${dispute.order_id}`,
  });

  await sendNotification({
    userId: dispute.seller_id,
    type: "dispute_rejected",
    title: "Dispute rejected",
    message: "Admin rejected a dispute or cancellation request on your order.",
    link: `/orders/${dispute.order_id}`,
  });

  await fetchAdminDisputes();
  setActionLoadingId(null);
}

async function cancelOrderFromDispute(dispute) {
  const decision = window.prompt("Enter cancellation decision note:");

  if (!decision) return;

  setActionLoadingId(dispute.id);
  setErrorText("");

  const { error: disputeError } = await supabase
    .from("order_disputes")
    .update({
      status: "cancelled",
      admin_decision: decision,
      resolved_by: user.id,
      resolved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", dispute.id);

  if (disputeError) {
    setErrorText(disputeError.message);
    setActionLoadingId(null);
    return;
  }

  const { error: orderError } = await supabase
    .from("orders")
    .update({
      status: "cancelled",
      updated_at: new Date().toISOString(),
    })
    .eq("id", dispute.order_id);

  if (orderError) {
    setErrorText(orderError.message);
    setActionLoadingId(null);
    return;
  }

  await sendNotification({
    userId: dispute.buyer_id,
    type: "order_cancelled",
    title: "Order cancelled",
    message: "Admin cancelled the order after reviewing the dispute.",
    link: `/orders/${dispute.order_id}`,
  });

  await sendNotification({
    userId: dispute.seller_id,
    type: "order_cancelled",
    title: "Order cancelled",
    message: "Admin cancelled the order after reviewing the dispute.",
    link: `/orders/${dispute.order_id}`,
  });

  await fetchAdminDisputes();
  setActionLoadingId(null);
}

  async function handleCreateCategory(event) {
    event.preventDefault();

    setSavingCategory(true);
    setErrorText("");

    const finalSlug = categorySlug.trim() || makeSlugFromName(categoryName);

    const { error } = await supabase.from("marketplace_categories").insert({
      name: categoryName.trim(),
      slug: finalSlug,
      description: categoryDescription.trim(),
      display_order: Number(categoryOrder) || 100,
      is_active: true,
    });

    if (error) {
      setErrorText(error.message);
      setSavingCategory(false);
      return;
    }

    setCategoryName("");
    setCategorySlug("");
    setCategoryDescription("");
    setCategoryOrder("100");

    await fetchAdminCategories();
    setSavingCategory(false);
  }

  async function toggleCategoryStatus(category) {
    setActionLoadingId(category.id);
    setErrorText("");

    const { error } = await supabase
      .from("marketplace_categories")
      .update({
        is_active: !category.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq("id", category.id);

    if (error) {
      setErrorText(error.message);
    } else {
      await fetchAdminCategories();
    }

    setActionLoadingId(null);
  }

  async function updateCategoryOrder(category) {
    const newOrder = window.prompt("Enter new display order:", String(category.display_order));

    if (!newOrder) return;

    setActionLoadingId(category.id);
    setErrorText("");

    const { error } = await supabase
      .from("marketplace_categories")
      .update({
        display_order: Number(newOrder),
        updated_at: new Date().toISOString(),
      })
      .eq("id", category.id);

    if (error) {
      setErrorText(error.message);
    } else {
      await fetchAdminCategories();
    }

    setActionLoadingId(null);
  }

  async function toggleUserStatus(userProfile) {
    const isSuspending = userProfile.account_status !== "suspended";
    let suspensionReason = null;

    if (isSuspending) {
      suspensionReason = window.prompt("Enter suspension reason:");
      if (!suspensionReason) return;
    }

    setActionLoadingId(userProfile.id);
    setErrorText("");

    const updates = {
      account_status: isSuspending ? "suspended" : "active",
      suspended_reason: isSuspending ? suspensionReason : null,
      suspended_at: isSuspending ? new Date().toISOString() : null,
      suspended_by: isSuspending ? user.id : null,
    };

    const { error } = await supabase.from("profiles").update(updates).eq("id", userProfile.id);

    if (error) {
      setErrorText(error.message);
    } else {
      await fetchAdminUsers();
    }

    setActionLoadingId(null);
  }

  if (!user) {
    return (
      <main className="mx-auto max-w-3xl px-5 py-16">
        <div className="rounded-3xl border bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-bold">Admin Login Required</h1>
          <p className="mt-3 text-muted">Please login with an admin account.</p>
          <Link
            to="/login"
            className="mt-6 inline-block rounded-full bg-primary px-6 py-3 font-semibold text-white"
          >
            Login
          </Link>
        </div>
      </main>
    );
  }

  if (profile && profile.role !== "admin") {
    return (
      <main className="mx-auto max-w-3xl px-5 py-16">
        <div className="rounded-3xl border bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-bold">Admin Access Required</h1>
          <p className="mt-3 text-muted">
            This page is only available to admin accounts.
          </p>
        </div>
      </main>
    );
  }

  return (
    <DashboardShell title="Admin Dashboard">
      <div className="grid gap-5 md:grid-cols-5">
        <Stat title="Pending Services" value={pendingOffers.length} />
        <Stat title="Pending Payments" value={pendingPayments.length} />
        <Stat title="Pending Payouts" value={pendingPayouts.length} />
        <Stat title="Open Disputes" value={adminDisputes.length} />
        <Stat title="Verification Requests" value={pendingVerifications.length} />
        <Stat title="Support Tickets" value={supportTickets.length} />
        <Stat title="Categories" value={adminCategories.length} />
        <Stat title="Users" value={adminUsers.length} />
      </div>

      <div className="mt-8 rounded-3xl border bg-white p-6">
        <h2 className="text-xl font-bold">Service Offer Approval Queue</h2>
        <p className="mt-2 text-muted">
          Review seller Service Offers before they appear publicly on the marketplace.
        </p>

        {errorText && (
          <p className="mt-5 rounded-xl bg-red-50 p-4 text-sm font-medium text-red-700">
            {errorText}
          </p>
        )}

        {loadingOffers ? (
          <p className="mt-6 text-muted">Loading pending Service Offers...</p>
        ) : pendingOffers.length === 0 ? (
          <div className="mt-6 rounded-2xl bg-slate-50 p-6">
            <p className="font-semibold">No pending Service Offers.</p>
            <p className="mt-2 text-sm text-muted">
              New seller submissions will appear here.
            </p>
          </div>
        ) : (
          <div className="mt-6 grid gap-5">
            {pendingOffers.map((offer) => (
              <div key={offer.id} className="rounded-2xl border p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-xs font-semibold text-primary">{offer.category}</p>
                    <h3 className="mt-1 text-lg font-bold">{offer.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted">
                      {offer.description}
                    </p>

                    <div className="mt-4 grid gap-3 text-sm md:grid-cols-4">
                      <p>
                        <strong>Price:</strong> {offer.currency}{" "}
                        {Number(offer.basic_price).toFixed(2)}
                      </p>
                      <p>
                        <strong>Delivery:</strong> {offer.delivery_days} days
                      </p>
                      <p>
                        <strong>Revisions:</strong> {offer.revisions}
                      </p>
                      <p>
                        <strong>Status:</strong> {offer.status.replace("_", " ")}
                      </p>
                    </div>

                    {offer.admin_review_note && (
                      <p className="mt-3 rounded-xl bg-yellow-50 p-3 text-xs font-medium text-yellow-700">
                        <strong>Previous admin note:</strong> {offer.admin_review_note}
                      </p>
                    )}
                  </div>

                  <div className="flex min-w-44 flex-col gap-3">
                    <button
                      onClick={() => approveServiceOffer(offer)}
                      disabled={actionLoadingId === offer.id}
                      className="rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
                    >
                      {actionLoadingId === offer.id ? "Working..." : "Approve"}
                    </button>

                    <button
                      onClick={() => rejectServiceOffer(offer)}
                      disabled={actionLoadingId === offer.id}
                      className="rounded-full border border-red-200 px-5 py-3 text-sm font-semibold text-red-700 disabled:opacity-60"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-8 rounded-3xl border bg-white p-6">
        <h2 className="text-xl font-bold">Seller Verification Requests</h2>
        <p className="mt-2 text-muted">
          Review seller identity or business documents before marking sellers as verified.
        </p>

        {loadingVerifications ? (
          <p className="mt-6 text-muted">Loading verification requests...</p>
        ) : pendingVerifications.length === 0 ? (
          <div className="mt-6 rounded-2xl bg-slate-50 p-6">
            <p className="font-semibold">No pending seller verification requests.</p>
            <p className="mt-2 text-sm text-muted">
              Seller submissions will appear here after they upload verification documents.
            </p>
          </div>
        ) : (
          <div className="mt-6 grid gap-5">
            {pendingVerifications.map((verification) => (
              <div key={verification.id} className="rounded-2xl border p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-xs font-semibold text-primary">
                      {verification.country} · {verification.document_type}
                    </p>

                    <h3 className="mt-1 text-lg font-bold">{verification.legal_name}</h3>

                    <div className="mt-4 grid gap-2 text-sm text-slate-700">
                      <p>
                        <strong>Status:</strong> {verification.status}
                      </p>
                      <p>
                        <strong>Submitted:</strong>{" "}
                        {verification.submitted_at
                          ? new Date(verification.submitted_at).toLocaleString()
                          : "Not available"}
                      </p>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-3">
                      <button
                        onClick={() => openVerificationFile(verification.document_file_path)}
                        className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold"
                      >
                        Open ID Document
                      </button>

                      {verification.business_file_path && (
                        <button
                          onClick={() => openVerificationFile(verification.business_file_path)}
                          className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold"
                        >
                          Open Business Proof
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex min-w-44 flex-col gap-3">
                    <button
                      onClick={() => approveSellerVerification(verification)}
                      disabled={actionLoadingId === verification.id}
                      className="rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
                    >
                      {actionLoadingId === verification.id ? "Working..." : "Approve Verification"}
                    </button>

                    <button
                      onClick={() => rejectSellerVerification(verification)}
                      disabled={actionLoadingId === verification.id}
                      className="rounded-full border border-red-200 px-5 py-3 text-sm font-semibold text-red-700 disabled:opacity-60"
                    >
                      Reject Verification
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      <div className="mt-8 rounded-3xl border bg-white p-6">
        <h2 className="text-xl font-bold">Manual Payment Verification</h2>
        <p className="mt-2 text-muted">
          Review buyer-submitted payment references. Confirm payment manually through your M-Pesa, bank, Remitly, or transfer account before activating the order.
        </p>

        {loadingPayments ? (
          <p className="mt-6 text-muted">Loading payment submissions...</p>
        ) : pendingPayments.length === 0 ? (
          <div className="mt-6 rounded-2xl bg-slate-50 p-6">
            <p className="font-semibold">No pending payment submissions.</p>
            <p className="mt-2 text-sm text-muted">
              Buyer payment references will appear here after submission.
            </p>
          </div>
        ) : (
          <div className="mt-6 grid gap-5">
            {pendingPayments.map((order) => (
              <div key={order.id} className="rounded-2xl border p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-xs font-semibold text-primary">
                      {order.payment_method || "Manual transfer"}
                    </p>

                    <h3 className="mt-1 text-lg font-bold">{order.title}</h3>

                    <div className="mt-4 grid gap-2 text-sm text-slate-700">
                      <p>
                        <strong>Amount:</strong> {order.currency} {Number(order.price).toFixed(2)}
                      </p>
                      <p>
                        <strong>Reference:</strong> {order.manual_payment_reference || "Not provided"}
                      </p>
                      <p>
                        <strong>Buyer Note:</strong> {order.manual_payment_note || "No note"}
                      </p>
                      <p>
                        <strong>Submitted:</strong>{" "}
                        {order.payment_submitted_at
                          ? new Date(order.payment_submitted_at).toLocaleString()
                          : "Not available"}
                      </p>
                    </div>
                  </div>

                  <div className="flex min-w-44 flex-col gap-3">
                    <button
                     onClick={() => verifyPayment(order)}
                      disabled={actionLoadingId === order.id}
                      className="rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
                    >
                      {actionLoadingId === order.id ? "Working..." : "Verify Payment"}
                    </button>

                    <button
                      onClick={() => rejectPayment(order)}
                      disabled={actionLoadingId === order.id}
                      className="rounded-full border border-red-200 px-5 py-3 text-sm font-semibold text-red-700 disabled:opacity-60"
                    >
                      Reject Payment
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-8 rounded-3xl border bg-white p-6">
        <h2 className="text-xl font-bold">Order Disputes</h2>
        <p className="mt-2 text-muted">
          Review open disputes and cancellation requests from buyers and sellers.
        </p>

        {loadingDisputes ? (
          <p className="mt-6 text-muted">Loading disputes...</p>
        ) : adminDisputes.length === 0 ? (
          <div className="mt-6 rounded-2xl bg-slate-50 p-6">
            <p className="font-semibold">No open disputes.</p>
            <p className="mt-2 text-sm text-muted">
              New disputes and cancellation requests will appear here.
            </p>
          </div>
        ) : (
          <div className="mt-6 grid gap-5">
            {adminDisputes.map((dispute) => (
              <div key={dispute.id} className="rounded-2xl border p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-xs font-semibold text-primary">
                      {dispute.reason.replaceAll("_", " ")}
                    </p>

                    <h3 className="mt-1 text-lg font-bold">Dispute for Order</h3>

                    <p className="mt-2 whitespace-pre-line text-sm leading-6 text-muted">
                      {dispute.description}
                    </p>

                    <div className="mt-4 grid gap-2 text-sm text-slate-700">
                      <p>
                        <strong>Status:</strong> {dispute.status.replaceAll("_", " ")}
                      </p>
                      <p>
                        <strong>Opened:</strong> {new Date(dispute.opened_at).toLocaleString()}
                      </p>
                    </div>

                    <Link
                      to={`/orders/${dispute.order_id}`}
                      className="mt-4 inline-block rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold"
                    >
                      View Order
                    </Link>
                  </div>

                  <div className="flex min-w-48 flex-col gap-3">
                    {dispute.status === "open" && (
                      <button
                        onClick={() => markDisputeUnderReview(dispute)}
                        disabled={actionLoadingId === dispute.id}
                        className="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold disabled:opacity-60"
                      >
                        Mark Under Review
                      </button>
                    )}

                    <button
                      onClick={() => resolveDispute(dispute)}
                      disabled={actionLoadingId === dispute.id}
                      className="rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
                    >
                      Resolve
                    </button>

                    <button
                      onClick={() => rejectDispute(dispute)}
                      disabled={actionLoadingId === dispute.id}
                      className="rounded-full border border-yellow-200 px-5 py-3 text-sm font-semibold text-yellow-700 disabled:opacity-60"
                    >
                      Reject
                    </button>

                    <button
                      onClick={() => cancelOrderFromDispute(dispute)}
                      disabled={actionLoadingId === dispute.id}
                      className="rounded-full border border-red-200 px-5 py-3 text-sm font-semibold text-red-700 disabled:opacity-60"
                    >
                      Cancel Order
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-8 rounded-3xl border bg-white p-6">
        <h2 className="text-xl font-bold">Seller Payout Requests</h2>
        <p className="mt-2 text-muted">
          Review completed-order payout requests and mark seller payouts as paid after manual transfer.
        </p>

        {loadingPayouts ? (
          <p className="mt-6 text-muted">Loading payout requests...</p>
        ) : pendingPayouts.length === 0 ? (
          <div className="mt-6 rounded-2xl bg-slate-50 p-6">
            <p className="font-semibold">No pending payout requests.</p>
            <p className="mt-2 text-sm text-muted">
              Seller payout requests will appear here after completed orders.
            </p>
          </div>
        ) : (
          <div className="mt-6 grid gap-5">
            {pendingPayouts.map((order) => (
              <div key={order.id} className="rounded-2xl border p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-xs font-semibold text-primary">
                      Seller Payout Request
                    </p>

                    <h3 className="mt-1 text-lg font-bold">{order.title}</h3>

                    <div className="mt-4 grid gap-2 text-sm text-slate-700">
                      <p>
                        <strong>Payout Amount:</strong> {order.currency} {Number(order.seller_payout).toFixed(2)}
                      </p>
                      <p>
                        <strong>Payout Method:</strong> {order.payout_method || "Manual payout"}
                      </p>
                      <p>
                        <strong>Seller Note:</strong> {order.payout_note || "No note"}
                      </p>
                      <p>
                        <strong>Requested:</strong>{" "}
                        {order.payout_requested_at
                          ? new Date(order.payout_requested_at).toLocaleString()
                          : "Not available"}
                      </p>
                    </div>
                  </div>

                  <div className="flex min-w-44 flex-col gap-3">
                    <button
                      onClick={() => markPayoutPaid(order)}
                      disabled={actionLoadingId === order.id}
                      className="rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
                    >
                      {actionLoadingId === order.id ? "Working..." : "Mark Paid"}
                    </button>

                    <button
                      onClick={() => rejectPayout(order)}
                      disabled={actionLoadingId === order.id}
                      className="rounded-full border border-red-200 px-5 py-3 text-sm font-semibold text-red-700 disabled:opacity-60"
                    >
                      Reject Payout
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-8 rounded-3xl border bg-white p-6">
        <h2 className="text-xl font-bold">Support Tickets</h2>
        <p className="mt-2 text-muted">
          Review general user help requests and platform support issues.
        </p>

        {loadingSupportTickets ? (
          <p className="mt-6 text-muted">Loading support tickets...</p>
        ) : supportTickets.length === 0 ? (
          <div className="mt-6 rounded-2xl bg-slate-50 p-6">
            <p className="font-semibold">No open support tickets.</p>
            <p className="mt-2 text-sm text-muted">
              User support requests will appear here.
            </p>
          </div>
        ) : (
          <div className="mt-6 grid gap-5">
            {supportTickets.map((ticket) => (
              <div key={ticket.id} className="rounded-2xl border p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <p className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                        {ticket.category}
                      </p>
                      <p className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        ticket.priority === "urgent"
                          ? "bg-red-50 text-red-700"
                          : ticket.priority === "high"
                          ? "bg-orange-50 text-orange-700"
                          : ticket.priority === "normal"
                          ? "bg-yellow-50 text-yellow-700"
                          : "bg-green-50 text-green-700"
                      }`}>
                        {ticket.priority}
                      </p>
                      <p className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        ticket.status === "open"
                          ? "bg-slate-50 text-slate-700"
                          : ticket.status === "in_progress"
                          ? "bg-blue-50 text-blue-700"
                          : ticket.status === "resolved"
                          ? "bg-green-50 text-green-700"
                          : "bg-gray-50 text-gray-700"
                      }`}>
                        {ticket.status}
                      </p>
                    </div>

                    <h3 className="mt-3 text-lg font-bold">{ticket.subject}</h3>

                    <p className="mt-2 whitespace-pre-line text-sm leading-6 text-muted">
                      {ticket.description}
                    </p>

                    {ticket.admin_response && (
                      <div className="mt-4 rounded-xl bg-slate-50 p-4">
                        <p className="text-xs font-semibold text-slate-700">Admin Response</p>
                        <p className="mt-2 text-sm text-slate-800">{ticket.admin_response}</p>
                      </div>
                    )}

                    <p className="mt-4 text-sm text-slate-700">
                      <strong>Opened:</strong> {new Date(ticket.created_at).toLocaleString()}
                    </p>
                  </div>

                  <div className="flex min-w-48 flex-col gap-3">
                    {ticket.status === "open" && (
                      <button
                        onClick={() => markSupportInProgress(ticket)}
                        disabled={actionLoadingId === ticket.id}
                        className="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold disabled:opacity-60"
                      >
                        Mark In Progress
                      </button>
                    )}

                    {ticket.status !== "resolved" && ticket.status !== "closed" && (
                      <button
                        onClick={() => resolveSupportTicket(ticket)}
                        disabled={actionLoadingId === ticket.id}
                        className="rounded-full bg-green-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
                      >
                        Resolve
                      </button>
                    )}

                    <button
                      onClick={() => closeSupportTicket(ticket)}
                      disabled={actionLoadingId === ticket.id}
                      className="rounded-full bg-slate-300 px-5 py-3 text-sm font-semibold text-slate-800 disabled:opacity-60"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-8 rounded-3xl border bg-white p-6">
        <h2 className="text-xl font-bold">Category Management</h2>
        <p className="mt-2 text-muted">
          Add, pause, reactivate, and reorder marketplace categories.
        </p>

        <form onSubmit={handleCreateCategory} className="mt-6 grid gap-4 rounded-2xl bg-slate-50 p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <input
              className="rounded-xl border bg-white px-4 py-3 outline-none"
              placeholder="Category name"
              value={categoryName}
              onChange={(event) => {
                setCategoryName(event.target.value);
                if (!categorySlug) {
                  setCategorySlug(makeSlugFromName(event.target.value));
                }
              }}
              required
            />

            <input
              className="rounded-xl border bg-white px-4 py-3 outline-none"
              placeholder="Slug"
              value={categorySlug}
              onChange={(event) => setCategorySlug(event.target.value)}
              required
            />
          </div>

          <textarea
            className="min-h-24 rounded-xl border bg-white px-4 py-3 outline-none"
            placeholder="Category description"
            value={categoryDescription}
            onChange={(event) => setCategoryDescription(event.target.value)}
            required
          />

          <input
            className="rounded-xl border bg-white px-4 py-3 outline-none"
            placeholder="Display order"
            type="number"
            value={categoryOrder}
            onChange={(event) => setCategoryOrder(event.target.value)}
          />

          <button
            disabled={savingCategory}
            className="rounded-full bg-primary px-6 py-3 font-semibold text-white disabled:opacity-60"
          >
            {savingCategory ? "Saving..." : "Create Category"}
          </button>
        </form>

        {loadingCategories ? (
          <p className="mt-6 text-muted">Loading categories...</p>
        ) : adminCategories.length === 0 ? (
          <div className="mt-6 rounded-2xl bg-slate-50 p-6">
            <p className="font-semibold">No categories found.</p>
            <p className="mt-2 text-sm text-muted">
              Create your first marketplace category above.
            </p>
          </div>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b bg-slate-50">
                  <th className="p-4">Order</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Slug</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Actions</th>
                </tr>
              </thead>

              <tbody>
                {adminCategories.map((category) => (
                  <tr key={category.id} className="border-b align-top">
                    <td className="p-4">{category.display_order}</td>

                    <td className="p-4">
                      <p className="font-semibold">{category.name}</p>
                      <p className="mt-1 line-clamp-2 text-muted">
                        {category.description}
                      </p>
                    </td>

                    <td className="p-4">{category.slug}</td>

                    <td className="p-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          category.is_active
                            ? "bg-green-50 text-green-700"
                            : "bg-red-50 text-red-700"
                        }`}
                      >
                        {category.is_active ? "active" : "paused"}
                      </span>
                    </td>

                    <td className="p-4">
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => updateCategoryOrder(category)}
                          disabled={actionLoadingId === category.id}
                          className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold disabled:opacity-60"
                        >
                          Reorder
                        </button>

                        <button
                          onClick={() => toggleCategoryStatus(category)}
                          disabled={actionLoadingId === category.id}
                          className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
                        >
                          {category.is_active ? "Pause" : "Reactivate"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-8 rounded-3xl border bg-white p-6">
        <h2 className="text-xl font-bold">User Management</h2>
        <p className="mt-2 text-muted">
          Review and manage marketplace user accounts, suspend or reactivate as needed.
        </p>

        {loadingUsers ? (
          <p className="mt-6 text-muted">Loading users...</p>
        ) : adminUsers.length === 0 ? (
          <div className="mt-6 rounded-2xl bg-slate-50 p-6">
            <p className="font-semibold">No users found.</p>
            <p className="mt-2 text-sm text-muted">
              User accounts will appear here once they register.
            </p>
          </div>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b bg-slate-50">
                  <th className="p-4">Name</th>
                  <th className="p-4">Role</th>
                  <th className="p-4">Verified</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Country</th>
                  <th className="p-4">Actions</th>
                </tr>
              </thead>

              <tbody>
                {adminUsers.map((userProfile) => (
                  <tr key={userProfile.id} className="border-b align-top">
                    <td className="p-4">
                      <p className="font-semibold">{userProfile.full_name || "Unnamed user"}</p>
                      <p className="mt-1 text-sm text-muted">{userProfile.headline || "No headline"}</p>
                    </td>

                    <td className="p-4">{userProfile.role || "buyer"}</td>

                    <td className="p-4">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        userProfile.is_verified
                          ? "bg-green-50 text-green-700"
                          : "bg-slate-100 text-slate-700"
                      }`}>
                        {userProfile.is_verified ? "Verified" : "Unverified"}
                      </span>
                    </td>

                    <td className="p-4">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        userProfile.account_status === "suspended"
                          ? "bg-red-50 text-red-700"
                          : "bg-green-50 text-green-700"
                      }`}>
                        {userProfile.account_status || "active"}
                      </span>
                    </td>

                    <td className="p-4">{userProfile.country || "N/A"}</td>

                    <td className="p-4">
                      <button
                        onClick={() => toggleUserStatus(userProfile)}
                        disabled={actionLoadingId === userProfile.id}
                        className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
                      >
                        {userProfile.account_status === "suspended" ? "Reactivate" : "Suspend"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}

function MessagesPage() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [errorText, setErrorText] = useState("");

  async function fetchConversations() {
    if (!user) {
      setConversations([]);
      setLoadingConversations(false);
      return;
    }

    setLoadingConversations(true);
    setErrorText("");

    const { data, error } = await supabase
      .from("direct_conversations")
      .select("*")
      .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
      .order("updated_at", { ascending: false });

    if (error) {
      setErrorText(error.message);
      setConversations([]);
    } else {
      setConversations(data || []);
    }

    setLoadingConversations(false);
  }

  useEffect(() => {
    fetchConversations();
  }, [user]);

  if (!user) {
    return (
      <main className="mx-auto max-w-3xl px-5 py-16">
        <div className="rounded-3xl border bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-bold">Messages</h1>
          <p className="mt-3 text-muted">Please login to view your direct messages.</p>
          <Link
            to="/login"
            className="mt-6 inline-block rounded-full bg-primary px-6 py-3 font-semibold text-white"
          >
            Login
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-5 py-12">
      <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-4xl font-bold">Messages</h1>
          <p className="mt-2 text-muted">Your direct conversations with buyers and sellers.</p>
        </div>

        <Link
          to="/messages"
          className="inline-flex items-center rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white"
        >
          Refresh
        </Link>
      </div>

      {errorText && (
        <p className="mb-6 rounded-xl bg-red-50 p-4 text-sm font-medium text-red-700">
          {errorText}
        </p>
      )}

      {loadingConversations ? (
        <p className="text-muted">Loading conversations...</p>
      ) : conversations.length === 0 ? (
        <div className="rounded-3xl border bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-bold">No conversations yet</h2>
          <p className="mt-3 text-muted">Contact a seller from a service page to begin a direct conversation.</p>
        </div>
      ) : (
        <div className="grid gap-5">
          {conversations.map((conversation) => {
            const roleLabel = conversation.buyer_id === user.id ? "Buyer" : "Seller";

            return (
              <Link
                key={conversation.id}
                to={`/messages/${conversation.id}`}
                className="rounded-3xl border bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold text-primary">{roleLabel}</p>
                    <h2 className="mt-2 text-2xl font-bold">{conversation.subject}</h2>
                  </div>

                  <p className="text-sm text-slate-500">
                    Updated {conversation.updated_at ? new Date(conversation.updated_at).toLocaleString() : "Unknown"}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}

function ConversationPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingConversation, setLoadingConversation] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [errorText, setErrorText] = useState("");

  async function fetchConversation() {
    if (!id) {
      setConversation(null);
      setLoadingConversation(false);
      return;
    }

    setLoadingConversation(true);
    setErrorText("");

    const { data, error } = await supabase
      .from("direct_conversations")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (!error) {
      setConversation(data || null);
    }

    setLoadingConversation(false);
  }

  async function fetchMessages() {
    if (!id) {
      setMessages([]);
      return;
    }

    const { data, error } = await supabase
      .from("direct_messages")
      .select("*")
      .eq("conversation_id", id)
      .order("created_at", { ascending: true });

    if (!error) {
      setMessages(data || []);
    }
  }

  useEffect(() => {
    fetchConversation();
    fetchMessages();
  }, [id, user]);

  async function handleSendMessage(event) {
    event.preventDefault();

    if (!user || !conversation || !newMessage.trim()) return;

    setSendingMessage(true);
    setErrorText("");

    const { error } = await supabase
      .from("direct_messages")
      .insert({
        conversation_id: conversation.id,
        sender_id: user.id,
        message: newMessage.trim(),
        is_read: false,
      });

    if (error) {
      setErrorText(error.message);
      setSendingMessage(false);
      return;
    }

    const recipientId = user.id === conversation.buyer_id
      ? conversation.seller_id
      : conversation.buyer_id;

    await supabase
      .from("direct_conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversation.id);

    await sendNotification({
      userId: recipientId,
      type: "direct_message",
      title: "New direct message",
      message: "You received a new direct message.",
      link: `/messages/${conversation.id}`,
    });

    setNewMessage("");
    await fetchMessages();
    await fetchConversation();
    setSendingMessage(false);
  }

  if (!user) {
    return (
      <main className="mx-auto max-w-3xl px-5 py-16">
        <div className="rounded-3xl border bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-bold">Direct Conversation</h1>
          <p className="mt-3 text-muted">Please login to view this conversation.</p>
          <Link
            to="/login"
            className="mt-6 inline-block rounded-full bg-primary px-6 py-3 font-semibold text-white"
          >
            Login
          </Link>
        </div>
      </main>
    );
  }

  if (loadingConversation) {
    return (
      <main className="mx-auto max-w-3xl px-5 py-16">
        <p className="text-muted">Loading conversation...</p>
      </main>
    );
  }

  if (!conversation || (conversation.buyer_id !== user.id && conversation.seller_id !== user.id)) {
    return (
      <main className="mx-auto max-w-3xl px-5 py-16">
        <div className="rounded-3xl border bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-bold">Conversation Not Found</h1>
          <p className="mt-3 text-muted">This conversation does not exist or you do not have access to it.</p>
        </div>
      </main>
    );
  }

  const recipientId = user.id === conversation.buyer_id ? conversation.seller_id : conversation.buyer_id;
  const roleLabel = user.id === conversation.buyer_id ? "Buyer" : "Seller";

  return (
    <main className="mx-auto max-w-7xl px-5 py-12">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold text-primary">{roleLabel}</p>
          <h1 className="text-4xl font-bold">{conversation.subject}</h1>
          <p className="mt-2 text-muted">
            Conversation updated {conversation.updated_at ? new Date(conversation.updated_at).toLocaleString() : "Unknown"}.
          </p>
        </div>
      </div>

      {errorText && (
        <p className="mb-6 rounded-xl bg-red-50 p-4 text-sm font-medium text-red-700">
          {errorText}
        </p>
      )}

      <div className="grid gap-4">
        {messages.length === 0 ? (
          <div className="rounded-3xl border bg-white p-8 shadow-sm">
            <p className="text-muted">No messages yet. Send the first message below.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((messageItem) => {
              const isMine = messageItem.sender_id === user.id;
              return (
                <div
                  key={messageItem.id}
                  className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-3xl px-5 py-4 text-sm leading-7 ${
                      isMine ? "bg-primary text-white" : "bg-slate-100 text-slate-800"
                    }`}
                  >
                    <p>{messageItem.message}</p>
                    <p className={`mt-3 text-xs ${isMine ? "text-teal-100" : "text-slate-500"}`}>
                      {new Date(messageItem.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <form onSubmit={handleSendMessage} className="mt-8 grid gap-4 rounded-3xl border bg-white p-6 shadow-sm">
        <textarea
          className="min-h-28 rounded-2xl border bg-slate-50 px-4 py-3 outline-none"
          placeholder="Write a message..."
          value={newMessage}
          onChange={(event) => setNewMessage(event.target.value)}
          required
        />

        <button
          disabled={sendingMessage}
          className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          {sendingMessage ? "Sending..." : "Send Message"}
        </button>
      </form>
    </main>
  );
}

function SupportPage() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [submittingTicket, setSubmittingTicket] = useState(false);
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("Account");
  const [priority, setPriority] = useState("normal");
  const [description, setDescription] = useState("");
  const [errorText, setErrorText] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function fetchUserTickets() {
    if (!user) {
      setTickets([]);
      setLoadingTickets(false);
      return;
    }

    setLoadingTickets(true);
    setErrorText("");

    const { data, error } = await supabase
      .from("support_tickets")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      setErrorText(error.message);
      setTickets([]);
    } else {
      setTickets(data || []);
    }

    setLoadingTickets(false);
  }

  useEffect(() => {
    fetchUserTickets();
  }, [user]);

  async function handleSubmitTicket(event) {
    event.preventDefault();

    if (!user) {
      setErrorText("Please login to submit a support ticket.");
      return;
    }

    if (!subject.trim() || !description.trim()) {
      setErrorText("Please fill in all required fields.");
      return;
    }

    setSubmittingTicket(true);
    setErrorText("");
    setSuccessMessage("");

    const { error: insertError } = await supabase
      .from("support_tickets")
      .insert({
        user_id: user.id,
        subject: subject.trim(),
        category,
        priority,
        description: description.trim(),
        status: "open",
      });

    if (insertError) {
      setErrorText(insertError.message);
      setSubmittingTicket(false);
      return;
    }

    // Notify admins
    const { data: admins } = await supabase
      .from("profiles")
      .select("id")
      .eq("role", "admin");

    for (const admin of admins || []) {
      await sendNotification({
        userId: admin.id,
        type: "support_ticket",
        title: "New support ticket",
        message: "A user opened a new support ticket.",
        link: "/admin",
      });
    }

    // Reset form
    setSubject("");
    setDescription("");
    setCategory("Account");
    setPriority("normal");
    setSuccessMessage("Your support ticket has been submitted successfully!");

    // Refetch tickets
    await fetchUserTickets();
    setSubmittingTicket(false);
  }

  return (
    <main className="mx-auto max-w-7xl px-5 py-12">
      <div className="mb-8">
        <h1 className="text-4xl font-bold">Help Center</h1>
        <p className="mt-2 text-muted">
          Need assistance? Submit a support ticket and our team will help you as soon as possible.
        </p>
      </div>

      {!user ? (
        <div className="rounded-3xl border bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-bold">Login Required</h2>
          <p className="mt-3 text-muted">Please login to submit a support ticket.</p>
          <Link
            to="/login"
            className="mt-6 inline-block rounded-full bg-primary px-6 py-3 font-semibold text-white"
          >
            Login
          </Link>
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Form */}
          <div className="lg:col-span-1">
            <div className="rounded-3xl border bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold">Create Support Ticket</h2>

              {errorText && (
                <p className="mt-4 rounded-xl bg-red-50 p-4 text-sm font-medium text-red-700">
                  {errorText}
                </p>
              )}

              {successMessage && (
                <p className="mt-4 rounded-xl bg-green-50 p-4 text-sm font-medium text-green-700">
                  {successMessage}
                </p>
              )}

              <form onSubmit={handleSubmitTicket} className="mt-6 grid gap-4">
                <div>
                  <label className="text-sm font-semibold">Subject</label>
                  <input
                    className="mt-2 w-full rounded-xl border bg-white px-4 py-3 outline-none"
                    placeholder="Brief description of your issue"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold">Category</label>
                  <select
                    className="mt-2 w-full rounded-xl border bg-white px-4 py-3 outline-none"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    <option>Account</option>
                    <option>Orders</option>
                    <option>Payments</option>
                    <option>Payouts</option>
                    <option>Seller Verification</option>
                    <option>Technical Issue</option>
                    <option>Other</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-semibold">Priority</label>
                  <select
                    className="mt-2 w-full rounded-xl border bg-white px-4 py-3 outline-none"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-semibold">Description</label>
                  <textarea
                    className="mt-2 min-h-32 w-full rounded-xl border bg-white px-4 py-3 outline-none"
                    placeholder="Provide details about your issue..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                  />
                </div>

                <button
                  disabled={submittingTicket}
                  className="rounded-full bg-primary px-6 py-3 font-semibold text-white disabled:opacity-60"
                >
                  {submittingTicket ? "Submitting..." : "Submit Ticket"}
                </button>
              </form>
            </div>
          </div>

          {/* Tickets List */}
          <div className="lg:col-span-2">
            <div className="rounded-3xl border bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold">Your Support Tickets</h2>
              <p className="mt-2 text-muted">Track the status of your support requests.</p>

              {loadingTickets ? (
                <p className="mt-6 text-muted">Loading your tickets...</p>
              ) : tickets.length === 0 ? (
                <div className="mt-6 rounded-2xl bg-slate-50 p-6">
                  <p className="font-semibold">No support tickets yet</p>
                  <p className="mt-2 text-sm text-muted">Submit a ticket to get help from our support team.</p>
                </div>
              ) : (
                <div className="mt-6 grid gap-4">
                  {tickets.map((ticket) => (
                    <div key={ticket.id} className="rounded-2xl border border-slate-200 p-4">
                      <div className="flex flex-col gap-3">
                        <div className="flex flex-wrap gap-2">
                          <p className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                            {ticket.category}
                          </p>
                          <p className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            ticket.priority === "urgent"
                              ? "bg-red-50 text-red-700"
                              : ticket.priority === "high"
                              ? "bg-orange-50 text-orange-700"
                              : ticket.priority === "normal"
                              ? "bg-yellow-50 text-yellow-700"
                              : "bg-green-50 text-green-700"
                          }`}>
                            {ticket.priority}
                          </p>
                          <p className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            ticket.status === "open"
                              ? "bg-slate-100 text-slate-700"
                              : ticket.status === "in_progress"
                              ? "bg-blue-50 text-blue-700"
                              : ticket.status === "resolved"
                              ? "bg-green-50 text-green-700"
                              : "bg-gray-100 text-gray-700"
                          }`}>
                            {ticket.status}
                          </p>
                        </div>

                        <h3 className="font-bold">{ticket.subject}</h3>

                        <p className="whitespace-pre-line text-sm leading-6 text-slate-600">
                          {ticket.description}
                        </p>

                        {ticket.admin_response && (
                          <div className="mt-3 rounded-xl bg-slate-50 p-3">
                            <p className="text-xs font-semibold text-slate-700">Admin Response</p>
                            <p className="mt-2 text-sm text-slate-800">{ticket.admin_response}</p>
                          </div>
                        )}

                        <p className="text-xs text-slate-500">
                          {new Date(ticket.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function CreateServicePage() {
  const navigate = useNavigate();
  const { id: draftId } = useParams();
  const { user, profile } = useAuth();

  const [pageCategories, setPageCategories] = useState(categories);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [currency, setCurrency] = useState("USD");

  const [serviceImageFile, setServiceImageFile] = useState(null);
  const [imageUrl, setImageUrl] = useState("");
  const [galleryImageFiles, setGalleryImageFiles] = useState([]);
  const [videoUrl, setVideoUrl] = useState("");

  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [tags, setTags] = useState("");

  const [basicTitle, setBasicTitle] = useState("Basic");
  const [basicDescription, setBasicDescription] = useState("");
  const [basicPackagePrice, setBasicPackagePrice] = useState("");
  const [basicPackageDeliveryDays, setBasicPackageDeliveryDays] = useState("");
  const [basicPackageRevisions, setBasicPackageRevisions] = useState("1");

  const [standardTitle, setStandardTitle] = useState("Standard");
  const [standardDescription, setStandardDescription] = useState("");
  const [standardPrice, setStandardPrice] = useState("");
  const [standardDeliveryDays, setStandardDeliveryDays] = useState("");
  const [standardRevisions, setStandardRevisions] = useState("2");

  const [premiumTitle, setPremiumTitle] = useState("Premium");
  const [premiumDescription, setPremiumDescription] = useState("");
  const [premiumPrice, setPremiumPrice] = useState("");
  const [premiumDeliveryDays, setPremiumDeliveryDays] = useState("");
  const [premiumRevisions, setPremiumRevisions] = useState("3");

  const [faqs, setFaqs] = useState([
    { question: "", answer: "" },
    { question: "", answer: "" },
    { question: "", answer: "" },
  ]);

  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState("");

  const [savingDraft, setSavingDraft] = useState(false);
  const [draftMessage, setDraftMessage] = useState("");
  const [loadedDraftId, setLoadedDraftId] = useState(null);
  const [loadingDraft, setLoadingDraft] = useState(false);

  useEffect(() => {
    async function fetchCategories() {
      const { data, error } = await supabase
        .from("marketplace_categories")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (!error && data?.length) {
        setPageCategories(data);
      }
    }

    fetchCategories();
  }, []);

  function updateFaq(index, field, value) {
    setFaqs((current) =>
      current.map((faq, faqIndex) =>
        faqIndex === index ? { ...faq, [field]: value } : faq
      )
    );
  }

  function addFaq() {
    setFaqs((current) => [...current, { question: "", answer: "" }]);
  }

  function removeFaq(index) {
    setFaqs((current) => current.filter((_, faqIndex) => faqIndex !== index));
  }

  function buildDraftPayload() {
    return {
      title,
      category,
      description,
      currency,
      seoTitle,
      seoDescription,
      tags,
      videoUrl,
      packages: {
        basic: {
          title: basicTitle,
          description: basicDescription,
          price: basicPackagePrice,
          deliveryDays: basicPackageDeliveryDays,
          revisions: basicPackageRevisions,
        },
        standard: {
          title: standardTitle,
          description: standardDescription,
          price: standardPrice,
          deliveryDays: standardDeliveryDays,
          revisions: standardRevisions,
        },
        premium: {
          title: premiumTitle,
          description: premiumDescription,
          price: premiumPrice,
          deliveryDays: premiumDeliveryDays,
          revisions: premiumRevisions,
        },
      },
      faqs,
    };
  }

  function applyDraftPayload(draftData) {
    if (!draftData) return;

    setTitle(draftData.title || "");
    setCategory(draftData.category || "");
    setDescription(draftData.description || "");
    setCurrency(draftData.currency || "USD");

    setSeoTitle(draftData.seoTitle || "");
    setSeoDescription(draftData.seoDescription || "");
    setTags(draftData.tags || "");
    setVideoUrl(draftData.videoUrl || "");

    if (draftData.packages?.basic) {
      setBasicTitle(draftData.packages.basic.title || "Basic");
      setBasicDescription(draftData.packages.basic.description || "");
      setBasicPackagePrice(draftData.packages.basic.price || "");
      setBasicPackageDeliveryDays(draftData.packages.basic.deliveryDays || "");
      setBasicPackageRevisions(draftData.packages.basic.revisions || "1");
    }

    if (draftData.packages?.standard) {
      setStandardTitle(draftData.packages.standard.title || "Standard");
      setStandardDescription(draftData.packages.standard.description || "");
      setStandardPrice(draftData.packages.standard.price || "");
      setStandardDeliveryDays(draftData.packages.standard.deliveryDays || "");
      setStandardRevisions(draftData.packages.standard.revisions || "2");
    }

    if (draftData.packages?.premium) {
      setPremiumTitle(draftData.packages.premium.title || "Premium");
      setPremiumDescription(draftData.packages.premium.description || "");
      setPremiumPrice(draftData.packages.premium.price || "");
      setPremiumDeliveryDays(draftData.packages.premium.deliveryDays || "");
      setPremiumRevisions(draftData.packages.premium.revisions || "3");
    }

    if (Array.isArray(draftData.faqs) && draftData.faqs.length > 0) {
      setFaqs(draftData.faqs);
    }
  }

  useEffect(() => {
    async function loadDraft() {
      if (!draftId || !user) return;

      setLoadingDraft(true);
      setErrorText("");
      setDraftMessage("");

      const { data, error } = await supabase
        .from("service_offer_drafts")
        .select("*")
        .eq("id", draftId)
        .single();

      if (error) {
        setErrorText(error.message);
        setLoadingDraft(false);
        return;
      }

      if (data.seller_id !== user.id && profile?.role !== "admin") {
        setErrorText("You do not have permission to open this draft.");
        setLoadingDraft(false);
        return;
      }

      applyDraftPayload(data.draft_data);
      setLoadedDraftId(data.id);
      setDraftMessage("Draft loaded.");
      setLoadingDraft(false);
    }

    loadDraft();
  }, [draftId, user, profile]);

  async function handleSaveDraft(event) {
    event.preventDefault();

    if (!user) {
      navigate("/login");
      return;
    }

    setSavingDraft(true);
    setDraftMessage("");
    setErrorText("");

    const draftPayload = buildDraftPayload();
    const draftName = title.trim() || seoTitle.trim() || "Untitled Service Draft";

    let error;
    let savedDraft = null;

    if (loadedDraftId) {
      const result = await supabase
        .from("service_offer_drafts")
        .update({
          draft_name: draftName,
          draft_data: draftPayload,
          updated_at: new Date().toISOString(),
        })
        .eq("id", loadedDraftId)
        .select()
        .single();

      error = result.error;
      savedDraft = result.data;
    } else {
      const result = await supabase
        .from("service_offer_drafts")
        .insert({
          seller_id: user.id,
          draft_name: draftName,
          draft_data: draftPayload,
        })
        .select()
        .single();

      error = result.error;
      savedDraft = result.data;
    }

    if (error) {
      setErrorText(error.message);
      setSavingDraft(false);
      return;
    }

    if (savedDraft?.id) {
      setLoadedDraftId(savedDraft.id);
    }

    setDraftMessage("Draft saved successfully.");
    setSavingDraft(false);
  }

  async function uploadServiceImage(file, pathPrefix) {
    if (!file) return { publicUrl: null, filePath: null, error: null };

    const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const filePath = `${user.id}/${pathPrefix}-${Date.now()}-${safeFileName}`;

    const { error: uploadError } = await supabase.storage
      .from("service-images")
      .upload(filePath, file);

    if (uploadError) {
      return { publicUrl: null, filePath: null, error: uploadError };
    }

    const { data } = supabase.storage.from("service-images").getPublicUrl(filePath);

    return {
      publicUrl: data.publicUrl,
      filePath,
      error: null,
    };
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!user) {
      navigate("/login");
      return;
    }

    if (profile?.account_status === "suspended") {
      setErrorText("Your account is suspended. This action is not allowed.");
      return;
    }

    if (profile && profile.role !== "seller") {
      setErrorText("Only seller accounts can create Service Offers.");
      return;
    }

    setLoading(true);
    setDraftMessage("");
    setErrorText("");

    let uploadedImageUrl = null;
    let uploadedImagePath = null;

    if (serviceImageFile) {
      const uploadResult = await uploadServiceImage(serviceImageFile, "main");

      if (uploadResult.error) {
        setErrorText(uploadResult.error.message);
        setLoading(false);
        return;
      }

      uploadedImageUrl = uploadResult.publicUrl;
      uploadedImagePath = uploadResult.filePath;
    }

    const { data: createdOffer, error: offerError } = await supabase
      .from("service_offers")
      .insert({
        seller_id: user.id,
        title,
        category,
        description,
        basic_price: Number(basicPackagePrice),
        currency,
        delivery_days: Number(basicPackageDeliveryDays),
        revisions: Number(basicPackageRevisions),
        image_url: uploadedImageUrl || imageUrl || null,
        seo_title: seoTitle.trim() || null,
        seo_description: seoDescription.trim() || null,
        tags: tags.trim() || null,
        status: "approved",
      })
      .select()
      .single();

    if (offerError) {
      setErrorText(offerError.message);
      setLoading(false);
      return;
    }

    const packageRows = [
      {
        service_offer_id: createdOffer.id,
        tier: "basic",
        title: basicTitle,
        description: basicDescription,
        price: Number(basicPackagePrice),
        currency,
        delivery_days: Number(basicPackageDeliveryDays),
        revisions: Number(basicPackageRevisions),
      },
      {
        service_offer_id: createdOffer.id,
        tier: "standard",
        title: standardTitle,
        description: standardDescription,
        price: Number(standardPrice),
        currency,
        delivery_days: Number(standardDeliveryDays),
        revisions: Number(standardRevisions),
      },
      {
        service_offer_id: createdOffer.id,
        tier: "premium",
        title: premiumTitle,
        description: premiumDescription,
        price: Number(premiumPrice),
        currency,
        delivery_days: Number(premiumDeliveryDays),
        revisions: Number(premiumRevisions),
      },
    ];

    const { error: packageError } = await supabase
      .from("service_offer_packages")
      .insert(packageRows);

    if (packageError) {
      setErrorText(packageError.message);
      setLoading(false);
      return;
    }

    const mediaRows = [];

    if (uploadedImageUrl || imageUrl) {
      mediaRows.push({
        service_offer_id: createdOffer.id,
        seller_id: user.id,
        media_type: "image",
        media_url: uploadedImageUrl || imageUrl,
        storage_path: uploadedImagePath,
        title: "Main service image",
        display_order: 1,
        is_primary: true,
      });
    }

    for (let index = 0; index < galleryImageFiles.length; index += 1) {
      const file = galleryImageFiles[index];
      const uploadResult = await uploadServiceImage(
        file,
        `${createdOffer.id}/gallery-${index + 1}`
      );

      if (uploadResult.error) {
        setErrorText(uploadResult.error.message);
        setLoading(false);
        return;
      }

      mediaRows.push({
        service_offer_id: createdOffer.id,
        seller_id: user.id,
        media_type: "image",
        media_url: uploadResult.publicUrl,
        storage_path: uploadResult.filePath,
        title: file.name,
        display_order: index + 2,
        is_primary: false,
      });
    }

    if (videoUrl.trim()) {
      mediaRows.push({
        service_offer_id: createdOffer.id,
        seller_id: user.id,
        media_type: "video",
        media_url: videoUrl.trim(),
        storage_path: null,
        title: "Service video",
        display_order: 100,
        is_primary: false,
      });
    }

    if (mediaRows.length > 0) {
      const { error: mediaError } = await supabase
        .from("service_offer_media")
        .insert(mediaRows);

      if (mediaError) {
        setErrorText(mediaError.message);
        setLoading(false);
        return;
      }
    }

    const faqRows = faqs
      .filter((faq) => faq.question.trim() && faq.answer.trim())
      .map((faq, index) => ({
        service_offer_id: createdOffer.id,
        seller_id: user.id,
        question: faq.question.trim(),
        answer: faq.answer.trim(),
        display_order: index + 1,
      }));

    if (faqRows.length > 0) {
      const { error: faqError } = await supabase
        .from("service_offer_faqs")
        .insert(faqRows);

      if (faqError) {
        setErrorText(faqError.message);
        setLoading(false);
        return;
      }
    }

    if (loadedDraftId) {
      await supabase
        .from("service_offer_drafts")
        .delete()
        .eq("id", loadedDraftId);
    }

    setLoading(false);
    navigate("/seller-dashboard");
  }

  if (!user) {
    return (
      <main className="mx-auto max-w-3xl px-5 py-16">
        <div className="rounded-3xl border bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-bold">Login Required</h1>
          <p className="mt-3 text-muted">
            Please login as a seller before creating a Service Offer.
          </p>
          <Link
            to="/login"
            className="mt-6 inline-block rounded-full bg-primary px-6 py-3 font-semibold text-white"
          >
            Login
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-5 py-12">
      <form onSubmit={handleSubmit} className="rounded-3xl border bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-bold">Create a Service Offer</h1>
        <p className="mt-2 text-muted">
          Add your service details, packages, gallery, SEO fields, and FAQs. Your Service Offer will go live immediately after submission.
        </p>

        {profile && profile.role !== "seller" && (
          <p className="mt-6 rounded-xl bg-red-50 p-4 text-sm font-medium text-red-700">
            This account is not a seller account. Please login with a seller account.
          </p>
        )}

        {loadingDraft && (
          <p className="mt-6 rounded-xl bg-slate-50 p-4 text-sm font-medium text-slate-700">
            Loading draft...
          </p>
        )}

        {draftMessage && (
          <p className="mt-6 rounded-xl bg-green-50 p-4 text-sm font-medium text-green-700">
            {draftMessage}
          </p>
        )}

        {errorText && (
          <p className="mt-6 rounded-xl bg-red-50 p-4 text-sm font-medium text-red-700">
            {errorText}
          </p>
        )}

        <div className="mt-8 grid gap-8">
          <section className="grid gap-4">
            <h2 className="text-xl font-bold">Main Service Details</h2>

            <input
              className="rounded-xl border px-4 py-3 outline-none"
              placeholder="Service title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
            />

            <select
              className="rounded-xl border px-4 py-3 outline-none"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              required
            >
              <option value="">Select category</option>
              {pageCategories.map((categoryItem) => (
                <option key={categoryItem.name} value={categoryItem.name}>
                  {categoryItem.name}
                </option>
              ))}
            </select>

            <textarea
              className="min-h-36 rounded-xl border px-4 py-3 outline-none"
              placeholder="Describe your service clearly. Include what the buyer receives, what you need from them, and what is excluded."
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              required
            />

            <select
              className="rounded-xl border px-4 py-3 outline-none"
              value={currency}
              onChange={(event) => setCurrency(event.target.value)}
              required
            >
              <option value="USD">USD</option>
              <option value="GBP">GBP</option>
              <option value="EUR">EUR</option>
              <option value="KES">KES</option>
              <option value="CAD">CAD</option>
              <option value="AUD">AUD</option>
              <option value="ZAR">ZAR</option>
              <option value="NGN">NGN</option>
              <option value="AED">AED</option>
              <option value="INR">INR</option>
            </select>
          </section>

          <section className="grid gap-4">
            <h2 className="text-xl font-bold">Images and Video</h2>

            <div>
              <p className="mb-2 text-sm font-semibold">Main service image</p>
              <input
                className="w-full rounded-xl border bg-white px-4 py-3 outline-none"
                type="file"
                accept="image/*"
                onChange={(event) => setServiceImageFile(event.target.files?.[0] || null)}
              />
            </div>

            <input
              className="rounded-xl border px-4 py-3 outline-none"
              placeholder="Optional image URL fallback"
              value={imageUrl}
              onChange={(event) => setImageUrl(event.target.value)}
            />

            <div>
              <p className="mb-2 text-sm font-semibold">Gallery images</p>
              <input
                className="w-full rounded-xl border bg-white px-4 py-3 outline-none"
                type="file"
                accept="image/*"
                multiple
                onChange={(event) => setGalleryImageFiles(Array.from(event.target.files || []))}
              />
              <p className="mt-2 text-xs text-muted">
                Upload extra images showing samples, drawings, results, or process screenshots.
              </p>
            </div>

            <input
              className="rounded-xl border px-4 py-3 outline-none"
              placeholder="Video URL, for example YouTube, Vimeo, Loom, or portfolio video URL"
              value={videoUrl}
              onChange={(event) => setVideoUrl(event.target.value)}
            />
          </section>

          <section className="grid gap-4">
            <h2 className="text-xl font-bold">Packages</h2>

            <div className="grid gap-5 lg:grid-cols-3">
              <div className="rounded-2xl border p-5">
                <h3 className="font-bold">Basic Package</h3>
                <input className="mt-4 w-full rounded-xl border px-4 py-3 outline-none" placeholder="Package title" value={basicTitle} onChange={(event) => setBasicTitle(event.target.value)} required />
                <textarea className="mt-4 min-h-28 w-full rounded-xl border px-4 py-3 outline-none" placeholder="Package description" value={basicDescription} onChange={(event) => setBasicDescription(event.target.value)} required />
                <input className="mt-4 w-full rounded-xl border px-4 py-3 outline-none" type="number" min="5" placeholder="Price" value={basicPackagePrice} onChange={(event) => setBasicPackagePrice(event.target.value)} required />
                <input className="mt-4 w-full rounded-xl border px-4 py-3 outline-none" type="number" min="1" placeholder="Delivery days" value={basicPackageDeliveryDays} onChange={(event) => setBasicPackageDeliveryDays(event.target.value)} required />
                <input className="mt-4 w-full rounded-xl border px-4 py-3 outline-none" type="number" min="0" placeholder="Revisions" value={basicPackageRevisions} onChange={(event) => setBasicPackageRevisions(event.target.value)} required />
              </div>

              <div className="rounded-2xl border p-5">
                <h3 className="font-bold">Standard Package</h3>
                <input className="mt-4 w-full rounded-xl border px-4 py-3 outline-none" placeholder="Package title" value={standardTitle} onChange={(event) => setStandardTitle(event.target.value)} required />
                <textarea className="mt-4 min-h-28 w-full rounded-xl border px-4 py-3 outline-none" placeholder="Package description" value={standardDescription} onChange={(event) => setStandardDescription(event.target.value)} required />
                <input className="mt-4 w-full rounded-xl border px-4 py-3 outline-none" type="number" min="5" placeholder="Price" value={standardPrice} onChange={(event) => setStandardPrice(event.target.value)} required />
                <input className="mt-4 w-full rounded-xl border px-4 py-3 outline-none" type="number" min="1" placeholder="Delivery days" value={standardDeliveryDays} onChange={(event) => setStandardDeliveryDays(event.target.value)} required />
                <input className="mt-4 w-full rounded-xl border px-4 py-3 outline-none" type="number" min="0" placeholder="Revisions" value={standardRevisions} onChange={(event) => setStandardRevisions(event.target.value)} required />
              </div>

              <div className="rounded-2xl border p-5">
                <h3 className="font-bold">Premium Package</h3>
                <input className="mt-4 w-full rounded-xl border px-4 py-3 outline-none" placeholder="Package title" value={premiumTitle} onChange={(event) => setPremiumTitle(event.target.value)} required />
                <textarea className="mt-4 min-h-28 w-full rounded-xl border px-4 py-3 outline-none" placeholder="Package description" value={premiumDescription} onChange={(event) => setPremiumDescription(event.target.value)} required />
                <input className="mt-4 w-full rounded-xl border px-4 py-3 outline-none" type="number" min="5" placeholder="Price" value={premiumPrice} onChange={(event) => setPremiumPrice(event.target.value)} required />
                <input className="mt-4 w-full rounded-xl border px-4 py-3 outline-none" type="number" min="1" placeholder="Delivery days" value={premiumDeliveryDays} onChange={(event) => setPremiumDeliveryDays(event.target.value)} required />
                <input className="mt-4 w-full rounded-xl border px-4 py-3 outline-none" type="number" min="0" placeholder="Revisions" value={premiumRevisions} onChange={(event) => setPremiumRevisions(event.target.value)} required />
              </div>
            </div>
          </section>

          <section className="grid gap-4">
            <h2 className="text-xl font-bold">SEO and Search Details</h2>

            <input
              className="rounded-xl border px-4 py-3 outline-none"
              placeholder="SEO title, for example Structural Design Calculations and Permit Drawings"
              value={seoTitle}
              onChange={(event) => setSeoTitle(event.target.value)}
            />

            <textarea
              className="min-h-28 rounded-xl border px-4 py-3 outline-none"
              placeholder="Short search-friendly description of this service."
              value={seoDescription}
              onChange={(event) => setSeoDescription(event.target.value)}
            />

            <input
              className="rounded-xl border px-4 py-3 outline-none"
              placeholder="Tags, for example AutoCAD, Revit, structural calculations, permit drawings"
              value={tags}
              onChange={(event) => setTags(event.target.value)}
            />
          </section>

          <section className="grid gap-4">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl font-bold">Frequently Asked Questions</h2>

              <button
                type="button"
                onClick={addFaq}
                className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold"
              >
                Add FAQ
              </button>
            </div>

            {faqs.map((faq, index) => (
              <div key={index} className="rounded-2xl border p-5">
                <input
                  className="w-full rounded-xl border px-4 py-3 outline-none"
                  placeholder="Question"
                  value={faq.question}
                  onChange={(event) => updateFaq(index, "question", event.target.value)}
                />

                <textarea
                  className="mt-4 min-h-24 w-full rounded-xl border px-4 py-3 outline-none"
                  placeholder="Answer"
                  value={faq.answer}
                  onChange={(event) => updateFaq(index, "answer", event.target.value)}
                />

                {faqs.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeFaq(index)}
                    className="mt-4 rounded-full border border-red-200 px-4 py-2 text-sm font-semibold text-red-700"
                  >
                    Remove FAQ
                  </button>
                )}
              </div>
            ))}
          </section>

          <div className="flex flex-col gap-3 md:flex-row">
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={savingDraft || loading}
              className="rounded-full border border-slate-300 px-6 py-3 font-semibold disabled:opacity-60"
            >
              {savingDraft ? "Saving Draft..." : "Save Draft"}
            </button>

            <button
              disabled={loading || (profile && profile.role !== "seller")}
              className="rounded-full bg-primary px-6 py-3 font-semibold text-white disabled:opacity-60"
            >
              {loading ? "Submitting..." : "Submit Service Offer"}
            </button>
          </div>
        </div>
      </form>
    </main>
  );
}

function EditServicePage() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { id } = useParams();

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [pageCategories, setPageCategories] = useState(categories);
  const [description, setDescription] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [imageUrl, setImageUrl] = useState("");
  const [serviceImageFile, setServiceImageFile] = useState(null);
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [tags, setTags] = useState("");
  const [galleryImageFiles, setGalleryImageFiles] = useState([]);
  const [videoUrl, setVideoUrl] = useState("");
  const [currentMedia, setCurrentMedia] = useState([]);
  const [currentFaqs, setCurrentFaqs] = useState([]);
  const [packages, setPackages] = useState([
    { tier: "basic", title: "Basic", description: "", price: 0, delivery_days: 1, revisions: 0 },
    { tier: "standard", title: "Standard", description: "", price: 0, delivery_days: 1, revisions: 0 },
    { tier: "premium", title: "Premium", description: "", price: 0, delivery_days: 1, revisions: 0 },
  ]);
  const [faqs, setFaqs] = useState([
    { question: "", answer: "" },
    { question: "", answer: "" },
    { question: "", answer: "" },
  ]);
  const [adminReviewNote, setAdminReviewNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPageCategories() {
      const { data, error } = await supabase
        .from("marketplace_categories")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (!error && data?.length) {
        setPageCategories(data);
      }
    }

    fetchPageCategories();
  }, []);

  useEffect(() => {
    async function fetchServiceOffer() {
      if (!id) {
        setErrorText("Service ID not found.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setErrorText("");

      const { data: offerData, error: offerError } = await supabase
        .from("service_offers")
        .select("*")
        .eq("id", id)
        .single();

      if (offerError || !offerData) {
        setErrorText("Service offer not found.");
        setLoading(false);
        return;
      }

      if (!user || (offerData.seller_id !== user.id && profile?.role !== "admin")) {
        setErrorText("Access denied. You can only edit your own service offers.");
        setLoading(false);
        return;
      }

      setTitle(offerData.title || "");
      setCategory(offerData.category || "");
      setDescription(offerData.description || "");
      setCurrency(offerData.currency || "USD");
      setImageUrl(offerData.image_url || "");
      setSeoTitle(offerData.seo_title || "");
      setSeoDescription(offerData.seo_description || "");
      setTags(offerData.tags || "");
      setAdminReviewNote(offerData.admin_review_note || "");
      setVideoUrl("");

      const { data: packagesData } = await supabase
        .from("service_offer_packages")
        .select("*")
        .eq("service_offer_id", id)
        .order("tier", { ascending: true });

      if (packagesData && packagesData.length > 0) {
        setPackages(
          packagesData.map((pkg) => ({
            id: pkg.id,
            tier: pkg.tier,
            title: pkg.title,
            description: pkg.description,
            price: pkg.price,
            delivery_days: pkg.delivery_days,
            revisions: pkg.revisions,
          }))
        );
      }

      const { data: mediaData } = await supabase
        .from("service_offer_media")
        .select("*")
        .eq("service_offer_id", id)
        .order("display_order", { ascending: true });

      if (mediaData) {
        setCurrentMedia(mediaData);
        const videoMedia = mediaData.find((m) => m.media_type === "video");
        if (videoMedia) {
          setVideoUrl(videoMedia.media_url);
        }
      }

      const { data: faqsData } = await supabase
        .from("service_offer_faqs")
        .select("*")
        .eq("service_offer_id", id)
        .order("display_order", { ascending: true });

      if (faqsData && faqsData.length > 0) {
        setCurrentFaqs(faqsData);
        setFaqs(
          faqsData.map((faq) => ({
            question: faq.question,
            answer: faq.answer,
          }))
        );
      }

      setLoading(false);
    }

    if (user) {
      fetchServiceOffer();
    }
  }, [id, user, profile]);

  function updateFaq(index, field, value) {
    setFaqs((current) =>
      current.map((faq, faqIndex) =>
        faqIndex === index ? { ...faq, [field]: value } : faq
      )
    );
  }

  function addFaq() {
    setFaqs((current) => [...current, { question: "", answer: "" }]);
  }

  function removeFaq(index) {
    setFaqs((current) => current.filter((_, faqIndex) => faqIndex !== index));
  }

  function updatePackage(tier, field, value) {
    setPackages((current) =>
      current.map((pkg) =>
        pkg.tier === tier
          ? { ...pkg, [field]: field === "price" || field === "delivery_days" || field === "revisions" ? Number(value) : value }
          : pkg
      )
    );
  }

  async function handleSave(event) {
    event.preventDefault();

    if (!user) {
      navigate("/login");
      return;
    }

    if (profile && profile.role !== "seller" && profile?.role !== "admin") {
      setErrorText("Only seller accounts can edit Service Offers.");
      return;
    }

    setSaving(true);
    setErrorText("");
    setMessage("");

    let finalImageUrl = imageUrl;

    if (serviceImageFile) {
      const safeFileName = serviceImageFile.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const storagePath = `${user.id}/${id}/main-${Date.now()}-${safeFileName}`;

      const { error: uploadError } = await supabase.storage
        .from("service-images")
        .upload(storagePath, serviceImageFile);

      if (uploadError) {
        setErrorText(uploadError.message);
        setSaving(false);
        return;
      }

      const { data: publicUrlData } = supabase.storage.from("service-images").getPublicUrl(storagePath);
      finalImageUrl = publicUrlData.publicUrl;
    }

    const { error: updateError } = await supabase
      .from("service_offers")
      .update({
        title,
        category,
        description,
        currency,
        image_url: finalImageUrl || null,
        seo_title: seoTitle.trim() || null,
        seo_description: seoDescription.trim() || null,
        tags: tags.trim() || null,
        status: "approved",
      })
      .eq("id", id);

    if (updateError) {
      setErrorText(updateError.message);
      setSaving(false);
      return;
    }

    for (const pkg of packages) {
      const { error: pkgError } = await supabase.from("service_offer_packages").upsert(
        {
          id: pkg.id || undefined,
          service_offer_id: id,
          tier: pkg.tier,
          title: pkg.title,
          description: pkg.description,
          price: pkg.price,
          currency,
          delivery_days: pkg.delivery_days,
          revisions: pkg.revisions,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );

      if (pkgError) {
        setErrorText(pkgError.message);
        setSaving(false);
        return;
      }
    }

    if (galleryImageFiles.length > 0) {
      for (let index = 0; index < galleryImageFiles.length; index++) {
        const file = galleryImageFiles[index];
        const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
        const storagePath = `${user.id}/${id}/gallery-${Date.now()}-${safeFileName}`;

        const { error: uploadError } = await supabase.storage
          .from("service-images")
          .upload(storagePath, file);

        if (!uploadError) {
          const { data: publicUrlData } = supabase.storage.from("service-images").getPublicUrl(storagePath);

          const nextDisplayOrder =
            Math.max(...currentMedia.filter((m) => m.is_primary !== true).map((m) => m.display_order || 0), 1) + index + 1;

          await supabase.from("service_offer_media").insert({
            service_offer_id: id,
            seller_id: user.id,
            media_type: "image",
            media_url: publicUrlData.publicUrl,
            storage_path: storagePath,
            title: file.name,
            display_order: nextDisplayOrder,
            is_primary: false,
          });
        }
      }
    }

    if (videoUrl.trim()) {
      const existingVideo = currentMedia.find((m) => m.media_type === "video");

      if (existingVideo) {
        await supabase
          .from("service_offer_media")
          .update({
            media_url: videoUrl.trim(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingVideo.id);
      } else {
        await supabase.from("service_offer_media").insert({
          service_offer_id: id,
          seller_id: user.id,
          media_type: "video",
          media_url: videoUrl.trim(),
          storage_path: null,
          title: "Service video",
          display_order: 100,
          is_primary: false,
        });
      }
    }

    await supabase.from("service_offer_faqs").delete().eq("service_offer_id", id);

    const validFaqs = faqs.filter((faq) => faq.question.trim() && faq.answer.trim());
    if (validFaqs.length > 0) {
      const faqRows = validFaqs.map((faq, index) => ({
        service_offer_id: id,
        seller_id: user.id,
        question: faq.question.trim(),
        answer: faq.answer.trim(),
        display_order: index + 1,
      }));

      const { error: faqError } = await supabase.from("service_offer_faqs").insert(faqRows);

      if (faqError) {
        setErrorText(faqError.message);
        setSaving(false);
        return;
      }
    }

    setMessage("Service Offer updated and live immediately after saving.");
    setSaving(false);
    setTimeout(() => {
      navigate("/seller-dashboard");
    }, 1500);
  }

  if (!user) {
    return (
      <main className="mx-auto max-w-3xl px-5 py-16">
        <div className="rounded-3xl border bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-bold">Login Required</h1>
          <p className="mt-3 text-muted">Please login before editing a Service Offer.</p>
          <Link
            to="/login"
            className="mt-6 inline-block rounded-full bg-primary px-6 py-3 font-semibold text-white"
          >
            Login
          </Link>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-3xl px-5 py-16">
        <p className="text-muted">Loading service details...</p>
      </main>
    );
  }

  if (errorText.includes("Access denied")) {
    return (
      <main className="mx-auto max-w-3xl px-5 py-16">
        <div className="rounded-3xl border bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-bold">Access Denied</h1>
          <p className="mt-3 text-muted">{errorText}</p>
          <Link
            to="/seller-dashboard"
            className="mt-6 inline-block rounded-full bg-primary px-6 py-3 font-semibold text-white"
          >
            Back to Dashboard
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-5 py-12">
      <form onSubmit={handleSave} className="rounded-3xl border bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-bold">Edit Service Offer</h1>
        <p className="mt-2 text-muted">Changes will go live immediately after saving.</p>

        {adminReviewNote && (
          <div className="mb-6 mt-6 rounded-2xl bg-yellow-50 p-5 text-yellow-800">
            <p className="font-bold">Admin review note</p>
            <p className="mt-2 text-sm">{adminReviewNote}</p>
          </div>
        )}

        {profile && profile.role !== "seller" && profile?.role !== "admin" && (
          <p className="mt-6 rounded-xl bg-red-50 p-4 text-sm font-medium text-red-700">
            This account is not a seller account. Please create or login with a seller account.
          </p>
        )}

        <div className="mt-8 grid gap-4">
          <div className="rounded-2xl bg-slate-50 p-6">
            <h3 className="font-bold">Main Service Details</h3>
            <div className="mt-4 grid gap-4">
              <input
                className="rounded-xl border px-4 py-3 outline-none"
                placeholder="Service title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />

              <select
                className="rounded-xl border px-4 py-3 outline-none"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
              >
                <option value="">Select category</option>
                {pageCategories.map((cat) => (
                  <option key={cat.name} value={cat.name}>
                    {cat.name}
                  </option>
                ))}
              </select>

              <textarea
                className="min-h-36 rounded-xl border px-4 py-3 outline-none"
                placeholder="Describe your service clearly."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />

              <label className="text-sm font-semibold">
                Currency
                <select
                  className="mt-2 w-full rounded-xl border px-4 py-3 outline-none"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                >
                  <option value="USD">USD</option>
                  <option value="GBP">GBP</option>
                  <option value="EUR">EUR</option>
                  <option value="KES">KES</option>
                  <option value="CAD">CAD</option>
                  <option value="AUD">AUD</option>
                  <option value="ZAR">ZAR</option>
                  <option value="NGN">NGN</option>
                  <option value="AED">AED</option>
                  <option value="INR">INR</option>
                </select>
              </label>
            </div>
          </div>

          <div className="rounded-2xl bg-slate-100 p-6">
            <h3 className="font-bold">Main Image</h3>
            <p className="mt-1 text-sm text-muted">Current image URL: {imageUrl || "None"}</p>
            <input
              className="mt-4 w-full rounded-xl border bg-white px-4 py-3 outline-none"
              type="file"
              accept="image/*"
              onChange={(e) => setServiceImageFile(e.target.files?.[0] || null)}
            />
            {serviceImageFile && <p className="mt-2 text-sm text-slate-600">New image selected: {serviceImageFile.name}</p>}
          </div>

          <div className="rounded-2xl bg-slate-100 p-6">
            <h3 className="font-bold">Gallery Images</h3>
            {currentMedia.filter((m) => m.media_type === "image").length > 0 && (
              <div className="mt-3 text-sm text-muted">
                Current gallery: {currentMedia.filter((m) => m.media_type === "image").length} image(s)
              </div>
            )}
            <input
              className="mt-4 w-full rounded-xl border bg-white px-4 py-3 outline-none"
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => setGalleryImageFiles(Array.from(e.target.files || []))}
            />
            {galleryImageFiles.length > 0 && <p className="mt-2 text-sm text-slate-600">{galleryImageFiles.length} new image(s) to add</p>}
          </div>

          <div className="rounded-2xl bg-slate-100 p-6">
            <h3 className="font-bold">Video URL</h3>
            <input
              className="mt-4 w-full rounded-xl border bg-white px-4 py-3 outline-none"
              placeholder="YouTube, Vimeo, Loom, or portfolio video URL"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
            />
          </div>

          <div className="rounded-2xl bg-slate-100 p-6">
            <h3 className="font-bold">Packages</h3>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              {packages.map((pkg) => (
                <div key={pkg.tier} className="rounded-xl border bg-white p-4">
                  <p className="text-sm font-semibold text-slate-700">{pkg.tier.toUpperCase()}</p>
                  <input
                    className="mt-2 w-full rounded-lg border px-3 py-2 outline-none"
                    placeholder="Title"
                    value={pkg.title}
                    onChange={(e) => updatePackage(pkg.tier, "title", e.target.value)}
                  />
                  <textarea
                    className="mt-2 w-full min-h-16 rounded-lg border px-3 py-2 outline-none"
                    placeholder="Description"
                    value={pkg.description}
                    onChange={(e) => updatePackage(pkg.tier, "description", e.target.value)}
                  />
                  <input
                    className="mt-2 w-full rounded-lg border px-3 py-2 outline-none"
                    type="number"
                    placeholder="Price"
                    min="0"
                    value={pkg.price}
                    onChange={(e) => updatePackage(pkg.tier, "price", e.target.value)}
                  />
                  <input
                    className="mt-2 w-full rounded-lg border px-3 py-2 outline-none"
                    type="number"
                    placeholder="Delivery days"
                    min="1"
                    value={pkg.delivery_days}
                    onChange={(e) => updatePackage(pkg.tier, "delivery_days", e.target.value)}
                  />
                  <input
                    className="mt-2 w-full rounded-lg border px-3 py-2 outline-none"
                    type="number"
                    placeholder="Revisions"
                    min="0"
                    value={pkg.revisions}
                    onChange={(e) => updatePackage(pkg.tier, "revisions", e.target.value)}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-slate-100 p-6">
            <h3 className="font-bold">SEO and Search Details</h3>
            <div className="mt-4 grid gap-4">
              <input
                className="w-full rounded-xl border bg-white px-4 py-3 outline-none"
                placeholder="SEO Title"
                value={seoTitle}
                onChange={(e) => setSeoTitle(e.target.value)}
              />
              <textarea
                className="w-full min-h-20 rounded-xl border bg-white px-4 py-3 outline-none"
                placeholder="SEO Description"
                value={seoDescription}
                onChange={(e) => setSeoDescription(e.target.value)}
              />
              <input
                className="w-full rounded-xl border bg-white px-4 py-3 outline-none"
                placeholder="Tags (comma separated)"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
              />
            </div>
          </div>

          <div className="rounded-2xl bg-slate-100 p-6">
            <h3 className="font-bold">Frequently Asked Questions</h3>
            <div className="mt-4 grid gap-4">
              {faqs.map((faq, index) => (
                <div key={index} className="rounded-xl border bg-white p-4">
                  <input
                    className="w-full rounded-lg border px-3 py-2 outline-none"
                    placeholder="Question"
                    value={faq.question}
                    onChange={(e) => updateFaq(index, "question", e.target.value)}
                  />
                  <textarea
                    className="mt-2 w-full min-h-20 rounded-lg border px-3 py-2 outline-none"
                    placeholder="Answer"
                    value={faq.answer}
                    onChange={(e) => updateFaq(index, "answer", e.target.value)}
                  />
                  {faqs.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeFaq(index)}
                      className="mt-2 rounded-lg border border-red-300 px-3 py-2 text-sm font-semibold text-red-700"
                    >
                      Remove FAQ
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addFaq}
              className="mt-4 rounded-lg border border-primary px-4 py-2 text-sm font-semibold text-primary"
            >
              Add Another FAQ
            </button>
          </div>

          {errorText && <p className="rounded-xl bg-red-50 p-4 text-sm font-medium text-red-700">{errorText}</p>}
          {message && <p className="rounded-xl bg-green-50 p-4 text-sm font-medium text-green-700">{message}</p>}

          <button
            type="submit"
            disabled={saving || (profile && profile.role !== "seller" && profile?.role !== "admin")}
            className="rounded-full bg-primary px-6 py-3 font-semibold text-white disabled:opacity-60"
          >
            {saving ? "Saving Changes..." : "Save Changes"}
          </button>
        </div>
      </form>
    </main>
  );
}

function ProjectRequestsPage() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const [projectRequests, setProjectRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(true);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [pageCategories, setPageCategories] = useState(categories);
  const [description, setDescription] = useState("");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [deadlineDate, setDeadlineDate] = useState("");

  const [selectedRequest, setSelectedRequest] = useState(null);
  const [offerMessage, setOfferMessage] = useState("");
  const [offerPrice, setOfferPrice] = useState("");
  const [offerCurrency, setOfferCurrency] = useState("USD");
  const [offerDeliveryDays, setOfferDeliveryDays] = useState("");
  const [offerRevisions, setOfferRevisions] = useState("1");

  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [submittingOffer, setSubmittingOffer] = useState(false);
  const [message, setMessage] = useState("");
  const [errorText, setErrorText] = useState("");

  async function fetchProjectRequests() {
    setLoadingRequests(true);
    setErrorText("");

    const { data, error } = await supabase
      .from("project_requests")
      .select("*")
      .eq("status", "open")
      .order("created_at", { ascending: false });

    if (error) {
      setErrorText(error.message);
      setProjectRequests([]);
    } else {
      setProjectRequests(data || []);
    }

    setLoadingRequests(false);
  }

  useEffect(() => {
    fetchProjectRequests();
  }, []);

  useEffect(() => {
    async function fetchPageCategories() {
      const { data, error } = await supabase
        .from("marketplace_categories")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (!error && data?.length) {
        setPageCategories(data);
      }
    }

    fetchPageCategories();
  }, []);

  async function handleProjectRequestSubmit(event) {
    event.preventDefault();

    if (!user) {
      navigate("/login");
      return;
    }

    if (profile?.role === "seller") {
      setErrorText("Seller accounts can view Project Requests, but only buyers can post them.");
      return;
    }

    if (isSuspended(profile)) {
      setErrorText("Your account is suspended. This action is not allowed.");
      return;
    }

    setSubmittingRequest(true);
    setMessage("");
    setErrorText("");

    const { error } = await supabase.from("project_requests").insert({
      buyer_id: user.id,
      title,
      category,
      description,
      budget_min: budgetMin ? Number(budgetMin) : null,
      budget_max: budgetMax ? Number(budgetMax) : null,
      currency,
      deadline_date: deadlineDate || null,
      status: "open",
    });

    if (error) {
      setErrorText(error.message);
      setSubmittingRequest(false);
      return;
    }

    setTitle("");
    setCategory("");
    setDescription("");
    setBudgetMin("");
    setBudgetMax("");
    setCurrency("USD");
    setDeadlineDate("");
    setMessage("Project Request posted successfully.");

    await fetchProjectRequests();
    setSubmittingRequest(false);
  }

  function openCustomOfferForm(request) {
    if (!user) {
      navigate("/login");
      return;
    }

    if (profile?.role !== "seller" && profile?.role !== "admin") {
      setErrorText("Only seller accounts can send Custom Offers.");
      return;
    }

    setSelectedRequest(request);
    setOfferMessage("");
    setOfferPrice("");
    setOfferCurrency(request.currency || "USD");
    setOfferDeliveryDays("");
    setOfferRevisions("1");
    setMessage("");
    setErrorText("");
  }

  async function handleCustomOfferSubmit(event) {
    event.preventDefault();

    if (!user || !selectedRequest) {
      return;
    }

    if (isSuspended(profile)) {
      setErrorText("Your account is suspended. This action is not allowed.");
      return;
    }

    setSubmittingOffer(true);
    setMessage("");
    setErrorText("");

    const { error } = await supabase.from("custom_offers").insert({
      project_request_id: selectedRequest.id,
      buyer_id: selectedRequest.buyer_id,
      seller_id: user.id,
      message: offerMessage,
      price: Number(offerPrice),
      currency: offerCurrency,
      delivery_days: Number(offerDeliveryDays),
      revisions: Number(offerRevisions),
      status: "submitted",
    });

    if (error) {
      setErrorText(error.message);
      setSubmittingOffer(false);
      return;
    }

    setSelectedRequest(null);
    setOfferMessage("");
    setOfferPrice("");
    setOfferCurrency("USD");
    setOfferDeliveryDays("");
    setOfferRevisions("1");
    setMessage("Custom Offer sent successfully.");
    setSubmittingOffer(false);
  }

  const canPostRequest = user && profile?.role !== "seller";
  const canSendOffer = user && (profile?.role === "seller" || profile?.role === "admin");

  return (
    <main className="mx-auto max-w-6xl px-5 py-12">
      <div className="mb-8">
        <h1 className="text-4xl font-bold">Project Requests</h1>
        <p className="mt-3 text-muted">
          Buyers can post custom work requests, and sellers can send Custom Offers.
        </p>
      </div>

      {message && (
        <p className="mb-6 rounded-xl bg-green-50 p-4 text-sm font-medium text-green-700">
          {message}
        </p>
      )}

      {errorText && (
        <p className="mb-6 rounded-xl bg-red-50 p-4 text-sm font-medium text-red-700">
          {errorText}
        </p>
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        <section className="rounded-3xl border bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold">Post a Project Request</h2>

          {!user ? (
            <div className="mt-5 rounded-2xl bg-slate-50 p-5">
              <p className="font-semibold">Login required</p>
              <p className="mt-2 text-sm text-muted">
                Please login as a buyer before posting a Project Request.
              </p>
              <Link
                to="/login"
                className="mt-4 inline-block rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white"
              >
                Login
              </Link>
            </div>
          ) : profile?.role === "seller" ? (
            <div className="mt-5 rounded-2xl bg-slate-50 p-5">
              <p className="font-semibold">Seller view only</p>
              <p className="mt-2 text-sm text-muted">
                Sellers can view Project Requests and send Custom Offers.
              </p>
            </div>
          ) : (
            <form onSubmit={handleProjectRequestSubmit} className="mt-5 grid gap-4">
              <input
                className="rounded-xl border px-4 py-3 outline-none"
                placeholder="Project title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                required
              />

              <select
                className="rounded-xl border px-4 py-3 outline-none"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                required
              >
                <option value="">Select category</option>
                {pageCategories.map((categoryItem) => (
                  <option key={categoryItem.name} value={categoryItem.name}>
                    {categoryItem.name}
                  </option>
                ))}
              </select>

              <textarea
                className="min-h-32 rounded-xl border px-4 py-3 outline-none"
                placeholder="Describe what you need. Include location, files available, deadline, and expected deliverables."
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                required
              />

              <div className="grid gap-4 md:grid-cols-3">
                <input
                  className="rounded-xl border px-4 py-3 outline-none"
                  placeholder="Min budget"
                  type="number"
                  min="0"
                  value={budgetMin}
                  onChange={(event) => setBudgetMin(event.target.value)}
                />

                <input
                  className="rounded-xl border px-4 py-3 outline-none"
                  placeholder="Max budget"
                  type="number"
                  min="0"
                  value={budgetMax}
                  onChange={(event) => setBudgetMax(event.target.value)}
                />

                <select
                  className="rounded-xl border px-4 py-3 outline-none"
                  value={currency}
                  onChange={(event) => setCurrency(event.target.value)}
                >
                  <option value="USD">USD</option>
                  <option value="GBP">GBP</option>
                  <option value="EUR">EUR</option>
                  <option value="KES">KES</option>
                  <option value="CAD">CAD</option>
                  <option value="AUD">AUD</option>
                  <option value="ZAR">ZAR</option>
                  <option value="NGN">NGN</option>
                  <option value="AED">AED</option>
                  <option value="INR">INR</option>
                </select>
              </div>

              <input
                className="rounded-xl border px-4 py-3 outline-none"
                type="date"
                value={deadlineDate}
                onChange={(event) => setDeadlineDate(event.target.value)}
              />

              <button
                disabled={submittingRequest || !canPostRequest || isSuspended(profile)}
                className="rounded-full bg-primary px-6 py-3 font-semibold text-white disabled:opacity-60"
              >
                {submittingRequest ? "Posting..." : "Post Request"}
              </button>
            </form>
          )}
        </section>

        <section className="rounded-3xl border bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold">Open Project Requests</h2>
          <p className="mt-2 text-sm text-muted">
            Sellers can send Custom Offers directly from this list.
          </p>

          {loadingRequests ? (
            <p className="mt-6 text-muted">Loading Project Requests...</p>
          ) : projectRequests.length === 0 ? (
            <div className="mt-6 rounded-2xl bg-slate-50 p-5">
              <p className="font-semibold">No open Project Requests yet.</p>
              <p className="mt-2 text-sm text-muted">
                New buyer requests will appear here.
              </p>
            </div>
          ) : (
            <div className="mt-6 grid gap-4">
              {projectRequests.map((request) => (
                <article key={request.id} className="rounded-2xl border p-5">
                  <p className="text-xs font-semibold text-primary">
                    {request.category}
                  </p>

                  <h3 className="mt-1 text-lg font-bold">{request.title}</h3>

                  <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted">
                    {request.description}
                  </p>

                  <div className="mt-4 grid gap-2 text-sm text-slate-700">
                    <p>
                      <strong>Budget:</strong>{" "}
                      {request.budget_min || request.budget_max
                        ? `${request.currency} ${request.budget_min || "0"} - ${request.budget_max || "Open"}`
                        : "Not specified"}
                    </p>

                    <p>
                      <strong>Deadline:</strong>{" "}
                      {request.deadline_date || "Not specified"}
                    </p>

                    <p>
                      <strong>Status:</strong> {request.status}
                    </p>
                  </div>

                  {canSendOffer ? (
                    <button
                      onClick={() => openCustomOfferForm(request)}
                      disabled={isSuspended(profile)}
                      className="mt-4 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white"
                    >
                      Send Custom Offer
                    </button>
                  ) : (
                    <button
                      onClick={() => navigate("/login")}
                      className="mt-4 rounded-full border border-slate-300 px-5 py-2 text-sm font-semibold"
                    >
                      Login to Send Offer
                    </button>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-5">
          <form
            onSubmit={handleCustomOfferSubmit}
            className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-xl"
          >
            <div className="flex items-start justify-between gap-5">
              <div>
                <h2 className="text-2xl font-bold">Send Custom Offer</h2>
                <p className="mt-2 text-sm text-muted">
                  Request: {selectedRequest.title}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedRequest(null)}
                className="rounded-full border px-4 py-2 text-sm font-semibold"
              >
                Close
              </button>
            </div>

            <div className="mt-6 grid gap-4">
              <textarea
                className="min-h-32 rounded-xl border px-4 py-3 outline-none"
                placeholder="Write your message to the buyer. Explain your scope, deliverables, assumptions, and what you need to start."
                value={offerMessage}
                onChange={(event) => setOfferMessage(event.target.value)}
                required
              />

              <div className="grid gap-4 md:grid-cols-4">
                <input
                  className="rounded-xl border px-4 py-3 outline-none"
                  placeholder="Offer price"
                  type="number"
                  min="5"
                  value={offerPrice}
                  onChange={(event) => setOfferPrice(event.target.value)}
                  required
                />

                <select
                  className="rounded-xl border px-4 py-3 outline-none"
                  value={offerCurrency}
                  onChange={(event) => setOfferCurrency(event.target.value)}
                >
                  <option value="USD">USD</option>
                  <option value="GBP">GBP</option>
                  <option value="EUR">EUR</option>
                  <option value="KES">KES</option>
                  <option value="CAD">CAD</option>
                  <option value="AUD">AUD</option>
                  <option value="ZAR">ZAR</option>
                  <option value="NGN">NGN</option>
                  <option value="AED">AED</option>
                  <option value="INR">INR</option>
                </select>

                <input
                  className="rounded-xl border px-4 py-3 outline-none"
                  placeholder="Delivery days"
                  type="number"
                  min="1"
                  value={offerDeliveryDays}
                  onChange={(event) => setOfferDeliveryDays(event.target.value)}
                  required
                />

                <input
                  className="rounded-xl border px-4 py-3 outline-none"
                  placeholder="Revisions"
                  type="number"
                  min="0"
                  value={offerRevisions}
                  onChange={(event) => setOfferRevisions(event.target.value)}
                  required
                />
              </div>

              <button
                disabled={submittingOffer || isSuspended(profile)}
                className="rounded-full bg-primary px-6 py-3 font-semibold text-white disabled:opacity-60"
              >
                {submittingOffer ? "Sending..." : "Send Custom Offer"}
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}

function CheckoutPage() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-12">
      <div className="rounded-3xl border bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-bold">Checkout</h1>
        <p className="mt-2 text-muted">
          Payment integration will connect here using Stripe Connect.
        </p>

        <div className="mt-8 rounded-2xl bg-slate-50 p-5">
          <div className="flex justify-between">
            <span>Service price</span>
            <strong>$150.00</strong>
          </div>
          <div className="mt-3 flex justify-between">
            <span>Platform commission</span>
            <strong>20%</strong>
          </div>
          <div className="mt-3 flex justify-between">
            <span>Seller payout after completion</span>
            <strong>$120.00</strong>
          </div>
        </div>

        <button className="mt-6 w-full rounded-full bg-primary px-6 py-3 font-semibold text-white">
          Pay Securely
        </button>
      </div>
    </main>
  );
}
function OrderDetailsPage() {
  const { id } = useParams();
  const { user, profile } = useAuth();

  const [order, setOrder] = useState(null);
  const [loadingOrder, setLoadingOrder] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [errorText, setErrorText] = useState("");
  const [orderMessages, setOrderMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [newMessage, setNewMessage] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentNote, setPaymentNote] = useState("");
  const [selectedManualPaymentMethod, setSelectedManualPaymentMethod] = useState("Remitly to M-Pesa");
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [payoutNote, setPayoutNote] = useState("");
  const [requestingPayout, setRequestingPayout] = useState(false);
  const [orderFiles, setOrderFiles] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [existingReview, setExistingReview] = useState(null);
  const [loadingReview, setLoadingReview] = useState(true);
  const [reviewRating, setReviewRating] = useState("5");
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileType, setFileType] = useState("attachment");
  const [uploadingFile, setUploadingFile] = useState(false);
  const [orderRequirements, setOrderRequirements] = useState("");
  const [loadingRequirements, setLoadingRequirements] = useState(true);
  const [submittingRequirements, setSubmittingRequirements] = useState(false);
  const [deliveryNote, setDeliveryNote] = useState("");
  const [revisionNote, setRevisionNote] = useState("");
  const [completionNote, setCompletionNote] = useState("");
  const [orderDisputes, setOrderDisputes] = useState([]);
  const [loadingDisputes, setLoadingDisputes] = useState(true);
  const [disputeReason, setDisputeReason] = useState("other");
  const [disputeDescription, setDisputeDescription] = useState("");
  const [submittingDispute, setSubmittingDispute] = useState(false);

  async function fetchOrder() {
    if (!user) {
      setLoadingOrder(false);
      return;
    }

    setLoadingOrder(true);
    setErrorText("");

    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      setErrorText(error.message);
      setOrder(null);
    } else {
      setOrder(data);
    }

    setLoadingOrder(false);
  }

  async function fetchOrderMessages() {
    if (!user || !id) {
      setLoadingMessages(false);
      return;
    }

    setLoadingMessages(true);

    const { data, error } = await supabase
      .from("order_messages")
      .select("*")
      .eq("order_id", id)
      .order("created_at", { ascending: true });

    if (!error) {
      setOrderMessages(data || []);
    }

    setLoadingMessages(false);
  }

  async function fetchOrderFiles() {
    if (!user || !id) {
      setLoadingFiles(false);
      return;
    }

    setLoadingFiles(true);

    const { data, error } = await supabase
      .from("order_files")
      .select("*")
      .eq("order_id", id)
      .order("created_at", { ascending: false });

    if (!error) {
      setOrderFiles(data || []);
    }

    setLoadingFiles(false);
  }

  async function fetchOrderReview() {
    if (!id) {
      setLoadingReview(false);
      return;
    }

    setLoadingReview(true);

    const { data, error } = await supabase
      .from("reviews")
      .select("*")
      .eq("order_id", id)
      .maybeSingle();

    if (!error) {
      setExistingReview(data || null);
    }

    setLoadingReview(false);
  }

  async function fetchOrderRequirements() {
    if (!id) {
      setLoadingRequirements(false);
      return;
    }

    setLoadingRequirements(true);

    const { data, error } = await supabase
      .from("order_requirements")
      .select("requirements")
      .eq("order_id", id)
      .maybeSingle();

    if (!error) {
      setOrderRequirements(data?.requirements || "");
    }

    setLoadingRequirements(false);
  }

  async function fetchOrderDisputes() {
    if (!id) {
      setLoadingDisputes(false);
      return;
    }

    setLoadingDisputes(true);

    const { data, error } = await supabase
      .from("order_disputes")
      .select("*")
      .eq("order_id", id)
      .order("opened_at", { ascending: false });

    if (!error) {
      setOrderDisputes(data || []);
    }

    setLoadingDisputes(false);
  }

  async function handleSubmitRequirements(event) {
    event.preventDefault();

    if (!order || !user) return;

    if (isSuspended(profile)) {
      setErrorText("Your account is suspended. This action is not allowed.");
      return;
    }

    setSubmittingRequirements(true);
    setMessage("");
    setErrorText("");

    const requirementPayload = orderRequirements.trim();
    const { error } = await supabase.from("order_requirements").upsert({
      order_id: order.id,
      buyer_id: order.buyer_id,
      requirements: requirementPayload,
      updated_at: new Date().toISOString(),
    }, { onConflict: ["order_id"] });

    if (error) {
      setErrorText(error.message);
      setSubmittingRequirements(false);
      return;
    }

    setMessage("Order requirements saved successfully.");
    await fetchOrderRequirements();
    setSubmittingRequirements(false);
  }

  async function handleSubmitDispute(event) {
    event.preventDefault();

    if (!order || !user) return;

    if (!disputeDescription.trim()) {
      setErrorText("Please describe the dispute or cancellation request.");
      return;
    }

    setSubmittingDispute(true);
    setMessage("");
    setErrorText("");

    const { data: createdDispute, error } = await supabase
      .from("order_disputes")
      .insert({
        order_id: order.id,
        opened_by: user.id,
        buyer_id: order.buyer_id,
        seller_id: order.seller_id,
        reason: disputeReason,
        description: disputeDescription.trim(),
        status: "open",
      })
      .select()
      .single();

    if (error) {
      setErrorText(error.message);
      setSubmittingDispute(false);
      return;
    }

    await supabase
      .from("orders")
      .update({
        status: "disputed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id);

    const { data: admins } = await supabase
      .from("profiles")
      .select("id")
      .eq("role", "admin");

    for (const admin of admins || []) {
      await sendNotification({
        userId: admin.id,
        type: "dispute_opened",
        title: "Order dispute opened",
        message: "A buyer or seller opened an order dispute or cancellation request.",
        link: `/orders/${order.id}`,
      });
    }

    const otherParticipantId = user.id === order.buyer_id ? order.seller_id : order.buyer_id;

    await sendNotification({
      userId: otherParticipantId,
      type: "dispute_opened",
      title: "Dispute opened on your order",
      message: "A dispute or cancellation request was opened for this order.",
      link: `/orders/${order.id}`,
    });

    setDisputeReason("other");
    setDisputeDescription("");
    setMessage("Dispute submitted. Admin will review it.");
    await fetchOrder();
    await fetchOrderDisputes();
    setSubmittingDispute(false);
  }

  useEffect(() => {
    fetchOrder();
    fetchOrderMessages();
    fetchOrderFiles();
    fetchOrderReview();
    fetchOrderRequirements();
    fetchOrderDisputes();
  }, [id, user]);

  async function updateOrderStatus(newStatus, extraFields = {}) {
    if (!order) return false;

    setActionLoading(true);
    setMessage("");
    setErrorText("");

    const { error } = await supabase
      .from("orders")
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
        ...extraFields,
      })
      .eq("id", order.id);

    if (error) {
      setErrorText(error.message);
      setActionLoading(false);
      return false;
    }

    setMessage(`Order status updated to ${newStatus.replace("_", " ")}.`);
    setDeliveryNote("");
    setRevisionNote("");
    setCompletionNote("");
    await fetchOrder();
    setActionLoading(false);
    return true;
  }

  async function handleDeliverOrder() {
    if (!order) return;

    const success = await updateOrderStatus("delivered", {
      status: "delivered",
      delivery_note: deliveryNote.trim() || null,
      delivered_at: new Date().toISOString(),
      payout_status: "not_available",
      payout_available_at: null,
    });

    if (success) {
      await sendNotification({
        userId: order.buyer_id,
        type: "order_delivered",
        title: "Order delivered",
        message: "The seller marked your order as delivered.",
        link: `/orders/${order.id}`,
      });
    }
  }

  async function handleRequestRevision() {
    if (!order) return;

    if (!revisionNote.trim()) {
      setErrorText("Please enter a revision reason before requesting revision.");
      return;
    }

    const success = await updateOrderStatus("revision_requested", {
      revision_note: revisionNote.trim(),
      revision_requested_at: new Date().toISOString(),
    });

    if (success) {
      await sendNotification({
        userId: order.seller_id,
        type: "revision_requested",
        title: "Revision requested",
        message: "The buyer requested a revision for this order.",
        link: `/orders/${order.id}`,
      });
    }
  }

  async function handleCompleteOrder() {
    if (!order) return;

    const payoutAvailableAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const success = await updateOrderStatus("completed", {
      status: "completed",
      completion_note: completionNote.trim() || null,
      completed_at: new Date().toISOString(),
      payout_status: "waiting_period",
      payout_available_at: payoutAvailableAt,
    });

    if (success) {
      await sendNotification({
        userId: order.seller_id,
        type: "order_completed",
        title: "Order completed",
        message: "The buyer completed the order. Payout will be available 7 days after completion.",
        link: `/orders/${order.id}`,
      });
    }
  }

  async function handleSubmitReview(event) {
    event.preventDefault();

    if (!order || !user) return;

    if (isSuspended(profile)) {
      setErrorText("Your account is suspended. This action is not allowed.");
      return;
    }

    if (order.status !== "completed" || order.payment_status !== "paid") {
      setErrorText("Only completed and paid orders can be reviewed.");
      return;
    }

    setSubmittingReview(true);
    setMessage("");
    setErrorText("");

    const { error } = await supabase.from("reviews").insert({
      order_id: order.id,
      buyer_id: order.buyer_id,
      seller_id: order.seller_id,
      rating: Number(reviewRating),
      comment: reviewComment.trim() || null,
    });

    if (error) {
      setErrorText(error.message);
      setSubmittingReview(false);
      return;
    }

    setReviewRating("5");
    setReviewComment("");
    setMessage("Review submitted successfully.");
    await fetchOrderReview();
    setSubmittingReview(false);
  }

  async function handleSendMessage(event) {
    event.preventDefault();

    if (!user || !order || !newMessage.trim()) return;

    if (isSuspended(profile)) {
      setErrorText("Your account is suspended. This action is not allowed.");
      return;
    }

    setActionLoading(true);
    setMessage("");
    setErrorText("");

    const { error } = await supabase.from("order_messages").insert({
      order_id: order.id,
      sender_id: user.id,
      message: newMessage.trim(),
    });

    if (error) {
      setErrorText(error.message);
      setActionLoading(false);
      return;
    }

    setNewMessage("");
    const recipientId = user.id === order.buyer_id ? order.seller_id : order.buyer_id;

await sendNotification({
  userId: recipientId,
  type: "new_message",
  title: "New order message",
  message: "You received a new message on an order.",
  link: `/orders/${order.id}`,
});
    await fetchOrderMessages();
    setActionLoading(false);
  }

  async function handleFileUpload(event) {
    event.preventDefault();

    if (!user || !order || !selectedFile) return;

    if (isSuspended(profile)) {
      setErrorText("Your account is suspended. This action is not allowed.");
      return;
    }

    setUploadingFile(true);
    setMessage("");
    setErrorText("");

    const safeFileName = selectedFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const filePath = `${order.id}/${Date.now()}-${safeFileName}`;

    const { error: uploadError } = await supabase.storage
      .from("order-files")
      .upload(filePath, selectedFile);

    if (uploadError) {
      setErrorText(uploadError.message);
      setUploadingFile(false);
      return;
    }

    const { error: insertError } = await supabase.from("order_files").insert({
      order_id: order.id,
      uploader_id: user.id,
      file_name: selectedFile.name,
      file_path: filePath,
      file_type: fileType,
      file_size: selectedFile.size,
    });

    if (insertError) {
      setErrorText(insertError.message);
      setUploadingFile(false);
      return;
    }

    setSelectedFile(null);
    setFileType("attachment");
    setMessage("File uploaded successfully.");
    await fetchOrderFiles();
    setUploadingFile(false);
  }

  async function handleDownloadFile(filePath) {
    setErrorText("");

    const { data, error } = await supabase.storage
      .from("order-files")
      .createSignedUrl(filePath, 60);

    if (error) {
      setErrorText(error.message);
      return;
    }

    window.open(data.signedUrl, "_blank");
  }

  async function handleSubmitManualPayment(event) {
    event.preventDefault();

    if (!order || !user || !paymentReference.trim()) {
      setErrorText("Please enter the payment transaction/reference code.");
      return;
    }

    if (isSuspended(profile)) {
      setErrorText("Your account is suspended. This action is not allowed.");
      return;
    }

    setSubmittingPayment(true);
    setMessage("");
    setErrorText("");

    const { error } = await supabase
      .from("orders")
      .update({
        payment_status: "payment_submitted",
        payment_method: selectedManualPaymentMethod,
        manual_payment_reference: paymentReference.trim(),
        manual_payment_note: paymentNote.trim() || null,
        payment_rejection_reason: null,
        payment_submitted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id);

    if (error) {
      setErrorText(error.message);
      setSubmittingPayment(false);
      return;
    }
const { data: admins } = await supabase
  .from("profiles")
  .select("id")
  .eq("role", "admin");

for (const admin of admins || []) {
  await sendNotification({
    userId: admin.id,
    type: "payment_submitted",
    title: "Payment reference submitted",
    message: "A buyer submitted a payment reference for manual verification.",
    link: `/orders/${order.id}`,
  });
}
    setMessage("Payment reference submitted. Admin will verify the payment before the order becomes active.");
    setPaymentReference("");
    setPaymentNote("");
    await fetchOrder();
    setSubmittingPayment(false);
  }

  async function handleRequestPayout(event) {
    event.preventDefault();

    if (!order || !user) return;

    if (order.status !== "completed") {
      setErrorText("Only completed orders can request payout.");
      return;
    }

    if (order.payout_status !== "available") {
      setErrorText("Payout can be requested 7 days after order completion.");
      return;
    }

    if (!order.payout_available_at || new Date() < new Date(order.payout_available_at)) {
      setErrorText("Payout can be requested 7 days after order completion.");
      return;
    }

    if (isSuspended(profile)) {
      setErrorText("Your account is suspended. This action is not allowed.");
      return;
    }

    setRequestingPayout(true);
    setMessage("");
    setErrorText("");

    const { error } = await supabase
      .from("orders")
      .update({
        payout_status: "requested",
        payout_method: "Manual payout",
        payout_note: payoutNote.trim() || null,
        payout_rejection_reason: null,
        payout_requested_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id);

    if (error) {
      setErrorText(error.message);
      setRequestingPayout(false);
      return;
    }

    setPayoutNote("");
    const { data: admins } = await supabase
  .from("profiles")
  .select("id")
  .eq("role", "admin");

for (const admin of admins || []) {
  await sendNotification({
    userId: admin.id,
    type: "payout_requested",
    title: "Seller payout requested",
    message: "A seller requested payout for a completed order.",
    link: `/orders/${order.id}`,
  });
}
    setMessage("Payout request submitted. Admin will review and process the payout.");
    await fetchOrder();
    setRequestingPayout(false);
  }

  if (!user) {
    return (
      <main className="mx-auto max-w-3xl px-5 py-16">
        <div className="rounded-3xl border bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-bold">Login Required</h1>
          <p className="mt-3 text-muted">
            Please login to view this order.
          </p>
          <Link
            to="/login"
            className="mt-6 inline-block rounded-full bg-primary px-6 py-3 font-semibold text-white"
          >
            Login
          </Link>
        </div>
      </main>
    );
  }

  if (loadingOrder) {
    return (
      <main className="mx-auto max-w-5xl px-5 py-12">
        <p className="text-muted">Loading order...</p>
      </main>
    );
  }

  if (errorText || !order) {
    return (
      <main className="mx-auto max-w-3xl px-5 py-16">
        <div className="rounded-3xl border bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-bold">Order Not Available</h1>
          <p className="mt-3 text-muted">
            This order may not exist, or your account may not have access to it.
          </p>
          {errorText && (
            <p className="mt-5 rounded-xl bg-red-50 p-4 text-sm font-medium text-red-700">
              {errorText}
            </p>
          )}
        </div>
      </main>
    );
  }

  const isBuyer = user.id === order.buyer_id || profile?.role === "admin";
  const isSeller = user.id === order.seller_id || profile?.role === "admin";

  return (
    <main className="mx-auto max-w-5xl px-5 py-12">
      <div className="mb-8">
        <p className="font-semibold text-primary">Order Details</p>
        <h1 className="mt-2 text-4xl font-bold">{order.title}</h1>
        <p className="mt-3 text-muted">
          Source: {order.source.replace("_", " ")} · Status: {order.status.replace("_", " ")}
        </p>
      </div>

      {message && (
        <p className="mb-6 rounded-xl bg-green-50 p-4 text-sm font-medium text-green-700">
          {message}
        </p>
      )}

      {errorText && (
        <p className="mb-6 rounded-xl bg-red-50 p-4 text-sm font-medium text-red-700">
          {errorText}
        </p>
      )}

      <div className="grid gap-8 lg:grid-cols-3">
        <section className="lg:col-span-2 rounded-3xl border bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-bold">Order Scope</h2>

          <p className="mt-4 whitespace-pre-line leading-8 text-muted">
            {order.description || "No description was provided for this order."}
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <OrderInfoCard title="Delivery Time" value={`${order.delivery_days} days`} />
            <OrderInfoCard title="Revisions" value={order.revisions} />
            <OrderInfoCard title="Order Status" value={order.status.replace("_", " ")} />
            <OrderInfoCard title="Currency" value={order.currency} />
          </div>
        </section>

        <aside className="h-fit rounded-3xl border bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-bold">Payment Summary</h2>

          <div className="mt-5 space-y-4 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-muted">Order Price</span>
              <strong>
                {order.currency} {Number(order.price).toFixed(2)}
              </strong>
            </div>

            <div className="flex justify-between gap-4">
              <span className="text-muted">Platform Fee 20%</span>
              <strong>
                {order.currency} {Number(order.platform_fee).toFixed(2)}
              </strong>
            </div>

            <div className="flex justify-between gap-4">
              <span className="text-muted">Seller Payout</span>
              <strong>
                {order.currency} {Number(order.seller_payout).toFixed(2)}
              </strong>
            </div>
          </div>

          <div className="mt-6 rounded-2xl bg-slate-50 p-4">
            <p className="text-sm font-semibold">Current Status</p>
            <p className="mt-2 text-lg font-bold capitalize">
              {order.status.replace("_", " ")}
            </p>
          </div>

          {isBuyer && order.status === "payment_pending" && order.payment_status !== "paid" && (
            <div className="mt-6 rounded-2xl border bg-slate-50 p-5">
              <h3 className="text-lg font-bold">Manual Payment Required</h3>
              <p className="mt-2 text-sm leading-6 text-muted">
                Before work begins, please complete payment using the money transfer method you prefer. You may use Remitly or any other trusted service that can send money to Kenya or M-Pesa. After sending payment, submit the transaction/reference code below. Admin will confirm that payment has been received, then the order will become active and the seller can start work.
              </p>

              <div className="mt-4 space-y-2 text-sm">
                <p><strong>Recipient Country:</strong> Kenya</p>
                <p><strong>Recipient Name:</strong> Willy Mwangi</p>
                <p><strong>M-Pesa Number:</strong> +254742775321</p>
                <p>
                  <strong>Amount:</strong> {order.currency} {Number(order.price).toFixed(2)}
                </p>
              </div>

              <div className="mt-4 rounded-xl bg-yellow-50 p-4 text-sm text-yellow-700">
                Do not mark the order as paid yourself. The order starts only after admin confirms receipt.
              </div>

              {order.payment_status === "payment_submitted" ? (
                <div className="mt-5 rounded-xl bg-yellow-50 p-4 text-sm font-medium text-yellow-700">
                  Payment reference submitted. Waiting for admin verification.
                  {order.manual_payment_reference && (
                    <p className="mt-2">Reference: {order.manual_payment_reference}</p>
                  )}
                </div>
              ) : (
                <form onSubmit={handleSubmitManualPayment} className="mt-5 grid gap-3">
                  {order.payment_status === "payment_rejected" && (
                    <div className="rounded-xl bg-red-50 p-4 text-sm font-medium text-red-700">
                      Payment was rejected.
                      {order.payment_rejection_reason && (
                        <p className="mt-2">Reason: {order.payment_rejection_reason}</p>
                      )}
                    </div>
                  )}

                  <select
                    className="rounded-xl border bg-white px-4 py-3 outline-none"
                    value={selectedManualPaymentMethod}
                    onChange={(event) => setSelectedManualPaymentMethod(event.target.value)}
                    required
                  >
                    <option value="Remitly to M-Pesa">Remitly to M-Pesa</option>
                    <option value="WorldRemit to M-Pesa">WorldRemit to M-Pesa</option>
                    <option value="Wise to Kenya">Wise to Kenya</option>
                    <option value="Western Union to Kenya">Western Union to Kenya</option>
                    <option value="MoneyGram to Kenya">MoneyGram to Kenya</option>
                    <option value="Sendwave to Kenya">Sendwave to Kenya</option>
                    <option value="Bank transfer to Kenya">Bank transfer to Kenya</option>
                    <option value="Direct M-Pesa transfer">Direct M-Pesa transfer</option>
                    <option value="Other international transfer">Other international transfer</option>
                  </select>

                  <input
                    className="rounded-xl border bg-white px-4 py-3 outline-none"
                    placeholder="Payment transaction/reference code"
                    value={paymentReference}
                    onChange={(event) => setPaymentReference(event.target.value)}
                    required
                  />

                  <textarea
                    className="min-h-24 rounded-xl border bg-white px-4 py-3 outline-none"
                    placeholder="Optional note, sender name, payment time, or extra details"
                    value={paymentNote}
                    onChange={(event) => setPaymentNote(event.target.value)}
                  />

                  <button
                    disabled={submittingPayment}
                    className="rounded-full bg-primary px-6 py-3 font-semibold text-white disabled:opacity-60"
                  >
                    {submittingPayment ? "Submitting..." : "Submit Payment Reference"}
                  </button>
                </form>
              )}
            </div>
          )}

          {order.payment_status === "paid" && (
            <p className="mt-5 rounded-xl bg-green-50 p-4 text-sm font-medium text-green-700">
              Payment verified. This order is active.
            </p>
          )}

          {isSeller && order.status === "completed" && (
            <div className="mt-6 rounded-2xl border bg-slate-50 p-5">
              <h3 className="text-lg font-bold">Seller Payout</h3>

              <div className="mt-4 space-y-2 text-sm">
                <p>
                  <strong>Payout Amount:</strong> {order.currency} {Number(order.seller_payout).toFixed(2)}
                </p>
                <p>
                  <strong>Payout Status:</strong> {order.payout_status || "not_available"}
                </p>
                {order.payout_reference && (
                  <p>
                    <strong>Payout Reference:</strong> {order.payout_reference}
                  </p>
                )}
                {order.payout_paid_at && (
                  <p>
                    <strong>Paid At:</strong> {new Date(order.payout_paid_at).toLocaleString()}
                  </p>
                )}
              </div>

              {order.status !== "completed" && (
                <p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm font-medium text-slate-700">
                  Payout becomes available after the order is completed.
                </p>
              )}

              {order.status === "completed" && order.payout_status === "waiting_period" && order.payout_available_at && (
                <p className="mt-5 rounded-xl bg-blue-50 p-4 text-sm font-medium text-blue-700">
                  Payout available on: {new Date(order.payout_available_at).toLocaleString()}
                </p>
              )}

              {order.payout_status === "available" && (
                <form onSubmit={handleRequestPayout} className="mt-5 grid gap-3">
                  {order.payout_rejection_reason && (
                    <div className="rounded-xl bg-red-50 p-4 text-sm font-medium text-red-700">
                      Previous payout request was rejected.
                      <p className="mt-2">Reason: {order.payout_rejection_reason}</p>
                    </div>
                  )}

                  <textarea
                    className="min-h-24 rounded-xl border bg-white px-4 py-3 text-sm outline-none"
                    placeholder="Optional payout note. Add preferred payout method, account details, or any payout instructions."
                    value={payoutNote}
                    onChange={(event) => setPayoutNote(event.target.value)}
                  />

                  <button
                    disabled={requestingPayout || isSuspended(profile)}
                    className="rounded-full bg-primary px-6 py-3 font-semibold text-white disabled:opacity-60"
                  >
                    {requestingPayout ? "Submitting..." : "Request Payout"}
                  </button>
                </form>
              )}

              {order.payout_status === "requested" && (
                <p className="mt-5 rounded-xl bg-yellow-50 p-4 text-sm font-medium text-yellow-700">
                  Payout requested. Admin will process it.
                </p>
              )}

              {order.payout_status === "paid" && (
                <p className="mt-5 rounded-xl bg-green-50 p-4 text-sm font-medium text-green-700">
                  Payout paid.
                </p>
              )}
            </div>
          )}

          {isBuyer && order.status === "delivered" && order.delivered_at && (
            <div className="mt-6 rounded-2xl border bg-blue-50 p-5 text-blue-800">
              <p className="font-bold">Order Delivered - Review Period</p>
              <p className="mt-2 text-sm">
                The seller has delivered the work. You have 3 days from the delivery time to review it. You may complete the order or request a revision. If no action is taken within 3 days, the order will automatically complete.
              </p>
              <p className="mt-3 text-sm font-semibold">
                Review deadline: {new Date(new Date(order.delivered_at).getTime() + 3 * 24 * 60 * 60 * 1000).toLocaleString()}
              </p>
            </div>
          )}

          <div className="mt-6 grid gap-4">
  {isSeller && (order.status === "active" || order.status === "revision_requested") && (
    <div className="grid gap-3">
      <textarea
        className="min-h-24 rounded-xl border px-4 py-3 text-sm outline-none"
        placeholder="Add a delivery note for the buyer. Mention delivered files, assumptions, and anything the buyer should review."
        value={deliveryNote}
        onChange={(event) => setDeliveryNote(event.target.value)}
      />

      <button
        onClick={handleDeliverOrder}
        disabled={actionLoading}
        className="rounded-full bg-primary px-6 py-3 font-semibold text-white disabled:opacity-60"
      >
        {actionLoading ? "Working..." : "Mark as Delivered"}
      </button>
    </div>
  )}

  {isBuyer && order.status === "delivered" && (
    <div className="grid gap-3">
      <textarea
        className="min-h-24 rounded-xl border px-4 py-3 text-sm outline-none"
        placeholder="Optional completion note for the seller."
        value={completionNote}
        onChange={(event) => setCompletionNote(event.target.value)}
      />

      <button
        onClick={handleCompleteOrder}
        disabled={actionLoading}
        className="rounded-full bg-primary px-6 py-3 font-semibold text-white disabled:opacity-60"
      >
        {actionLoading ? "Working..." : "Accept and Complete"}
      </button>

      <textarea
        className="min-h-24 rounded-xl border px-4 py-3 text-sm outline-none"
        placeholder="Explain what needs to be revised."
        value={revisionNote}
        onChange={(event) => setRevisionNote(event.target.value)}
      />

      <button
        onClick={handleRequestRevision}
        disabled={actionLoading}
        className="rounded-full border border-slate-300 px-6 py-3 font-semibold disabled:opacity-60"
      >
        Request Revision
      </button>
    </div>
  )}

  {order.status === "completed" && (
    <p className="rounded-xl bg-green-50 p-4 text-sm font-medium text-green-700">
      This order is completed.
    </p>
  )}

  {order.status === "revision_requested" && isBuyer && (
    <p className="rounded-xl bg-yellow-50 p-4 text-sm font-medium text-yellow-700">
      Revision has been requested. The seller should review the note and deliver again.
    </p>
  )}
</div>
        </aside>
      </div>

      <div className="mt-8 rounded-3xl border bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-bold">Buyer Order Requirements</h2>
        <p className="mt-2 text-muted">
          Provide any requirements, details, or reference material that the seller needs to complete your order successfully.
        </p>

        {loadingRequirements ? (
          <p className="mt-6 text-muted">Loading buyer requirements...</p>
        ) : (
          <form onSubmit={handleSubmitRequirements} className="mt-6 grid gap-4 rounded-2xl bg-slate-50 p-5">
            <textarea
              className="min-h-36 rounded-xl border bg-white px-4 py-3 outline-none"
              placeholder="Add your order requirements here. Include files, links, examples, or any special instructions."
              value={orderRequirements}
              onChange={(event) => setOrderRequirements(event.target.value)}
            />

            <button
              disabled={submittingRequirements || isSuspended(profile)}
              className="rounded-full bg-primary px-6 py-3 font-semibold text-white disabled:opacity-60"
            >
              {submittingRequirements ? "Saving requirements..." : "Save Order Requirements"}
            </button>
          </form>
        )}
      </div>

      <div className="mt-8 rounded-3xl border bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-bold">Review and Rating</h2>
        <p className="mt-2 text-muted">
          Buyers can review the seller after the order is completed and payment is verified.
        </p>

        {loadingReview ? (
          <p className="mt-6 text-muted">Loading review...</p>
        ) : existingReview ? (
          <div className="mt-6 rounded-2xl bg-slate-50 p-5">
            <div className="flex items-center justify-between gap-4">
              <p className="text-lg font-bold">
                Rating: {existingReview.rating} / 5
              </p>
              <p className="text-sm text-slate-400">
                {new Date(existingReview.created_at).toLocaleString()}
              </p>
            </div>

            <p className="mt-4 whitespace-pre-line leading-7 text-muted">
              {existingReview.comment || "No written comment was provided."}
            </p>
          </div>
        ) : isBuyer && order.status === "completed" && order.payment_status === "paid" ? (
          <form onSubmit={handleSubmitReview} className="mt-6 grid gap-4 rounded-2xl bg-slate-50 p-5">
            <select
              className="rounded-xl border bg-white px-4 py-3 outline-none"
              value={reviewRating}
              onChange={(event) => setReviewRating(event.target.value)}
              required
            >
              <option value="5">5 stars - Excellent</option>
              <option value="4">4 stars - Very good</option>
              <option value="3">3 stars - Good</option>
              <option value="2">2 stars - Poor</option>
              <option value="1">1 star - Very poor</option>
            </select>

            <textarea
              className="min-h-28 rounded-xl border bg-white px-4 py-3 outline-none"
              placeholder="Write your review of the seller's work, communication, quality, and delivery."
              value={reviewComment}
              onChange={(event) => setReviewComment(event.target.value)}
            />

            <button
              disabled={submittingReview || isSuspended(profile)}
              className="rounded-full bg-primary px-6 py-3 font-semibold text-white disabled:opacity-60"
            >
              {submittingReview ? "Submitting..." : "Submit Review"}
            </button>
          </form>
        ) : (
          <div className="mt-6 rounded-2xl bg-slate-50 p-5">
            <p className="font-semibold">Review not available yet.</p>
            <p className="mt-2 text-sm text-muted">
              A review can be submitted after the order is completed and payment is verified.
            </p>
          </div>
        )}
      </div>

      <div className="mt-8 rounded-3xl border bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-bold">Order Files</h2>
        <p className="mt-2 text-muted">
          Upload delivery files, buyer attachments, or revision files related to this order.
        </p>

        <form onSubmit={handleFileUpload} className="mt-6 grid gap-4 rounded-2xl bg-slate-50 p-5">
          <div className="grid gap-4 md:grid-cols-3">
            <select
              className="rounded-xl border px-4 py-3 outline-none"
              value={fileType}
              onChange={(event) => setFileType(event.target.value)}
            >
              <option value="attachment">Attachment</option>
              <option value="delivery">Delivery File</option>
              <option value="revision">Revision File</option>
            </select>

            <input
              className="rounded-xl border bg-white px-4 py-3 outline-none md:col-span-2"
              type="file"
              onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
            />
          </div>

          <button
            disabled={uploadingFile || !selectedFile || isSuspended(profile)}
            className="rounded-full bg-primary px-6 py-3 font-semibold text-white disabled:opacity-60"
          >
            {uploadingFile ? "Uploading..." : "Upload File"}
          </button>
        </form>

        {loadingFiles ? (
          <p className="mt-6 text-muted">Loading files...</p>
        ) : orderFiles.length === 0 ? (
          <div className="mt-6 rounded-2xl bg-slate-50 p-5">
            <p className="font-semibold">No files uploaded yet.</p>
            <p className="mt-2 text-sm text-muted">
              Uploaded order files will appear here.
            </p>
          </div>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b bg-slate-50">
                  <th className="p-4">File</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">Size</th>
                  <th className="p-4">Uploaded</th>
                  <th className="p-4">Action</th>
                </tr>
              </thead>

              <tbody>
                {orderFiles.map((file) => (
                  <tr key={file.id} className="border-b">
                    <td className="p-4 font-semibold">{file.file_name}</td>

                    <td className="p-4 capitalize">{file.file_type}</td>

                    <td className="p-4">
                      {file.file_size
                        ? `${(Number(file.file_size) / 1024 / 1024).toFixed(2)} MB`
                        : "Unknown"}
                    </td>

                    <td className="p-4">
                      {new Date(file.created_at).toLocaleString()}
                    </td>

                    <td className="p-4">
                      <button
                        onClick={() => handleDownloadFile(file.file_path)}
                        className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white"
                      >
                        Download
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-8 rounded-3xl border bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-bold">Disputes and Cancellation Requests</h2>
        <p className="mt-2 text-muted">
          Open a dispute or cancellation request if there is a serious issue with the order.
        </p>

        {loadingDisputes ? (
          <p className="mt-6 text-muted">Loading disputes...</p>
        ) : orderDisputes.length > 0 ? (
          <div className="mt-6 grid gap-4">
            {orderDisputes.map((dispute) => (
              <div key={dispute.id} className="rounded-2xl border bg-slate-50 p-5">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <p className="font-bold capitalize">
                    {dispute.reason.replaceAll("_", " ")}
                  </p>

                  <span className="rounded-full bg-yellow-50 px-3 py-1 text-xs font-semibold text-yellow-700">
                    {dispute.status.replaceAll("_", " ")}
                  </span>
                </div>

                <p className="mt-3 whitespace-pre-line leading-7 text-muted">
                  {dispute.description}
                </p>

                {dispute.admin_decision && (
                  <div className="mt-4 rounded-xl bg-white p-4 text-sm">
                    <p className="font-semibold">Admin Decision</p>
                    <p className="mt-1 whitespace-pre-line text-muted">
                      {dispute.admin_decision}
                    </p>
                  </div>
                )}

                <p className="mt-3 text-xs text-slate-400">
                  Opened: {new Date(dispute.opened_at).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-2xl bg-slate-50 p-5">
            <p className="font-semibold">No disputes opened.</p>
            <p className="mt-2 text-sm text-muted">
              If an issue occurs, the buyer or seller can submit a dispute for admin review.
            </p>
          </div>
        )}

        {order.status !== "completed" && order.status !== "cancelled" && (
          <form onSubmit={handleSubmitDispute} className="mt-6 grid gap-4 rounded-2xl bg-slate-50 p-5">
            <h3 className="font-bold">Open a Dispute or Cancellation Request</h3>

            <select
              className="rounded-xl border bg-white px-4 py-3 outline-none"
              value={disputeReason}
              onChange={(event) => setDisputeReason(event.target.value)}
              required
            >
              <option value="buyer_requested_cancellation">Buyer requested cancellation</option>
              <option value="seller_requested_cancellation">Seller requested cancellation</option>
              <option value="late_delivery">Late delivery</option>
              <option value="quality_issue">Quality issue</option>
              <option value="scope_disagreement">Scope disagreement</option>
              <option value="payment_issue">Payment issue</option>
              <option value="other">Other</option>
            </select>

            <textarea
              className="min-h-32 rounded-xl border bg-white px-4 py-3 outline-none"
              placeholder="Explain the issue clearly. Include what happened, what you are requesting, and any evidence already uploaded."
              value={disputeDescription}
              onChange={(event) => setDisputeDescription(event.target.value)}
              required
            />

            <button
              disabled={submittingDispute}
              className="rounded-full bg-primary px-6 py-3 font-semibold text-white disabled:opacity-60"
            >
              {submittingDispute ? "Submitting..." : "Submit Dispute"}
            </button>
          </form>
        )}
      </div>

      <div className="mt-8 rounded-3xl border bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-bold">Order Conversation</h2>
        <p className="mt-2 text-muted">
          Use this area for order-related communication between buyer and seller.
        </p>

        <div className="mt-6 max-h-96 space-y-4 overflow-y-auto rounded-2xl bg-slate-50 p-4">
          {loadingMessages ? (
            <p className="text-sm text-muted">Loading messages...</p>
          ) : orderMessages.length === 0 ? (
            <p className="text-sm text-muted">No messages yet. Start the conversation below.</p>
          ) : (
            orderMessages.map((chatMessage) => {
              const isMine = chatMessage.sender_id === user.id;

              return (
                <div
                  key={chatMessage.id}
                  className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-xl rounded-2xl px-4 py-3 text-sm leading-6 ${
                      isMine
                        ? "bg-primary text-white"
                        : "border bg-white text-slate-700"
                    }`}
                  >
                    <p>{chatMessage.message}</p>
                    <p
                      className={`mt-2 text-xs ${
                        isMine ? "text-teal-50" : "text-slate-400"
                      }`}
                    >
                      {new Date(chatMessage.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <form onSubmit={handleSendMessage} className="mt-5 grid gap-3">
          <textarea
            className="min-h-28 rounded-xl border px-4 py-3 outline-none"
            placeholder="Write a message about this order..."
            value={newMessage}
            onChange={(event) => setNewMessage(event.target.value)}
            required
          />

          <button
            disabled={actionLoading || !newMessage.trim() || isSuspended(profile)}
            className="rounded-full bg-primary px-6 py-3 font-semibold text-white disabled:opacity-60"
          >
            {actionLoading ? "Sending..." : "Send Message"}
          </button>
        </form>
      </div>
    </main>
  );
}

function OrderInfoCard({ title, value }) {
  return (
    <div className="rounded-2xl border bg-slate-50 p-5">
      <p className="text-sm font-semibold text-muted">{title}</p>
      <p className="mt-2 text-xl font-bold capitalize">{value}</p>
    </div>
  );
}

function DashboardShell({ title, children }) {
  return (
    <main className="mx-auto max-w-7xl px-5 py-12">
      <h1 className="text-4xl font-bold">{title}</h1>
      <p className="mt-3 text-muted">
        Manage your marketplace activity from one place.
      </p>
      <div className="mt-8">{children}</div>
    </main>
  );
}

function Stat({ title, value }) {
  return (
    <div className="rounded-3xl border bg-white p-6 shadow-sm">
      <p className="text-sm font-semibold text-muted">{title}</p>
      <p className="mt-3 text-3xl font-bold">{value}</p>
    </div>
  );
}

function SellerProfilePage() {
  const { id } = useParams();
  const { user } = useAuth();

  const [sellerProfile, setSellerProfile] = useState(null);
  const [sellerServices, setSellerServices] = useState([]);
  const [sellerReviews, setSellerReviews] = useState([]);
  const [loadingSeller, setLoadingSeller] = useState(true);
  const [errorText, setErrorText] = useState("");

  useEffect(() => {
    async function fetchSellerProfile() {
      setLoadingSeller(true);
      setErrorText("");

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", id)
        .single();

      const { data: servicesData, error: servicesError } = await supabase
        .from("service_offers")
        .select("*")
        .eq("seller_id", id)
        .eq("status", "approved")
        .order("created_at", { ascending: false });

      const { data: reviewsData, error: reviewsError } = await supabase
        .from("reviews")
        .select("*")
        .eq("seller_id", id)
        .order("created_at", { ascending: false });

      if (profileError) {
        setErrorText(profileError.message);
        setSellerProfile(null);
      } else {
        setSellerProfile(profileData);
      }

      if (!servicesError) {
        setSellerServices(servicesData || []);
      }

      if (!reviewsError) {
        setSellerReviews(reviewsData || []);
      }

      setLoadingSeller(false);
    }

    fetchSellerProfile();
  }, [id]);

  const averageRating =
    sellerReviews.length > 0
      ? (
          sellerReviews.reduce((total, review) => total + Number(review.rating || 0), 0) /
          sellerReviews.length
        ).toFixed(1)
      : "0.0";

  const previewServices = sellerServices.slice(0, 4);

  if (loadingSeller) {
    return (
      <main className="mx-auto max-w-7xl px-5 py-12">
        <p className="text-muted">Loading seller profile...</p>
      </main>
    );
  }

  if (errorText || !sellerProfile) {
    return (
      <main className="mx-auto max-w-3xl px-5 py-16">
        <div className="rounded-3xl border bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-bold">Seller Not Found</h1>
          <p className="mt-3 text-muted">
            This seller profile is not available.
          </p>
          {errorText && (
            <p className="mt-5 rounded-xl bg-red-50 p-4 text-sm font-medium text-red-700">
              {errorText}
            </p>
          )}
          <Link
            to="/services"
            className="mt-6 inline-block rounded-full bg-primary px-6 py-3 font-semibold text-white"
          >
            Browse Services
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-5 py-12">
      <section className="rounded-3xl border bg-white p-8 shadow-sm">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="space-y-6 md:flex-1">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
              <div className="flex-shrink-0">
                {sellerProfile.profile_image_url ? (
                  <img
                    src={sellerProfile.profile_image_url}
                    alt={sellerProfile.full_name}
                    className="h-28 w-28 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-28 w-28 items-center justify-center rounded-full bg-slate-100 text-3xl font-bold text-primary">
                    {sellerProfile.full_name?.charAt(0) || "S"}
                  </div>
                )}
              </div>

              <div className="min-w-0">
                <p className="font-semibold text-primary">Seller Profile</p>
                <h1 className="mt-2 text-4xl font-bold truncate">{sellerProfile.full_name}</h1>
                {sellerProfile.headline && (
                  <p className="mt-3 text-lg font-medium text-slate-700">
                    {sellerProfile.headline}
                  </p>
                )}
                {sellerProfile.country && (
                  <p className="mt-2 text-sm text-muted">{sellerProfile.country}</p>
                )}

                <div className="mt-4 flex flex-wrap gap-3">
                  {sellerProfile.is_verified ? (
                    <span className="rounded-full bg-green-50 px-4 py-2 text-sm font-semibold text-green-700">
                      Verified Seller
                    </span>
                  ) : (
                    <span className="rounded-full bg-yellow-50 px-4 py-2 text-sm font-semibold text-yellow-700">
                      Not Verified Yet
                    </span>
                  )}

                  {sellerProfile.verification_required && !sellerProfile.is_verified && (
                    <span className="rounded-full bg-red-50 px-4 py-2 text-sm font-semibold text-red-700">
                      Verification Required
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-3xl bg-slate-50 p-5">
              <p className="text-sm leading-7 text-slate-700">
                {sellerProfile.bio?.trim()
                  ? sellerProfile.bio
                  : "This seller offers professional services through KaziHub. Review their approved services, ratings, and buyer feedback before placing an order."}
              </p>
            </div>

            <div className="grid gap-4 rounded-3xl bg-slate-50 p-5 sm:grid-cols-3">
              <div>
                <p className="text-sm font-semibold text-muted">Skills</p>
                <p className="mt-2 text-sm leading-7 text-slate-700">
                  {sellerProfile.skills || "Not specified yet."}
                </p>
              </div>

              <div>
                <p className="text-sm font-semibold text-muted">Languages</p>
                <p className="mt-2 text-sm leading-7 text-slate-700">
                  {sellerProfile.languages || "Not specified yet."}
                </p>
              </div>

              <div>
                <p className="text-sm font-semibold text-muted">Portfolio</p>
                {sellerProfile.website_url ? (
                  <a
                    href={sellerProfile.website_url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-block text-sm font-semibold text-primary"
                  >
                    Visit Portfolio
                  </a>
                ) : (
                  <p className="mt-2 text-sm leading-7 text-slate-700">No portfolio link provided.</p>
                )}
              </div>
            </div>
          </div>

          <div className="grid min-w-full gap-4 sm:grid-cols-3 md:min-w-[420px]">
            <div className="rounded-2xl bg-slate-50 p-5">
              <p className="text-sm font-semibold text-muted">Rating</p>
              <p className="mt-2 text-3xl font-bold">{averageRating} / 5</p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-5">
              <p className="text-sm font-semibold text-muted">Reviews</p>
              <p className="mt-2 text-3xl font-bold">{sellerReviews.length}</p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-5">
              <p className="text-sm font-semibold text-muted">Services</p>
              <p className="mt-2 text-3xl font-bold">{sellerServices.length}</p>
            </div>
          </div>

          <p className="mt-4 text-sm text-muted">
            This public profile shows approved services and ratings only. Buyer order details remain private.
          </p>
        </div>
      </section>

      <section className="mt-8 rounded-3xl border bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-bold">Work Preview</h2>
        <p className="mt-2 text-muted">A preview of the seller's approved service visuals with a branded watermark.</p>

        {previewServices.length === 0 ? (
          <div className="mt-6 rounded-2xl bg-slate-50 p-6">
            <p className="font-semibold">No work preview available yet.</p>
            <p className="mt-2 text-sm text-muted">Approved services will display visual previews here once published.</p>
          </div>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {previewServices.map((offer) => (
              <Link
                key={offer.id}
                to={`/services/${offer.id}`}
                className="group overflow-hidden rounded-3xl border bg-slate-100 transition hover:-translate-y-1 hover:shadow-md"
              >
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={offer.image_url || "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=900&q=80"}
                    alt={offer.title}
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                    <span className="-rotate-12 rounded-full bg-white/80 px-4 py-2 text-sm font-bold text-slate-700">
                      KaziHub Preview
                    </span>
                  </div>
                </div>
                <div className="p-4">
                  <p className="text-xs font-semibold text-primary">{offer.category}</p>
                  <h3 className="mt-2 text-sm font-bold text-slate-900">{offer.title}</h3>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="mt-8">
        <div className="mb-5">
          <h2 className="text-2xl font-bold">Approved Service Offers</h2>
          <p className="mt-2 text-muted">
            Services currently available from this seller.
          </p>
        </div>

        {sellerServices.length === 0 ? (
          <div className="rounded-3xl border bg-white p-8 shadow-sm">
            <p className="font-semibold">No approved services yet.</p>
            <p className="mt-2 text-sm text-muted">
              Approved Service Offers will appear here.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {sellerServices.map((offer) => (
              <Link
                key={offer.id}
                to={`/services/${offer.id}`}
                className="overflow-hidden rounded-3xl border bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md"
              >
                <img
                  src={
                    offer.image_url ||
                    "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=900&q=80"
                  }
                  alt={offer.title}
                  className="h-44 w-full object-cover"
                />

                <div className="p-5">
                  <p className="text-xs font-semibold text-primary">{offer.category}</p>
                  <h3 className="mt-2 min-h-12 font-bold">{offer.title}</h3>
                  <p className="mt-2 text-sm text-muted">
                    Delivery: {offer.delivery_days} days
                  </p>
                  <p className="mt-4 font-bold">
                    From {offer.currency} {Number(offer.basic_price).toFixed(2)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="mt-8 rounded-3xl border bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-bold">Buyer Reviews</h2>
        <p className="mt-2 text-muted">
          Reviews from completed paid orders.
        </p>

        {sellerReviews.length === 0 ? (
          <div className="mt-6 rounded-2xl bg-slate-50 p-6">
            <p className="font-semibold">No reviews yet.</p>
            <p className="mt-2 text-sm text-muted">
              Buyer reviews will appear here after completed orders.
            </p>
          </div>
        ) : (
          <div className="mt-6 grid gap-4">
            {sellerReviews.map((review) => (
              <article key={review.id} className="rounded-2xl border p-5">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <p className="text-lg font-bold">
                    {review.rating} / 5 stars
                  </p>

                  <p className="text-sm text-slate-400">
                    {new Date(review.created_at).toLocaleString()}
                  </p>
                </div>

                <p className="mt-3 whitespace-pre-line leading-7 text-muted">
                  {review.comment || "No written comment was provided."}
                </p>

                <p className="mt-4 text-sm font-semibold text-slate-600">
                  Review based on completed work.
                </p>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function Footer() {
  return (
    <footer className="border-t bg-white">
      <div className="mx-auto max-w-7xl px-5 py-8 text-sm text-muted">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} KaziHub. Freelance marketplace for engineering and professional services.</p>
          <div className="flex flex-wrap gap-4 text-sm">
            <Link to="/terms" className="text-slate-600 hover:text-primary">Terms</Link>
            <Link to="/privacy" className="text-slate-600 hover:text-primary">Privacy</Link>
            <Link to="/refund-policy" className="text-slate-600 hover:text-primary">Refund Policy</Link>
            <Link to="/payment-policy" className="text-slate-600 hover:text-primary">Payment Policy</Link>
            <Link to="/support" className="text-slate-600 hover:text-primary">Support</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

function TermsPage() {
  return (
    <main className="mx-auto max-w-4xl px-5 py-16">
      <div className="rounded-3xl border bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-bold">Terms of Service</h1>
        <p className="mt-4 text-muted">
          KaziHub is a marketplace that connects buyers with independent engineering service sellers. Sellers are responsible for delivering the services they offer, while buyers are responsible for providing accurate requirements and clear instructions.
        </p>

        <div className="mt-8 space-y-6 text-slate-700">
          <section>
            <h2 className="text-2xl font-semibold">Marketplace relationship</h2>
            <p className="mt-3 leading-7">
              Sellers are independent service providers. KaziHub facilitates introductions and transactions, but does not act as the seller or buyer. Each service offer represents the seller’s own scope, delivery commitments, and pricing.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold">Buyer responsibilities</h2>
            <p className="mt-3 leading-7">
              Buyers must provide accurate requirements, complete details, and any necessary files before services begin. Clear information helps sellers deliver work that matches expectations.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold">Seller responsibilities</h2>
            <p className="mt-3 leading-7">
              Sellers must deliver work according to the selected package or any agreed custom offer. If the seller and buyer agree to changes, those terms should be confirmed clearly within the order or message thread.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold">Order start and payment confirmation</h2>
            <p className="mt-3 leading-7">
              Orders begin only after admin confirms payment receipt. Until payment is verified, orders are not active and sellers should not start work.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold">Account safety and conduct</h2>
            <p className="mt-3 leading-7">
              KaziHub may suspend accounts for fraud, abuse, false information, or unsafe behavior. Users must not upload illegal, abusive, copyrighted, misleading, or harmful content.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold">Dispute review</h2>
            <p className="mt-3 leading-7">
              Disputes may be reviewed by admin and resolved according to marketplace policies. Users should provide relevant details and cooperate with support to reach a fair outcome.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold">Payouts and review</h2>
            <p className="mt-3 leading-7">
              Payouts are subject to platform review and payment waiting periods. Admin may review the order and payment history before releasing funds to the seller.
            </p>
          </section>
        </div>

        <p className="mt-10 text-sm text-slate-500">
          These policies are provided for platform use and may be updated as the marketplace grows.
        </p>
      </div>
    </main>
  );
}

function PrivacyPage() {
  return (
    <main className="mx-auto max-w-4xl px-5 py-16">
      <div className="rounded-3xl border bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-bold">Privacy Policy</h1>
        <p className="mt-4 text-muted">
          We collect information needed to operate the marketplace, manage accounts, support orders, and verify payments.
        </p>

        <div className="mt-8 space-y-6 text-slate-700">
          <section>
            <h2 className="text-2xl font-semibold">Information we collect</h2>
            <ul className="mt-3 space-y-3 pl-5 list-disc leading-7">
              <li>Name, email, and profile details.</li>
              <li>Service offer details and order information.</li>
              <li>Messages, payment references, and uploaded files.</li>
              <li>Support tickets and verification documents.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold">Why we collect information</h2>
            <p className="mt-3 leading-7">
              We use this information for account management, marketplace operations, order processing, payment verification, support, and fraud prevention.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold">Use of messages and files</h2>
            <p className="mt-3 leading-7">
              Buyer and seller messages and order files are used only for platform and order purposes. Uploaded files help sellers complete work and help admin review orders when needed.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold">Verification documents</h2>
            <p className="mt-3 leading-7">
              Verification documents are only used for admin review and to help protect the marketplace from fraud and false accounts.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold">Data storage</h2>
            <p className="mt-3 leading-7">
              Data is stored using Supabase and related platform services to support the marketplace and keep information secure.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold">Support requests</h2>
            <p className="mt-3 leading-7">
              Users can request account support through the support page. We respond to legitimate support requests in accordance with marketplace policies.
            </p>
          </section>
        </div>

        <p className="mt-10 text-sm text-slate-500">
          These policies are provided for platform use and may be updated as the marketplace grows.
        </p>
      </div>
    </main>
  );
}

function RefundPolicyPage() {
  return (
    <main className="mx-auto max-w-4xl px-5 py-16">
      <div className="rounded-3xl border bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-bold">Refund Policy</h1>
        <p className="mt-4 text-muted">
          Refunds are reviewed manually and depend on payment verification, order status, and completed work.
        </p>

        <div className="mt-8 space-y-6 text-slate-700">
          <section>
            <h2 className="text-2xl font-semibold">Payment verification</h2>
            <p className="mt-3 leading-7">
              Payments are manually verified before work starts. If payment is not confirmed, the order does not start.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold">Refund review</h2>
            <p className="mt-3 leading-7">
              Refunds are reviewed manually. They may be considered for duplicate payment, seller non-delivery, cancelled orders, or valid admin-approved disputes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold">When refunds may not apply</h2>
            <p className="mt-3 leading-7">
              Refunds may not apply when work has already been delivered according to the agreed scope. Buyers should use disputes if there is a serious issue.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold">Admin decisions</h2>
            <p className="mt-3 leading-7">
              Admin decision may be required to resolve refund requests and disputes fairly.
            </p>
          </section>
        </div>

        <p className="mt-10 text-sm text-slate-500">
          These policies are provided for platform use and may be updated as the marketplace grows.
        </p>
      </div>
    </main>
  );
}

function PaymentPolicyPage() {
  return (
    <main className="mx-auto max-w-4xl px-5 py-16">
      <div className="rounded-3xl border bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-bold">Payment Policy</h1>
        <p className="mt-4 text-muted">
          Buyers must submit payment information and wait for admin confirmation before service work begins.
        </p>

        <div className="mt-8 space-y-6 text-slate-700">
          <section>
            <h2 className="text-2xl font-semibold">Accepted payment methods</h2>
            <p className="mt-3 leading-7">
              Buyers can send payment using Remitly or another trusted service that supports transfers to Kenya or M-Pesa. Examples include Remitly, Wise, WorldRemit, Western Union, MoneyGram, Sendwave, bank transfer, direct M-Pesa, or another supported transfer method.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold">Recipient details</h2>
            <div className="mt-3 space-y-2 rounded-3xl bg-slate-50 p-4 text-slate-700">
              <p><strong>Recipient Country:</strong> Kenya</p>
              <p><strong>Recipient Name:</strong> Willy Mwangi</p>
              <p><strong>M-Pesa Number:</strong> +254742775321</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold">Payment submission</h2>
            <p className="mt-3 leading-7">
              Buyers must submit the transaction or reference code after sending payment. Admin confirms payment manually before the order starts.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold">Order activation</h2>
            <p className="mt-3 leading-7">
              Sellers should not start work until payment is verified. Orders marked payment_pending are not active yet. Work starts only after admin verifies receipt.
            </p>
          </section>
        </div>

        <p className="mt-10 text-sm text-slate-500">
          These policies are provided for platform use and may be updated as the marketplace grows.
        </p>
      </div>
    </main>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Header />
      <AccountStatusBanner />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/services" element={<ServicesPage />} />
        <Route path="/categories/:slug" element={<CategoryPage />} />
        <Route path="/services/:id" element={<ServiceDetailsPage />} />
        <Route path="/sellers/:id" element={<SellerProfilePage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/seller-dashboard" element={<SellerDashboardPage />} />
        <Route path="/buyer-dashboard" element={<BuyerDashboardPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/support" element={<SupportPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/refund-policy" element={<RefundPolicyPage />} />
        <Route path="/payment-policy" element={<PaymentPolicyPage />} />
        <Route path="/create-service" element={<CreateServicePage />} />
        <Route path="/create-service" element={<CreateServicePage />} />
        <Route path="/edit-service/:id" element={<EditServicePage />} />
        <Route path="/project-requests" element={<ProjectRequestsPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/orders/:id" element={<OrderDetailsPage />} />
        <Route path="/messages" element={<MessagesPage />} />
        <Route path="/messages/:id" element={<ConversationPage />} />
      </Routes>
      <Footer />
    </BrowserRouter>
  );
}