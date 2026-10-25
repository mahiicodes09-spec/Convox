package com.example.task4.message

import android.content.Context
import com.example.task4.ApiClient
import com.example.task4.SessionManager
import retrofit2.Response

class MessageRepository(context: Context) {

    val sessionManager = SessionManager(context.applicationContext)

    private fun token() = "Bearer ${sessionManager.getAccessToken()}"

    suspend fun getMessages(channelId: Int): Response<MessageListResponse> =
        ApiClient.messageApi.getMessages(token(), channelId)

    suspend fun sendMessage(channelId: Int, text: String): Response<MessageResponse> =
        ApiClient.messageApi.sendMessage(token(), channelId, MessageRequest(text))
}