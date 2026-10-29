package com.example.task4.member
import android.content.Context
import com.example.task4.ApiClient
import com.example.task4.SessionManager

class MemberRepository(context: Context) {

    private val sessionManager = SessionManager(context.applicationContext)

    private fun token() =
        "Bearer ${sessionManager.getAccessToken()}"

    suspend fun getMembers(serverId: Int): List<MemberResponse>? {
        val response = ApiClient.memberApi.getMembers(
            token(),
            serverId
        )

        return if (response.isSuccessful) {
            response.body()
        } else {
            null
        }
    }
}
