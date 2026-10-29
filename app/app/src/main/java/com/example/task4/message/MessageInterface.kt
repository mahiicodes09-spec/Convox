package com.example.task4.message

import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.POST
import retrofit2.http.Path

interface MessageInterface {

    @GET("api/channels/{channel_id}/messages/")
    suspend fun getMessages(
        @Header("Authorization") token: String,
        @Path("channel_id") channelId: Int
    ): Response<MessageListResponse>

    @POST("api/channels/{channel_id}/messages/")
    suspend fun sendMessage(
        @Header("Authorization") token: String,
        @Path("channel_id") channelId: Int,
        @Body req: MessageRequest
    ): Response<MessageResponse>
}