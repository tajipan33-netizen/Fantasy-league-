plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.spfl.superleague"
    compileSdk = 35
    defaultConfig {
        applicationId = "com.spfl.superleague"
        minSdk = 23
        targetSdk = 35
        versionCode = 1
        versionName = "1.0.0"
    }
}
