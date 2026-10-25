package com.example.task4

import android.content.Intent
import android.os.Bundle
import android.widget.Button
import android.widget.EditText
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.ViewModelProvider
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.example.task4.ServerAdapter.ServerAdapter
import com.example.task4.server.ServerRequest
import com.example.task4.server.ServerResponse
import com.example.task4.server.ServerVM

class ServersActivity : AppCompatActivity() {

    private lateinit var viewModel: ServerVM
    private lateinit var rvServers: RecyclerView
    private var pendingCode = ""

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_servers)

        rvServers = findViewById(R.id.rvServers)
        rvServers.layoutManager = LinearLayoutManager(this)

        viewModel = ViewModelProvider(this)[ServerVM::class.java]

        viewModel.servers.observe(this) { list ->
            rvServers.adapter = ServerAdapter(
                list,
                onServerClick = { server ->
                    val intent = Intent(this, channels::class.java)
                    intent.putExtra("serverId", server.id)
                    intent.putExtra("serverName", server.name)
                    startActivity(intent)
                },
                onServerLongClick = { server ->
                    showServerOptions(server)
                }
            )
        }

        viewModel.invitePreview.observe(this) { preview ->
            AlertDialog.Builder(this)
                .setTitle("Join ${preview.name}?")
                .setMessage("Members: ${preview.member_count}\n${preview.description ?: ""}")
                .setPositiveButton("Join") { _, _ -> viewModel.joinServer(pendingCode) }
                .setNegativeButton("Cancel", null)
                .show()
        }

        viewModel.message.observe(this) { text ->
            Toast.makeText(this, text, Toast.LENGTH_SHORT).show()
        }

        viewModel.error.observe(this) { text ->
            Toast.makeText(this, text, Toast.LENGTH_LONG).show()
        }

        findViewById<Button>(R.id.btnCreateServer).setOnClickListener {
            showInputDialog("Create Server", "Server name", "") { name ->
                viewModel.createServer(ServerRequest(name))
            }
        }

        findViewById<Button>(R.id.btnJoinServer).setOnClickListener {
            showInputDialog("Join with Invite", "Invite code", "") { code ->
                viewModel.joinServer(code.trim())
            }
        }

        viewModel.loadServers()
    }

    private fun showServerOptions(server: ServerResponse) {
        AlertDialog.Builder(this)
            .setTitle(server.name)
            .setItems(arrayOf("Edit name", "Delete")) { _, which ->
                if (which == 0) {
                    showInputDialog("Edit Server", "Server name", server.name) { newName ->
                        viewModel.updateServer(server.id, newName)
                    }
                } else {
                    AlertDialog.Builder(this)
                        .setTitle("Delete ${server.name}?")
                        .setMessage("This cannot be undone.")
                        .setPositiveButton("Delete") { _, _ -> viewModel.deleteServer(server.id) }
                        .setNegativeButton("Cancel", null)
                        .show()
                }
            }
            .show()
    }

    private fun showInputDialog(
        title: String,
        hint: String,
        startText: String,
        onOk: (String) -> Unit
    ) {
        val dialogView = layoutInflater.inflate(R.layout.dialog_input, null)
        val etInput = dialogView.findViewById<EditText>(R.id.etInput)
        etInput.hint = hint
        etInput.setText(startText)

        AlertDialog.Builder(this)
            .setTitle(title)
            .setView(dialogView)
            .setPositiveButton("OK") { _, _ ->
                val text = etInput.text.toString().trim()
                if (text.isEmpty()) {
                    Toast.makeText(this, "Please type something", Toast.LENGTH_SHORT).show()
                } else {
                    onOk(text)
                }
            }
            .setNegativeButton("Cancel", null)
            .show()
    }
}