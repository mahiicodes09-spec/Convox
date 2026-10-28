
package com.example.task4

import android.os.Bundle
import android.widget.Button
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.ViewModelProvider
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.example.task4.moderation.FlaggedMsgAdapter
import com.example.task4.moderation.ModerationLogAdapter
import com.example.task4.moderation.ModerationVM
import android.app.AlertDialog
import android.widget.EditText

class ModeratorActivity : AppCompatActivity() {

    private var serverId: Int = -1
    private var serverName: String = ""

    private lateinit var viewModel: ModerationVM

    private lateinit var queueRecyclerView: RecyclerView
    private lateinit var logsRecyclerView: RecyclerView
    private lateinit var emptyText: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_moderator)

        serverId = intent.getIntExtra("serverId", -1)
        serverName = intent.getStringExtra("serverName") ?: ""

        val title = findViewById<TextView>(R.id.tvModeratorTitle)
        val queueButton = findViewById<Button>(R.id.btnModerationQueue)
        val logsButton = findViewById<Button>(R.id.btnModerationLogs)

        queueRecyclerView =
            findViewById(R.id.rvModerationQueue)

        logsRecyclerView =
            findViewById(R.id.rvModerationLogs)

        emptyText =
            findViewById(R.id.tvModerationEmpty)

        title.text = "$serverName - Moderator"

        queueRecyclerView.layoutManager =
            LinearLayoutManager(this)

        logsRecyclerView.layoutManager =
            LinearLayoutManager(this)

        viewModel = ViewModelProvider(this)[ModerationVM::class.java]

        observeData()

        queueButton.setOnClickListener {
            showQueue()
            viewModel.loadModerationQueue(serverId)
        }

        logsButton.setOnClickListener {
            showLogs()
            viewModel.loadModerationLogs(serverId)
        }

        if (serverId == -1) {
            Toast.makeText(
                this,
                "Server information is missing",
                Toast.LENGTH_LONG
            ).show()
            finish()
        }
    }

    private fun observeData() {

        viewModel.moderationQueue.observe(this) { messages ->
            queueRecyclerView.adapter =
                FlaggedMsgAdapter(messages) { message ->
                    showModerationAction(message.id)
                }

            if (queueRecyclerView.visibility == android.view.View.VISIBLE) {
                emptyText.text =
                    if (messages.isEmpty()) "No flagged messages found"
                    else ""
                emptyText.visibility =
                    if (messages.isEmpty()) android.view.View.VISIBLE
                    else android.view.View.GONE
            }
        }

        viewModel.moderationLogs.observe(this) { logs ->
            logsRecyclerView.adapter =
                ModerationLogAdapter(logs)

            if (logsRecyclerView.visibility == android.view.View.VISIBLE) {
                emptyText.text =
                    if (logs.isEmpty()) "No moderation logs found"
                    else ""
                emptyText.visibility =
                    if (logs.isEmpty()) android.view.View.VISIBLE
                    else android.view.View.GONE
            }
        }

        viewModel.error.observe(this) { message ->
            if (!message.isNullOrBlank()) {
                Toast.makeText(
                    this,
                    message,
                    Toast.LENGTH_LONG
                ).show()
            }
        }
    }

    private fun showQueue() {
        queueRecyclerView.visibility = android.view.View.VISIBLE
        logsRecyclerView.visibility = android.view.View.GONE
        emptyText.visibility = android.view.View.GONE
    }

    private fun showLogs() {
        queueRecyclerView.visibility = android.view.View.GONE
        logsRecyclerView.visibility = android.view.View.VISIBLE
        emptyText.visibility = android.view.View.GONE
    }


    private fun showModerationAction(messageId: Int) {

        val reasonInput = EditText(this)
        reasonInput.hint = "Enter reason for this action"

        val actions = arrayOf("Dismiss", "Warn", "Remove")

        AlertDialog.Builder(this)
            .setTitle("Moderate Message")
            .setMessage("Choose an action for message ID: $messageId")
            .setView(reasonInput)
            .setItems(actions) { _, position ->

                val action = when (position) {
                    0 -> "dismiss"
                    1 -> "warn"
                    else -> "remove"
                }

                val reason = reasonInput.text.toString().trim()

                if (reason.isEmpty()) {
                    Toast.makeText(
                        this,
                        "Please enter a reason",
                        Toast.LENGTH_SHORT
                    ).show()
                } else {
                    confirmModerationAction(
                        messageId,
                        action,
                        reason
                    )
                }
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

}
