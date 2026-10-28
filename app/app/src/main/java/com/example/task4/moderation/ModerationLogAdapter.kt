
package com.example.task4.moderation

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.example.task4.R

class ModerationLogAdapter(
    private val logs: List<ModerationLogResponse>
) : RecyclerView.Adapter<ModerationLogAdapter.LogViewHolder>() {

    class LogViewHolder(itemView: View) :
        RecyclerView.ViewHolder(itemView) {

        val action: TextView =
            itemView.findViewById(R.id.tvLogAction)

        val message: TextView =
            itemView.findViewById(R.id.tvLogMessage)

        val moderator: TextView =
            itemView.findViewById(R.id.tvLogModerator)

        val reason: TextView =
            itemView.findViewById(R.id.tvLogReason)

        val date: TextView =
            itemView.findViewById(R.id.tvLogDate)
    }

    override fun onCreateViewHolder(
        parent: ViewGroup,
        viewType: Int
    ): LogViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_moderation_log, parent, false)

        return LogViewHolder(view)
    }

    override fun onBindViewHolder(
        holder: LogViewHolder,
        position: Int
    ) {
        val log = logs[position]

        holder.action.text = "Action: ${log.action}"
        holder.message.text = "Message ID: ${log.message}"
        holder.moderator.text = "Moderator ID: ${log.moderator}"
        holder.reason.text = "Reason: ${log.reason}"
        holder.date.text = "Date: ${log.created_at}"
    }

    override fun getItemCount(): Int {
        return logs.size
    }
}
