import { useCallback, useEffect, useRef, useState } from "react";
import { BrowserRouter, Routes, Route, Link, Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import { Search, ShieldCheck, CreditCard, Users, Star, ArrowRight, Bell, Heart, MessageCircle, ImagePlus, X, Menu, Home, LayoutDashboard, BriefcaseBusiness, UserRound, Grid2X2, LogOut, ChevronRight, Settings2 } from "lucide-react";
import { categories } from "./data/categories";
import { services } from "./data/services";
import { useAuth } from "./context/useAuth";
import { supabase } from "./lib/supabaseClient";
import PaymentSettingsPage from "./pages/PaymentSettingsPage";
import AdminReportsPage from "./pages/AdminReportsPage";
import ConversationOffersPanel from "./components/ConversationOffersPanel";
import MyOffersPage from "./pages/MyOffersPage";
import OrderMilestonesPanel from "./components/OrderMilestonesPanel";
import SellerPortfolioPage from "./pages/SellerPortfolioPage";
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

function isProfileIncomplete(profile) {
  if (!profile || profile.role === "admin") {
    return false;
  }

  const commonMissing =
    profile.profile_completed !== true ||
    !profile.full_name ||
    !profile.country ||
    !profile.headline ||
    !profile.bio ||
    !profile.languages;

  const sellerMissing =
    profile.role === "seller" &&
    (!profile.professional_title ||
      !profile.skills ||
      !profile.years_experience ||
      !profile.website_url ||
      !profile.categories ||
      !profile.seller_description);

  const buyerMissing =
    profile.role === "buyer" &&
    (!profile.buyer_type ||
      !profile.common_project_type ||
      !profile.location ||
      !profile.communication_note);

  return commonMissing || sellerMissing || buyerMissing;
}

function Header() {
  const { user, profile, signOut } = useAuth();
  const location = useLocation();
  const notificationRef = useRef(null);

  const [notifications, setNotifications] = useState([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const handleEscape = (event) => { if (event.key === "Escape") setMobileMenuOpen(false); };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [mobileMenuOpen]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  let dashboardLink = "/buyer-dashboard";

  if (profile?.role === "seller") {
    dashboardLink = "/seller-dashboard";
  }

  if (profile?.role === "admin") {
    dashboardLink = "/admin";
  }
const fetchNotifications = useCallback(async () => {
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
}, [user]);

useEffect(() => {
  function loadNotifications() {
    fetchNotifications();
  }
  loadNotifications();
}, [fetchNotifications]);

useEffect(() => {
  if (notificationsOpen) {
    const handleClickOutside = (event) => {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target)
      ) {
        setNotificationsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }

  return undefined;
}, [notificationsOpen]);

useEffect(() => {
  function closeOnNavigate() {
    setNotificationsOpen(false);
    setMobileMenuOpen(false);
  }
  closeOnNavigate();
}, [location.pathname]);

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
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-lg">
      <div className="mx-auto flex min-h-[64px] max-w-7xl items-center justify-between gap-2 px-4 py-2 sm:px-5 md:py-4">
        <Link to={profile?.role === "seller" ? "/seller-dashboard" : "/"} className="shrink-0 text-[1.45rem] font-extrabold tracking-tight text-primary">
          KaziHub
        </Link>

        <nav aria-label={profile?.role === "seller" ? "Seller workspace" : "Marketplace"} className="hidden items-center gap-4 text-sm font-medium text-slate-700 lg:flex xl:gap-5">
          {profile?.role === "seller" ? (
            <>
              <Link to="/seller-dashboard" className="hover:text-primary">Overview</Link>
              <Link to="/messages" className="inline-flex items-center gap-1 hover:text-primary"><MessageCircle size={16} /> Inbox</Link>
              <Link to="/seller-dashboard?section=services" className="hover:text-primary">My Gigs</Link>
              <Link to="/seller-dashboard?section=orders" className="hover:text-primary">Orders</Link>
              <Link to="/seller-dashboard?section=payouts" className="hover:text-primary">Earnings</Link>
              <Link to="/profile-setup" className="hover:text-primary">Profile</Link>
            </>
          ) : (
            <>
              <Link to="/services">Browse Services</Link>
              <Link to="/categories">Categories</Link>
              <Link to="/project-requests">Project Requests</Link>
              <Link to="/messages" className="inline-flex items-center gap-1"><MessageCircle size={16} /> Messages</Link>
              <Link to="/support">Support</Link>
              {user && <Link to="/profile-setup">Profile</Link>}
              {profile?.role === "admin" && <><Link to="/admin">Admin</Link><Link to="/admin/activity">Activity</Link><Link to="/admin/reports">Reports</Link></>}
            </>
          )}
        </nav>
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
          {user ? (
            <>
            <div ref={notificationRef} className="relative">
  <button
    onClick={() => {
      setNotificationsOpen((current) => !current);
      fetchNotifications();
    }}
    className="relative flex min-h-11 min-w-11 items-center justify-center rounded-full bg-slate-100 text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    aria-label="Notifications"
    aria-expanded={notificationsOpen}
    aria-haspopup="true"
  >
    <Bell size={18} />

    {unreadNotificationCount > 0 && (
      <span className="absolute -right-1 -top-1 rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
        {unreadNotificationCount}
      </span>
    )}
  </button>

  {notificationsOpen && (
    <div className="absolute right-0 mt-3 w-[min(20rem,calc(100vw-1.5rem))] max-h-[70dvh] overflow-y-auto rounded-2xl border bg-white shadow-xl">
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
              <Link to={dashboardLink} className="hidden text-sm font-semibold text-slate-700 md:inline-flex">
                Dashboard
              </Link>

              <button
                onClick={handleLogout}
                className="hidden min-h-11 rounded-full bg-slate-100 px-5 py-2 text-sm font-semibold text-slate-700 md:inline-flex md:items-center"
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
                className="inline-flex min-h-11 items-center rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white sm:px-5"
              >
                Join
              </Link>
            </>
          )}
          <button type="button" onClick={() => setMobileMenuOpen((open) => !open)}
            aria-expanded={mobileMenuOpen} aria-controls="mobile-site-menu"
            aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            className="flex min-h-11 min-w-11 items-center justify-center rounded-xl text-slate-700 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary lg:hidden">
            {mobileMenuOpen ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
          </button>
        </div>
      </div>
      {mobileMenuOpen && (
        <nav id="mobile-site-menu" aria-label="Mobile navigation" className="max-h-[min(70dvh,38rem)] overflow-y-auto border-t bg-white px-4 py-3 shadow-lg lg:hidden">
          <div className="mx-auto grid max-w-xl gap-1">
            {(profile?.role === "seller" ? [
              ["/seller-dashboard", "Overview"], ["/messages", "Inbox"],
              ["/seller-dashboard?section=services", "My gigs"],
              ["/seller-dashboard?section=orders", "Orders"], ["/offers", "Sent offers"],
              ["/seller-dashboard?section=payouts", "Earnings"],
              ["/seller-dashboard?section=analytics", "Analytics"],
              ["/profile-setup", "My profile"], ["/portfolio", "My portfolio"], ["/payment-settings", "Payments & verification"], ["/support", "Support"],
            ] : profile?.role === "admin" ? [
              ["/admin", "Admin dashboard"], ["/admin/activity", "Activity log"], ["/admin/reports", "Abuse reports"],
              ["/messages", "Messages"], ["/services", "Browse services"],
              ["/profile-setup", "My profile"], ["/payment-settings", "Payments & verification"], ["/support", "Support"],
            ] : [
              ["/", "Home"], ["/services", "Browse services"], ["/categories", "Categories"],
              ["/project-requests", "Project requests"], ["/messages", "Messages"],
              ...(user ? [["/buyer-dashboard", "My dashboard"], ["/offers", "Compare offers"], ["/profile-setup", "My profile"], ["/payment-settings", "Payments & verification"]] : [["/login", "Sign in"], ["/signup", "Join KaziHub"]]),
              ["/support", "Support"],
            ]).map(([href, label]) => (
              <Link key={href} to={href} onClick={() => setMobileMenuOpen(false)}
                className="flex min-h-12 items-center justify-between rounded-xl px-3 py-2 font-medium text-slate-700 hover:bg-teal-50 hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
                {label}<ChevronRight size={17} aria-hidden="true" />
              </Link>
            ))}
            {user && <button type="button" onClick={handleLogout}
              className="mt-2 flex min-h-12 items-center gap-3 rounded-xl border-t px-3 text-left font-medium text-slate-600">
              <LogOut size={18} aria-hidden="true"/> Sign out
            </button>}
          </div>
        </nav>
      )}
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
  const navigate = useNavigate();
  const [homeSearch, setHomeSearch] = useState("");
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
              Find talent in every field
            </p>

            <h1 className="text-4xl font-bold tracking-tight text-dark md:text-6xl">
              Hire trusted experts for any professional service.
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-8 text-muted">
              Discover services from independent professionals in AI, technology, design,
              marketing, writing, business, engineering, education, and more.
              Explore a gig or post a custom project request.
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
              <form onSubmit={(event) => {
                event.preventDefault();
                navigate(`/services?q=${encodeURIComponent(homeSearch.trim())}`);
              }} className="flex items-center gap-3 rounded-2xl border p-4">
                <Search className="text-primary" />
                <input
                  className="w-full outline-none"
                  aria-label="Search marketplace services"
                  placeholder="Search AI agents, graphic design, marketing, websites..."
                  value={homeSearch}
                  onChange={(event) => setHomeSearch(event.target.value)}
                />
                <button type="submit" className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white">Search</button>
              </form>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {services.map((service) => (
                  <div key={service.id} className="rounded-2xl border bg-white p-4">
                    <img
                      src={service.image}
                      alt={service.title}
                      loading="lazy"
                      decoding="async"
                      width="452"
                      height="128"
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
            text="Sellers can publish complete gigs directly. Contact a seller before ordering."
          />
          <FeatureCard
            icon={<CreditCard />}
            title="Payments from day one"
            text="Choose a service, submit a payment reference and await KaziHub verification before work begins."
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
              Explore AI, programming, creative work, business, marketing, writing, engineering and more.
            </p>
          </div>
          <Link to="/categories" className="hidden font-semibold text-primary md:block">
            View all
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...pageCategories].sort((a,b) => {
            const featured = ["AI Services","AI Agents & Workflow Automation","AI Chatbots & Assistants","Programming & Tech","Graphics & Design","Digital Marketing","Writing & Translation","Business","Video & Animation","Engineering & Architecture","Music & Audio","Education & Tutoring"];
            const x = featured.indexOf(a.name);
            const y = featured.indexOf(b.name);
            return (x < 0 ? 100 + (a.display_order || 0) : x) - (y < 0 ? 100 + (b.display_order || 0) : y);
          }).slice(0, 12).map((category) => (
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
  const location = useLocation();
  const [approvedOffers, setApprovedOffers] = useState([]);
  const [loadingOffers, setLoadingOffers] = useState(true);
  const [errorText, setErrorText] = useState("");
  const [searchTerm, setSearchTerm] = useState(() => new URLSearchParams(window.location.search).get("q") || "");
  const [selectedCategory, setSelectedCategory] = useState("All categories");
  const [pageCategories, setPageCategories] = useState(categories);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [maxDeliveryDays, setMaxDeliveryDays] = useState("");
  const [sortBy, setSortBy] = useState("recommended");

  useEffect(() => {
    setSearchTerm(new URLSearchParams(location.search).get("q") || "");
  }, [location.search]);
  const [savedServiceIds, setSavedServiceIds] = useState([]);

  const fetchSavedServices = useCallback(async () => {
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
  }, [user]);

  useEffect(() => {
    function loadSavedServices() {
      fetchSavedServices();
    }
    loadSavedServices();
  }, [fetchSavedServices]);

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
          Find services from independent professionals across AI, technology, design, marketing, business, engineering and more.
        </p>
      </div>

      <div className="mb-8 grid gap-4 rounded-3xl border bg-white p-5 md:grid-cols-4">
        <input
          className="rounded-xl border px-4 py-3 outline-none md:col-span-2"
          placeholder="Search services..."
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
        aria-label="Search services" />

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
        aria-label="Min price" />

        <input
          className="rounded-xl border px-4 py-3 outline-none"
          type="number"
          min="0"
          placeholder="Max price"
          value={maxPrice}
          onChange={(event) => setMaxPrice(event.target.value)}
        aria-label="Max price" />

        <input
          className="rounded-xl border px-4 py-3 outline-none"
          type="number"
          min="0"
          placeholder="Max delivery days"
          value={maxDeliveryDays}
          onChange={(event) => setMaxDeliveryDays(event.target.value)}
        aria-label="Max delivery days" />

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

function AllCategoriesPage() {
  const [items, setItems] = useState(categories);
  const [search, setSearch] = useState("");
  useEffect(() => {
    let active = true;
    async function load() {
      const {data,error} = await supabase.from("marketplace_categories")
        .select("name,slug,description,display_order,is_active")
        .eq("is_active",true).order("display_order",{ascending:true});
      if (active && !error && data?.length) setItems(data);
    }
    load();
    return () => { active = false; };
  }, []);
  const ai = items.filter((item) => /(^AI\b|\bAI\b|prompt engineering)/i.test(item.name));
  const other = items.filter((item) => !ai.includes(item));
  const match = (item) => [item.name,item.description].some((x) => x?.toLowerCase().includes(search.toLowerCase()));
  const renderCategory = (item) => (
    <Link key={item.slug || slugify(item.name)} to={`/categories/${item.slug || slugify(item.name)}`}
      className="block rounded-2xl border bg-white p-5 transition hover:border-primary hover:shadow-sm">
      <h3 className="font-bold text-slate-900">{item.name}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
    </Link>
  );
  return (
    <main className="mx-auto max-w-7xl px-5 py-12">
      <h1 className="text-4xl font-bold">Explore all service categories</h1>
      <p className="mt-3 text-muted">KaziHub connects buyers and freelancers across many industries and skills.</p>
      <input className="mt-7 w-full rounded-xl border bg-white px-4 py-3"
        value={search} onChange={(event) => setSearch(event.target.value)}
        placeholder="Search categories, e.g. AI chatbot, logo design, SEO, coding..."
        aria-label="Search service categories" />
      {ai.some(match) && (
        <section className="mt-10">
          <h2 className="mb-5 text-2xl font-bold">Artificial Intelligence & AI Services</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{ai.filter(match).map(renderCategory)}</div>
        </section>
      )}
      {other.some(match) && (
        <section className="mt-10">
          <h2 className="mb-5 text-2xl font-bold">All other services</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{other.filter(match).map(renderCategory)}</div>
        </section>
      )}
      {!items.some(match) && <p className="mt-10 text-muted">No matching categories. Try a different search.</p>}
    </main>
  );
}

function CategoryPage() {
  const { slug } = useParams();
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
    const platformFee = Math.round(price * 20) / 100;
    const sellerPayout = Math.round((price - platformFee) * 100) / 100;

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

  const fetchOffer = useCallback(async () => {
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

    supabase
      .from("service_offer_views")
      .insert({ service_offer_id: id })
      .then(() => {})
      .catch(() => {});

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
      .select("id, rating, comment, created_at")
      .eq("service_offer_id", id)
      .order("created_at", { ascending: false });

    setServiceReviews(!reviewError && reviewData ? reviewData : []);
    setLoadingReviews(false);
    setLoadingOffer(false);
  }, [id]);

  const fetchIsServiceSaved = useCallback(async () => {
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
  }, [user, id]);

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
    function loadOffer() {
      if (id) {
        fetchOffer();
      }
    }
    loadOffer();
  }, [id, fetchOffer]);

  useEffect(() => {
    function loadIsServiceSaved() {
      fetchIsServiceSaved();
    }
    loadIsServiceSaved();
  }, [fetchIsServiceSaved]);

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
              onClick={handleContactSeller}
              disabled={contactLoading || isSuspended(profile)}
              className="mt-6 w-full rounded-full bg-primary px-6 py-3 font-semibold text-white disabled:opacity-60"
            >
              {contactLoading ? "Opening Inbox..." : "Message Seller"}
            </button>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Ask questions, send project requirements, and agree on scope with the seller before ordering.
            </p>

            <button
              type="button"
              onClick={handleBuySelectedPackage}
              disabled={creatingOrder || isSuspended(profile)}
              className="mt-4 w-full rounded-full border border-primary bg-white px-6 py-3 text-center font-semibold text-primary disabled:opacity-60"
            >
              {creatingOrder ? "Creating Order..." : "Order This Package"}
            </button>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              Placing an order creates a payment-pending record. Choose a manual transfer or cryptocurrency option on the order page. Work begins only after KaziHub verifies the payment.
            </p>

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
  const [signupPhone, setSignupPhone] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [errorText, setErrorText] = useState("");

  async function signInWithGoogle() {
    setErrorText("");
    // Preserve the selected buyer/seller role through the Google redirect.
    window.localStorage.setItem("kazihub_signup_role", role);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/dashboard-redirect`,
      },
    });

    if (error) {
      setErrorText(error.message);
    }
  }

  async function signInWithApple() {
    setErrorText("");

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "apple",
      options: {
        redirectTo: `${window.location.origin}/dashboard-redirect`,
      },
    });

    if (error) {
      setErrorText(error.message);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!/^\+[1-9]\d{7,14}$/.test(signupPhone.trim())) {
      setErrorText("Enter a valid phone number with country code, for example +254712345678.");
      return;
    }
    sessionStorage.setItem("kazihub_signup_phone", signupPhone.trim());
    setLoading(true);
    setMessage("");
    setErrorText("");

    try {
      const result = await signUp({
        fullName,
        email,
        password,
        role,
      });

      if (result.session) {
        navigate("/payment-settings");
      } else {
        setMessage("Account created. Check your email for a confirmation link, then sign in and visit Payments & verification to confirm your phone by SMS.");
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
        <h1 className="text-3xl font-bold">Create your KaziHub account</h1>
        <p className="mt-2 text-muted">Sign up securely with email or continue with Google or Apple.</p>

        <div className="mt-8 grid gap-3">
          <button
            type="button"
            onClick={signInWithGoogle}
            className="rounded-full border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:border-slate-400"
          >
            Continue with Google
          </button>

          <button
            type="button"
            onClick={signInWithApple}
            className="rounded-full border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:border-slate-400"
          >
            Continue with Apple
          </button>
        </div>

        <div className="mt-6 flex items-center gap-3 text-sm text-slate-500">
          <span className="h-px flex-1 bg-slate-200" />
          <span>or sign up with email</span>
          <span className="h-px flex-1 bg-slate-200" />
        </div>

        <div className="mt-6 grid gap-4">
          <div className="grid gap-2 rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <span className="text-sm font-semibold text-slate-700">Role</span>
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setRole("buyer")}
                className={`rounded-2xl border p-4 text-left ${
                  role === "buyer" ? "border-primary bg-primary/10" : "border-slate-200 bg-white"
                }`}
              >
                <h2 className="text-base font-semibold">Buyer</h2>
                <p className="mt-1 text-sm text-slate-600">Hire sellers, submit orders, and manage deliveries.</p>
              </button>
              <button
                type="button"
                onClick={() => setRole("seller")}
                className={`rounded-2xl border p-4 text-left ${
                  role === "seller" ? "border-primary bg-primary/10" : "border-slate-200 bg-white"
                }`}
              >
                <h2 className="text-base font-semibold">Seller</h2>
                <p className="mt-1 text-sm text-slate-600">Sell services, manage orders, and grow your business.</p>
              </button>
            </div>
          </div>

          <input
            className="rounded-xl border px-4 py-3 outline-none"
            placeholder="Full name"
            type="text"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            required
            autoComplete="name"
          aria-label="Full name" />

          <input
            className="rounded-xl border px-4 py-3 outline-none"
            placeholder="Email address"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            autoComplete="email"
          aria-label="Email address" />

          <input
            className="rounded-xl border px-4 py-3 outline-none"
            placeholder="Password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={6}
            autoComplete="new-password"
          aria-label="Password" />

          <label className="grid gap-2 text-sm font-semibold text-slate-700">Mobile number (required)
            <input type="tel" inputMode="tel" autoComplete="tel" required value={signupPhone}
              onChange={event=>setSignupPhone(event.target.value)} placeholder="+254712345678"
              className="min-h-11 w-full rounded-xl border px-4 py-3 text-base" />
          </label>
          <p className="text-xs text-slate-600">Phone ownership is verified by SMS after sign-in. Your account email must be confirmed first when email confirmation is enabled. SMS verification requires the provider to be configured.</p>

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

          <p className="text-xs leading-5 text-slate-500">
            Use Google Password Manager or your browser’s password manager to save your password securely.
          </p>
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

  async function signInWithGoogle() {
    setErrorText("");

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/dashboard-redirect`,
      },
    });

    if (error) {
      setErrorText(error.message);
    }
  }

  async function signInWithApple() {
    setErrorText("");

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "apple",
      options: {
        redirectTo: `${window.location.origin}/dashboard-redirect`,
      },
    });

    if (error) {
      setErrorText(error.message);
    }
  }

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

        <div className="mt-8 grid gap-3">
          <button
            type="button"
            onClick={signInWithGoogle}
            className="rounded-full border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:border-slate-400"
          >
            Continue with Google
          </button>

          <button
            type="button"
            onClick={signInWithApple}
            className="rounded-full border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:border-slate-400"
          >
            Continue with Apple
          </button>
        </div>

        <div className="mt-6 flex items-center gap-3 text-sm text-slate-500">
          <span className="h-px flex-1 bg-slate-200" />
          <span>or sign in with email</span>
          <span className="h-px flex-1 bg-slate-200" />
        </div>

        <div className="mt-6 grid gap-4">
          <input
            className="rounded-xl border px-4 py-3 outline-none"
            placeholder="Email address"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            autoComplete="email"
          aria-label="Email address" />

          <input
            className="rounded-xl border px-4 py-3 outline-none"
            placeholder="Password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            autoComplete="current-password"
          aria-label="Password" />

          <div className="flex items-center justify-between text-sm text-slate-600">
            <p className="text-xs text-slate-500">
              Use Google Password Manager or your browser’s password manager to save your password securely.
            </p>
            <Link to="/forgot-password" className="font-semibold text-primary">
              Forgot Password?
            </Link>
          </div>

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

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [errorText, setErrorText] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();

    setLoading(true);
    setMessage("");
    setErrorText("");

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      setErrorText(error.message);
    } else {
      setMessage("Check your email for a password reset link.");
    }

    setLoading(false);
  }

  return (
    <main className="mx-auto max-w-md px-5 py-16">
      <form onSubmit={handleSubmit} className="rounded-3xl border bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-bold">Forgot Password</h1>
        <p className="mt-2 text-muted">Enter your email and we’ll send a password reset link.</p>

        <div className="mt-8 grid gap-4">
          <input
            className="rounded-xl border px-4 py-3 outline-none"
            placeholder="Email address"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            autoComplete="email"
          aria-label="Email address" />

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
            {loading ? "Sending link..." : "Send Reset Link"}
          </button>
        </div>
      </form>
    </main>
  );
}

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [errorText, setErrorText] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();

    setLoading(true);
    setMessage("");
    setErrorText("");

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setErrorText(error.message);
    } else {
      setMessage("Your password has been updated. You can now log in.");
    }

    setLoading(false);
  }

  return (
    <main className="mx-auto max-w-md px-5 py-16">
      <form onSubmit={handleSubmit} className="rounded-3xl border bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-bold">Reset Password</h1>
        <p className="mt-2 text-muted">Enter a new password to finish resetting your account.</p>

        <div className="mt-8 grid gap-4">
          <input
            className="rounded-xl border px-4 py-3 outline-none"
            placeholder="New password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={6}
            autoComplete="new-password"
          aria-label="New password" />

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
            {loading ? "Updating password..." : "Update Password"}
          </button>

          <button
            type="button"
            onClick={() => navigate("/login")}
            className="rounded-full border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-700"
          >
            Back to Login
          </button>
        </div>
      </form>
    </main>
  );
}

