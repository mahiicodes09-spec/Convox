import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Send } from "lucide-react";
import { getApiErrorMessage } from "../utils/apiHelpers";
import { getConversations } from "../services/directMessages";
import ConversationList from "../components/direct-messages/ConversationList";
import ConversationView from "../components/direct-messages/ConversationView";
import "./DirectMessagesPage.css";

export default function DirectMessagesPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [responseReceived, setResponseReceived] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [mobileConversationOpen, setMobileConversationOpen] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadConversations() {
      try {
        await getConversations();
        if (active) {
          setResponseReceived(true);
        }
      } catch (requestError) {
        if (active) {
          setError(
            getApiErrorMessage(
              requestError,
              "Could not load direct messages. Please try again.",
            ),
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadConversations();
    return () => {
      active = false;
    };
  }, [refreshKey]);

  function handleRetry() {
    setLoading(true);
    setError("");
    setResponseReceived(false);
    setRefreshKey((currentKey) => currentKey + 1);
  }

  function handleSelectConversation(conversation) {
    setSelectedConversation(conversation);
    setMobileConversationOpen(true);
  }

  function handleBackToConversations() {
    setMobileConversationOpen(false);
  }

  return (
    <main className="dm-page">
      <header className="dm-page-header">
        <Link className="dm-dashboard-link" to="/dashboard">
          <ArrowLeft size={17} />
          <span>Dashboard</span>
        </Link>
        <div className="dm-page-title">
          <Send size={19} aria-hidden="true" />
          <h1>Direct Messages</h1>
        </div>
      </header>

      <div
        className={`dm-layout ${
          mobileConversationOpen ? "dm-layout-conversation-open" : ""
        }`}
      >
        <aside className="dm-list-panel" aria-label="Conversation list">
          <h2 className="dm-panel-title">Conversations</h2>
          <ConversationList
            conversations={null}
            loading={loading}
            error={error}
            responseReceived={responseReceived}
            selectedConversationId={selectedConversation?.id}
            onSelect={handleSelectConversation}
            onRetry={handleRetry}
          />
        </aside>

        <ConversationView
          conversation={selectedConversation}
          messages={null}
          loading={false}
          error=""
          responseReceived={false}
          onBack={handleBackToConversations}
        />
      </div>
    </main>
  );
}
