package com.example.task4.channel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.launch

class ChannelVM(application: Application) : AndroidViewModel(application) {

    val repository = ChannelRepository(application)

    val channels = MutableLiveData<List<ChannelResponse>>()
    val error = MutableLiveData<String>()

    fun loadChannels(serverId: Int) {
        viewModelScope.launch {
            try {
                val response = repository.getChannels(serverId)
                if (response.isSuccessful) {
                    channels.value = response.body() ?: emptyList()
                } else {
                    val details = response.errorBody()?.string()
                    error.value = "Error ${response.code()}: $details"
                }
            } catch (e: Exception) {
                error.value = "Problem: ${e.message}"
            }
        }
    }

    fun createChannel(serverId: Int, name: String) {
        viewModelScope.launch {
            try {
                val response = repository.createChannel(serverId, name)
                if (response.isSuccessful) {
                    loadChannels(serverId)
                } else {
                    val details = response.errorBody()?.string()
                    error.value = "Error ${response.code()}: $details"
                }
            } catch (e: Exception) {
                error.value = "Problem: ${e.message}"
            }
        }
    }
}