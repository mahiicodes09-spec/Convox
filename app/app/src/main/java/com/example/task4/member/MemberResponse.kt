package com.example.task4.member

data class MemberResponse(
    val user_id: Int,
    val display_name: String,
    val avatar: String?,
    val role: String,
    val joined_at: String
)