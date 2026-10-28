
package com.example.task4.moderation

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.viewModelScope
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

    fun loadModerationQueue(serverId: Int) {
        viewModelScope.launch {
            try {
                val response =
                    repository.getModerationQueue(serverId)

                if (response.isSuccessful) {
                    moderationQueue.value =
                        response.body() ?: emptyList()
                } else {
                    error.value =
                        "Failed to load queue: ${response.code()}"
                }
            } catch (e: Exception) {
                error.value =
                    e.message ?: "Unable to load moderation queue"
            }
        }
    }

    fun loadModerationLogs(serverId: Int) {
        viewModelScope.launch {
            try {
                val response =
                    repository.getModerationLogs(serverId)

                if (response.isSuccessful) {
                    moderationLogs.value =
                        response.body() ?: emptyList()
                } else {
                    error.value =
                        "Failed to load logs: ${response.code()}"
                }
            } catch (e: Exception) {
                error.value =
                    e.message ?: "Unable to load moderation logs"
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
