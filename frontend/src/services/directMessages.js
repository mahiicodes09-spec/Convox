import api from "./api";

export async function getConversations() {
  const response = await api.get("/conversations/");
  return response.data;
}

export async function getConversationMessages(
  conversationId,
  { cursor, search } = {},
) {
  const params = {};
  if (cursor !== undefined) params.cursor = cursor;
  if (search !== undefined) params.search = search;

  const response = await api.get(
    `/conversations/${encodeURIComponent(conversationId)}/messages/`,
    { params },
  );
  return response.data;
}

export async function sendConversationMessage(conversationId, content) {
  const response = await api.post(
    `/conversations/${encodeURIComponent(conversationId)}/messages/`,
    { content },
  );
  return response.data;
}

export async function updateDirectMessage(messageId, content) {
  const response = await api.patch(
    `/direct-messages/${encodeURIComponent(messageId)}/`,
    { content },
  );
  return response.data;
}

export async function deleteDirectMessage(messageId) {
  const response = await api.delete(
    `/direct-messages/${encodeURIComponent(messageId)}/`,
  );
  return response.data;
}
