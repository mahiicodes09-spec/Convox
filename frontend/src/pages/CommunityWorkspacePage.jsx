import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  ClipboardList,
  Hash,
  Info,
  LoaderCircle,
  Menu,
  Pencil,
  Plus,
  ShieldCheck,
  Settings2,
  Send,
  Trash2,
  UserPlus,
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

function getNextCursor(next) {
  if (!next) {
    return "";
  }
  const cursor = new URL(next, window.location.origin).searchParams.get(
    "cursor",
  );
  if (!cursor) {
    throw new Error("The message pagination link did not contain a cursor.");
  }
  return cursor;
}

function mergeMessagesChronologically(existing, incoming) {
  const messagesById = new Map(
    existing.map((message) => [String(message.id), message]),
  );
  incoming.forEach((message) => {
    if (!messagesById.has(String(message.id))) {
      messagesById.set(String(message.id), message);
    }
  });
  return [...messagesById.values()].sort(
    (left, right) =>
      Date.parse(left.created_at) - Date.parse(right.created_at),
  );
}

function canModifyMessage(message, profile) {
  return (
    message?.id != null &&
    profile?.id != null &&
    message.author?.id != null &&
    String(message.author.id) === String(profile.id)
  );
}

const ASSIGNABLE_MEMBER_ROLES = ["admin", "moderator", "member"];
const MODERATION_ACTIONS = ["dismiss", "warn", "remove"];

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
  const [messagesServerId, setMessagesServerId] = useState("");
  const [messagesChannelId, setMessagesChannelId] = useState("");
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState("");
  const [messagesRefreshKey, setMessagesRefreshKey] = useState(0);
  const messageSelectionVersionRef = useRef(0);
  const [nextMessageCursor, setNextMessageCursor] = useState("");
  const [loadingOlderMessages, setLoadingOlderMessages] = useState(false);
  const [olderMessagesError, setOlderMessagesError] = useState("");
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
  const [mobileCommunitiesOpen, setMobileCommunitiesOpen] = useState(false);
  const [communityInfoOpen, setCommunityInfoOpen] = useState(false);
  const [communityToolsOpen, setCommunityToolsOpen] = useState(false);
  const [communityToolsTab, setCommunityToolsTab] = useState("members");
  const [members, setMembers] = useState([]);
  const [membersServerId, setMembersServerId] = useState("");
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersError, setMembersError] = useState("");
  const [membersSuccess, setMembersSuccess] = useState("");
  const [savingMemberId, setSavingMemberId] = useState("");
  const [moderationQueue, setModerationQueue] = useState([]);
  const [moderationQueueServerId, setModerationQueueServerId] = useState("");
  const [moderationQueueLoading, setModerationQueueLoading] = useState(false);
  const [moderationQueueError, setModerationQueueError] = useState("");
  const [moderationLogs, setModerationLogs] = useState([]);
  const [moderationLogsServerId, setModerationLogsServerId] = useState("");
  const [moderationLogsLoading, setModerationLogsLoading] = useState(false);
  const [moderationLogsError, setModerationLogsError] = useState("");
  const [moderationAction, setModerationAction] = useState({});
  const [moderationReason, setModerationReason] = useState({});
  const [moderationActionMessage, setModerationActionMessage] = useState("");
  const [moderationActionError, setModerationActionError] = useState("");
  const [moderationActionId, setModerationActionId] = useState("");
  const [welcomeActionMessage, setWelcomeActionMessage] = useState("");
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
  const messageListRef = useRef(null);
  const messageListEndRef = useRef(null);
  const olderScrollPositionRef = useRef(null);
  const selectedChannelButtonRef = useRef(null);
  const restoreDeleteMessageTriggerRef = useRef(false);
  const olderMessagesRequestRef = useRef(null);
  const olderMessagesRequestIdRef = useRef(0);

  // Sync route and channel refs before async responses can update this view.
  useLayoutEffect(() => {
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
  const visibleMembers = membersServerId === serverId ? members : [];
  const visibleModerationQueue =
    moderationQueueServerId === serverId ? moderationQueue : [];
  const visibleModerationLogs =
    moderationLogsServerId === serverId ? moderationLogs : [];
  const currentMember = visibleMembers.find(
    (member) => String(member.user_id) === String(profile?.id),
  );
  const isCommunityOwner =
    selectedServer?.owner != null &&
    String(selectedServer.owner) === String(profile?.id);
  const currentRole = isCommunityOwner ? "owner" : currentMember?.role;
  const canModerateCommunity =
    isCommunityOwner ||
    currentRole === "admin" ||
    currentRole === "moderator";
  const canManageMemberRoles = isCommunityOwner;

  useEffect(() => {
    if (!communityToolsOpen || !serverId) {
      return undefined;
    }
    if (communityToolsTab === "channels") {
      return undefined;
    }
    if (
      (communityToolsTab === "queue" || communityToolsTab === "logs") &&
      !canModerateCommunity
    ) {
      return undefined;
    }

    let active = true;
    const targetServerId = serverId;
    const listConfig = {
      members: {
        loading: setMembersLoading,
        clearError: setMembersError,
        request: () =>
          api.get(`/servers/${encodeURIComponent(targetServerId)}/members/`),
        validate: Array.isArray,
        setData: setMembers,
        setServerId: setMembersServerId,
        error: setMembersError,
        invalidMessage: "The members response did not contain a list.",
        fallback: "Could not load community members.",
      },
      queue: {
        loading: setModerationQueueLoading,
        clearError: setModerationQueueError,
        request: () =>
          api.get(
            `/servers/${encodeURIComponent(targetServerId)}/moderation/queue/`,
          ),
        validate: Array.isArray,
        setData: setModerationQueue,
        setServerId: setModerationQueueServerId,
        error: setModerationQueueError,
        invalidMessage: "The moderation queue response did not contain a list.",
        fallback: "Could not load the moderation queue.",
      },
      logs: {
        loading: setModerationLogsLoading,
        clearError: setModerationLogsError,
        request: () =>
          api.get(
            `/servers/${encodeURIComponent(targetServerId)}/moderation/logs/`,
          ),
        validate: Array.isArray,
        setData: setModerationLogs,
        setServerId: setModerationLogsServerId,
        error: setModerationLogsError,
        invalidMessage: "The moderation logs response did not contain a list.",
        fallback: "Could not load moderation logs.",
      },
    }[communityToolsTab];

    listConfig.loading(true);
    listConfig.clearError("");
    listConfig.setData([]);
    listConfig.setServerId("");

    async function loadCommunityToolData() {
      try {
        const response = await listConfig.request();
        if (!listConfig.validate(response.data)) {
          throw new Error(listConfig.invalidMessage);
        }
        if (
          active &&
          selectedServerIdRef.current === targetServerId
        ) {
          listConfig.setData(response.data);
          listConfig.setServerId(targetServerId);
        }
      } catch (error) {
        if (
          active &&
          selectedServerIdRef.current === targetServerId
        ) {
          listConfig.error(
            getApiErrorMessage(error, listConfig.fallback),
          );
        }
      } finally {
        if (active) {
          listConfig.loading(false);
        }
      }
    }

    loadCommunityToolData();
    return () => {
      active = false;
    };
  }, [
    canModerateCommunity,
    communityToolsOpen,
    communityToolsTab,
    serverId,
  ]);

  // This effect only displays channels returned by the selected server's
  // endpoint. Explicitly server-tagged items from a mismatched response are ignored.
  useEffect(() => {
    if (!selectedServer || !serverId) {
      return undefined;
    }

    let active = true;
    const previousChannelId = selectedChannelIdRef.current;
    messageSelectionVersionRef.current += 1;
    olderScrollPositionRef.current = null;

    async function loadChannels() {
      setChannelsLoading(true);
      setChannelsError("");
      setChannels([]);
      setChannelsServerId("");
      setSelectedChannelId("");
      setMessages([]);
      setMessagesServerId("");
      setMessagesChannelId("");
      setMessagesError("");
      setMessagesLoading(false);
      setNextMessageCursor("");
      setLoadingOlderMessages(false);
      setOlderMessagesError("");
      olderMessagesRequestRef.current = null;

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
    const requestVersion = ++messageSelectionVersionRef.current;

    async function loadMessages() {
      setMessagesLoading(true);
      setMessagesError("");
      setMessages([]);
      setMessagesServerId("");
      setMessagesChannelId("");
      setNextMessageCursor("");
      setLoadingOlderMessages(false);
      setOlderMessagesError("");
      olderMessagesRequestRef.current = null;

      try {
        const response = await api.get(
          `/channels/${encodeURIComponent(channelId)}/messages/`,
        );
        if (!Array.isArray(response.data?.results)) {
          throw new Error("The messages response did not contain a results list.");
        }
        const nextCursor = getNextCursor(response.data.next);
        if (
          active &&
          messageSelectionVersionRef.current === requestVersion &&
          selectedServerIdRef.current === serverId &&
          selectedChannelIdRef.current === channelId
        ) {
          setMessages(mergeMessagesChronologically([], response.data.results));
          setMessagesServerId(serverId);
          setMessagesChannelId(channelId);
          setNextMessageCursor(nextCursor);
        }
      } catch (error) {
        if (
          active &&
          messageSelectionVersionRef.current === requestVersion &&
          selectedServerIdRef.current === serverId &&
          selectedChannelIdRef.current === channelId
        ) {
          handleRequestError(
            error,
            setMessagesError,
            "Could not load messages for this channel.",
          );
        }
      } finally {
        if (
          active &&
          messageSelectionVersionRef.current === requestVersion &&
          selectedServerIdRef.current === serverId &&
          selectedChannelIdRef.current === channelId
        ) {
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
    messageSelectionVersionRef.current += 1;
    olderMessagesRequestRef.current = null;
    olderScrollPositionRef.current = null;
    setSelectedChannelId(channelId);
    setMessages([]);
    setMessagesServerId("");
    setMessagesChannelId("");
    setMessagesError("");
    setNextMessageCursor("");
    setLoadingOlderMessages(false);
    setOlderMessagesError("");
    olderMessagesRequestRef.current = null;
    setEditingMessageId("");
    setEditingMessageServerId("");
    setEditingMessageChannelId("");
    setEditMessageDraft("");
    setEditMessageError("");
    setMessageToDelete(null);
    setDeleteMessageError("");
    setMobileChannelsOpen(false);
  }

  function openCommunityTools(tab = "members") {
    setCommunityToolsTab(tab);
    setMembersSuccess("");
    setModerationActionMessage("");
    setModerationActionError("");
    setCommunityInfoOpen(false);
    setCommunityToolsOpen(true);
  }

  async function handleMemberRoleChange(member, role) {
    const targetServerId = serverId;
    const targetUserId = String(member.user_id);
    if (
      !canManageMemberRoles ||
      !ASSIGNABLE_MEMBER_ROLES.includes(role) ||
      member.role === "owner" ||
      String(selectedServer?.owner) === targetUserId ||
      !targetUserId ||
      savingMemberId
    ) {
      return;
    }

    setSavingMemberId(targetUserId);
    setMembersError("");
    setMembersSuccess("");
    try {
      const response = await api.patch(
        `/servers/${encodeURIComponent(targetServerId)}/members/${encodeURIComponent(targetUserId)}/`,
        { role },
      );
      const updatedMember = response.data;
      if (
        String(updatedMember?.user_id) !== targetUserId ||
        updatedMember?.role !== role
      ) {
        throw new Error("The role update response did not match the requested member and role.");
      }
      if (
        selectedServerIdRef.current === targetServerId
      ) {
        setMembers((currentMembers) =>
          currentMembers.map((currentMember) =>
            String(currentMember.user_id) === targetUserId
              ? updatedMember
              : currentMember,
          ),
        );
        setMembersSuccess(
          `${updatedMember.display_name}'s role was updated to ${role}.`,
        );
      }
    } catch (error) {
      if (selectedServerIdRef.current === targetServerId) {
        setMembersError(
          getApiErrorMessage(error, "Could not update this member's role."),
        );
      }
    } finally {
      setSavingMemberId("");
    }
  }

  async function handleModerationAction(message) {
    const messageId = String(message.id);
    const targetServerId = serverId;
    const action = moderationAction[messageId] || "dismiss";
    const reason = (moderationReason[messageId] || "").trim();
    if (
      !canModerateCommunity ||
      !MODERATION_ACTIONS.includes(action) ||
      !reason ||
      reason.length > 500 ||
      moderationActionId
    ) {
      if (!reason) {
        setModerationActionError("Enter a reason for this moderation action.");
      } else if (reason.length > 500) {
        setModerationActionError("The reason cannot exceed 500 characters.");
      }
      return;
    }

    setModerationActionId(messageId);
    setModerationActionError("");
    setModerationActionMessage("");
    try {
      const response = await api.post(
        `/moderation/messages/${encodeURIComponent(messageId)}/action/`,
        { action, reason },
      );
      if (selectedServerIdRef.current === targetServerId) {
        setModerationQueue((currentQueue) =>
          currentQueue.filter(
            (queueMessage) => String(queueMessage.id) !== messageId,
          ),
        );
        setModerationActionMessage("Moderation action completed.");
        if (
          moderationLogsServerId === targetServerId &&
          response.data?.id != null
        ) {
          setModerationLogs((currentLogs) => [
            response.data,
            ...currentLogs.filter(
              (log) => String(log.id) !== String(response.data.id),
            ),
          ]);
        }
      }
    } catch (error) {
      if (selectedServerIdRef.current === targetServerId) {
        setModerationActionError(
          getApiErrorMessage(error, "Could not complete this moderation action."),
        );
      }
    } finally {
      setModerationActionId("");
    }
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
    const requestVersion = messageSelectionVersionRef.current;
    setSendingMessage(true);
    setMessagesError("");

    try {
      const response = await api.post(
        `/channels/${encodeURIComponent(channelId)}/messages/`,
        { content },
      );
      if (
        selectedServerIdRef.current === messageServerId &&
        selectedChannelIdRef.current === channelId &&
        messageSelectionVersionRef.current === requestVersion
      ) {
        if (String(response.data?.channel) !== channelId) {
          throw new Error("The message response did not match the selected channel.");
        }
        setMessages((currentMessages) =>
          messagesServerId === messageServerId &&
          messagesChannelId === channelId
            ? [...currentMessages, response.data]
            : [response.data],
        );
        setMessagesServerId(messageServerId);
        setMessagesChannelId(channelId);
        setMessageDraft("");
      }
    } catch (error) {
      if (
        selectedServerIdRef.current === messageServerId &&
        selectedChannelIdRef.current === channelId &&
        messageSelectionVersionRef.current === requestVersion
      ) {
        handleRequestError(
          error,
          setMessagesError,
          "Your message could not be sent. Please try again.",
        );
      }
    } finally {
      setSendingMessage(false);
    }
  }

  async function handleLoadOlderMessages() {
    const channelId = String(selectedChannel?.id || "");
    const targetServerId = serverId;
    const cursor = nextMessageCursor;
    const requestKey = `${targetServerId}:${channelId}:${cursor}`;
    const requestVersion = messageSelectionVersionRef.current;
    if (
      !cursor ||
      !channelId ||
      loadingOlderMessages ||
      olderMessagesRequestRef.current
    ) {
      return;
    }

    const requestId = ++olderMessagesRequestIdRef.current;
    olderMessagesRequestRef.current = { id: requestId, key: requestKey };
    const messageList = messageListRef.current;
    olderScrollPositionRef.current = messageList
      ? {
          scrollHeight: messageList.scrollHeight,
          scrollTop: messageList.scrollTop,
        }
      : null;
    setLoadingOlderMessages(true);
    setOlderMessagesError("");
    try {
      const response = await api.get(
        `/channels/${encodeURIComponent(channelId)}/messages/`,
        { params: { cursor } },
      );
      if (!Array.isArray(response.data?.results)) {
        throw new Error("The messages response did not contain a results list.");
      }
      const nextCursor = getNextCursor(response.data.next);
      if (
        selectedServerIdRef.current === targetServerId &&
        messageSelectionVersionRef.current === requestVersion &&
        selectedChannelIdRef.current === channelId &&
        messagesServerId === targetServerId &&
        messagesChannelId === channelId
      ) {
        setMessages((currentMessages) =>
          mergeMessagesChronologically(currentMessages, response.data.results),
        );
        setNextMessageCursor(nextCursor);
      }
    } catch (error) {
      if (
        selectedServerIdRef.current === targetServerId &&
        messageSelectionVersionRef.current === requestVersion &&
        selectedChannelIdRef.current === channelId
      ) {
        setOlderMessagesError(
          getApiErrorMessage(error, "Could not load older messages."),
        );
      }
    } finally {
      if (olderMessagesRequestRef.current?.id === requestId) {
        olderMessagesRequestRef.current = null;
        setLoadingOlderMessages(false);
      }
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
      !canModifyMessage(message, profile) ||
      editingMessageServerId !== targetServerId ||
      editingMessageChannelId !== channelId ||
      messagesServerId !== targetServerId ||
      messagesChannelId !== channelId ||
      !messages.some(
        (currentMessage) => String(currentMessage.id) === messageId,
      )
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
      messagesServerId !== targetServerId ||
      messagesChannelId !== targetChannelId ||
      !messages.some(
        (currentMessage) => String(currentMessage.id) === messageId,
      ) ||
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

  const displayedMessages = useMemo(
    () =>
      messagesServerId === serverId &&
      messagesChannelId === String(selectedChannel?.id)
        ? messages
        : [],
    [messages, messagesChannelId, messagesServerId, selectedChannel?.id, serverId],
  );
  const hasCurrentUserMessage = displayedMessages.some(
    (message) =>
      profile?.id != null &&
      message.author?.id != null &&
      String(message.author.id) === String(profile.id),
  );
  const profileName = profile?.display_name?.trim() || "Your profile";

  useLayoutEffect(() => {
    if (olderScrollPositionRef.current && messageListRef.current) {
      const { scrollHeight, scrollTop } = olderScrollPositionRef.current;
      messageListRef.current.scrollTop =
        scrollTop + messageListRef.current.scrollHeight - scrollHeight;
      olderScrollPositionRef.current = null;
      return;
    }
    if (!messagesLoading && selectedChannel) {
      messageListEndRef.current?.scrollIntoView({ block: "end" });
    }
  }, [displayedMessages, messagesLoading, selectedChannel]);

  useEffect(() => {
    if (mobileChannelsOpen) {
      selectedChannelButtonRef.current?.focus();
    }
  }, [mobileChannelsOpen]);

  function handleMessageComposerKeyDown(event) {
    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  async function copyCommunityInvite() {
    const invite = selectedServer?.invite_link || selectedServer?.invite_code;
    if (!invite) {
      navigate("/dashboard#discover");
      return;
    }

    try {
      await navigator.clipboard.writeText(invite);
      setWelcomeActionMessage("Community invite copied to your clipboard.");
    } catch {
      setWelcomeActionMessage(
        "Clipboard access is unavailable. Open community settings to share its invite.",
      );
    }
  }

  function exploreChannels() {
    setMobileChannelsOpen(true);
  }

  return (
    <div className="community-workspace flex h-dvh min-h-[520px] flex-col overflow-hidden bg-neutral-100 text-neutral-950 lg:flex-row">
      <aside
        aria-label="Community navigation"
        className={`community-workspace__community-rail ${
          mobileCommunitiesOpen ? "is-open" : ""
        } z-30 flex h-16 shrink-0 items-center gap-2 overflow-x-auto border-b border-neutral-200 bg-white px-3 lg:h-screen lg:w-[76px] lg:flex-col lg:items-center lg:overflow-x-visible lg:overflow-y-auto lg:border-b-0 lg:border-r lg:px-2 lg:py-4`}
      >
        <Link
          to="/dashboard"
          aria-label="Smart Community dashboard"
          title="Smart Community"
          className="community-workspace__brand flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-950 text-white transition hover:bg-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500"
        >
          <UsersRound size={19} />
        </Link>
        <span className="community-workspace__rail-divider mx-1 h-8 w-px shrink-0 bg-neutral-200 lg:my-1 lg:h-px lg:w-10" />
        <button
          type="button"
          className="community-workspace__mobile-close"
          aria-label="Close community navigation"
          onClick={() => setMobileCommunitiesOpen(false)}
        >
          <X size={18} />
        </button>

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
                  {
                    setMobileCommunitiesOpen(false);
                    setMobileChannelsOpen(false);
                    navigate(
                      `/dashboard/communities/${encodeURIComponent(server.id)}`,
                    );
                  }
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
        <Link
          to="/dashboard#my-communities"
          aria-label="Create or join a community"
          title="Create or join a community"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-white text-neutral-600 transition hover:border-neutral-500 hover:bg-neutral-100 hover:text-neutral-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500"
        >
          <Plus size={18} aria-hidden="true" />
        </Link>
      </aside>

      {mobileCommunitiesOpen && (
        <button
          type="button"
          className="community-workspace__mobile-scrim"
          aria-label="Close community navigation"
          onClick={() => setMobileCommunitiesOpen(false)}
        />
      )}

      <aside className="community-workspace__channel-sidebar relative z-20 flex min-h-0 shrink-0 flex-col border-b border-neutral-200 bg-white lg:h-screen lg:w-64 lg:border-b-0 lg:border-r">
        <div className="community-workspace__community-header flex items-center justify-between gap-3 border-b border-neutral-200 px-4 py-4">
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
        <div className="community-workspace__community-info">
          <p className="community-workspace__community-description">
            {selectedServer?.description?.trim() ||
              "Choose a channel to connect with your community."}
          </p>
          <button
            type="button"
            onClick={() => openCommunityTools("members")}
            className="community-workspace__manage-link"
          >
            Manage community
          </button>
        </div>

        <div
          id="workspace-channel-navigation"
          className={`${
            mobileChannelsOpen ? "flex" : "hidden"
          } absolute left-0 right-0 top-full z-20 max-h-[55vh] flex-col overflow-y-auto border-b border-neutral-200 bg-white shadow-xl lg:static lg:flex lg:max-h-none lg:flex-1 lg:border-0 lg:shadow-none`}
        >
          <div className="community-workspace__channel-heading flex items-center justify-between px-4 pb-2 pt-4">
            <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
              Text Channels
            </h2>
            <button
              type="button"
              onClick={() => openCommunityTools("channels")}
              className="text-xs font-medium text-neutral-600 underline-offset-4 hover:text-neutral-950 hover:underline"
            >
              Manage
            </button>
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
            <ul className="community-workspace__channel-list space-y-1 px-2 pb-4">
              {availableChannels.map((channel) => {
                const active = String(channel.id) === selectedChannelId;
                return (
                  <li key={channel.id}>
                    <button
                      ref={active ? selectedChannelButtonRef : null}
                      type="button"
                      onClick={() => selectChannel(channel)}
                      aria-current={active ? "page" : undefined}
                      className={`community-workspace__channel-button flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 ${
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

          <div className="community-workspace__profile-panel mt-auto flex border-t border-neutral-200 p-3">
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
            <Link
              to="/dashboard#settings"
              className="community-workspace__account-link"
            >
              Account settings
            </Link>
          </div>
        </div>
      </aside>

      <main className="flex min-h-0 min-w-0 flex-1 flex-col bg-neutral-50">
        <header className="community-workspace__chat-header flex shrink-0 items-center justify-between gap-3 border-b border-neutral-200 bg-white px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileCommunitiesOpen((open) => !open)}
              aria-expanded={mobileCommunitiesOpen}
              aria-label={
                mobileCommunitiesOpen
                  ? "Close community navigation"
                  : "Open community navigation"
              }
              className="community-workspace__mobile-nav-button"
            >
              <UsersRound size={17} />
            </button>
            <button
              type="button"
              onClick={() => setMobileChannelsOpen((open) => !open)}
              aria-expanded={mobileChannelsOpen}
              aria-controls="workspace-channel-navigation"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-neutral-200 text-neutral-700 hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 lg:hidden"
              aria-label={mobileChannelsOpen ? "Close channels" : "Open channels"}
            >
              {mobileChannelsOpen ? <X size={17} /> : <Menu size={17} />}
            </button>
            <span className="community-workspace__channel-mark flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-700">
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
                className="community-workspace__success mx-4 mt-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800 sm:mx-6"
              >
                {channelSuccess}
              </p>
            )}
            <section
              aria-label="Channel conversation"
              className="flex min-h-0 flex-1 flex-col"
            >
              <div
                ref={messageListRef}
                aria-live="polite"
                className="community-workspace__messages flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-4 py-5 sm:px-6 sm:py-7"
              >
                {channelsLoading ? (
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
                ) : (
                  <>
                    <div
                      className={`community-workspace__welcome ${
                        displayedMessages.length
                          ? "community-workspace__welcome--with-messages"
                          : ""
                      }`}
                    >
                    <div className="community-workspace__welcome-content">
                      <span className="community-workspace__welcome-mark">
                        <UsersRound size={28} aria-hidden="true" />
                      </span>
                      <p className="community-workspace__welcome-eyebrow">
                        Smart Community
                      </p>
                      <h3>
                        Welcome to {selectedServer.name}
                      </h3>
                      <p className="community-workspace__welcome-description">
                        {selectedServer.description?.trim() ||
                          `This is the start of your community. Say hello in #${selectedChannel.name} and help make it your own.`}
                      </p>
                      <div className="community-workspace__welcome-grid">
                        <article className="community-workspace__welcome-card">
                          <span className="community-workspace__welcome-card-icon">
                            <UserPlus size={20} aria-hidden="true" />
                          </span>
                          <div>
                            <h4>Invite your friends</h4>
                            <p>Share an invite and welcome others in.</p>
                          </div>
                          <button
                            type="button"
                            onClick={copyCommunityInvite}
                            className="community-workspace__welcome-action"
                          >
                            {selectedServer.invite_link ||
                            selectedServer.invite_code
                              ? "Copy invite"
                              : "Find invite options"}
                          </button>
                        </article>
                        <article className="community-workspace__welcome-card">
                          <span className="community-workspace__welcome-card-icon">
                            <Settings2 size={20} aria-hidden="true" />
                          </span>
                          <div>
                            <h4>Personalize your community</h4>
                            <p>Update its name and description.</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => openCommunityTools("members")}
                            className="community-workspace__welcome-action"
                          >
                            Manage community
                          </button>
                        </article>
                        <article className="community-workspace__welcome-card">
                          <span className="community-workspace__welcome-card-icon">
                            <Send size={20} aria-hidden="true" />
                          </span>
                          <div>
                            <h4>
                              {hasCurrentUserMessage
                                ? "First message sent"
                                : "Send your first message"}
                            </h4>
                            {hasCurrentUserMessage && (
                              <span className="community-workspace__welcome-complete">
                                <Check size={12} aria-hidden="true" />
                                Completed
                              </span>
                            )}
                            <p>
                              {hasCurrentUserMessage
                                ? `You started the conversation in #${selectedChannel.name}.`
                                : `Start a conversation in #${selectedChannel.name}.`}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => messageComposerRef.current?.focus()}
                            className="community-workspace__welcome-action"
                          >
                            {hasCurrentUserMessage
                              ? "Write another message"
                              : "Write a message"}
                          </button>
                        </article>
                        <article className="community-workspace__welcome-card">
                          <span className="community-workspace__welcome-card-icon">
                            <Hash size={20} aria-hidden="true" />
                          </span>
                          <div>
                            <h4>Explore community channels</h4>
                            <p>
                              {availableChannels.length > 1
                                ? `${availableChannels.length} channels are ready to explore.`
                                : "Create more channels for different conversations."}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={exploreChannels}
                            className="community-workspace__welcome-action"
                          >
                            {availableChannels.length > 1
                              ? "Show channels"
                              : "View channel"}
                          </button>
                        </article>
                        <article className="community-workspace__welcome-card">
                          <span className="community-workspace__welcome-card-icon">
                            <Info size={20} aria-hidden="true" />
                          </span>
                          <div>
                            <h4>View community information</h4>
                            <p>See the details shared by this community.</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setCommunityInfoOpen(true)}
                            className="community-workspace__welcome-action"
                          >
                            View information
                          </button>
                        </article>
                      </div>
                      {welcomeActionMessage && (
                        <p
                          role="status"
                          className="community-workspace__welcome-feedback"
                        >
                          {welcomeActionMessage}
                        </p>
                      )}
                    </div>
                    </div>
                    {(nextMessageCursor || olderMessagesError) && (
                      <div className="community-workspace__history-control">
                        {olderMessagesError && (
                          <p role="alert">{olderMessagesError}</p>
                        )}
                        {nextMessageCursor && (
                          <button
                            type="button"
                            onClick={handleLoadOlderMessages}
                            disabled={loadingOlderMessages}
                          >
                            {loadingOlderMessages
                              ? "Loading older messages..."
                              : olderMessagesError
                                ? "Retry loading older messages"
                                : "Load older messages"}
                          </button>
                        )}
                      </div>
                    )}
                    {messagesLoading ? (
                      <p
                        role="status"
                        className="m-auto inline-flex items-center gap-2 text-sm text-neutral-500"
                      >
                        <LoaderCircle size={16} className="animate-spin" />
                        Loading conversation...
                      </p>
                    ) : messagesError ? (
                      <p role="alert" className="m-auto text-sm text-red-700">
                        {messagesError}
                      </p>
                    ) : (
                      displayedMessages.map((message) => (
                    <article
                      key={message.id}
                      className="community-workspace__message mx-auto flex w-full max-w-4xl items-start gap-3"
                    >
                      <span className="community-workspace__avatar flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-200 text-xs font-semibold text-neutral-700">
                        {message.author?.display_name?.[0]?.toUpperCase() || "?"}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="community-workspace__message-meta flex flex-wrap items-baseline gap-x-2">
                            <span className="community-workspace__author text-sm font-semibold">
                              {message.author?.display_name || "Community member"}
                            </span>
                            {message.created_at && (
                              <time
                                dateTime={message.created_at}
                                className="community-workspace__timestamp text-[11px] text-neutral-400"
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
                <div ref={messageListEndRef} aria-hidden="true" />
                  </>
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
                className="community-workspace__composer flex shrink-0 gap-2 border-t border-neutral-200 bg-white p-3 sm:p-4"
              >
                <label className="sr-only" htmlFor="workspace-message-draft">
                  Write a message
                </label>
                <span className="sr-only">
                  Press Enter to send. Press Shift+Enter for a new line.
                </span>
                <textarea
                  ref={messageComposerRef}
                  id="workspace-message-draft"
                  maxLength={2000}
                  rows={1}
                  value={messageDraft}
                  onChange={(event) => setMessageDraft(event.target.value)}
                  onKeyDown={handleMessageComposerKeyDown}
                  disabled={!selectedChannel || sendingMessage}
                  placeholder={
                    selectedChannel
                      ? `Message #${selectedChannel.name}`
                      : "Choose a channel to message"
                  }
                  className="community-workspace__composer-input mx-auto min-w-0 max-w-4xl flex-1 rounded-xl border border-neutral-200 px-4 py-3 text-sm outline-none transition placeholder:text-neutral-400 focus:border-neutral-500 focus:ring-2 focus:ring-neutral-100 disabled:bg-neutral-50"
                />
                <button
                  type="submit"
                  disabled={
                    !selectedChannel ||
                    !messageDraft.trim() ||
                    sendingMessage
                  }
                  aria-label="Send message"
                  className="community-workspace__send-button flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-neutral-950 text-white transition hover:bg-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-neutral-300"
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
      {communityInfoOpen && selectedServer && (
        <div
          className="community-workspace__overlay fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/60 p-4 backdrop-blur-[2px]"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setCommunityInfoOpen(false);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="workspace-community-info-title"
            className="community-workspace__dialog w-full max-w-md rounded-2xl border border-neutral-200 bg-white shadow-2xl"
          >
            <header className="flex items-start justify-between gap-4 border-b border-neutral-100 px-5 py-5">
              <div>
                <h2
                  id="workspace-community-info-title"
                  className="text-lg font-semibold"
                >
                  {selectedServer.name}
                </h2>
                <p className="mt-1 text-sm text-neutral-600">
                  Community information
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCommunityInfoOpen(false)}
                aria-label="Close community information"
                className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500"
              >
                <X size={18} />
              </button>
            </header>
            <div className="space-y-4 p-5">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  About
                </h3>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-neutral-700">
                  {selectedServer.description?.trim() ||
                    "No community description has been provided."}
                </p>
              </div>
              {selectedServer.created_at && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                    Created
                  </h3>
                  <p className="mt-1 text-sm text-neutral-700">
                    {new Date(selectedServer.created_at).toLocaleDateString()}
                  </p>
                </div>
              )}
              <footer className="flex flex-wrap gap-2 border-t border-neutral-100 pt-4">
                <button
                  type="button"
                  onClick={() => openCommunityTools("members")}
                  className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 px-3 py-2 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500"
                >
                  <UsersRound size={16} />
                  Members & moderation
                </button>
                <button
                  type="button"
                  onClick={() => openCommunityTools("members")}
                  className="community-workspace__welcome-action"
                >
                  Manage community
                </button>
              </footer>
            </div>
          </section>
        </div>
      )}
      {communityToolsOpen && selectedServer && (
        <div
          className="community-workspace__overlay fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/60 p-3 backdrop-blur-[2px] sm:p-5"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setCommunityToolsOpen(false);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="workspace-community-tools-title"
            className="community-workspace__dialog flex max-h-[90dvh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl"
          >
            <header className="flex items-start justify-between gap-4 border-b border-neutral-100 px-5 py-4">
              <div className="min-w-0">
                <h2
                  id="workspace-community-tools-title"
                  className="truncate text-lg font-semibold"
                >
                  {selectedServer.name}
                </h2>
                <p className="mt-1 text-sm text-neutral-600">
                  Manage channels, members, and moderation
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCommunityToolsOpen(false)}
                aria-label="Close community tools"
                className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500"
              >
                <X size={18} />
              </button>
            </header>
            <nav
              aria-label="Community tools"
              className="flex gap-2 overflow-x-auto border-b border-neutral-100 px-4 py-3"
            >
              <button
                type="button"
                aria-pressed={communityToolsTab === "members"}
                onClick={() => setCommunityToolsTab("members")}
                className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                  communityToolsTab === "members"
                    ? "bg-neutral-950 text-white"
                    : "text-neutral-700 hover:bg-neutral-100"
                }`}
              >
                <UsersRound size={16} />
                Members
              </button>
              <button
                type="button"
                aria-pressed={communityToolsTab === "channels"}
                onClick={() => setCommunityToolsTab("channels")}
                className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                  communityToolsTab === "channels"
                    ? "bg-neutral-950 text-white"
                    : "text-neutral-700 hover:bg-neutral-100"
                }`}
              >
                <Hash size={16} />
                Channels
              </button>
              {canModerateCommunity && (
                <>
                  <button
                    type="button"
                    aria-pressed={communityToolsTab === "queue"}
                    onClick={() => {
                      setCommunityToolsTab("queue");
                      setMembersError("");
                    }}
                    className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                      communityToolsTab === "queue"
                        ? "bg-neutral-950 text-white"
                        : "text-neutral-700 hover:bg-neutral-100"
                    }`}
                  >
                    <ShieldCheck size={16} />
                    Moderation
                  </button>
                  <button
                    type="button"
                    aria-pressed={communityToolsTab === "logs"}
                    onClick={() => setCommunityToolsTab("logs")}
                    className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                      communityToolsTab === "logs"
                        ? "bg-neutral-950 text-white"
                        : "text-neutral-700 hover:bg-neutral-100"
                    }`}
                  >
                    <ClipboardList size={16} />
                    Logs
                  </button>
                </>
              )}
            </nav>
            <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
              {communityToolsTab === "channels" && (
                <section aria-label="Channel management">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-neutral-900">
                        Text channels
                      </h3>
                      <p className="mt-1 text-xs text-neutral-600">
                        Select a channel to open its conversation.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(event) => {
                        setCommunityToolsOpen(false);
                        openCreateChannel(event);
                      }}
                      disabled={creatingChannel || channelsLoading}
                      className="inline-flex items-center gap-2 rounded-lg bg-neutral-950 px-3 py-2 text-sm font-semibold text-white transition hover:bg-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Plus size={15} />
                      Create channel
                    </button>
                  </div>
                  {channelsLoading ? (
                    <p role="status" className="flex items-center gap-2 py-6 text-sm text-neutral-600">
                      <LoaderCircle size={16} className="animate-spin" />
                      Loading channels...
                    </p>
                  ) : channelsError ? (
                    <div className="py-4">
                      <p role="alert" className="text-sm text-neutral-700">
                        {channelsError}
                      </p>
                      <button
                        type="button"
                        onClick={() => setChannelRefreshKey((key) => key + 1)}
                        className="mt-2 text-sm font-semibold underline underline-offset-2"
                      >
                        Try again
                      </button>
                    </div>
                  ) : availableChannels.length === 0 ? (
                    <p className="py-6 text-center text-sm text-neutral-600">
                      No channels have been created in this community yet.
                    </p>
                  ) : (
                    <ul className="divide-y divide-neutral-200">
                      {availableChannels.map((channel) => (
                        <li key={channel.id}>
                          <button
                            type="button"
                            onClick={() => {
                              selectChannel(channel);
                              setCommunityToolsOpen(false);
                            }}
                            className="flex w-full items-center justify-between gap-3 py-3 text-left hover:bg-neutral-100/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500"
                          >
                            <span className="flex min-w-0 items-center gap-2">
                              <Hash size={16} className="shrink-0" />
                              <span className="truncate text-sm font-medium text-neutral-900">
                                {channel.name}
                              </span>
                            </span>
                            {String(channel.id) === selectedChannelId && (
                              <span className="text-xs font-semibold text-neutral-600">
                                Current
                              </span>
                            )}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              )}
              {communityToolsTab === "members" && (
                <section aria-label="Community members">
                  {membersSuccess && (
                    <p role="status" className="mb-3 rounded-lg border border-neutral-300 bg-neutral-100 px-3 py-2 text-sm text-neutral-800">
                      {membersSuccess}
                    </p>
                  )}
                  {membersError && (
                    <p role="alert" className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                      {membersError}
                    </p>
                  )}
                  {membersLoading ? (
                    <p role="status" className="flex items-center gap-2 py-8 text-sm text-neutral-600">
                      <LoaderCircle size={16} className="animate-spin" />
                      Loading members...
                    </p>
                  ) : membersError ? null : visibleMembers.length === 0 ? (
                    <p className="py-8 text-center text-sm text-neutral-600">
                      No community members were returned.
                    </p>
                  ) : (
                    <ul className="divide-y divide-neutral-200">
                      {visibleMembers.map((member) => (
                        <li
                          key={member.user_id}
                          className="flex flex-wrap items-center justify-between gap-3 py-3"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            {member.avatar ? (
                              <img
                                src={member.avatar}
                                alt=""
                                className="h-9 w-9 rounded-full object-cover"
                              />
                            ) : (
                              <span
                                aria-hidden="true"
                                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-200 text-sm font-semibold text-neutral-700"
                              >
                                {member.display_name?.trim()?.[0]?.toUpperCase() || "?"}
                              </span>
                            )}
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-semibold text-neutral-900">
                                {member.display_name}
                              </span>
                              <span className="block text-xs text-neutral-500">
                                {member.role || "Member"}
                              </span>
                            </span>
                          </div>
                          {canManageMemberRoles &&
                          member.role !== "owner" &&
                          String(selectedServer?.owner) !==
                            String(member.user_id) ? (
                            <label className="flex items-center gap-2 text-xs font-medium text-neutral-600">
                              <span className="sr-only">
                                Role for {member.display_name}
                              </span>
                              <select
                                value={member.role || "member"}
                                disabled={savingMemberId === String(member.user_id)}
                                onChange={(event) =>
                                  handleMemberRoleChange(member, event.target.value)
                                }
                                className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 disabled:opacity-60"
                              >
                                {ASSIGNABLE_MEMBER_ROLES.map((role) => (
                                  <option key={role} value={role}>
                                    {role}
                                  </option>
                                ))}
                              </select>
                              {savingMemberId === String(member.user_id) && (
                                <LoaderCircle
                                  size={15}
                                  aria-label="Saving role"
                                  className="animate-spin"
                                />
                              )}
                            </label>
                          ) : member.role === "owner" ||
                            String(selectedServer?.owner) ===
                              String(member.user_id) ? (
                            <span className="rounded-full border border-neutral-300 px-2.5 py-1 text-xs font-semibold text-neutral-700">
                              Owner
                            </span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  )}
                  {!membersLoading && !membersError && !canManageMemberRoles && (
                    <p className="mt-3 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs leading-5 text-neutral-600">
                      Only the community owner can change member roles.
                    </p>
                  )}
                </section>
              )}

              {communityToolsTab === "queue" && canModerateCommunity && (
                <section aria-label="Moderation queue">
                  {moderationActionMessage && (
                    <p role="status" className="mb-3 rounded-lg border border-neutral-300 bg-neutral-100 px-3 py-2 text-sm text-neutral-800">
                      {moderationActionMessage}
                    </p>
                  )}
                  {moderationActionError && (
                    <p role="alert" className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                      {moderationActionError}
                    </p>
                  )}
                  {moderationQueueError && (
                    <p role="alert" className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                      {moderationQueueError}
                    </p>
                  )}
                  {moderationQueueLoading ? (
                    <p role="status" className="flex items-center gap-2 py-8 text-sm text-neutral-600">
                      <LoaderCircle size={16} className="animate-spin" />
                      Loading moderation queue...
                    </p>
                  ) : moderationQueueError ? null : visibleModerationQueue.length === 0 ? (
                    <p className="py-8 text-center text-sm text-neutral-600">
                      The moderation queue is empty.
                    </p>
                  ) : (
                    <ul className="space-y-3">
                      {visibleModerationQueue.map((message) => (
                        <li
                          key={message.id}
                          className="rounded-xl border border-neutral-200 bg-neutral-50 p-4"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-semibold text-neutral-900">
                                {message.author?.display_name || "Community member"}
                                <span className="font-normal text-neutral-600">
                                  {" "}in #{message.channel_name}
                                </span>
                              </p>
                              <p className="mt-1 text-xs text-neutral-500">
                                {message.created_at
                                  ? new Date(message.created_at).toLocaleString()
                                  : ""}
                                {message.toxicity_label
                                  ? ` · ${message.toxicity_label}`
                                  : ""}
                              </p>
                            </div>
                            {typeof message.toxicity_score === "number" && (
                              <span className="rounded-full border border-neutral-300 px-2 py-1 text-xs text-neutral-600">
                                Score {message.toxicity_score}
                              </span>
                            )}
                          </div>
                          <p className="mt-3 whitespace-pre-wrap break-words rounded-lg bg-white p-3 text-sm leading-6 text-neutral-800">
                            {message.content}
                          </p>
                          {canModerateCommunity ? (
                            <div className="mt-3 grid gap-2 sm:grid-cols-[150px_minmax(0,1fr)_auto]">
                              <label className="sr-only" htmlFor={`moderation-action-${message.id}`}>
                                Action for message {message.id}
                              </label>
                              <select
                                id={`moderation-action-${message.id}`}
                                value={moderationAction[String(message.id)] || "dismiss"}
                                onChange={(event) =>
                                  setModerationAction((current) => ({
                                    ...current,
                                    [String(message.id)]: event.target.value,
                                  }))
                                }
                                className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500"
                              >
                                {MODERATION_ACTIONS.map((action) => (
                                  <option key={action} value={action}>
                                    {action}
                                  </option>
                                ))}
                              </select>
                              <label className="sr-only" htmlFor={`moderation-reason-${message.id}`}>
                                Reason for action on message {message.id}
                              </label>
                              <input
                                id={`moderation-reason-${message.id}`}
                                type="text"
                                maxLength={500}
                                value={moderationReason[String(message.id)] || ""}
                                onChange={(event) =>
                                  setModerationReason((current) => ({
                                    ...current,
                                    [String(message.id)]: event.target.value,
                                  }))
                                }
                                placeholder="Reason (required)"
                                className="min-w-0 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-800 placeholder:text-neutral-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500"
                              />
                              <button
                                type="button"
                                onClick={() => handleModerationAction(message)}
                                disabled={Boolean(moderationActionId)}
                                className="inline-flex items-center justify-center gap-2 rounded-lg bg-neutral-950 px-3 py-2 text-sm font-semibold text-white transition hover:bg-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 disabled:cursor-wait disabled:opacity-60"
                              >
                                {moderationActionId === String(message.id) ? (
                                  <LoaderCircle size={15} className="animate-spin" />
                                ) : (
                                  <Check size={15} />
                                )}
                                Apply
                              </button>
                            </div>
                          ) : (
                            <p className="mt-3 text-xs text-neutral-600">
                              Moderation actions are available to owners, admins, and moderators.
                            </p>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              )}

              {communityToolsTab === "logs" && canModerateCommunity && (
                <section aria-label="Moderation logs">
                  {moderationLogsError && (
                    <p role="alert" className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                      {moderationLogsError}
                    </p>
                  )}
                  {moderationLogsLoading ? (
                    <p role="status" className="flex items-center gap-2 py-8 text-sm text-neutral-600">
                      <LoaderCircle size={16} className="animate-spin" />
                      Loading moderation logs...
                    </p>
                  ) : moderationLogsError ? null : visibleModerationLogs.length === 0 ? (
                    <p className="py-8 text-center text-sm text-neutral-600">
                      No moderation actions have been recorded.
                    </p>
                  ) : (
                    <ul className="divide-y divide-neutral-200">
                      {visibleModerationLogs.map((log) => (
                        <li key={log.id} className="py-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-semibold capitalize text-neutral-900">
                              {log.action}
                              {log.target_user?.display_name
                                ? ` · ${log.target_user.display_name}`
                                : ""}
                            </p>
                            <time className="text-xs text-neutral-500">
                              {log.created_at
                                ? new Date(log.created_at).toLocaleString()
                                : ""}
                            </time>
                          </div>
                          <p className="mt-1 text-sm leading-5 text-neutral-700">
                            {log.reason}
                          </p>
                          <p className="mt-1 text-xs text-neutral-500">
                            By {log.actor?.display_name || "Moderator"}
                            {log.message_id != null
                              ? ` · Message ${log.message_id}`
                              : ""}
                            {log.toxicity_label
                              ? ` · ${log.toxicity_label}`
                              : ""}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
