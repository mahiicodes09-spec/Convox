export default function ConversationList({
  conversations,
  loading,
  error,
  responseReceived,
  selectedConversationId,
  onSelect,
  onRetry,
}) {
  if (loading) {
    return (
      <div className="dm-state" role="status">
        Loading conversations...
      </div>
    );
  }

  if (error) {
    return (
      <div className="dm-state" role="alert">
        <p>{error}</p>
        <button type="button" className="dm-secondary-button" onClick={onRetry}>
          Retry
        </button>
      </div>
    );
  }

  if (!Array.isArray(conversations)) {
    return (
      <div className="dm-state" role={responseReceived ? "status" : undefined}>
        {responseReceived
          ? "The conversation response fields are not confirmed yet, so conversations are not displayed."
          : "Conversation data is not available."}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="dm-state" role="status">
        No conversations yet.
      </div>
    );
  }

  return (
    <ul className="dm-conversation-items" aria-label="Conversations">
      {conversations.map((conversation) => (
        <li key={conversation.id}>
          <button
            type="button"
            className={`dm-conversation-item ${
              String(selectedConversationId) === String(conversation.id)
                ? "is-selected"
                : ""
            }`}
            aria-current={
              String(selectedConversationId) === String(conversation.id)
                ? "true"
                : undefined
            }
            onClick={() => onSelect(conversation)}
          >
            {conversation.avatarUrl ? (
              <img
                className="dm-avatar"
                src={conversation.avatarUrl}
                alt=""
              />
            ) : (
              <span className="dm-avatar dm-avatar-placeholder" aria-hidden="true">
                {conversation.name?.trim()?.[0]?.toUpperCase() || "?"}
              </span>
            )}
            <span className="dm-conversation-copy">
              <span className="dm-conversation-name">
                {conversation.name || "Conversation"}
              </span>
              <span className="dm-conversation-preview">
                {conversation.lastMessagePreview || "No messages yet"}
              </span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
