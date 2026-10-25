package com.example.task4.ServerAdapter

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.example.task4.R
import com.example.task4.server.ServerResponse

class ServerAdapter(
    private val serverList: List<ServerResponse>,
    private val onServerClick: (ServerResponse) -> Unit,
    private val onServerLongClick: (ServerResponse) -> Unit

) : RecyclerView.Adapter<ServerAdapter.ServerViewHolder>() {

    class ServerViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        val tvServerName: TextView = itemView.findViewById(R.id.tvServerName)
        val tvServerOptions: TextView = itemView.findViewById(R.id.tvServerOptions)

    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ServerViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_server, parent, false)
        return ServerViewHolder(view)
    }

    override fun onBindViewHolder(holder: ServerViewHolder, position: Int) {
        val server = serverList[position]
        holder.tvServerName.text = server.name
        holder.itemView.setOnClickListener { onServerClick(server) }

        holder.itemView.setOnClickListener {
            onServerClick(server)
            true
        }
    }

    override fun getItemCount(): Int {
        return serverList.size
    }
}