package com.example.task4

import android.content.Intent
import android.os.Bundle
import android.widget.EditText
import android.widget.TextView
import android.widget.Toast
import androidx.activity.enableEdgeToEdge
import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.widget.AppCompatButton
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.launch

class signup : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContentView(R.layout.activity_signup)


        val etName = findViewById<EditText>(R.id.etName)
        val etEmail = findViewById<EditText>(R.id.etEmail)
        val etPassword = findViewById<EditText>(R.id.etPassword)
        val signupBtn = findViewById<AppCompatButton>(R.id.signup_button)



        val signupButton = findViewById<AppCompatButton>(R.id.signup_button)

        signupButton.setOnClickListener {
            val name = etName.text.toString().trim()
            val email = etEmail.text.toString().trim()
            val password = etPassword.text.toString()

            if (name.isEmpty() || email.isEmpty() || password.length < 8) {
                Toast.makeText(this, "Fill all fields. Password needs 8+ characters", Toast.LENGTH_LONG).show()
                return@setOnClickListener
            }

            lifecycleScope.launch {
                signupButton.isEnabled = false
                signupButton.text = "Please wait..."

            try {
                val request = RegisterRequest(email, password, password, name)
                val response = ApiClient.api.register(request)

                if (response.isSuccessful) {
                    Toast.makeText(this@signup, "Code sent to your email", Toast.LENGTH_SHORT).show()
                    val intent = Intent(this@signup, verify_email::class.java)
                    intent.putExtra("email", email)
                    startActivity(intent)
                } else {
                    val errorText = response.errorBody()?.string()
                    Toast.makeText(this@signup, "Error ${response.code()}: $errorText", Toast.LENGTH_LONG).show()
                }
            } catch (e: Exception) {
                Toast.makeText(this@signup, "Network problem: ${e.message}", Toast.LENGTH_LONG).show()
            } finally {
                signupButton.isEnabled = true
                signupButton.text = "Sign Up"
            }
        }
    }





        val loginText = findViewById<TextView>(R.id.login_text)

        loginText.setOnClickListener {
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