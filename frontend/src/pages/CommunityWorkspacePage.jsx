import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  Hash,
  LoaderCircle,
  Menu,
  MessageCircle,
  Pencil,
  Plus,
  Send,
  Trash2,
  UsersRound,
  X,
} from "lucide-react";
import api from "../services/api";
import "./CommunityWorkspacePage.css";

function getApiErrorMessage(error, fallback) {
  const detail = error.response?.data?.detail || error.response?.data?.message;
  return typeof detail === "string" ? detail : error.message || fallback;
}

function getChannelServerId(channel) {
  const server = channel?.server ?? channel?.server_id;
  if (server && typeof server === "object") {
    return server.id == null ? null : String(server.id);
  }
  return server == null ? null : String(server);
}

function canModifyMessage(message, profile) {
  return (
    message?.id != null &&
    profile?.id != null &&
    message.author?.id != null &&
    String(message.author.id) === String(profile.id)
  );
}

/**
 * The route parameter is the active community's source of truth. The profile
 * arrives from App's existing protected route, while this page loads that
 * user's communities, the route community's channels, and the selected channel's messages.
 */
export default function CommunityWorkspacePage({ profile }) {
  const { serverId = "" } = useParams();
  const navigate = useNavigate();
  const [servers, setServers] = useState([]);
  const [serversLoading, setServersLoading] = useState(true);
  const [serversError, setServersError] = useState("");
  const [serversRefreshKey, setServersRefreshKey] = useState(0);
  const [channels, setChannels] = useState([]);
  const [channelsServerId, setChannelsServerId] = useState("");
  const [selectedChannelId, setSelectedChannelId] = useState("");
  const [channelsLoading, setChannelsLoading] = useState(false);
  const [channelsError, setChannelsError] = useState("");
  const [channelRefreshKey, setChannelRefreshKey] = useState(0);
  const [messages, setMessages] = useState([]);
  const [messagesChannelId, setMessagesChannelId] = useState("");
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState("");
  const [messagesRefreshKey, setMessagesRefreshKey] = useState(0);
  const [messageDraft, setMessageDraft] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState("");
  const [editingMessageServerId, setEditingMessageServerId] = useState("");
  const [editingMessageChannelId, setEditingMessageChannelId] = useState("");
  const [editMessageDraft, setEditMessageDraft] = useState("");
  const [editMessageError, setEditMessageError] = useState("");
  const [savingMessageId, setSavingMessageId] = useState("");
  const [messageToDelete, setMessageToDelete] = useState(null);
  const [deleteMessageError, setDeleteMessageError] = useState("");
  const [deletingMessageId, setDeletingMessageId] = useState("");
  const [createChannelOpen, setCreateChannelOpen] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [createChannelError, setCreateChannelError] = useState("");
  const [channelSuccess, setChannelSuccess] = useState("");
  const [creatingChannel, setCreatingChannel] = useState(false);
  const [mobileChannelsOpen, setMobileChannelsOpen] = useState(false);
  const selectedServerIdRef = useRef(serverId);
  const selectedChannelIdRef = useRef(selectedChannelId);
  const savingMessageIdRef = useRef("");
  const deletingMessageIdRef = useRef("");
  const pendingCreatedChannelRef = useRef(null);
  const createChannelDialogRef = useRef(null);
  const createChannelInputRef = useRef(null);
  const createChannelTriggerRef = useRef(null);
  const restoreChannelTriggerRef = useRef(false);
  const deleteMessageDialogRef = useRef(null);
  const deleteMessageCancelRef = useRef(null);
  const deleteMessageTriggerRef = useRef(null);
  const messageComposerRef = useRef(null);
  const restoreDeleteMessageTriggerRef = useRef(false);

  // The refs let asynchronous requests check the latest route and channel
  // without allowing a response for an old selection to overwrite current UI.
  useEffect(() => {
    selectedServerIdRef.current = serverId;
    selectedChannelIdRef.current = selectedChannelId;
  }, [selectedChannelId, serverId]);

  const handleRequestError = useCallback(
    (error, setError, fallback) => {
      if (error.response?.status === 401 || error.response?.status === 403) {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        navigate("/login", { replace: true });
        return;
      }
      setError(getApiErrorMessage(error, fallback));
    },
    [navigate],
  );

  // The user's server list identifies whether a direct URL points to an
  // accessible community. No server details or members are invented locally.
  useEffect(() => {
    let active = true;

    async function loadServers() {
      setServersLoading(true);
      setServersError("");
      try {
        const response = await api.get("/servers/");
        if (!Array.isArray(response.data)) {
          throw new Error("The communities response did not contain a list.");
        }
        if (active) {
          setServers(response.data);
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

    loadServers();
    return () => {
      active = false;
    };
  }, [handleRequestError, serversRefreshKey]);

  const selectedServer = servers.find(
    (server) => String(server.id) === serverId,
  );

  // This effect only displays channels returned by the selected server's
  // endpoint. Explicitly server-tagged items from a mismatched response are ignored.
  useEffect(() => {
    if (!selectedServer || !serverId) {
      return undefined;
    }

    let active = true;
    const previousChannelId = selectedChannelIdRef.current;

    async function loadChannels() {
      setChannelsLoading(true);
      setChannelsError("");
      setChannels([]);
      setChannelsServerId("");
      setSelectedChannelId("");
      setMessages([]);
      setMessagesChannelId("");
      setMessagesError("");
      setMessagesLoading(false);

      try {
        const response = await api.get(
          `/servers/${encodeURIComponent(serverId)}/channels/`,
        );
        if (!Array.isArray(response.data)) {
          throw new Error("The channels response did not contain a list.");
        }

        const communityChannels = response.data.filter((channel) => {
          if (
            !channel ||
            (typeof channel.id !== "string" &&
              typeof channel.id !== "number") ||
            !String(channel.id).trim()
          ) {
            return false;
          }
          const channelServerId = getChannelServerId(channel);
          return channelServerId == null || channelServerId === serverId;
        });

        if (
          active &&
          selectedServerIdRef.current === serverId
        ) {
          setChannels(communityChannels);
          setChannelsServerId(serverId);

          const pendingCreatedChannel = pendingCreatedChannelRef.current;
          const createdChannel =
            pendingCreatedChannel?.serverId === serverId
              ? communityChannels.find(
                  (channel) =>
                    String(channel.id) === pendingCreatedChannel.channelId,
                )
              : null;
          pendingCreatedChannelRef.current = null;

          const previousChannel = communityChannels.find(
            (channel) => String(channel.id) === previousChannelId,
          );
          const channelToSelect =
            createdChannel || previousChannel || communityChannels[0];
          const nextChannelId = channelToSelect
            ? String(channelToSelect.id)
            : "";
          selectedChannelIdRef.current = nextChannelId;
          setSelectedChannelId(nextChannelId);
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
  }, [channelRefreshKey, handleRequestError, selectedServer, serverId]);

  const availableChannels =
    channelsServerId === serverId ? channels : [];
  const selectedChannel = availableChannels.find(
    (channel) => String(channel.id) === selectedChannelId,
  );

  // A selected channel can load messages only after it has been confirmed to
  // belong to the route community's current channel list.
  useEffect(() => {
    if (!selectedChannel || !serverId) {
      return undefined;
    }

    let active = true;
    const channelId = String(selectedChannel.id);

    async function loadMessages() {
      setMessagesLoading(true);
      setMessagesError("");
      setMessages([]);
      setMessagesChannelId("");

      try {
        const response = await api.get(
          `/channels/${encodeURIComponent(channelId)}/messages/`,
        );
        if (!Array.isArray(response.data?.results)) {
          throw new Error("The messages response did not contain a results list.");
        }
        if (
          active &&
          selectedServerIdRef.current === serverId &&
          selectedChannelIdRef.current === channelId
        ) {
          setMessages(response.data.results);
          setMessagesChannelId(channelId);
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
  }, [handleRequestError, messagesRefreshKey, selectedChannel, serverId]);

  useEffect(() => {
    if (!createChannelOpen) {
      if (restoreChannelTriggerRef.current) {
        restoreChannelTriggerRef.current = false;
        createChannelTriggerRef.current?.focus();
      }
      return undefined;
    }

    createChannelInputRef.current?.focus();

    function handleDialogKeyDown(event) {
      if (event.key === "Escape" && !creatingChannel) {
        event.preventDefault();
        restoreChannelTriggerRef.current = true;
        setCreateChannelOpen(false);
        return;
      }
      if (event.key !== "Tab") {
        return;
      }

      const dialog = createChannelDialogRef.current;
      const focusable = dialog?.querySelectorAll(
        'button:not([disabled]), input:not([disabled])',
      );
      if (!focusable?.length) {
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleDialogKeyDown);
    return () => document.removeEventListener("keydown", handleDialogKeyDown);
  }, [createChannelOpen, creatingChannel]);

  useEffect(() => {
    if (!messageToDelete) {
      if (restoreDeleteMessageTriggerRef.current) {
        restoreDeleteMessageTriggerRef.current = false;
        if (deleteMessageTriggerRef.current?.isConnected) {
          deleteMessageTriggerRef.current.focus();
        } else {
          messageComposerRef.current?.focus();
        }
      }
      return undefined;
    }

    deleteMessageCancelRef.current?.focus();

    function handleDialogKeyDown(event) {
      if (event.key === "Escape" && !deletingMessageId) {
        event.preventDefault();
        closeDeleteMessageDialog();
        return;
      }
      if (event.key !== "Tab") {
        return;
      }

      const dialog = deleteMessageDialogRef.current;
      const focusable = dialog?.querySelectorAll(
        'button:not([disabled]), textarea:not([disabled])',
      );
      if (!focusable?.length) {
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleDialogKeyDown);
    return () => document.removeEventListener("keydown", handleDialogKeyDown);
  }, [deletingMessageId, messageToDelete]);

  function selectChannel(channel) {
    const channelId = String(channel.id);
    if (channelId === selectedChannelId) {
      setMobileChannelsOpen(false);
      return;
    }

    selectedChannelIdRef.current = channelId;
    setSelectedChannelId(channelId);
    setMessages([]);
    setMessagesChannelId("");
    setMessagesError("");
    setEditingMessageId("");
    setEditingMessageServerId("");
    setEditingMessageChannelId("");
    setEditMessageDraft("");
    setEditMessageError("");
    setMessageToDelete(null);
    setDeleteMessageError("");
    setMobileChannelsOpen(false);
  }

  function openCreateChannel(event) {
    createChannelTriggerRef.current = event.currentTarget;
    setNewChannelName("");
    setCreateChannelError("");
    setChannelSuccess("");
    setCreateChannelOpen(true);
  }

  async function handleCreateChannel(event) {
    event.preventDefault();
    const name = newChannelName.trim();
    if (!selectedServer || !name || creatingChannel) {
      if (!name) {
        setCreateChannelError("A channel name is required.");
      }
      return;
    }

    const targetServerId = String(selectedServer.id);
    setCreatingChannel(true);
    setCreateChannelError("");
    setChannelSuccess("");

    try {
      const response = await api.post(
        `/servers/${encodeURIComponent(targetServerId)}/channels/`,
        { name },
      );
      const createdChannelId =
        typeof response.data?.id === "string" ||
        typeof response.data?.id === "number"
          ? String(response.data.id)
          : "";
      const responseServerId = getChannelServerId(response.data);

      pendingCreatedChannelRef.current =
        createdChannelId &&
        (responseServerId == null || responseServerId === targetServerId) &&
        selectedServerIdRef.current === targetServerId
          ? { serverId: targetServerId, channelId: createdChannelId }
          : null;

      setChannelSuccess(`#${name} was created successfully.`);
      setChannelRefreshKey((currentKey) => currentKey + 1);
      setNewChannelName("");
      restoreChannelTriggerRef.current = true;
      setCreateChannelOpen(false);
    } catch (error) {
      handleRequestError(
        error,
        setCreateChannelError,
        "Could not create this channel. Please try again.",
      );
    } finally {
      setCreatingChannel(false);
    }
  }

  async function handleSendMessage(event) {
    event.preventDefault();
    const content = messageDraft.trim();
    if (!selectedChannel || !content || sendingMessage) {
      return;
    }

    const channelId = String(selectedChannel.id);
    const messageServerId = serverId;
    setSendingMessage(true);
    setMessagesError("");

    try {
      const response = await api.post(
        `/channels/${encodeURIComponent(channelId)}/messages/`,
        { content },
      );
      if (
        selectedServerIdRef.current === messageServerId &&
        selectedChannelIdRef.current === channelId
      ) {
        setMessages((currentMessages) =>
          messagesChannelId === channelId
            ? [...currentMessages, response.data]
            : [response.data],
        );
        setMessagesChannelId(channelId);
        setMessageDraft("");
      }
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

  function startEditingMessage(message) {
    if (!canModifyMessage(message, profile)) {
      return;
    }

    setEditingMessageId(String(message.id));
    setEditingMessageServerId(serverId);
    setEditingMessageChannelId(String(selectedChannel?.id || ""));
    setEditMessageDraft(message.content || "");
    setEditMessageError("");
    setMessageToDelete(null);
    setDeleteMessageError("");
  }

  async function handleEditMessage(event, message) {
    event.preventDefault();
    const content = editMessageDraft.trim();
    const messageId = String(message.id);
    const channelId = String(selectedChannel?.id || "");
    const targetServerId = serverId;
    if (
      !selectedChannel ||
      !content ||
      savingMessageIdRef.current ||
      !canModifyMessage(message, profile)
    ) {
      if (!content) {
        setEditMessageError("Message content cannot be empty.");
      }
      return;
    }

    savingMessageIdRef.current = messageId;
    setSavingMessageId(messageId);
    setEditMessageError("");

    try {
      const response = await api.patch(
        `/messages/${encodeURIComponent(messageId)}/`,
        { content },
      );
      if (
        selectedServerIdRef.current === targetServerId &&
        selectedChannelIdRef.current === channelId
      ) {
        const updatedMessage =
          response.data &&
          typeof response.data === "object" &&
          String(response.data.id) === messageId
            ? response.data
            : null;
        setMessages((currentMessages) =>
          currentMessages.map((currentMessage) =>
            String(currentMessage.id) === messageId
              ? updatedMessage
                ? { ...currentMessage, ...updatedMessage, id: currentMessage.id }
                : { ...currentMessage, content }
              : currentMessage,
          ),
        );
      }
      setEditingMessageId("");
      setEditingMessageServerId("");
      setEditingMessageChannelId("");
      setEditMessageDraft("");
    } catch (error) {
      const canReportEditError =
        selectedServerIdRef.current === targetServerId &&
        selectedChannelIdRef.current === channelId;
      handleRequestError(
        error,
        (message) => {
          if (canReportEditError) {
            setEditMessageError(message);
          }
        },
        "Could not update this message. Please try again.",
      );
    } finally {
      savingMessageIdRef.current = "";
      setSavingMessageId("");
    }
  }

  function requestDeleteMessage(message, event) {
    if (!canModifyMessage(message, profile)) {
      return;
    }

    deleteMessageTriggerRef.current = event.currentTarget;
    setEditingMessageId("");
    setEditMessageDraft("");
    setEditMessageError("");
    setMessageToDelete({
      ...message,
      serverId,
      channelId: String(selectedChannel?.id || ""),
    });
    setDeleteMessageError("");
  }

  function closeDeleteMessageDialog() {
    if (deletingMessageIdRef.current) {
      return;
    }
    restoreDeleteMessageTriggerRef.current = true;
    setMessageToDelete(null);
    setDeleteMessageError("");
  }

  async function handleDeleteMessage() {
    if (!messageToDelete || deletingMessageIdRef.current) {
      return;
    }

    const messageId = String(messageToDelete.id);
    const targetServerId = messageToDelete.serverId;
    const targetChannelId = messageToDelete.channelId;
    if (
      selectedServerIdRef.current !== targetServerId ||
      selectedChannelIdRef.current !== targetChannelId ||
      !canModifyMessage(messageToDelete, profile)
    ) {
      setMessageToDelete(null);
      return;
    }

    deletingMessageIdRef.current = messageId;
    setDeletingMessageId(messageId);
    setDeleteMessageError("");

    try {
      await api.delete(`/messages/${encodeURIComponent(messageId)}/`);
      if (
        selectedServerIdRef.current === targetServerId &&
        selectedChannelIdRef.current === targetChannelId
      ) {
        setMessages((currentMessages) =>
          currentMessages.filter(
            (currentMessage) => String(currentMessage.id) !== messageId,
          ),
        );
      }
      setMessageToDelete(null);
      restoreDeleteMessageTriggerRef.current = true;
    } catch (error) {
      const canReportDeleteError =
        selectedServerIdRef.current === targetServerId &&
        selectedChannelIdRef.current === targetChannelId;
      handleRequestError(
        error,
        (message) => {
          if (canReportDeleteError) {
            setDeleteMessageError(message);
          }
        },
        "Could not delete this message. Please try again.",
      );
    } finally {
      deletingMessageIdRef.current = "";
      setDeletingMessageId("");
    }
  }

  const displayedMessages =
    messagesChannelId === String(selectedChannel?.id)
      ? messages
      : [];
  const profileName = profile?.display_name?.trim() || "Your profile";

  return (
    <div className="community-workspace flex h-dvh min-h-[520px] flex-col overflow-hidden bg-neutral-100 text-neutral-950 lg:flex-row">
      <aside
        aria-label="Community navigation"
        className="z-30 flex h-16 shrink-0 items-center gap-2 overflow-x-auto border-b border-neutral-200 bg-white px-3 lg:h-screen lg:w-[76px] lg:flex-col lg:items-center lg:overflow-x-visible lg:overflow-y-auto lg:border-b-0 lg:border-r lg:px-2 lg:py-4"
      >
        <Link
          to="/dashboard"
          aria-label="Back to dashboard"
          title="Back to dashboard"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-950 text-white transition hover:bg-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500"
        >
          <ArrowLeft size={18} />
        </Link>
        <span className="mx-1 h-8 w-px shrink-0 bg-neutral-200 lg:my-1 lg:h-px lg:w-10" />

        {serversLoading ? (
          <span role="status" className="px-2 text-xs text-neutral-500 lg:sr-only">
            Loading communities
          </span>
        ) : serversError ? (
          <button
            type="button"
            onClick={() => setServersRefreshKey((key) => key + 1)}
            className="shrink-0 rounded-lg px-2 py-1 text-xs text-red-700 hover:bg-red-50 lg:sr-only"
          >
            Retry loading communities
          </button>
        ) : (
          servers.map((server) => {
            const active = String(server.id) === serverId;
            return (
              <button
                key={server.id}
                type="button"
                onClick={() =>
                  navigate(
                    `/dashboard/communities/${encodeURIComponent(server.id)}`,
                  )
                }
                aria-label={server.name}
                aria-current={active ? "page" : undefined}
                title={server.name}
                className={`relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 ${
                  active
                    ? "border-neutral-950 bg-neutral-950 text-white"
                    : "border-neutral-200 bg-neutral-50 text-neutral-700 hover:border-neutral-400 hover:bg-neutral-100"
                }`}
              >
                {server.icon ? (
                  <img
                    src={server.icon}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <UsersRound size={18} aria-hidden="true" />
                )}
              </button>
            );
          })
        )}
      </aside>

      <aside className="relative z-20 flex min-h-0 shrink-0 flex-col border-b border-neutral-200 bg-white lg:h-screen lg:w-64 lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between gap-3 border-b border-neutral-200 px-4 py-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-neutral-500">
              Smart Community
            </p>
            <h1 className="mt-1 truncate text-base font-semibold">
              {selectedServer?.name || "Community"}
            </h1>
          </div>
          <button
            type="button"
            onClick={openCreateChannel}
            disabled={!selectedServer || creatingChannel}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-neutral-950 text-white transition hover:bg-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Create channel"
            title="Create channel"
          >
            <Plus size={17} />
          </button>
        </div>

        <div
          className={`${
            mobileChannelsOpen ? "flex" : "hidden"
          } absolute left-0 right-0 top-full z-20 max-h-[55vh] flex-col overflow-y-auto border-b border-neutral-200 bg-white shadow-xl lg:static lg:flex lg:max-h-none lg:flex-1 lg:border-0 lg:shadow-none`}
        >
          <div className="flex items-center justify-between px-4 pb-2 pt-4">
            <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
              Channels
            </h2>
            <Link
              to="/dashboard#my-communities"
              className="text-xs font-medium text-neutral-600 underline-offset-4 hover:text-neutral-950 hover:underline"
            >
              Manage
            </Link>
          </div>

          {channelsLoading ? (
            <p role="status" className="px-4 py-3 text-sm text-neutral-500">
              Loading channels...
            </p>
          ) : channelsError ? (
            <div className="px-4 py-3">
              <p role="alert" className="text-sm text-red-700">
                {channelsError}
              </p>
              <button
                type="button"
                onClick={() => setChannelRefreshKey((key) => key + 1)}
                className="mt-2 text-sm font-medium text-neutral-700 underline hover:text-neutral-950"
              >
                Try again
              </button>
            </div>
          ) : availableChannels.length ? (
            <ul className="space-y-1 px-2 pb-4">
              {availableChannels.map((channel) => {
                const active = String(channel.id) === selectedChannelId;
                return (
                  <li key={channel.id}>
                    <button
                      type="button"
                      onClick={() => selectChannel(channel)}
                      aria-current={active ? "page" : undefined}
                      className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 ${
                        active
                          ? "bg-neutral-950 font-medium text-white"
                          : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-950"
                      }`}
                    >
                      <Hash size={15} />
                      <span className="truncate">{channel.name}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="px-4 py-3 text-sm leading-6 text-neutral-500">
              {selectedServer
                ? "No channels in this community yet. Create one to start chatting."
                : "Select a community to view its channels."}
            </p>
          )}

          <div className="mt-auto hidden border-t border-neutral-200 p-3 lg:block">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-950 text-xs font-semibold text-white">
                {profileName
                  .split(/\s+/)
                  .slice(0, 2)
                  .map((part) => part[0])
                  .join("")
                  .toUpperCase()}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">
                  {profileName}
                </span>
                <span className="block truncate text-xs text-neutral-500">
                  {profile?.email || "Signed in"}
                </span>
              </span>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex min-h-0 min-w-0 flex-1 flex-col bg-neutral-50">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-neutral-200 bg-white px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileChannelsOpen((open) => !open)}
              aria-expanded={mobileChannelsOpen}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-neutral-200 text-neutral-700 hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 lg:hidden"
              aria-label={mobileChannelsOpen ? "Close channels" : "Open channels"}
            >
              {mobileChannelsOpen ? <X size={17} /> : <Menu size={17} />}
            </button>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-700">
              <Hash size={18} />
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-sm font-semibold sm:text-base">
                {selectedChannel?.name || "Choose a channel"}
              </h2>
              <p className="truncate text-xs text-neutral-500">
                {selectedServer?.name || "Community workspace"}
              </p>
            </div>
          </div>
          <Link
            to="/dashboard#my-communities"
            className="shrink-0 rounded-lg border border-neutral-200 px-3 py-2 text-xs font-semibold text-neutral-700 transition hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 sm:text-sm"
          >
            Back to dashboard
          </Link>
        </header>

        {serversLoading ? (
          <div role="status" className="m-auto px-4 text-sm text-neutral-500">
            Loading your communities...
          </div>
        ) : serversError ? (
          <div className="m-auto max-w-md px-5 text-center">
            <p role="alert" className="text-sm text-red-700">
              {serversError}
            </p>
            <button
              type="button"
              onClick={() => setServersRefreshKey((key) => key + 1)}
              className="mt-3 rounded-lg border border-neutral-300 px-3 py-2 text-sm font-semibold hover:bg-white"
            >
              Retry
            </button>
          </div>
        ) : !selectedServer ? (
          <div className="m-auto max-w-md px-5 text-center">
            <UsersRound className="mx-auto text-neutral-400" size={26} />
            <h2 className="mt-3 font-semibold">Community not found</h2>
            <p className="mt-1 text-sm leading-6 text-neutral-600">
              This community is unavailable or you do not have access to it.
            </p>
            <Link
              to="/dashboard"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-neutral-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-neutral-700"
            >
              <ArrowLeft size={15} />
              Return to dashboard
            </Link>
          </div>
        ) : (
          <>
            {channelSuccess && (
              <p
                role="status"
                className="mx-4 mt-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800 sm:mx-6"
              >
                {channelSuccess}
              </p>
            )}
            <section
              aria-label="Channel conversation"
              className="flex min-h-0 flex-1 flex-col"
            >
              <div
                aria-live="polite"
                className="community-workspace__messages flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 py-5 sm:px-6 sm:py-7"
              >
                {channelsLoading || messagesLoading ? (
                  <p role="status" className="m-auto inline-flex items-center gap-2 text-sm text-neutral-500">
                    <LoaderCircle size={16} className="animate-spin" />
                    Loading conversation...
                  </p>
                ) : channelsError ? (
                  <p role="alert" className="m-auto text-sm text-red-700">
                    {channelsError}
                  </p>
                ) : !availableChannels.length ? (
                  <div className="m-auto max-w-sm text-center">
                    <Hash className="mx-auto text-neutral-400" size={23} />
                    <p className="mt-3 text-sm font-medium">
                      No channels are available in this community yet.
                    </p>
                    <button
                      type="button"
                      onClick={openCreateChannel}
                      className="mt-4 inline-flex items-center gap-2 rounded-lg bg-neutral-950 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-700"
                    >
                      <Plus size={15} />
                      Create channel
                    </button>
                  </div>
                ) : !selectedChannel ? (
                  <p className="m-auto text-sm text-neutral-500">
                    Choose a channel to view its conversation.
                  </p>
                ) : messagesError ? (
                  <p role="alert" className="m-auto text-sm text-red-700">
                    {messagesError}
                  </p>
                ) : !displayedMessages.length ? (
                  <div className="m-auto max-w-sm text-center">
                    <MessageCircle className="mx-auto text-neutral-400" size={24} />
                    <p className="mt-3 text-sm text-neutral-600">
                      No messages in this channel yet. Start the conversation.
                    </p>
                  </div>
                ) : (
                  displayedMessages.map((message) => (
                    <article
                      key={message.id}
                      className="mx-auto flex w-full max-w-4xl items-start gap-3"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-200 text-xs font-semibold text-neutral-700">
                        {message.author?.display_name?.[0]?.toUpperCase() || "?"}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-baseline gap-x-2">
                            <span className="text-sm font-semibold">
                              {message.author?.display_name || "Community member"}
                            </span>
                            {message.created_at && (
                              <time
                                dateTime={message.created_at}
                                className="text-[11px] text-neutral-400"
                              >
                                {new Date(message.created_at).toLocaleString()}
                              </time>
                            )}
                          </div>
                          {canModifyMessage(message, profile) && (
                            <div className="flex shrink-0 items-center gap-1">
                              <button
                                type="button"
                                onClick={() => startEditingMessage(message)}
                                aria-label={`Edit message from ${message.author.display_name}`}
                                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-neutral-600 hover:bg-neutral-100 hover:text-neutral-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500"
                              >
                                <Pencil size={13} />
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={(event) =>
                                  requestDeleteMessage(message, event)
                                }
                                aria-label={`Delete message from ${message.author.display_name}`}
                                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-neutral-600 hover:bg-red-50 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                              >
                                <Trash2 size={13} />
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                        {editingMessageId === String(message.id) &&
                        editingMessageServerId === serverId &&
                        editingMessageChannelId === String(selectedChannel?.id) ? (
                          <form
                            onSubmit={(event) =>
                              handleEditMessage(event, message)
                            }
                            className="mt-3 space-y-2"
                          >
                            <label
                              className="sr-only"
                              htmlFor={`edit-message-${message.id}`}
                            >
                              Edit message
                            </label>
                            <textarea
                              id={`edit-message-${message.id}`}
                              autoFocus
                              maxLength={2000}
                              rows={3}
                              value={editMessageDraft}
                              onChange={(event) => {
                                setEditMessageDraft(event.target.value);
                                setEditMessageError("");
                              }}
                              disabled={savingMessageId === String(message.id)}
                              aria-invalid={Boolean(editMessageError)}
                              aria-describedby={
                                editMessageError
                                  ? `edit-message-error-${message.id}`
                                  : undefined
                              }
                              className="w-full resize-y rounded-lg border border-neutral-300 px-3 py-2 text-sm leading-6 outline-none focus:border-neutral-500 focus:ring-2 focus:ring-neutral-100 disabled:bg-neutral-50"
                            />
                            {editMessageError && (
                              <p
                                id={`edit-message-error-${message.id}`}
                                role="alert"
                                className="text-sm text-red-700"
                              >
                                {editMessageError}
                              </p>
                            )}
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  if (savingMessageId !== String(message.id)) {
                                    setEditingMessageId("");
                                    setEditingMessageServerId("");
                                    setEditingMessageChannelId("");
                                    setEditMessageDraft("");
                                    setEditMessageError("");
                                  }
                                }}
                                disabled={savingMessageId === String(message.id)}
                                className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 disabled:opacity-50"
                              >
                                Cancel
                              </button>
                              <button
                                type="submit"
                                disabled={
                                  !editMessageDraft.trim() ||
                                  Boolean(savingMessageId)
                                }
                                className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-950 px-3 py-1.5 text-xs font-semibold text-white hover:bg-neutral-700 disabled:cursor-wait disabled:opacity-60"
                              >
                                {savingMessageId === String(message.id) ? (
                                  <LoaderCircle
                                    size={13}
                                    className="animate-spin"
                                  />
                                ) : (
                                  <Check size={13} />
                                )}
                                {savingMessageId === String(message.id)
                                  ? "Saving..."
                                  : "Save"}
                              </button>
                            </div>
                          </form>
                        ) : (
                          <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-neutral-700">
                            {message.content}
                          </p>
                        )}
                      </div>
                    </article>
                  ))
                )}
              </div>

              {messagesError && selectedChannel && !messagesLoading && (
                <div className="px-4 pb-2 sm:px-6">
                  <button
                    type="button"
                    onClick={() => setMessagesRefreshKey((key) => key + 1)}
                    className="text-sm font-medium text-neutral-700 underline hover:text-neutral-950"
                  >
                    Reload channel messages
                  </button>
                </div>
              )}

              <form
                onSubmit={handleSendMessage}
                className="flex shrink-0 gap-2 border-t border-neutral-200 bg-white p-3 sm:p-4"
              >
                <label className="sr-only" htmlFor="workspace-message-draft">
                  Write a message
                </label>
                <input
                  ref={messageComposerRef}
                  id="workspace-message-draft"
                  maxLength={2000}
                  value={messageDraft}
                  onChange={(event) => setMessageDraft(event.target.value)}
                  disabled={!selectedChannel || sendingMessage}
                  placeholder={
                    selectedChannel
                      ? `Message #${selectedChannel.name}`
                      : "Choose a channel to message"
                  }
                  className="mx-auto min-w-0 max-w-4xl flex-1 rounded-xl border border-neutral-200 px-4 py-3 text-sm outline-none transition placeholder:text-neutral-400 focus:border-neutral-500 focus:ring-2 focus:ring-neutral-100 disabled:bg-neutral-50"
                />
                <button
                  type="submit"
                  disabled={
                    !selectedChannel ||
                    !messageDraft.trim() ||
                    sendingMessage
                  }
                  aria-label="Send message"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-neutral-950 text-white transition hover:bg-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-neutral-300"
                >
                  {sendingMessage ? (
                    <LoaderCircle size={17} className="animate-spin" />
                  ) : (
                    <Send size={17} />
                  )}
                </button>
              </form>
            </section>
          </>
        )}
      </main>

      {createChannelOpen && selectedServer && (
        <div
          className="community-workspace__overlay fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/60 p-4 backdrop-blur-[2px]"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !creatingChannel
            ) {
              restoreChannelTriggerRef.current = true;
              setCreateChannelOpen(false);
            }
          }}
        >
          <section
            ref={createChannelDialogRef}
            className="community-workspace__dialog w-full max-w-md rounded-2xl border border-neutral-200 bg-white shadow-2xl outline-none"
            role="dialog"
            aria-modal="true"
            aria-labelledby="workspace-create-channel-title"
            aria-busy={creatingChannel}
            tabIndex={-1}
          >
            <header className="flex items-start justify-between gap-4 border-b border-neutral-100 px-5 py-5">
              <div>
                <h2
                  id="workspace-create-channel-title"
                  className="text-lg font-semibold"
                >
                  Create channel
                </h2>
                <p className="mt-1 text-sm text-neutral-600">
                  Add a channel to {selectedServer.name}.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!creatingChannel) {
                    restoreChannelTriggerRef.current = true;
                    setCreateChannelOpen(false);
                  }
                }}
                disabled={creatingChannel}
                aria-label="Close create channel dialog"
                className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 disabled:opacity-50"
              >
                <X size={18} />
              </button>
            </header>
            <form onSubmit={handleCreateChannel} className="p-5">
              <label
                htmlFor="workspace-channel-name"
                className="block text-sm font-medium text-neutral-800"
              >
                Channel name
                <input
                  ref={createChannelInputRef}
                  id="workspace-channel-name"
                  required
                  value={newChannelName}
                  onChange={(event) => {
                    setNewChannelName(event.target.value);
                    setCreateChannelError("");
                  }}
                  aria-invalid={Boolean(createChannelError)}
                  aria-describedby={
                    createChannelError
                      ? "workspace-create-channel-error"
                      : undefined
                  }
                  className="mt-2 w-full rounded-xl border border-neutral-300 px-3.5 py-3 text-sm outline-none focus:border-neutral-600 focus:ring-2 focus:ring-neutral-200"
                />
              </label>
              {createChannelError && (
                <p
                  id="workspace-create-channel-error"
                  role="alert"
                  className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
                >
                  {createChannelError}
                </p>
              )}
              <footer className="mt-5 flex flex-col-reverse justify-end gap-2 border-t border-neutral-100 pt-4 sm:flex-row">
                <button
                  type="button"
                  onClick={() => {
                    if (!creatingChannel) {
                      restoreChannelTriggerRef.current = true;
                      setCreateChannelOpen(false);
                    }
                  }}
                  disabled={creatingChannel}
                  className="rounded-lg border border-neutral-300 px-4 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-100 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingChannel}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-neutral-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-neutral-700 disabled:cursor-wait disabled:opacity-60"
                >
                  {creatingChannel ? "Creating..." : "Create channel"}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
      {messageToDelete &&
        messageToDelete.serverId === serverId &&
        messageToDelete.channelId === String(selectedChannel?.id || "") && (
          <div
            className="community-workspace__overlay fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/60 p-4 backdrop-blur-[2px]"
            onMouseDown={(event) => {
              if (
                event.target === event.currentTarget &&
                !deletingMessageId
              ) {
                closeDeleteMessageDialog();
              }
            }}
          >
            <section
              ref={deleteMessageDialogRef}
              className="community-workspace__dialog w-full max-w-md rounded-2xl border border-neutral-200 bg-white shadow-2xl"
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="workspace-delete-message-title"
              aria-describedby="workspace-delete-message-description"
              aria-busy={Boolean(deletingMessageId)}
            >
              <header className="flex items-start justify-between gap-4 border-b border-neutral-100 px-5 py-5">
                <div>
                  <h2
                    id="workspace-delete-message-title"
                    className="text-lg font-semibold"
                  >
                    Delete message?
                  </h2>
                  <p
                    id="workspace-delete-message-description"
                    className="mt-1 text-sm leading-6 text-neutral-600"
                  >
                    This will permanently delete your message:
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeDeleteMessageDialog}
                  disabled={Boolean(deletingMessageId)}
                  aria-label="Close delete message confirmation"
                  className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 disabled:opacity-50"
                >
                  <X size={18} />
                </button>
              </header>
              <div className="p-5">
                <p className="max-h-28 overflow-y-auto whitespace-pre-wrap break-words rounded-lg bg-neutral-100 px-3 py-2 text-sm text-neutral-700">
                  {messageToDelete.content}
                </p>
                {deleteMessageError && (
                  <p
                    role="alert"
                    className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
                  >
                    {deleteMessageError}
                  </p>
                )}
                <footer className="mt-5 flex flex-col-reverse justify-end gap-2 border-t border-neutral-100 pt-4 sm:flex-row">
                  <button
                    ref={deleteMessageCancelRef}
                    type="button"
                    onClick={closeDeleteMessageDialog}
                    disabled={Boolean(deletingMessageId)}
                    className="rounded-lg border border-neutral-300 px-4 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-100 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteMessage}
                    disabled={Boolean(deletingMessageId)}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-800 disabled:cursor-wait disabled:opacity-60"
                  >
                    {deletingMessageId ? (
                      <LoaderCircle size={15} className="animate-spin" />
                    ) : (
                      <Trash2 size={15} />
                    )}
                    {deletingMessageId ? "Deleting..." : "Delete message"}
                  </button>
                </footer>
              </div>
            </section>
          </div>
        )}
    </div>
  );
}
