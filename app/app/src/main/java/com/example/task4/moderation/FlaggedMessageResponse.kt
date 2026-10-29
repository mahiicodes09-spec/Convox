
package com.example.task4.moderation

data class FlaggedMessageResponse(
    val id: Int,
    val channel: Int,
    val channel_name: String,
    val author: FlaggedMessageAuthor,
    val content: String,
    val toxicity_label: String,
    val toxicity_score: Double,
    val model_version: String,
    val created_at: String
)

data class FlaggedMessageAuthor(
    val id: Int,
    val display_name: String,
    val avatar: String?
)