function DashboardRedirectPage() {
  const navigate = useNavigate();
  const [errorText, setErrorText] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function redirect() {
      const urlParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const oauthError = urlParams.get("error_description") || hashParams.get("error_description")
        || urlParams.get("error") || hashParams.get("error");
      if (oauthError) {
        setErrorText(oauthError);
        return;
      }

      // Supabase initializes the OAuth session from the callback URL.
      const { data, error } = await supabase.auth.getSession();
      if (cancelled) return;
      if (error) {
        setErrorText(error.message);
        return;
      }

      const user = data.session?.user;
      if (!user) {
        setErrorText("No active session was returned after sign-in. Please try again.");
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (profileError) {
        setErrorText(`Could not load your profile: ${profileError.message}`);
        return;
      }
      if (!profileData) {
        setErrorText("Your sign-in succeeded, but a KaziHub profile was not created. Contact support.");
        return;
      }

      const requestedRole = window.localStorage.getItem("kazihub_signup_role");
      window.localStorage.removeItem("kazihub_signup_role");
      if (requestedRole === "seller" && profileData.role === "buyer" && profileData.profile_completed !== true) {
        const { error: roleError } = await supabase.from("profiles")
          .update({ role: "seller" }).eq("id", user.id);
        if (cancelled) return;
        if (roleError) {
          setErrorText(`Your Google account was created, but the seller role could not be assigned: ${roleError.message}`);
          return;
        }
        profileData.role = "seller";
      }

      if (profileData.role === "admin") {
        navigate("/admin", { replace: true });
      } else if (isProfileIncomplete(profileData)) {
        navigate("/profile-setup", { replace: true });
      } else if (profileData.role === "seller") {
        navigate("/seller-dashboard", { replace: true });
      } else {
        navigate("/buyer-dashboard", { replace: true });
      }
    }

    redirect();
    return () => { cancelled = true; };
  }, [navigate]);

  return (
    <main className="mx-auto max-w-md px-5 py-16">
      <div className="rounded-3xl border bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-bold">Redirecting...</h1>
        <p className="mt-4 text-slate-600">
          We are checking your account and sending you to the right dashboard.
        </p>
        {errorText && (
          <p className="mt-6 rounded-xl bg-red-50 p-4 text-sm font-medium text-red-700">
            {errorText}
          </p>
        )}
      </div>
    </main>
  );
}

