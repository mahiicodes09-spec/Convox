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
import org.json.JSONObject

class verify_email : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContentView(R.layout.activity_verify_email)

        val email = intent.getStringExtra("email") ?: ""
        val mode = intent.getStringExtra("mode") ?: "signup"

        val tvUserEmail = findViewById<TextView>(R.id.tvUserEmail)
        tvUserEmail.text = email

        val box1 = findViewById<EditText>(R.id.otpBox1)
        val box2 = findViewById<EditText>(R.id.otpBox2)
        val box3 = findViewById<EditText>(R.id.otpBox3)
        val box4 = findViewById<EditText>(R.id.otpBox4)
        val box5 = findViewById<EditText>(R.id.otpBox5)
        val box6 = findViewById<EditText>(R.id.otpBox6)

        val btnVerify = findViewById<AppCompatButton>(R.id.verify_button)

        btnVerify.setOnClickListener {

            val otp = box1.text.toString() + box2.text.toString() + box3.text.toString() +
                    box4.text.toString() + box5.text.toString() + box6.text.toString()


            if (otp.length != 6) {
                Toast.makeText(this, "Enter all 6 digits", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }

            if (mode == "reset") {
                lifecycleScope.launch {
                    btnVerify.isEnabled = false
                    btnVerify.text = "Please wait..."

                    try {
                        val response = ApiClient.api.verifyResetOtp(VerifyEmailRequest(email, otp))

                        if (response.isSuccessful) {
                            val body = response.body()?.string() ?: ""
                            val token = try {
                                JSONObject(body).optString("reset_token", "")
                            } catch (e: Exception) {
                                ""
                            }

                            if (token.isEmpty()) {
                                Toast.makeText(
                                    this@verify_email,
                                    "No reset token found. Response: $body",
                                    Toast.LENGTH_LONG
                                ).show()
                            } else {
                                val intent = Intent(this@verify_email, reset_password::class.java)
                                intent.putExtra("email", email)
                                intent.putExtra("reset_token", token)
                                startActivity(intent)
                            }
                        } else {
                            val errorText = response.errorBody()?.string()
                            Toast.makeText(
                                this@verify_email,
                                "Error ${response.code()}: $errorText",
                                Toast.LENGTH_LONG
                            ).show()
                        }
                    } catch (e: Exception) {
                        Toast.makeText(
                            this@verify_email,
                            "Network problem: ${e.message}",
                            Toast.LENGTH_LONG
                        ).show()
                    } finally {
                        btnVerify.isEnabled = true
                        btnVerify.text = "Verify →"
                    }
                }
                return@setOnClickListener
            }

            lifecycleScope.launch {
                btnVerify.isEnabled = false
                btnVerify.text = "Please wait..."

                try {
                    val response = ApiClient.api.verifyEmail(VerifyEmailRequest(email, otp))

                    if (response.isSuccessful) {
                        Toast.makeText(
                            this@verify_email,
                            "Email verified! Please login",
                            Toast.LENGTH_SHORT
                        ).show()
                        startActivity(Intent(this@verify_email, LoginActivity::class.java))
                        finish()
                    } else {
                        val errorText = response.errorBody()?.string()
                        Toast.makeText(
                            this@verify_email,
                            "Error ${response.code()}: $errorText",
                            Toast.LENGTH_LONG
                        ).show()
                    }
                } catch (e: Exception) {
                    Toast.makeText(
                        this@verify_email,
                        "Network problem: ${e.message}",
                        Toast.LENGTH_LONG
                    ).show()
                } finally {
                    btnVerify.isEnabled = true
                    btnVerify.text = "Verify →"
                }
            }

        }


        ViewCompat.setOnApplyWindowInsetsListener(findViewById(R.id.main)) { v, insets ->
            val systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
            v.setPadding(systemBars.left, systemBars.top, systemBars.right, systemBars.bottom)
            insets
        }
    }
}


