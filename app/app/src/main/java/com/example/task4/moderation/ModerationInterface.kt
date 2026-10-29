package com.example.task4.moderation

import com.google.gson.JsonElement
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.POST
import retrofit2.http.Path

interface ModerationInterface {

    @GET("api/servers/{server_id}/moderation/queue/")
    suspend fun getModerationQueue(
        @Header("Authorization") token: String,
        @Path("server_id") serverId: Int
    ): Response<JsonElement>

    @GET("api/servers/{server_id}/moderation/logs/")
    suspend fun getModerationLogs(
        @Header("Authorization") token: String,
        @Path("server_id") serverId: Int
    ): Response<JsonElement>

    @POST("api/moderation/messages/{message_id}/action/")
    suspend fun takeModerationAction(
        @Header("Authorization") token: String,
        @Path("message_id") messageId: Int,
        @Body request: ModerationRequest
    ): Response<ModerationResponse>
}