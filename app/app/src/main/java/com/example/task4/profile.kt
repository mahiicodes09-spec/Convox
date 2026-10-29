package com.example.task4

import android.content.Intent
import android.os.Bundle
import android.widget.Button
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.launch

class ProfileActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_profile)

        val session = SessionManager(this)
        val token = "Bearer ${session.getAccessToken()}"

        val tvName = findViewById<TextView>(R.id.tvName)
        val tvEmail = findViewById<TextView>(R.id.tvEmail)
        val btnLogout = findViewById<Button>(R.id.btnLogout)

        lifecycleScope.launch {
            try {
                val response = ApiClient.api.getMe(token)
                if (response.isSuccessful) {
                    val p = response.body()
                    if (p != null) {
                        tvName.text = p.display_name
                        tvEmail.text = p.email
                    }
                } else {
                    Toast.makeText(
                        this@ProfileActivity,
                        "Error ${response.code()}: ${response.errorBody()?.string()}",
                        Toast.LENGTH_LONG
                    ).show()
                }
            } catch (e: Exception) {
                Toast.makeText(this@ProfileActivity, "Problem: ${e.message}", Toast.LENGTH_LONG).show()
            }
        }

        btnLogout.setOnClickListener {
            AlertDialog.Builder(this)
                .setTitle("Logout?")
                .setPositiveButton("Logout") { _, _ -> doLogout(session, token) }
                .setNegativeButton("Cancel", null)
                .show()
        }
    }

    private fun doLogout(session: SessionManager, token: String) {
        lifecycleScope.launch {
            try {
                ApiClient.api.logout(token, LogoutRequest(session.getRefreshToken() ?: ""))
            } catch (e: Exception) {
                // ignore
            }

            session.clear()

            val intent = Intent(this@ProfileActivity, LoginActivity::class.java)
            intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            startActivity(intent)
        }
    }
}