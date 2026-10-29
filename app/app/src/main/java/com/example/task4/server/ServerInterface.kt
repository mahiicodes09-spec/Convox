package com.example.task4.server

import okhttp3.ResponseBody
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.Path

interface ServerInterface {

    //all end points declare here

    @POST("api/servers/")
    suspend fun createServer(
        @Header("Authorization") token: String,
        @Body body: ServerRequest
        ): Response<ServerResponse>


    @GET("api/servers/")
    suspend fun getServers(
        @Header("Authorization") token: String
    ): Response<List<ServerResponse>>

    @POST("api/servers/join/")
    suspend fun joinServer(
        @Header("Authorization") token: String,
        @Body body: JoinServerRequest
    ): Response<ServerResponse>

    @GET("api/servers/{id}/")
    suspend fun getServer(
        @Header("Authorization") token: String,
        @Path("id") id: Int
    ): Response<ServerResponse>

    @PATCH("api/servers/{id}/")
    suspend fun updateServer(
        @Header("Authorization") token: String,
        @Path("id") id: Int,
        @Body req: UpdateServerRequest
    ): Response<ServerResponse>

    @DELETE("api/servers/{id}/")
    suspend fun deleteServer(
        @Header("Authorization") token: String,
        @Path("id") id: Int
    ): Response<Unit>

    @GET("api/invites/{code}/")
    suspend fun getInvitePreview(
        @Path("code") code: String
    ): Response<InvitePreview>




}



