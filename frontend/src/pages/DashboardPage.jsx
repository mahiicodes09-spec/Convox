import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  BookOpen,
  Check,
  ChevronRight,
  ChevronDown,
  CircleAlert,
  Code2,
  Compass,
  Gamepad2,
  Hash,
  Heart,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  Plus,
  Search,
  Send,
  Settings,
  UsersRound,
  X,
} from "lucide-react";
import api from "../services/api";

const navigationItems = [
  { label: "Dashboard", href: "#dashboard", Icon: LayoutDashboard },
  { label: "My communities", href: "#my-communities", Icon: UsersRound },
  { label: "Discover", href: "#discover", Icon: Compass },
  { label: "Messages", href: "#messages", Icon: MessageCircle },
  { label: "Settings", href: "#settings", Icon: Settings },
];

// Templates only prefill schema-supported name and description fields. No
// category value is submitted because the server-create API does not accept one.
const communityTemplates = [
  {
    name: "Technology",
    Icon: Code2,
    communityName: "Technology Community",
    description: "Share ideas, projects, and discoveries in technology.",
  },
  {
    name: "Study Group",
    Icon: BookOpen,
    communityName: "Study Group",
    description: "Learn together, stay focused, and share useful resources.",
  },
  {
    name: "Gaming",
    Icon: Gamepad2,
    communityName: "Gaming Community",
    description: "Find teammates and talk about the games you enjoy.",
  },
  {
    name: "Friends",
    Icon: Heart,
    communityName: "Friends",
    description: "A private-feeling space to keep up with your friends.",
  },
];

/**
 * Returns a readable message for Axios and network errors without hiding failures.
 * API errors often include a `detail` field; network errors instead use `message`.
 */
function getApiErrorMessage(error, fallback) {
  const detail = error.response?.data?.detail || error.response?.data?.message;
  return typeof detail === "string" ? detail : error.message || fallback;
}

/**
 * Shows a signed-in user's real backend avatar or a neutral initials placeholder.
 * The same small component keeps the profile appearance consistent in both sidebars.
 */
