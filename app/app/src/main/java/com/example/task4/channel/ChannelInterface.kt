package com.example.task4.channel

import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.POST
import retrofit2.http.Path

interface ChannelInterface {

    @GET("api/servers/{server_id}/channels/")
    suspend fun getChannels(
        @Header("Authorization") token: String,
        @Path("server_id") serverId: Int
    ): Response<List<ChannelResponse>>

    @POST("api/servers/{server_id}/channels/")
    suspend fun createChannel(
        @Header("Authorization") token: String,
        @Path("server_id") serverId: Int,
        @Body req: ChannelRequest
    ): Response<ChannelResponse>
}