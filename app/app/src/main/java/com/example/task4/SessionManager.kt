package com.example.task4

import android.content.Context

class SessionManager(context: Context) {


    private val prefs = context.getSharedPreferences("convox_session", Context.MODE_PRIVATE)

    fun saveTokens(access: String, refresh: String) {
        prefs.edit()
            .putString("access", access)
            .putString("refresh", refresh)
            .apply()
    }

    fun getAccessToken(): String? {
        return prefs.getString("access", null)
    }

    fun clear() {
        prefs.edit().clear().apply()
    }
}