function ProfileSetupPage() {
  const navigate = useNavigate();
  const draftReady = useRef(false);
  const draftCache = useRef({});
  const { user, profile, loading, refreshProfile } = useAuth();

  const [profileData, setProfileData] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [fullName, setFullName] = useState("");
  const [country, setCountry] = useState("");
  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [languages, setLanguages] = useState("");
  const [profileImageFile, setProfileImageFile] = useState(null);
  const [previewImageUrl, setPreviewImageUrl] = useState("");

  const [professionalTitle, setProfessionalTitle] = useState("");
  const [skills, setSkills] = useState("");
  const [yearsExperience, setYearsExperience] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [categories, setCategories] = useState("");
  const [sellerDescription, setSellerDescription] = useState("");

  const [buyerType, setBuyerType] = useState("");
  const [commonProjectType, setCommonProjectType] = useState("");
  const [location, setLocation] = useState("");
  const [communicationNote, setCommunicationNote] = useState("");

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [errorText, setErrorText] = useState("");

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [loading, user, navigate]);

  function saveDraftField(field, value, setter) {
    setter(value);
    if (!user) return;
    draftCache.current = { ...draftCache.current, [field]: value };
    try {
      // Persist immediately on each keystroke. Effects can be skipped when
      // Chrome discards a background tab before React flushes.
      localStorage.setItem(`kazihub-profile-draft:${user.id}`, JSON.stringify(draftCache.current));
    } catch (error) {
      console.warn("Could not preserve profile draft", error);
    }
  }

  useEffect(() => {
    async function loadProfile() {
      if (!user) return;

      setLoadingProfile(true);
      setErrorText("");

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) {
        setErrorText(error.message);
        setLoadingProfile(false);
        return;
      }

      setProfileData(data);
      setFullName(data?.full_name || "");
      setCountry(data?.country || "");
      setHeadline(data?.headline || "");
      setBio(data?.bio || "");
      setLanguages(data?.languages || "");
      setPreviewImageUrl(data?.profile_image_url || "");

      setProfessionalTitle(data?.professional_title || "");
      setSkills(data?.skills || "");
      setYearsExperience(data?.years_experience || "");
      setWebsiteUrl(data?.website_url || "");
      setCategories(data?.categories || "");
      setSellerDescription(data?.seller_description || "");

      setBuyerType(data?.buyer_type || "");
      setCommonProjectType(data?.common_project_type || "");
      setLocation(data?.location || "");
      setCommunicationNote(data?.communication_note || "");

      // The browser may discard a background tab. Restore unsaved text after
      // the server profile loads, without overwriting already-saved data.
      try {
        const key = `kazihub-profile-draft:${user.id}`;
        const stored = localStorage.getItem(key) || sessionStorage.getItem(key);
        if (stored) {
          const draft = JSON.parse(stored);
          const setters = {
            fullName:setFullName, country:setCountry, headline:setHeadline,
            bio:setBio, languages:setLanguages, professionalTitle:setProfessionalTitle,
            skills:setSkills, yearsExperience:setYearsExperience,
            websiteUrl:setWebsiteUrl, categories:setCategories,
            sellerDescription:setSellerDescription, buyerType:setBuyerType,
            commonProjectType:setCommonProjectType, location:setLocation,
            communicationNote:setCommunicationNote,
          };
          draftCache.current = Object.fromEntries(
            Object.entries(draft).filter(([,value]) => typeof value === "string")
          );
          Object.entries(setters).forEach(([key,setter]) => {
            if (typeof draft[key] === "string") setter(draft[key]);
          });
        }
      } catch (error) {
        console.warn("Unable to restore profile draft", error);
      }
      draftReady.current = true;
      setLoadingProfile(false);
    }

    loadProfile();
  }, [user?.id]);

  function handleProfileImageChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setProfileImageFile(file);
    setPreviewImageUrl(URL.createObjectURL(file));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!user) return;

    setSaving(true);
    setErrorText("");
    setMessage("");

    let profileImageUrl = profileData?.profile_image_url || null;

    if (profileImageFile) {
      const safeFileName = profileImageFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const filePath = `${user.id}/${Date.now()}-${safeFileName}`;

      const { error: uploadError } = await supabase.storage
        .from("profile-images")
        .upload(filePath, profileImageFile);

      if (uploadError) {
        setErrorText(uploadError.message);
        setSaving(false);
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from("profile-images")
        .getPublicUrl(filePath);

      profileImageUrl = publicUrlData.publicUrl;
    }

    const payload = {
      full_name: fullName.trim() || null,
      profile_image_url: profileImageUrl,
      country: country.trim() || null,
      headline: headline.trim() || null,
      bio: bio.trim() || null,
      languages: languages.trim() || null,
      professional_title: professionalTitle.trim() || null,
      skills: skills.trim() || null,
      years_experience: yearsExperience.trim() || null,
      website_url: websiteUrl.trim() || null,
      categories: categories.trim() || null,
      seller_description: sellerDescription.trim() || null,
      buyer_type: buyerType.trim() || null,
      common_project_type: commonProjectType.trim() || null,
      location: location.trim() || null,
      communication_note: communicationNote.trim() || null,
      profile_completed: true,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("profiles")
      .update(payload)
      .eq("id", user.id);

    if (error) {
      if (error.message?.includes("profile_completed")) {
        const fallbackPayload = { ...payload };
        delete fallbackPayload.profile_completed;

        const { error: fallbackError } = await supabase
          .from("profiles")
          .update(fallbackPayload)
          .eq("id", user.id);

        if (fallbackError) {
          setErrorText(
            `Please add profile_completed column to profiles table. Save failed: ${fallbackError.message}`
          );
          setSaving(false);
          return;
        }

        setErrorText(
          "Profile saved, but profile_completed is missing from profiles table. Please add that column to enable the onboarding guard."
        );
        setProfileData({ ...profileData, ...fallbackPayload });
        setSaving(false);
        return;
      }

      setErrorText(error.message);
      setSaving(false);
      return;
    }

    const redirectPath = profileData?.role === "admin"
      ? "/admin"
      : profileData?.role === "seller"
      ? "/seller-dashboard"
      : "/buyer-dashboard";

    setMessage("Profile saved successfully. Redirecting...");
    try {
      localStorage.removeItem(`kazihub-profile-draft:${user.id}`);
      sessionStorage.removeItem(`kazihub-profile-draft:${user.id}`);
      draftCache.current = {};
    } catch (error) {
      console.warn("Unable to clear saved draft", error);
    }
    await refreshProfile();
    navigate(redirectPath);
  }

  const currentRole = profileData?.role || profile?.role || "buyer";
  const showSellerFields = currentRole === "seller";
  const showBuyerFields = currentRole === "buyer";

  return (
    <main className="mx-auto max-w-5xl px-5 py-16">
      <div className="rounded-3xl border bg-white p-8 shadow-sm">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Profile Setup</h1>
          <p className="mt-2 text-muted">
            Complete your profile so KaziHub can connect you to buyers and sellers with confidence.
          </p>
        </div>

        {loadingProfile ? (
          <p className="text-muted">Loading your profile...</p>
        ) : (
          <form onSubmit={handleSubmit} className="grid gap-8">
            <p role="status" className="text-xs text-slate-500">
              Your unsaved text is kept in this browser until you finish saving your profile.
              Selected image files must be selected again if the browser reloads.
            </p>
            <div className="grid gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-6">
              <h2 className="text-xl font-semibold">Basic profile details</h2>

              <div className="grid gap-4">
                <label className="grid gap-2 text-sm font-semibold text-slate-700">
                  Full name
                  <input
                    value={fullName}
                    onChange={(event) => saveDraftField("fullName", event.target.value, setFullName)}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
                    required
                  />
                </label>

                <label className="grid gap-2 text-sm font-semibold text-slate-700">
                  Country
                  <input
                    value={country}
                    onChange={(event) => saveDraftField("country", event.target.value, setCountry)}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
                    required
                  />
                </label>

                <label className="grid gap-2 text-sm font-semibold text-slate-700">
                  Headline
                  <input
                    value={headline}
                    onChange={(event) => saveDraftField("headline", event.target.value, setHeadline)}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
                    required
                  />
                </label>

                <label className="grid gap-2 text-sm font-semibold text-slate-700">
                  Languages
                  <input
                    value={languages}
                    onChange={(event) => saveDraftField("languages", event.target.value, setLanguages)}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
                    placeholder="English, Swahili, Spanish"
                    required
                  aria-label="English, Swahili, Spanish" />
                </label>

                <label className="grid gap-2 text-sm font-semibold text-slate-700">
                  Short bio / description
                  <textarea
                    value={bio}
                    onChange={(event) => saveDraftField("bio", event.target.value, setBio)}
                    className="min-h-[140px] rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
                    required
                  />
                </label>

                <label className="grid gap-2 text-sm font-semibold text-slate-700">
                  Profile image
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleProfileImageChange}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3"
                  />
                </label>

                {previewImageUrl && (
                  <img
                    src={previewImageUrl}
                    alt="Profile preview"
                    className="h-32 w-32 rounded-3xl object-cover"
                  />
                )}
              </div>
            </div>

            {showSellerFields && (
              <div className="grid gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-6">
                <h2 className="text-xl font-semibold">Seller details</h2>

                <label className="grid gap-2 text-sm font-semibold text-slate-700">
                  Professional title
                  <input
                    value={professionalTitle}
                    onChange={(event) => saveDraftField("professionalTitle", event.target.value, setProfessionalTitle)}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
                    required
                  />
                </label>

                <label className="grid gap-2 text-sm font-semibold text-slate-700">
                  Skills
                  <input
                    value={skills}
                    onChange={(event) => saveDraftField("skills", event.target.value, setSkills)}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
                    placeholder="Design, Web Development, SEO"
                    required
                  aria-label="Design, Web Development, SEO" />
                </label>

                <label className="grid gap-2 text-sm font-semibold text-slate-700">
                  Years of experience
                  <input
                    type="number"
                    min="0"
                    value={yearsExperience}
                    onChange={(event) => saveDraftField("yearsExperience", event.target.value, setYearsExperience)}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
                    required
                  />
                </label>

                <label className="grid gap-2 text-sm font-semibold text-slate-700">
                  Portfolio / website link
                  <input
                    value={websiteUrl}
                    onChange={(event) => saveDraftField("websiteUrl", event.target.value, setWebsiteUrl)}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
                    placeholder="https://"
                    required
                  aria-label="https://" />
                </label>

                <label className="grid gap-2 text-sm font-semibold text-slate-700">
                  Service categories
                  <input
                    value={categories}
                    onChange={(event) => saveDraftField("categories", event.target.value, setCategories)}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
                    placeholder="Marketing, Web Development, Design"
                    required
                  aria-label="Marketing, Web Development, Design" />
                </label>

                <label className="grid gap-2 text-sm font-semibold text-slate-700">
                  Seller description
                  <textarea
                    value={sellerDescription}
                    onChange={(event) => saveDraftField("sellerDescription", event.target.value, setSellerDescription)}
                    className="min-h-[120px] rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
                    required
                  />
                </label>
              </div>
            )}

            {showBuyerFields && (
              <div className="grid gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-6">
                <h2 className="text-xl font-semibold">Buyer details</h2>

                <label className="grid gap-2 text-sm font-semibold text-slate-700">
                  Buyer type
                  <input
                    value={buyerType}
                    onChange={(event) => saveDraftField("buyerType", event.target.value, setBuyerType)}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
                    placeholder="Startup, Enterprise, Agency"
                    required
                  aria-label="Startup, Enterprise, Agency" />
                </label>

                <label className="grid gap-2 text-sm font-semibold text-slate-700">
                  Common project type
                  <input
                    value={commonProjectType}
                    onChange={(event) => saveDraftField("commonProjectType", event.target.value, setCommonProjectType)}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
                    placeholder="Website, Branding, Marketing Campaign"
                    required
                  aria-label="Website, Branding, Marketing Campaign" />
                </label>

                <label className="grid gap-2 text-sm font-semibold text-slate-700">
                  Location / city
                  <input
                    value={location}
                    onChange={(event) => saveDraftField("location", event.target.value, setLocation)}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
                    required
                  />
                </label>

                <label className="grid gap-2 text-sm font-semibold text-slate-700">
                  Preferred communication note
                  <textarea
                    value={communicationNote}
                    onChange={(event) => saveDraftField("communicationNote", event.target.value, setCommunicationNote)}
                    className="min-h-[120px] rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
                    placeholder="I prefer email and scheduled calls for project discussions."
                    required
                  aria-label="I prefer email and scheduled calls for project discussions." />
                </label>
              </div>
            )}

            {errorText && (
              <p className="rounded-3xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {errorText}
              </p>
            )}

            {message && (
              <p className="rounded-3xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
                {message}
              </p>
            )}

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="submit"
                disabled={saving}
                className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save and Continue"}
              </button>

              <Link
                to={profile?.role === "admin" ? "/admin" : profile?.role === "seller" ? "/seller-dashboard" : "/buyer-dashboard"}
                className="text-sm font-semibold text-primary"
              >
                Back to Dashboard
              </Link>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}

function SellerDashboardPage() {
  const { user, profile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

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
  const [activeSellerSection, setActiveSellerSection] = useState(() =>
    new URLSearchParams(window.location.search).get("section") || "inbox"
  );
  const [sellerInbox, setSellerInbox] = useState([]);
  const [sellerInboxUnread, setSellerInboxUnread] = useState({});
  const [loadingSellerInbox, setLoadingSellerInbox] = useState(true);

  useEffect(() => {
    const requested = new URLSearchParams(location.search).get("section");
    setActiveSellerSection(requested || "inbox");
  }, [location.search]);
  const sellerSections = [
    { id: "overview", label: "Overview" },
    { id: "inbox", label: "Inbox" },
    { id: "verification", label: "Verification" },
    { id: "profile", label: "Profile" },
    { id: "drafts", label: "Drafts" },
    { id: "requests", label: "Buyer Requests" },
    { id: "services", label: "My Gigs" },
    { id: "analytics", label: "Analytics" },
    { id: "customOffers", label: "Custom Offers" },
    { id: "orders", label: "Orders" },
    { id: "payouts", label: "Earnings" },
    { id: "reviews", label: "Reviews" },
  ];

  const [serviceDrafts, setServiceDrafts] = useState([]);
  const [loadingServiceDrafts, setLoadingServiceDrafts] = useState(true);

  const [availableRequests, setAvailableRequests] = useState([]);
  const [loadingAvailableRequests, setLoadingAvailableRequests] = useState(true);
  const [selectedRequestForOffer, setSelectedRequestForOffer] = useState(null);
  const [requestOfferMessage, setRequestOfferMessage] = useState("");
  const [requestOfferPrice, setRequestOfferPrice] = useState("");
  const [requestOfferCurrency, setRequestOfferCurrency] = useState("USD");
  const [requestOfferDeliveryDays, setRequestOfferDeliveryDays] = useState("");
  const [requestOfferRevisions, setRequestOfferRevisions] = useState("1");
  const [submittingRequestOffer, setSubmittingRequestOffer] = useState(false);
  const [requestOfferMessageText, setRequestOfferMessageText] = useState("");
  
  const [serviceAnalytics, setServiceAnalytics] = useState([]);
  const [loadingServiceAnalytics, setLoadingServiceAnalytics] = useState(true);

  useEffect(() => {
    function syncProfileFormFields() {
      if (profile) {
        setProfileHeadline(profile.headline || "");
        setProfileBio(profile.bio || "");
        setProfileCountry(profile.country || "");
        setProfileSkills(profile.skills || "");
        setProfileLanguages(profile.languages || "");
        setProfileWebsiteUrl(profile.website_url || "");
      }
    }
    syncProfileFormFields();
  }, [profile]);

  const fetchServiceAnalytics = useCallback(async (currentOffers) => {
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
  }, [user]);

  const fetchSellerInbox = useCallback(async () => {
    if (!user) {
      setSellerInbox([]);
      setSellerInboxUnread({});
      setLoadingSellerInbox(false);
      return;
    }
    setLoadingSellerInbox(true);
    const { data, error } = await supabase
      .from("direct_conversations")
      .select("id, subject, service_offer_id, buyer_id, updated_at")
      .eq("seller_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(12);
    if (error) {
      setErrorText(error.message);
      setSellerInbox([]);
      setSellerInboxUnread({});
    } else {
      const conversations = data || [];
      setSellerInbox(conversations);
      if (conversations.length) {
        const { data: unreadMessages, error: unreadError } = await supabase
          .from("direct_messages")
          .select("conversation_id")
          .in("conversation_id", conversations.map((c) => c.id))
          .eq("is_read", false)
          .neq("sender_id", user.id);
        if (!unreadError) {
          const counts = {};
          (unreadMessages || []).forEach(({conversation_id}) => {
            counts[conversation_id] = (counts[conversation_id] || 0) + 1;
          });
          setSellerInboxUnread(counts);
        }
      } else {
        setSellerInboxUnread({});
      }
    }
    setLoadingSellerInbox(false);
  }, [user?.id]);

  const fetchMyOffers = useCallback(async () => {
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
  }, [user, fetchServiceAnalytics]);

  const fetchMyCustomOffers = useCallback(async () => {
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
  }, [user]);

  const fetchSellerOrders = useCallback(async () => {
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
  }, [user]);

  const fetchSellerPayoutOrders = useCallback(async () => {
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
  }, [user]);

  const fetchSellerReviews = useCallback(async () => {
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
  }, [user]);

  const fetchSellerVerification = useCallback(async () => {
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
  }, [user]);

  const fetchServiceDrafts = useCallback(async () => {
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
  }, [user]);

  const fetchAvailableRequests = useCallback(async () => {
    if (!user) {
      setAvailableRequests([]);
      setLoadingAvailableRequests(false);
      return;
    }

    setLoadingAvailableRequests(true);

    const { data, error } = await supabase
      .from("project_requests")
      .select("*")
      .eq("status", "open")
      .order("created_at", { ascending: false });

    if (error) {
      setErrorText(error.message);
      setAvailableRequests([]);
    } else {
      setAvailableRequests(data || []);
    }

    setLoadingAvailableRequests(false);
  }, [user]);

  function openSellerOfferForm(request) {
    setSelectedRequestForOffer(request);
    setRequestOfferMessage("");
    setRequestOfferPrice("");
    setRequestOfferCurrency(request.currency || "USD");
    setRequestOfferDeliveryDays("");
    setRequestOfferRevisions("1");
    setRequestOfferMessageText("");
    setErrorText("");
  }

  async function handleSellerOfferSubmit(event) {
    event.preventDefault();

    if (!user || !selectedRequestForOffer) {
      return;
    }

    if (isSuspended(profile)) {
      setErrorText("Your account is suspended. This action is not allowed.");
      return;
    }

    setSubmittingRequestOffer(true);
    setRequestOfferMessageText("");
    setErrorText("");

    const { error } = await supabase.from("custom_offers").insert({
      project_request_id: selectedRequestForOffer.id,
      buyer_id: selectedRequestForOffer.buyer_id,
      seller_id: user.id,
      message: requestOfferMessage,
      price: Number(requestOfferPrice),
      currency: requestOfferCurrency,
      delivery_days: Number(requestOfferDeliveryDays),
      revisions: Number(requestOfferRevisions),
      status: "submitted",
    });

    if (error) {
      setErrorText(error.message);
      setSubmittingRequestOffer(false);
      return;
    }

    await sendNotification({
      userId: selectedRequestForOffer.buyer_id,
      type: "new_offer",
      title: "New offer received",
      message: "A seller has sent an offer for your project request.",
      link: "/buyer-dashboard",
    });

    setRequestOfferMessageText("Custom Offer sent successfully.");
    setSelectedRequestForOffer(null);
    setSubmittingRequestOffer(false);
    await fetchAvailableRequests();
  }

  useEffect(() => {
    function loadSellerDashboard() {
      fetchMyOffers();
      fetchSellerInbox();
      fetchMyCustomOffers();
      fetchSellerOrders();
      fetchSellerPayoutOrders();
      fetchSellerReviews();
      fetchSellerVerification();
      fetchServiceDrafts();
      fetchAvailableRequests();
    }
    loadSellerDashboard();
  }, [
    user,
    fetchMyOffers,
    fetchSellerInbox,
    fetchMyCustomOffers,
    fetchSellerOrders,
    fetchSellerPayoutOrders,
    fetchSellerReviews,
    fetchSellerVerification,
    fetchServiceDrafts,
    fetchAvailableRequests,
  ]);

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
    .filter((order) => order.payment_status === "paid" && ["waiting_period", "available", "requested"].includes(order.payout_status) && order.currency === "USD")
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
    <DashboardShell title={activeSellerSection === "overview" ? "Seller Dashboard" : activeSellerSection === "payouts" ? "Earnings & Payouts" : sellerSections.find((item) => item.id === activeSellerSection)?.label || "Seller Dashboard"}>
      {activeSellerSection === "overview" && (
      <div className="grid gap-5 md:grid-cols-4">
        <Stat title="Published Gigs" value={myOffers.filter((offer) => offer.status === "approved").length} />
        <Stat title="Active Orders" value={sellerOrders.filter((order) => ["active", "in_progress", "revision_requested"].includes(order.status)).length} />
        <Stat title="Unpaid Earnings (USD)" value={`${pendingPayoutUsd}`} />
        <Stat title="Seller Rating" value={`${averageSellerRating} / 5`} />
      </div>
      )}

      {errorText && (
        <p className="mt-6 rounded-xl bg-red-50 p-4 text-sm font-medium text-red-700">
          {errorText}
        </p>
      )}

      {["overview", "inbox"].includes(activeSellerSection) && (
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
      )}

      <nav aria-label="Seller sections" className="mt-8 space-y-3">
        <div className="flex flex-wrap gap-2">
          {sellerSections.filter((section) => ["overview","inbox","services","orders","payouts","reviews"].includes(section.id)).map((section) => (
            <button key={section.id} type="button"
              onClick={() => navigate(`/seller-dashboard?section=${section.id}`)}
              aria-current={activeSellerSection === section.id ? "page" : undefined}
              className={`rounded-full px-4 py-2 text-sm font-semibold ${
                activeSellerSection === section.id ? "bg-primary text-white" : "border border-slate-300 bg-white text-slate-700"
              }`}>
              {section.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 border-t pt-3">
          {sellerSections.filter((section) => !["overview","inbox","services","orders","payouts","reviews"].includes(section.id)).map((section) => (
            <button key={section.id} type="button"
              onClick={() => navigate(`/seller-dashboard?section=${section.id}`)}
              aria-current={activeSellerSection === section.id ? "page" : undefined}
              className={`rounded-full px-3 py-2 text-xs font-semibold ${
                activeSellerSection === section.id ? "bg-primary text-white" : "border border-slate-300 bg-white text-slate-600"
              }`}>
              {section.label}
            </button>
          ))}
        </div>
      </nav>

      {activeSellerSection === "inbox" && (
        <section className="mt-8 rounded-3xl border bg-white p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold">Buyer Inbox</h2>
              <p className="mt-1 text-sm text-muted">Messages buyers send from your gigs.</p>
            </div>
            <button type="button" onClick={fetchSellerInbox}
              className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold">Refresh Inbox</button>
          </div>
          {loadingSellerInbox ? (
            <p className="mt-6 text-muted">Loading buyer messages...</p>
          ) : sellerInbox.length === 0 ? (
            <div className="mt-6 rounded-2xl bg-slate-50 p-6">
              <h3 className="font-bold">No buyer inquiries yet</h3>
              <p className="mt-2 text-sm text-muted">Once a buyer clicks Contact Seller on one of your published gigs, the conversation appears here.</p>
              <Link to="/seller-dashboard?section=services" className="mt-4 inline-block font-semibold text-primary">Manage My Gigs</Link>
            </div>
          ) : (
            <div className="mt-5 divide-y rounded-2xl border">
              {sellerInbox.map((conversation) => (
                <Link key={conversation.id} to={`/messages/${conversation.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 transition hover:bg-slate-50">
                  <div>
                    <p className="text-xs font-medium text-slate-500">Buyer inquiry · Gig message</p>
                    <h3 className="mt-1 font-bold text-slate-900">{conversation.subject || "Service inquiry"}</h3>
                    <p className="mt-1 text-xs text-slate-500">Updated {conversation.updated_at ? new Date(conversation.updated_at).toLocaleString() : "recently"}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {sellerInboxUnread[conversation.id] > 0 && (
                      <span className="rounded-full bg-primary px-3 py-1 text-xs font-bold text-white">
                        {sellerInboxUnread[conversation.id]} unread
                      </span>
                    )}
                    <span className="text-sm font-semibold text-primary">Open conversation</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
          <Link to="/messages" className="mt-5 inline-block font-semibold text-primary">View all conversations</Link>
        </section>
      )}

      {activeSellerSection === "overview" && (
        <div className="mt-8 rounded-3xl border bg-white p-6">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-teal-100 bg-teal-50 p-4">
            <div>
              <p className="font-semibold text-slate-900">Buyer Inbox</p>
              <p className="text-sm text-slate-600">
                {loadingSellerInbox ? "Checking your inquiries..." :
                  `${sellerInbox.length} recent conversation(s) · ${Object.values(sellerInboxUnread).reduce((a,b) => a+b,0)} unread message(s)`}
              </p>
            </div>
            <button type="button" onClick={() => setActiveSellerSection("inbox")}
              className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white">
              Open Inbox
            </button>
          </div>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-bold">Overview</h2>
              <p className="mt-2 text-muted">
                Quick seller summary for offers, orders, payouts, and review activity.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                to="/create-service"
                className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white"
              >
                Create Service
              </Link>
              <Link
                to="/messages"
                className="rounded-full border border-slate-300 bg-white px-5 py-2 text-sm font-semibold text-slate-700"
              >
                Open Messages
              </Link>
              <Link
                to="/support"
                className="rounded-full border border-slate-300 bg-white px-5 py-2 text-sm font-semibold text-slate-700"
              >
                Contact Support
              </Link>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-3xl border bg-slate-50 p-5">
              <p className="text-sm font-semibold text-slate-500">Service Offers</p>
              <p className="mt-3 text-2xl font-bold">{myOffers.length}</p>
              <p className="mt-2 text-sm text-slate-600">Live and draft offers combined.</p>
            </div>
            <div className="rounded-3xl border bg-slate-50 p-5">
              <p className="text-sm font-semibold text-slate-500">Active Orders</p>
              <p className="mt-3 text-2xl font-bold">{sellerOrders.filter((order) => order.status === "active").length}</p>
              <p className="mt-2 text-sm text-slate-600">Orders currently in progress.</p>
            </div>
            <div className="rounded-3xl border bg-slate-50 p-5">
              <p className="text-sm font-semibold text-slate-500">Pending Payout</p>
              <p className="mt-3 text-2xl font-bold">${pendingPayoutUsd}</p>
              <p className="mt-2 text-sm text-slate-600">Amount waiting for payout.</p>
            </div>
            <div className="rounded-3xl border bg-slate-50 p-5">
              <p className="text-sm font-semibold text-slate-500">Average Rating</p>
              <p className="mt-3 text-2xl font-bold">{averageSellerRating} / 5</p>
              <p className="mt-2 text-sm text-slate-600">Based on buyer reviews.</p>
            </div>
          </div>
        </div>
      )}

      {activeSellerSection === "verification" && (
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
            aria-label="Legal name" />

            <div className="grid gap-4 md:grid-cols-2">
              <input
                className="rounded-xl border bg-white px-4 py-3 outline-none"
                placeholder="Country"
                value={verificationCountry}
                onChange={(event) => setVerificationCountry(event.target.value)}
                required
              aria-label="Country" />

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
      )}

      {activeSellerSection === "profile" && (
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
          aria-label="Professional headline" />

          <textarea
            className="min-h-32 rounded-xl border bg-white px-4 py-3 outline-none"
            placeholder="Seller bio"
            value={profileBio}
            onChange={(event) => setProfileBio(event.target.value)}
          aria-label="Seller bio" />

          <div className="grid gap-4 md:grid-cols-2">
            <input
              className="rounded-xl border bg-white px-4 py-3 outline-none"
              placeholder="Country"
              value={profileCountry}
              onChange={(event) => setProfileCountry(event.target.value)}
            aria-label="Country" />

            <input
              className="rounded-xl border bg-white px-4 py-3 outline-none"
              placeholder="Languages"
              value={profileLanguages}
              onChange={(event) => setProfileLanguages(event.target.value)}
            aria-label="Languages" />
          </div>

          <textarea
            className="min-h-24 rounded-xl border bg-white px-4 py-3 outline-none"
            placeholder="Skills"
            value={profileSkills}
            onChange={(event) => setProfileSkills(event.target.value)}
          aria-label="Skills" />

          <input
            className="rounded-xl border bg-white px-4 py-3 outline-none"
            placeholder="Website or portfolio URL"
            value={profileWebsiteUrl}
            onChange={(event) => setProfileWebsiteUrl(event.target.value)}
          aria-label="Website or portfolio URL" />

          <button
            disabled={savingProfile}
            className="rounded-full bg-primary px-6 py-3 font-semibold text-white disabled:opacity-60"
          >
            {savingProfile ? "Saving..." : "Save Seller Profile"}
          </button>
        </form>
      </div>
      )}

      {activeSellerSection === "drafts" && (
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
      )}

      {activeSellerSection === "requests" && (
      <div className="mt-8 rounded-3xl border bg-white p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-bold">Available Buyer Requests</h2>
            <p className="mt-2 text-muted">
              Open buyer requests that sellers can respond to with a Custom Offer.
            </p>
          </div>
        </div>

        {loadingAvailableRequests ? (
          <p className="mt-6 text-muted">Loading buyer requests...</p>
        ) : availableRequests.length === 0 ? (
          <div className="mt-6 rounded-2xl bg-slate-50 p-6">
            <p className="font-semibold">No buyer requests available right now.</p>
            <p className="mt-2 text-sm text-muted">
              Buyers post requests and sellers can send offers from this dashboard.
            </p>
          </div>
        ) : (
          <div className="mt-6 grid gap-4">
            {availableRequests.map((request) => (
              <article key={request.id} className="rounded-2xl border p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-xs font-semibold text-primary">{request.category}</p>
                    <h3 className="mt-1 text-lg font-bold">{request.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-700">{request.description}</p>

                    <div className="mt-4 grid gap-2 text-sm text-slate-700 md:grid-cols-3">
                      <p>
                        <strong>Budget:</strong> {request.budget_min || request.budget_max
                          ? `${request.currency} ${request.budget_min || "0"} - ${request.budget_max || "Open"}`
                          : "Not specified"}
                      </p>
                      <p>
                        <strong>Deadline:</strong> {request.deadline_date || "Not specified"}
                      </p>
                      <p>
                        <strong>Posted:</strong> {new Date(request.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => openSellerOfferForm(request)}
                    disabled={isSuspended(profile)}
                    className="mt-4 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white disabled:opacity-60 md:mt-0"
                  >
                    Send Offer
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
      )}

      {selectedRequestForOffer && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto overscroll-contain bg-slate-900/60 px-3 py-4 sm:items-center sm:px-5">
          <form
            onSubmit={handleSellerOfferSubmit}
            className="my-auto max-h-[calc(100dvh-2rem)] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-4 shadow-xl sm:p-6"
          >
            <div className="flex items-start justify-between gap-5">
              <div>
                <h2 className="text-2xl font-bold">Send Offer to Buyer</h2>
                <p className="mt-2 text-sm text-muted">
                  Request: {selectedRequestForOffer.title}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedRequestForOffer(null)}
                className="rounded-full border px-4 py-2 text-sm font-semibold"
              >
                Close
              </button>
            </div>

            <div className="mt-6 grid gap-4">
              <textarea
                className="min-h-32 rounded-xl border px-4 py-3 outline-none"
                placeholder="Write your message to the buyer. Explain scope, delivery, and what you need to start."
                value={requestOfferMessage}
                onChange={(event) => setRequestOfferMessage(event.target.value)}
                required
              aria-label="Write your message to the buyer. Explain scope, delivery, and what you need to start." />

              <div className="grid gap-4 md:grid-cols-4">
                <input
                  className="rounded-xl border px-4 py-3 outline-none"
                  placeholder="Offer price"
                  type="number"
                  min="5"
                  value={requestOfferPrice}
                  onChange={(event) => setRequestOfferPrice(event.target.value)}
                  required
                aria-label="Offer price" />

                <select
                  className="rounded-xl border px-4 py-3 outline-none"
                  value={requestOfferCurrency}
                  onChange={(event) => setRequestOfferCurrency(event.target.value)}
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
                  value={requestOfferDeliveryDays}
                  onChange={(event) => setRequestOfferDeliveryDays(event.target.value)}
                  required
                aria-label="Delivery days" />

                <input
                  className="rounded-xl border px-4 py-3 outline-none"
                  placeholder="Revisions"
                  type="number"
                  min="0"
                  value={requestOfferRevisions}
                  onChange={(event) => setRequestOfferRevisions(event.target.value)}
                  required
                aria-label="Revisions" />
              </div>

              <button
                disabled={submittingRequestOffer || isSuspended(profile)}
                className="rounded-full bg-primary px-6 py-3 font-semibold text-white disabled:opacity-60"
              >
                {submittingRequestOffer ? "Sending..." : "Send Offer"}
              </button>

              {requestOfferMessageText && (
                <p className="rounded-xl bg-green-50 p-4 text-sm font-medium text-green-700">
                  {requestOfferMessageText}
                </p>
              )}
            </div>
          </form>
        </div>
      )}

      {activeSellerSection === "services" && (
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

      )}

      {activeSellerSection === "analytics" && (
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

      )}

      {activeSellerSection === "customOffers" && (
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

      )}

      {activeSellerSection === "orders" && (
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

      )}

      {activeSellerSection === "payouts" && (
      <div className="mt-8 rounded-3xl border bg-white p-6">
        <h2 className="text-xl font-bold">Earnings & Payouts</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl bg-slate-50 p-5">
            <p className="text-sm text-slate-600">Unpaid verified earnings (USD)</p>
            <p className="mt-2 text-2xl font-bold">${pendingPayoutUsd}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-5">
            <p className="text-sm text-slate-600">Payouts requested</p>
            <p className="mt-2 text-2xl font-bold">{sellerPayoutOrders.filter((order) => order.payout_status === "requested").length}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-5">
            <p className="text-sm text-slate-600">Completed payouts</p>
            <p className="mt-2 text-2xl font-bold">{sellerPayoutOrders.filter((order) => order.payout_status === "paid").length}</p>
          </div>
        </div>
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
                    payoutStatusDisplay = new Date(order.payout_available_at) <= new Date() ? "Available — request payout" : `Available on ${new Date(order.payout_available_at).toLocaleDateString()}`;
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

      )}

      {activeSellerSection === "reviews" && (
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
      )}

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
  const [activeBuyerSection, setActiveBuyerSection] = useState("overview");
  const buyerSections = [
    { id: "overview", label: "Overview" },
    { id: "requests", label: "Project Requests" },
    { id: "offers", label: "Incoming Offers" },
    { id: "orders", label: "Active Orders" },
    { id: "saved", label: "Saved Services" },
    { id: "messages", label: "Messages" },
    { id: "support", label: "Support" },
  ];
  const [message, setMessage] = useState("");
  const [errorText, setErrorText] = useState("");

  const fetchBuyerDashboard = useCallback(async () => {
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
  }, [user]);

  useEffect(() => {
    function loadBuyerDashboard() {
      fetchBuyerDashboard();
    }
    loadBuyerDashboard();
  }, [fetchBuyerDashboard]);

  async function acceptOffer(offer) {
    if (isSuspended(profile)) {
      setErrorText("Your account is suspended. This action is not allowed.");
      return;
    }
    setActionLoadingId(offer.id);
    setMessage("");
    setErrorText("");

    // One transaction creates the unpaid order and accepts the offer.
    // If any part fails, PostgreSQL rolls back all changes.
    const { data: orderId, error } = await supabase.rpc("accept_custom_offer_order", {
      p_offer_id: offer.id,
    });

    if (error || !orderId) {
      setErrorText(error?.message || "Could not accept the offer. Please try again.");
      setActionLoadingId(null);
      return;
    }

    await sendNotification({
      userId: offer.seller_id,
      type: "new_order",
      title: "New order created",
      message: "A buyer accepted your Custom Offer. The order is waiting for manual payment verification.",
      link: `/orders/${orderId}`,
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
          <div className="mt-8 flex gap-3 overflow-x-auto pb-2">
            {buyerSections.map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => setActiveBuyerSection(section.id)}
                className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold ${
                  activeBuyerSection === section.id
                    ? "bg-primary text-white"
                    : "border border-slate-300 bg-white text-slate-700"
                }`}
              >
                {section.label}
              </button>
            ))}
          </div>

          {activeBuyerSection === "overview" && (
            <div className="mt-8 rounded-3xl border bg-white p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-xl font-bold">Overview</h2>
                  <p className="mt-2 text-muted">
                    Quick summary of your latest buyer activity without scrolling through the whole dashboard.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Link
                    to="/project-requests"
                    className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white"
                  >
                    Post New Request
                  </Link>
                  <Link
                    to="/services"
                    className="rounded-full border border-slate-300 bg-white px-5 py-2 text-sm font-semibold text-slate-700"
                  >
                    Browse Services
                  </Link>
                  <Link
                    to="/messages"
                    className="rounded-full border border-slate-300 bg-white px-5 py-2 text-sm font-semibold text-slate-700"
                  >
                    Open Messages
                  </Link>
                  <Link
                    to="/support"
                    className="rounded-full border border-slate-300 bg-white px-5 py-2 text-sm font-semibold text-slate-700"
                  >
                    Contact Support
                  </Link>
                </div>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-3xl border bg-slate-50 p-5">
                  <p className="text-sm font-semibold text-slate-500">Project Requests</p>
                  <p className="mt-3 text-2xl font-bold">{myRequests.length}</p>
                  <p className="mt-2 text-sm text-slate-600">Latest request: {myRequests[0]?.title || "None yet"}</p>
                </div>
                <div className="rounded-3xl border bg-slate-50 p-5">
                  <p className="text-sm font-semibold text-slate-500">Incoming Offers</p>
                  <p className="mt-3 text-2xl font-bold">{incomingOffers.length}</p>
                  <p className="mt-2 text-sm text-slate-600">Latest offer: {incomingOffers[0]?.message ? incomingOffers[0].message.substring(0, 50) : "None yet"}</p>
                </div>
                <div className="rounded-3xl border bg-slate-50 p-5">
                  <p className="text-sm font-semibold text-slate-500">Active Orders</p>
                  <p className="mt-3 text-2xl font-bold">{myOrders.filter((order) => order.status === "active").length}</p>
                  <p className="mt-2 text-sm text-slate-600">Latest order: {myOrders[0]?.title || "None yet"}</p>
                </div>
                <div className="rounded-3xl border bg-slate-50 p-5">
                  <p className="text-sm font-semibold text-slate-500">Saved Services</p>
                  <p className="mt-3 text-2xl font-bold">{savedServices.length}</p>
                  <p className="mt-2 text-sm text-slate-600">Latest saved: {savedServices[0]?.service_offers?.title || "None yet"}</p>
                </div>
              </div>
            </div>
          )}

          {activeBuyerSection === "requests" && (
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
          )}

          {activeBuyerSection === "saved" && (
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
          )}

          {activeBuyerSection === "offers" && (
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
          )}

          {activeBuyerSection === "orders" && (
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
          )}

          {activeBuyerSection === "messages" && (
          <div className="mt-8 rounded-3xl border bg-white p-6">
            <h2 className="text-xl font-bold">Messages</h2>
            <p className="mt-2 text-muted">View and reply to conversations with sellers.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/messages"
                className="rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white"
              >
                Open Messages
              </Link>
              <Link
                to="/support"
                className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700"
              >
                Contact Support
              </Link>
            </div>
          </div>
          )}

          {activeBuyerSection === "support" && (
          <div className="mt-8 rounded-3xl border bg-white p-6">
            <h2 className="text-xl font-bold">Support</h2>
            <p className="mt-2 text-muted">Need help? Reach out to our support team.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/support"
                className="rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white"
              >
                Contact Support
              </Link>
              <Link
                to="/messages"
                className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700"
              >
                Open Messages
              </Link>
            </div>
          </div>
          )}
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

const fetchPendingOffers = useCallback(async () => {
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
}, [user, profile]);

  const fetchPendingPayments = useCallback(async () => {
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
  }, [user, profile]);

  const fetchPendingPayouts = useCallback(async () => {
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
  }, [user, profile]);

  const fetchPendingVerifications = useCallback(async () => {
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
  }, [user, profile]);

  function makeSlugFromName(name) {
    return name
      .toLowerCase()
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  const fetchAdminCategories = useCallback(async () => {
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
  }, [user, profile]);

  const fetchAdminUsers = useCallback(async () => {
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
  }, [user, profile]);

  const fetchAdminDisputes = useCallback(async () => {
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
  }, [user, profile]);

  const fetchSupportTickets = useCallback(async () => {
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
  }, [user, profile]);

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
    function loadAdminDashboard() {
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
    }
    loadAdminDashboard();
  }, [
    user,
    profile,
    fetchPendingOffers,
    fetchPendingPayments,
    fetchPendingPayouts,
    fetchPendingVerifications,
    fetchAdminDisputes,
    fetchSupportTickets,
    fetchAdminCategories,
    fetchAdminUsers,
  ]);

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

        <Stat title="Pending Payments" value={pendingPayments.length} />
        <Stat title="Pending Payouts" value={pendingPayouts.length} />
        <Stat title="Open Disputes" value={adminDisputes.length} />
        <Stat title="Verification Requests" value={pendingVerifications.length} />
        <Stat title="Support Tickets" value={supportTickets.length} />
        <Stat title="Categories" value={adminCategories.length} />
        <Stat title="Users" value={adminUsers.length} />
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
            aria-label="Category name" />

            <input
              className="rounded-xl border bg-white px-4 py-3 outline-none"
              placeholder="Slug"
              value={categorySlug}
              onChange={(event) => setCategorySlug(event.target.value)}
              required
            aria-label="Slug" />
          </div>

          <textarea
            className="min-h-24 rounded-xl border bg-white px-4 py-3 outline-none"
            placeholder="Category description"
            value={categoryDescription}
            onChange={(event) => setCategoryDescription(event.target.value)}
            required
          aria-label="Category description" />

          <input
            className="rounded-xl border bg-white px-4 py-3 outline-none"
            placeholder="Display order"
            type="number"
            value={categoryOrder}
            onChange={(event) => setCategoryOrder(event.target.value)}
          aria-label="Display order" />

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
  const [searchText, setSearchText] = useState("");
  const [unreadByConversation, setUnreadByConversation] = useState({});

  const fetchConversations = useCallback(async () => {
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
      const conversationIds=(data||[]).map(c=>c.id);
      if (conversationIds.length) {
        const {data: unread} = await supabase.from("direct_messages")
          .select("conversation_id").in("conversation_id",conversationIds)
          .neq("sender_id",user.id).eq("is_read",false).limit(500);
        const counts={};
        (unread||[]).forEach(item=>{counts[item.conversation_id]=(counts[item.conversation_id]||0)+1;});
        setUnreadByConversation(counts);
      } else {setUnreadByConversation({});}
    }

    setLoadingConversations(false);
  }, [user]);

  useEffect(() => {
    function loadConversations() {
      fetchConversations();
    }
    loadConversations();
    const refresh = window.setInterval(fetchConversations,15000);
    return () => window.clearInterval(refresh);
  }, [fetchConversations]);

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

  const matchingConversations=conversations.filter(conversation =>
    (conversation.subject||"").toLowerCase().includes(searchText.trim().toLowerCase()));
  return (
    <main className="mx-auto max-w-7xl px-5 py-8 sm:py-12">
      <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-4xl font-bold">Messages</h1>
          <p className="mt-2 text-muted">Your direct conversations with buyers and sellers.</p>
        </div>

        <button type="button" onClick={fetchConversations}
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white">
          Refresh inbox
        </button>
      </div>

      <label className="mb-5 block text-sm font-semibold text-slate-700">Find a conversation
        <input type="search" value={searchText} onChange={event=>setSearchText(event.target.value)}
          placeholder="Search conversation subjects" className="mt-2 min-h-11 w-full rounded-xl border px-4 py-3 text-base sm:max-w-lg" />
      </label>

      {errorText && (
        <p className="mb-6 rounded-xl bg-red-50 p-4 text-sm font-medium text-red-700">
          {errorText}
        </p>
      )}

      {loadingConversations ? (
        <p className="text-muted">Loading conversations...</p>
      ) : matchingConversations.length === 0 ? (
        <div className="rounded-3xl border bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-bold">No conversations yet</h2>
          <p className="mt-3 text-muted">Contact a seller from a service page to begin a direct conversation.</p>
        </div>
      ) : (
        <div className="grid gap-5">
          {matchingConversations.map((conversation) => {
            const roleLabel = conversation.buyer_id === user.id ? "Seller conversation" : "Buyer inquiry";

            return (
              <Link
                key={conversation.id}
                to={`/messages/${conversation.id}`}
                className="rounded-3xl border bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold text-primary">{roleLabel}</p>
                    <h2 className="mt-2 text-lg font-bold sm:text-2xl">{conversation.subject}</h2>
                    {unreadByConversation[conversation.id] > 0 && <span className="mt-2 inline-block rounded-full bg-teal-100 px-2.5 py-1 text-xs font-bold text-teal-900">
                      {unreadByConversation[conversation.id]} unread
                    </span>}
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
  const { user, profile } = useAuth();
  const messageEndRef = useRef(null);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingConversation, setLoadingConversation] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [errorText, setErrorText] = useState("");
  const [isBlocked, setIsBlocked] = useState(false);
  const [reported, setReported] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportCategory, setReportCategory] = useState("spam");
  const [reportDetails, setReportDetails] = useState("");
  const [accountActionBusy, setAccountActionBusy] = useState(false);
  const [accountNotice, setAccountNotice] = useState("");

  const fetchConversation = useCallback(async () => {
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
  }, [id]);

  const fetchMessages = useCallback(async () => {
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
      if (user && document.visibilityState==="visible" && (data || []).some(item=>item.sender_id!==user.id && !item.is_read)) {
        const { error: readError } = await supabase.from("direct_messages")
          .update({is_read:true}).eq("conversation_id",id)
          .neq("sender_id",user.id).eq("is_read",false);
        if (readError) console.warn("Could not mark messages as read:",readError.message);
      }
    }
  }, [id,user?.id]);

  useEffect(() => {
    function loadConversation() {
      fetchConversation();
      fetchMessages();
    }
    loadConversation();
  }, [id, user, fetchConversation, fetchMessages]);

  useEffect(() => {
    if (!user || !conversation || (conversation.buyer_id !== user.id && conversation.seller_id !== user.id)) return;
    const other = conversation.buyer_id === user.id ? conversation.seller_id : conversation.buyer_id;
    let active = true;
    const fetchBlocks = async () => {
      const { data } = await supabase.from("account_blocks").select("blocker_id,blocked_id")
        .eq("blocker_id",user.id).eq("blocked_id",other);
      if (active) setIsBlocked((data||[]).length>0);
    };
    fetchBlocks();
    // Polling provides a fallback where Supabase Realtime is not enabled for these tables.
    const interval = window.setInterval(() => { fetchMessages(); fetchBlocks(); }, 12000);
    return () => { active=false; window.clearInterval(interval); };
  }, [user?.id, conversation?.id, conversation?.buyer_id, conversation?.seller_id, fetchMessages]);

  async function toggleBlock() {
    if (!user || !conversation) return;
    const other = conversation.buyer_id === user.id ? conversation.seller_id : conversation.buyer_id;
    setAccountActionBusy(true); setErrorText(""); setAccountNotice("");
    const operation = isBlocked
      ? supabase.from("account_blocks").delete().eq("blocker_id",user.id).eq("blocked_id",other)
      : supabase.from("account_blocks").insert({blocker_id:user.id,blocked_id:other});
    const { error } = await operation;
    if (error) setErrorText(error.message);
    else { setIsBlocked(!isBlocked); setAccountNotice(isBlocked ? "Account unblocked." : "Account blocked. Direct messages between these accounts are now disabled."); }
    setAccountActionBusy(false);
  }

  async function handleReport(event) {
    event.preventDefault();
    if (!user || !conversation || reportDetails.trim().length<12) {
      setErrorText("Provide at least 12 characters describing the issue."); return;
    }
    const other = conversation.buyer_id === user.id ? conversation.seller_id : conversation.buyer_id;
    setAccountActionBusy(true); setErrorText("");
    const { error } = await supabase.from("marketplace_reports").insert({
      reporter_id:user.id,reported_user_id:other,conversation_id:conversation.id,
      category:reportCategory,details:reportDetails.trim()
    });
    if (error) setErrorText(error.message);
    else {
      setReported(true); setReportOpen(false); setReportDetails("");
      setAccountNotice("Report submitted to KaziHub's administrator for review.");
    }
    setAccountActionBusy(false);
  }

  async function handleSendMessage(event) {
    event.preventDefault();

    if (!user || !conversation || !newMessage.trim() || isBlocked) return;

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

  const roleLabel = user.id === conversation.buyer_id ? "Talking with seller" : "Buyer inquiry";

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:py-10">
      <div className="mb-5 flex flex-col gap-3 rounded-2xl border bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold text-primary">{roleLabel}</p>
          <h1 className="mt-1 text-xl font-bold sm:text-2xl">{conversation.subject}</h1>
          <p className="mt-2 text-muted">
            Conversation updated {conversation.updated_at ? new Date(conversation.updated_at).toLocaleString() : "Unknown"}.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" disabled={accountActionBusy}
            onClick={toggleBlock}
            className="min-h-11 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
            {isBlocked ? "Unblock account" : "Block account"}
          </button>
          <button type="button" disabled={accountActionBusy || reported}
            onClick={() => setReportOpen((open)=>!open)}
            className="min-h-11 rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50">
            {reported ? "Report submitted" : "Report conversation"}
          </button>
        </div>
      </div>

      {accountNotice && <p role="status" className="mb-4 rounded-xl bg-teal-50 p-3 text-sm font-medium text-teal-900">{accountNotice}</p>}
      {reportOpen && <form onSubmit={handleReport} className="mb-5 grid gap-3 rounded-2xl border border-red-200 bg-white p-4">
        <h2 className="text-lg font-semibold">Report this conversation</h2>
        <p className="text-sm text-slate-600">An administrator can review the report and associated conversation. Reports are confidential and do not automatically suspend accounts.</p>
        <label className="text-sm font-semibold">Reason
          <select className="mt-2 min-h-11 w-full rounded-xl border p-3 text-base" value={reportCategory} onChange={event=>setReportCategory(event.target.value)}>
            <option value="spam">Spam</option><option value="harassment">Harassment</option>
            <option value="fraud">Fraud or scam</option><option value="off_platform_payment">Off-platform payment request</option>
            <option value="inappropriate_content">Inappropriate content</option><option value="other">Other</option>
          </select>
        </label>
        <label className="text-sm font-semibold">Details
          <textarea required minLength={12} maxLength={2000} value={reportDetails} onChange={event=>setReportDetails(event.target.value)}
            className="mt-2 min-h-28 w-full rounded-xl border p-3 text-base" placeholder="Describe what happened and which messages are involved."/>
        </label>
        <div className="flex gap-2"><button disabled={accountActionBusy} className="min-h-11 rounded-xl bg-red-700 px-4 font-semibold text-white disabled:opacity-50">Submit report</button>
        <button type="button" onClick={()=>setReportOpen(false)} className="min-h-11 rounded-xl border px-4">Cancel</button></div>
      </form>}

      {errorText && (
        <p className="mb-6 rounded-xl bg-red-50 p-4 text-sm font-medium text-red-700">
          {errorText}
        </p>
      )}

      <ConversationOffersPanel conversation={conversation} userId={user.id} />

      <section aria-label="Conversation messages" className="min-h-64 rounded-2xl border bg-white p-4 sm:p-6">
      <div className="grid max-h-[min(55dvh,36rem)] gap-4 overflow-y-auto overscroll-contain" aria-live="polite" aria-relevant="additions">
        {messages.length === 0 ? (
          <div className="rounded-3xl border bg-white p-8 shadow-sm">
            <p className="text-muted">Start with the project scope, deadline, files needed, or a question about this gig. Orders and payments are handled separately through KaziHub.</p>
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
                    className={`max-w-[90%] rounded-2xl px-3.5 py-3 text-sm leading-6 sm:max-w-[80%] sm:rounded-3xl sm:px-5 sm:py-4 sm:leading-7 ${
                      isMine ? "bg-primary text-white" : "bg-slate-100 text-slate-800"
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{messageItem.message}</p>
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
      </section>

      {isBlocked && <p role="status" className="mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-950">This account is blocked. Unblock it to resume messaging.</p>}
      <form onSubmit={handleSendMessage} className="mt-4 grid min-w-0 gap-3 rounded-2xl border bg-white p-4 shadow-sm sm:p-5">
        <p className="text-sm font-semibold text-slate-700">Your message</p>
        <textarea
          className="min-h-28 rounded-2xl border bg-slate-50 px-4 py-3 outline-none"
          placeholder={user.id === conversation.seller_id ? "Reply to the buyer. Clarify scope, pricing or delivery..." : "Tell the seller what you need, your deadline and relevant details..."}
          value={newMessage}
          onChange={(event) => setNewMessage(event.target.value)}
          required
          maxLength={5000}
          aria-label="Write a message"
        />
        <p className="text-right text-xs text-slate-500">{newMessage.length} / 5,000 characters</p>
        <button
          disabled={sendingMessage || !newMessage.trim() || isBlocked}
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

  const fetchUserTickets = useCallback(async () => {
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
  }, [user]);

  useEffect(() => {
    function loadUserTickets() {
      fetchUserTickets();
    }
    loadUserTickets();
  }, [fetchUserTickets]);

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
                  aria-label="Brief description of your issue" />
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
                  aria-label="Provide details about your issue" />
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
  const [coverUpload, setCoverUpload] = useState(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [coverUploadStatus, setCoverUploadStatus] = useState("");
  const coverSelectionSequence = useRef(0);
  const [serviceImagePreviewUrl, setServiceImagePreviewUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [galleryImageFiles, setGalleryImageFiles] = useState([]);
  const [galleryImagePreviews, setGalleryImagePreviews] = useState([]);
  const [videoUrl, setVideoUrl] = useState("");

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

  useEffect(() => {
    return () => {
      if (serviceImagePreviewUrl) {
        URL.revokeObjectURL(serviceImagePreviewUrl);
      }
    };
  }, [serviceImagePreviewUrl]);

  useEffect(() => {
    return () => {
      galleryImagePreviews.forEach((preview) => URL.revokeObjectURL(preview.previewUrl));
    };
  }, [galleryImagePreviews]);

  function formatUploadError(error) {
    const reason = String(error?.message || "Unknown upload error");
    if (/bucket not found/i.test(reason)) {
      return "The KaziHub service-media storage bucket is unavailable. Contact KaziHub support.";
    }
    if (/row.level.security|403|unauthorized|not authorized|permission denied/i.test(reason)) {
      return "Photo upload was denied by storage permissions. Sign out and sign back in, then retry. If it persists, report this message to support: " + reason;
    }
    if (/mime|content.type|unsupported media|415/i.test(reason)) {
      return "This image format is not supported. Upload JPG, PNG, WebP, or GIF instead. " + reason;
    }
    if (/payload too large|413|exceeded.*size/i.test(reason)) {
      return "This image is too large. Use a photo under 8 MB.";
    }
    return "Photo upload failed: " + reason;
  }

  function validGigImage(file) {
    return !!file && ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)
      && file.size > 0 && file.size <= 8 * 1024 * 1024;
  }

  async function handleServiceImageChange(event) {
    const file = event.target.files?.[0] || null;
    const sequence = ++coverSelectionSequence.current;
    setCoverUpload(null);
    setCoverUploadStatus("");
    setErrorText("");
    if (!file) {
      setServiceImageFile(null);
      setServiceImagePreviewUrl("");
      return;
    }
    if (!validGigImage(file)) {
      setServiceImageFile(null);
      setServiceImagePreviewUrl("");
      setErrorText("Choose a JPG, PNG, WebP or GIF image under 8 MB. HEIC/HEIF files must be converted first.");
      event.target.value = "";
      return;
    }
    setServiceImageFile(file);
    setServiceImagePreviewUrl(URL.createObjectURL(file));
    setUploadingCover(true);
    setCoverUploadStatus("Uploading cover photo to KaziHub...");
    try {
      const result = await uploadServiceImage(file, "cover");
      if (sequence !== coverSelectionSequence.current) return;
      if (result.error || !result.publicUrl) {
        setCoverUploadStatus("");
        setErrorText(formatUploadError(result.error || { message: "No public photo URL returned" }));
        return;
      }
      setCoverUpload(result);
      setCoverUploadStatus("Cover photo uploaded successfully. You can publish this gig.");
    } catch (error) {
      if (sequence === coverSelectionSequence.current) {
        setCoverUploadStatus("");
        setErrorText(formatUploadError(error));
      }
    } finally {
      if (sequence === coverSelectionSequence.current) setUploadingCover(false);
    }
  }

  function handleGalleryImagesChange(event) {
    const files = Array.from(event.target.files || []);
    if (files.length > 5 || files.some((file) => !validGigImage(file))) {
      setErrorText("Choose up to 5 gallery images, each JPG, PNG, WebP or GIF and smaller than 8 MB.");
      event.target.value = "";
      return;
    }
    setErrorText("");
    setGalleryImageFiles(files);
    setGalleryImagePreviews(files.map((file) => ({
      id: `${file.name}-${file.lastModified}-${file.size}`,
      name: file.name,
      previewUrl: URL.createObjectURL(file),
    })));
  }

  function removeGalleryImage(indexToRemove) {
    setGalleryImageFiles((current) => current.filter((_, index) => index !== indexToRemove));
    setGalleryImagePreviews((current) => current.filter((_, index) => index !== indexToRemove));
  }

  function buildDraftPayload() {
    return {
      title,
      category,
      description,
      currency,
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
    };
  }

  function applyDraftPayload(draftData) {
    if (!draftData) return;

    setTitle(draftData.title || "");
    setCategory(draftData.category || "");
    setDescription(draftData.description || "");
    setCurrency(draftData.currency || "USD");

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
    const draftName = title.trim() || "Untitled Service Draft";

    let error;
    let savedDraft;

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
    const filePath = `${user.id}/${pathPrefix}-${crypto.randomUUID()}-${safeFileName}`;

    const { error: uploadError } = await supabase.storage
      .from("service-media")
      .upload(filePath, file, { contentType: file.type, cacheControl: "3600", upsert: false });

    if (uploadError) {
      return {
        publicUrl: null,
        filePath: null,
        error: uploadError,
      };
    }

    const { data } = supabase.storage.from("service-media").getPublicUrl(filePath);

    return {
      publicUrl: data?.publicUrl || null,
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

    if (!title.trim() || !category || !description.trim() || !currency) {
      setErrorText("Gig title, category, description and currency are required.");
      return;
    }
    if (uploadingCover) {
      setErrorText("Finish uploading your cover photo before publishing.");
      return;
    }
    if (!serviceImageFile || !coverUpload?.publicUrl) {
      setErrorText("Choose a cover photo and wait for the green upload-success message before publishing.");
      return;
    }
    const allPackages = [
      { tier: "Basic", title: basicTitle, description: basicDescription, price: basicPackagePrice, days: basicPackageDeliveryDays, revisions: basicPackageRevisions },
      { tier: "Standard", title: standardTitle, description: standardDescription, price: standardPrice, days: standardDeliveryDays, revisions: standardRevisions },
      { tier: "Premium", title: premiumTitle, description: premiumDescription, price: premiumPrice, days: premiumDeliveryDays, revisions: premiumRevisions },
    ];
    for (const pkg of allPackages) {
      if (!pkg.title.trim() || !pkg.description.trim() || pkg.price === "" || !Number.isFinite(Number(pkg.price)) || Number(pkg.price) < 5 ||
          pkg.days === "" || !Number.isInteger(Number(pkg.days)) || Number(pkg.days) < 1 ||
          pkg.revisions === "" || !Number.isInteger(Number(pkg.revisions)) || Number(pkg.revisions) < 0) {
        setErrorText(`Complete every field in the ${pkg.tier} package: title, description, price (minimum 5), delivery days (minimum 1), and revisions.`);
        return;
      }
    }
    setLoading(true);
    setDraftMessage("");
    setErrorText("");

    const uploadedImageUrl = coverUpload.publicUrl;
    const uploadedImagePath = coverUpload.filePath;

    const { data: createdOffer, error: offerError } = await supabase
      .from("service_offers")
      .insert({
        seller_id: user.id,
        title: title.trim(),
        category,
        description: description.trim(),
        basic_price: Number(basicPackagePrice),
        currency,
        delivery_days: Number(basicPackageDeliveryDays),
        revisions: Number(basicPackageRevisions),
        image_url: uploadedImageUrl,
        status: "draft",
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
        setErrorText(formatUploadError(uploadResult.error));
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

    if (loadedDraftId) {
      await supabase
        .from("service_offer_drafts")
        .delete()
        .eq("id", loadedDraftId);
    }

    const { error: publishError } = await supabase.from("service_offers")
      .update({ status: "approved", updated_at: new Date().toISOString() })
      .eq("id", createdOffer.id);
    if (publishError) {
      setErrorText(`Your service is saved privately but could not be published: ${publishError.message}`);
      setLoading(false);
      return;
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
          Complete the required gig details, cover photo and all three packages. Your gig goes live immediately after successful submission.
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
            aria-label="Service title" />

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
            aria-label="Describe your service clearly. Include what the buyer receives, what you need from them, and what is excluded." />

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
              <p className="mb-2 text-sm font-semibold">Main gig photo <span className="text-red-600">*</span> (required, max 8 MB)</p>
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center transition hover:border-primary hover:bg-teal-50">
                {serviceImagePreviewUrl ? (
                  <img
                    src={serviceImagePreviewUrl}
                    alt="Main service preview"
                    className="h-64 w-full rounded-xl object-cover"
                  />
                ) : (
                  <span className="flex flex-col items-center gap-3 text-sm text-slate-600">
                    <ImagePlus className="text-primary" size={32} />
                    <span className="font-semibold text-slate-900">Choose a main image</span>
                    <span>Show buyers the finished work, sample, plan, or result.</span>
                  </span>
                )}
                <input
                  className="sr-only"
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,.gif"
                  required
                  onChange={handleServiceImageChange}
                />
              </label>
              {coverUploadStatus && (
                <p role="status" className={`mt-3 rounded-xl p-3 text-sm font-medium ${coverUpload ? "bg-emerald-50 text-emerald-800" : "bg-blue-50 text-blue-700"}`}>
                  {coverUploadStatus}
                </p>
              )}
              <p className="mt-2 text-xs text-slate-500">Accepted: JPG, PNG, WebP, GIF · Maximum 8 MB. Your cover is uploaded immediately so you can verify it worked.</p>
            </div>

            <div>
              <p className="mb-2 text-sm font-semibold">Gallery images</p>
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center transition hover:border-primary hover:bg-teal-50">
                <ImagePlus className="text-primary" size={28} />
                <span className="mt-3 text-sm font-semibold text-slate-900">Add gallery images</span>
                <span className="mt-1 text-sm text-slate-600">Upload samples, drawings, results, or process screenshots.</span>
                <input
                  className="sr-only"
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,.gif"
                  multiple
                  onChange={handleGalleryImagesChange}
                />
              </label>

              <p className="mt-2 text-xs text-slate-500">Optional: up to 5 images, max 8 MB each. Gallery images upload when you publish the gig.</p>
              {galleryImagePreviews.length > 0 && (
                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {galleryImagePreviews.map((preview, index) => (
                    <div key={preview.id} className="relative overflow-hidden rounded-2xl border bg-white">
                      <img
                        src={preview.previewUrl}
                        alt={`Gallery preview ${index + 1}`}
                        className="h-40 w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeGalleryImage(index)}
                        className="absolute right-2 top-2 rounded-full bg-white/90 p-1 text-slate-700 shadow-sm hover:bg-white"
                        aria-label="Remove gallery image"
                      >
                        <X size={16} />
                      </button>
                      <p className="truncate px-3 py-2 text-xs font-medium text-slate-600">
                        {preview.name}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <input
              className="rounded-xl border px-4 py-3 outline-none"
              placeholder="Video URL, for example YouTube, Vimeo, Loom, or portfolio video URL"
              value={videoUrl}
              onChange={(event) => setVideoUrl(event.target.value)}
            aria-label="Video URL, for example YouTube, Vimeo, Loom, or portfolio video URL" />
          </section>

          <section className="grid gap-4">
            <h2 className="text-xl font-bold">Packages</h2>

            <div className="grid gap-5 lg:grid-cols-3">
              <div className="rounded-2xl border p-5">
                <h3 className="font-bold">Basic Package</h3>
                <label className="mt-4 block text-sm font-semibold text-slate-700">Package name <span className="text-red-600">*</span><input className="mt-2 w-full rounded-xl border px-4 py-3 outline-none" placeholder="Package title" value={basicTitle} onChange={(event) => setBasicTitle(event.target.value)} required aria-label="Package title" /></label>
                <label className="mt-4 block text-sm font-semibold text-slate-700">What is included <span className="text-red-600">*</span><textarea className="mt-2 min-h-28 w-full rounded-xl border px-4 py-3 outline-none" placeholder="Package description" value={basicDescription} onChange={(event) => setBasicDescription(event.target.value)} required aria-label="Package description" /></label>
                <label className="mt-4 block text-sm font-semibold text-slate-700">Price <span className="text-red-600">*</span><input className="mt-2 w-full rounded-xl border px-4 py-3 outline-none" type="number" min="5" step="0.01" placeholder="Price" value={basicPackagePrice} onChange={(event) => setBasicPackagePrice(event.target.value)} required aria-label="Price" /></label>
                <label className="mt-4 block text-sm font-semibold text-slate-700">Delivery time (days) <span className="text-red-600">*</span><input className="mt-2 w-full rounded-xl border px-4 py-3 outline-none" type="number" min="1" placeholder="Delivery days" value={basicPackageDeliveryDays} onChange={(event) => setBasicPackageDeliveryDays(event.target.value)} required aria-label="Delivery days" /></label>
                <label className="mt-4 block text-sm font-semibold text-slate-700">Included revisions <span className="text-red-600">*</span><input className="mt-2 w-full rounded-xl border px-4 py-3 outline-none" type="number" min="0" placeholder="Revisions" value={basicPackageRevisions} onChange={(event) => setBasicPackageRevisions(event.target.value)} required aria-label="Revisions" /></label>
              </div>

              <div className="rounded-2xl border p-5">
                <h3 className="font-bold">Standard Package</h3>
                <label className="mt-4 block text-sm font-semibold text-slate-700">Package name <span className="text-red-600">*</span><input className="mt-2 w-full rounded-xl border px-4 py-3 outline-none" placeholder="Package title" value={standardTitle} onChange={(event) => setStandardTitle(event.target.value)} required aria-label="Package title" /></label>
                <label className="mt-4 block text-sm font-semibold text-slate-700">What is included <span className="text-red-600">*</span><textarea className="mt-2 min-h-28 w-full rounded-xl border px-4 py-3 outline-none" placeholder="Package description" value={standardDescription} onChange={(event) => setStandardDescription(event.target.value)} required aria-label="Package description" /></label>
                <label className="mt-4 block text-sm font-semibold text-slate-700">Price <span className="text-red-600">*</span><input className="mt-2 w-full rounded-xl border px-4 py-3 outline-none" type="number" min="5" step="0.01" placeholder="Price" value={standardPrice} onChange={(event) => setStandardPrice(event.target.value)} required aria-label="Price" /></label>
                <label className="mt-4 block text-sm font-semibold text-slate-700">Delivery time (days) <span className="text-red-600">*</span><input className="mt-2 w-full rounded-xl border px-4 py-3 outline-none" type="number" min="1" placeholder="Delivery days" value={standardDeliveryDays} onChange={(event) => setStandardDeliveryDays(event.target.value)} required aria-label="Delivery days" /></label>
                <label className="mt-4 block text-sm font-semibold text-slate-700">Included revisions <span className="text-red-600">*</span><input className="mt-2 w-full rounded-xl border px-4 py-3 outline-none" type="number" min="0" placeholder="Revisions" value={standardRevisions} onChange={(event) => setStandardRevisions(event.target.value)} required aria-label="Revisions" /></label>
              </div>

              <div className="rounded-2xl border p-5">
                <h3 className="font-bold">Premium Package</h3>
                <label className="mt-4 block text-sm font-semibold text-slate-700">Package name <span className="text-red-600">*</span><input className="mt-2 w-full rounded-xl border px-4 py-3 outline-none" placeholder="Package title" value={premiumTitle} onChange={(event) => setPremiumTitle(event.target.value)} required aria-label="Package title" /></label>
                <label className="mt-4 block text-sm font-semibold text-slate-700">What is included <span className="text-red-600">*</span><textarea className="mt-2 min-h-28 w-full rounded-xl border px-4 py-3 outline-none" placeholder="Package description" value={premiumDescription} onChange={(event) => setPremiumDescription(event.target.value)} required aria-label="Package description" /></label>
                <label className="mt-4 block text-sm font-semibold text-slate-700">Price <span className="text-red-600">*</span><input className="mt-2 w-full rounded-xl border px-4 py-3 outline-none" type="number" min="5" step="0.01" placeholder="Price" value={premiumPrice} onChange={(event) => setPremiumPrice(event.target.value)} required aria-label="Price" /></label>
                <label className="mt-4 block text-sm font-semibold text-slate-700">Delivery time (days) <span className="text-red-600">*</span><input className="mt-2 w-full rounded-xl border px-4 py-3 outline-none" type="number" min="1" placeholder="Delivery days" value={premiumDeliveryDays} onChange={(event) => setPremiumDeliveryDays(event.target.value)} required aria-label="Delivery days" /></label>
                <label className="mt-4 block text-sm font-semibold text-slate-700">Included revisions <span className="text-red-600">*</span><input className="mt-2 w-full rounded-xl border px-4 py-3 outline-none" type="number" min="0" placeholder="Revisions" value={premiumRevisions} onChange={(event) => setPremiumRevisions(event.target.value)} required aria-label="Revisions" /></label>
              </div>
            </div>
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
              disabled={loading || uploadingCover || !coverUpload || (profile && profile.role !== "seller")}
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
  const [selectedImagePreview, setSelectedImagePreview] = useState("");
  const [galleryImageFiles, setGalleryImageFiles] = useState([]);
  const [videoUrl, setVideoUrl] = useState("");
  const [currentMedia, setCurrentMedia] = useState([]);
  const [packages, setPackages] = useState([
    { tier: "basic", title: "Basic", description: "", price: 0, delivery_days: 1, revisions: 0 },
    { tier: "standard", title: "Standard", description: "", price: 0, delivery_days: 1, revisions: 0 },
    { tier: "premium", title: "Premium", description: "", price: 0, delivery_days: 1, revisions: 0 },
  ]);

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

      setLoading(false);
    }

    if (user) {
      fetchServiceOffer();
    }
  }, [id, user, profile]);

  function validGigImage(file) {
    return !!file && ["image/jpeg","image/png","image/webp","image/gif"].includes(file.type)
      && file.size > 0 && file.size <= 8 * 1024 * 1024;
  }

  function handleEditCoverChange(event) {
    const file = event.target.files?.[0] || null;
    if (file && !validGigImage(file)) {
      setErrorText("Cover photos must be JPG, PNG, WebP or GIF under 8 MB. Convert HEIC/HEIF before uploading.");
      event.target.value = "";
      return;
    }
    setErrorText("");
    setServiceImageFile(file);
    setSelectedImagePreview(file ? URL.createObjectURL(file) : "");
  }

  function handleEditGalleryChange(event) {
    const files = Array.from(event.target.files || []);
    if (files.length > 5 || files.some((file) => !validGigImage(file))) {
      setErrorText("Choose up to five JPG, PNG, WebP or GIF gallery images, each under 8 MB.");
      event.target.value = "";
      return;
    }
    setErrorText("");
    setGalleryImageFiles(files);
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

    if (!title.trim() || !category || !description.trim() || !currency) {
      setErrorText("Service title, category, description and currency are required.");
      return;
    }
    if (!imageUrl && !serviceImageFile) {
      setErrorText("A main gig photo is required.");
      return;
    }
    if (serviceImageFile && !validGigImage(serviceImageFile)) {
      setErrorText("Choose JPG, PNG, WebP or GIF cover photo smaller than 8 MB.");
      return;
    }
    if (packages.length !== 3 || !["basic","standard","premium"].every(tier => packages.some(pkg =>
      pkg.tier === tier && pkg.title.trim() && pkg.description.trim() &&
      Number.isFinite(Number(pkg.price)) && Number(pkg.price) >= 5 &&
      Number.isInteger(Number(pkg.delivery_days)) && Number(pkg.delivery_days) >= 1 &&
      Number.isInteger(Number(pkg.revisions)) && Number(pkg.revisions) >= 0
    ))) {
      setErrorText("Complete all three packages: name, description, price (at least 5), delivery days and revisions.");
      return;
    }
    setSaving(true);
    setErrorText("");
    setMessage("");

    let finalImageUrl = imageUrl;

    if (serviceImageFile) {
      const safeFileName = serviceImageFile.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const storagePath = `${user.id}/${id}/main-${crypto.randomUUID()}-${safeFileName}`;

      const { error: uploadError } = await supabase.storage
        .from("service-media")
        .upload(storagePath, serviceImageFile, { contentType: serviceImageFile.type, upsert: false });

      if (uploadError) {
        setErrorText(uploadError.message || "Service image upload failed.");
        setSaving(false);
        return;
      }

      const { data: publicUrlData } = supabase.storage.from("service-media").getPublicUrl(storagePath);
      finalImageUrl = publicUrlData.publicUrl;
    }

    const basicPackage = packages.find((pkg) => pkg.tier === "basic");
    const { error: updateError } = await supabase
      .from("service_offers")
      .update({
        title: title.trim(),
        category,
        description: description.trim(),
        currency,
        image_url: finalImageUrl,
        basic_price: Number(basicPackage.price),
        delivery_days: Number(basicPackage.delivery_days),
        revisions: Number(basicPackage.revisions),
        status: "draft",
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
        const storagePath = `${user.id}/${id}/gallery-${crypto.randomUUID()}-${safeFileName}`;

        const { error: uploadError } = await supabase.storage
          .from("service-media")
          .upload(storagePath, file, { contentType: file.type, upsert: false });

        if (uploadError) {
          setErrorText(`Gallery image "${file.name}" could not be uploaded: ${uploadError.message}`);
          setSaving(false);
          return;
        }
        const { data: publicUrlData } = supabase.storage.from("service-media").getPublicUrl(storagePath);
        const nextDisplayOrder =
          Math.max(...currentMedia.filter((m) => m.is_primary !== true).map((m) => m.display_order || 0), 1) + index + 1;

        const { error: galleryRecordError } = await supabase.from("service_offer_media").insert({
          service_offer_id: id,
          seller_id: user.id,
          media_type: "image",
          media_url: publicUrlData.publicUrl,
          storage_path: storagePath,
          title: file.name,
          display_order: nextDisplayOrder,
          is_primary: false,
        });
        if (galleryRecordError) {
          setErrorText(`Gallery image "${file.name}" uploaded, but could not be attached to your gig: ${galleryRecordError.message}`);
          setSaving(false);
          return;
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

    const { error: publishError } = await supabase.from("service_offers")
      .update({ status: "approved", updated_at: new Date().toISOString() })
      .eq("id", id);
    if (publishError) {
      setErrorText(`Your changes were saved but the gig could not be published: ${publishError.message}`);
      setSaving(false);
      return;
    }
    setMessage("Gig updated and published successfully.");
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
        <p className="mt-2 text-muted">All three packages and a cover image are required. Changes publish immediately after successful saving.</p>

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
              aria-label="Service title" />

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
              aria-label="Describe your service clearly." />

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
            <h3 className="font-bold">Main gig photo <span className="text-red-600">*</span></h3>
            {(selectedImagePreview || imageUrl) && (
              <img src={selectedImagePreview || imageUrl} alt="Current or selected gig cover"
                className="mt-4 h-52 w-full rounded-xl object-cover" />
            )}
            <input
              className="mt-4 w-full rounded-xl border bg-white px-4 py-3 outline-none"
              type="file"
              accept=".jpg,.jpeg,.png,.webp,.gif"
              onChange={handleEditCoverChange}
            />
            <p className="mt-2 text-xs text-slate-500">JPG, PNG, WebP or GIF · Under 8 MB. New cover uploads when you save.</p>
            {serviceImageFile && <p role="status" className="mt-2 text-sm text-slate-600">Selected: {serviceImageFile.name}</p>}
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
              accept=".jpg,.jpeg,.png,.webp,.gif"
              multiple
              onChange={handleEditGalleryChange}
            />
            <p className="mt-2 text-xs text-slate-500">Up to five JPG, PNG, WebP or GIF images, maximum 8 MB each.</p>
            {galleryImageFiles.length > 0 && <p className="mt-2 text-sm text-slate-600">{galleryImageFiles.length} new image(s) ready to upload on save</p>}
          </div>

          <div className="rounded-2xl bg-slate-100 p-6">
            <h3 className="font-bold">Video URL</h3>
            <input
              className="mt-4 w-full rounded-xl border bg-white px-4 py-3 outline-none"
              placeholder="YouTube, Vimeo, Loom, or portfolio video URL"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
            aria-label="YouTube, Vimeo, Loom, or portfolio video URL" />
          </div>

          <div className="rounded-2xl bg-slate-100 p-6">
            <h3 className="font-bold">Packages</h3>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              {packages.map((pkg) => (
                <div key={pkg.tier} className="rounded-xl border bg-white p-4">
                  <p className="text-sm font-semibold text-slate-700">{pkg.tier.toUpperCase()}</p>
                  <input
                    className="mt-2 w-full rounded-lg border px-3 py-2 outline-none"
                    aria-label={`${pkg.tier} Package name`} placeholder="Title"
                    value={pkg.title}
                    onChange={(e) => updatePackage(pkg.tier, "title", e.target.value)}
                  />
                  <textarea
                    className="mt-2 w-full min-h-16 rounded-lg border px-3 py-2 outline-none"
                    aria-label={`${pkg.tier} What's included`} placeholder="Description"
                    value={pkg.description}
                    onChange={(e) => updatePackage(pkg.tier, "description", e.target.value)}
                  />
                  <input
                    className="mt-2 w-full rounded-lg border px-3 py-2 outline-none"
                    type="number"
                    aria-label={`${pkg.tier} Price`} placeholder="Price"
                    min="5"
                    step="0.01"
                    value={pkg.price}
                    onChange={(e) => updatePackage(pkg.tier, "price", e.target.value)}
                  />
                  <input
                    className="mt-2 w-full rounded-lg border px-3 py-2 outline-none"
                    type="number"
                    aria-label={`${pkg.tier} Delivery time (days)`} placeholder="Delivery days"
                    min="1"
                    value={pkg.delivery_days}
                    onChange={(e) => updatePackage(pkg.tier, "delivery_days", e.target.value)}
                  />
                  <input
                    className="mt-2 w-full rounded-lg border px-3 py-2 outline-none"
                    type="number"
                    aria-label={`${pkg.tier} Included revisions`} placeholder="Revisions"
                    min="0"
                    value={pkg.revisions}
                    onChange={(e) => updatePackage(pkg.tier, "revisions", e.target.value)}
                  />
                </div>
              ))}
            </div>
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
    function loadProjectRequests() {
      fetchProjectRequests();
    }
    loadProjectRequests();
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

    await sendNotification({
      userId: selectedRequest.buyer_id,
      type: "new_offer",
      title: "New offer received",
      message: "A seller has sent an offer for your project request.",
      link: "/buyer-dashboard",
    });

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
              aria-label="Project title" />

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
              aria-label="Describe what you need. Include location, files available, deadline, and expected deliverables." />

              <div className="grid gap-4 md:grid-cols-3">
                <input
                  className="rounded-xl border px-4 py-3 outline-none"
                  placeholder="Min budget"
                  type="number"
                  min="0"
                  value={budgetMin}
                  onChange={(event) => setBudgetMin(event.target.value)}
                aria-label="Min budget" />

                <input
                  className="rounded-xl border px-4 py-3 outline-none"
                  placeholder="Max budget"
                  type="number"
                  min="0"
                  value={budgetMax}
                  onChange={(event) => setBudgetMax(event.target.value)}
                aria-label="Max budget" />

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
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto overscroll-contain bg-slate-900/60 px-3 py-4 sm:items-center sm:px-5">
          <form
            onSubmit={handleCustomOfferSubmit}
            className="my-auto max-h-[calc(100dvh-2rem)] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-4 shadow-xl sm:p-6"
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
              aria-label="Write your message to the buyer. Explain your scope, deliverables, assumptions, and what you need to start." />

              <div className="grid gap-4 md:grid-cols-4">
                <input
                  className="rounded-xl border px-4 py-3 outline-none"
                  placeholder="Offer price"
                  type="number"
                  min="5"
                  value={offerPrice}
                  onChange={(event) => setOfferPrice(event.target.value)}
                  required
                aria-label="Offer price" />

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
                aria-label="Delivery days" />

                <input
                  className="rounded-xl border px-4 py-3 outline-none"
                  placeholder="Revisions"
                  type="number"
                  min="0"
                  value={offerRevisions}
                  onChange={(event) => setOfferRevisions(event.target.value)}
                  required
                aria-label="Revisions" />
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
        <h1 className="text-3xl font-bold">Manual Payment Checkout</h1>
        <p className="mt-3 text-muted">
          Choose a service and its package to create an order. Each order has its own amount, currency and manual payment instructions. No card payment is collected on this page.
        </p>
        <p className="mt-4 text-sm text-slate-700">
          After making payment to the verified KaziHub payment destination, submit your transaction reference on the order page. Work starts only after an administrator verifies receipt.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/services" className="rounded-full bg-primary px-6 py-3 font-semibold text-white">Browse Services</Link>
          <Link to="/payment-policy" className="rounded-full border border-slate-300 px-6 py-3 font-semibold text-slate-700">Payment instructions</Link>
        </div>
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
  const [payoutDestinations, setPayoutDestinations] = useState([]);
  const [selectedPayoutDestinationId, setSelectedPayoutDestinationId] = useState("");
  const [payoutPhoneVerified, setPayoutPhoneVerified] = useState(false);
  const [payoutRecipient, setPayoutRecipient] = useState(null);
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

  const fetchOrder = useCallback(async () => {
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
  }, [user, id]);

  const fetchOrderMessages = useCallback(async () => {
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
  }, [user, id]);

  const fetchOrderFiles = useCallback(async () => {
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
  }, [user, id]);

  const fetchOrderReview = useCallback(async () => {
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
  }, [id]);

  const fetchOrderRequirements = useCallback(async () => {
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
  }, [id]);

  const fetchOrderDisputes = useCallback(async () => {
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
  }, [id]);

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

    const { error } = await supabase
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
    function loadOrderDetails() {
      fetchOrder();
      fetchOrderMessages();
      fetchOrderFiles();
      fetchOrderReview();
      fetchOrderRequirements();
      fetchOrderDisputes();
    }
    loadOrderDetails();
  }, [
    id,
    user,
    fetchOrder,
    fetchOrderMessages,
    fetchOrderFiles,
    fetchOrderReview,
    fetchOrderRequirements,
    fetchOrderDisputes,
  ]);

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
    if (selectedManualPaymentMethod === "Cryptocurrency (manual verification)") {
      if (paymentReference.trim().length < 20) {
        setErrorText("Enter a complete blockchain transaction hash (TXID).");
        return;
      }
      if (paymentNote.trim().length < 8) {
        setErrorText("State the asset, network and amount sent in the payment notes.");
        return;
      }
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

  useEffect(() => {
    if (!user || !order) return;
    let active = true;
    const loadPayout = async () => {
      if (order.seller_id === user.id) {
        const [destinationsResult, identity] = await Promise.all([
          supabase.from("payout_destinations").select("id,method,account_identifier,account_name,is_default")
            .eq("user_id",user.id).order("is_default",{ascending:false}),
          supabase.auth.getUser(),
        ]);
        if (!active) return;
        setPayoutDestinations(destinationsResult.data || []);
        setSelectedPayoutDestinationId(current =>
          (destinationsResult.data || []).some(d=>d.id===current) ? current :
          ((destinationsResult.data || []).find(d=>d.is_default)?.id || destinationsResult.data?.[0]?.id || ""));
        setPayoutPhoneVerified(Boolean(identity.data?.user?.phone && identity.data?.user?.phone_confirmed_at));
      }
      if (profile?.role === "admin" && order.payout_destination_id) {
        const result = await supabase.from("payout_destinations").select("method,account_identifier,account_name")
          .eq("id",order.payout_destination_id).eq("user_id",order.seller_id).maybeSingle();
        if (active) setPayoutRecipient(result.data || null);
      }
    };
    loadPayout();
    return () => { active = false; };
  }, [user, order?.id, order?.payout_destination_id, order?.seller_id, profile?.role]);

  async function handleRequestPayout(event) {
    event.preventDefault();

    if (!order || !user) return;

    if (order.status !== "completed") {
      setErrorText("Only completed orders can request payout.");
      return;
    }

    if (!["available", "waiting_period"].includes(order.payout_status)) {
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
    if (!payoutPhoneVerified) {
      setErrorText("Verify your phone number before requesting a payout. Open Payments & verification.");
      return;
    }
    if (!selectedPayoutDestinationId) {
      setErrorText("Choose a saved payout destination in Payments & verification.");
      return;
    }

    setRequestingPayout(true);
    setMessage("");
    setErrorText("");

    const { error } = await supabase
      .from("orders")
      .update({
        payout_status: "requested",
        payout_destination_id: selectedPayoutDestinationId,
        payout_method: payoutDestinations.find(d=>d.id===selectedPayoutDestinationId)?.method || "Manual payout",
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

      <OrderMilestonesPanel order={order} userId={user.id} />

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
                Before work begins, choose a manual payment method below. Bank/M-Pesa transfers and cryptocurrency require KaziHub's payment instructions. After paying, submit the transaction reference. An administrator must verify actual receipt before work begins.
              </p>

              {selectedManualPaymentMethod !== "Cryptocurrency (manual verification)" && (
                <div className="mt-4 space-y-2 text-sm">
                <p><strong>Recipient Country:</strong> Kenya</p>
                <p><strong>Recipient Name:</strong> Willy Mwangi</p>
                <p><strong>M-Pesa Number:</strong> +254742775321</p>
                <p>
                  <strong>Amount:</strong> {order.currency} {Number(order.price).toFixed(2)}
                </p>
              </div>
              )}
              {selectedManualPaymentMethod === "Cryptocurrency (manual verification)" && (
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
                  <strong>Cryptocurrency — manual transfer</strong>
                  <p className="mt-2">KaziHub has not published a verified receiving wallet or network on this page. Contact support for the official wallet address, network, required token and exact amount before sending funds. Never transfer to an address shared by another user.</p>
                  <p className="mt-2">After sending through the confirmed network, submit the transaction hash and the asset/network in the notes. Crypto transfers can be irreversible and may involve network fees. Your order remains pending until an administrator verifies receipt.</p>
                  <Link to="/support" className="mt-2 inline-block font-semibold underline">Contact KaziHub Support</Link>
                </div>
              )}

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
                    <option value="Cryptocurrency (manual verification)">Cryptocurrency (manual verification)</option>
                    <option value="Other international transfer">Other international transfer</option>
                  </select>

                  <input
                    className="rounded-xl border bg-white px-4 py-3 outline-none"
                    placeholder={selectedManualPaymentMethod === "Cryptocurrency (manual verification)" ? "Blockchain transaction hash (TXID)" : "Payment transaction/reference code"}
                    value={paymentReference}
                    onChange={(event) => setPaymentReference(event.target.value)}
                    required
                  />

                  <textarea
                    className="min-h-24 rounded-xl border bg-white px-4 py-3 outline-none"
                    placeholder={selectedManualPaymentMethod === "Cryptocurrency (manual verification)" ? "Required: cryptocurrency and network used; amount sent and time" : "Optional note, sender name, payment time, or extra details"}
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

              {order.status === "completed" && order.payout_status === "waiting_period" && order.payout_available_at && new Date(order.payout_available_at) > new Date() && (
                <p className="mt-5 rounded-xl bg-blue-50 p-4 text-sm font-medium text-blue-700">
                  Payout available on: {new Date(order.payout_available_at).toLocaleString()}
                </p>
              )}

              {(order.payout_status === "available" || (order.payout_status === "waiting_period" && order.payout_available_at && new Date(order.payout_available_at) <= new Date())) && (
                <form onSubmit={handleRequestPayout} className="mt-5 grid gap-3">
                  <p className="text-sm text-slate-600">KaziHub retains 20% of the order total. The payout amount shown here is your 80% share before separate provider charges.</p>
                  <label className="text-sm font-semibold text-slate-700">Saved payout destination
                    <select className="mt-2 min-h-11 w-full rounded-xl border px-3 py-3 text-base" value={selectedPayoutDestinationId} onChange={event=>setSelectedPayoutDestinationId(event.target.value)}>
                      <option value="">Choose payout method</option>
                      {payoutDestinations.map(item=><option key={item.id} value={item.id}>{item.method.toUpperCase()} — {item.account_identifier}</option>)}
                    </select>
                  </label>
                  <p className="text-xs text-slate-600">{payoutPhoneVerified ? "Phone verified" : "Phone verification required before payout."} A fresh SMS payout-security code is also required for each request (valid for 10 minutes). <Link className="font-semibold text-primary underline" to={`/payment-settings?return=/orders/${order.id}`}>Manage payout methods and send payout security code</Link></p>
                  {order.payout_rejection_reason && (
                    <div className="rounded-xl bg-red-50 p-4 text-sm font-medium text-red-700">
                      Previous payout request was rejected.
                      <p className="mt-2">Reason: {order.payout_rejection_reason}</p>
                    </div>
                  )}

                  <textarea
                    className="min-h-24 rounded-xl border bg-white px-4 py-3 text-sm outline-none"
                    placeholder="Optional payout note (do not enter passwords or account numbers)."
                    value={payoutNote}
                    onChange={(event) => setPayoutNote(event.target.value)}
                  aria-label="Optional payout note. Add preferred payout method, account details, or any payout instructions." />

                  <button
                    disabled={requestingPayout || isSuspended(profile) || !payoutPhoneVerified || !selectedPayoutDestinationId}
                    className="rounded-full bg-primary px-6 py-3 font-semibold text-white disabled:opacity-60"
                  >
                    {requestingPayout ? "Submitting..." : "Request Payout"}
                  </button>
                </form>
              )}

              {profile?.role === "admin" && order.payout_destination_id && (
                <div className="mt-4 rounded-xl border border-teal-200 bg-teal-50 p-4 text-sm">
                  <p className="font-bold">Seller payout destination</p>
                  {payoutRecipient
                    ? <p className="mt-2 break-all">{payoutRecipient.method.toUpperCase()} · {payoutRecipient.account_name} · {payoutRecipient.account_identifier}</p>
                    : <p className="mt-2">Destination unavailable. Verify seller account details before paying.</p>}
                  <p className="mt-2 text-xs">Manually verify the recipient and the provider transfer before marking payout paid.</p>
                </div>
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
                The seller has delivered the work. You have 3 days from the delivery time to review it. You may complete the order or request a revision. If you need more time or have a dispute, contact KaziHub support.
              </p>
              <p className="mt-3 text-sm font-semibold">
                Suggested review date: {new Date(new Date(order.delivered_at).getTime() + 3 * 24 * 60 * 60 * 1000).toLocaleString()}
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
      aria-label="Add a delivery note for the buyer. Mention delivered files, assumptions, and anything the buyer should review." />

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
      aria-label="Optional completion note for the seller." />

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
      aria-label="Explain what needs to be revised." />

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
            aria-label="Add your order requirements here. Include files, links, examples, or any special instructions." />

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
            aria-label="Write your review of the seller's work, communication, quality, and delivery." />

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
            aria-label="Explain the issue clearly. Include what happened, what you are requesting, and any evidence already uploaded." />

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
          aria-label="Write a message about this order" />

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
  const { profile } = useAuth();
  const profileIncomplete = isProfileIncomplete(profile);

  return (
    <main className="mx-auto max-w-7xl px-5 py-12">
      <h1 className="text-4xl font-bold">{title}</h1>
      <p className="mt-3 text-muted">
        Manage your marketplace activity from one place.
      </p>

      {profileIncomplete && (
        <div className="mt-6 rounded-3xl border border-orange-200 bg-orange-50 p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-orange-900">
                Complete your profile to build trust and use KaziHub properly.
              </h2>
              <p className="mt-2 text-sm text-orange-700">
                Add missing profile details now to unlock full marketplace access and improve buyers'/sellers' confidence.
              </p>
            </div>
            <Link
              to="/profile-setup"
              className="rounded-full bg-orange-600 px-5 py-3 text-sm font-semibold text-white"
            >
              Complete Profile
            </Link>
          </div>
        </div>
      )}

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

  const [sellerProfile, setSellerProfile] = useState(null);
  const [sellerServices, setSellerServices] = useState([]);
  const [sellerReviews, setSellerReviews] = useState([]);
  const [portfolioProjects, setPortfolioProjects] = useState([]);
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

      const {data: portfolioData} = await supabase.from("seller_portfolio_projects")
        .select("id,title,description,category,skills,external_url,cover_image_path,completed_year")
        .eq("seller_id",id).eq("published",true).order("created_at",{ascending:false}).limit(24);
      setPortfolioProjects(portfolioData||[]);

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

      <section className="mt-8 rounded-3xl border bg-white p-4 shadow-sm sm:p-6">
        <h2 className="text-2xl font-bold">Seller portfolio</h2>
        <p className="mt-2 text-sm text-slate-600">Examples of completed projects shared by this seller.</p>
        {portfolioProjects.length===0 ? <p className="mt-4 text-sm text-slate-600">No portfolio projects published yet.</p> :
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {portfolioProjects.map(item=>{
              const url=item.cover_image_path?supabase.storage.from("portfolio-images").getPublicUrl(item.cover_image_path).data.publicUrl:null;
              return <article key={item.id} className="overflow-hidden rounded-xl border">
                {url&&<img src={url} alt={item.title} loading="lazy" className="aspect-video w-full object-cover"/>}
                <div className="space-y-2 p-4">
                  <h3 className="font-bold">{item.title}</h3>
                  <p className="text-xs text-slate-500">{item.category}{item.completed_year?" · "+item.completed_year:""}</p>
                  <p className="whitespace-pre-wrap break-words text-sm">{item.description}</p>
                  {item.skills&&<p className="text-xs text-slate-600">{item.skills}</p>}
                  {item.external_url&&<a href={item.external_url} target="_blank" rel="noopener noreferrer nofollow"
                    className="inline-flex min-h-11 items-center text-sm font-semibold text-primary underline">View project website</a>}
                </div>
              </article>;
            })}
          </div>}
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

function NotFoundPage() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-16">
      <div className="rounded-3xl border bg-white p-8 text-center shadow-sm">
        <p className="font-semibold text-primary">404</p>
        <h1 className="mt-2 text-3xl font-bold">Page Not Found</h1>
        <p className="mt-3 text-muted">
          The page you are looking for does not exist or may have been moved.
        </p>
        <Link
          to="/"
          className="mt-6 inline-block rounded-full bg-primary px-6 py-3 font-semibold text-white"
        >
          Back to Home
        </Link>
      </div>
    </main>
  );
}

function Footer() {
  return (
    <footer className="border-t bg-white">
      <div className="mx-auto max-w-7xl px-5 py-8 text-sm text-muted">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} KaziHub. Freelance services across AI, creative, business, technology and more.</p>
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
          KaziHub is a marketplace that connects buyers with independent service sellers across many professional fields. Sellers are responsible for delivering the services they offer, while buyers are responsible for providing accurate requirements and clear instructions.
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

function AdminActivityPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const [activity, setActivity] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [gigs, setGigs] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState("");
  useEffect(() => {
    const conversationId = new URLSearchParams(window.location.search).get("conversation");
    if (conversationId && /^[0-9a-f-]{36}$/i.test(conversationId)) {
      setSelectedConversation(conversationId);
    }
  }, []);

  const [messages, setMessages] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const isAuthorized = Boolean(user && profile?.role === "admin" && profile?.account_status === "active");

  useEffect(() => {
    if (!isAuthorized) return;
    let mounted = true;
    const load = async () => {
      setBusy(true);
      const [events, people] = await Promise.all([
        supabase.from("marketplace_activity").select("*").order("occurred_at", { ascending: false }).limit(150),
        supabase.from("profiles").select("id,full_name,role,account_status,created_at").order("created_at", { ascending: false }).limit(150),
      ]);
      if (!mounted) return;
      if (events.error || people.error) setError(events.error?.message || people.error?.message);
      else { setActivity(events.data || []); setAccounts(people.data || []); setError(""); }
      setBusy(false);
    };
    load();
    return () => { mounted = false; };
  }, [isAuthorized]);

  useEffect(() => {
    if (!isAuthorized || !selectedUser) { setGigs([]); setConversations([]); if (!isAuthorized) setSelectedConversation(""); return; }
    let mounted = true;
    const loadUser = async () => {
      const [offers, chats] = await Promise.all([
        supabase.from("service_offers").select("id,title,status,created_at").eq("seller_id",selectedUser).order("created_at", { ascending: false }).limit(100),
        supabase.from("direct_conversations").select("id,subject,buyer_id,seller_id,created_at").or(`buyer_id.eq.${selectedUser},seller_id.eq.${selectedUser}`).order("created_at", { ascending: false }).limit(100),
      ]);
      if (!mounted) return;
      setGigs(offers.data || []);
      setConversations(chats.data || []);
      setSelectedConversation("");
      setMessages([]);
      if (offers.error || chats.error) setError(offers.error?.message || chats.error?.message);
    };
    loadUser();
    return () => { mounted = false; };
  }, [isAuthorized, selectedUser]);

  useEffect(() => {
    if (!isAuthorized || !selectedConversation) { setMessages([]); return; }
    let mounted = true;
    supabase.rpc("review_conversation_messages", { p_conversation_id: selectedConversation })
      .then(({ data, error: queryError }) => {
        if (!mounted) return;
        setMessages(data || []);
        if (queryError) setError(queryError.message);
      });
    return () => { mounted = false; };
  }, [isAuthorized, selectedConversation]);

  if (authLoading) return <main className="mx-auto max-w-6xl p-8">Checking administrator access...</main>;
  if (!isAuthorized) return <Navigate to={profile?.role === "seller" ? "/seller-dashboard" : user ? "/buyer-dashboard" : "/"} replace />;

  const chosen = accounts.find((account) => account.id === selectedUser);
  const relatedActivity = selectedUser ? activity.filter((event) => event.subject_user_id === selectedUser || event.actor_id === selectedUser) : activity;

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-5 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-3xl font-bold text-dark">Marketplace activity</h1>
        <p className="text-sm text-muted">Read-only audit view. Private message content is opened only when you select a conversation.</p></div>
        <Link to="/admin" className="rounded-xl border px-4 py-2 text-sm font-semibold">Back to admin</Link>
      </div>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-700">{error}</p>}
      <div className="grid gap-5 lg:grid-cols-3">
        <section className="rounded-2xl border bg-white p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-bold">Latest activity</h2><span className="text-xs text-muted">{busy ? "Loading..." : "Showing up to 150 events"}</span></div>
          <div className="max-h-[660px] space-y-2 overflow-y-auto">
            {relatedActivity.length === 0 && <p className="text-sm text-muted">No recorded events in this view yet.</p>}
            {relatedActivity.map((event) => (
              <button type="button" key={event.id} onClick={() => { if (event.subject_user_id) setSelectedUser(event.subject_user_id); }}
                className="block w-full rounded-xl border p-3 text-left hover:bg-slate-50">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold">{event.summary}</span>
                  <span className="text-xs text-muted">{new Date(event.occurred_at).toLocaleString()}</span>
                </div>
                <p className="mt-1 text-xs text-muted">{event.event_type} · {event.entity_type} · {event.subject_user_id || "System"}</p>
              </button>
            ))}
          </div>
        </section>
        <section className="rounded-2xl border bg-white p-5">
          <h2 className="mb-3 text-lg font-bold">Account activity</h2>
          <label htmlFor="activity-user" className="mb-2 block text-sm font-semibold">Select account</label>
          <select id="activity-user" value={selectedUser} onChange={(event) => setSelectedUser(event.target.value)}
            className="w-full rounded-lg border p-3 text-sm">
            <option value="">All accounts</option>
            {accounts.map((account) => <option key={account.id} value={account.id}>{account.full_name || account.id} ({account.role})</option>)}
          </select>
          {chosen && <>
            <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm">
              <p className="font-semibold">{chosen.full_name || "Account"}</p>
              <p>Role: {chosen.role}</p><p>Status: {chosen.account_status}</p>
              <p>Joined: {new Date(chosen.created_at).toLocaleDateString()}</p>
            </div>
            <h3 className="mt-5 font-semibold">Gigs ({gigs.length})</h3>
            <div className="mt-2 max-h-52 space-y-2 overflow-auto text-sm">
              {gigs.length === 0 ? <p className="text-muted">No gigs</p> : gigs.map((gig) =>
                <Link key={gig.id} to={`/services/${gig.id}`} className="block rounded-lg border p-2 hover:bg-slate-50">
                  {gig.title} <span className="text-xs text-muted">({gig.status})</span>
                </Link>)}
            </div>
            <h3 className="mt-5 font-semibold">Conversations ({conversations.length})</h3>
            <p className="mt-1 text-xs text-muted">Administrative access to private messages should be used for legitimate support or safety investigations and logged.</p>
            <div className="mt-2 max-h-52 space-y-2 overflow-auto text-sm">
              {conversations.length === 0 ? <p className="text-muted">No conversations</p> : conversations.map((chat) =>
                <button key={chat.id} type="button" onClick={() => setSelectedConversation(chat.id)}
                  className={`block w-full rounded-lg border p-2 text-left hover:bg-slate-50 ${chat.id === selectedConversation ? "border-teal-600" : ""}`}>
                  {chat.subject || "Conversation"} <span className="text-xs text-muted">{new Date(chat.created_at).toLocaleDateString()}</span>
                </button>)}
            </div>
          </>}
        </section>
      </div>
      {selectedConversation && <section className="rounded-2xl border bg-white p-5">
        <h2 className="text-lg font-bold">Conversation review</h2>
        <p className="mb-3 text-xs text-muted">Read-only. Do not use private messages outside an authorized investigation.</p>
        <div className="max-h-96 space-y-3 overflow-y-auto">
          {messages.length === 0 ? <p className="text-sm text-muted">No messages found.</p> :
            messages.map((message) => <div key={message.id} className="rounded-lg bg-slate-50 p-3 text-sm">
              <p className="mb-1 text-xs text-muted">{message.sender_id} · {new Date(message.created_at).toLocaleString()}</p>
              <p className="whitespace-pre-wrap break-words">{message.message}</p>
            </div>)}
        </div>
      </section>}
    </main>
  );
}


function MobileBottomNavigation() {
  const { user, profile } = useAuth();
  const location = useLocation();
  const path = location.pathname;
  const items = profile?.role === "seller"
    ? [
        { to: "/seller-dashboard", label: "Home", icon: Home },
        { to: "/messages", label: "Inbox", icon: MessageCircle },
        { to: "/seller-dashboard?section=services", label: "My gigs", icon: BriefcaseBusiness },
        { to: "/seller-dashboard?section=orders", label: "Orders", icon: LayoutDashboard },
        { to: "/profile-setup", label: "Profile", icon: UserRound },
      ]
    : profile?.role === "admin"
    ? [
        { to: "/admin", label: "Admin", icon: LayoutDashboard },
        { to: "/admin/activity", label: "Activity", icon: Bell },
        { to: "/messages", label: "Inbox", icon: MessageCircle },
        { to: "/support", label: "Support", icon: ShieldCheck },
        { to: "/profile-setup", label: "Profile", icon: UserRound },
      ]
    : [
        { to: "/", label: "Home", icon: Home },
        { to: "/services", label: "Explore", icon: Search },
        { to: "/categories", label: "Categories", icon: Grid2X2 },
        { to: "/messages", label: "Inbox", icon: MessageCircle },
        { to: user ? "/buyer-dashboard" : "/login", label: user ? "Account" : "Sign in", icon: UserRound },
      ];
  return (
    <nav aria-label="Quick navigation" className="mobile-bottom-navigation fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 shadow-[0_-3px_16px_rgba(15,23,42,.07)] backdrop-blur-lg lg:hidden">
      <div className="mx-auto grid max-w-xl grid-cols-5 items-stretch px-1">
        {items.map(({ to, label, icon: Icon }) => {
          const target = to.split("?")[0];
          const section = new URLSearchParams(to.split("?")[1] || "").get("section");
          const activeSection = new URLSearchParams(location.search).get("section") || "inbox";
          const selected = to === "/" ? path === "/"
            : (section ? path === target && activeSection === section
              : target === "/seller-dashboard" ? path === target && activeSection === "inbox"
              : path === target || (to === "/messages" && path.startsWith("/messages/")));
          return <Link key={to} to={to} aria-current={selected ? "page" : undefined}
            className={`flex min-h-[58px] flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1 text-[11px] font-semibold leading-tight focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${selected ? "text-primary" : "text-slate-500"}`}>
            <Icon size={21} strokeWidth={selected ? 2.5 : 2} aria-hidden="true" />
            <span>{label}</span>
          </Link>;
        })}
      </div>
    </nav>
  );
}

function RouteAccessibility() {
  const location = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [location.pathname]);
  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <RouteAccessibility />
      <a href="#main-content" className="skip-to-main">Skip to main content</a>
      <Header />
      <AccountStatusBanner />
      <div id="main-content" tabIndex={-1} className="min-w-0">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/services" element={<ServicesPage />} />
        <Route path="/categories" element={<AllCategoriesPage />} />
        <Route path="/categories/:slug" element={<CategoryPage />} />
        <Route path="/services/:id" element={<ServiceDetailsPage />} />
        <Route path="/sellers/:id" element={<SellerProfilePage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/dashboard-redirect" element={<DashboardRedirectPage />} />
        <Route path="/profile-setup" element={<ProfileSetupPage />} />
        <Route path="/payment-settings" element={<PaymentSettingsPage />} />
        <Route path="/portfolio" element={<SellerPortfolioPage />} />
        <Route path="/seller-dashboard" element={<SellerDashboardPage />} />
        <Route path="/buyer-dashboard" element={<BuyerDashboardPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/admin/activity" element={<AdminActivityPage />} />
        <Route path="/admin/reports" element={<AdminReportsPage />} />
        <Route path="/support" element={<SupportPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/refund-policy" element={<RefundPolicyPage />} />
        <Route path="/payment-policy" element={<PaymentPolicyPage />} />
        <Route path="/create-service" element={<CreateServicePage />} />
        <Route path="/edit-service/:id" element={<EditServicePage />} />
        <Route path="/project-requests" element={<ProjectRequestsPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/orders/:id" element={<OrderDetailsPage />} />
        <Route path="/offers" element={<MyOffersPage />} />
        <Route path="/messages" element={<MessagesPage />} />
        <Route path="/messages/:id" element={<ConversationPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      </div>
      <Footer />
      <MobileBottomNavigation />
    </BrowserRouter>
  );
}
