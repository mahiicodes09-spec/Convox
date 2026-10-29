package com.example.task4

import com.example.task4.server.ServerInterface
import okhttp3.OkHttpClient
import okhttp3.ResponseBody
import retrofit2.Response
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.Body
import retrofit2.http.POST
import java.util.concurrent.TimeUnit
import com.example.task4.channel.ChannelInterface
import com.example.task4.message.MessageInterface
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.http.GET
import retrofit2.http.Header
import com.example.task4.member.MemberInterface
import com.example.task4.moderation.ModerationInterface

data class RegisterRequest(
    val email: String,
    val password: String,
    val password2: String,
    val display_name: String
)
data class ResetPasswordRequest(
    val email: String,
    val reset_token: String,
    val new_password: String,
    val new_password2: String
)

data class VerifyEmailRequest(val email: String, val otp: String)

data class EmailRequest(val email: String)

data class LoginRequest(val email: String, val password: String)

data class LoginResponse(val access: String, val refresh: String)

data class ProfileResponse(
    val id: Int,
    val email: String,
    val display_name: String
)

data class LogoutRequest(
    val refresh: String
)

interface ApiService {

    @POST("api/auth/register/")
    suspend fun register(@Body body: RegisterRequest): Response<ResponseBody>

    @POST("api/auth/verify-email/")
    suspend fun verifyEmail(@Body body: VerifyEmailRequest): Response<ResponseBody>

    @POST("api/auth/resend-verification/")
    suspend fun resend(@Body body: EmailRequest): Response<ResponseBody>

    @POST("api/auth/login/")
    suspend fun login(@Body body: LoginRequest): Response<LoginResponse>

    @POST("api/auth/forgot-password/")
    suspend fun forgotPassword(@Body body: EmailRequest): Response<ResponseBody>

    @POST("api/auth/verify-reset-otp/")
    suspend fun verifyResetOtp(@Body body: VerifyEmailRequest): Response<ResponseBody>

    @POST("api/auth/reset-password/")
    suspend fun resetPassword(@Body body: ResetPasswordRequest): Response<ResponseBody>

    @GET("api/auth/me/")
    suspend fun getMe(@Header("Authorization") token: String): Response<ProfileResponse>

    @POST("api/auth/logout/")
    suspend fun logout(
        @Header("Authorization") token: String,
        @Body body: LogoutRequest
    ): Response<Unit>
}

object ApiClient {

    private val okHttpClient: OkHttpClient by lazy {
        val logging = HttpLoggingInterceptor()
        logging.level = HttpLoggingInterceptor.Level.BODY

        OkHttpClient.Builder()
            .addInterceptor(logging)
            .connectTimeout(60, TimeUnit.SECONDS)
            .readTimeout(60, TimeUnit.SECONDS)
            .writeTimeout(60, TimeUnit.SECONDS)
            .build()
    }

    val retrofit: Retrofit by lazy {


        Retrofit.Builder()
            .baseUrl("https://smart-community-api-o0h9.onrender.com/")
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create())
            .build()


        }
    val createServer: ServerInterface by lazy {
        retrofit.create(ServerInterface::class.java)
    }
    val channelApi: ChannelInterface by lazy {
        retrofit.create(ChannelInterface::class.java)
    }
    val messageApi: MessageInterface by lazy {
        retrofit.create(MessageInterface::class.java)
    }

    val apiService: ApiService by lazy {
        retrofit.create(ApiService::class.java)
    }

    val api: ApiService by lazy {
        retrofit.create(ApiService::class.java)
    }
    val memberApi: MemberInterface by lazy {
        retrofit.create(MemberInterface::class.java)
    }
    val moderationApi: ModerationInterface by lazy {
        retrofit.create(ModerationInterface::class.java)
    }

    }



//interface files initialise here
