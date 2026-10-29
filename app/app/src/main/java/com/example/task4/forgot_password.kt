package com.example.task4

import android.content.Intent
import android.os.Bundle
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import android.widget.Toast
import androidx.activity.enableEdgeToEdge
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.launch

class forgot_password : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContentView(R.layout.activity_forgot_password)


        val sendResetLink = findViewById<Button>(R.id.rest_button)
        val etEmail = findViewById<EditText>(R.id.etEmail)

        sendResetLink.setOnClickListener {

            val email = etEmail.text.toString().trim()

            if (email.isEmpty()) {
                Toast.makeText(this, "Fill all fields", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }

            lifecycleScope.launch {
                sendResetLink.isEnabled = false
                sendResetLink.text = "Please wait..."

                try {
                    val response = ApiClient.api.forgotPassword(EmailRequest(email))

                    if (response.isSuccessful) {
                        Toast.makeText(
                            this@forgot_password,
                            "Reset link sent to your email",
                            Toast.LENGTH_SHORT
                        ).show()
                        val intent = Intent(this@forgot_password, verify_email::class.java)
                        intent.putExtra("email", email)
                        intent.putExtra("mode", "reset")
                        startActivity(intent)
                    } else {
                        val errorText = response.errorBody()?.string()
                        Toast.makeText(
                            this@forgot_password,
                            "Error ${response.code()}: $errorText",
                            Toast.LENGTH_LONG
                        ).show()
                    }
                } catch (e: Exception) {
                    Toast.makeText(
                        this@forgot_password,
                        "Network problem: ${e.message}",
                        Toast.LENGTH_LONG
                    ).show()
                } finally {
                    sendResetLink.isEnabled = true
                    sendResetLink.text = "Send reset link →"
                }
            }
        }


        val backToLogin = findViewById<TextView>(R.id.back_to_login_text)

        backToLogin.setOnClickListener {
            val intent = Intent(this, LoginActivity::class.java)
            startActivity(intent)
            finish()
        }


        ViewCompat.setOnApplyWindowInsetsListener(findViewById(R.id.main)) { v, insets ->
            val systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
            v.setPadding(systemBars.left, systemBars.top, systemBars.right, systemBars.bottom)
            insets
        }
    }
}