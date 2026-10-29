package com.example.task4.message

data class MessageRequest(
    val content: String
)

data class Author(
    val id: Int,
    val display_name: String,
    val avatar: String?
)

data class MessageResponse(
    val id: Int,
    val channel: Int,
    val author: Author,
    val content: String,
    val created_at: String,
    val edited_at: String?
)

data class MessageListResponse(
    val next: String?,
    val previous: String?,
    val results: List<MessageResponse>
)