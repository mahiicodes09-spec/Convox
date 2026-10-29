package com.example.task4

import android.content.Intent
import android.os.Bundle
import android.widget.Button
import android.widget.EditText
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.launch

class reset_password : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_reset_password)

        val email = intent.getStringExtra("email") ?: ""
        val resetToken = intent.getStringExtra("reset_token") ?: ""
        val etNewPassword = findViewById<EditText>(R.id.etNewPassword)
        val etConfirmPassword = findViewById<EditText>(R.id.etConfirmPassword)
        val btnReset = findViewById<Button>(R.id.btnResetPassword)

        btnReset.setOnClickListener {
            val password1 = etNewPassword.text.toString()
            val password2 = etConfirmPassword.text.toString()

            if (password1.isEmpty() || password2.isEmpty()) {
                Toast.makeText(this, "Fill both fields", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }
            if (password1 != password2) {
                Toast.makeText(this, "Passwords do not match", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }

            lifecycleScope.launch {
                btnReset.isEnabled = false
                btnReset.text = "Please wait"
                try {
                    val response = ApiClient.api.resetPassword(
                        ResetPasswordRequest(email, resetToken, password1, password2)
                    )

                    if (response.isSuccessful) {
                        Toast.makeText(
                            this@reset_password,
                            "Password changed! Please login",
                            Toast.LENGTH_SHORT
                        ).show()

                        val intent = Intent(this@reset_password, LoginActivity::class.java)
                        intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                        startActivity(intent)
                    } else {
                        val errorText = response.errorBody()?.string()
                        Toast.makeText(
                            this@reset_password,
                            "Error ${response.code()}: $errorText",
                            Toast.LENGTH_LONG
                        ).show()
                    }
                } catch (e: Exception) {
                    Toast.makeText(
                        this@reset_password,
                        "Network problem: ${e.message}",
                        Toast.LENGTH_LONG
                    ).show()
                } finally {
                    btnReset.isEnabled = true
                    btnReset.text = "Reset password"
                }
            }
        }
    }
}