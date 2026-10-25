package com.example.task4.server

data class ServerRequest(
    val name: String,
    val description: String?=null,
    val icon: String?=null
)

data class UpdateServerRequest(
    val name: String? = null,
    val description: String? = null
)

data class ServerResponse(
    val id: Int,
    val name: String,
    val description: String?,
    val icon: String?,
    val owner: Int,
    val invite_code: String?,
    val invite_link: String?,
    val created_at: String
)

data class JoinServerRequest(
    val invite_code: String
)

data class InvitePreview(
    val name: String,
    val description: String?,
    val icon: String?,
    val member_count: String
)

  /*
  {
  "id": 0,
  "name": "string",
  "description": "string",
  "icon": "string",
  "owner": 0,
  "invite_code": "string",
  "invite_link": "string",
  "created_at": "2026-10-25T07:14:15.349Z"
}
   */

