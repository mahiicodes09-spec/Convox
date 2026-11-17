import { ArrowLeft, MessageCircle } from "lucide-react";
import MessageItem from "./MessageItem";

export default function ConversationView({
  conversation,
  messages,
  loading,
  error,
  responseReceived,
  onBack,
  onEditMessage,
  onDeleteMessage,
}) {
  return (
    <section className="dm-conversation-view" aria-label="Direct conversation">
      {conversation ? (
        <header className="dm-chat-header">
          <button
            type="button"
            className="dm-back-button"
            onClick={onBack}
            aria-label="Back to conversations"
          >
            <ArrowLeft size={18} />
            <span>Conversations</span>
          </button>
          {conversation.avatarUrl ? (
            <img className="dm-avatar" src={conversation.avatarUrl} alt="" />
          ) : (
            <span className="dm-avatar dm-avatar-placeholder" aria-hidden="true">
              {conversation.name?.trim()?.[0]?.toUpperCase() || "?"}
            </span>
          )}
          <h2 className="dm-chat-title">{conversation.name || "Conversation"}</h2>
        </header>
      ) : (
        <header className="dm-chat-header dm-chat-header-empty">
          <h2 className="dm-chat-title">Direct Messages</h2>
        </header>
      )}

      <div className="dm-message-list" aria-live="polite">
        {!conversation ? (
          <div className="dm-state dm-chat-empty">
            <MessageCircle size={25} aria-hidden="true" />
            <p>
              Conversation details cannot be displayed until the backend
              response fields are confirmed.
            </p>
          </div>
        ) : loading ? (
          <div className="dm-state" role="status">
            Loading messages...
          </div>
        ) : error ? (
          <div className="dm-state" role="alert">
            {error}
          </div>
        ) : !Array.isArray(messages) ? (
          <div className="dm-state" role={responseReceived ? "status" : undefined}>
            {responseReceived
              ? "The message response fields are not confirmed yet, so messages are not displayed."
              : "Message data is not available."}
          </div>
        ) : messages.length === 0 ? (
          <div className="dm-state" role="status">
            No messages in this conversation yet.
          </div>
        ) : (
          messages.map((message) => (
            <MessageItem
              key={message.id}
              author={message.author}
              content={message.content}
              timestamp={message.timestamp}
              onEdit={
                onEditMessage ? () => onEditMessage(message) : undefined
              }
              onDelete={
                onDeleteMessage ? () => onDeleteMessage(message) : undefined
              }
            />
          ))
        )}
      </div>
    </section>
  );
}
