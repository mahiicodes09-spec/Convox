package com.example.task4.moderation

import android.content.Context
import com.example.task4.ApiClient
import com.example.task4.SessionManager
import com.google.gson.JsonElement
import retrofit2.Response

class ModerationRepository(context: Context) {

    private val sessionManager =
        SessionManager(context.applicationContext)

    private fun token(): String {
        return "Bearer ${sessionManager.getAccessToken()}"
    }

    suspend fun getModerationQueue(
        serverId: Int
    ): Response<JsonElement> {
        return ApiClient.moderationApi.getModerationQueue(
            token(),
            serverId
        )
    }

    suspend fun getModerationLogs(
        serverId: Int
    ): Response<JsonElement> {
        return ApiClient.moderationApi.getModerationLogs(
            token(),
            serverId
        )
    }

    suspend fun takeModerationAction(
        messageId: Int,
        action: String,
        reason: String
    ): Response<ModerationResponse> {
        val request = ModerationRequest(
            action = action,
            reason = reason
        )

        return ApiClient.moderationApi.takeModerationAction(
            token(),
            messageId,
            request
        )
    }
}