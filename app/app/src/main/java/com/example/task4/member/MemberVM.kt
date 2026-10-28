
package com.example.task4.member

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.launch

class MemberVM(application: Application) :
    AndroidViewModel(application) {

    private val repository = MemberRepository(application)

    val members = MutableLiveData<List<MemberResponse>>()
    val error = MutableLiveData<String>()

    fun loadMembers(serverId: Int) {
        viewModelScope.launch {
            try {
                val result = repository.getMembers(serverId)

                if (result != null) {
                    members.value = result
                } else {
                    error.value = "Failed to load members"
                }
            } catch (e: Exception) {
                error.value = e.message ?: "Something went wrong"
            }
        }
    }
}
