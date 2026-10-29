package com.example.task4.member

import retrofit2.Response
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.Path

interface MemberInterface {

    @GET("api/servers/{server_id}/members/")
    suspend fun getMembers(
        @Header("Authorization") token: String,
        @Path("server_id") serverId: Int
    ): Response<List<MemberResponse>>
}