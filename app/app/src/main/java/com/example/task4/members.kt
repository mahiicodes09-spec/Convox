
package com.example.task4.member

import android.os.Bundle
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.ViewModelProvider
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.example.task4.R

class MembersActivity : AppCompatActivity() {

    private lateinit var memberVM: MemberVM
    private lateinit var rvMembers: RecyclerView
    private lateinit var tvMembersTitle: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_members)

        rvMembers = findViewById(R.id.rvMembers)
        tvMembersTitle = findViewById(R.id.tvMembersTitle)

        rvMembers.layoutManager = LinearLayoutManager(this)

        val serverId = intent.getIntExtra("serverId", -1)

        if (serverId == -1) {
            Toast.makeText(
                this,
                "Server ID not found",
                Toast.LENGTH_SHORT
            ).show()
            finish()
            return
        }

        memberVM = ViewModelProvider(this)[MemberVM::class.java]


        memberVM.members.observe(this) { members ->

            tvMembersTitle.text = "Members (${members.size})"

            rvMembers.adapter = MemberAdapter(members)
        }


        memberVM.error.observe(this) { error ->
            if (!error.isNullOrEmpty()) {
                Toast.makeText(
                    this,
                    error,
                    Toast.LENGTH_SHORT
                ).show()
            }
        }

        memberVM.loadMembers(serverId)
    }
}
