
package com.example.task4.moderation

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.example.task4.R

class FlaggedMsgAdapter(
    private val messages: List<FlaggedMessageResponse>,
    private val onTakeAction: (FlaggedMessageResponse) -> Unit
) : RecyclerView.Adapter<FlaggedMsgAdapter.MessageViewHolder>() {

    class MessageViewHolder(itemView: View) :
        RecyclerView.ViewHolder(itemView) {

        val author: TextView =
            itemView.findViewById(R.id.tvFlaggedAuthor)

        val channel: TextView =
            itemView.findViewById(R.id.tvFlaggedChannel)

        val content: TextView =
            itemView.findViewById(R.id.tvFlaggedContent)

        val toxicity: TextView =
            itemView.findViewById(R.id.tvToxicity)

        val actionButton: Button =
            itemView.findViewById(R.id.btnModerateMessage)
    }

    override fun onCreateViewHolder(
        parent: ViewGroup,
        viewType: Int
    ): MessageViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_flagged_message, parent, false)

        return MessageViewHolder(view)
    }

    override fun onBindViewHolder(
        holder: MessageViewHolder,
        position: Int
    ) {
        val message = messages[position]

        holder.author.text = message.author.display_name
        holder.channel.text = "Channel: ${message.channel_name}"
        holder.content.text = message.content
        holder.toxicity.text =
            "Toxicity: ${message.toxicity_label} (${message.toxicity_score})"

        holder.actionButton.setOnClickListener {
            onTakeAction(message)
        }
    }

    override fun getItemCount(): Int {
        return messages.size
    }
}
