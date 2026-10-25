package com.example.task4

import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.ViewModelProvider
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.example.task4.message.MessageAdapter
import com.example.task4.message.MessageVM
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat

class MessagesActivity : AppCompatActivity() {

    private lateinit var viewModel: MessageVM
    private var channelId = -1
    private var lastCount = 0

    private val handler = Handler(Looper.getMainLooper())
    private val refreshTask = object : Runnable {
        override fun run() {
            viewModel.loadMessages(channelId)
            handler.postDelayed(this, 5000)
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_messages)


        ViewCompat.setOnApplyWindowInsetsListener(findViewById(R.id.main)) { v, insets ->
            val bars = insets.getInsets(
                WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.ime()
            )
            v.setPadding(bars.left, bars.top, bars.right, bars.bottom)
            insets
        }




        channelId = intent.getIntExtra("channelId", -1)
        val channelName = intent.getStringExtra("channelName")

        findViewById<TextView>(R.id.tvChannelTitle).text = "# $channelName"

        val rvMessages = findViewById<RecyclerView>(R.id.rvMessages)
        rvMessages.layoutManager = LinearLayoutManager(this)
        val adapter = MessageAdapter()
        rvMessages.adapter = adapter

        val etMessage = findViewById<EditText>(R.id.etMessage)
        val btnSend = findViewById<Button>(R.id.btnSend)

        viewModel = ViewModelProvider(this)[MessageVM::class.java]

        viewModel.messages.observe(this) { list ->
            adapter.submit(list)
            if (list.size != lastCount && list.isNotEmpty()) {
                rvMessages.scrollToPosition(list.size - 1)
            }
            lastCount = list.size
        }

        viewModel.error.observe(this) { text ->
            Toast.makeText(this, text, Toast.LENGTH_LONG).show()
        }

        btnSend.setOnClickListener {
            val text = etMessage.text.toString().trim()
            if (text.isEmpty()) {
                Toast.makeText(this, "Type a message", Toast.LENGTH_SHORT).show()
            } else {
                viewModel.sendMessage(channelId, text)
                etMessage.setText("")
            }
        }
    }

    override fun onResume() {
        super.onResume()
        handler.post(refreshTask)
    }

    override fun onPause() {
        super.onPause()
        handler.removeCallbacks(refreshTask)
    }





}