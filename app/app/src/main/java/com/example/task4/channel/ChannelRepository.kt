package com.example.task4.channel

import android.content.Context
import com.example.task4.ApiClient
import com.example.task4.SessionManager
import retrofit2.Response

class ChannelRepository(context: Context) {

    val sessionManager = SessionManager(context.applicationContext)

    private fun token() = "Bearer ${sessionManager.getAccessToken()}"

    suspend fun getChannels(serverId: Int): Response<List<ChannelResponse>> =
        ApiClient.channelApi.getChannels(token(), serverId)

    suspend fun createChannel(serverId: Int, name: String): Response<ChannelResponse> =
        ApiClient.channelApi.createChannel(token(), serverId, ChannelRequest(name))
}