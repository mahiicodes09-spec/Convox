package com.example.task4.moderation

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.viewModelScope
import com.google.gson.Gson
import com.google.gson.JsonElement
import com.google.gson.reflect.TypeToken
import kotlinx.coroutines.launch

class ModerationVM(application: Application) :
    AndroidViewModel(application) {

    private val repository =
        ModerationRepository(application)

    val moderationQueue =
        MutableLiveData<List<FlaggedMessageResponse>>()

    val moderationLogs =
        MutableLiveData<List<ModerationLogResponse>>()

    val error = MutableLiveData<String>()
    private inline fun <reified T> parseList(element: JsonElement?): List<T>? {
        if (element == null || element.isJsonNull) return emptyList()

        val gson = Gson()
        val listType = TypeToken.getParameterized(List::class.java, T::class.java).type

        if (element.isJsonArray) {
            return gson.fromJson<List<T>>(element, listType)
        }

        if (element.isJsonObject) {
            for ((_, value) in element.asJsonObject.entrySet()) {
                if (value.isJsonArray) {
                    return gson.fromJson<List<T>>(value, listType)
                }
            }
        }

        return null
    }

    fun loadModerationQueue(serverId: Int) {
        viewModelScope.launch {
            try {
                val response =
                    repository.getModerationQueue(serverId)

                if (response.isSuccessful) {
                    val list = parseList<FlaggedMessageResponse>(response.body())
                    if (list != null) {
                        moderationQueue.value = list
                    } else {
                        // not a list: show what the server sent
                        error.value = "QUEUE REPLY: ${response.body()}"
                    }
                } else {
                    val details = response.errorBody()?.string()
                    error.value =
                        "Failed to load queue: ${response.code()} $details"
                }
            } catch (e: Exception) {
                error.value =
                    "QUEUE ERROR: ${e.message}"
            }
        }
    }

    fun loadModerationLogs(serverId: Int) {
        viewModelScope.launch {
            try {
                val response =
                    repository.getModerationLogs(serverId)

                if (response.isSuccessful) {
                    val list = parseList<ModerationLogResponse>(response.body())
                    if (list != null) {
                        moderationLogs.value = list
                    } else {
                        error.value = "LOGS REPLY: ${response.body()}"
                    }
                } else {
                    val details = response.errorBody()?.string()
                    error.value =
                        "Failed to load logs: ${response.code()} $details"
                }
            } catch (e: Exception) {
                error.value =
                    "LOGS ERROR: ${e.message}"
            }
        }
    }

    fun takeModerationAction(
        messageId: Int,
        action: String,
        reason: String,
        onResult: (Boolean, String) -> Unit
    ) {
        viewModelScope.launch {
            try {
                val response =
                    repository.takeModerationAction(
                        messageId,
                        action,
                        reason
                    )

                if (response.isSuccessful) {
                    onResult(true, "Action completed successfully")
                } else {
                    onResult(
                        false,
                        "Action failed: ${response.code()}"
                    )
                }
            } catch (e: Exception) {
                onResult(
                    false,
                    e.message ?: "Unable to perform moderation action"
                )
            }
        }
    }
}