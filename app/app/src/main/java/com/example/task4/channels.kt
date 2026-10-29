package com.example.task4

import android.content.Intent
import android.os.Bundle
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import android.widget.Toast
import androidx.activity.enableEdgeToEdge
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.lifecycle.ViewModelProvider
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.example.task4.channel.ChannelAdapter
import com.example.task4.channel.ChannelVM
import com.example.task4.server.ServerVM

class channels : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContentView(R.layout.activity_channels)

        val serverId = intent.getIntExtra("serverId", -1)
        val serverName = intent.getStringExtra("serverName")

        findViewById<TextView>(R.id.tvServerTitle).text = serverName

        val rvChannels = findViewById<RecyclerView>(R.id.rvChannels)
        rvChannels.layoutManager = LinearLayoutManager(this)

        val channelVM = ViewModelProvider(this)[ChannelVM::class.java]
        val serverVM = ViewModelProvider(this)[ServerVM::class.java]

        channelVM.channels.observe(this) { list ->
            rvChannels.adapter = ChannelAdapter(list) { channel ->
                val intent = Intent(this, MessagesActivity::class.java)
                intent.putExtra("channelId", channel.id)
                intent.putExtra("channelName", channel.name)
                startActivity(intent)
            }
        }

        channelVM.error.observe(this) { text ->
            Toast.makeText(this, text, Toast.LENGTH_LONG).show()
        }

        findViewById<Button>(R.id.btnCreateChannel).setOnClickListener {
            val dialogView = layoutInflater.inflate(R.layout.dialog_input, null)
            val etInput = dialogView.findViewById<EditText>(R.id.etInput)
            etInput.hint = "Channel name"

            AlertDialog.Builder(this)
                .setTitle("Create Channel")
                .setView(dialogView)
                .setPositiveButton("Create") { _, _ ->
                    val name = etInput.text.toString().trim()
                    if (name.isEmpty()) {
                        Toast.makeText(this, "Enter a name", Toast.LENGTH_SHORT).show()
                    } else {
                        channelVM.createChannel(serverId, name)
                    }
                }
                .setNegativeButton("Cancel", null)
                .show()
        }

        serverVM.serverDetail.observe(this) { server ->
            AlertDialog.Builder(this)
                .setTitle("Invite code")
                .setMessage(server.invite_code ?: "No invite code available")
                .setPositiveButton("OK", null)
                .show()
        }

        findViewById<Button>(R.id.btnInvite).setOnClickListener {
            serverVM.loadServer(serverId)
        }

        channelVM.loadChannels(serverId)

        ViewCompat.setOnApplyWindowInsetsListener(findViewById(R.id.main)) { v, insets ->
            val systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
            v.setPadding(systemBars.left, systemBars.top, systemBars.right, systemBars.bottom)
            insets
        }
    }
}