function UserAvatar({ profile, className = "" }) {
  const displayName = profile?.display_name?.trim();
  const initials = displayName
    ? displayName
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toUpperCase()
    : "SC";

  return profile?.avatar ? (
    <img
      src={profile.avatar}
      alt=""
      className={`h-10 w-10 rounded-full border border-neutral-200 object-cover ${className}`}
    />
  ) : (
    <span
      aria-hidden="true"
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-xs font-bold text-white ${className}`}
    >
      {initials}
    </span>
  );
}

/**
 * A reusable section title gives the dashboard's different areas a shared style.
 */
function SectionHeading({ eyebrow, title, children }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        {eyebrow && (
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
            {eyebrow}
          </p>
        )}
        <h2 className="text-xl font-semibold tracking-tight text-neutral-950 sm:text-2xl">
          {title}
        </h2>
      </div>
      {children}
    </div>
  );
}

/**
 * Each card displays only fields confirmed by the Server response schema.
 * Selecting a card changes the active community used by the channel and message views.
 */
function CommunityCard({ server, selected, onSelect }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`group w-full rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:border-neutral-400 hover:shadow-md ${
        selected
          ? "border-neutral-900 bg-neutral-50 shadow-sm"
          : "border-neutral-200 bg-white"
      }`}
    >
      <span className="flex items-start justify-between gap-3">
        <span className="flex min-w-0 items-center gap-3">
          {server.icon ? (
            <img
              src={server.icon}
              alt=""
              className="h-11 w-11 shrink-0 rounded-xl border border-neutral-200 object-cover"
            />
          ) : (
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-neutral-950 text-white">
              <UsersRound size={19} />
            </span>
          )}
          <span className="min-w-0">
            <span className="block truncate font-semibold text-neutral-950">
              {server.name}
            </span>
            <span className="mt-1 block text-xs text-neutral-500">
              Community
            </span>
          </span>
        </span>
        <span className="rounded-full border border-neutral-200 p-1.5 text-neutral-500 transition group-hover:text-neutral-950">
          <ChevronDown size={14} className="-rotate-90" />
        </span>
      </span>
      {server.description && (
        <span className="mt-4 line-clamp-2 block text-sm leading-6 text-neutral-600">
          {server.description}
        </span>
      )}
      <span className="mt-4 flex items-center gap-1.5 text-xs text-neutral-500">
        <UsersRound size={14} />
        Open community
      </span>
    </button>
  );
}

export default function DashboardPage({ profile: authenticatedProfile }) {
  const navigate = useNavigate();

  // This profile came from the protected route's /auth/me/ request. Keeping it in
  // state lets the settings form update the UI after a successful profile edit.
  const [profile, setProfile] = useState(authenticatedProfile);
  const [profileDraft, setProfileDraft] = useState({
    display_name: authenticatedProfile?.display_name || "",
    bio: authenticatedProfile?.bio || "",
    status: authenticatedProfile?.status || "online",
  });

  // Community, channel, and message state is separate so each API section can
  // show its own loading and error state without blocking the whole dashboard.
  const [servers, setServers] = useState([]);
  const [selectedServerId, setSelectedServerId] = useState("");
  const [channels, setChannels] = useState([]);
  const [selectedChannelId, setSelectedChannelId] = useState("");
  const [messages, setMessages] = useState([]);
  const [serversLoading, setServersLoading] = useState(true);
  const [channelsLoading, setChannelsLoading] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [serversError, setServersError] = useState("");
  const [channelsError, setChannelsError] = useState("");
  const [messagesError, setMessagesError] = useState("");

  // These form states hold only user-entered values. Submitting them sends the
  // exact request fields documented by Swagger for the matching API operation.
  const [searchTerm, setSearchTerm] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [invitePreview, setInvitePreview] = useState(null);
  const [inviteError, setInviteError] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [joining, setJoining] = useState(false);
  const [communityName, setCommunityName] = useState("");
  const [communityDescription, setCommunityDescription] = useState("");
  const [createError, setCreateError] = useState("");
  const [creating, setCreating] = useState(false);
  // The visibility and step state control the two-screen creation dialog;
  // creationSuccess shows the server-confirmed result after the dialog closes.
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createModalStep, setCreateModalStep] = useState("choose");
  const [creationSuccess, setCreationSuccess] = useState("");
  const createModalRef = useRef(null);
  const createTriggerRef = useRef(null);
  const modalFocusReturnRef = useRef(null);
  const [messageDraft, setMessageDraft] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileMessage, setProfileMessage] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [activeNav, setActiveNav] = useState("Dashboard");

  /**
   * A 401 means the saved access token is no longer accepted. Clear both tokens
   * and return to login instead of leaving stale protected information visible.
   */
  const handleRequestError = useCallback(
    (error, setSectionError, fallback) => {
      if (error.response?.status === 401) {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        navigate("/login", { replace: true });
        return;
      }

      setSectionError(getApiErrorMessage(error, fallback));
    },
    [navigate],
  );

  // GET /servers/ returns the signed-in user's server list as an array. The
  // shared Axios client supplies the Bearer token from localStorage automatically.
  useEffect(() => {
    let active = true;

    async function loadCommunities() {
      setServersLoading(true);
      setServersError("");

      try {
        const response = await api.get("/servers/");
        if (!Array.isArray(response.data)) {
          throw new Error("The communities response did not contain a list.");
        }

        if (active) {
          setServers(response.data);
          setChannels([]);
          setSelectedChannelId("");
          setMessages([]);
          setSelectedServerId((currentId) => {
            const stillAvailable = response.data.some(
              (server) => String(server.id) === currentId,
            );
            return stillAvailable
              ? currentId
              : response.data[0]
                ? String(response.data[0].id)
                : "";
          });
        }
      } catch (error) {
        if (active) {
          handleRequestError(
            error,
            setServersError,
            "Could not load your communities. Please try again.",
          );
        }
      } finally {
        if (active) {
          setServersLoading(false);
        }
      }
    }

    loadCommunities();
    return () => {
      active = false;
    };
  }, [handleRequestError]);

  // GET /servers/{id}/channels/ loads channels only for the selected community.
  // The cleanup flag ignores an older response if the user selects another one.
  useEffect(() => {
    if (!selectedServerId) {
      return undefined;
    }

    let active = true;

    async function loadChannels() {
      setChannelsLoading(true);
      setChannelsError("");
      setMessages([]);
      setSelectedChannelId("");

      try {
        const response = await api.get(
          `/servers/${selectedServerId}/channels/`,
        );
        if (!Array.isArray(response.data)) {
          throw new Error("The channels response did not contain a list.");
        }

        if (active) {
          setChannels(response.data);
          setSelectedChannelId(
            response.data[0] ? String(response.data[0].id) : "",
          );
        }
      } catch (error) {
        if (active) {
          handleRequestError(
            error,
            setChannelsError,
            "Could not load channels for this community.",
          );
        }
      } finally {
        if (active) {
          setChannelsLoading(false);
        }
      }
    }

    loadChannels();
    return () => {
      active = false;
    };
  }, [handleRequestError, selectedServerId]);

  // GET /channels/{id}/messages/ returns a cursor-paginated object with a
  // `results` array. This first dashboard view loads the first page only.
  useEffect(() => {
    if (!selectedChannelId) {
      return undefined;
    }

    let active = true;

    async function loadMessages() {
      setMessagesLoading(true);
      setMessagesError("");

      try {
        const response = await api.get(
          `/channels/${selectedChannelId}/messages/`,
        );
        const page = response.data;
        if (!Array.isArray(page?.results)) {
          throw new Error("The messages response did not contain a results list.");
        }

        if (active) {
          setMessages(page.results);
        }
      } catch (error) {
        if (active) {
          handleRequestError(
            error,
            setMessagesError,
            "Could not load messages for this channel.",
          );
        }
      } finally {
        if (active) {
          setMessagesLoading(false);
        }
      }
    }

    loadMessages();
    return () => {
      active = false;
    };
  }, [handleRequestError, selectedChannelId]);

  const selectedServer = servers.find(
    (server) => String(server.id) === selectedServerId,
  );
  const selectedChannel = channels.find(
    (channel) => String(channel.id) === selectedChannelId,
  );
  const displayName = profile?.display_name?.trim();

  // Search is intentionally limited to server names and descriptions already
  // returned by GET /servers/; Swagger does not publish global search.
  const filteredServers = servers.filter((server) => {
    const query = searchTerm.trim().toLowerCase();
    return (
      !query ||
      server.name?.toLowerCase().includes(query) ||
      server.description?.toLowerCase().includes(query)
    );
  });

  /**
   * While the modal is open, Escape closes it and Tab stays inside its controls.
   * Returning focus to the opening button helps keyboard users continue where
   * they left off after closing or completing the dialog.
   */
  useEffect(() => {
    if (!createModalOpen) {
      return undefined;
    }

    const modal = createModalRef.current;
    const firstControl = modal?.querySelector("[data-modal-autofocus]");
    firstControl?.focus();

    function handleModalKeyDown(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        if (!creating) {
          modalFocusReturnRef.current = {
            element: createTriggerRef.current,
            shouldScroll: false,
          };
          setCreateModalOpen(false);
        }
        return;
      }

      if (event.key !== "Tab" || !modal) {
        return;
      }

      const focusableElements = Array.from(
        modal.querySelectorAll(
          'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (!focusableElements.length) {
        event.preventDefault();
        return;
      }

      const first = focusableElements[0];
      const last = focusableElements[focusableElements.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleModalKeyDown);
    return () => document.removeEventListener("keydown", handleModalKeyDown);
  }, [createModalOpen, createModalStep, creating]);

  // Restore focus after React removes the dialog. The invite action uses this
  // same step to focus and scroll to the existing invite form instead.
  useEffect(() => {
    if (createModalOpen || !modalFocusReturnRef.current) {
      return;
    }

    const { element, shouldScroll } = modalFocusReturnRef.current;
    modalFocusReturnRef.current = null;
    element?.focus();
    if (shouldScroll) {
      element?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [createModalOpen]);

  function openCreateModal() {
    setCreateError("");
    setCreationSuccess("");
    setCreateModalStep("choose");
    setCreateModalOpen(true);
  }

  function closeCreateModal() {
    if (creating) {
      return;
    }

    modalFocusReturnRef.current = {
      element: createTriggerRef.current,
      shouldScroll: false,
    };
    setCreateModalOpen(false);
  }

  /**
   * A template is a convenient starting point, not a backend category. Its
   * suggested values are ordinary name/description text that the API supports.
   */
  function handleChooseTemplate(template) {
    setCommunityName(template.communityName);
    setCommunityDescription(template.description);
    setCreateError("");
    setCreateModalStep("details");
  }

  /**
   * The join action stays separate from creation and directs users to the
   * existing invite-preview form instead of making an unsupported join request.
   */
  function handleJoinFromCreateModal() {
    const inviteInput = document.getElementById("invite-code");
    modalFocusReturnRef.current = {
      element: inviteInput,
      shouldScroll: true,
    };
    setCreateModalOpen(false);
    setActiveNav("Discover");
  }

  /**
   * GET /invites/{code}/ is public and returns the confirmed invite-preview fields.
   * The preview lets the user check a community before calling the authenticated join endpoint.
   */
  async function handlePreviewInvite(event) {
    event.preventDefault();
    const code = inviteCode.trim();
    if (!code) {
      setInviteError("Enter an invite code to preview a community.");
      return;
    }

    setInviteLoading(true);
    setInviteError("");
    setInvitePreview(null);

    try {
      const response = await api.get(`/invites/${encodeURIComponent(code)}/`);
      setInvitePreview(response.data);
    } catch (error) {
      handleRequestError(
        error,
        setInviteError,
        "Could not find that invite. Check the code and try again.",
      );
    } finally {
      setInviteLoading(false);
    }
  }

  /**
   * POST /servers/join/ accepts exactly `{ invite_code }` and returns a Server.
   * The returned server is added to the community list and selected immediately.
   */
  async function handleJoinCommunity() {
    if (!inviteCode.trim() || joining) {
      return;
    }

    setJoining(true);
    setInviteError("");

    try {
      const response = await api.post("/servers/join/", {
        invite_code: inviteCode.trim(),
      });
      const joinedServer = response.data;
      setServers((currentServers) =>
        currentServers.some((server) => server.id === joinedServer.id)
          ? currentServers
          : [joinedServer, ...currentServers],
      );
      setChannels([]);
      setSelectedChannelId("");
      setMessages([]);
      setSelectedServerId(String(joinedServer.id));
      setInvitePreview(null);
      setInviteCode("");
    } catch (error) {
      handleRequestError(
        error,
        setInviteError,
        "Could not join this community. Check the invite and try again.",
      );
    } finally {
      setJoining(false);
    }
  }

  /**
   * POST /servers/ creates a community. Only the editable `name` and
   * `description` fields are sent; IDs, invite fields, and timestamps are generated.
   */
  async function handleCreateCommunity(event) {
    event.preventDefault();
    if (creating) {
      return;
    }

    if (!communityName.trim()) {
      setCreateError("A community name is required.");
      return;
    }

    setCreating(true);
    setCreateError("");
    setCreationSuccess("");

    try {
      const response = await api.post("/servers/", {
        name: communityName.trim(),
        description: communityDescription.trim(),
      });
      const createdServer = response.data;
      setServers((currentServers) => [createdServer, ...currentServers]);
      setChannels([]);
      setSelectedChannelId("");
      setMessages([]);
      setSelectedServerId(String(createdServer.id));
      setCreationSuccess(`${createdServer.name} was created successfully.`);
      setCommunityName("");
      setCommunityDescription("");
      modalFocusReturnRef.current = {
        element: createTriggerRef.current,
        shouldScroll: false,
      };
      setCreateModalOpen(false);
    } catch (error) {
      handleRequestError(
        error,
        setCreateError,
        "Could not create the community. Please try again.",
      );
    } finally {
      setCreating(false);
    }
  }

  /**
   * POST /channels/{id}/messages/ accepts `{ content }`; author, channel ID,
   * timestamp, and message ID come from the authenticated backend response.
   */
  async function handleSendMessage(event) {
    event.preventDefault();
    const content = messageDraft.trim();
    if (!selectedChannelId || !content || sendingMessage) {
      return;
    }

    setSendingMessage(true);
    setMessagesError("");

    try {
      const response = await api.post(
        `/channels/${selectedChannelId}/messages/`,
        { content },
      );
      setMessages((currentMessages) => [...currentMessages, response.data]);
      setMessageDraft("");
    } catch (error) {
      handleRequestError(
        error,
        setMessagesError,
        "Your message could not be sent. Please try again.",
      );
    } finally {
      setSendingMessage(false);
    }
  }

  /**
   * PATCH /auth/me/ updates only profile fields allowed by the PatchedUser schema.
   * The response contains the saved User and replaces the displayed profile data.
   */
  async function handleSaveProfile(event) {
    event.preventDefault();
    setSavingProfile(true);
    setProfileError("");
    setProfileMessage("");

    try {
      const response = await api.patch("/auth/me/", {
        display_name: profileDraft.display_name.trim(),
        bio: profileDraft.bio.trim(),
        status: profileDraft.status,
      });
      setProfile(response.data);
      setProfileDraft({
        display_name: response.data.display_name || "",
        bio: response.data.bio || "",
        status: response.data.status || "online",
      });
      setProfileMessage("Your profile was updated.");
    } catch (error) {
      handleRequestError(
        error,
        setProfileError,
        "Could not save your profile. Please try again.",
      );
    } finally {
      setSavingProfile(false);
    }
  }

  /**
   * Logout asks the backend to invalidate the refresh token, then always removes
   * both locally stored tokens. A server error is reported on the login screen.
   */
  async function handleLogout() {
    if (isLoggingOut) {
      return;
    }

    setIsLoggingOut(true);
    const refreshToken = localStorage.getItem("refreshToken");
    let logoutError = "";

    try {
      if (!refreshToken) {
        throw new Error("No refresh token is available to invalidate.");
      }
      await api.post("/auth/logout/", { refresh: refreshToken });
    } catch (error) {
      logoutError = getApiErrorMessage(
        error,
        "The server could not confirm logout. You have been signed out on this device.",
      );
    } finally {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      navigate("/login", {
        replace: true,
        state: logoutError ? { logoutError } : undefined,
      });
    }
  }

  const profileName = displayName || "Your profile";

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-950 lg:flex">
      {/* The fixed desktop rail becomes a wrapping navigation bar on smaller screens. */}
      <aside className="border-b border-neutral-200 bg-white px-4 py-4 lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-[250px] lg:shrink-0 lg:flex-col lg:border-b-0 lg:border-r lg:px-5 lg:py-6">
        <a
          href="#dashboard"
          onClick={() => setActiveNav("Dashboard")}
          className="mb-5 flex w-fit items-center gap-3"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-950 text-white">
            <MessageCircle size={20} />
          </span>
          <span>
            <span className="block text-sm font-bold tracking-tight">
              Smart Community
            </span>
            <span className="mt-0.5 block text-[11px] text-neutral-500">
              Find your people
            </span>
          </span>
        </a>

        <nav
          aria-label="Main navigation"
          className="flex flex-wrap gap-1 pb-1 lg:flex-col"
        >
          {navigationItems.slice(0, 4).map(({ label, href, Icon }) => (
            <a
              key={label}
              href={href}
              onClick={() => setActiveNav(label)}
              className={`flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                activeNav === label
                  ? "bg-neutral-950 text-white"
                  : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-950"
              }`}
            >
              <Icon size={17} />
              {label}
            </a>
          ))}
          <button
            type="button"
            onClick={() => {
              setActiveNav("Notifications");
              setNotificationsOpen((open) => !open);
            }}
            className={`flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition ${
              activeNav === "Notifications"
                ? "bg-neutral-950 text-white"
                : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-950"
            }`}
          >
            <Bell size={17} />
            Notifications
            <span className="ml-auto rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] text-neutral-500">
              pending
            </span>
          </button>
          {navigationItems.slice(4).map(({ label, href, Icon }) => (
            <a
              key={label}
              href={href}
              onClick={() => setActiveNav(label)}
              className={`flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                activeNav === label
                  ? "bg-neutral-950 text-white"
                  : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-950"
              }`}
            >
              <Icon size={17} />
              {label}
            </a>
          ))}
        </nav>

        <div className="mt-auto hidden border-t border-neutral-200 pt-5 lg:block">
          <div className="flex items-center gap-3">
            <UserAvatar profile={profile} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">
                {profileName}
              </span>
              <span className="block truncate text-xs text-neutral-500">
                {profile?.email || "Signed in"}
              </span>
            </span>
            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              aria-label="Log out"
              title="Log out"
              className="rounded-lg p-2 text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-950 disabled:opacity-50"
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>

      {/* The center column grows while the details rail is reserved for wide screens. */}
      <div className="min-w-0 flex-1 xl:grid xl:grid-cols-[minmax(0,1fr)_300px]">
        <main id="dashboard" className="min-w-0 px-4 py-5 sm:px-7 sm:py-7">
          <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <label className="relative min-w-[220px] flex-1 sm:max-w-md">
              <span className="sr-only">Search joined communities</span>
              <Search
                size={17}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400"
              />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search your communities"
                className="w-full rounded-xl border border-neutral-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition placeholder:text-neutral-400 focus:border-neutral-500 focus:ring-2 focus:ring-neutral-200"
              />
            </label>

            <div className="relative flex items-center gap-2">
              <button
                type="button"
                onClick={() => setNotificationsOpen((open) => !open)}
                aria-label="Notifications (not available yet)"
                className="relative rounded-xl border border-neutral-200 bg-white p-2.5 text-neutral-600 transition hover:bg-neutral-100"
              >
                <Bell size={18} />
                <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-neutral-400" />
              </button>
              <button
                type="button"
                onClick={() => setProfileMenuOpen((open) => !open)}
                aria-expanded={profileMenuOpen}
                className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-white py-1.5 pl-1.5 pr-2.5 text-sm transition hover:bg-neutral-100"
              >
                <UserAvatar profile={profile} className="h-8 w-8" />
                <span className="hidden max-w-32 truncate font-medium sm:block">
                  {profileName}
                </span>
                <ChevronDown size={15} className="text-neutral-500" />
              </button>

              {profileMenuOpen && (
                <div className="absolute right-0 top-full z-20 mt-2 w-52 rounded-xl border border-neutral-200 bg-white p-2 shadow-lg">
                  <a
                    href="#settings"
                    onClick={() => {
                      setActiveNav("Settings");
                      setProfileMenuOpen(false);
                    }}
                    className="block rounded-lg px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-100"
                  >
                    Profile settings
                  </a>
                  <button
                    type="button"
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-100 disabled:opacity-50"
                  >
                    <LogOut size={15} />
                    Log out
                  </button>
                </div>
              )}
              {notificationsOpen && (
                <div
                  role="status"
                  className="absolute right-0 top-full z-10 mt-2 w-72 rounded-xl border border-neutral-200 bg-white p-4 text-sm shadow-lg"
                >
                  <div className="mb-2 flex items-center justify-between font-semibold">
                    Notifications
                    <button
                      type="button"
                      onClick={() => setNotificationsOpen(false)}
                      aria-label="Close notifications information"
                      className="rounded-md p-1 text-neutral-500 hover:bg-neutral-100"
                    >
                      <X size={15} />
                    </button>
                  </div>
                  <p className="leading-6 text-neutral-600">
                    Notifications are not available yet because the deployed API
                    does not publish a notifications endpoint.
                  </p>
                </div>
              )}
            </div>
          </header>

          <section className="mb-9">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="mb-2 text-sm font-medium text-neutral-500">
                  Your community space
                </p>
                <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                  Welcome{displayName ? `, ${displayName}` : " back"}.
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-600">
                  Catch up with your communities and continue the conversation.
                </p>
              </div>
              <button
                type="button"
                ref={createTriggerRef}
                onClick={openCreateModal}
                className="inline-flex items-center gap-2 rounded-xl bg-neutral-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-700"
              >
                <Plus size={17} />
                Create community
              </button>
            </div>
          </section>

          <section id="my-communities" className="mb-10 scroll-mt-6">
            <SectionHeading
              eyebrow="Your spaces"
              title="My communities"
            >
              {servers.length > 0 && (
                <span className="rounded-full bg-neutral-200 px-3 py-1 text-xs font-medium text-neutral-700">
                  {servers.length} {servers.length === 1 ? "community" : "communities"}
                </span>
              )}
            </SectionHeading>

            {creationSuccess && (
                <p
                  role="status"
                  className="mb-4 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-700"
                >
                  {creationSuccess}
                </p>
            )}

            {serversLoading ? (
              <div
                role="status"
                className="rounded-2xl border border-neutral-200 bg-white p-8 text-center text-sm text-neutral-500"
              >
                Loading your communities...
              </div>
            ) : serversError ? (
              <div
                role="alert"
                className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
              >
                {serversError}
              </div>
            ) : filteredServers.length ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {filteredServers.map((server) => (
                  <CommunityCard
                    key={server.id}
                    server={server}
                    selected={String(server.id) === selectedServerId}
                    onSelect={() => {
                      setChannels([]);
                      setSelectedChannelId("");
                      setMessages([]);
                      setSelectedServerId(String(server.id));
                      setActiveNav("My communities");
                    }}
                  />
                ))}
              </div>
            ) : servers.length ? (
              <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-8 text-center">
                <p className="font-medium">No matching communities</p>
                <p className="mt-1 text-sm text-neutral-500">
                  Try a different community name or description.
                </p>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-neutral-300 bg-white px-5 py-9 text-center">
                <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-neutral-100 text-neutral-600">
                  <UsersRound size={19} />
                </span>
                <p className="mt-3 font-semibold">A little quiet in here</p>
                <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-neutral-500">
                  Join a community with an invite code or create a new space to
                  get started.
                </p>
              </div>
            )}

          </section>

          <section id="discover" className="mb-10 scroll-mt-6">
            <SectionHeading eyebrow="Find your people" title="Discover" />
            <div className="rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6">
              <div className="flex gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-neutral-700">
                  <Compass size={19} />
                </span>
                <div>
                  <h3 className="font-semibold">Join with an invite</h3>
                  <p className="mt-1 text-sm leading-6 text-neutral-600">
                    A public community directory is not available in the API.
                    Preview a community using its invite code instead.
                  </p>
                </div>
              </div>
              <form
                onSubmit={handlePreviewInvite}
                className="mt-5 flex flex-col gap-2 sm:flex-row"
              >
                <label className="sr-only" htmlFor="invite-code">
                  Community invite code
                </label>
                <input
                  id="invite-code"
                  value={inviteCode}
                  onChange={(event) => {
                    setInviteCode(event.target.value);
                    setInvitePreview(null);
                    setInviteError("");
                  }}
                  placeholder="Enter an invite code"
                  className="min-w-0 flex-1 rounded-lg border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-neutral-500 focus:ring-2 focus:ring-neutral-100"
                />
                <button
                  type="submit"
                  disabled={inviteLoading}
                  className="rounded-lg border border-neutral-300 px-4 py-2.5 text-sm font-semibold transition hover:bg-neutral-100 disabled:opacity-60"
                >
                  {inviteLoading ? "Checking..." : "Preview invite"}
                </button>
              </form>
              {inviteError && (
                <p role="alert" className="mt-3 text-sm text-red-700">
                  {inviteError}
                </p>
              )}
              {invitePreview && (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                  <div className="flex items-center gap-3">
                    {invitePreview.icon ? (
                      <img
                        src={invitePreview.icon}
                        alt=""
                        className="h-10 w-10 rounded-lg object-cover"
                      />
                    ) : (
                      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white">
                        <UsersRound size={18} />
                      </span>
                    )}
                    <span>
                      <span className="block font-semibold">
                        {invitePreview.name}
                      </span>
                      {invitePreview.description && (
                        <span className="mt-0.5 block text-sm text-neutral-600">
                          {invitePreview.description}
                        </span>
                      )}
                      <span className="mt-1 block text-xs text-neutral-500">
                        {invitePreview.member_count} members
                      </span>
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleJoinCommunity}
                    disabled={joining}
                    className="rounded-lg bg-neutral-950 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-700 disabled:opacity-60"
                  >
                    {joining ? "Joining..." : "Join community"}
                  </button>
                </div>
              )}
            </div>
          </section>

          <section id="messages" className="mb-10 scroll-mt-6">
            <SectionHeading
              eyebrow="Keep in touch"
              title="Messages"
              >
              {servers.length > 0 && (
                <span className="flex items-center gap-1.5 text-xs text-neutral-500">
                  <span className="h-2 w-2 rounded-full bg-neutral-900" />
                  Community chat
                </span>
              )}
            </SectionHeading>

            <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 bg-neutral-50 px-4 py-3">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-neutral-700">
                    <Hash size={17} />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">
                      {selectedChannel?.name || "Choose a channel"}
                    </span>
                    <span className="block truncate text-xs text-neutral-500">
                      {selectedServer?.name || "No community selected"}
                    </span>
                  </span>
                </div>
                {channels.length > 0 && (
                  <label className="sr-only" htmlFor="channel-select">
                    Select a channel
                  </label>
                )}
                {channels.length > 0 && (
                  <select
                    id="channel-select"
                    value={selectedChannelId}
                    onChange={(event) =>
                      setSelectedChannelId(event.target.value)
                    }
                    className="max-w-48 rounded-lg border border-neutral-200 bg-white px-2.5 py-2 text-xs text-neutral-700 outline-none focus:border-neutral-500"
                  >
                    {channels.map((channel) => (
                      <option key={channel.id} value={String(channel.id)}>
                        #{channel.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div
                aria-live="polite"
                className="flex min-h-64 flex-col gap-4 p-4 sm:p-5"
              >
                {channelsLoading || messagesLoading ? (
                  <p role="status" className="m-auto text-sm text-neutral-500">
                    Loading conversation...
                  </p>
                ) : messagesError ? (
                  <p role="alert" className="m-auto text-sm text-red-700">
                    {messagesError}
                  </p>
                ) : channelsError ? (
                  <p role="alert" className="m-auto text-sm text-red-700">
                    {channelsError}
                  </p>
                ) : !selectedServer ? (
                  <div className="m-auto max-w-sm text-center">
                    <MessageCircle className="mx-auto text-neutral-400" size={23} />
                    <p className="mt-3 text-sm font-medium">
                      Join or create a community to start chatting.
                    </p>
                  </div>
                ) : !channels.length ? (
                  <div className="m-auto max-w-sm text-center">
                    <Hash className="mx-auto text-neutral-400" size={22} />
                    <p className="mt-3 text-sm font-medium">
                      No channels are available in this community yet.
                    </p>
                  </div>
                ) : !messages.length ? (
                  <p className="m-auto text-center text-sm text-neutral-500">
                    No messages in this channel yet. Start the conversation.
                  </p>
                ) : (
                  messages.map((message) => (
                    <article
                      key={message.id}
                      className="flex items-start gap-3"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-xs font-semibold text-neutral-700">
                        {message.author?.display_name?.[0]?.toUpperCase() || "?"}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                          <span className="text-sm font-semibold">
                            {message.author?.display_name || "Community member"}
                          </span>
                          <time
                            dateTime={message.created_at}
                            className="text-[11px] text-neutral-400"
                          >
                            {new Date(message.created_at).toLocaleString()}
                          </time>
                        </div>
                        <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-neutral-700">
                          {message.content}
                        </p>
                      </div>
                    </article>
                  ))
                )}
              </div>

              <form
                onSubmit={handleSendMessage}
                className="flex gap-2 border-t border-neutral-200 p-3 sm:p-4"
              >
                <label className="sr-only" htmlFor="message-draft">
                  Write a message
                </label>
                <input
                  id="message-draft"
                  maxLength={2000}
                  value={messageDraft}
                  onChange={(event) => setMessageDraft(event.target.value)}
                  disabled={!selectedChannelId || sendingMessage}
                  placeholder={
                    selectedChannelId
                      ? `Message #${selectedChannel?.name || "channel"}`
                      : "Choose a channel to message"
                  }
                  className="min-w-0 flex-1 rounded-lg border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-neutral-500 focus:ring-2 focus:ring-neutral-100 disabled:bg-neutral-50"
                />
                <button
                  type="submit"
                  disabled={!selectedChannelId || !messageDraft.trim() || sendingMessage}
                  aria-label="Send message"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-neutral-950 text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:bg-neutral-300"
                >
                  <Send size={16} />
                </button>
              </form>
            </div>
          </section>

          <section id="settings" className="scroll-mt-6">
            <SectionHeading eyebrow="Your account" title="Profile settings" />
            <form
              onSubmit={handleSaveProfile}
              className="rounded-2xl border border-neutral-200 bg-white p-4 sm:p-5"
            >
              <div className="mb-5 flex items-center gap-3">
                <UserAvatar profile={profile} />
                <span>
                  <span className="block text-sm font-semibold">
                    {profileName}
                  </span>
                  <span className="block text-xs text-neutral-500">
                    {profile?.email || "Account profile"}
                  </span>
                </span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-xs font-medium text-neutral-600">
                  Display name
                  <input
                    required
                    maxLength={50}
                    value={profileDraft.display_name}
                    onChange={(event) =>
                      setProfileDraft((current) => ({
                        ...current,
                        display_name: event.target.value,
                      }))
                    }
                    className="mt-1.5 w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm text-neutral-950 outline-none focus:border-neutral-500 focus:ring-2 focus:ring-neutral-100"
                  />
                </label>
                <label className="text-xs font-medium text-neutral-600">
                  Status
                  <select
                    value={profileDraft.status}
                    onChange={(event) =>
                      setProfileDraft((current) => ({
                        ...current,
                        status: event.target.value,
                      }))
                    }
                    className="mt-1.5 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-950 outline-none focus:border-neutral-500 focus:ring-2 focus:ring-neutral-100"
                  >
                    <option value="online">Online</option>
                    <option value="away">Away</option>
                    <option value="dnd">Do not disturb</option>
                  </select>
                </label>
                <label className="text-xs font-medium text-neutral-600 sm:col-span-2">
                  Bio
                  <textarea
                    maxLength={200}
                    rows={3}
                    value={profileDraft.bio}
                    onChange={(event) =>
                      setProfileDraft((current) => ({
                        ...current,
                        bio: event.target.value,
                      }))
                    }
                    className="mt-1.5 w-full resize-y rounded-lg border border-neutral-200 px-3 py-2.5 text-sm text-neutral-950 outline-none focus:border-neutral-500 focus:ring-2 focus:ring-neutral-100"
                  />
                </label>
              </div>
              {profileError && (
                <p role="alert" className="mt-3 text-sm text-red-700">
                  {profileError}
                </p>
              )}
              {profileMessage && (
                <p role="status" className="mt-3 text-sm text-neutral-700">
                  {profileMessage}
                </p>
              )}
              <button
                type="submit"
                disabled={savingProfile}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-neutral-950 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-neutral-700 disabled:opacity-60"
              >
                {savingProfile ? "Saving..." : "Save profile"}
                {!savingProfile && <Check size={15} />}
              </button>
            </form>
          </section>
        </main>

        {/* This contextual rail is hidden on narrow screens to keep the main content readable. */}
        <aside className="hidden border-l border-neutral-200 bg-white px-5 py-7 xl:block">
          <div className="sticky top-7 space-y-7">
            <section>
              <SectionHeading eyebrow="Selected space" title="Community info" />
              {selectedServer ? (
                <div className="rounded-2xl border border-neutral-200 p-4">
                  {selectedServer.icon ? (
                    <img
                      src={selectedServer.icon}
                      alt=""
                      className="mb-4 h-12 w-12 rounded-xl border border-neutral-200 object-cover"
                    />
                  ) : (
                    <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-950 text-white">
                      <UsersRound size={20} />
                    </span>
                  )}
                  <h3 className="font-semibold">{selectedServer.name}</h3>
                  <p className="mt-2 text-sm leading-6 text-neutral-600">
                    {selectedServer.description || "No description provided."}
                  </p>
                  {selectedServer.created_at && (
                    <p className="mt-4 border-t border-neutral-100 pt-3 text-xs text-neutral-500">
                      Created{" "}
                      {new Date(selectedServer.created_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
              ) : (
                <p className="rounded-2xl border border-dashed border-neutral-300 p-4 text-sm leading-6 text-neutral-500">
                  Select a community to see its details here.
                </p>
              )}
            </section>

            <section>
              <SectionHeading eyebrow="In this community" title="Channels" />
              {channelsLoading ? (
                <p role="status" className="text-sm text-neutral-500">
                  Loading channels...
                </p>
              ) : channelsError ? (
                <p role="alert" className="text-sm text-red-700">
                  {channelsError}
                </p>
              ) : channels.length ? (
                <ul className="space-y-1">
                  {channels.map((channel) => (
                    <li key={channel.id}>
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedChannelId(String(channel.id))
                        }
                        className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm ${
                          selectedChannelId === String(channel.id)
                            ? "bg-neutral-100 font-medium text-neutral-950"
                            : "text-neutral-600 hover:bg-neutral-50"
                        }`}
                      >
                        <Hash size={15} className="text-neutral-400" />
                        <span className="truncate">{channel.name}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm leading-6 text-neutral-500">
                  Channels appear here when the selected community has them.
                </p>
              )}
            </section>

            <section className="rounded-2xl bg-neutral-950 p-4 text-white">
              <div className="mb-3 flex items-center gap-2">
                <CircleAlert size={16} />
                <h3 className="text-sm font-semibold">API availability</h3>
              </div>
              <p className="text-xs leading-5 text-neutral-300">
                Notifications, posts, comments, member directory, and global
                search are pending because the deployed API does not document
                endpoints for them.
              </p>
            </section>
          </div>
        </aside>
      </div>

      {createModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-neutral-950/60 p-3 backdrop-blur-[2px] sm:p-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeCreateModal();
            }
          }}
        >
          <section
            ref={createModalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-community-title"
            aria-describedby="create-community-description"
            aria-busy={creating}
            tabIndex={-1}
            className="my-auto w-full max-w-xl overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl outline-none"
          >
            <header className="flex items-start justify-between gap-4 border-b border-neutral-100 px-5 py-5 sm:px-7">
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
                  Smart Community
                </p>
                <h2
                  id="create-community-title"
                  className="text-xl font-semibold tracking-tight sm:text-2xl"
                >
                  {createModalStep === "choose"
                    ? "Create Your Community"
                    : "Tell us about your community"}
                </h2>
                <p
                  id="create-community-description"
                  className="mt-2 max-w-md text-sm leading-6 text-neutral-600"
                >
                  {createModalStep === "choose"
                    ? "A community is a place to bring people together around shared interests, ideas, and conversations."
                    : "Choose a name that feels right. You can add a short description to help people understand what your community is about."}
                </p>
              </div>
              <button
                type="button"
                onClick={closeCreateModal}
                disabled={creating}
                aria-label="Close create community dialog"
                className="shrink-0 rounded-lg p-2 text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <X size={19} />
              </button>
            </header>

            {createModalStep === "choose" ? (
              <div className="px-5 py-5 sm:px-7 sm:py-6">
                <button
                  type="button"
                  data-modal-autofocus="true"
                  onClick={() => {
                    setCreateError("");
                    setCreateModalStep("details");
                  }}
                  className="group flex w-full items-center justify-between gap-4 rounded-xl border border-neutral-300 bg-neutral-50 p-4 text-left transition hover:border-neutral-500 hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500"
                >
                  <span className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-neutral-950 text-white">
                      <Plus size={21} />
                    </span>
                    <span>
                      <span className="block font-semibold text-neutral-950">
                        Create My Own
                      </span>
                      <span className="mt-1 block text-xs text-neutral-500">
                        Start with a name and make it your own.
                      </span>
                    </span>
                  </span>
                  <ChevronRight
                    size={19}
                    className="shrink-0 text-neutral-400 transition group-hover:translate-x-0.5 group-hover:text-neutral-950"
                  />
                </button>

                <div className="mt-6">
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
                    Start from a template
                  </h3>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {communityTemplates.map(({ name, Icon, ...template }) => (
                      <button
                        key={name}
                        type="button"
                        onClick={() => handleChooseTemplate(template)}
                        className="group flex items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white px-3.5 py-3 text-left transition hover:border-neutral-400 hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500"
                      >
                        <span className="flex items-center gap-3">
                          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-100 text-neutral-700">
                            <Icon size={17} />
                          </span>
                          <span className="text-sm font-medium text-neutral-800">
                            {name}
                          </span>
                        </span>
                        <ChevronRight
                          size={17}
                          className="shrink-0 text-neutral-400 transition group-hover:translate-x-0.5 group-hover:text-neutral-950"
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-neutral-100 pt-4">
                  <p className="text-sm text-neutral-600">
                    Already have an invitation?
                  </p>
                  <button
                    type="button"
                    onClick={handleJoinFromCreateModal}
                    className="rounded-lg px-3 py-2 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500"
                  >
                    Join a Community
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateCommunity} className="px-5 py-5 sm:px-7 sm:py-6">
                <div className="space-y-4">
                  <label
                    htmlFor="new-community-name"
                    className="block text-sm font-medium text-neutral-800"
                  >
                    Community name <span aria-hidden="true">*</span>
                    <input
                      id="new-community-name"
                      data-modal-autofocus="true"
                      required
                      maxLength={100}
                      value={communityName}
                      onChange={(event) => {
                        setCommunityName(event.target.value);
                        setCreateError("");
                      }}
                      placeholder="Give your community a name"
                      aria-invalid={Boolean(createError)}
                      aria-describedby={
                        createError ? "community-create-error" : undefined
                      }
                      className="mt-2 w-full rounded-xl border border-neutral-300 px-3.5 py-3 text-sm text-neutral-950 outline-none transition placeholder:text-neutral-400 focus:border-neutral-600 focus:ring-2 focus:ring-neutral-200"
                    />
                  </label>

                  <label
                    htmlFor="new-community-description"
                    className="block text-sm font-medium text-neutral-800"
                  >
                    Description{" "}
                    <span className="font-normal text-neutral-500">
                      (optional)
                    </span>
                    <textarea
                      id="new-community-description"
                      rows={3}
                      value={communityDescription}
                      onChange={(event) =>
                        setCommunityDescription(event.target.value)
                      }
                      placeholder="What will people talk about here?"
                      className="mt-2 w-full resize-y rounded-xl border border-neutral-300 px-3.5 py-3 text-sm text-neutral-950 outline-none transition placeholder:text-neutral-400 focus:border-neutral-600 focus:ring-2 focus:ring-neutral-200"
                    />
                  </label>
                </div>

                {createError && (
                  <p
                    id="community-create-error"
                    role="alert"
                    className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800"
                  >
                    {createError}
                  </p>
                )}

                <footer className="mt-6 flex flex-col-reverse justify-between gap-3 border-t border-neutral-100 pt-4 sm:flex-row">
                  <button
                    type="button"
                    disabled={creating}
                    onClick={() => {
                      setCreateError("");
                      setCreateModalStep("choose");
                    }}
                    className="rounded-lg border border-neutral-300 px-4 py-2.5 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-neutral-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
                  >
                    {creating ? "Creating..." : "Create Community"}
                  </button>
                </footer>
              </form>
            )}
          </section>
        </div>
      )}

      {/* Mobile users also need the account controls that sit at the desktop rail's bottom. */}
      <div className="border-t border-neutral-200 bg-white px-4 py-3 lg:hidden">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <UserAvatar profile={profile} className="h-9 w-9" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold">
              {profileName}
            </span>
            <span className="block truncate text-xs text-neutral-500">
              {profile?.email || "Signed in"}
            </span>
          </span>
          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100 disabled:opacity-50"
          >
            <LogOut size={15} />
            {isLoggingOut ? "Logging out..." : "Log out"}
          </button>
        </div>
      </div>
    </div>
  );
}
