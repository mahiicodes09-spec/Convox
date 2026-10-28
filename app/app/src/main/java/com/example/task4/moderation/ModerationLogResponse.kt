
package com.example.task4.moderation

data class ModerationLogResponse(
    val id: Int,
    val message: Int,
    val moderator: Int,
    val action: String,
    val reason: String,
    val created_at: String
)
