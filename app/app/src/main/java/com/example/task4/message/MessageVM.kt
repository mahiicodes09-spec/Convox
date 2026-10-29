package com.example.task4.message

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.launch

class MessageVM(application: Application) : AndroidViewModel(application) {

    val repository = MessageRepository(application)

    val messages = MutableLiveData<List<MessageResponse>>()
    val error = MutableLiveData<String>()

    fun loadMessages(channelId: Int) {
        viewModelScope.launch {
            try {
                val response = repository.getMessages(channelId)
                if (response.isSuccessful) {
                    val list = response.body()?.results ?: emptyList()


                    messages.value = list.reversed()
                } else {
                    val details = response.errorBody()?.string()
                    error.value = "Error ${response.code()}: $details"
                }
            } catch (e: Exception) {
                error.value = "Problem: ${e.message}"
            }
        }
    }

    fun sendMessage(channelId: Int, text: String) {
        viewModelScope.launch {
            try {
                val response = repository.sendMessage(channelId, text)
                if (response.isSuccessful) {
                    loadMessages(channelId)
                } else {
                    val details = response.errorBody()?.string()
                    error.value = "Send failed ${response.code()}: $details"
                }
            } catch (e: Exception) {
                error.value = "Problem: ${e.message}"
            }
        }
    }
}