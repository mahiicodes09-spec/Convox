
package com.example.task4.member

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.example.task4.R

class MemberAdapter(
    private val memberList: List<MemberResponse>
) : RecyclerView.Adapter<MemberAdapter.MemberViewHolder>() {

    class MemberViewHolder(itemView: View) :
        RecyclerView.ViewHolder(itemView) {

        val name: TextView = itemView.findViewById(R.id.tvMemberName)
        val role: TextView = itemView.findViewById(R.id.tvMemberRole)
    }

    override fun onCreateViewHolder(
        parent: ViewGroup,
        viewType: Int
    ): MemberViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_members, parent, false)

        return MemberViewHolder(view)
    }

    override fun onBindViewHolder(
        holder: MemberViewHolder,
        position: Int
    ) {
        val member = memberList[position]

        holder.name.text = member.display_name
        holder.role.text = member.role
    }

    override fun getItemCount(): Int {
        return memberList.size
    }

}
