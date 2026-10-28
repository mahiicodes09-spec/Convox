package com.example.task4

import android.content.Intent
import android.os.Bundle
import android.widget.CheckBox
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

class LoginActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContentView(R.layout.activity_login)




        val etEmail = findViewById<EditText>(R.id.etEmail)
        val etPassword = findViewById<EditText>(R.id.etPassword)
        val btnLogin = findViewById<AppCompatButton>(R.id.login_button)
        val cbRememberMe = findViewById<CheckBox>(R.id.cbRememberMe)


        val session = SessionManager(this)

        if (session.isLoggedIn()) {
            val intent = Intent(this, ServersActivity::class.java)
            startActivity(intent)
            finish()
            return
        }


        btnLogin.setOnClickListener {

            val email = etEmail.text.toString().trim()
            val password = etPassword.text.toString()

            if (email.isEmpty() || password.isEmpty()) {
                Toast.makeText(this, "Fill all fields", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }

            lifecycleScope.launch {

                btnLogin.isEnabled = false
                btnLogin.text = "Please wait..."

                try {
                    val response = ApiClient.api.login(LoginRequest(email, password))

                    if (response.isSuccessful) {
                        val body = response.body()

                        if (body != null) {
                            session.saveTokens(body.access, body.refresh)
                        }

                        Toast.makeText(this@LoginActivity, "Login successful", Toast.LENGTH_SHORT)
                            .show()

                        val intent = Intent(this@LoginActivity, ServersActivity::class.java)
                        startActivity(intent)
                        finish()

                    } else if (response.code() == 401) {
                        Toast.makeText(
                            this@LoginActivity,
                            "Wrong email or password",
                            Toast.LENGTH_LONG
                        ).show()
                    } else {
                        val errorText = response.errorBody()?.string()
                        Toast.makeText(
                            this@LoginActivity,
                            "Error ${response.code()}: $errorText",
                            Toast.LENGTH_LONG
                        ).show()
                    }
                }catch (e: Exception) {
                    Toast.makeText(
                        this@LoginActivity,
                        "Network problem: ${e.message}",
                        Toast.LENGTH_LONG
                    ).show()
                } finally {
                    btnLogin.isEnabled = true
                    btnLogin.text = "Login"
            }
            }
        }


        val signupText = findViewById<TextView>(R.id.signup_text)

        signupText.setOnClickListener {
            val intent = Intent(this, signup::class.java)
            startActivity(intent)
        }

        val forgotPassword = findViewById<TextView>(R.id.forgot_password_text)

        forgotPassword.setOnClickListener {
            val intent = Intent(this, forgot_password::class.java)
            startActivity(intent)
        }



        ViewCompat.setOnApplyWindowInsetsListener(findViewById(R.id.main)) { v, insets ->
            val systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
            v.setPadding(systemBars.left, systemBars.top, systemBars.right, systemBars.bottom)
            insets
        }
    }
}