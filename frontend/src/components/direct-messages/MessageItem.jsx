import { Pencil, Trash2 } from "lucide-react";

export default function MessageItem({
  author,
  content,
  timestamp,
  onEdit,
  onDelete,
}) {
  return (
    <article className="dm-message">
      <div className="dm-message-heading">
        <span className="dm-message-author">{author}</span>
        {timestamp && (
          <time className="dm-message-time" dateTime={timestamp}>
            {timestamp}
          </time>
        )}
      </div>
      <p className="dm-message-content">{content}</p>
      {(onEdit || onDelete) && (
        <div className="dm-message-actions">
          {onEdit && (
            <button
              type="button"
              className="dm-icon-button"
              onClick={onEdit}
              aria-label="Edit message"
              title="Edit message"
            >
              <Pencil size={15} />
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              className="dm-icon-button"
              onClick={onDelete}
              aria-label="Delete message"
              title="Delete message"
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
      )}
    </article>
  );
}
