package com.cpen321.usermanagement.utils

import com.cpen321.usermanagement.data.remote.dto.ReportedByUser
import com.google.gson.JsonDeserializationContext
import com.google.gson.JsonDeserializer
import com.google.gson.JsonElement
import java.lang.reflect.Type

class ReportedByUserDeserializer : JsonDeserializer<ReportedByUser?> {
    override fun deserialize(
        json: JsonElement?,
        typeOfT: Type?,
        context: JsonDeserializationContext?
    ): ReportedByUser? {
        if (json == null || json.isJsonNull) {
            return null
        }
        
        return try {
            when {
                json.isJsonObject -> {
                    // It's a populated user object
                    val jsonObject = json.asJsonObject
                    ReportedByUser(
                        id = jsonObject.get("_id")?.asString,
                        name = jsonObject.get("name")?.asString,
                        email = jsonObject.get("email")?.asString
                    )
                }
                json.isJsonPrimitive && json.asJsonPrimitive.isString -> {
                    // It's just a string ID (unpopulated reference)
                    ReportedByUser(
                        id = json.asString,
                        name = null,
                        email = null
                    )
                }
                else -> null
            }
        } catch (e: com.google.gson.JsonSyntaxException) {
            // If JSON parsing fails, return null
            null
        } catch (e: IllegalStateException) {
            // If JSON structure is invalid, return null
            null
        } catch (e: RuntimeException) {
            // If anything else goes wrong, return null
            null
        }
    }
}

