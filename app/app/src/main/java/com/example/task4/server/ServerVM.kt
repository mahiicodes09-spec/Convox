package com.example.task4.server

import android.app.Application
import android.util.Log
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.launch

class ServerVM (application: Application): AndroidViewModel(application){
    val repository = ServerRepository(application)
    val servers = MutableLiveData<List<ServerResponse>>()
    val error = MutableLiveData<String>()
    val serverDetail = MutableLiveData<ServerResponse>()
    val invitePreview = MutableLiveData<InvitePreview>()
    val message = MutableLiveData<String>()


    fun loadServers() {
        viewModelScope.launch {
            try {
                val response = repository.getServers()
                if (response.isSuccessful) {
                    servers.value = response.body() ?: emptyList()
                } else {
                    error.value = "Error: ${response.code()}"
                }
            } catch (e: Exception) {
                error.value = "Check your internet"
            }
        }
    }

    fun createServer(req: ServerRequest) {
        viewModelScope.launch {
            try {
                val response = repository.create_server(req)
                if (response.isSuccessful) {
                    Log.d("ServerVM", "Community created: ${response.body()}")
                    loadServers()
                } else {
                    Log.d("ServerVM", "Community creation failed: ${response.code()}")
                    error.value = "Error: ${response.code()}"
                }
            } catch (e: Exception) {
                error.value = "Check your internet"
            }
        }
    }

    fun loadServer(id: Int) {
        viewModelScope.launch {
            try {
                val response = repository.getServer(id)
                if (response.isSuccessful) {
                    response.body()?.let { serverDetail.value = it }
                } else {
                    error.value = "Error: ${response.code()}"
                }
            } catch (e: Exception) {
                error.value = "Check your internet"
            }
        }
    }

    fun updateServer(id: Int, name: String) {
        viewModelScope.launch {
            try {
                val response = repository.updateServer(id, name)
                if (response.isSuccessful) {
                    message.value = "Community updated"
                    loadServers()
                } else {
                    error.value = "Error: ${response.code()}"
                }
            } catch (e: Exception) {
                error.value = "Check your internet"
            }
        }
    }

    fun deleteServer(id: Int) {
        viewModelScope.launch {
            try {
                val response = repository.deleteServer(id)
                if (response.isSuccessful) {
                    message.value = "Community deleted"
                    loadServers()
                } else {
                    error.value = "Error: ${response.code()}"
                }
            } catch (e: Exception) {
                error.value = "Check your internet"
            }
        }
    }


    fun joinServer(code: String) {
        viewModelScope.launch {
            try {
                val response = repository.joinServer(code)
                if (response.isSuccessful) {
                    message.value = "Joined server"
                    loadServers()
                } else {
                    val details = response.errorBody()?.string()
                    error.value = "JOIN failed ${response.code()} (code: $code): $details"
                }
            } catch (e: Exception) {
                error.value = "Check your internet"
            }
        }
    }


    fun previewInvite(code: String) {
        viewModelScope.launch {
            try {
                val response = repository.getInvitePreview(code)
                if (response.isSuccessful) {
                    response.body()?.let { invitePreview.value = it }
                } else {
                    error.value = "Invalid invite code (${response.code()})"
                }
            } catch (e: Exception) {
                error.value = "Check your internet"
            }
        }
    }


}



