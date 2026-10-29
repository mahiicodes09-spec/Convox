package com.example.task4.server

import android.content.Context
import com.example.task4.ApiClient
import com.example.task4.SessionManager
import retrofit2.Response

class ServerRepository(context: Context) {

    val sessionManager = SessionManager(context.applicationContext)

    private fun token() = "Bearer ${sessionManager.getAccessToken()}"

    private val api get() = ApiClient.createServer

    suspend fun getServers(): Response<List<ServerResponse>> =
        api.getServers(token())

    suspend fun create_server(req: ServerRequest): Response<ServerResponse> =
        api.createServer(token(), req)

    suspend fun getServer(id: Int): Response<ServerResponse> =
        api.getServer(token(), id)

    suspend fun updateServer(id: Int, name: String): Response<ServerResponse> =
        api.updateServer(token(), id, UpdateServerRequest(name = name))

    suspend fun deleteServer(id: Int): Response<Unit> =
        api.deleteServer(token(), id)

    suspend fun joinServer(code: String): Response<ServerResponse> =
        api.joinServer(token(), JoinServerRequest(code))

    suspend fun getInvitePreview(code: String): Response<InvitePreview> =
        api.getInvitePreview(code)
}

//data transfer api communication