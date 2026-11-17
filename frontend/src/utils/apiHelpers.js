export function getApiErrorMessage(error, fallback) {
  const status = error.response?.status;
  const retryAfter = error.response?.headers?.["retry-after"];

  if (status === 429) {
    if (retryAfter) {
      return `Rate limit reached. Please wait ${retryAfter} second${retryAfter === "1" ? "" : "s"} before trying again.`;
    }
    return "You are making requests too quickly. Please wait a moment and try again.";
  }

  const data = error.response?.data;
  const detail = data?.detail || data?.message;
  if (typeof detail === "string") {
    return detail;
  }

  if (data && typeof data === "object") {
    const firstError = Object.entries(data).find(([, value]) => value != null);
    if (firstError) {
      const [field, value] = firstError;
      if (Array.isArray(value) && typeof value[0] === "string") {
        return `${field}: ${value[0]}`;
      }
      if (typeof value === "string") {
        return `${field}: ${value}`;
      }
    }
  }

  if (status === 403) {
    return "You do not have permission to perform this action.";
  }
  if (status === 404) {
    return "The requested item could not be found.";
  }
  if (status >= 500) {
    return "The server could not complete your request. Please try again.";
  }

  return fallback || error.message || "Something went wrong. Please try again.";
}

export function getChannelServerId(channel) {
  const server = channel?.server ?? channel?.server_id;
  if (server && typeof server === "object") {
    return server.id == null ? null : String(server.id);
  }
  return server == null ? null : String(server);
}

export function getNextCursor(next) {
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

export function mergeMessagesChronologically(existing, incoming) {
  const messagesById = new Map(
    existing.map((message) => [String(message.id), message]),
  );
  incoming.forEach((message) => {
    messagesById.set(String(message.id), message);
  });
  return [...messagesById.values()].sort(
    (left, right) =>
      Date.parse(left.created_at) - Date.parse(right.created_at),
  );
}
