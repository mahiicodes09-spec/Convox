package com.example.task4.channel

data class ChannelRequest(
    val name: String
)

data class ChannelResponse(
    val id: Int,
    val server: Int,
    val name: String,
    val created_at: String
)